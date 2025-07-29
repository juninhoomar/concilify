import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Usar as mesmas credenciais que estão sendo usadas nos outros arquivos
const supabaseUrl = process.env.SUPABASE_URL || "https://uvszeoysaaphqsliinpj.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g";

console.log('🔗 Conectando ao Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBillingData() {
  try {
    console.log('🔍 Verificando dados de billing para pedido 2000012431840914...');
    
    const { data, error } = await supabase
      .from('mercado_livre_orders')
      .select(`
        order_id,
        detail_amount,
        financing_fee,
        item_price,
        transaction_amount,
        ml_sale_fee,
        ml_shipping_fee,
        ml_total_fees,
        has_billing_data,
        billing_data_updated_at
      `)
      .eq('order_id', '2000012431840914');

    if (error) {
      console.error('❌ Erro ao consultar dados:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ Nenhum pedido encontrado');
      return;
    }

    console.log('✅ Dados encontrados:');
    console.log(JSON.stringify(data[0], null, 2));
    
    const order = data[0];
    console.log('\n📊 Resumo dos valores:');
    console.log(`- Detail Amount: R$ ${order.detail_amount}`);
    console.log(`- Item Price: R$ ${order.item_price}`);
    console.log(`- Transaction Amount: R$ ${order.transaction_amount}`);
    console.log(`- ML Sale Fee: R$ ${order.ml_sale_fee}`);
    console.log(`- ML Shipping Fee: R$ ${order.ml_shipping_fee}`);
    console.log(`- ML Total Fees: R$ ${order.ml_total_fees}`);
    console.log(`- Has Billing Data: ${order.has_billing_data}`);
    console.log(`- Billing Updated At: ${order.billing_data_updated_at}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkBillingData();