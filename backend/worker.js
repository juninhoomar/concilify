/**
 * 🚀 CONCILIFY CLOUDFLARE WORKER
 * Worker para gerenciar tokens e pedidos da Shopee/ML
 * Integração com Supabase
 */

// import ShopeeAutoRefresh from './shopee-auto-refresh.js';
// import ShopeeOrderFetcher from './shopee-order-fetcher.js';
// import { ShopeeFinancialFetcher } from './shopee-financial-fetcher.js';
import { supabase } from './config/supabase.js';
// import { getAllActiveShops } from './config/shopee-config.js';
// import ShopeeTokenGenerator from './shopee-token-generator.js';

// Instâncias globais
let autoRefresh = null;
let orderFetcher = null;
let financialFetcher = null;
let tokenGenerator = null;

// Inicializar serviços
async function initializeServices() {
  try {
    // Temporariamente comentado para deploy inicial
    // if (!autoRefresh) {
    //   autoRefresh = new ShopeeAutoRefresh();
    //   orderFetcher = new ShopeeOrderFetcher();
    //   financialFetcher = new ShopeeFinancialFetcher();
    //   tokenGenerator = new ShopeeTokenGenerator();
    // }
    console.log('✅ Serviços inicializados (modo básico)');
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error.message);
  }
}

// Middleware de autenticação
function authenticate(request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return false;
  }
  return true;
}

// Função para lidar com CORS
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

// Router principal
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders(),
      });
    }

    try {
      // Inicializar serviços se necessário
      await initializeServices();

      // Health check
      if (path === '/health' && method === 'GET') {
        return handleHealth(request, env);
      }

      // Verificar autenticação para rotas protegidas
      if (!path.startsWith('/health') && !authenticate(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        });
      }

      // Roteamento
      if (path === '/status' && method === 'GET') {
        return handleStatus(request, env);
      }

      if (path === '/tokens/generate_auth_url' && method === 'POST') {
        return handleGenerateAuthUrl(request, env);
      }

      if (path === '/tokens/generate_tokens' && method === 'POST') {
        return handleGenerateTokens(request, env);
      }

      if (path === '/tokens/refresh' && method === 'POST') {
        return handleRefreshTokens(request, env);
      }

      if (path.startsWith('/tokens/refresh/') && method === 'POST') {
        const shopId = path.split('/')[3];
        return handleRefreshTokenByShop(request, env, shopId);
      }

      if (path === '/tokens' && method === 'GET') {
        return handleGetTokens(request, env);
      }

      if (path === '/orders/fetch' && method === 'POST') {
        return handleFetchOrders(request, env);
      }

      if (path.startsWith('/orders/fetch/') && method === 'POST') {
        const shopId = path.split('/')[3];
        return handleFetchOrdersByShop(request, env, shopId);
      }

      if (path === '/orders/stats' && method === 'GET') {
        return handleOrdersStats(request, env);
      }

      if (path === '/financial/fetch' && method === 'POST') {
        return handleFetchFinancial(request, env);
      }

      if (path.startsWith('/financial/fetch/') && method === 'POST') {
        const shopId = path.split('/')[3];
        return handleFetchFinancialByShop(request, env, shopId);
      }

      if (path === '/financial/stats' && method === 'GET') {
        return handleFinancialStats(request, env);
      }

      if (path === '/financial/orders-without-data' && method === 'GET') {
        return handleOrdersWithoutData(request, env);
      }

      if (path === '/config/shops' && method === 'GET') {
        return handleGetShops(request, env);
      }

      // 404 para rotas não encontradas
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('❌ Erro no worker:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }
  },

  // Scheduled handler para cron jobs
  async scheduled(controller, env, ctx) {
    switch (controller.cron) {
      case '0 */3 * * *': // A cada 3 horas
        await handleAutoRefresh();
        break;
      case '0 */6 * * *': // A cada 6 horas
        await handleAutoFetchOrders();
        break;
    }
  },
};

// Handlers das rotas
async function handleHealth(request, env) {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('count')
      .limit(1);

    if (error) throw error;

    return new Response(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        supabase: 'connected',
        worker: 'running'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

async function handleStatus(request, env) {
  try {
    // const shops = await getAllActiveShops();
    return new Response(JSON.stringify({
      status: 'running',
      timestamp: new Date().toISOString(),
      shops: 0, // shops.length,
      services: {
        autoRefresh: 'not initialized (basic mode)',
        orderFetcher: 'not initialized (basic mode)',
        financialFetcher: 'not initialized (basic mode)'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

async function handleGenerateAuthUrl(request, env) {
  try {
    const body = await request.json();
    const { shopId } = body;

    if (!shopId) {
      return new Response(JSON.stringify({ error: 'shopId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    // const authUrl = await tokenGenerator.generateAuthUrl(shopId);
    return new Response(JSON.stringify({ 
      error: 'Serviço temporariamente indisponível (modo básico)',
      message: 'Esta funcionalidade será habilitada após configuração completa'
    }), {
      status: 503,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

// Implementar outros handlers conforme necessário...
// (Por brevidade, incluindo apenas alguns exemplos)

async function handleAutoRefresh() {
  try {
    console.log('🔄 Executando refresh automático de tokens...');
    if (autoRefresh) {
      await autoRefresh.refreshAllTokens();
    }
  } catch (error) {
    console.error('❌ Erro no refresh automático:', error);
  }
}

async function handleAutoFetchOrders() {
  try {
    console.log('📦 Executando busca automática de pedidos...');
    if (orderFetcher) {
      await orderFetcher.fetchAllShopsOrders();
    }
  } catch (error) {
    console.error('❌ Erro na busca automática:', error);
  }
}

// Adicionar outros handlers conforme necessário...