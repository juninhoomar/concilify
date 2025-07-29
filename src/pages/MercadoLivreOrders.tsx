import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/lib/supabase';

interface MercadoLivreOrderDB {
  id: string;
  order_id: string;
  order_status?: string;
  total_amount?: number;
  currency_id?: string;
  date_created?: string;
  date_closed?: string;
  payer_nickname?: string;
  payment_status?: string;
  shipping_cost?: number;
  seller_id?: string;
  item_price?: number;
  ml_sale_fee?: number;
  ml_management_cost?: number;
  ml_shipping_fee?: number;
  ml_total_fees?: number;
  refunded_amount?: number;
  net_revenue?: number;
  // Novos campos financeiros detalhados
  transaction_amount?: number;
  receiver_shipping_cost?: number;
  detail_amount?: number;
  discount_amount?: number;
  financing_fee?: number;
  sale_date_time?: string;
  money_release_date?: string;
  item_title?: string;
  [key: string]: unknown;
}

interface MercadoLivreOrder {
  id: string;
  order_id: string;
  status: string;
  total_amount: number;
  currency_id: string;
  date_created: string;
  date_closed?: string;
  buyer_nickname: string;
  payment_type?: string;
  shipping_cost: number;
  seller_id: string;
  items?: Record<string, unknown>[];
  shipping?: Record<string, unknown>;
  marketplace_fee?: number;
  financing_fee?: number;
  shipping_fee?: number;
  net_amount?: number;
  // Campos financeiros detalhados
  item_price?: number;
  ml_sale_fee?: number;
  ml_management_cost?: number;
  ml_shipping_fee?: number;
  ml_total_fees?: number;
  refunded_amount?: number;
  net_revenue?: number;
  transaction_amount?: number;
  receiver_shipping_cost?: number;
  detail_amount?: number;
  discount_amount?: number;
  sale_date_time?: string;
  money_release_date?: string;
  item_title?: string;
}

interface MercadoLivreOrdersStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  completed_orders: number;
}

const MercadoLivreOrders: React.FC = () => {
  const [orders, setOrders] = useState<MercadoLivreOrder[]>([]);
  const [stats, setStats] = useState<MercadoLivreOrdersStats>({
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
      let query = supabase.from('mercado_livre_orders').select('*', { count: 'exact', head: true });
      
      // Aplicar filtro de loja se selecionado
      if (storeFilter !== 'all') {
        query = query.eq('seller_id', storeFilter);
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
        .from('mercado_livre_orders')
        .select('*')
        .order('date_created', { ascending: false })
        .range(from, to);
        
      // Aplicar filtro de loja se selecionado
      if (storeFilter !== 'all') {
        dataQuery = dataQuery.eq('seller_id', storeFilter);
      }

      const { data, error } = await dataQuery;

      if (error) throw error;

      // Calcular valores líquidos com taxas descontadas
      const ordersWithNetAmount: MercadoLivreOrder[] = (data || []).map((order: MercadoLivreOrderDB) => {
        const totalFees = (order.ml_sale_fee || 0) + (order.ml_management_cost || 0) + (order.ml_shipping_fee || 0);
        const finalAmount = (order.total_amount || 0) - totalFees - (order.refunded_amount || 0);
        
        return {
          id: order.id,
          order_id: order.order_id,
          status: order.order_status || 'unknown',
          total_amount: order.total_amount || 0,
          currency_id: order.currency_id || 'BRL',
          date_created: order.date_created || '',
          date_closed: order.date_closed,
          buyer_nickname: order.payer_nickname || 'N/A',
          payment_type: order.payment_status,
          shipping_cost: order.shipping_cost || 0,
          seller_id: order.seller_id || '',
          marketplace_fee: order.ml_sale_fee || 0,
          financing_fee: order.ml_management_cost || 0,
          shipping_fee: order.ml_shipping_fee || 0,
          net_amount: finalAmount,
          // Campos financeiros detalhados
          item_price: order.item_price,
          ml_sale_fee: order.ml_sale_fee,
          ml_management_cost: order.ml_management_cost,
          ml_shipping_fee: order.ml_shipping_fee,
          ml_total_fees: order.ml_total_fees,
          refunded_amount: order.refunded_amount,
          net_revenue: order.net_revenue,
          transaction_amount: order.transaction_amount,
          receiver_shipping_cost: order.receiver_shipping_cost,
          detail_amount: order.detail_amount,
          discount_amount: order.discount_amount,
          sale_date_time: order.sale_date_time,
          money_release_date: order.money_release_date,
          item_title: order.item_title
        };
      });

      setOrders(ordersWithNetAmount);
      setCurrentPage(page);
      
      // Calcular estatísticas apenas dos dados da página atual
      calculateStats(ordersWithNetAmount);
      
      toast({
        title: "Pedidos carregados",
        description: `${ordersWithNetAmount.length} pedidos encontrados (página ${page} de ${totalPagesCalc})`,
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
  const calculateStats = (orderData: MercadoLivreOrder[]) => {
    const totalOrders = orderData.length;
    const totalAmount = orderData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const pendingOrders = orderData.filter(order => 
      ['pending_payment', 'payment_required', 'payment_in_process'].includes(order.status)
    ).length;
    const completedOrders = orderData.filter(order => 
      order.status === 'paid'
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

  // Filtrar pedidos (agora aplicado apenas aos dados da página atual)
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_id.toLowerCase().includes(searchValue.toLowerCase()) ||
                         order.buyer_nickname?.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Configuração das colunas da tabela
  const columns = [
    {
      key: 'order_id',
      label: 'Pedido',
      render: (value: string, order: MercadoLivreOrder) => (
        <div className="space-y-1">
          <div className="font-mono text-sm font-medium">{value}</div>
          {order.item_title && (
            <div className="text-xs text-gray-600 max-w-[150px] truncate" title={order.item_title}>
              {order.item_title}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
          'pending_payment': { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800' },
          'payment_required': { label: 'Pagamento Requerido', color: 'bg-red-100 text-red-800' },
          'payment_in_process': { label: 'Processando Pagamento', color: 'bg-blue-100 text-blue-800' },
          'paid': { label: 'Pago', color: 'bg-green-100 text-green-800' },
          'shipped': { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
          'delivered': { label: 'Entregue', color: 'bg-green-100 text-green-800' },
          'cancelled': { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' }
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
      key: 'transaction_amount',
      label: 'Valor do Item',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const transactionAmount = order.transaction_amount || 0;
        return (
          <div className="text-sm font-medium text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(transactionAmount)}
          </div>
        );
      }
    },
    {
      key: 'receiver_shipping_cost',
      label: 'Frete Pago',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const receiverShippingCost = order.receiver_shipping_cost || 0;
        return (
          <div className="text-sm text-blue-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(receiverShippingCost)}
          </div>
        );
      }
    },
    {
      key: 'discount_amount',
      label: 'Desconto',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const discountAmount = order.discount_amount || 0;
        return (
          <div className="text-sm text-orange-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(discountAmount)}
          </div>
        );
      }
    },
    {
      key: 'ml_shipping_fee',
      label: 'Tarifa Envio',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const mlShippingFee = order.ml_shipping_fee || 0;
        return (
          <div className="text-sm text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(mlShippingFee)}
          </div>
        );
      }
    },
    {
      key: 'ml_management_cost',
      label: 'Custo Gestão',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const mlManagementCost = order.ml_management_cost || 0;
        return (
          <div className="text-sm text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(mlManagementCost)}
          </div>
        );
      }
    },
    {
      key: 'ml_sale_fee',
      label: 'Tarifa Venda',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const mlSaleFee = order.ml_sale_fee || 0;
        return (
          <div className="text-sm text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(mlSaleFee)}
          </div>
        );
      }
    },
    {
      key: 'total_fees',
      label: 'Total Custos',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const mlSaleFee = order.ml_sale_fee || 0;
        const mlManagementCost = order.ml_management_cost || 0;
        const mlShippingFee = order.ml_shipping_fee || 0;
        const totalFees = order.ml_total_fees || (mlSaleFee + mlManagementCost + mlShippingFee);
        return (
          <div className="text-sm font-medium text-red-700">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(totalFees)}
          </div>
        );
      }
    },
    {
      key: 'refunded_amount',
      label: 'Reembolso',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const refundedAmount = order.refunded_amount || 0;
        return (
          <div className="text-sm text-red-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(refundedAmount)}
          </div>
        );
      }
    },
    {
      key: 'net_profit',
      label: 'Lucro Líquido',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const transactionAmount = order.transaction_amount || 0;
        const receiverShippingCost = order.receiver_shipping_cost || 0;
        const totalFees = order.ml_total_fees || 0;
        const refundedAmount = order.refunded_amount || 0;
        
        const totalReceived = transactionAmount + receiverShippingCost;
        const netProfit = totalReceived - totalFees - refundedAmount;
        
        return (
          <div className="text-sm font-medium text-green-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: order.currency_id || 'BRL'
            }).format(netProfit)}
          </div>
        );
      }
    },
    {
      key: 'sale_date_time',
      label: 'Data Venda',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const saleDate = order.sale_date_time || order.date_created;
        return (
          <div className="text-sm text-gray-600">
            {new Date(saleDate).toLocaleDateString('pt-BR')}
          </div>
        );
      }
    },
    {
      key: 'money_release_date',
      label: 'Data Liberação',
      render: (_: unknown, order: MercadoLivreOrder) => {
        const releaseDate = order.money_release_date;
        return (
          <div className="text-sm text-blue-600">
            {releaseDate ? new Date(releaseDate).toLocaleDateString('pt-BR') : '-'}
          </div>
        );
      }
    },

  ];

  // Status options para filtro
  const statusOptions = [
    { value: 'pending_payment', label: 'Aguardando Pagamento' },
    { value: 'payment_required', label: 'Pagamento Requerido' },
    { value: 'payment_in_process', label: 'Processando Pagamento' },
    { value: 'paid', label: 'Pago' },
    { value: 'shipped', label: 'Enviado' },
    { value: 'delivered', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' }
  ];

  // Store options para filtro
  const storeOptions = stores
    .filter(store => store.platform === 'mercadolivre')
    .map(store => ({
      value: store.id,
      label: store.name
    }));

  useEffect(() => {
    fetchOrders();
  }, [storeFilter]);

  useEffect(() => {
    if (stores.length > 0) {
      fetchOrders(currentPage);
    }
  }, [stores]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Pedidos Mercado Livre</h2>
          <p className="text-muted-foreground">
            Gerencie e monitore seus pedidos do Mercado Livre
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
              }).format(stats.total_amount)}
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
        title="Pedidos do Mercado Livre"
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

export default MercadoLivreOrders;