PRD - Conciliador Financeiro Multi-Marketplace chamado ConciliFy
📋 Visão Geral
Sistema web para conciliação financeira de vendas em múltiplos e-commerces (Shopee, Mercado Livre) com integração ao ERP Bling, fornecendo dashboard unificado de faturamento e gestão automatizada de tokens.

🎯 Objetivos
Centralizar dados financeiros de múltiplas plataformas
Automatizar renovação de tokens de autenticação
Visualizar performance de vendas em tempo real
Conciliar pedidos entre marketplaces e ERP
👥 Usuários
Gestores: Visualização de dashboards e relatórios
Operadores: Cadastro de lojas e monitoramento
Administradores: Configuração de integrações
⚡ Funcionalidades Principais
Dashboard Principal
Métricas consolidadas: Faturamento, rentabilidade, custos por marketplace
Gráficos temporais: Evolução de vendas por período
Comparativo de performance: Shopee vs Mercado Livre vs total
Indicadores de margem: Por categoria de produto
Status de sincronização: Última atualização de cada API
Gestão de Lojas
Modal de cadastro: Formulário para adicionar nova loja
Configuração de tokens: Busca automática via API
Status de conexão: Indicador visual de saúde das integrações
Histórico de sincronizações: Log de atualizações
Automação Backend
Refresh automático: Tokens renovados a cada 3h
Sincronização de pedidos: Busca incremental de dados
Conciliação inteligente: Match entre Bling e marketplaces
Alertas de falhas: Notificações de erros de integração
🛠 Especificações Técnicas
Frontend (TypeScript + Tailwind)
Framework: Next.js 14 com App Router
Componentes: Arquitetura modular seguindo SRP
Estado: Zustand para gerenciamento global
UI: Shadcn/ui + Tailwind CSS
Gráficos: Recharts para visualizações
Backend (Node.js)
Runtime: Node.js 18+ com TypeScript
Framework: Express.js com middleware de autenticação
Scheduler: node-cron para tarefas automáticas
APIs: Axios para requisições HTTP
Validação: Zod para schemas
Banco de Dados (Supabase)
sql

Integrações API
Shopee: Partner API v2 (get_order_list, get_order_detail)
Mercado Livre: Orders API v1 com OAuth2
Bling: Orders API v3 com webhook support
📊 Estrutura de Dados
Pedidos normalizados: Schema único para todos marketplaces
Cache inteligente: Redis para dados frequentes
Auditoria completa: Log de todas operações
Backup automático: Snapshot diário do Supabase
🔒 Segurança
Tokens criptografados: AES-256 no banco
Rate limiting: Proteção contra abuse
CORS configurado: Apenas domínios autorizados
Logs de auditoria: Rastreamento de ações
📈 Métricas de Sucesso
Tempo de sincronização: < 5min para atualização completa
Uptime: 99.5% de disponibilidade
Precisão: 100% de conciliação entre sistemas
Performance: Dashboard carrega em < 2s
🚀 Roadmap de Entrega
Semana 1: Setup inicial + estrutura do banco
Semana 2: APIs de integração + refresh automático
Semana 3: Dashboard principal + componentes UI
Semana 4: Modal de lojas + testes + deploy
🔧 Princípios de Desenvolvimento
Single Responsibility: Cada módulo com função específica
DRY: Reutilização de código e componentes
KISS: Soluções simples e diretas
YAGNI: Implementar apenas o necessário
Single Source of Truth: Supabase como fonte única
Este sistema substituirá o processo manual atual, automatizando a coleta de dados e fornecendo insights em tempo real para tomada de decisões estratégicas.