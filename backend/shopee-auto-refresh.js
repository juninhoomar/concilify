#!/usr/bin/env node
/**
 * 🔄 SHOPEE AUTO REFRESH TOKEN - RENOVAÇÃO AUTOMÁTICA A CADA 3 HORAS
 * Baseado na documentação: tokens expiram em 4 horas
 * Integração com Supabase para armazenamento seguro
 * Conversão do Python para Node.js
 */

import crypto from 'crypto';
import cron from 'node-cron';
import { supabase } from './config/supabase.js';
import { 
  getShopCredentials, 
  getDefaultShopCredentials, 
  getAllActiveShops,
  SHOPEE_CONFIG 
} from './config/shopee-config.js';

class ShopeeAutoRefresh {
  constructor() {
    this.partnerId = null;
    this.partnerKey = null;
    this.shopId = null;
    this.refreshToken = null;
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.baseUrl = SHOPEE_CONFIG.BASE_URL;
    this.tokenId = null;
  }
  
  async init(shopId = null) {
  

    try {
      if (shopId) {
        const credentials = await getShopCredentials(shopId);
        if (!credentials) {
          console.log('❌ Nenhuma credencial encontrada no Supabase para o shopId fornecido!');
          console.log('💡 Execute o gerador de tokens primeiro');
          throw new Error('Credenciais não encontradas no Supabase');
        }
        this.partnerId = parseInt(credentials.partner_id);
        this.partnerKey = credentials.partner_key;
        this.shopId = parseInt(credentials.shop_id);
        this.refreshToken = credentials.refresh_token;
        this.accessToken = credentials.access_token;
        console.log(`🏪 Configurado para loja: ${credentials.loja} (ID: ${this.shopId})`);
        if (credentials.is_expired) {
          console.log(`⚠️ Token expirado para loja ${credentials.loja} - será renovado automaticamente`);
        }
      } else {
        console.log('ℹ️ Inicializando sem shopId específico. A renovação de todas as lojas buscará as credenciais individualmente.');
      }
      console.log('✅ Conectado ao Supabase');
    } catch (error) {
      console.error('❌ Erro ao inicializar credenciais:', error.message);
      throw error;
    }
  }
  
  /**
   * Gera assinatura HMAC-SHA256
   * @param {string} apiPath - Caminho da API
   * @param {number} timestamp - Timestamp atual
   * @param {string} shopId - ID da loja (opcional)
   * @returns {string} Assinatura HMAC
   */
  generateSignature(apiPath, timestamp, shopId = null) {
    let baseString = `${this.partnerId}${apiPath}${timestamp}`;
    if (shopId) {
      baseString += shopId;
    }
    
    return crypto
      .createHmac('sha256', this.partnerKey)
      .update(baseString)
      .digest('hex');
  }
  
  /**
   * 💾 Salva tokens no Supabase
   * @param {string} accessToken - Token de acesso
   * @param {string} refreshToken - Token de renovação
   * @param {number} expiresIn - Tempo de expiração em segundos
   * @returns {boolean} Sucesso da operação
   */
  async saveToSupabase(accessToken, refreshToken, expiresIn) {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const currentTime = new Date();
      
      // Verificar se já existe um token ativo para este partner_id e shop_id
      const { data: existingTokens, error: selectError } = await supabase
        .from('shopee_tokens')
        .select('*')
        .eq('partner_id', this.partnerId)
        .eq('shop_id', this.shopId)
        .eq('is_active', true);
      
      if (selectError) {
        console.error('❌ Erro ao buscar tokens existentes:', selectError.message);
        return false;
      }
      
      if (existingTokens && existingTokens.length > 0) {
        // Se existe um token com mesmo PARTNER_ID e SHOP_ID, atualiza
        const existingToken = existingTokens[0];
        this.tokenId = existingToken.id;
        
        const { error: updateError } = await supabase
          .from('shopee_tokens')
          .update({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt.toISOString(),
            updated_at: currentTime.toISOString()
          })
          .eq('id', this.tokenId);
        
        if (updateError) {
          console.error('❌ Erro ao atualizar token:', updateError.message);
          return false;
        }
        
        console.log(`🔄 Token atualizado no Supabase (ID: ${this.tokenId})`);
      } else {
        // Se não existe ou tem PARTNER_ID/SHOP_ID diferentes, cria novo registro
        // Primeiro desativa todos os tokens existentes para este shop_id
        await supabase
          .from('shopee_tokens')
          .update({
            is_active: false,
            updated_at: currentTime.toISOString()
          })
          .eq('shop_id', this.shopId.toString());
        
        // Cria novo registro
        const tokenData = {
          partner_id: this.partnerId,
          shop_id: this.shopId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt.toISOString(),
          created_at: currentTime.toISOString(),
          updated_at: currentTime.toISOString(),
          is_active: true
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('shopee_tokens')
          .insert(tokenData)
          .select();
        
        if (insertError) {
          console.error('❌ Erro ao inserir token:', insertError.message);
          return false;
        }
        
        this.tokenId = insertData[0].id;
        console.log(`💾 Novo token criado no Supabase (ID: ${this.tokenId})`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar no Supabase:', error.message);
      return false;
    }
  }
  
  /**
   * 📥 Carrega token ativo do Supabase
   * @returns {boolean} Sucesso da operação
   */
  async loadFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('shopee_tokens')
        .select('*')
        .eq('shop_id', this.shopId.toString())
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao carregar do Supabase:', error.message);
        return false;
      }
      
      if (data && data.length > 0) {
        const tokenData = data[0];
        this.tokenId = tokenData.id;
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        
        // Converter expires_at para timestamp
        const expiresAt = new Date(tokenData.expires_at);
        this.tokenExpiresAt = Math.floor(expiresAt.getTime() / 1000);
        
        console.log(`📥 Token carregado do Supabase (ID: ${this.tokenId})`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao carregar do Supabase:', error.message);
      return false;
    }
  }
  
  /**
   * 📋 Busca todas as lojas ativas no Supabase
   * @returns {Array} Lista de lojas
   */
  async getAllShopsFromSupabase() {
    const shops = await getAllActiveShops();
    
    // Adicionar token_id para cada loja
    for (const shop of shops) {
      try {
        const { data, error } = await supabase
          .from('shopee_tokens')
          .select('id')
          .eq('shop_id', shop.shop_id)
          .eq('is_active', true)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          shop.token_id = data[0].id;
        }
      } catch (error) {
        console.error('❌ Erro ao buscar token_ids:', error.message);
      }
    }
    
    return shops;
  }
  
  /**
   * 🔄 Renova o token para uma loja específica
   * @param {Object} shopData - Dados da loja
   * @returns {boolean} Sucesso da operação
   */
  async refreshTokenForShop(shopData) {
    const { shop_id, partner_id, partner_key, refresh_token, loja, token_id } = shopData;
    
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Renovando token para ${loja} (ID: ${shop_id})...`);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    
    // Para refresh token, usar assinatura de Public API
    const baseString = `${partner_id}${apiPath}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', partner_key)
      .update(baseString)
      .digest('hex');
    
    try {
      const url = new URL(`${this.baseUrl}${apiPath}`);
      url.searchParams.append('partner_id', partner_id);
      url.searchParams.append('timestamp', timestamp);
      url.searchParams.append('sign', signature);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partner_id: parseInt(partner_id),
          refresh_token: refresh_token,
          shop_id: parseInt(shop_id)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.error === '') {
          const newAccessToken = data.access_token;
          const newRefreshToken = data.refresh_token;
          const expiresIn = data.expire_in;
          
          // 💾 Atualizar no Supabase
          const expiresAt = new Date(Date.now() + expiresIn * 1000);
          const currentTime = new Date();
          
          const { error: updateError } = await supabase
            .from('shopee_tokens')
            .update({
              access_token: newAccessToken,
              refresh_token: newRefreshToken,
              expires_at: expiresAt.toISOString(),
              updated_at: currentTime.toISOString()
            })
            .eq('id', token_id);
          
          if (updateError) {
            console.error('❌ Erro ao atualizar token no Supabase:', updateError.message);
            return false;
          }
          
          const hours = Math.floor(expiresIn / 3600);
          const minutes = Math.floor((expiresIn % 3600) / 60);
          console.log(`✅ Token renovado para ${loja}! Expira em ${hours}h ${minutes}min`);
          return true;
        } else {
          console.error(`❌ Erro na API para ${loja}:`, data);
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status} para ${loja}:`, errorText);
      }
    } catch (error) {
      console.error(`💥 Erro na renovação para ${loja}:`, error.message);
    }
    
    return false;
  }
  
  /**
   * 🔄 Renova tokens de todas as lojas
   * @returns {boolean} Sucesso da operação
   */
  async refreshAllShopsTokens() {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Iniciando renovação de tokens para todas as lojas...`);
    
    const shops = await getAllActiveShops();
    if (!shops || shops.length === 0) {
      console.log('❌ Nenhuma loja encontrada no banco de dados!');
      return false;
    }
    
    console.log(`📋 Encontradas ${shops.length} lojas para renovação`);
    
    let successCount = 0;
    for (const shop of shops) {
      // Atribuir as credenciais da loja atual para a instância
      this.partnerId = parseInt(shop.partner_id);
      this.partnerKey = shop.partner_key;
      this.shopId = parseInt(shop.shop_id);
      this.refreshToken = shop.refresh_token;
      this.accessToken = shop.access_token;

      if (await this.refreshTokenForShop(shop)) {
        successCount++;
      }
      // Aguardar 2 segundos entre renovações para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`📊 Renovação concluída: ${successCount}/${shops.length} lojas renovadas com sucesso`);
    return successCount > 0;
  }
  
  /**
   * 🔄 Renova o token agora (método legado para compatibilidade)
   * @returns {boolean} Sucesso da operação
   */
  async refreshTokenNow() {
    console.log(`🔄 [${new Date().toLocaleTimeString()}] Renovando token...`);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    
    // Para refresh token, usar assinatura de Public API
      const baseString = `${this.partnerId}${apiPath}${timestamp}`;
      const signature = crypto
        .createHmac('sha256', this.partnerKey)
        .update(baseString)
        .digest('hex');
    
    try {
      const url = new URL(`${this.baseUrl}${apiPath}`);
      url.searchParams.append('partner_id', this.partnerId);
      url.searchParams.append('timestamp', timestamp);
      url.searchParams.append('sign', signature);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partner_id: this.partnerId,
          refresh_token: this.refreshToken,
          shop_id: this.shopId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.error === '') {
          this.accessToken = data.access_token;
          this.refreshToken = data.refresh_token;
          this.tokenExpiresAt = Math.floor(Date.now() / 1000) + data.expire_in;
          
          // 💾 Salvar no Supabase
          const supabaseSaved = await this.saveToSupabase(
            this.accessToken,
            this.refreshToken,
            data.expire_in
          );
          
          if (!supabaseSaved) {
            console.log('⚠️ Falha ao salvar no Supabase, mas token foi renovado');
          }
          
          const hours = Math.floor(data.expire_in / 3600);
          const minutes = Math.floor((data.expire_in % 3600) / 60);
          console.log(`✅ Token renovado! Expira em ${hours}h ${minutes}min`);
          return true;
        } else {
          console.error('❌ Erro na API:', data);
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
      }
    } catch (error) {
      console.error('💥 Erro na renovação:', error.message);
    }
    
    return false;
  }
  
  /**
   * 🤖 Inicia sistema de renovação automática
   * @param {boolean} refreshAllShops - Se deve renovar todas as lojas
   */
  async startAutoRefresh(refreshAllShops = true) {
    console.log('🚀 Iniciando renovação automática a cada 3 horas...');
    
    if (refreshAllShops) {
      // Agendar renovação de todas as lojas a cada 3 horas
      cron.schedule('0 */3 * * *', async () => {
        await this.refreshAllShopsTokens();
      });
      
      console.log('⏰ Agendamento ativo! Renovação automática de TODAS as lojas a cada 3 horas');
      
      // Verificar se alguma loja precisa renovar agora
      const shops = await this.getAllShopsFromSupabase();
      if (shops && shops.length > 0) {
        console.log(`📋 Verificando ${shops.length} lojas para renovação imediata...`);
        let needsImmediateRefresh = false;
        
        for (const shop of shops) {
          const expiresAt = new Date(shop.expires_at);
          const timeUntilExpiry = expiresAt.getTime() - Date.now();
          
          if (timeUntilExpiry < 5 * 60 * 1000) { // Menos de 5 minutos
            needsImmediateRefresh = true;
            break;
          }
        }
        
        if (needsImmediateRefresh) {
          console.log('⚡ Algumas lojas têm tokens expirando em breve, renovando agora...');
          await this.refreshAllShopsTokens();
        }
      }
    } else {
      // Modo legado - apenas uma loja
      if (!this.refreshToken) {
        console.log('📥 Tentando carregar token do Supabase...');
        if (!(await this.loadFromSupabase())) {
          console.log('❌ Nenhum token encontrado no Supabase!');
          console.log('💡 Execute primeiro o gerador de tokens para obter tokens iniciais');
          return;
        }
      }
      
      // Primeira renovação imediata
      if (!(await this.refreshTokenNow())) {
        console.log('❌ Falha na primeira renovação! Verifique o refresh_token');
        return;
      }
      
      // Agendar renovações a cada 3 horas
      cron.schedule('0 */3 * * *', async () => {
        await this.refreshTokenNow();
      });
      
      console.log('⏰ Agendamento ativo! Renovação automática a cada 3 horas (modo legado)');
    }
    
    console.log('✅ Sistema de renovação ativo!');
    console.log('💡 Pressione Ctrl+C para parar');
    
    // Loop principal com status
    const statusInterval = setInterval(() => {
      if (this.tokenExpiresAt) {
        const remaining = this.tokenExpiresAt - Math.floor(Date.now() / 1000);
        if (remaining > 0) {
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const currentTime = new Date().toLocaleTimeString();
          console.log(`[${currentTime}] 🔑 Token válido por ${hours}h ${minutes}min`);
        } else {
          console.log('⚠️ Token expirado! Aguardando renovação...');
        }
      }
    }, 30000); // Mostrar status a cada 30 segundos
    
    // Capturar Ctrl+C para limpeza
    process.on('SIGINT', () => {
      console.log('\n👋 Sistema interrompido pelo usuário');
      clearInterval(statusInterval);
      process.exit(0);
    });
  }
  
  /**
   * 🎯 Retorna o token atual válido
   * @returns {string|null} Token atual ou null se inválido
   */
  getCurrentToken() {
    if (this.accessToken && this.tokenExpiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now < (this.tokenExpiresAt - 300)) { // 5min de margem
        return this.accessToken;
      }
    }
    return null;
  }
}

// Função principal para execução via linha de comando
async function main() {
  console.log('🛍️ SHOPEE AUTO REFRESH - INTEGRAÇÃO SUPABASE');
  console.log('='.repeat(50));
  
  try {
    const autoRefresh = new ShopeeAutoRefresh();
    
    // Verificar argumentos da linha de comando
    const args = process.argv.slice(2);
    
    if (args.includes('--refresh-all')) {
      console.log('🔄 Modo: Renovação única de todas as lojas');
      await autoRefresh.init(); // Initialize without specific shopId for refresh-all
      const success = await autoRefresh.refreshAllShopsTokens();
      if (success) {
        console.log('✅ Renovação de todas as lojas concluída com sucesso!');
      } else {
        console.log('❌ Falha na renovação de algumas lojas');
      }
      process.exit(success ? 0 : 1);
    } else if (args.includes('--legacy')) {
      console.log('🔄 Modo: Agendamento automático (modo legado - uma loja)');
      // For legacy mode, we need a shopId, but it's not passed via CLI here.
      // Assuming a default shopId or it's handled internally by getDefaultShopCredentials
      // which is now removed. This part needs clarification if legacy mode is still desired.
      // For now, let's assume it will be initialized with a default if no shopId is passed.
      await autoRefresh.init(); 
      await autoRefresh.startAutoRefresh(false);
    } else {
      console.log('🔄 Modo: Agendamento automático (todas as lojas)');
      console.log('💡 Use --refresh-all para renovação única ou --legacy para modo legado');
      await autoRefresh.init(); // Initialize without specific shopId for auto-refresh all
      await autoRefresh.startAutoRefresh(true);
    }
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ShopeeAutoRefresh;