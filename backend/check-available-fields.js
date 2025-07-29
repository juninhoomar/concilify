import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Usar as mesmas credenciais que estão sendo usadas nos outros arquivos
const supabaseUrl = process.env.SUPABASE_URL || "https://uvszeoysaaphqsliinpj.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvailableFields() {
  try {
    console.log('🔍 Verificando campos disponíveis para pedido 2000012431840914...');
    
    const { data, error } = await supabase
      .from('mercado_livre_orders')
      .select('*')
      .eq('order_id', '2000012431840914')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao consultar dados:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ Nenhum pedido encontrado');
      return;
    }

    const order = data[0];
    console.log('✅ Campos disponíveis:');
    
    // Listar todos os campos disponíveis
    Object.keys(order).forEach(key => {
      const value = order[key];
      const type = typeof value;
      console.log(`- ${key}: ${type} = ${value}`);
    });
    
    console.log('\n📊 Campos financeiros específicos:');
    const financialFields = [
      'transaction_amount',
      'receiver_shipping_cost', 
      'detail_amount',
      'discount_amount',
      'ml_sale_fee',
      'ml_shipping_fee', 
      'ml_management_cost',
      'ml_total_fees',
      'sale_date_time',
      'money_release_date',
      'financing_fee',
      'item_price',
      'total_amount'
    ];
    
    financialFields.forEach(field => {
      if (order.hasOwnProperty(field)) {
        console.log(`✅ ${field}: ${order[field]}`);
      } else {
        console.log(`❌ ${field}: Campo não encontrado`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkAvailableFields();