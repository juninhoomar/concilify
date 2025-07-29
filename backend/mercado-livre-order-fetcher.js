import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import fetch from 'node-fetch';

// 🔐 CONFIGURAÇÕES SUPABASE
const SUPABASE_URL = 'https://uvszeoysaaphqsliinpj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g';

class MercadoLivreOrderFetcher {
  constructor(lojaIdMl = null) {
    this.baseUrl = 'https://api.mercadolibre.com';
    this.lojaIdMl = lojaIdMl;
    
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
   * 📋 Busca todas as lojas ativas do Mercado Livre no Supabase
   */
  async getAllActiveStores() {
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
        console.log(`📋 Encontradas ${data.length} lojas ativas do Mercado Livre`);
        return data;
      } else {
        console.log('📭 Nenhuma loja ativa encontrada');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao buscar lojas:', error);
      return [];
    }
  }

  /**
   * 🔐 Busca credenciais de uma loja específica
   */
  async getStoreCredentials(lojaIdMl) {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('mercado_livre_tokens')
        .select('id, clientID, key, at, loja, loja_id_ML, empresa')
        .eq('loja_id_ML', lojaIdMl)
        .not('at', 'is', null)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0];
      } else {
        console.log(`❌ Credenciais não encontradas para loja ${lojaIdMl}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar credenciais:', error);
      return null;
    }
  }

  /**
   * 📦 Busca pedidos da API do Mercado Livre
   */
  async fetchOrdersFromApi(accessToken, sellerId, offset = 0, limit = 50) {
    const url = `${this.baseUrl}/orders/search`;
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Calcular data de 7 dias atrás para otimização
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      seller: sellerId,
      offset: offset.toString(),
      limit: limit.toString(),
      sort: 'date_desc',
      'order.date_created.from': sevenDaysAgo,
      'order.last_updated.from': sevenDaysAgo
    });

    try {
      console.log(`🔍 Buscando pedidos: offset=${offset}, limit=${limit}`);
      
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers,
        timeout: 30000
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 401) {
        console.log('❌ Token de acesso inválido ou expirado');
        return { error: 'unauthorized' };
      } else if (response.status === 429) {
        console.log('⚠️ Rate limit atingido, aguardando...');
        await this.sleep(60000); // Aguardar 1 minuto
        return this.fetchOrdersFromApi(accessToken, sellerId, offset, limit);
      } else {
        const errorText = await response.text();
        console.log(`❌ Erro na API: ${response.status} - ${errorText}`);
        return { error: `api_error_${response.status}` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏰ Timeout na requisição');
        return { error: 'timeout' };
      }
      console.log(`❌ Erro na requisição: ${error}`);
      return { error: error.message };
    }
  }

  /**
   * 🔍 Busca detalhes completos de um pedido específico
   */
  async getOrderDetail(accessToken, orderId) {
    const url = `${this.baseUrl}/orders/${orderId}`;
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        timeout: 30000
      });

      if (response.ok) {
        return await response.json();
      } else if (response.status === 401) {
        console.log(`❌ Token inválido para pedido ${orderId}`);
        return { error: 'unauthorized' };
      } else if (response.status === 429) {
        console.log('⚠️ Rate limit atingido, aguardando...');
        await this.sleep(60000);
        return this.getOrderDetail(accessToken, orderId);
      } else {
        console.log(`❌ Erro ao buscar pedido ${orderId}: ${response.status}`);
        return { error: `api_error_${response.status}` };
      }
    } catch (error) {
      console.log(`❌ Erro ao buscar detalhes do pedido ${orderId}: ${error}`);
      return { error: error.message };
    }
  }

  /**
   * 🔄 Processa dados do pedido para formato do banco
   */
  processOrderData(orderData, lojaIdMl, empresaId) {
    try {
      // Converter timestamps para datetime
      let dateCreated = null;
      let dateClosed = null;

      if (orderData.date_created) {
        dateCreated = new Date(orderData.date_created).toISOString();
      }

      if (orderData.date_closed) {
        dateClosed = new Date(orderData.date_closed).toISOString();
      }

      // Extrair informações básicas
      const processedData = {
        order_id: String(orderData.id || ''),
        loja_id_ml: lojaIdMl,
        order_status: orderData.status || '',
        date_created: dateCreated,
        date_closed: dateClosed,
        order_data: orderData, // Dados completos em JSON
        empresa_id: empresaId,
        
        // Campos básicos
        total_amount: parseFloat(orderData.total_amount || 0),
        currency_id: orderData.currency_id || 'BRL',
        
        // Informações do comprador
        buyer_id: String(orderData.buyer?.id || ''),
        
        // Informações do vendedor
        seller_id: String(orderData.seller?.id || ''),
        
        // Informações de envio
        shipping_id: String(orderData.shipping?.id || ''),
        
        last_updated: new Date().toISOString()
      };

      return processedData;
    } catch (error) {
      console.error('❌ Erro ao processar dados do pedido:', error);
      return null;
    }
  }

  /**
   * 💾 Salva pedidos no Supabase com lógica de upsert
   */
  async saveOrdersToSupabase(orders, batchSize = 100) {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return false;
    }

    if (!orders || orders.length === 0) {
      console.log('📭 Nenhum pedido para salvar');
      return true;
    }

    console.log(`💾 Salvando ${orders.length} pedidos em lotes de ${batchSize}...`);

    try {
      let totalNew = 0;
      let totalUpdated = 0;
      const totalBatches = Math.ceil(orders.length / batchSize);

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        console.log(`💾 Processando lote ${batchNum}/${totalBatches}: ${batch.length} pedidos`);

        for (const order of batch) {
          try {
            // Verificar se pedido já existe
            const { data: existing, error: selectError } = await this.supabase
              .from('mercado_livre_orders')
              .select('id, order_status, last_updated')
              .eq('order_id', order.order_id)
              .eq('loja_id_ml', order.loja_id_ml)
              .limit(1);

            if (selectError) throw selectError;

            if (existing && existing.length > 0) {
              // Atualizar pedido existente
              const { data: updateData, error: updateError } = await this.supabase
                .from('mercado_livre_orders')
                .update(order)
                .eq('id', existing[0].id);

              if (updateError) throw updateError;

              if (updateData !== null) {
                totalUpdated++;
                console.log(`🔄 Pedido ${order.order_id} atualizado`);
              }
            } else {
              // Inserir novo pedido
              const { data: insertData, error: insertError } = await this.supabase
                .from('mercado_livre_orders')
                .insert(order);

              if (insertError) throw insertError;

              if (insertData !== null) {
                totalNew++;
                console.log(`✅ Novo pedido ${order.order_id} inserido`);
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao salvar pedido ${order.order_id || 'unknown'}:`, error);
            continue;
          }
        }

        // Pequena pausa entre lotes
        await this.sleep(500);
      }

      console.log(`✅ Processamento concluído: ${totalNew} novos, ${totalUpdated} atualizados`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar pedidos:', error);
      return false;
    }
  }

  /**
   * 🗑️ Deleta pedidos não pagos com mais de 15 dias
   */
  async deleteOldUnpaidOrders(lojaIdMl = null) {
    if (!this.supabase) {
      console.log('❌ Supabase não conectado');
      return false;
    }

    try {
      // Data limite: 15 dias atrás
      const cutoffDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

      // Construir query base
      let query = this.supabase
        .from('mercado_livre_orders')
        .select('id, order_id, loja_id_ml, order_status, date_created')
        .in('order_status', ['pending_payment', 'payment_required', 'cancelled'])
        .lt('date_created', cutoffDate);

      // Filtrar por loja específica se fornecida
      if (lojaIdMl) {
        query = query.eq('loja_id_ml', lojaIdMl);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('📭 Nenhum pedido antigo não pago encontrado para deletar');
        return true;
      }

      console.log(`🗑️ Encontrados ${data.length} pedidos não pagos antigos para deletar`);

      // Deletar em lotes
      let deletedCount = 0;
      for (const order of data) {
        try {
          const { data: deleteData, error: deleteError } = await this.supabase
            .from('mercado_livre_orders')
            .delete()
            .eq('id', order.id);

          if (deleteError) throw deleteError;

          if (deleteData !== null) {
            deletedCount++;
            console.log(`🗑️ Pedido ${order.order_id} deletado (status: ${order.order_status})`);
          }
        } catch (error) {
          console.error(`❌ Erro ao deletar pedido ${order.order_id}:`, error);
          continue;
        }
      }

      console.log(`✅ Limpeza concluída: ${deletedCount} pedidos deletados`);
      return true;
    } catch (error) {
      console.error('❌ Erro na limpeza de pedidos antigos:', error);
      return false;
    }
  }

  /**
   * 📦 Busca pedidos de uma loja específica
   */
  async fetchOrdersForStore(storeCredentials, daysBack = 7, updatesOnly = true) {
    const accessToken = storeCredentials.at;
    const lojaIdMl = storeCredentials.loja_id_ML;
    const empresaId = storeCredentials.empresa;
    const lojaNome = storeCredentials.loja || `Loja ${lojaIdMl}`;

    if (!accessToken || !lojaIdMl) {
      console.log(`❌ Credenciais incompletas para loja ${lojaNome}`);
      return [];
    }

    console.log(`🏪 Buscando pedidos para loja: ${lojaNome} (ID: ${lojaIdMl})`);

    const allOrders = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      // Buscar lote de pedidos
      const response = await this.fetchOrdersFromApi(accessToken, lojaIdMl, offset, limit);

      if (response.error) {
        console.log(`❌ Erro ao buscar pedidos: ${response.error}`);
        break;
      }

      const orders = response.results || [];

      if (orders.length === 0) {
        console.log('📭 Nenhum pedido encontrado neste lote');
        break;
      }

      console.log(`📦 Encontrados ${orders.length} pedidos no lote (offset: ${offset})`);

      // Processar cada pedido
      for (const order of orders) {
        // Filtrar pedidos cancelados - não processar
        if (order.status === 'cancelled') {
          console.log(`⏭️ Pulando pedido cancelado: ${order.id}`);
          continue;
        }

        // Buscar detalhes completos do pedido
        const orderDetail = await this.getOrderDetail(accessToken, String(order.id));

        if (!orderDetail.error) {
          // Verificar novamente no detalhe se não é cancelado
          if (orderDetail.status === 'cancelled') {
            console.log(`⏭️ Pulando pedido cancelado (detalhe): ${orderDetail.id}`);
            continue;
          }

          const processedOrder = this.processOrderData(orderDetail, lojaIdMl, empresaId);
          if (processedOrder) {
            allOrders.push(processedOrder);
          }
        }

        // Pequena pausa para evitar rate limit
        await this.sleep(100);
      }

      // Verificar se há mais páginas
      const paging = response.paging || {};
      const total = paging.total || 0;

      offset += limit;

      if (offset >= total) {
        console.log(`✅ Todos os pedidos foram buscados (total: ${total})`);
        break;
      }

      // Pausa entre páginas
      await this.sleep(1000);
    }

    console.log(`📊 Total de pedidos processados para ${lojaNome}: ${allOrders.length}`);
    return allOrders;
  }

  /**
   * 🚀 Executa a busca de pedidos para todas as lojas
   */
  async runOrderFetch() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 BUSCA DE PEDIDOS - MERCADO LIVRE');
    console.log('='.repeat(60));

    // Busca todas as lojas ativas
    console.log('\n🔍 Buscando lojas ativas...');
    const stores = await this.getAllActiveStores();
    
    if (stores.length === 0) {
      console.log('❌ Nenhuma loja ativa encontrada!');
      return;
    }

    console.log(`✅ ${stores.length} lojas encontradas:`);
    stores.forEach((store, index) => {
      console.log(`   ${(index + 1).toString().padStart(2)}. ${store.loja} (ID: ${store.loja_id_ML})`);
    });

    let totalProcessed = 0;
    let successfulStores = 0;
    let failedStores = 0;

    console.log('\n' + '-'.repeat(60));

    for (let storeIdx = 0; storeIdx < stores.length; storeIdx++) {
      const store = stores[storeIdx];
      console.log(`\n🏪 [${storeIdx + 1}/${stores.length}] PROCESSANDO LOJA: ${store.loja}`);
      console.log(`🆔 ID da Loja: ${store.loja_id_ML}`);

      try {
        // Buscar pedidos da loja
        const orders = await this.fetchOrdersForStore(store);
        
        if (orders.length > 0) {
          // Salvar pedidos no banco
          const saved = await this.saveOrdersToSupabase(orders);
          
          if (saved) {
            totalProcessed += orders.length;
            successfulStores++;
            console.log(`✅ Loja processada: ${orders.length} pedidos`);
          } else {
            failedStores++;
            console.log('❌ Erro ao salvar pedidos');
          }
        } else {
          successfulStores++;
          console.log('📭 Nenhum pedido novo encontrado');
        }

        // Limpeza de pedidos antigos não pagos
        await this.deleteOldUnpaidOrders(store.loja_id_ML);

      } catch (error) {
        console.error(`❌ Erro ao processar loja ${store.loja}:`, error);
        failedStores++;
        continue;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO FINAL');
    console.log('='.repeat(60));
    console.log(`🏪 Lojas processadas: ${successfulStores}/${stores.length}`);
    console.log(`❌ Lojas com erro: ${failedStores}`);
    console.log(`📦 Total de pedidos processados: ${totalProcessed}`);
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
 * 🕐 Executa a busca de pedidos de forma agendada
 */
async function runScheduledOrderFetch() {
  try {
    console.log('🕐 Iniciando busca agendada de pedidos do Mercado Livre');
    const fetcher = new MercadoLivreOrderFetcher();
    await fetcher.runOrderFetch();
    console.log('✅ Busca agendada concluída com sucesso');
  } catch (error) {
    console.error('❌ Erro na busca agendada:', error);
  }
}

/**
 * 📅 Configura o agendamento para executar a cada 2 horas
 */
function setupScheduler() {
  // Executar a cada 2 horas
  cron.schedule('0 */2 * * *', () => {
    console.log('🕐 Executando busca agendada de pedidos...');
    runScheduledOrderFetch();
  });

  console.log('📅 Agendamento configurado: execução a cada 2 horas');
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
      console.log('🚀 Executando busca inicial...');
      await runScheduledOrderFetch();
      
      // Manter o processo rodando
      console.log('⏰ Aguardando próximas execuções agendadas...');
      
    } else {
      // Execução única
      console.log('🚀 Executando busca única de pedidos...');
      await runScheduledOrderFetch();
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

export { MercadoLivreOrderFetcher, runScheduledOrderFetch, setupScheduler };
export default MercadoLivreOrderFetcher;