import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useStores } from '@/hooks/useStores';
import { useFormModal } from '@/components/ui/form-modal';
import { ShopeeTokenModal } from '@/components/ShopeeTokenModal';
import { Store } from '@/types';
import { STORE_PLATFORMS, STORE_STATUS_CONFIG } from '@/lib/constants';
import { MoreHorizontal, Trash2, RefreshCw, Plus } from 'lucide-react';

const TableActions = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-end space-x-2">
    {children}
  </div>
);

const StoreStatusBadge = ({ status }: { status: Store['status'] }) => (
  <StatusBadge 
    status={status}
    type="store"
  />
);

// Configuração dos campos do formulário
const STORE_FORM_FIELDS = [
  {
    name: 'name',
    label: 'Nome da Loja',
    type: 'text' as const,
    placeholder: 'Ex: Loja Principal Shopee',
    required: true
  },
  {
    name: 'platform',
    label: 'Plataforma',
    type: 'select' as const,
    placeholder: 'Selecione a plataforma',
    options: Object.keys(STORE_PLATFORMS).map(platform => ({
      value: platform,
      label: STORE_PLATFORMS[platform as keyof typeof STORE_PLATFORMS].label
    })),
    required: true
  },
  {
    name: 'api_key',
    label: 'API Key',
    type: 'text' as const,
    placeholder: 'Chave da API da plataforma',
    required: true
  },
  {
    name: 'secret_key',
    label: 'Secret Key',
    type: 'password' as const,
    placeholder: 'Chave secreta da API',
    required: true
  }
];

const INITIAL_FORM_VALUES = {
  name: '',
  platform: '' as Store['platform'],
  api_key: '',
  secret_key: ''
};

const StoreManagement = () => {
  // Hooks para gerenciamento de lojas
  const {
    stores,
    loading,
    error,
    createStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    syncStore,
    fetchStores
  } = useStores();

  // Hook para gerenciamento do modal de formulário
  const {
    open,
    values,
    errors,
    loading: formLoading,
    openModal,
    closeModal,
    onChange,
    setValues
  } = useFormModal(INITIAL_FORM_VALUES);

  // Estados para filtros e modais
  const [searchValue, setSearchValue] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopeeModalOpen, setShopeeModalOpen] = useState(false);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);

  // Carregar lojas ao montar o componente
  useEffect(() => {
    fetchStores();
  }, []);

  // Filtrar lojas baseado nos filtros ativos
  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                         store.platform.toLowerCase().includes(searchValue.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || store.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  // Funções de manipulação de dados
  const handleCreateStore = async () => {
    try {
      await createStore(values);
      closeModal();
    } catch (error) {
      console.error('Erro ao criar loja:', error);
    }
  };

  const handleShopeeTokenSuccess = async (storeData: { name: string; platform: string; api_key?: string; secret_key?: string }) => {
    try {
      const createStoreData = {
        name: storeData.name,
        platform: storeData.platform as Store['platform'],
        api_key: storeData.api_key || '',
        secret_key: storeData.secret_key || ''
      };
      await createStore(createStoreData);
      setShopeeModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar loja Shopee:', error);
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      await deleteStore(id);
    } catch (error) {
      console.error('Erro ao excluir loja:', error);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleStoreStatus(id);
    } catch (error) {
      console.error('Erro ao alterar status da loja:', error);
    }
  };

  const handleSyncStore = async (id: string) => {
    try {
      await syncStore(id);
    } catch (error) {
      console.error('Erro ao sincronizar loja:', error);
    }
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      key: 'name',
      label: 'Loja',
      render: (value: string, store: Store) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {store.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium">{store.name}</div>
            <div className="text-sm text-gray-500 capitalize">{store.platform}</div>
          </div>
        </div>
      )
    },
    {
      key: 'platform',
      label: 'Plataforma',
      render: (value: Store['platform']) => {
        const platformConfig = {
          shopee: { label: 'Shopee', color: 'bg-orange-500 text-white' },
          mercadolivre: { label: 'Mercado Livre', color: 'bg-[#FFD352] text-blue-700' }
        };
        
        const config = platformConfig[value as keyof typeof platformConfig] || { label: value, color: 'font-medium' };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: Store['status']) => {
        const statusConfig = {
          active: { label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
          inactive: { label: 'Inativo', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
          syncing: { label: 'Sincronizando', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
        };
        
        const config = statusConfig[value as keyof typeof statusConfig] || { label: value, color: 'bg-gray-100 text-gray-800' };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'last_sync',
      label: 'Última Sincronização',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleString('pt-BR') : 'Nunca'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: unknown, store: Store) => (
        <TableActions>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSyncStore(store.id)}
            disabled={store.status === 'syncing'}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleToggleStatus(store.id)}>
                {store.status === 'active' ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteStore(store.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableActions>
      ),
      className: 'text-right'
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciamento de Lojas</h2>
          <p className="text-muted-foreground">
            Configure e monitore suas lojas conectadas
          </p>
        </div>
      </div>

      <DataTable
        title="Lojas Conectadas"
        data={filteredStores}
        columns={columns}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar lojas..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={[
          {
            key: 'platform',
            label: 'Plataforma',
            options: Object.keys(STORE_PLATFORMS).map(platform => ({
              value: platform,
              label: STORE_PLATFORMS[platform as keyof typeof STORE_PLATFORMS].label
            })),
            value: platformFilter,
            onChange: setPlatformFilter
          },
          {
            key: 'status',
            label: 'Status',
            options: Object.keys(STORE_STATUS_CONFIG).map(status => ({
              value: status,
              label: STORE_STATUS_CONFIG[status as keyof typeof STORE_STATUS_CONFIG].label
            })),
            value: statusFilter,
            onChange: setStatusFilter
          }
        ]}
        actions={{
          create: [
            {
              label: 'Conectar Shopee',
              onClick: () => setShopeeModalOpen(true),
              variant: 'default' as const
            },
            {
              label: 'Conectar Mercado Livre',
              onClick: () => openModal(),
              variant: 'outline' as const
            }
          ],
          refresh: {
            onClick: fetchStores
          }
        }}
        emptyMessage="Nenhuma loja encontrada."
      />

      <FormModal
        open={open}
        onOpenChange={closeModal}
        title="Conectar Nova Loja"
        description="Adicione uma nova loja para sincronização de dados."
        fields={STORE_FORM_FIELDS}
        values={values}
        onChange={onChange}
        onSubmit={handleCreateStore}
        loading={formLoading}
        errors={errors}
        submitLabel="Conectar Loja"
      />

      <ShopeeTokenModal
        isOpen={shopeeModalOpen}
        onClose={() => setShopeeModalOpen(false)}
        onSuccess={handleShopeeTokenSuccess}
      />
    </div>
  );
};

export default StoreManagement;