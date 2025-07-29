// Constantes centralizadas da aplicação ConciliFy
// Seguindo os princípios DRY e Single Source of Truth

import { UserRole, StorePlatform, UserStatus, StoreStatus, OrderStatus } from '@/types';

// Configurações da aplicação
export const APP_CONFIG = {
  name: 'ConciliFy',
  description: 'Conciliador Multi-Marketplace',
  version: '1.0.0',
  author: 'ConciliFy Team'
} as const;

// URLs e endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh'
  },
  users: {
    list: '/users',
    create: '/users',
    update: '/users',
    delete: '/users'
  },
  stores: {
    list: '/stores',
    create: '/stores',
    update: '/stores',
    delete: '/stores',
    sync: '/stores/sync'
  },
  orders: {
    list: '/orders',
    sync: '/orders/sync'
  },
  dashboard: {
    metrics: '/dashboard/metrics',
    performance: '/dashboard/performance'
  }
} as const;

// Roles e permissões
export const USER_ROLES: Record<UserRole, { label: string; permissions: string[] }> = {
  admin: {
    label: 'Administrador',
    permissions: ['*'] // Todas as permissões
  },
  gestor: {
    label: 'Gestor',
    permissions: [
      'dashboard.view',
      'stores.view',
      'stores.create',
      'stores.update',
      'orders.view',
      'reports.view',
      'users.view'
    ]
  },
  operador: {
    label: 'Operador',
    permissions: [
      'dashboard.view',
      'stores.view',
      'orders.view'
    ]
  }
};

// Status dos usuários
export const USER_STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active: {
    label: 'Ativo',
    color: 'bg-green-100 text-green-800'
  },
  inactive: {
    label: 'Inativo',
    color: 'bg-gray-100 text-gray-800'
  }
};

// Plataformas de marketplace
export const STORE_PLATFORMS: Record<StorePlatform, { label: string; icon: string; color: string }> = {
  shopee: {
    label: 'Shopee',
    icon: 'ShoppingBag',
    color: 'bg-orange-100 text-orange-800'
  },
  mercadolivre: {
    label: 'Mercado Livre',
    icon: 'Store',
    color: 'bg-yellow-100 text-yellow-800'
  },
  bling: {
    label: 'Bling ERP',
    icon: 'Database',
    color: 'bg-blue-100 text-blue-800'
  }
};

// Status das lojas
export const STORE_STATUS_CONFIG: Record<StoreStatus, { label: string; color: string }> = {
  active: {
    label: 'Ativa',
    color: 'bg-green-100 text-green-800'
  },
  inactive: {
    label: 'Inativa',
    color: 'bg-gray-100 text-gray-800'
  },
  error: {
    label: 'Erro',
    color: 'bg-red-100 text-red-800'
  },
  syncing: {
    label: 'Sincronizando',
    color: 'bg-blue-100 text-blue-800'
  }
};

// Status dos pedidos
export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-100 text-yellow-800'
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-800'
  },
  shipped: {
    label: 'Enviado',
    color: 'bg-purple-100 text-purple-800'
  },
  delivered: {
    label: 'Entregue',
    color: 'bg-green-100 text-green-800'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800'
  },
  refunded: {
    label: 'Reembolsado',
    color: 'bg-gray-100 text-gray-800'
  }
};

// Configurações de paginação
export const PAGINATION_CONFIG = {
  defaultLimit: 10,
  maxLimit: 100,
  pageSizes: [10, 25, 50, 100]
} as const;

// Configurações de sincronização
export const SYNC_CONFIG = {
  intervalMinutes: 180, // 3 horas
  retryAttempts: 3,
  timeoutSeconds: 30
} as const;

// Configurações de validação
export const VALIDATION_CONFIG = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  email: {
    maxLength: 255
  },
  name: {
    minLength: 2,
    maxLength: 100
  }
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  auth: {
    invalidCredentials: 'Email ou senha inválidos',
    sessionExpired: 'Sessão expirada. Faça login novamente',
    unauthorized: 'Você não tem permissão para acessar este recurso'
  },
  validation: {
    required: 'Este campo é obrigatório',
    invalidEmail: 'Email inválido',
    passwordTooShort: `Senha deve ter pelo menos ${VALIDATION_CONFIG.password.minLength} caracteres`,
    passwordsNotMatch: 'Senhas não coincidem'
  },
  network: {
    connectionError: 'Erro de conexão. Verifique sua internet',
    serverError: 'Erro interno do servidor. Tente novamente',
    timeout: 'Tempo limite excedido. Tente novamente'
  },
  sync: {
    failed: 'Falha na sincronização',
    inProgress: 'Sincronização em andamento',
    noData: 'Nenhum dado para sincronizar'
  }
} as const;

// Mensagens de sucesso
export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: 'Login realizado com sucesso',
    logoutSuccess: 'Logout realizado com sucesso',
    registerSuccess: 'Cadastro realizado com sucesso'
  },
  crud: {
    created: 'Registro criado com sucesso',
    updated: 'Registro atualizado com sucesso',
    deleted: 'Registro excluído com sucesso'
  },
  sync: {
    completed: 'Sincronização concluída com sucesso',
    started: 'Sincronização iniciada'
  }
} as const;

// Configurações de tema
export const THEME_CONFIG = {
  colors: {
    primary: 'hsl(222.2 47.4% 11.2%)',
    secondary: 'hsl(210 40% 96.1%)',
    accent: 'hsl(210 40% 96.1%)',
    destructive: 'hsl(0 84.2% 60.2%)',
    success: 'hsl(142.1 76.2% 36.3%)',
    warning: 'hsl(47.9 95.8% 53.1%)',
    info: 'hsl(199.4 89.2% 48.4%)'
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280
  }
} as const;

// Configurações de formatação
export const FORMAT_CONFIG = {
  currency: {
    locale: 'pt-BR',
    currency: 'BRL'
  },
  date: {
    locale: 'pt-BR',
    format: 'dd/MM/yyyy',
    formatWithTime: 'dd/MM/yyyy HH:mm'
  },
  number: {
    locale: 'pt-BR',
    decimals: 2
  }
} as const;

// Configurações do Dashboard
export const DASHBOARD_PERIODS = {
  DAY: 'dia',
  WEEK: 'semana',
  MONTH: 'mes'
} as const;

export const DASHBOARD_CATEGORIES = {
  REVENUE: 'faturamento',
  PROFITABILITY: 'rentabilidade',
  COST: 'custo',
  MARGIN: 'margem',
  STOCK: 'estoque'
} as const;

export const DASHBOARD_PERIOD_LABELS = {
  [DASHBOARD_PERIODS.DAY]: 'Dia',
  [DASHBOARD_PERIODS.WEEK]: 'Semana',
  [DASHBOARD_PERIODS.MONTH]: 'Mês'
} as const;

export const DASHBOARD_CATEGORY_LABELS = {
  [DASHBOARD_CATEGORIES.REVENUE]: 'Faturamento',
  [DASHBOARD_CATEGORIES.PROFITABILITY]: 'Rentabilidade',
  [DASHBOARD_CATEGORIES.COST]: 'Custo',
  [DASHBOARD_CATEGORIES.MARGIN]: 'Margem',
  [DASHBOARD_CATEGORIES.STOCK]: 'Estoque'
} as const;

// Rotas da aplicação
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/',
  stores: '/stores',
  users: '/users',
  orders: '/orders',
  reports: '/reports',
  settings: '/settings',
  profile: '/profile'
} as const;

// Configurações de localStorage
export const STORAGE_KEYS = {
  authToken: 'concilify_auth_token',
  refreshToken: 'concilify_refresh_token',
  user: 'concilify_user',
  theme: 'concilify_theme',
  preferences: 'concilify_preferences'
} as const;