import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (mesmas do frontend)
const supabaseUrl = 'https://uvszeoysaaphqsliinpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g';

// Criar cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Função para testar conexão
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('shopee_tokens')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro na conexão com Supabase:', error.message);
      return { success: false, message: error.message };
    }
    
    console.log('✅ Conectado ao Supabase com sucesso');
    return { success: true, message: 'Conexão estabelecida' };
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    return { success: false, message: error.message };
  }
}

export default supabase;