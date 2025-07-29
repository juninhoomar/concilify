#!/usr/bin/env node
/**
 * 🚀 SHOPEE BACKEND SERVER - API REST
 * Servidor Express para gerenciar tokens e pedidos da Shopee
 * Integração com Supabase
 */

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import ShopeeAutoRefresh from './shopee-auto-refresh.js';
import ShopeeOrderFetcher from './shopee-order-fetcher.js';
import { ShopeeFinancialFetcher } from './shopee-financial-fetcher.js';
import { supabase } from './config/supabase.js';
import { getAllActiveShops } from './config/shopee-config.js';
import ShopeeTokenGenerator from './shopee-token-generator.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Instâncias globais
let autoRefresh = null;
let orderFetcher = null;
let financialFetcher = null;
let tokenGenerator = null;

// Inicializar serviços
async function initializeServices() {
  try {
    autoRefresh = new ShopeeAutoRefresh();
    orderFetcher = new ShopeeOrderFetcher();
    financialFetcher = new ShopeeFinancialFetcher();
    tokenGenerator = new ShopeeTokenGenerator();
    
    // Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Serviços inicializados');
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços:', error.message);
  }
}

// Middleware de autenticação simples (opcional)
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Se não há API key configurada, pular autenticação
  if (!process.env.API_KEY) {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'API key inválida ou ausente'
    });
  }
  
  next();
};

// Middleware de log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ROTAS DE SAÚDE ====================

/**
 * GET /health - Verificar saúde do servidor
 */
app.get('/health', async (req, res) => {
  try {
    // Testar conexão com Supabase
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('count')
      .limit(1);
    
    const supabaseStatus = error ? 'error' : 'ok';
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseStatus,
        autoRefresh: autoRefresh ? 'initialized' : 'not_initialized',
        orderFetcher: orderFetcher ? 'initialized' : 'not_initialized',
        financialFetcher: financialFetcher ? 'initialized' : 'not_initialized'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /status - Status detalhado do sistema
 */
app.get('/status', authenticate, async (req, res) => {
  try {
    const shops = await getAllActiveShops();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalShops: shops.length,
      shops: shops.map(shop => ({
        loja: shop.loja,
        shop_id: shop.shop_id,
        is_expired: shop.is_expired,
        expires_at: shop.expires_at
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE GERAÇÃO DE TOKENS ====================

/**
 * POST /tokens/generate_auth_url - Gerar URL de autorização da Shopee
 */
app.post('/tokens/generate_auth_url', authenticate, async (req, res) => {
  try {
    const { partner_id } = req.body;

    if (!partner_id) {
      return res.status(400).json({ success: false, error: 'Partner ID é obrigatório!' });
    }

    // A URL de redirecionamento deve ser a mesma configurada na Shopee Open Platform
    const authUrl = `https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id=${partner_id}&redirect=https://n8n.newwavestartup.com.br`;
    
    res.json({ success: true, auth_url: authUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /tokens/generate_tokens - Gerar e salvar tokens da Shopee
 */
app.post('/tokens/generate_tokens', authenticate, async (req, res) => {
  try {
    console.log('🔄 Iniciando geração de tokens...');
    console.log('📝 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    if (!tokenGenerator) {
      console.error('❌ Serviço de geração de tokens não inicializado');
      return res.status(503).json({ success: false, error: 'Serviço de geração de tokens não inicializado' });
    }

    const { partner_id, partner_key, shop_id, auth_code, loja_nome, empresa_id } = req.body;

    if (!partner_id || !partner_key || !shop_id || !auth_code) {
      console.error('❌ Campos obrigatórios ausentes:', { partner_id, partner_key: partner_key ? '[PRESENTE]' : '[AUSENTE]', shop_id, auth_code: auth_code ? '[PRESENTE]' : '[AUSENTE]' });
      return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios!' });
    }

    console.log('🔑 Gerando token para loja:', shop_id);
    const result = await tokenGenerator.generateToken(parseInt(partner_id), partner_key, parseInt(shop_id), auth_code);
    console.log('📊 Resultado da geração:', result.success ? 'SUCESSO' : 'FALHA');
    
    if (!result.success) {
      console.error('❌ Erro na geração do token:', result.error);
    }

    if (result.success) {
      console.log('💾 Salvando tokens no Supabase...');
      console.log('📝 Parâmetros para salvar:', {
        partner_id: parseInt(partner_id),
        shop_id: parseInt(shop_id),
        loja_nome,
        empresa_id
      });
      
      const saveResult = await tokenGenerator.saveTokensSupabase(
        parseInt(partner_id), partner_key, parseInt(shop_id), result.data, loja_nome, empresa_id
      );
      
      console.log('📊 Resultado do salvamento:', saveResult.success ? 'SUCESSO' : 'FALHA');
      if (!saveResult.success) {
        console.error('❌ Erro ao salvar no Supabase:', saveResult.error);
      }

      if (saveResult.success) {
        console.log('✅ Tokens gerados e salvos com sucesso!');
        res.json({
          success: true,
          message: 'Tokens gerados e salvos com sucesso!',
          data: result.data,
          supabase_id: saveResult.id
        });
      } else {
        console.error('❌ Falha ao salvar tokens no Supabase');
        res.status(500).json({
          success: false,
          message: 'Tokens gerados, mas erro ao salvar no Supabase',
          data: result.data,
          supabase_error: saveResult.error
        });
      }
    } else {
      console.error('❌ Falha na geração de tokens');
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('❌ Erro inesperado no endpoint generate_tokens:', error);
    console.error('📊 Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ROTAS DE TOKENS ====================

/**
 * POST /tokens/refresh - Renovar tokens de todas as lojas
 */
app.post('/tokens/refresh', authenticate, async (req, res) => {
  try {
    if (!autoRefresh) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de renovação não inicializado'
      });
    }
    
    console.log('🔄 Iniciando renovação manual de tokens...');
    const success = await autoRefresh.refreshAllShopsTokens();
    
    res.json({
      success,
      message: success ? 'Tokens renovados com sucesso' : 'Falha na renovação de alguns tokens',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /tokens/refresh/:shopId - Renovar token de uma loja específica
 */
app.post('/tokens/refresh/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    
    if (!autoRefresh) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de renovação não inicializado'
      });
    }
    
    // Buscar dados da loja
    const shops = await getAllActiveShops();
    const shop = shops.find(s => s.shop_id === shopId);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Loja não encontrada'
      });
    }
    
    console.log(`🔄 Renovando token para loja ${shop.loja}...`);
    const success = await autoRefresh.refreshTokenForShop(shop);
    
    res.json({
      success,
      message: success ? `Token renovado para ${shop.loja}` : `Falha na renovação para ${shop.loja}`,
      shop: shop.loja,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /tokens - Listar todos os tokens
 */
app.get('/tokens', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    const tokens = data.map(token => ({
      id: token.id,
      shop_id: token.shop_id,
      partner_id: token.partner_id,
      expires_at: token.expires_at,
      created_at: token.created_at,
      updated_at: token.updated_at,
      is_expired: new Date(token.expires_at) < new Date()
    }));
    
    res.json({
      success: true,
      tokens,
      total: tokens.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE PEDIDOS ====================

/**
 * POST /orders/fetch - Buscar pedidos de todas as lojas
 */
app.post('/orders/fetch', authenticate, async (req, res) => {
  try {
    const { period = 'last-24h', timeFrom, timeTo, maxConcurrency = 3, includeFinancialData = true } = req.body;
    
    if (!orderFetcher) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de busca de pedidos não inicializado'
      });
    }
    
    console.log(`📦 Iniciando busca de pedidos (${period})...`);
    
    let result;
    
    switch (period) {
      case 'last-24h':
        result = await orderFetcher.fetchLast24Hours();
        break;
      case 'last-week':
        result = await orderFetcher.fetchLastWeek();
        break;
      case 'last-month':
        result = await orderFetcher.fetchLastMonth();
        break;
      case 'custom':
        if (!timeFrom || !timeTo) {
          return res.status(400).json({
            success: false,
            error: 'Para período customizado, forneça timeFrom e timeTo'
          });
        }
        result = await orderFetcher.processAllShops(timeFrom, timeTo, maxConcurrency);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Período inválido. Use: last-24h, last-week, last-month ou custom'
        });
    }
    
    // Se includeFinancialData for true, buscar dados financeiros após buscar pedidos
    if (includeFinancialData && financialFetcher && result.success) {
      console.log('💰 Buscando dados financeiros para pedidos encontrados...');
      try {
        await financialFetcher.processAllShopsFinancialData();
      } catch (financialError) {
        console.error('⚠️ Erro ao buscar dados financeiros:', financialError.message);
      }
    }
    
    res.json({
      ...result,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /orders/fetch/:shopId - Buscar pedidos de uma loja específica
 */
app.post('/orders/fetch/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { period = 'last-24h', timeFrom, timeTo, includeFinancialData = true } = req.body;
    
    if (!orderFetcher) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de busca de pedidos não inicializado'
      });
    }
    
    // Buscar dados da loja
    const shops = await getAllActiveShops();
    const shop = shops.find(s => s.shop_id === shopId);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Loja não encontrada'
      });
    }
    
    let periodTimeFrom, periodTimeTo;
    const now = Math.floor(Date.now() / 1000);
    
    switch (period) {
      case 'last-24h':
        periodTimeFrom = now - (24 * 60 * 60);
        periodTimeTo = now;
        break;
      case 'last-week':
        periodTimeFrom = now - (7 * 24 * 60 * 60);
        periodTimeTo = now;
        break;
      case 'last-month':
        periodTimeFrom = now - (30 * 24 * 60 * 60);
        periodTimeTo = now;
        break;
      case 'custom':
        if (!timeFrom || !timeTo) {
          return res.status(400).json({
            success: false,
            error: 'Para período customizado, forneça timeFrom e timeTo'
          });
        }
        periodTimeFrom = timeFrom;
        periodTimeTo = timeTo;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Período inválido. Use: last-24h, last-week, last-month ou custom'
        });
    }
    
    console.log(`📦 Buscando pedidos para loja ${shop.loja}...`);
    const result = await orderFetcher.processShop(shop, periodTimeFrom, periodTimeTo);
    
    // Se includeFinancialData for true, buscar dados financeiros após buscar pedidos
    if (includeFinancialData && financialFetcher && result.success) {
      console.log(`💰 Buscando dados financeiros para loja ${shop.loja}...`);
      try {
        await financialFetcher.processShopFinancialData(shopId);
      } catch (financialError) {
        console.error('⚠️ Erro ao buscar dados financeiros:', financialError.message);
      }
    }
    
    res.json({
      ...result,
      period,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /orders/stats - Estatísticas de pedidos
 */
app.get('/orders/stats', authenticate, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeFilter = '';
    switch (period) {
      case '24h':
        timeFilter = "AND created_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        break;
    }
    
    // Estatísticas gerais
    const { data: totalStats, error: totalError } = await supabase
      .rpc('get_order_stats', { time_filter: timeFilter });
    
    if (totalError) {
      throw totalError;
    }
    
    // Estatísticas por loja
    const { data: shopStats, error: shopError } = await supabase
      .from('shopee_orders')
      .select('shop_id, order_status')
      .gte('created_at', new Date(Date.now() - (period === '24h' ? 24 * 60 * 60 * 1000 : period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)));
    
    if (shopError) {
      throw shopError;
    }
    
    // Agrupar por loja
    const shopStatsGrouped = shopStats.reduce((acc, order) => {
      const shopKey = `Loja ${order.shop_id}`;
      if (!acc[shopKey]) {
        acc[shopKey] = { total: 0, byStatus: {} };
      }
      acc[shopKey].total++;
      acc[shopKey].byStatus[order.order_status] = (acc[shopKey].byStatus[order.order_status] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      period,
      timestamp: new Date().toISOString(),
      total: totalStats?.[0] || { count: 0 },
      byShop: shopStatsGrouped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE DADOS FINANCEIROS ====================

/**
 * POST /financial/fetch - Buscar dados financeiros de todas as lojas
 */
app.post('/financial/fetch', authenticate, async (req, res) => {
  try {
    if (!financialFetcher) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de dados financeiros não inicializado'
      });
    }
    
    console.log('💰 Iniciando busca de dados financeiros para todas as lojas...');
    const result = await financialFetcher.processAllShopsFinancialData();
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /financial/fetch/:shopId - Buscar dados financeiros de uma loja específica
 */
app.post('/financial/fetch/:shopId', authenticate, async (req, res) => {
  try {
    const { shopId } = req.params;
    
    if (!financialFetcher) {
      return res.status(503).json({
        success: false,
        error: 'Serviço de dados financeiros não inicializado'
      });
    }
    
    // Buscar dados da loja
    const shops = await getAllActiveShops();
    const shop = shops.find(s => s.shop_id === shopId);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: 'Loja não encontrada'
      });
    }
    
    console.log(`💰 Buscando dados financeiros para loja ${shop.loja}...`);
    const result = await financialFetcher.processShopFinancialData(shopId);
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /financial/stats - Estatísticas de dados financeiros
 */
app.get('/financial/stats', authenticate, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let timeFilter = '';
    switch (period) {
      case '24h':
        timeFilter = "AND financial_data_updated_at >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "AND financial_data_updated_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        timeFilter = "AND financial_data_updated_at >= NOW() - INTERVAL '30 days'";
        break;
    }
    
    // Estatísticas de pedidos com dados financeiros
    const { data: financialStats, error: financialError } = await supabase
      .from('shopee_orders')
      .select(`
        shop_id,
        has_financial_data,
        buyer_total_amount,
        commission_fee,
        service_fee,
        escrow_amount
      `)
      .eq('has_financial_data', true);
    
    if (financialError) {
      throw financialError;
    }
    
    // Estatísticas por loja
    const statsByShop = financialStats.reduce((acc, order) => {
      const shopKey = `Loja ${order.shop_id}`;
      if (!acc[shopKey]) {
        acc[shopKey] = {
          totalOrders: 0,
          totalRevenue: 0,
          totalCommission: 0,
          totalServiceFee: 0,
          totalEscrow: 0
        };
      }
      
      acc[shopKey].totalOrders++;
      acc[shopKey].totalRevenue += parseFloat(order.buyer_total_amount || 0);
      acc[shopKey].totalCommission += parseFloat(order.commission_fee || 0);
      acc[shopKey].totalServiceFee += parseFloat(order.service_fee || 0);
      acc[shopKey].totalEscrow += parseFloat(order.escrow_amount || 0);
      
      return acc;
    }, {});
    
    // Totais gerais
    const totals = {
      totalOrders: financialStats.length,
      totalRevenue: financialStats.reduce((sum, order) => sum + parseFloat(order.buyer_total_amount || 0), 0),
      totalCommission: financialStats.reduce((sum, order) => sum + parseFloat(order.commission_fee || 0), 0),
      totalServiceFee: financialStats.reduce((sum, order) => sum + parseFloat(order.service_fee || 0), 0),
      totalEscrow: financialStats.reduce((sum, order) => sum + parseFloat(order.escrow_amount || 0), 0)
    };
    
    res.json({
      success: true,
      period,
      timestamp: new Date().toISOString(),
      totals,
      byShop: statsByShop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /financial/orders-without-data - Listar pedidos sem dados financeiros
 */
app.get('/financial/orders-without-data', authenticate, async (req, res) => {
  try {
    const { shopId, limit = 100 } = req.query;
    
    let query = supabase
      .from('shopee_orders')
      .select('id, order_sn, shop_id, order_status, created_at')
      .or('has_financial_data.is.null,has_financial_data.eq.false')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.json({
      success: true,
      orders: data,
      total: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ROTAS DE CONFIGURAÇÃO ====================

/**
 * GET /config/shops - Listar lojas configuradas
 */
app.get('/config/shops', authenticate, async (req, res) => {
  try {
    const shops = await getAllActiveShops();
    
    res.json({
      success: true,
      shops: shops.map(shop => ({
        loja: shop.loja,
        shop_id: shop.shop_id,
        partner_id: shop.partner_id,
        is_expired: shop.is_expired,
        expires_at: shop.expires_at,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      })),
      total: shops.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== AGENDAMENTOS AUTOMÁTICOS ====================

// Renovação automática de tokens a cada 3 horas
cron.schedule('0 */3 * * *', async () => {
  console.log('⏰ Executando renovação automática de tokens...');
  try {
    if (autoRefresh) {
      await autoRefresh.refreshAllShopsTokens();
    }
  } catch (error) {
    console.error('❌ Erro na renovação automática:', error.message);
  }
});

// Busca automática de pedidos a cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Executando busca automática de pedidos...');
  try {
    if (orderFetcher) {
      await orderFetcher.fetchLast24Hours();
    }
  } catch (error) {
    console.error('❌ Erro na busca automática:', error.message);
  }
});

// ==================== TRATAMENTO DE ERROS ====================

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

async function startServer() {
  try {
    // Inicializar serviços
    await initializeServices();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 SHOPEE BACKEND SERVER');
      console.log('='.repeat(40));
      console.log(`🌐 Servidor rodando na porta ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/status`);
      console.log('⏰ Agendamentos automáticos ativos:');
      console.log('   - Renovação de tokens: a cada 3 horas');
      console.log('   - Busca de pedidos: a cada 6 horas');
      console.log('✅ Servidor pronto!');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
}

// Tratamento de sinais do sistema
process.on('SIGINT', () => {
  console.log('\n👋 Servidor interrompido pelo usuário');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Servidor terminado');
  process.exit(0);
});

// Iniciar servidor
startServer();

export default app;