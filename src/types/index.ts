// Tipos centralizados da aplicação ConciliFy
// Seguindo o princípio Single Source of Truth

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  last_login?: string;
  avatar_url?: string;
}

export type UserRole = 'admin' | 'gestor' | 'operador';
export type UserStatus = 'active' | 'inactive';

export interface Store {
  id: string;
  name: string;
  platform: StorePlatform;
  status: StoreStatus;
  last_sync: string;
  api_key?: string;
  secret_key?: string;
  user_id: string;
  created_at: string;
}

export type StorePlatform = 'shopee' | 'mercadolivre' | 'bling';
export type StoreStatus = 'active' | 'inactive' | 'error' | 'syncing';

export interface Order {
  id: string;
  external_id: string;
  store_id: string;
  platform: StorePlatform;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PerformanceMetric {
  id: string;
  store_id: string;
  date: string;
  revenue: number;
  profit: number;
  cost: number;
  margin: number;
  orders_count: number;
  category: string;
}

export interface DashboardData {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  averageMargin: number;
  revenueGrowth: number;
  profitGrowth: number;
  ordersGrowth: number;
  marginGrowth: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Tipos para formulários
export interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateStoreForm {
  name: string;
  platform: StorePlatform;
  api_key: string;
  secret_key: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Tipos para filtros
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface StoreFilters {
  platform?: StorePlatform;
  status?: StoreStatus;
  search?: string;
}

export interface OrderFilters {
  platform?: StorePlatform;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Tipos para configurações
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  environment: 'development' | 'production';
}

// Tipos para notificações
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
}

// Tipos para auditoria
export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
}

// Tipos para sincronização
export interface SyncStatus {
  store_id: string;
  last_sync: string;
  status: 'idle' | 'syncing' | 'error' | 'success';
  error_message?: string;
  records_synced: number;
}

// Tipos para relatórios
export interface ReportConfig {
  id: string;
  name: string;
  type: 'sales' | 'inventory' | 'performance' | 'financial';
  filters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

// Tipos para geração de tokens Shopee
export interface ShopeeTokenForm {
  name: string;
  partner_id: string;
  partner_key: string;
  shop_id: string;
  authorization_code: string;
}

export interface ShopeeTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  error?: string;
}

export interface ShopeeTokenData {
  id: string;
  partner_id: string;
  shop_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
  format: 'pdf' | 'excel' | 'csv';
  createdAt: string;
  updatedAt: string;
}

export interface ReportData {
  id: string;
  configId: string;
  data: Record<string, any>;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  stores?: string[];
  platforms?: StorePlatform[];
  groupBy: 'day' | 'week' | 'month';
}

// Tipos para Dashboard
export interface OperationalMetric {
  label: string;
  value: number;
  color: string;
}

export interface DashboardFilters {
  period: 'dia' | 'semana' | 'mes';
  category: 'faturamento' | 'rentabilidade' | 'custo' | 'margem' | 'estoque';
  dateRange?: {
    start: string;
    end: string;
  };
}