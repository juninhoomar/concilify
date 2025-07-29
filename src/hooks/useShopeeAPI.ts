import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { shopeeProxy, loadShopeeToken } from '@/lib/shopeeProxy';

interface ShopeeToken {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  shop_id: string;
  is_active: boolean;
}

interface ShopeeOrder {
  order_sn: string;
  order_status: string;
  total_amount: number;
  currency: string;
  create_time: number;
  update_time: number;
  buyer_username?: string;
  payment_method?: string;
  shipping_carrier?: string;
  actual_shipping_fee?: number;
  estimated_shipping_fee?: number;
  item_list?: any[];
  recipient_address?: any;
}

interface OrderListResponse {
  success: boolean;
  orders: ShopeeOrder[];
  has_more: boolean;
  next_cursor: string;
  total_count: number;
  error?: string;
}

interface OrderDetailResponse {
  success: boolean;
  orders: ShopeeOrder[];
  total_count: number;
  error?: string;
}

const SHOPEE_CONFIG = {
  PARTNER_ID: 2010568,
  PARTNER_KEY: "4c644b6d756a6155565456576b6c64446a46634a42455a65417052727a63616b",
  SHOP_ID: 1143525481,
  BASE_URL: "https://partner.shopeemobile.com"
};

export const useShopeeAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar token ativo do Supabase (usando função do proxy)
  const loadAccessToken = loadShopeeToken;

  // Buscar lista básica de pedidos (usando proxy)
  const getOrderList = async ({
    timeRangeField = 'create_time',
    timeFrom,
    timeTo,
    pageSize = 100,
    cursor = '',
    orderStatus
  }: {
    timeRangeField?: 'create_time' | 'update_time';
    timeFrom?: number;
    timeTo?: number;
    pageSize?: number;
    cursor?: string;
    orderStatus?: string;
  } = {}): Promise<OrderListResponse> => {
    try {
      // Definir período padrão (últimos 15 dias)
      const now = Math.floor(Date.now() / 1000);
      const defaultTimeFrom = now - (15 * 24 * 60 * 60);
      
      const finalTimeFrom = timeFrom || defaultTimeFrom;
      const finalTimeTo = timeTo || now;

      const result = await shopeeProxy.getOrderList({
        timeRangeField,
        timeFrom: finalTimeFrom,
        timeTo: finalTimeTo,
        pageSize,
        cursor,
        orderStatus
      });

      if (result.success && result.data) {
        const orderList = result.data.response?.order_list || [];
        const more = result.data.response?.more || false;
        const nextCursor = result.data.response?.next_cursor || '';

        return {
          success: true,
          orders: orderList,
          has_more: more,
          next_cursor: nextCursor,
          total_count: orderList.length
        };
      } else {
        throw new Error(result.error || 'Erro desconhecido na API');
      }
    } catch (err: any) {
      return {
        success: false,
        orders: [],
        has_more: false,
        next_cursor: '',
        total_count: 0,
        error: err.message
      };
    }
  };

  // Buscar detalhes completos de pedidos (usando proxy)
  const getOrderDetail = async (orderSnList: string[]): Promise<OrderDetailResponse> => {
    try {
      const result = await shopeeProxy.getOrderDetail(orderSnList);

      if (result.success && result.data) {
        const orderList = result.data.response?.order_list || [];

        return {
          success: true,
          orders: orderList,
          total_count: orderList.length
        };
      } else {
        throw new Error(result.error || 'Erro desconhecido na API');
      }
    } catch (err: any) {
      return {
        success: false,
        orders: [],
        total_count: 0,
        error: err.message
      };
    }
  };

  // Buscar todos os order_sn com paginação automática
  const getAllOrderSns = async ({
    timeRangeField = 'create_time',
    timeFrom,
    timeTo,
    orderStatus,
    maxPages = 50
  }: {
    timeRangeField?: 'create_time' | 'update_time';
    timeFrom?: number;
    timeTo?: number;
    orderStatus?: string;
    maxPages?: number;
  } = {}): Promise<{ success: boolean; order_sns: string[]; total_count: number; pages_fetched: number; error?: string }> => {
    const allOrderSns: string[] = [];
    let cursor = '';
    let page = 1;

    try {
      while (page <= maxPages) {
        const result = await getOrderList({
          timeRangeField,
          timeFrom,
          timeTo,
          cursor,
          orderStatus
        });

        if (!result.success) {
          throw new Error(result.error || 'Erro na busca de pedidos');
        }

        const orderSns = result.orders.map(order => order.order_sn).filter(Boolean);
        allOrderSns.push(...orderSns);

        if (!result.has_more) {
          break;
        }

        cursor = result.next_cursor;
        page++;
      }

      return {
        success: true,
        order_sns: allOrderSns,
        total_count: allOrderSns.length,
        pages_fetched: page - 1
      };
    } catch (err: any) {
      return {
        success: false,
        order_sns: [],
        total_count: 0,
        pages_fetched: page - 1,
        error: err.message
      };
    }
  };

  // Buscar detalhes de pedidos em lotes
  const getDetailedOrdersInBatches = async (orderSns: string[], batchSize = 50): Promise<OrderDetailResponse> => {
    const allDetailedOrders: ShopeeOrder[] = [];
    const totalBatches = Math.ceil(orderSns.length / batchSize);

    try {
      for (let i = 0; i < orderSns.length; i += batchSize) {
        const batch = orderSns.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        console.log(`Processando lote ${batchNum}/${totalBatches}: ${batch.length} pedidos`);

        const result = await getOrderDetail(batch);

        if (result.success) {
          allDetailedOrders.push(...result.orders);
        } else {
          console.error(`Erro no lote ${batchNum}:`, result.error);
        }

        // Pequena pausa entre lotes
        if (batchNum < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return {
        success: true,
        orders: allDetailedOrders,
        total_count: allDetailedOrders.length
      };
    } catch (err: any) {
      return {
        success: false,
        orders: allDetailedOrders,
        total_count: allDetailedOrders.length,
        error: err.message
      };
    }
  };

  // Buscar pedidos completos por período
  const getOrdersByPeriod = async (daysBack = 15, statusFilter?: string): Promise<OrderDetailResponse> => {
    setLoading(true);
    setError(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      const timeFrom = now - (daysBack * 24 * 60 * 60);

      console.log(`Buscando pedidos dos últimos ${daysBack} dias`);
      if (statusFilter) {
        console.log(`Filtro de status: ${statusFilter}`);
      }

      // Etapa 1: Buscar order_sns por data de criação
      console.log('Etapa 1: Buscando order_sn por create_time');
      const createResult = await getAllOrderSns({
        timeRangeField: 'create_time',
        timeFrom,
        timeTo: now,
        orderStatus: statusFilter,
        maxPages: 50
      });

      // Etapa 2: Buscar order_sns por data de atualização (últimos 7 dias)
      console.log('Etapa 2: Buscando order_sn por update_time');
      const updateTimeFrom = now - (7 * 24 * 60 * 60);
      const updateResult = await getAllOrderSns({
        timeRangeField: 'update_time',
        timeFrom: updateTimeFrom,
        timeTo: now,
        orderStatus: statusFilter,
        maxPages: 20
      });

      // Combinar order_sns e remover duplicatas
      const allOrderSns: string[] = [];
      const orderSnsSet = new Set<string>();

      if (createResult.success) {
        createResult.order_sns.forEach(orderSn => {
          if (!orderSnsSet.has(orderSn)) {
            allOrderSns.push(orderSn);
            orderSnsSet.add(orderSn);
          }
        });
      }

      if (updateResult.success) {
        updateResult.order_sns.forEach(orderSn => {
          if (!orderSnsSet.has(orderSn)) {
            allOrderSns.push(orderSn);
            orderSnsSet.add(orderSn);
          }
        });
      }

      console.log(`Total de order_sn únicos encontrados: ${allOrderSns.length}`);

      if (allOrderSns.length === 0) {
        return {
          success: true,
          orders: [],
          total_count: 0
        };
      }

      // Etapa 3: Buscar detalhes completos dos pedidos
      console.log('Etapa 3: Buscando detalhes completos dos pedidos');
      const detailedResult = await getDetailedOrdersInBatches(allOrderSns);

      return detailedResult;
    } catch (err: any) {
      setError(err.message);
      return {
        success: false,
        orders: [],
        total_count: 0,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Interface para resultado de salvamento
  interface SaveResult {
    success: boolean;
    totalNew: number;
    totalUpdated: number;
    totalUnchanged: number;
    totalProcessed: number;
    error?: string;
  }

  // Salvar pedidos no Supabase
  const saveOrdersToSupabase = async (orders: ShopeeOrder[]): Promise<SaveResult> => {
    console.log('🔍 [DEBUG] saveOrdersToSupabase iniciado');
    console.log('🔍 [DEBUG] Pedidos recebidos:', orders?.length || 0);
    
    if (!orders || orders.length === 0) {
      console.log('⚠️ [DEBUG] Nenhum pedido para salvar');
      return {
        success: true,
        totalNew: 0,
        totalUpdated: 0,
        totalUnchanged: 0,
        totalProcessed: 0
      };
    }

    // Declarar variáveis fora do try/catch para serem acessíveis no catch
    let totalNew = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    try {
      console.log(`🔄 [DEBUG] Salvando ${orders.length} pedidos no Supabase...`);
      console.log('🔍 [DEBUG] Primeiros 3 pedidos:', orders.slice(0, 3).map(o => ({ order_sn: o.order_sn, order_status: o.order_status })));

      // Processar pedidos em lotes para evitar requisições muito grandes
      const batchSize = 100;

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(orders.length / batchSize);

        console.log(`Processando lote ${batchNum}/${totalBatches}: ${batch.length} pedidos`);

        // Buscar pedidos existentes no banco para este lote
        const orderSns = batch.map(order => order.order_sn);
        const { data: existingOrders } = await supabase
          .from('shopee_orders')
          .select('id, order_sn, order_status, update_time')
          .eq('shop_id', SHOPEE_CONFIG.SHOP_ID.toString())
          .in('order_sn', orderSns);

        // Criar dicionário para lookup rápido
        const existingDict: Record<string, any> = {};
        existingOrders?.forEach(existing => {
          existingDict[existing.order_sn] = existing;
        });

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        batch.forEach(order => {
          const orderData = {
            order_sn: order.order_sn,
            shop_id: SHOPEE_CONFIG.SHOP_ID.toString(),
            order_status: order.order_status,
            create_time: order.create_time ? new Date(order.create_time * 1000).toISOString() : null,
            update_time: order.update_time ? new Date(order.update_time * 1000).toISOString() : null,
            order_data: order // Armazenar todos os dados do pedido no campo JSONB
          };

          const existing = existingDict[order.order_sn];

          if (!existing) {
            // Novo pedido
            console.log(`📦 [DEBUG] Novo pedido encontrado: ${order.order_sn}`);
            toInsert.push(orderData);
            totalNew++;
          } else {
            // Verificar se precisa atualizar
            const statusChanged = existing.order_status !== order.order_status;
            const updateTimeChanged = existing.update_time !== orderData.update_time;

            console.log(`🔍 [DEBUG] Verificando pedido ${order.order_sn}:`);
            console.log(`   Status atual: ${existing.order_status} -> Novo: ${order.order_status} (mudou: ${statusChanged})`);
            console.log(`   Update time atual: ${existing.update_time} -> Novo: ${orderData.update_time} (mudou: ${updateTimeChanged})`);

            if (statusChanged || updateTimeChanged) {
              console.log(`🔄 [DEBUG] Pedido será atualizado: ${order.order_sn}`);
              toUpdate.push({
                order_sn: order.order_sn,
                order_status: order.order_status,
                update_time: order.update_time ? new Date(order.update_time * 1000).toISOString() : null,
                order_data: order
              });
              totalUpdated++;
            } else {
              console.log(`➖ [DEBUG] Pedido inalterado: ${order.order_sn}`);
              totalUnchanged++;
            }
          }
        });

        // Inserir novos pedidos
        if (toInsert.length > 0) {
          console.log(`📥 [DEBUG] Inserindo ${toInsert.length} novos pedidos`);
          const { error: insertError } = await supabase
            .from('shopee_orders')
            .insert(toInsert);

          if (insertError) {
            console.error('❌ [DEBUG] Erro ao inserir pedidos:', insertError);
            throw insertError;
          }
          console.log(`✅ [DEBUG] ${toInsert.length} pedidos inseridos com sucesso`);
        }

        // Atualizar pedidos existentes
        if (toUpdate.length > 0) {
          console.log(`🔄 [DEBUG] Atualizando ${toUpdate.length} pedidos existentes`);
          for (const orderToUpdate of toUpdate) {
            const { error: updateError } = await supabase
              .from('shopee_orders')
              .update(orderToUpdate)
              .eq('order_sn', orderToUpdate.order_sn)
              .eq('shop_id', SHOPEE_CONFIG.SHOP_ID.toString());

            if (updateError) {
              console.error('❌ [DEBUG] Erro ao atualizar pedido:', updateError);
              throw updateError;
            }
          }
          console.log(`✅ [DEBUG] ${toUpdate.length} pedidos atualizados com sucesso`);
        }
      }

      console.log(`✅ [DEBUG] Salvamento concluído:`);
      console.log(`   📦 Novos pedidos: ${totalNew}`);
      console.log(`   🔄 Pedidos atualizados: ${totalUpdated}`);
      console.log(`   ⏭️ Pedidos inalterados: ${totalUnchanged}`);
      console.log(`   📊 Total processado: ${orders.length}`);

      const result = {
        success: true,
        totalNew,
        totalUpdated,
        totalUnchanged,
        totalProcessed: orders.length
      };
      
      console.log('🎯 [DEBUG] Resultado final:', result);
      return result;
    } catch (err: any) {
      console.error('❌ [DEBUG] Erro ao salvar pedidos:', err);
      setError(err.message);
      const errorResult = {
        success: false,
        totalNew,
        totalUpdated,
        totalUnchanged,
        totalProcessed: orders.length,
        error: err.message
      };
      console.log('💥 [DEBUG] Resultado de erro:', errorResult);
      return errorResult;
    }
  };

  return {
    loading,
    error,
    getOrdersByPeriod,
    saveOrdersToSupabase,
    getOrderList,
    getOrderDetail,
    getAllOrderSns,
    getDetailedOrdersInBatches
  };
};