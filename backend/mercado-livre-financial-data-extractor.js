import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import fetch from 'node-fetch';

// 🔐 CONFIGURAÇÕES SUPABASE
const SUPABASE_URL = 'https://uvszeoysaaphqsliinpj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g';

/**
 * 🏪 Classe para representar token do Mercado Livre
 */
class MLToken {
  constructor(id, clientId, key, accessToken, loja, lojaIdMl, empresa) {
    this.id = id;
    this.clientId = clientId;
    this.key = key;
    this.accessToken = accessToken;
    this.loja = loja;
    this.lojaIdMl = lojaIdMl;
    this.empresa = empresa;
  }
}

/**
 * 💰 Extrator de dados financeiros do Mercado Livre
 */
class MercadoLivreBillingExtractor {
  constructor() {
    this.baseUrl = 'https://api.mercadolibre.com';
    
    // 🔐 Inicializar cliente Supabase
    try {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('✅ Conectado ao Supabase');
    } catch (error) {
      console.error('❌ Erro ao conectar com Supabase:', error);
      this.supabase = null;
    }
  }

  /**
   * 🔐 Busca todos os tokens ativos do Mercado Livre
   */
  async getActiveTokens() {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('mercado_livre_tokens')
        .select('id, clientID, key, at, loja, loja_id_ML, empresa')
        .not('at', 'is', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const tokens = data.map(row => new MLToken(
          row.id,
          row.clientID,
          row.key,
          row.at,
          row.loja,
          row.loja_id_ML,
          row.empresa
        ));
        
        console.log(`🔐 Encontrados ${tokens.length} tokens ativos`);
        return tokens;
      } else {
        console.log('📭 Nenhum token ativo encontrado');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao buscar tokens:', error);
      return [];
    }
  }

  /**
   * 📋 Busca order_ids para consulta de billing
   * Filtra pedidos não pagos ou cancelados (exceto reembolsos)
   * Implementa paginação para buscar TODOS os pedidos sem limitação
   */
  async getOrderIds(lojaIdMl, last24hOnly = false) {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return [];
    }

    try {
      const pageSize = 1000; // Tamanho da página (limite do Supabase)
      let allOrders = [];
      let currentPage = 0;
      let hasMoreData = true;

      console.log(`🔍 Iniciando busca paginada de order_ids para loja ${lojaIdMl}`);

      while (hasMoreData) {
        let query = this.supabase
          .from('mercado_livre_orders')
          .select('order_id, order_status, has_refund')
          .eq('loja_id_ml', lojaIdMl)
          .not('order_id', 'is', null)
          .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)
          .order('order_id', { ascending: true }); // Ordenar para garantir consistência

        // Filtrar por últimas 24 horas se solicitado
        if (last24hOnly) {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          query = query.gte('date_created', yesterday);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
          allOrders = allOrders.concat(data);
          console.log(`📄 Página ${currentPage + 1}: ${data.length} registros encontrados (total acumulado: ${allOrders.length})`);
          
          // Se retornou menos que o tamanho da página, não há mais dados
          if (data.length < pageSize) {
            hasMoreData = false;
          } else {
            currentPage++;
          }
        } else {
          hasMoreData = false;
        }
      }

      if (allOrders.length > 0) {
        // Filtrar pedidos: incluir apenas pagos ou reembolsos
        const filteredOrders = allOrders.filter(order => {
          const status = order.order_status?.toLowerCase();
          const hasRefund = order.has_refund;
          
          // Incluir se:
          // 1. É um reembolso (independente do status)
          // 2. Status é pago/confirmado/entregue
          if (hasRefund) {
            return true; // Sempre incluir reembolsos
          }
          
          // Excluir pedidos não pagos ou cancelados
          const excludedStatuses = ['cancelled', 'not_paid', 'pending', 'payment_required'];
          return !excludedStatuses.includes(status);
        });
        
        const orderIds = filteredOrders.map(row => row.order_id).filter(id => id);
        console.log(`📋 TOTAL FINAL: ${orderIds.length} order_ids válidos para loja ${lojaIdMl} (filtrados de ${allOrders.length} total em ${currentPage + 1} páginas)`);
        return orderIds;
      } else {
        console.log(`📭 Nenhum order_id encontrado para loja ${lojaIdMl}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar order_ids para loja ${lojaIdMl}:`, error);
      return [];
    }
  }

  /**
   * 💰 Busca dados de billing da API do Mercado Livre usando endpoint correto
   */
  async getBillingData(accessToken, sellerId, orderIds, retryCount = 0) {
    // URL correta conforme código Python
    const url = `${this.baseUrl}/billing/integration/group/ML/order/details`;
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Limitar order_ids para evitar erro 413 (Request Entity Too Large)
    // Máximo de 50 order_ids por requisição
    const maxOrderIds = 50;
    let allResults = [];

    if (orderIds && orderIds.length > 0) {
      console.log(`📋 Total de ${orderIds.length} order_ids para processar`);
      
      // Processar em lotes se há muitos order_ids
      for (let i = 0; i < orderIds.length; i += maxOrderIds) {
        const batch = orderIds.slice(i, i + maxOrderIds);
        const batchNum = Math.floor(i/maxOrderIds) + 1;
        const totalBatches = Math.ceil(orderIds.length/maxOrderIds);
        
        console.log(`📋 Processando lote ${batchNum}/${totalBatches} (${batch.length} order_ids)`);
        
        const batchResult = await this.fetchBillingBatch(url, batch, headers, 0);
        
        if (batchResult.error) {
          console.error(`❌ Erro no lote ${batchNum}: ${batchResult.error}`);
          continue; // Continuar com próximo lote em caso de erro
        }
        
        if (batchResult.results && batchResult.results.length > 0) {
          allResults = allResults.concat(batchResult.results);
          console.log(`✅ Lote ${batchNum}: ${batchResult.results.length} registros encontrados`);
        } else {
          console.log(`📭 Lote ${batchNum}: nenhum registro encontrado`);
        }
        
        // Pequena pausa entre lotes para evitar rate limiting
        if (i + maxOrderIds < orderIds.length) {
          await this.sleep(2000); // 2 segundos entre lotes
        }
      }
      
      console.log(`✅ Total processado: ${allResults.length} registros de billing`);
      return { results: allResults };
    } else {
      console.log(`❌ Nenhum order_id fornecido para buscar billing`);
      return { results: [] };
    }
  }

  /**
   * 🔍 Busca um lote de dados de billing usando endpoint correto
   */
  async fetchBillingBatch(url, orderIdsBatch, headers, retryCount = 0) {
    const maxRetries = 3;
    
    // Parâmetros conforme código Python - usar order_ids como parâmetro
    const params = new URLSearchParams();
    
    // Adicionar order_ids se fornecidos (obrigatório para este endpoint)
    if (orderIdsBatch && orderIdsBatch.length > 0) {
      params.append('order_ids', orderIdsBatch.join(','));
    } else {
      console.log('❌ order_ids são obrigatórios para este endpoint');
      return { error: 'missing_order_ids' };
    }

    try {
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers,
        timeout: 30000
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Billing data obtido para ${orderIdsBatch.length} pedidos`);
        
        // Normalizar resposta para manter compatibilidade
        if (Array.isArray(data)) {
          return { results: data };
        } else if (data.results) {
          return data;
        } else {
          return { results: [data] };
        }
      } else if (response.status === 401) {
        console.log('❌ Token de acesso inválido ou expirado');
        return { error: 'unauthorized' };
      } else if (response.status === 403) {
        console.log('⚠️ Acesso negado (403) - aguardando antes de tentar novamente...');
        
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 30000; // Backoff exponencial: 30s, 60s, 120s
          console.log(`⏰ Aguardando ${waitTime / 1000}s antes da tentativa ${retryCount + 1}/${maxRetries}`);
          await this.sleep(waitTime);
          return this.fetchBillingBatch(url, orderIdsBatch, headers, retryCount + 1);
        } else {
          console.log('❌ Máximo de tentativas atingido para erro 403');
          return { error: 'forbidden_max_retries' };
        }
      } else if (response.status === 404) {
        console.log(`📭 Nenhum dado de billing encontrado para os pedidos fornecidos`);
        return { results: [] }; // Retornar array vazio em vez de erro
      } else if (response.status === 413) {
        console.log('⚠️ Request Entity Too Large (413) - lote muito grande');
        return { error: 'request_too_large' };
      } else if (response.status === 429) {
        console.log('⚠️ Rate limit atingido (429) - aguardando...');
        
        if (retryCount < maxRetries) {
          const waitTime = 60000; // 1 minuto para rate limit
          console.log(`⏰ Aguardando ${waitTime / 1000}s devido ao rate limit`);
          await this.sleep(waitTime);
          return this.fetchBillingBatch(url, orderIdsBatch, headers, retryCount + 1);
        } else {
          console.log('❌ Máximo de tentativas atingido para rate limit');
          return { error: 'rate_limit_max_retries' };
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Erro na API de billing: ${response.status} - ${errorText}`);
        return { error: `api_error_${response.status}` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Timeout na requisição de billing');
        return { error: 'timeout' };
      }
      console.log(`❌ Erro na requisição de billing: ${error}`);
      return { error: error.message };
    }
  }

  /**
   * 💾 Salva dados de billing em tabela separada no Supabase
   */
  async updateOrderBilling(orderId, lojaIdMl, billingData) {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return false;
    }
    try {
      // Processar estrutura de dados com múltiplos details
      const details = billingData.details || [];
      const paymentInfo = (billingData.payment_info && billingData.payment_info[0]) || {};
      
      // Inicializar variáveis para agregação
      let totalDetailAmount = 0;
      let totalDiscountAmount = 0;
      let mlSaleFee = 0;
      let mlShippingFee = 0;
      let mlManagementCost = 0;
      
      // Extrair informações dos primeiros registros (assumindo que são consistentes)
      let salesInfo = {};
      let itemsInfo = {};
      let shippingInfo = {};
      let currencyInfo = {};
      let documentInfo = {};
      
      // Processar cada detail para agregar valores
      details.forEach(detail => {
        const chargeInfo = detail.charge_info || {};
        const discountInfo = detail.discount_info || {};
        
        // Somar valores de cobrança
        totalDetailAmount += parseFloat(chargeInfo.detail_amount || 0);
        totalDiscountAmount += parseFloat(discountInfo.discount_amount || 0);
        
        // Categorizar taxas por tipo
        const detailSubType = chargeInfo.detail_sub_type;
        const detailAmount = parseFloat(chargeInfo.detail_amount || 0);
        
        switch (detailSubType) {
          case 'CVML': // Tarifa de venda do Mercado Livre
            mlSaleFee += detailAmount;
            break;
          case 'CDSB': // Tarifa do Mercado Envios
            mlShippingFee += detailAmount;
            break;
          case 'CVMP': // Custo de gestão da venda
            mlManagementCost += detailAmount;
            break;
        }
        
        // Extrair informações dos primeiros registros encontrados
        if (detail.sales_info && detail.sales_info[0] && Object.keys(salesInfo).length === 0) {
          salesInfo = detail.sales_info[0];
        }
        if (detail.items_info && detail.items_info[0] && Object.keys(itemsInfo).length === 0) {
          itemsInfo = detail.items_info[0];
        }
        if (detail.shipping_info && Object.keys(shippingInfo).length === 0) {
          shippingInfo = detail.shipping_info;
        }
        if (detail.currency_info && Object.keys(currencyInfo).length === 0) {
          currencyInfo = detail.currency_info;
        }
        if (detail.document_info && Object.keys(documentInfo).length === 0) {
          documentInfo = detail.document_info;
        }
      });
      
      // Calcular total de taxas do ML
      const mlTotalFees = mlSaleFee + mlShippingFee + mlManagementCost;
      
      // Estrutura baseada no novo endpoint de billing
      const billingRecord = {
        order_id: orderId,
        loja_id_ml: lojaIdMl,
        
        // Valores agregados
        detail_amount: totalDetailAmount,
        discount_amount: totalDiscountAmount,
        
        // Taxas categorizadas
        ml_sale_fee: mlSaleFee,
        ml_shipping_fee: mlShippingFee,
        ml_management_cost: mlManagementCost,
        ml_total_fees: mlTotalFees,
        
        // Informações de vendas (sales_info)
        transaction_amount: parseFloat(salesInfo.transaction_amount || 0),
        financing_fee: parseFloat(salesInfo.financing_fee || 0),
        financing_transfer_total: parseFloat(salesInfo.financing_transfer_total || 0),
        operation_id: salesInfo.operation_id || null,
        sale_date_time: salesInfo.sale_date_time || null,
        sales_channel: salesInfo.sales_channel || null,
        payer_nickname: salesInfo.payer_nickname || null,
        state_name: salesInfo.state_name || null,
        
        // Informações de envio (shipping_info)
        shipping_id: shippingInfo.shipping_id || null,
        pack_id: shippingInfo.pack_id || null,
        receiver_shipping_cost: parseFloat(shippingInfo.receiver_shipping_cost || 0),
        
        // Informações de itens (items_info)
        item_id: itemsInfo.item_id || null,
        item_kit_id: itemsInfo.item_kit_id || null,
        item_title: itemsInfo.item_title || null,
        item_type: itemsInfo.item_type || null,
        item_category: itemsInfo.item_category || null,
        item_amount: parseInt(itemsInfo.item_amount || 0),
        item_price: parseFloat(itemsInfo.item_price || 0),
        fees_added_in_publication: itemsInfo.fees_added_in_publication || false,
        
        // Informações de pagamento
        payment_status: paymentInfo.status || null,
        money_release_date: paymentInfo.money_release_date || null,
        money_release_status: paymentInfo.money_release_status || null,
        
        // Informações adicionais
        currency_id_billing: currencyInfo.currency_id || 'BRL',
        document_id: documentInfo.document_id || null,
        
        // Dados brutos e metadados
        billing_raw_data: billingData,
        billing_data_updated_at: new Date().toISOString(),
        has_billing_data: true
      };
      
      const { data, error } = await this.supabase
        .from('mercado_livre_orders')
        .upsert(billingRecord, {
          onConflict: 'order_id, loja_id_ml',
          ignoreDuplicates: false
        });
        
      if (error) throw error;
      console.log(`💾 Billing salvo para pedido ${orderId} - Total fees: R$ ${mlTotalFees.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao salvar billing do pedido ${orderId}:`, error);
      return false;
    }
  }

  /**
   * 🏪 Processa dados de billing para uma loja específica
   */
  async processBillingForStore(token) {
    const lojaIdMl = token.lojaIdMl;
    const lojaNome = token.loja || `Loja ${lojaIdMl}`;
    
    console.log(`\n🏪 Processando billing para loja: ${lojaNome} (ID: ${lojaIdMl})`);

    try {
      // Buscar order_ids da loja
      const orderIds = await this.getOrderIds(lojaIdMl);
      
      if (orderIds.length === 0) {
        console.log(`📭 Nenhum order_id encontrado para loja ${lojaNome}`);
        return { success: true, processed: 0, failed: 0 };
      }

      console.log(`📋 Encontrados ${orderIds.length} order_ids para processar`);
      
      let totalProcessed = 0;
      let totalFailed = 0;

      // Buscar dados de billing diretamente usando order_ids (sem períodos)
      console.log(`\n💰 Buscando dados de billing para ${orderIds.length} pedidos`);
      
      const billingResponse = await this.getBillingData(
        token.accessToken,
        lojaIdMl,
        orderIds // Usar order_ids diretamente
      );

      if (billingResponse.error) {
        console.log(`❌ Erro ao buscar billing: ${billingResponse.error}`);
        return { success: false, processed: 0, failed: 1 };
      }

      // Processar dados de billing retornados
      if (billingResponse.results && Array.isArray(billingResponse.results)) {
        console.log(`📊 Encontrados ${billingResponse.results.length} registros de billing`);
        
        let validRecords = 0;
        let invalidRecords = 0;
        
        for (const billingRecord of billingResponse.results) {
          try {
            // Extrair order_id dos dados de billing
            const orderId = this.extractOrderIdFromBillingRecord(billingRecord);
            
            // Verificar se o order_id retornado pela API realmente existe na nossa lista
            if (orderId && orderIds.includes(orderId)) {
              // Atualizar dados de billing no banco
              const updated = await this.updateOrderBilling(orderId, lojaIdMl, billingRecord);
              
              if (updated) {
                totalProcessed++;
                validRecords++;
                console.log(`💾 Billing atualizado para pedido ${orderId}`);
              } else {
                totalFailed++;
              }
            } else if (orderId) {
              invalidRecords++;
              console.log(`⚠️ Order ID ${orderId} retornado pela API não existe no banco de dados da loja`);
            }
          } catch (error) {
            console.error('❌ Erro ao processar billing record:', error);
            totalFailed++;
          }
        }
        
        console.log(`✅ Registros válidos: ${validRecords}, Registros inválidos: ${invalidRecords}`);
      } else {
        console.log(`📭 Nenhum dado de billing encontrado`);
      }

      console.log(`✅ Loja ${lojaNome} processada: ${totalProcessed} atualizados, ${totalFailed} falhas`);
      return { success: true, processed: totalProcessed, failed: totalFailed };

    } catch (error) {
      console.error(`❌ Erro ao processar loja ${lojaNome}:`, error);
      return { success: false, processed: 0, failed: 0 };
    }
  }

  /**
   * 🔍 Extrai order_id dos dados de billing record
   */
  extractOrderIdFromBillingRecord(billingRecord) {
    try {
      // Primeiro tenta extrair order_id diretamente do objeto (novo formato)
      if (billingRecord.order_id) {
        return String(billingRecord.order_id);
      }
      
      // Fallback: extrair order_id do array sales_info (formato antigo)
      if (billingRecord.sales_info && Array.isArray(billingRecord.sales_info) && billingRecord.sales_info.length > 0) {
        return String(billingRecord.sales_info[0].order_id);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao extrair order_id:', error);
      return null;
    }
  }

  /**
   * 🚀 Executa a extração de dados financeiros para todas as lojas
   */
  async runExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('💰 EXTRAÇÃO DE DADOS FINANCEIROS - MERCADO LIVRE');
    console.log('='.repeat(60));

    // Buscar todos os tokens ativos
    console.log('\n🔍 Buscando tokens ativos...');
    const tokens = await this.getActiveTokens();
    
    if (tokens.length === 0) {
      console.log('❌ Nenhum token ativo encontrado!');
      return;
    }

    console.log(`✅ ${tokens.length} tokens encontrados:`);
    tokens.forEach((token, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${token.loja} (ID: ${token.lojaIdMl})`);
    });

    let totalProcessed = 0;
    let totalFailed = 0;
    let successfulStores = 0;
    let failedStores = 0;

    console.log('\n' + '-'.repeat(60));

    // Processar cada loja
    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      const token = tokens[tokenIdx];
      console.log(`\n🏪 [${tokenIdx + 1}/${tokens.length}] PROCESSANDO LOJA: ${token.loja}`);
      console.log(`🆔 ID da Loja: ${token.lojaIdMl}`);

      try {
        const result = await this.processBillingForStore(token);
        
        if (result.success) {
          successfulStores++;
          totalProcessed += result.processed;
          totalFailed += result.failed;
          console.log(`✅ Loja processada com sucesso`);
        } else {
          failedStores++;
          console.log(`❌ Falha ao processar loja`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar loja ${token.loja}:`, error);
        failedStores++;
        continue;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO FINAL');
    console.log('='.repeat(60));
    console.log(`🏪 Lojas processadas: ${successfulStores}/${tokens.length}`);
    console.log(`❌ Lojas com erro: ${failedStores}`);
    console.log(`💰 Total de registros atualizados: ${totalProcessed}`);
    console.log(`❌ Total de falhas: ${totalFailed}`);
    console.log('='.repeat(60));
  }

  /**
   * ⏰ Função auxiliar para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🕐 Executa a extração de dados financeiros de forma agendada
 */
async function runScheduledExtraction() {
  try {
    console.log('🕐 Iniciando extração agendada de dados financeiros do Mercado Livre');
    const extractor = new MercadoLivreBillingExtractor();
    await extractor.runExtraction();
    console.log('✅ Extração agendada concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro na extração agendada:', error);
  }
}

/**
 * 📅 Configura o agendamento para executar a cada 6 horas
 */
function setupScheduler() {
  // Executar a cada 6 horas (00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', () => {
    console.log('🕐 Executando extração agendada de dados financeiros...');
    runScheduledExtraction();
  });

  console.log('📅 Agendamento configurado: execução a cada 6 horas (00:00, 06:00, 12:00, 18:00)');
}

/**
 * 🚀 Função principal
 */
async function main() {
  try {
    // Verificar argumentos da linha de comando
    const args = process.argv.slice(2);
    
    if (args.includes('--schedule')) {
      console.log('🕐 Iniciando modo agendado...');
      setupScheduler();
      
      // Executar uma vez imediatamente
      console.log('🚀 Executando extração inicial...');
      await runScheduledExtraction();
      
      // Manter o processo rodando
      console.log('⏰ Aguardando próximas execuções agendadas...');
      
    } else {
      // Execução única
      console.log('🚀 Executando extração única de dados financeiros...');
      await runScheduledExtraction();
      console.log('✅ Execução concluída');
    }
  } catch (error) {
    console.error('❌ Erro na execução principal:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MercadoLivreBillingExtractor, runScheduledExtraction, setupScheduler };
export default MercadoLivreBillingExtractor;