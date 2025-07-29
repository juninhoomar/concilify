import { createClient } from '@supabase/supabase-js'

// Configurações do Supabase
const supabaseUrl = 'https://uvszeoysaaphqsliinpj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g'

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Tipos para as tabelas do banco de dados
export interface Database {
  public: {
    Tables: {
      bling: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['bling']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['bling']['Insert']>
      }
      clientes: {
        Row: {
          id: string
          nome: string
          email?: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['clientes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
      }
      cotacoes: {
        Row: {
          id: string
          moeda: string
          valor: number
          data: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['cotacoes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cotacoes']['Insert']>
      }
      empresas: {
        Row: {
          id: string
          nome: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>
      }
      mercado_livre_tokens: {
        Row: {
          id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['mercado_livre_tokens']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['mercado_livre_tokens']['Insert']>
      }
      mercado_livre_orders: {
        Row: {
          id: string
          order_id: string
          order_status?: string
          total_amount?: number
          currency_id?: string
          date_created?: string
          date_closed?: string
          payer_nickname?: string
          payment_status?: string
          shipping_cost?: number
          seller_id?: string
          item_price?: number
          ml_sale_fee?: number
          ml_management_cost?: number
          ml_shipping_fee?: number
          ml_total_fees?: number
          refunded_amount?: number
          net_revenue?: number
          transaction_amount?: number
          receiver_shipping_cost?: number
          detail_amount?: number
          discount_amount?: number
          financing_fee?: number
          sale_date_time?: string
          money_release_date?: string
          item_title?: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['mercado_livre_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['mercado_livre_orders']['Insert']>
      }
      notificacoes: {
        Row: {
          id: string
          titulo: string
          mensagem: string
          lida: boolean
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['notificacoes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['notificacoes']['Insert']>
      }
      produtos: {
        Row: {
          id: string
          nome: string
          codigo: string
          preco_custo: number
          saldo_virtual_total: number
          saldo_fisico: number
          tipo: string
          situacao: string
          formato: string
          created_at: string
          updated_at: string
          categoria?: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['produtos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['produtos']['Insert']>
      }
      shopee_orders: {
        Row: {
          id: string
          order_sn: string
          shop_id: string
          order_status: string
          total_amount: number
          currency: string
          buyer_username?: string
          payment_method?: string
          shipping_carrier?: string
          actual_shipping_fee?: number
          estimated_shipping_fee?: number
          commission_fee?: number
          transaction_fee?: number
          service_fee?: number
          platform_fee?: number
          payment_fee?: number
          shipping_discount?: number
          voucher_discount?: number
          coin_discount?: number
          total_discount?: number
          escrow_amount?: number
          buyer_paid_shipping_fee?: number
          actual_shipping_cost?: number
          item_price?: number
          net_amount?: number
          create_time: number
          update_time: number
          order_data: Record<string, unknown>
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['shopee_orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['shopee_orders']['Insert']>
      }
      shopee_tokens: {
        Row: {
          id: string
          partner_id: string
          shop_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          created_at: string
          updated_at: string
          is_active: boolean
          loja?: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['shopee_tokens']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['shopee_tokens']['Insert']>
      }
      stores: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          empresa_id?: string
        }
        Insert: Omit<Database['public']['Tables']['stores']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['stores']['Insert']>
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          avatar_url?: string
          created_at: string
          updated_at: string
          empresa_id?: string
          user_type?: string
          aprovado?: boolean
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Função para verificar conexão
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('stores').select('count').limit(1)
    if (error) throw error
    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso' }
  } catch (error) {
    return { success: false, message: `Erro na conexão: ${error}` }
  }
}

// Função para desabilitar RLS temporariamente (apenas para desenvolvimento)
export const disableRLS = async () => {
  console.warn('⚠️ RLS será desabilitado via SQL - execute manualmente no Supabase Dashboard')
  console.log(`
-- Execute estes comandos no SQL Editor do Supabase:
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopee_tokens DISABLE ROW LEVEL SECURITY;
`)
}