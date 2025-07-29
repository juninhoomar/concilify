// Teste simples para verificar logs
console.log('🔍 [DEBUG] Teste de log simples');

const testResult = {
  success: true,
  totalNew: 2,
  totalUpdated: 3,
  totalUnchanged: 0,
  totalProcessed: 5
};

console.log('🔍 [DEBUG] Objeto de teste:', testResult);

// Simular a lógica de descrição
const parts = [];
if (testResult.totalNew > 0) {
  parts.push(`${testResult.totalNew} novo${testResult.totalNew > 1 ? 's' : ''}`);
}
if (testResult.totalUpdated > 0) {
  parts.push(`${testResult.totalUpdated} atualizado${testResult.totalUpdated > 1 ? 's' : ''}`);
}
if (testResult.totalUnchanged > 0) {
  parts.push(`${testResult.totalUnchanged} inalterado${testResult.totalUnchanged > 1 ? 's' : ''}`);
}

const description = parts.length > 0 
  ? `${parts.join(', ')} de ${testResult.totalProcessed} pedidos processados.`
  : `${testResult.totalProcessed} pedidos foram processados com sucesso.`;

console.log('🔍 [DEBUG] Descrição gerada no teste:', description);