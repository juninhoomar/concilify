# Guia de Deploy - ConciliFy

## 🚀 Configuração do GitHub

### 1. Criar Repositório no GitHub
```bash
# Adicionar remote do GitHub (substitua pela sua URL)
git remote add origin https://github.com/SEU_USUARIO/concilify.git

# Fazer push para a branch main
git push -u origin main
```

### 2. Configurar Secrets no GitHub
Vá em **Settings > Secrets and variables > Actions** e adicione:

#### Cloudflare
- `CLOUDFLARE_API_TOKEN`: Token da API do Cloudflare
- `CLOUDFLARE_ACCOUNT_ID`: ID da conta do Cloudflare

#### Supabase
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role do Supabase

#### APIs dos Marketplaces
- `SHOPEE_PARTNER_ID`: ID do parceiro Shopee
- `SHOPEE_PARTNER_KEY`: Chave do parceiro Shopee
- `MERCADO_LIVRE_CLIENT_ID`: Client ID do Mercado Livre
- `MERCADO_LIVRE_CLIENT_SECRET`: Client Secret do Mercado Livre
- `BLING_CLIENT_ID`: Client ID do Bling
- `BLING_CLIENT_SECRET`: Client Secret do Bling

#### Segurança
- `JWT_SECRET`: Chave secreta para JWT (gere uma string aleatória)
- `ENCRYPTION_KEY`: Chave de criptografia (32 caracteres)

## ☁️ Configuração do Cloudflare Workers

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Fazer Login no Cloudflare
```bash
wrangler login
```

### 3. Criar KV Namespace
```bash
# Para produção
wrangler kv:namespace create "CACHE"

# Para preview
wrangler kv:namespace create "CACHE" --preview
```

### 4. Atualizar wrangler.toml
Substitua os IDs no arquivo `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "SEU_KV_NAMESPACE_ID"
preview_id = "SEU_PREVIEW_KV_NAMESPACE_ID"
```

### 5. Configurar Secrets no Cloudflare
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SHOPEE_PARTNER_ID
wrangler secret put SHOPEE_PARTNER_KEY
wrangler secret put MERCADO_LIVRE_CLIENT_ID
wrangler secret put MERCADO_LIVRE_CLIENT_SECRET
wrangler secret put BLING_CLIENT_ID
wrangler secret put BLING_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

## 🔄 Deploy Manual

### Deploy para Produção
```bash
npm run deploy:production
```

### Deploy para Staging
```bash
npm run deploy:staging
```

## 🤖 Deploy Automático

O deploy automático acontece:
- **Produção**: Quando há push na branch `main`
- **Staging**: Quando há Pull Request para a branch `main`

## 📋 Checklist de Deploy

- [ ] Repositório criado no GitHub
- [ ] Remote origin configurado
- [ ] Secrets configurados no GitHub Actions
- [ ] Wrangler CLI instalado e logado
- [ ] KV Namespace criado
- [ ] wrangler.toml atualizado com IDs corretos
- [ ] Secrets configurados no Cloudflare Workers
- [ ] Push para branch main realizado
- [ ] GitHub Actions executando com sucesso
- [ ] Workers funcionando no Cloudflare

## 🔧 Comandos Úteis

```bash
# Verificar status do deploy
wrangler deployments list

# Ver logs do Worker
wrangler tail

# Testar localmente
wrangler dev

# Verificar configuração
wrangler whoami
```

## 🆘 Troubleshooting

### Erro de autenticação
```bash
wrangler logout
wrangler login
```

### Erro de KV Namespace
Verifique se os IDs no `wrangler.toml` estão corretos.

### Erro de secrets
Verifique se todos os secrets foram configurados:
```bash
wrangler secret list
```