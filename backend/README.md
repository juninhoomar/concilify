# 🛍️ Shopee Backend - Node.js

Backend em Node.js para gerenciamento automático de tokens e busca de pedidos da Shopee, com integração ao Supabase.

## 🚀 Funcionalidades

### 🔑 Gerenciamento de Tokens
- ✅ Renovação automática de tokens a cada 3 horas
- ✅ Suporte a múltiplas lojas
- ✅ Armazenamento seguro no Supabase
- ✅ API REST para controle manual

### 📦 Busca de Pedidos
- ✅ Busca assíncrona e paralela de pedidos
- ✅ Processamento de múltiplas lojas simultaneamente
- ✅ Filtros por período (24h, 7d, 30d, customizado)
- ✅ Armazenamento otimizado no Supabase

### 🌐 API REST
- ✅ Endpoints para tokens e pedidos
- ✅ Autenticação por API key (opcional)
- ✅ Agendamentos automáticos
- ✅ Monitoramento e estatísticas

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta Supabase configurada
- Credenciais da Shopee Partner API
- Tokens iniciais das lojas (gerados via OAuth)

## 🛠️ Instalação

1. **Instalar dependências:**
```bash
cd backend
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

3. **Verificar conexão com Supabase:**
```bash
node -e "import('./config/supabase.js').then(m => m.testConnection())"
```

## 🚀 Uso

### Servidor API
```bash
# Iniciar servidor
npm start

# Modo desenvolvimento
npm run dev
```

### Scripts Individuais
```bash
# Renovar tokens de todas as lojas
npm run refresh-tokens

# Buscar pedidos das últimas 24h
npm run fetch-orders

# Buscar pedidos da última semana
npm run fetch-orders:week
```

### Execução Direta
```bash
# Renovação de tokens
node shopee-auto-refresh.js --refresh-all
node shopee-auto-refresh.js --legacy  # modo uma loja

# Busca de pedidos
node shopee-order-fetcher.js --last-24h
node shopee-order-fetcher.js --last-week
node shopee-order-fetcher.js --custom --from 1640995200 --to 1641081600
```

## 📡 API Endpoints

### Saúde e Status
```http
GET /health              # Verificar saúde do servidor
GET /status              # Status detalhado do sistema
```

### Tokens
```http
POST /tokens/refresh              # Renovar todos os tokens
POST /tokens/refresh/:shopId      # Renovar token específico
GET  /tokens                      # Listar tokens
```

### Pedidos
```http
POST /orders/fetch               # Buscar pedidos de todas as lojas
POST /orders/fetch/:shopId       # Buscar pedidos de loja específica
GET  /orders/stats               # Estatísticas de pedidos
```

### Configuração
```http
GET /config/shops               # Listar lojas configuradas
```

## 📊 Exemplos de Uso da API

### Renovar Tokens
```bash
curl -X POST http://localhost:3001/tokens/refresh \
  -H "X-API-Key: sua_chave_api"
```

### Buscar Pedidos das Últimas 24h
```bash
curl -X POST http://localhost:3001/orders/fetch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_api" \
  -d '{"period": "last-24h"}'
```

### Buscar Pedidos Período Customizado
```bash
curl -X POST http://localhost:3001/orders/fetch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua_chave_api" \
  -d '{
    "period": "custom",
    "timeFrom": 1640995200,
    "timeTo": 1641081600,
    "maxConcurrency": 5
  }'
```

### Estatísticas de Pedidos
```bash
curl "http://localhost:3001/orders/stats?period=7d" \
  -H "X-API-Key: sua_chave_api"
```

## ⏰ Agendamentos Automáticos

O servidor executa automaticamente:

- **Renovação de tokens**: A cada 3 horas
- **Busca de pedidos**: A cada 6 horas (últimas 24h)

## 🗄️ Estrutura do Banco (Supabase)

### Tabela: `shopee_tokens`
```sql
CREATE TABLE shopee_tokens (
  id SERIAL PRIMARY KEY,
  partner_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  loja TEXT
);
```

### Tabela: `shopee_orders`
```sql
CREATE TABLE shopee_orders (
  id SERIAL PRIMARY KEY,
  order_sn TEXT UNIQUE NOT NULL,
  shop_id TEXT,
  order_status TEXT,
  create_time TIMESTAMP WITH TIME ZONE,
  update_time TIMESTAMP WITH TIME ZONE,
  currency TEXT,
  total_amount DECIMAL,
  buyer_username TEXT,
  recipient_address JSONB,
  item_list JSONB,
  payment_method TEXT,
  shipping_carrier TEXT,
  tracking_number TEXT,
  estimated_shipping_fee DECIMAL,
  actual_shipping_fee DECIMAL,
  note TEXT,
  loja TEXT,
  raw_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `3001` |
| `API_KEY` | Chave de autenticação (opcional) | - |
| `SUPABASE_URL` | URL do projeto Supabase | - |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase | - |
| `SHOPEE_PARTNER_ID` | ID do parceiro Shopee | - |
| `SHOPEE_PARTNER_KEY` | Chave do parceiro Shopee | - |
| `SHOPEE_SHOP_ID` | ID da loja padrão | - |
| `MAX_CONCURRENCY` | Máx. lojas simultâneas | `3` |
| `BATCH_SIZE` | Tamanho do lote de pedidos | `50` |
| `MAX_PAGES` | Limite de páginas | `100` |

### Performance

- **Concorrência**: Ajuste `MAX_CONCURRENCY` baseado na capacidade do servidor
- **Rate Limiting**: O sistema inclui delays automáticos entre requisições
- **Lotes**: Pedidos são processados em lotes para otimizar memória
- **Paginação**: Busca automática com limite de segurança

## 🐛 Troubleshooting

### Erro de Token Expirado
```bash
# Verificar status dos tokens
curl http://localhost:3001/status

# Renovar manualmente
curl -X POST http://localhost:3001/tokens/refresh
```

### Erro de Conexão Supabase
```bash
# Testar conexão
node -e "import('./config/supabase.js').then(m => m.testConnection())"
```

### Logs Detalhados
```bash
# Habilitar debug
export DEBUG=true
export LOG_LEVEL=debug
npm start
```

## 📝 Logs

O sistema gera logs detalhados:

- ✅ Renovações de token (sucesso/falha)
- 📦 Busca de pedidos (progresso/estatísticas)
- 🌐 Requisições da API
- ❌ Erros e exceções
- ⏰ Execução de agendamentos

## 🔒 Segurança

- Tokens armazenados de forma segura no Supabase
- Autenticação por API key (opcional)
- Validação de entrada em todos os endpoints
- Rate limiting automático
- Logs de auditoria

## 🚀 Deploy

### Docker (Recomendado)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2
```bash
npm install -g pm2
pm2 start server.js --name shopee-backend
pm2 startup
pm2 save
```

## 📈 Monitoramento

- Health check: `GET /health`
- Métricas: `GET /status`
- Logs estruturados
- Alertas automáticos via Supabase

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido com ❤️ para automação de e-commerce**