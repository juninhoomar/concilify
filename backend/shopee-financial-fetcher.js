#!/usr/bin/env node
/**
 * 💰 SHOPEE FINANCIAL DATA FETCHER - EXTRATOR DE DADOS FINANCEIROS
 * Busca dados financeiros (escrow/payment) dos pedidos da Shopee
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

class ShopeeFinancialFetcher {
  constructor() {
    this.baseUrl = 'https://partner.shopeemobile.com'; // Base URL da Shopee API
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos
    this.batchSize = 20; // Tamanho do lote para buscar dados financeiros
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
   * 💰 Busca detalhes de conciliação financeira de um pedido
   * @param {Object} credentials - Credenciais da loja
   * @param {string} orderSn - Número do pedido
   * @returns {Object} Dados financeiros do pedido
   */
  async getEscrowDetail(credentials, orderSn) {
    const { partner_id, partner_key, shop_id, access_token, loja } = credentials;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/payment/get_escrow_detail';
    
    const signature = this.generateShopSignature(
      apiPath, timestamp, access_token, partner_key, shop_id, partner_id
    );
    
    const params = {
      partner_id: parseInt(partner_id),
      timestamp,
      access_token,
      shop_id: parseInt(shop_id),
      sign: signature,
      order_sn: orderSn
    };
    
    try {
      const url = new URL(`${this.baseUrl}${apiPath}`);
      Object.entries(params).forEach(([key, value]) => {
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
        data: data.response || {},
        orderSn
      };
    } catch (error) {
      console.error(`❌ Erro ao buscar dados financeiros do pedido ${orderSn} para ${loja}:`, error.message);
      return {
        success: false,
        error: error.message,
        orderSn
      };
    }
  }
  
  /**
   * 📊 Extrai campos financeiros específicos dos dados de escrow
   * @param {Object} escrowData - Dados retornados pela API get_escrow_detail
   * @returns {Object} Dados financeiros organizados
   */
  extractFinancialFields(escrowData) {
    if (!escrowData) {
      return {};
    }
    
    // Dados do comprador
    const buyerInfo = escrowData.buyer_payment_info || {};
    
    // Dados de receita do pedido
    const orderIncome = escrowData.order_income || {};
    
    // 🏷️ VALORES FINANCEIROS
    const financialValues = {
      buyer_total_amount: buyerInfo.buyer_total_amount || 0,
      original_price: orderIncome.original_price || 0,
      order_selling_price: orderIncome.order_selling_price || 0,
      order_discounted_price: orderIncome.order_discounted_price || 0,
      seller_discount: orderIncome.seller_discount || 0,
      shopee_discount: orderIncome.shopee_discount || 0,
      merchant_subtotal: buyerInfo.merchant_subtotal || 0
    };
    
    // 💸 CUSTOS E TAXAS
    const costsAndFees = {
      commission_fee: orderIncome.commission_fee || 0,
      service_fee: orderIncome.service_fee || 0,
      cost_of_goods_sold: orderIncome.cost_of_goods_sold || 0,
      escrow_amount: orderIncome.escrow_amount || 0,
      actual_shipping_fee: orderIncome.actual_shipping_fee || 0,
      estimated_shipping_fee: orderIncome.estimated_shipping_fee || 0,
      shopee_shipping_rebate: orderIncome.shopee_shipping_rebate || 0,
      buyer_transaction_fee: orderIncome.buyer_transaction_fee || 0,
      seller_transaction_fee: orderIncome.seller_transaction_fee || 0,
      payment_promotion: orderIncome.payment_promotion || 0,
      withholding_tax: orderIncome.withholding_tax || 0
    };
    
    // Informações adicionais úteis
    const additionalInfo = {
      order_sn: escrowData.order_sn || '',
      buyer_user_name: escrowData.buyer_user_name || '',
      buyer_payment_method: buyerInfo.buyer_payment_method || '',
      is_paid_by_credit_card: buyerInfo.is_paid_by_credit_card || false,
      instalment_plan: orderIncome.instalment_plan || 'N/A',
      return_order_sn_list: escrowData.return_order_sn_list || []
    };
    
    return {
      financialValues,
      costsAndFees,
      additionalInfo
    };
  }
  
  /**
   * 📥 Busca pedidos que precisam de dados financeiros
   * @param {string} shopId - ID da loja (opcional)
   * @returns {Array} Lista de pedidos sem dados financeiros
   */
  async getOrdersNeedingFinancialData(shopId = null) {
    try {
      let query = supabase
        .from('shopee_orders')
        .select('id, order_sn, shop_id, order_status, has_financial_data, financial_data_updated_at, has_refund')
        .or('has_financial_data.is.null,has_financial_data.eq.false')
        .order('created_at', { ascending: false });
      
      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Filtrar apenas pedidos pagos ou com reembolso
      const filteredData = (data || []).filter(order => {
        const status = order.order_status?.toLowerCase();
        const hasRefund = order.has_refund;
        
        // Incluir apenas se:
        // 1. Tem reembolso (independente do status)
        // 2. Status indica que o pedido foi pago (excluir cancelled, unpaid, etc.)
        if (hasRefund) {
          return true;
        }
        
        // Excluir pedidos não pagos ou cancelados
        const excludedStatuses = ['cancelled', 'unpaid', 'to_ship', 'pending'];
        return !excludedStatuses.includes(status);
      });
      
      console.log(`📥 Encontrados ${data?.length || 0} pedidos totais, ${filteredData.length} após filtrar não pagos/cancelados`);
      return filteredData;
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos do Supabase:', error.message);
      return [];
    }
  }
  
  /**
   * 💾 Atualiza dados financeiros de um pedido na tabela shopee_orders
   * @param {string} orderId - ID do pedido na tabela
   * @param {Object} financialData - Dados financeiros extraídos
   * @returns {boolean} True se atualização foi bem-sucedida
   */
  async updateOrderFinancialData(orderId, financialData) {
    if (!financialData) {
      return false;
    }
    
    try {
      // Preparar dados para atualização
      const updateData = {
        ...financialData.financialValues,
        ...financialData.costsAndFees,
        buyer_user_name: financialData.additionalInfo.buyer_user_name,
        buyer_payment_method: financialData.additionalInfo.buyer_payment_method,
        is_paid_by_credit_card: financialData.additionalInfo.is_paid_by_credit_card,
        instalment_plan: financialData.additionalInfo.instalment_plan,
        return_order_sn_list: financialData.additionalInfo.return_order_sn_list,
        financial_data_updated_at: new Date().toISOString(),
        has_financial_data: true,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('shopee_orders')
        .update(updateData)
        .eq('id', orderId)
        .select();
      
      if (error) {
        throw error;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Erro ao atualizar dados financeiros no Supabase:', error.message);
      return false;
    }
  }
  
  /**
   * 📋 Processa lote de pedidos para buscar dados financeiros
   * @param {Object} credentials - Credenciais da loja
   * @param {Array} orders - Lista de pedidos para processar
   * @returns {Object} Estatísticas do processamento
   */
  async processOrdersBatch(credentials, orders) {
    if (!orders || orders.length === 0) {
      return {
        success: true,
        totalOrders: 0,
        successfulExtractions: 0,
        successfulUpdates: 0,
        errors: []
      };
    }
    
    console.log(`📋 Processando ${orders.length} pedidos para dados financeiros...`);
    
    let successfulExtractions = 0;
    let successfulUpdates = 0;
    const errors = [];
    
    // Processar em lotes menores para evitar sobrecarga
    for (let i = 0; i < orders.length; i += this.batchSize) {
      const batch = orders.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(orders.length / this.batchSize);
      
      console.log(`📦 Processando lote ${batchNum}/${totalBatches} (${batch.length} pedidos)...`);
      
      // Processar pedidos do lote em paralelo (limitado)
      const batchPromises = batch.map(async (order) => {
        try {
          const escrowResult = await this.getEscrowDetail(credentials, order.order_sn);
          
          if (escrowResult.success) {
            // Extrair campos específicos
            const financialData = this.extractFinancialFields(escrowResult.data);
            
            if (financialData && Object.keys(financialData.financialValues || {}).length > 0) {
              successfulExtractions++;
              
              // Atualizar dados na tabela
              const updateSuccess = await this.updateOrderFinancialData(order.id, financialData);
              
              if (updateSuccess) {
                successfulUpdates++;
                console.log(`✅ Pedido ${order.order_sn} atualizado com dados financeiros`);
                return { success: true, orderSn: order.order_sn };
              } else {
                const error = `Erro ao atualizar pedido ${order.order_sn} na base de dados`;
                errors.push(error);
                return { success: false, orderSn: order.order_sn, error };
              }
            } else {
              const error = `Não foi possível extrair dados financeiros do pedido ${order.order_sn}`;
              errors.push(error);
              return { success: false, orderSn: order.order_sn, error };
            }
          } else {
            const error = `Erro no pedido ${order.order_sn}: ${escrowResult.error}`;
            errors.push(error);
            return { success: false, orderSn: order.order_sn, error };
          }
        } catch (error) {
          const errorMsg = `Erro ao processar pedido ${order.order_sn}: ${error.message}`;
          errors.push(errorMsg);
          return { success: false, orderSn: order.order_sn, error: errorMsg };
        }
      });
      
      // Aguardar conclusão do lote
      await Promise.all(batchPromises);
      
      // Pausa entre lotes
      if (i + this.batchSize < orders.length) {
        console.log('⏳ Aguardando 2 segundos antes do próximo lote...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Estatísticas finais
    const successRate = orders.length > 0 ? (successfulUpdates / orders.length * 100) : 0;
    
    console.log(`\n✅ Processamento de dados financeiros concluído:`);
    console.log(`   🔄 ${orders.length} pedidos processados`);
    console.log(`   ✅ ${successfulExtractions} extrações bem-sucedidas`);
    console.log(`   💾 ${successfulUpdates} atualizações na base de dados`);
    console.log(`   📈 ${successRate.toFixed(1)}% de taxa de sucesso`);
    
    if (errors.length > 0) {
      console.log(`   ⚠️ ${errors.length} erros encontrados`);
      // Mostrar apenas os primeiros 5 erros para não poluir o log
      errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      if (errors.length > 5) {
        console.log(`   ... e mais ${errors.length - 5} erros`);
      }
    }
    
    return {
      success: successfulUpdates > 0,
      totalOrders: orders.length,
      successfulExtractions,
      successfulUpdates,
      errors,
      successRate
    };
  }
  
  /**
   * 🏪 Processa dados financeiros para uma loja específica
   * @param {string} shopId - ID da loja
   * @param {boolean} forceUpdate - Forçar atualização mesmo se já tem dados
   * @returns {Object} Resultado do processamento
   */
  async processShopFinancialData(shopId, forceUpdate = false) {
    try {
      // Buscar credenciais da loja
      const credentials = await getShopCredentials(shopId);
      if (!credentials) {
        throw new Error(`Credenciais não encontradas para a loja ${shopId}`);
      }
      
      // Verificar se token ainda é válido
      if (isTokenExpired(credentials.expires_at)) {
        throw new Error(`Token expirado para a loja ${shopId}`);
      }
      
      console.log(`🏪 Processando dados financeiros para ${credentials.loja} (${shopId})`);
      
      // Buscar pedidos que precisam de dados financeiros
      const orders = await this.getOrdersNeedingFinancialData(shopId);
      
      if (orders.length === 0) {
        console.log('✅ Todos os pedidos já possuem dados financeiros atualizados');
        return {
          success: true,
          loja: credentials.loja,
          totalOrders: 0,
          successfulUpdates: 0,
          message: 'Nenhum pedido precisava de atualização'
        };
      }
      
      // Processar pedidos
      const result = await this.processOrdersBatch(credentials, orders);
      
      return {
        success: result.success,
        loja: credentials.loja,
        ...result
      };
    } catch (error) {
      console.error(`❌ Erro ao processar dados financeiros da loja ${shopId}:`, error.message);
      return {
        success: false,
        loja: `Loja ${shopId}`,
        error: error.message,
        totalOrders: 0,
        successfulUpdates: 0
      };
    }
  }
  
  /**
   * 🌐 Processa dados financeiros de todas as lojas ativas
   * @param {boolean} forceUpdate - Forçar atualização mesmo se já tem dados
   * @returns {Object} Resultado consolidado do processamento
   */
  async processAllShopsFinancialData(forceUpdate = false) {
    console.log('\n🔄 INICIANDO PROCESSAMENTO DE DADOS FINANCEIROS DE TODAS AS LOJAS');
    console.log('='.repeat(70));
    
    try {
      // Buscar todas as lojas ativas
      const shops = await getAllActiveShops();
      
      if (!shops || shops.length === 0) {
        console.log('❌ Nenhuma loja ativa encontrada');
        return {
          success: false,
          totalShops: 0,
          successfulShops: 0,
          failedShops: 0,
          results: [],
          message: 'Nenhuma loja ativa encontrada'
        };
      }
      
      console.log(`🏪 Encontradas ${shops.length} lojas ativas para processar`);
      
      const results = [];
      let successfulShops = 0;
      let failedShops = 0;
      let totalOrders = 0;
      let totalUpdates = 0;
      
      // Processar cada loja sequencialmente para evitar sobrecarga
      for (let i = 0; i < shops.length; i++) {
        const shop = shops[i];
        const shopNum = i + 1;
        
        console.log(`\n🏪 Processando loja ${shopNum}/${shops.length}: ${shop.loja} (${shop.shop_id})`);
        console.log('-'.repeat(50));
        
        const result = await this.processShopFinancialData(shop.shop_id, forceUpdate);
        
        results.push(result);
        totalOrders += result.totalOrders || 0;
        totalUpdates += result.successfulUpdates || 0;
        
        if (result.success) {
          successfulShops++;
          console.log(`✅ ${shop.loja} processada com sucesso`);
        } else {
          failedShops++;
          console.log(`❌ Falha ao processar ${shop.loja}: ${result.error}`);
        }
        
        // Pausa entre lojas para evitar rate limiting
        if (i < shops.length - 1) {
          console.log('⏳ Aguardando 3 segundos antes da próxima loja...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Estatísticas finais
      const successRate = shops.length > 0 ? (successfulShops / shops.length * 100) : 0;
      
      console.log('\n' + '='.repeat(70));
      console.log('📊 RESUMO FINAL DO PROCESSAMENTO DE DADOS FINANCEIROS');
      console.log('='.repeat(70));
      console.log(`🏪 Total de lojas: ${shops.length}`);
      console.log(`✅ Lojas processadas com sucesso: ${successfulShops}`);
      console.log(`❌ Lojas com falha: ${failedShops}`);
      console.log(`📦 Total de pedidos processados: ${totalOrders}`);
      console.log(`💾 Total de atualizações realizadas: ${totalUpdates}`);
      console.log(`📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
      
      return {
        success: successfulShops > 0,
        totalShops: shops.length,
        successfulShops,
        failedShops,
        totalOrders,
        totalUpdates,
        successRate,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao processar dados financeiros de todas as lojas:', error.message);
      return {
        success: false,
        error: error.message,
        totalShops: 0,
        successfulShops: 0,
        failedShops: 0,
        results: []
      };
    }
  }
}

// Exportar classe
export { ShopeeFinancialFetcher };

// Execução via linha de comando
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new ShopeeFinancialFetcher();
  
  const command = process.argv[2];
  const shopId = process.argv[3];
  
  switch (command) {
    case 'shop':
      if (!shopId) {
        console.error('❌ Uso: node shopee-financial-fetcher.js shop <shop_id>');
        process.exit(1);
      }
      fetcher.processShopFinancialData(shopId)
        .then(result => {
          console.log('\n📊 Resultado:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Erro:', error.message);
          process.exit(1);
        });
      break;
      
    case 'all':
      fetcher.processAllShopsFinancialData()
        .then(result => {
          console.log('\n📊 Resultado final:', JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Erro:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('💰 SHOPEE FINANCIAL DATA FETCHER');
      console.log('\nUso:');
      console.log('  node shopee-financial-fetcher.js shop <shop_id>  # Processar uma loja específica');
      console.log('  node shopee-financial-fetcher.js all             # Processar todas as lojas');
      console.log('\nExemplos:');
      console.log('  node shopee-financial-fetcher.js shop 1143525481');
      console.log('  node shopee-financial-fetcher.js all');
      break;
  }
}