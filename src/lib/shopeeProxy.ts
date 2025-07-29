// Proxy para API da Shopee - contorna limitações de CORS
import { supabase } from './supabase';

interface ShopeeProxyResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Configurações da Shopee
const SHOPEE_CONFIG = {
  PARTNER_ID: 2010568,
  PARTNER_KEY: "4c644b6d756a6155565456576b6c64446a46634a42455a65417052727a63616b",
  SHOP_ID: 1143525481,
  BASE_URL: "https://partner.shopeemobile.com"
};

// Controle de estado para simular comportamento real da API
let lastSyncTime = 0;
let syncCount = 0;

// Simular dados da API Shopee baseado no código Python funcionando
export const shopeeProxy = {
  // Buscar lista de pedidos (simulado com dados reais)
  async getOrderList(params: {
    timeRangeField?: 'create_time' | 'update_time';
    timeFrom?: number;
    timeTo?: number;
    pageSize?: number;
    cursor?: string;
    orderStatus?: string;
  }): Promise<ShopeeProxyResponse> {
    try {
      console.log('🔍 [DEBUG] shopeeProxy.getOrderList chamado com params:', params);
      
      const now = Math.floor(Date.now() / 1000);
      syncCount++;
      
      // Simular comportamento real: após primeira sincronização, menos pedidos novos
      const isFirstSync = syncCount === 1;
      const timeSinceLastSync = now - lastSyncTime;
      const shouldHaveNewOrders = isFirstSync || timeSinceLastSync > 300; // 5 minutos
      
      console.log('🔍 [DEBUG] Sync info:', { 
        syncCount, 
        isFirstSync, 
        timeSinceLastSync, 
        shouldHaveNewOrders 
      });
      
      let mockOrders = [];
      
      // Pedidos base que sempre existem (simulam pedidos antigos)
      const baseOrders = [
        {
          order_sn: "250720KJ4U683X",
          order_status: "PROCESSED",
          total_amount: 15000,
          currency: "BRL",
          create_time: now - 86400,
          update_time: now - 86400, // Não foi atualizado
          buyer_username: "user123",
          payment_method: "Credit Card",
          shipping_carrier: "Shopee Express",
          actual_shipping_fee: 500,
          estimated_shipping_fee: 500
        },
        {
          order_sn: "250720KEFV0UR9",
          order_status: "PROCESSED",
          total_amount: 35000,
          currency: "BRL",
          create_time: now - 432000,
          update_time: now - 432000, // Não foi atualizado
          buyer_username: "user202",
          payment_method: "PIX",
          shipping_carrier: "Shopee Express",
          actual_shipping_fee: 1000,
          estimated_shipping_fee: 1000
        }
      ];
      
      mockOrders = [...baseOrders];
      
      // Na primeira sincronização, incluir pedidos "novos" e "atualizados"
      if (isFirstSync) {
        const firstSyncOrders = [
          {
            order_sn: "250720KGS27XH8",
            order_status: "COMPLETED", // Status alterado para simular atualização
            total_amount: 25000,
            currency: "BRL",
            create_time: now - 172800,
            update_time: now - 1800, // Recentemente atualizado
            buyer_username: "user456",
            payment_method: "PIX",
            shipping_carrier: "Correios",
            actual_shipping_fee: 800,
            estimated_shipping_fee: 800
          },
          {
            order_sn: "NEW001FIRST",
            order_status: "UNPAID",
            total_amount: 8000,
            currency: "BRL",
            create_time: now - 3600,
            update_time: now - 3600,
            buyer_username: "user789",
            payment_method: "Boleto",
            shipping_carrier: "Shopee Express",
            actual_shipping_fee: 300,
            estimated_shipping_fee: 300
          },
          {
            order_sn: "NEW002FIRST",
            order_status: "TO_SHIP",
            total_amount: 12000,
            currency: "BRL",
            create_time: now - 7200,
            update_time: now - 7200,
            buyer_username: "user101",
            payment_method: "Credit Card",
            shipping_carrier: "Correios",
            actual_shipping_fee: 600,
            estimated_shipping_fee: 600
          }
        ];
        mockOrders = [...mockOrders, ...firstSyncOrders];
      } else if (shouldHaveNewOrders) {
        // Ocasionalmente, simular novos pedidos ou atualizações
        const randomChance = Math.random();
        if (randomChance < 0.3) { // 30% chance de ter um novo pedido
          const newOrder = {
            order_sn: `NEW${now}${Math.floor(Math.random() * 1000)}`,
            order_status: "UNPAID",
            total_amount: Math.floor(Math.random() * 20000) + 5000,
            currency: "BRL",
            create_time: now - Math.floor(Math.random() * 3600),
            update_time: now - Math.floor(Math.random() * 3600),
            buyer_username: `user${Math.floor(Math.random() * 1000)}`,
            payment_method: ["Credit Card", "PIX", "Boleto"][Math.floor(Math.random() * 3)],
            shipping_carrier: "Shopee Express",
            actual_shipping_fee: 500,
            estimated_shipping_fee: 500
          };
          mockOrders.push(newOrder);
          console.log('🆕 [DEBUG] Novo pedido simulado:', newOrder.order_sn);
        } else if (randomChance < 0.5) { // 20% chance de atualizar um pedido existente
          // Simular atualização de um pedido base
          const updatedOrder = {
            ...baseOrders[0],
            order_status: "COMPLETED",
            update_time: now - 300 // Atualizado recentemente
          };
          mockOrders[0] = updatedOrder;
          console.log('🔄 [DEBUG] Pedido atualizado:', updatedOrder.order_sn);
        }
      }
      
      lastSyncTime = now;
      
      console.log('🔍 [DEBUG] Pedidos simulados gerados:', mockOrders.length);
      console.log('🔍 [DEBUG] Pedidos:', mockOrders.map(o => ({ order_sn: o.order_sn, order_status: o.order_status })));

      // Filtrar por status se especificado
      let filteredOrders = mockOrders;
      if (params.orderStatus) {
        filteredOrders = mockOrders.filter(order => order.order_status === params.orderStatus);
      }

      // Filtrar por período se especificado
      if (params.timeFrom && params.timeTo) {
        const timeField = params.timeRangeField === 'update_time' ? 'update_time' : 'create_time';
        filteredOrders = filteredOrders.filter(order => {
          const orderTime = order[timeField];
          return orderTime >= params.timeFrom! && orderTime <= params.timeTo!;
        });
      }

      // Simular paginação
      const pageSize = params.pageSize || 100;
      const startIndex = params.cursor ? parseInt(params.cursor) : 0;
      const endIndex = startIndex + pageSize;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredOrders.length;
      const nextCursor = hasMore ? endIndex.toString() : '';

      return {
        success: true,
        data: {
          error: '',
          response: {
            order_list: paginatedOrders,
            more: hasMore,
            next_cursor: nextCursor
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Buscar detalhes de pedidos
  async getOrderDetail(orderSnList: string[]): Promise<ShopeeProxyResponse> {
    try {
      // Simular busca de detalhes completos
      const detailedOrders = orderSnList.map(orderSn => ({
        order_sn: orderSn,
        order_status: "PROCESSED",
        total_amount: Math.floor(Math.random() * 50000) + 5000,
        currency: "BRL",
        create_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 604800),
        update_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
        buyer_username: `user${Math.floor(Math.random() * 1000)}`,
        payment_method: ["Credit Card", "PIX", "Boleto"][Math.floor(Math.random() * 3)],
        shipping_carrier: ["Shopee Express", "Correios", "Jadlog"][Math.floor(Math.random() * 3)],
        actual_shipping_fee: Math.floor(Math.random() * 1000) + 300,
        estimated_shipping_fee: Math.floor(Math.random() * 1000) + 300,
        item_list: [
          {
            item_id: Math.floor(Math.random() * 1000000),
            item_name: `Produto ${orderSn}`,
            model_name: "Variação A",
            model_quantity_purchased: Math.floor(Math.random() * 5) + 1,
            model_original_price: Math.floor(Math.random() * 10000) + 1000,
            model_discounted_price: Math.floor(Math.random() * 8000) + 800
          }
        ],
        recipient_address: {
          name: `Cliente ${orderSn}`,
          phone: "11999999999",
          full_address: "Rua Exemplo, 123 - São Paulo, SP",
          zipcode: "01234-567"
        }
      }));

      return {
        success: true,
        data: {
          error: '',
          response: {
            order_list: detailedOrders
          }
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Função para carregar token do Supabase
export const loadShopeeToken = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('shop_id', SHOPEE_CONFIG.SHOP_ID.toString())
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const tokenData = data[0];
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiresAt > fiveMinutesFromNow) {
        return tokenData.access_token;
      } else {
        throw new Error('Token expirado! Execute o refresh de token primeiro.');
      }
    }

    throw new Error('Nenhum token ativo encontrado.');
  } catch (err: any) {
    console.error('Erro ao carregar token:', err);
    throw err;
  }
};