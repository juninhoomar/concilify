import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';

interface ShopeeOrder {
  id: string;
  order_sn: string;
  order_status: string;
  shop_id: string;
  create_time: string;
  update_time: string;
  order_data?: Record<string, unknown>;
  empresa_id?: string;
  buyer_total_amount: number;
  original_price: number;
  order_selling_price: number;
  order_discounted_price: number;
  seller_discount: number;
  shopee_discount: number;
  merchant_subtotal: number;
  commission_fee: number;
  service_fee: number;
  cost_of_goods_sold: number;
  escrow_amount: number;
  actual_shipping_fee: number;
  estimated_shipping_fee: number;
  shopee_shipping_rebate: number;
  payment_promotion: number;
  withholding_tax: number;
  buyer_user_name?: string;
  buyer_payment_method?: string;
  is_paid_by_credit_card?: boolean;
  instalment_plan?: string;
  return_order_sn_list?: Record<string, unknown>[];
  financial_data_updated_at?: string;
  created_at?: string;
  updated_at?: string;
  // Novos campos extraídos
  item_sku?: string;
  item_name?: string;
  model_sku?: string;
  shipping_carrier?: string;
  logistics_status?: string;
  // Campos calculados
  total_fees?: number;
  net_amount?: number;
}

interface ShopeeOrdersStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  completed_orders: number;
}

const ShopeeOrders: React.FC = () => {
  const [orders, setOrders] = useState<ShopeeOrder[]>([]);
  const [stats, setStats] = useState<ShopeeOrdersStats>({
    total_orders: 0,
    total_amount: 0,
    pending_orders: 0,
    completed_orders: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 50;
  const { toast } = useToast();
  const { stores } = useStores();

  // Função para buscar pedidos do Supabase com paginação
  const fetchOrders = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      // Construir query base
      let query = supabase.from('shopee_orders').select('*', { count: 'exact', head: true });
      
      // Aplicar filtro de busca se houver
      if (searchValue.trim()) {
        query = query.or(`order_sn.ilike.%${searchValue}%,buyer_user_name.ilike.%${searchValue}%`);
      }
      
      // Aplicar filtro de status se selecionado
      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }
      
      // Aplicar filtro de loja se selecionado
      if (storeFilter !== 'all') {
        query = query.eq('shop_id', storeFilter);
      }

      // Buscar total de registros
      const { count } = await query;

      const totalCount = count || 0;
      const totalPagesCalc = Math.ceil(totalCount / itemsPerPage);
      
      setTotalRecords(totalCount);
      setTotalPages(totalPagesCalc);

      // Buscar pedidos da página atual
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let dataQuery = supabase
        .from('shopee_orders')
        .select('*')
        .order('create_time', { ascending: false })
        .range(from, to);
        
      // Aplicar filtro de busca se houver
      if (searchValue.trim()) {
        dataQuery = dataQuery.or(`order_sn.ilike.%${searchValue}%,buyer_user_name.ilike.%${searchValue}%`);
      }
      
      // Aplicar filtro de status se selecionado
      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('order_status', statusFilter);
      }
        
      // Aplicar filtro de loja se selecionado
      if (storeFilter !== 'all') {
        dataQuery = dataQuery.eq('shop_id', storeFilter);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;

      // Mapear dados e calcular valores
      const ordersWithCalculatedValues = (data || []).map(order => {
        const commissionFee = Number(order.commission_fee) || 0;
        const serviceFee = Number(order.service_fee) || 0;
        const withholdingTax = Number(order.withholding_tax) || 0;
        const totalFees = commissionFee + serviceFee + withholdingTax;
        const totalAmount = Number(order.buyer_total_amount) || 0;
        const netAmount = totalAmount - totalFees;
        
        return {
          ...order,
          commission_fee: commissionFee,
          service_fee: serviceFee,
          withholding_tax: withholdingTax,
          buyer_total_amount: totalAmount,
          actual_shipping_fee: Number(order.actual_shipping_fee) || 0,
          estimated_shipping_fee: Number(order.estimated_shipping_fee) || 0,
          escrow_amount: Number(order.escrow_amount) || 0,
          seller_discount: Number(order.seller_discount) || 0,
          shopee_discount: Number(order.shopee_discount) || 0,
          net_amount: netAmount,
          total_fees: totalFees
        };
      });

      setOrders(ordersWithCalculatedValues);
      setCurrentPage(page);
      
      // Calcular estatísticas apenas dos dados da página atual
      calculateStats(ordersWithCalculatedValues);
      
      toast({
        title: "Pedidos carregados",
        description: `${ordersWithCalculatedValues.length} pedidos encontrados (página ${page} de ${totalPagesCalc})`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: "Erro ao carregar pedidos",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular estatísticas
  const calculateStats = (orderData: ShopeeOrder[]) => {
    const totalOrders = orderData.length;
    const totalAmount = orderData.reduce((sum, order) => sum + (order.buyer_total_amount || 0), 0);
    const pendingOrders = orderData.filter(order => 
      ['UNPAID', 'TO_SHIP', 'SHIPPED'].includes(order.order_status)
    ).length;
    const completedOrders = orderData.filter(order => 
      order.order_status === 'COMPLETED'
    ).length;

    setStats({
      total_orders: totalOrders,
      total_amount: totalAmount,
      pending_orders: pendingOrders,
      completed_orders: completedOrders
    });
  };

  // Funções de navegação da paginação
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchOrders(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchOrders(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchOrders(page);
    }
  };

  // Como a busca agora é feita no banco, não precisamos filtrar localmente
  const filteredOrders = orders;

  // Configuração das colunas da tabela
  const columns = [
    {
      key: 'order_sn',
      label: 'Pedido',
      render: (value: string, order: ShopeeOrder) => (
        <div className="space-y-1">
          <div className="font-mono text-sm font-medium">{value}</div>
          {order.item_name && (
            <div className="text-xs text-gray-600 max-w-[200px] truncate" title={order.item_name}>
              {order.item_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'order_status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
          'UNPAID': { label: 'Não Pago', color: 'bg-red-100 text-red-800' },
          'TO_SHIP': { label: 'Para Enviar', color: 'bg-yellow-100 text-yellow-800' },
          'SHIPPED': { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
          'COMPLETED': { label: 'Concluído', color: 'bg-green-100 text-green-800' },
          'CANCELLED': { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
          'TO_RETURN': { label: 'Para Devolver', color: 'bg-orange-100 text-orange-800' }
        };
        
        const config = statusConfig[value] || { label: value, color: 'bg-gray-100 text-gray-800' };
        
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'buyer_total_amount',
      label: 'Valor Total',
      render: (value: number, order: ShopeeOrder) => (
        <span className="font-medium text-blue-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'order_selling_price',
      label: 'Preço Venda',
      render: (value: number) => (
        <span className="text-sm">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },

    {
      key: 'total_discount',
      label: 'Descontos',
      render: (value: number) => (
        <span className="text-sm text-orange-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'commission_fee',
      label: 'Taxa Comissão',
      render: (value: number) => (
        <span className="text-sm text-red-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'actual_shipping_fee',
      label: 'Frete Real',
      render: (value: number) => (
        <span className="text-sm">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'escrow_amount',
      label: 'Valor Retido',
      render: (value: number) => (
        <span className="text-sm">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },

    {
      key: 'service_fee',
      label: 'Taxa Serviço',
      render: (value: number) => (
        <span className="text-sm text-red-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'withholding_tax',
      label: 'Imposto Retido',
      render: (value: number) => (
        <span className="text-sm text-red-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(Number(value) || 0)}
        </span>
      )
    },
    {
      key: 'total_fees',
      label: 'Total Custos',
      render: (_: unknown, order: ShopeeOrder) => {
        const totalFees = (order.commission_fee || 0) + (order.service_fee || 0) + (order.withholding_tax || 0);
        return (
          <span className="font-medium text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(totalFees)}
          </span>
        );
      }
    },
    {
      key: 'net_amount',
      label: 'Lucro Líquido',
      render: (_: unknown, order: ShopeeOrder) => {
        const totalFees = (order.commission_fee || 0) + (order.service_fee || 0) + (order.withholding_tax || 0);
        const netAmount = (order.buyer_total_amount || 0) - totalFees;
        return (
          <span className={`font-medium ${
            netAmount >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(netAmount)}
          </span>
        );
      }
    },
    {
      key: 'create_time',
      label: 'Data Venda',
      render: (value: string | number) => {
        const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
        return (
          <span className="text-sm">
            {date.toLocaleDateString('pt-BR')}
          </span>
        );
      }
    },
    {
      key: 'buyer_user_name',
      label: 'Comprador',
      render: (value: string) => (
        <span className="text-sm">{value || 'N/A'}</span>
      )
    }
  ];

  // Status options para filtro
  const statusOptions = [
    { value: 'UNPAID', label: 'Não Pago' },
    { value: 'TO_SHIP', label: 'Para Enviar' },
    { value: 'SHIPPED', label: 'Enviado' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'CANCELLED', label: 'Cancelado' },
    { value: 'TO_RETURN', label: 'Para Devolver' }
  ];

  // Store options para filtro
  const storeOptions = stores
    .filter(store => store.platform === 'shopee')
    .map(store => ({
      value: store.id,
      label: store.name
    }));

  useEffect(() => {
    fetchOrders(1);
  }, [storeFilter, statusFilter, searchValue]);

  useEffect(() => {
    if (stores.length > 0) {
      fetchOrders(currentPage);
    }
  }, [stores]);

  // Debounce para busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue.trim()) {
        fetchOrders(1);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pedidos Shopee</h2>
          <p className="text-muted-foreground">
            Gerencie e monitore seus pedidos da Shopee
          </p>
        </div>
      </div>



      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_orders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.total_amount / 100000)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_orders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed_orders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Pedidos */}
      <DataTable
        title="Pedidos da Shopee"
        data={filteredOrders}
        columns={columns}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar por número do pedido ou comprador..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={[
          {
            key: 'store',
            label: 'Loja',
            options: storeOptions,
            value: storeFilter,
            onChange: setStoreFilter
          },
          {
            key: 'status',
            label: 'Status',
            options: statusOptions,
            value: statusFilter,
            onChange: setStatusFilter
          }
        ]}
        actions={{
          refresh: {
            onClick: () => fetchOrders(currentPage)
          }
        }}
        emptyMessage="Nenhum pedido encontrado."
      />

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Página {currentPage} de {totalPages}</p>
              <p className="text-sm text-muted-foreground">({totalRecords} pedidos no total)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            {/* Números das páginas */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopeeOrders;