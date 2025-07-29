/**
 * Utilitários de criptografia para integração com APIs
 * Implementa HMAC-SHA256 para assinatura de requisições Shopee
 */

/**
 * Gera assinatura HMAC-SHA256 para autenticação da API Shopee
 * @param partnerKey - Chave do parceiro Shopee
 * @param baseString - String base para assinatura
 * @returns Hash HMAC-SHA256 em hexadecimal
 */
export async function generateShopeeSignature(
  partnerKey: string,
  baseString: string
): Promise<string> {
  // Converter a chave para ArrayBuffer
  const keyBuffer = new TextEncoder().encode(partnerKey);
  
  // Converter a string base para ArrayBuffer
  const dataBuffer = new TextEncoder().encode(baseString);
  
  // Importar a chave para uso com HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Gerar a assinatura
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  
  // Converter para hexadecimal
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Gera string base para assinatura da API Shopee (Auth Token)
 * @param partnerId - ID do parceiro
 * @param apiPath - Caminho da API
 * @param timestamp - Timestamp Unix
 * @returns String base para assinatura
 */
export function generateShopeeAuthBaseString(
  partnerId: number,
  apiPath: string,
  timestamp: number
): string {
  return `${partnerId}${apiPath}${timestamp}`;
}

/**
 * Gera string base para assinatura da API Shopee (Shop API)
 * @param partnerId - ID do parceiro
 * @param apiPath - Caminho da API
 * @param timestamp - Timestamp Unix
 * @param accessToken - Token de acesso
 * @param shopId - ID da loja
 * @returns String base para assinatura
 */
export function generateShopeeShopBaseString(
  partnerId: number,
  apiPath: string,
  timestamp: number,
  accessToken: string,
  shopId: number
): string {
  return `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
}

/**
 * Gera timestamp Unix atual
 * @returns Timestamp Unix em segundos
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Valida se uma string é um hash SHA-256 válido
 * @param hash - Hash para validar
 * @returns true se for um hash válido
 */
export function isValidSHA256Hash(hash: string): boolean {
  const sha256Regex = /^[a-f0-9]{64}$/i;
  return sha256Regex.test(hash);
}

/**
 * Gera um UUID v4 simples
 * @returns UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}