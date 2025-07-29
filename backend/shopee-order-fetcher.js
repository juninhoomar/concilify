#!/usr/bin/env node
/**
 * 📦 SHOPEE ORDER FETCHER V2 - BUSCA ASSÍNCRONA DE PEDIDOS
 * Busca pedidos de todas as lojas da Shopee de forma paralela
 * Integração com Supabase para armazenamento
 * Conversão do Python para Node.js
 */

import crypto from 'crypto';
import { supabase } from './config/supabase.js';
import { 
  getShopCredentials, 
  getAllActiveShops,
  isTokenExpired
} from './config/shopee-config.js';
import { ShopeeFinancialFetcher } from './shopee-financial-fetcher.js';

class ShopeeOrderFetcher {
  constructor() {
    this.baseUrl = 'https://partner.shopeemobile.com'; // Base URL da Shopee API
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos
    this.batchSize = 50; // Tamanho do lote para buscar detalhes
    this.maxPages = 100; // Máximo de páginas para buscar
    this.financialFetcher = new ShopeeFinancialFetcher(); // 💰 Integração com dados financeiros
    this.fetchFinancialData = true; // Flag para controlar busca de dados financeiros
  }
  
  /**
   * Gera assinatura HMAC-SHA256 para Shop API
   * @param {string} apiPath - Caminho da API
   * @param {number} timestamp - Timestamp atual
   * @param {string} accessToken - Token de acesso
   * @param {string} partnerKey - Chave do parceiro
   * @param {number} shopId - ID da loja
   * @returns {string} Assinatura HMAC
   */
  generateShopSignature(apiPath, timestamp, accessToken, partnerKey, shopId, partnerId) {
    const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
    return crypto
      .createHmac('sha256', partnerKey)
      .update(baseString)
      .digest('hex');
  }
  
  /**
   * 📋 Busca lista de pedidos (order_sn) com paginação
   * @param {Object} credentials - Credenciais da loja
   * @param {number} timeFrom - Timestamp inicial
   * @param {number} timeTo - Timestamp final
   * @param {string} timeRangeField - Campo de tempo ('create_time' ou 'update_time')
   * @param {number} pageSize - Tamanho da página
   * @param {string} cursor - Cursor para paginação
   * @returns {Object} Resultado da busca
   */
  async getOrderList(credentials, timeFrom, timeTo, timeRangeField = 'create_time', pageSize = 100, cursor = '') {
    const { partner_id, partner_key, shop_id, access_token, loja } = credentials;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/order/get_order_list';
    
    const signature = this.generateShopSignature(
      apiPath, timestamp, access_token, partner_key, shop_id, partner_id
    );
    
    const params = {
      partner_id: parseInt(partner_id),
      timestamp,
      access_token,
      shop_id: parseInt(shop_id),
      sign: signature
    };
    
    const body = {
      time_range_field: timeRangeField,
      time_from: timeFrom,
      time_to: timeTo,
      page_size: pageSize,
      cursor: cursor,
      response_optional_fields: 'order_status'
    };
    
    // Adicionar order_status apenas se especificado
    // (não enviar por padrão como no Python)
    
    try {
      // Combinar parâmetros da URL com o body para GET (como no Python)
      const allParams = { ...params, ...body };
      
      const url = new URL(`${this.baseUrl}${apiPath}`);
      Object.entries(allParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 30000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      if (data.error !== '') {
        throw new Error(`API Error: ${data.error} - ${data.message || 'Erro desconhecido'}`);
      }
      
      return {
        success: true,
        orders: data.response?.order_list || [],
        nextCursor: data.response?.next_cursor || '',
        hasMore: data.response?.more || false
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar lista de pedidos para ${loja}:`, error.message);
      return {
        success: false,
        error: error.message,
        orders: [],
        nextCursor: '',
        hasMore: false
      };
    }
  }
  
  /**
   * 📦 Busca detalhes de um pedido específico
   * @param {Object} credentials - Credenciais da loja
   * @param {string} orderSn - Número do pedido
   * @returns {Object} Detalhes do pedido
   */
  async getOrderDetail(credentials, orderSn) {
    const { partner_id, partner_key, shop_id, access_token, loja } = credentials;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/order/get_order_detail';
    
    const signature = this.generateShopSignature(
      apiPath, timestamp, access_token, partner_key, shop_id, partner_id
    );
    
    const params = {
      partner_id: parseInt(partner_id),
      timestamp,
      access_token,
      shop_id: parseInt(shop_id),
      sign: signature
    };
    
    const body = {
      order_sn_list: [orderSn],
      response_optional_fields: [
        'buyer_user_id',
        'buyer_username',
        'estimated_shipping_fee',
        'recipient_address',
        'actual_shipping_fee',
        'goods_to_declare',
        'note',
        'note_update_time',
        'item_list',
        'pay_time',
        'dropshipper',
        'dropshipper_phone',
        'split_up',
        'buyer_cancel_reason',
        'cancel_by',
        'cancel_reason',
        'actual_shipping_fee_confirmed',
        'buyer_cpf_id',
        'fulfillment_flag',
        'pickup_done_time',
        'package_list',
        'shipping_carrier',
        'payment_method',
        'total_amount',
        'buyer_username',
        'invoice_data',
        'checkout_shipping_carrier',
        'reverse_shipping_fee'
      ]
    };
    
    try {
      // Combinar parâmetros da URL com o body para GET (como no Python)
      const allParams = { ...params, ...body };
      
      // Converter lista para string separada por vírgulas
      if (allParams.order_sn_list && Array.isArray(allParams.order_sn_list)) {
        allParams.order_sn_list = allParams.order_sn_list.join(',');
      }
      
      // Converter array de campos opcionais para string
      if (allParams.response_optional_fields && Array.isArray(allParams.response_optional_fields)) {
        allParams.response_optional_fields = allParams.response_optional_fields.join(',');
      }
      
      const url = new URL(`${this.baseUrl}${apiPath}`);
      Object.entries(allParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 30000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      if (data.error !== '') {
        throw new Error(`API Error: ${data.error} - ${data.message || 'Erro desconhecido'}`);
      }
      
      const orderList = data.response?.order_list || [];
      if (orderList.length === 0) {
        throw new Error('Pedido não encontrado');
      }
      
      return {
        success: true,
        order: orderList[0]
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar detalhes do pedido ${orderSn} para ${loja}:`, error.message);
      return {
        success: false,
        error: error.message,
        order: null
      };
    }
  }
  
  /**
   * 📋 Busca todos os order_sn de um período com paginação automática
   * @param {Object} credentials - Credenciais da loja
   * @param {number} timeFrom - Timestamp inicial
   * @param {number} timeTo - Timestamp final
   * @param {string} timeRangeField - Campo de tempo
   * @returns {Array} Lista de order_sn
   */
  async getAllOrderSns(credentials, timeFrom, timeTo, timeRangeField = 'create_time') {
    const { loja } = credentials;
    const allOrderSns = [];
    let cursor = '';
    let pageCount = 0;
    
    console.log(`📋 Buscando order_sn para ${loja} (${timeRangeField})...`);
    
    while (pageCount < this.maxPages) {
      const result = await this.getOrderList(
        credentials, timeFrom, timeTo, timeRangeField, 100, cursor
      );
      
      if (!result.success) {
        console.error(`❌ Erro na página ${pageCount + 1} para ${loja}:`, result.error);
        break;
      }
      
      const orderSns = result.orders.map(order => order.order_sn);
      allOrderSns.push(...orderSns);
      
      console.log(`📄 Página ${pageCount + 1}: ${orderSns.length} pedidos encontrados`);
      
      if (!result.hasMore || !result.nextCursor) {
        break;
      }
      
      cursor = result.nextCursor;
      pageCount++;
      
      // Pausa entre páginas para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Total de ${allOrderSns.length} order_sn encontrados para ${loja}`);
    return allOrderSns;
  }
  
  /**
   * 📦 Busca detalhes de pedidos em lotes
   * @param {Object} credentials - Credenciais da loja
   * @param {Array} orderSns - Lista de order_sn
   * @returns {Array} Lista de pedidos detalhados
   */
  async getDetailedOrdersInBatches(credentials, orderSns) {
    const { loja } = credentials;
    const detailedOrders = [];
    const totalBatches = Math.ceil(orderSns.length / this.batchSize);
    
    console.log(`📦 Buscando detalhes de ${orderSns.length} pedidos para ${loja} em ${totalBatches} lotes...`);
    
    for (let i = 0; i < orderSns.length; i += this.batchSize) {
      const batch = orderSns.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      
      console.log(`📦 Lote ${batchNumber}/${totalBatches}: ${batch.length} pedidos`);
      
      // Processar lote em paralelo com limite de concorrência
      const batchPromises = batch.map(async (orderSn) => {
        const result = await this.getOrderDetail(credentials, orderSn);
        if (result.success && result.order) {
          // Filtrar pedidos cancelados se necessário
          const order = result.order;
          if (order.order_status !== 'CANCELLED') {
            return order;
          }
        }
        return null;
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validOrders = batchResults.filter(order => order !== null);
      
      detailedOrders.push(...validOrders);
      
      console.log(`✅ Lote ${batchNumber}: ${validOrders.length} pedidos válidos`);
      
      // Pausa entre lotes para evitar rate limit
      if (i + this.batchSize < orderSns.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Total de ${detailedOrders.length} pedidos detalhados para ${loja}`);
    return detailedOrders;
  }
  
  /**
   * 📅 Busca pedidos completos por período
   * @param {Object} credentials - Credenciais da loja
   * @param {number} timeFrom - Timestamp inicial
   * @param {number} timeTo - Timestamp final
   * @returns {Array} Lista de pedidos completos
   */
  async getOrdersByPeriod(credentials, timeFrom, timeTo) {
    const { loja } = credentials;
    
    console.log(`📅 Buscando pedidos para ${loja} no período:`);
    console.log(`   De: ${new Date(timeFrom * 1000).toLocaleString()}`);
    console.log(`   Até: ${new Date(timeTo * 1000).toLocaleString()}`);
    
    // Buscar order_sn por create_time e update_time
    const createTimeOrderSns = await this.getAllOrderSns(credentials, timeFrom, timeTo, 'create_time');
    const updateTimeOrderSns = await this.getAllOrderSns(credentials, timeFrom, timeTo, 'update_time');
    
    // Combinar e remover duplicatas
    const allOrderSns = [...new Set([...createTimeOrderSns, ...updateTimeOrderSns])];
    
    console.log(`📋 Total de ${allOrderSns.length} order_sn únicos encontrados para ${loja}`);
    
    if (allOrderSns.length === 0) {
      console.log(`ℹ️ Nenhum pedido encontrado para ${loja} no período especificado`);
      return [];
    }
    
    // Buscar detalhes dos pedidos
    const detailedOrders = await this.getDetailedOrdersInBatches(credentials, allOrderSns);
    
    return detailedOrders;
  }
  
  /**
   * 💾 Salva pedidos no Supabase em lotes
   * @param {Array} orders - Lista de pedidos
   * @param {string} loja - Nome da loja
   * @returns {Object} Resultado da operação
   */
  async saveOrdersToSupabase(orders, loja, shopId) {
    if (!orders || orders.length === 0) {
      return { success: true, inserted: 0, updated: 0, skipped: 0 };
    }
    
    console.log(`💾 Salvando ${orders.length} pedidos para ${loja} no Supabase...`);
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const batchSize = 100; // Tamanho do lote para inserção
    
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(orders.length / batchSize);
      
      console.log(`💾 Processando lote ${batchNumber}/${totalBatches}: ${batch.length} pedidos`);
      
      for (const order of batch) {
        try {
          // Verificar se o pedido já existe
          const { data: existingOrder, error: selectError } = await supabase
            .from('shopee_orders')
            .select('order_sn, order_status, update_time')
            .eq('order_sn', order.order_sn)
            .limit(1);
          
          if (selectError) {
            console.error(`❌ Erro ao verificar pedido ${order.order_sn}:`, selectError.message);
            continue;
          }
          
          // Extrair dados do primeiro item (principal)
          const firstItem = order.item_list && order.item_list.length > 0 ? order.item_list[0] : null;
          
          // Extrair dados de logística do primeiro pacote
          const firstPackage = order.package_list && order.package_list.length > 0 ? order.package_list[0] : null;
          
          // Preparar dados do pedido - campos essenciais primeiro
          const orderData = {
            order_sn: order.order_sn,
            shop_id: shopId?.toString() || order.shop_id?.toString() || null,
            order_status: order.order_status,
            loja: loja,
            order_data: order || null // JSONB - salvar dados completos
          };
          
          // Adicionar campos opcionais apenas se existirem
          if (order.create_time) {
            orderData.create_time = new Date(order.create_time * 1000).toISOString();
          }
          if (order.update_time) {
            orderData.update_time = new Date(order.update_time * 1000).toISOString();
          }

          if (order.total_amount !== undefined) {
            orderData.total_amount = order.total_amount;
          }
          if (order.buyer_username) {
            orderData.buyer_username = order.buyer_username;
          }
          if (order.recipient_address) {
            orderData.recipient_address = order.recipient_address;
          }
          if (order.item_list) {
            orderData.item_list = order.item_list;
          }
          if (order.payment_method) {
            orderData.payment_method = order.payment_method;
          }
          if (firstPackage?.shipping_carrier || order.shipping_carrier) {
            orderData.shipping_carrier = firstPackage?.shipping_carrier || order.shipping_carrier;
          }
          if (order.tracking_number) {
            orderData.tracking_number = order.tracking_number;
          }
          if (order.estimated_shipping_fee !== undefined) {
            orderData.estimated_shipping_fee = order.estimated_shipping_fee;
          }
          if (order.actual_shipping_fee !== undefined) {
            orderData.actual_shipping_fee = order.actual_shipping_fee;
          }
          if (order.note) {
            orderData.note = order.note;
          }
          if (firstItem?.item_sku) {
            orderData.item_sku = firstItem.item_sku;
          }
          if (firstItem?.item_name) {
            orderData.item_name = firstItem.item_name;
          }
          if (firstItem?.model_sku) {
            orderData.model_sku = firstItem.model_sku;
          }
          if (firstPackage?.logistics_status) {
            orderData.logistics_status = firstPackage.logistics_status;
          }
          
          // Sempre adicionar timestamp de processamento
          orderData.processed_at = new Date().toISOString();
          
          if (existingOrder && existingOrder.length > 0) {
            const existing = existingOrder[0];
            
            // Verificar se precisa atualizar
            const needsUpdate = 
              existing.order_status !== order.order_status ||
              new Date(existing.update_time).getTime() !== (order.update_time * 1000);
            
            if (needsUpdate) {
              const { error: updateError } = await supabase
                .from('shopee_orders')
                .update(orderData)
                .eq('order_sn', order.order_sn);
              
              if (updateError) {
                console.error(`❌ Erro ao atualizar pedido ${order.order_sn}:`, updateError.message);
              } else {
                updated++;
              }
            } else {
              skipped++;
            }
          } else {
            // Inserir novo pedido
            const { error: insertError } = await supabase
              .from('shopee_orders')
              .insert(orderData);
            
            if (insertError) {
              console.error(`❌ Erro ao inserir pedido ${order.order_sn}:`, insertError.message);
            } else {
              inserted++;
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${order.order_sn}:`, error.message);
        }
      }
      
      // Pausa entre lotes
      if (i + batchSize < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Salvamento concluído para ${loja}:`);
    console.log(`   📥 Inseridos: ${inserted}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   ⏭️ Ignorados: ${skipped}`);
    
    return { success: true, inserted, updated, skipped };
  }
  
  /**
   * 🏪 Processa uma loja específica
   * @param {Object} shopData - Dados da loja
   * @param {number} timeFrom - Timestamp inicial
   * @param {number} timeTo - Timestamp final
   * @param {boolean} includeFinancialData - Se deve buscar dados financeiros
   * @returns {Object} Resultado do processamento
   */
  async processShop(shopData, timeFrom, timeTo, includeFinancialData = true) {
    const { loja, shop_id } = shopData;
    
    console.log(`\n🏪 Processando loja: ${loja} (ID: ${shop_id})`);
    console.log('='.repeat(50));
    
    try {
      // Verificar se o token está válido
      if (isTokenExpired(shopData)) {
        console.log(`⚠️ Token expirado para ${loja} - pulando loja`);
        return {
          success: false,
          error: 'Token expirado',
          loja,
          inserted: 0,
          updated: 0,
          skipped: 0,
          financialUpdates: 0
        };
      }
      
      // Buscar pedidos do período
      const orders = await this.getOrdersByPeriod(shopData, timeFrom, timeTo);
      
      // Salvar no Supabase
      const saveResult = await this.saveOrdersToSupabase(orders, loja, shop_id);
      
      let financialResult = { successfulUpdates: 0 };
      
      // 💰 Buscar dados financeiros se habilitado
      if (includeFinancialData && this.fetchFinancialData && saveResult.success) {
        console.log(`\n💰 Buscando dados financeiros para ${loja}...`);
        try {
          financialResult = await this.financialFetcher.processShopFinancialData(shop_id);
          if (financialResult.success) {
            console.log(`✅ Dados financeiros atualizados: ${financialResult.successfulUpdates} pedidos`);
          } else {
            console.log(`⚠️ Erro ao buscar dados financeiros: ${financialResult.error}`);
          }
        } catch (error) {
          console.log(`⚠️ Erro ao processar dados financeiros: ${error.message}`);
        }
      }
      
      return {
        success: true,
        loja,
        totalOrders: orders.length,
        financialUpdates: financialResult.successfulUpdates || 0,
        ...saveResult
      };
    } catch (error) {
      console.error(`❌ Erro ao processar loja ${loja}:`, error.message);
      return {
        success: false,
        error: error.message,
        loja,
        inserted: 0,
        updated: 0,
        skipped: 0,
        financialUpdates: 0
      };
    }
  }
  
  /**
   * 🚀 Processa todas as lojas em paralelo
   * @param {number} timeFrom - Timestamp inicial
   * @param {number} timeTo - Timestamp final
   * @param {number} maxConcurrency - Máximo de lojas processadas simultaneamente
   * @returns {Object} Resultado geral
   */
  async processAllShops(timeFrom, timeTo, maxConcurrency = 3) {
    console.log('🚀 SHOPEE ORDER FETCHER - PROCESSAMENTO PARALELO');
    console.log('='.repeat(60));
    console.log(`📅 Período: ${new Date(timeFrom * 1000).toLocaleString()} até ${new Date(timeTo * 1000).toLocaleString()}`);
    console.log(`⚡ Concorrência máxima: ${maxConcurrency} lojas`);
    
    // Buscar todas as lojas ativas
    const shops = await getAllActiveShops();
    
    if (!shops || shops.length === 0) {
      console.log('❌ Nenhuma loja ativa encontrada no banco de dados!');
      return { success: false, error: 'Nenhuma loja encontrada' };
    }
    
    console.log(`🏪 Encontradas ${shops.length} lojas ativas`);
    
    // Processar lojas em lotes com concorrência limitada
    const results = [];
    
    for (let i = 0; i < shops.length; i += maxConcurrency) {
      const batch = shops.slice(i, i + maxConcurrency);
      const batchNumber = Math.floor(i / maxConcurrency) + 1;
      const totalBatches = Math.ceil(shops.length / maxConcurrency);
      
      console.log(`\n🔄 Lote ${batchNumber}/${totalBatches}: Processando ${batch.length} lojas em paralelo...`);
      
      const batchPromises = batch.map(shop => this.processShop(shop, timeFrom, timeTo));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Pausa entre lotes
      if (i + maxConcurrency < shops.length) {
        console.log('⏸️ Pausa de 5 segundos entre lotes...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Calcular estatísticas finais
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalInserted = successful.reduce((sum, r) => sum + r.inserted, 0);
    const totalUpdated = successful.reduce((sum, r) => sum + r.updated, 0);
    const totalSkipped = successful.reduce((sum, r) => sum + r.skipped, 0);
    const totalOrders = successful.reduce((sum, r) => sum + (r.totalOrders || 0), 0);
    const totalFinancialUpdates = successful.reduce((sum, r) => sum + (r.financialUpdates || 0), 0);
    
    console.log('\n📊 RELATÓRIO FINAL');
    console.log('='.repeat(40));
    console.log(`🏪 Lojas processadas: ${successful.length}/${shops.length}`);
    console.log(`📦 Total de pedidos encontrados: ${totalOrders}`);
    console.log(`📥 Pedidos inseridos: ${totalInserted}`);
    console.log(`🔄 Pedidos atualizados: ${totalUpdated}`);
    console.log(`⏭️ Pedidos ignorados: ${totalSkipped}`);
    console.log(`💰 Dados financeiros atualizados: ${totalFinancialUpdates}`);
    
    if (failed.length > 0) {
      console.log(`\n❌ Lojas com erro (${failed.length}):`);
      failed.forEach(f => {
        console.log(`   - ${f.loja}: ${f.error}`);
      });
    }
    
    return {
      success: successful.length > 0,
      totalShops: shops.length,
      successfulShops: successful.length,
      failedShops: failed.length,
      totalOrders,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
      financialUpdates: totalFinancialUpdates,
      results
    };
  }
  
  /**
   * 📅 Busca pedidos das últimas 24 horas
   * @returns {Object} Resultado da operação
   */
  async fetchLast24Hours() {
    const now = Math.floor(Date.now() / 1000);
    const yesterday = now - (24 * 60 * 60);
    
    return await this.processAllShops(yesterday, now);
  }
  
  /**
   * 📅 Busca pedidos da última semana
   * @returns {Object} Resultado da operação
   */
  async fetchLastWeek() {
    const now = Math.floor(Date.now() / 1000);
    const lastWeek = now - (7 * 24 * 60 * 60);
    
    return await this.processAllShops(lastWeek, now);
  }
  
  /**
   * 📅 Busca pedidos do último mês
   * @returns {Object} Resultado da operação
   */
  async fetchLastMonth() {
    const now = Math.floor(Date.now() / 1000);
    const lastMonth = now - (30 * 24 * 60 * 60);
    
    return await this.processAllShops(lastMonth, now);
  }
}

// Função principal para execução via linha de comando
async function main() {
  const args = process.argv.slice(2);
  const fetcher = new ShopeeOrderFetcher();
  
  try {
    if (args.includes('--last-24h')) {
      console.log('📅 Modo: Últimas 24 horas');
      await fetcher.fetchLast24Hours();
    } else if (args.includes('--last-week')) {
      console.log('📅 Modo: Última semana');
      await fetcher.fetchLastWeek();
    } else if (args.includes('--last-month')) {
      console.log('📅 Modo: Último mês');
      await fetcher.fetchLastMonth();
    } else if (args.includes('--custom')) {
      // Modo customizado com timestamps
      const fromIndex = args.indexOf('--from');
      const toIndex = args.indexOf('--to');
      
      if (fromIndex === -1 || toIndex === -1) {
        console.log('❌ Para modo customizado, use: --custom --from TIMESTAMP --to TIMESTAMP');
        process.exit(1);
      }
      
      const timeFrom = parseInt(args[fromIndex + 1]);
      const timeTo = parseInt(args[toIndex + 1]);
      
      if (isNaN(timeFrom) || isNaN(timeTo)) {
        console.log('❌ Timestamps devem ser números válidos');
        process.exit(1);
      }
      
      console.log('📅 Modo: Período customizado');
      await fetcher.processAllShops(timeFrom, timeTo);
    } else {
      console.log('📅 Modo padrão: Últimas 24 horas');
      console.log('💡 Opções disponíveis:');
      console.log('   --last-24h    : Últimas 24 horas');
      console.log('   --last-week   : Última semana');
      console.log('   --last-month  : Último mês');
      console.log('   --custom --from TIMESTAMP --to TIMESTAMP : Período customizado');
      await fetcher.fetchLast24Hours();
    }
    
    console.log('\n✅ Processamento concluído!');
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ShopeeOrderFetcher;