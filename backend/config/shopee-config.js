import { supabase } from './supabase.js';

// Configurações padrão da Shopee
export const SHOPEE_CONFIG = {
  BASE_URL: "https://partner.shopeemobile.com"
};

/**
 * Busca credenciais de uma loja específica no Supabase
 * @param {string} shopId - ID da loja
 * @returns {Object|null} Credenciais da loja ou null se não encontrada
 */
export async function getShopCredentials(shopId) {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao buscar credenciais da loja:', error.message);
      return null;
    }
    
    if (data && data.length > 0) {
          const token = data[0];
          return {
            partner_id: token.partner_id,
            partner_key: token.partner_key,
            shop_id: token.shop_id,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: token.expires_at,
            is_expired: new Date(token.expires_at) <= new Date(),
            loja: `Loja ${token.shop_id}`
          };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar credenciais:', error.message);
    return null;
  }
}

/**
 * Busca credenciais da loja padrão
 * @returns {Object|null} Credenciais da loja padrão
 */
export async function getDefaultShopCredentials() {
  return await getShopCredentials(SHOPEE_CONFIG.SHOP_ID.toString());
}

/**
 * Busca todas as lojas ativas no Supabase
 * @returns {Array} Lista de lojas ativas
 */
export async function getAllActiveShops() {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar lojas ativas:', error.message);
      return [];
    }
    
    // Agrupar por shop_id e pegar o mais recente de cada
    const shopMap = new Map();
    data.forEach(token => {
      if (!shopMap.has(token.shop_id) || 
          new Date(token.created_at) > new Date(shopMap.get(token.shop_id).created_at)) {
        shopMap.set(token.shop_id, token);
      }
    });
    
    return Array.from(shopMap.values()).map(token => ({
      partner_id: token.partner_id,
      partner_key: token.partner_key,
      shop_id: token.shop_id,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
      is_expired: new Date(token.expires_at) <= new Date(),
      loja: `Loja ${token.shop_id}`,
      token_id: token.id
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar lojas ativas:', error.message);
    return [];
  }
}

/**
 * Verifica se um token está expirado
 * @param {string} expiresAt - Data de expiração do token
 * @returns {boolean} True se expirado
 */
export function isTokenExpired(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const marginMinutes = 5; // 5 minutos de margem
  
  return expiry <= new Date(now.getTime() + marginMinutes * 60 * 1000);
}