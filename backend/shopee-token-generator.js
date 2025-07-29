import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import axios from 'axios';

class ShopeeTokenGenerator {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL || "https://uvszeoysaaphqsliinpj.supabase.co";
        this.supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g";
        this.supabase = null;

        this.initSupabase();
    }

    initSupabase() {
        try {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
            console.log("✅ Supabase conectado com sucesso");
        } catch (e) {
            console.error(`❌ Erro ao conectar Supabase: ${e.message}`);
            this.supabase = null;
        }
    }

    async getEmpresas() {
        if (!this.supabase) {
            return [];
        }
        try {
            const { data, error } = await this.supabase.from('empresas').select('id, nome').eq('ativo', true);
            if (error) throw error;
            return data;
        } catch (e) {
            console.error(`Erro ao buscar empresas: ${e.message}`);
            return [];
        }
    }

    async generateToken(partnerId, partnerKey, shopId, authCode) {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const apiPath = "/api/v2/auth/token/get";

            // Gerar assinatura
            const baseString = `${partnerId}${apiPath}${timestamp}`;
            const signature = crypto.createHmac('sha256', partnerKey)
                                    .update(baseString)
                                    .digest('hex');

            // Fazer requisição
            const response = await axios.post(
                "https://partner.shopeemobile.com" + apiPath,
                {
                    code: authCode,
                    shop_id: shopId
                },
                {
                    params: {
                        partner_id: partnerId,
                        timestamp: timestamp,
                        sign: signature
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.status === 200) {
                const data = response.data;
                if (data.error === '') {
                    return {
                        success: true,
                        data: data
                    };
                } else {
                    return {
                        success: false,
                        error: `Erro da API: ${JSON.stringify(data)}`
                    };
                }
            } else {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

        } catch (e) {
            if (axios.isAxiosError(e)) {
                if (e.code === 'ECONNABORTED') {
                    return {
                        success: false,
                        error: "Timeout na requisição. Tente novamente."
                    };
                } else {
                    return {
                        success: false,
                        error: `Erro de requisição: ${e.message} - ${e.response ? JSON.stringify(e.response.data) : ''}`
                    };
                }
            } else {
                return {
                    success: false,
                    error: `Erro inesperado: ${e.message}`
                };
            }
        }
    }

    async saveTokensSupabase(partnerId, partnerKey, shopId, tokensData, lojaNome = null, empresaId = null) {
        if (!this.supabase) {
            return {
                success: false,
                error: "Supabase não está conectado!"
            };
        }

        try {
            // Desativar tokens existentes para este shop
            await this.supabase.from("shopee_tokens").update({ is_active: false }).eq("shop_id", String(shopId));

            // Calcular data de expiração
            const expiresAt = new Date(Date.now() + tokensData.expire_in * 1000);
            const currentTime = new Date();

            // Preparar dados para inserção
            const tokenData = {
                id: crypto.randomUUID(),
                partner_id: String(partnerId),
                partner_key: partnerKey,
                shop_id: String(shopId),
                access_token: tokensData.access_token,
                refresh_token: tokensData.refresh_token,
                expires_at: expiresAt.toISOString(),
                created_at: currentTime.toISOString(),
                updated_at: currentTime.toISOString(),
                is_active: true,
                loja: lojaNome,
                empresa_id: empresaId
            };

            // Inserir no Supabase
            const { data, error } = await this.supabase.from("shopee_tokens").insert([tokenData]);
            if (error) throw error;

            return {
                success: true,
                id: tokenData.id
            };

        } catch (e) {
            return {
                success: false,
                error: `Erro ao salvar no Supabase: ${e.message}`
            };
        }
    }
}

export default ShopeeTokenGenerator;