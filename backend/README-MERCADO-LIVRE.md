# 🛒 Mercado Livre - Scripts Node.js

Este documento descreve os scripts Node.js criados para integração com a API do Mercado Livre, adaptados dos scripts Python originais.

## 📋 Scripts Disponíveis

### 1. 📦 Busca de Pedidos (`mercado-livre-order-fetcher.js`)

**Funcionalidade:**
- Busca pedidos das lojas do Mercado Livre via API
- Salva os pedidos no banco de dados Supabase
- Suporte a execução única ou agendada
- Filtra pedidos dos últimos 7 dias para otimização
- Remove pedidos não pagos com mais de 15 dias

**Como usar:**

```bash
# Execução única
npm run ml-fetch-orders

# Execução agendada (a cada 2 horas)
npm run ml-fetch-orders-schedule
```

### 2. 💰 Extração de Dados Financeiros (`mercado-livre-financial-data-extractor.js`)

**Funcionalidade:**
- Busca dados financeiros (billing) dos pedidos via API
- Processa em lotes para evitar erro 403
- Atualiza informações de billing no banco de dados
- Suporte a execução única ou agendada
- Implementa retry com backoff exponencial

**Como usar:**

```bash
# Execução única
npm run ml-extract-financial

# Execução agendada (a cada 6 horas: 00:00, 06:00, 12:00, 18:00)
npm run ml-extract-financial-schedule
```

## 🔧 Configuração

### Dependências

Os scripts utilizam as seguintes dependências:

```json
{
  "@supabase/supabase-js": "^2.39.0",
  "node-cron": "^3.0.3",
  "node-fetch": "^3.3.2"
}
```

### Variáveis de Ambiente

As credenciais do Supabase estão configuradas diretamente nos scripts:

```javascript
const SUPABASE_URL = 'https://uvszeoysaaphqsliinpj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `mercado_livre_tokens`

```sql
- id: integer
- clientID: text
- key: text
- at: text (access_token)
- loja: text
- loja_id_ML: text
- empresa: integer
```

### Tabela: `mercado_livre_orders`

```sql
- id: integer (auto)
- order_id: text
- loja_id_ml: text
- order_status: text
- date_created: timestamp
- date_closed: timestamp
- order_data: jsonb
- empresa_id: integer
- total_amount: numeric
- currency_id: text
- buyer_id: text
- seller_id: text
- shipping_id: text
- billing_data: jsonb
- billing_last_updated: timestamp
- last_updated: timestamp
```

## 🚀 Funcionalidades Principais

### Busca de Pedidos

1. **Busca Automática de Lojas Ativas**
   - Consulta todas as lojas com tokens válidos
   - Processa cada loja individualmente

2. **Otimização de Performance**
   - Filtra pedidos dos últimos 7 dias
   - Paginação automática
   - Rate limiting respeitado

3. **Processamento de Dados**
   - Busca detalhes completos de cada pedido
   - Filtra pedidos cancelados
   - Converte dados para formato do banco

4. **Limpeza Automática**
   - Remove pedidos não pagos com mais de 15 dias
   - Mantém base de dados otimizada

### Extração Financeira

1. **Processamento em Lotes**
   - Divide order_ids em lotes de 20
   - Evita erro 403 da API
   - Implementa pausas entre lotes

2. **Tratamento de Erros**
   - Retry automático para erros 403 e 429
   - Backoff exponencial
   - Logs detalhados de erros

3. **Períodos Múltiplos**
   - Processa últimos 3 meses
   - Formato de período: YYYY-MM
   - Atualização incremental

## 📊 Logs e Monitoramento

### Logs do Busca de Pedidos

```
🚀 BUSCA DE PEDIDOS - MERCADO LIVRE
🔍 Buscando lojas ativas...
✅ 3 lojas encontradas:
   1. Loja Principal (ID: 123456789)
   2. Loja Secundária (ID: 987654321)

🏪 [1/3] PROCESSANDO LOJA: Loja Principal
📦 Encontrados 25 pedidos no lote (offset: 0)
✅ Loja processada: 25 pedidos

📊 RESUMO FINAL
🏪 Lojas processadas: 3/3
📦 Total de pedidos processados: 75
```

### Logs da Extração Financeira

```
💰 EXTRAÇÃO DE DADOS FINANCEIROS - MERCADO LIVRE
🔍 Buscando tokens ativos...
✅ 3 tokens encontrados

🏪 [1/3] PROCESSANDO LOJA: Loja Principal
📋 Encontrados 150 order_ids para loja 123456789
📦 Dividindo 150 order_ids em 8 lotes de até 20
💰 Buscando billing para período 2024-01
✅ Billing data obtido para período 2024-01

📊 RESUMO FINAL
🏪 Lojas processadas: 3/3
💰 Total de registros atualizados: 145
```

## ⚠️ Considerações Importantes

### Rate Limiting

- **Busca de Pedidos**: Pausa de 100ms entre detalhes, 1s entre páginas
- **Dados Financeiros**: Pausa de 30s entre lotes, 1min entre períodos
- **Retry Automático**: Para erros 429 (rate limit)

### Tratamento de Erros

- **401 (Unauthorized)**: Token inválido ou expirado
- **403 (Forbidden)**: Acesso negado, retry com backoff
- **429 (Rate Limit)**: Muitas requisições, aguarda e tenta novamente
- **Timeout**: Requisições com timeout de 30s

### Agendamento

- **Pedidos**: A cada 2 horas (`0 */2 * * *`)
- **Financeiro**: A cada 6 horas (`0 */6 * * *`)
- **Execução Imediata**: Primeira execução ao iniciar o agendamento

## 🔄 Migração do Python

### Principais Adaptações

1. **Sintaxe**: Python → JavaScript ES6+
2. **Async/Await**: Mantida a estrutura assíncrona
3. **Bibliotecas**: 
   - `requests` → `node-fetch`
   - `schedule` → `node-cron`
   - `supabase-py` → `@supabase/supabase-js`
4. **Logging**: Console.log com emojis para melhor visualização
5. **Error Handling**: Try/catch com logs detalhados

### Funcionalidades Preservadas

- ✅ Busca automática de lojas ativas
- ✅ Processamento em lotes
- ✅ Rate limiting e retry logic
- ✅ Limpeza de dados antigos
- ✅ Agendamento automático
- ✅ Logs detalhados
- ✅ Tratamento de erros robusto

## 🚀 Instalação e Execução

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Executar busca de pedidos:**
   ```bash
   npm run ml-fetch-orders
   ```

3. **Executar extração financeira:**
   ```bash
   npm run ml-extract-financial
   ```

4. **Executar com agendamento:**
   ```bash
   npm run ml-fetch-orders-schedule
   npm run ml-extract-financial-schedule
   ```

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar logs de execução
2. Confirmar credenciais do Supabase
3. Validar tokens do Mercado Livre
4. Verificar conectividade com APIs

---

**Desenvolvido por:** Y Insights Team  
**Versão:** 1.0.0  
**Data:** Janeiro 2024