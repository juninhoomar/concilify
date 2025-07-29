#!/bin/bash

# Script de configuração do Cloudflare Workers
echo "🚀 Configurando Cloudflare Workers para ConciliFy..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Instalar Wrangler CLI globalmente
echo "📦 Instalando Wrangler CLI..."
npm install -g wrangler

# Verificar instalação
if command -v wrangler &> /dev/null; then
    echo "✅ Wrangler CLI instalado com sucesso!"
    wrangler --version
else
    echo "❌ Erro na instalação do Wrangler CLI"
    exit 1
fi

# Login no Cloudflare
echo "🔐 Fazendo login no Cloudflare..."
echo "Você será redirecionado para o navegador para autenticação."
wrangler login

# Verificar autenticação
echo "👤 Verificando autenticação..."
wrangler whoami

# Criar KV Namespaces
echo "🗄️ Criando KV Namespaces..."
echo "Criando namespace de produção..."
wrangler kv:namespace create "CACHE"

echo "Criando namespace de preview..."
wrangler kv:namespace create "CACHE" --preview

echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "1. Copie os IDs dos KV Namespaces mostrados acima"
echo "2. Atualize o arquivo wrangler.toml com os IDs corretos"
echo "3. Configure os secrets usando os comandos do DEPLOY.md"
echo "4. Configure o repositório GitHub e os secrets"
echo "5. Faça push para a branch main para deploy automático"
echo ""
echo "📖 Consulte o arquivo DEPLOY.md para instruções detalhadas."
echo "✨ Configuração inicial concluída!"