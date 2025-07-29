import { useState, useEffect } from 'react';
import { Store, CreateStoreForm, StoreFilters, ApiResponse, PaginatedResponse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// Hook customizado para gerenciamento de lojas
// Seguindo os princípios Single Responsibility e Single Source of Truth

interface UseStoresReturn {
  stores: Store[];
  loading: boolean;
  error: string | null;
  totalStores: number;
  createStore: (storeData: CreateStoreForm) => Promise<boolean>;
  updateStore: (id: string, storeData: Partial<Store>) => Promise<boolean>;
  deleteStore: (id: string) => Promise<boolean>;
  toggleStoreStatus: (id: string) => Promise<boolean>;
  syncStore: (id: string) => Promise<boolean>;
  fetchStores: (filters?: StoreFilters) => Promise<void>;
  refreshStores: () => Promise<void>;
}

// Interface para dados das lojas do banco
interface ShopeeTokenRow {
  id: string;
  loja: string;
  shop_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  empresa_id: string;
}

interface MercadoLivreTokenRow {
  id: string;
  loja: string;
  loja_id_ML: string;
  empresa: string;
}

// Função para buscar lojas reais do Supabase
const fetchStoresFromDatabase = async (): Promise<Store[]> => {
  try {
    // Buscar lojas do Shopee
    const { data: shopeeStores, error: shopeeError } = await supabase
      .from('shopee_tokens')
      .select('id, loja, shop_id, is_active, created_at, updated_at, empresa_id')
      .eq('empresa_id', 'a3a6aa30-04f9-4954-aa0d-c5f8c53962eb');

    if (shopeeError) throw shopeeError;

    // Buscar lojas do Mercado Livre
    const { data: mercadoLivreStores, error: mlError } = await supabase
      .from('mercado_livre_tokens')
      .select('id, loja, loja_id_ML, empresa')
      .eq('empresa', 'a3a6aa30-04f9-4954-aa0d-c5f8c53962eb');

    if (mlError) throw mlError;

    // Converter dados do Shopee para o formato Store
    const shopeeStoresList: Store[] = (shopeeStores || []).map((store: ShopeeTokenRow) => ({
      id: store.shop_id, // Usar shop_id como identificador para filtros
      name: store.loja || 'Loja Shopee',
      platform: 'shopee' as const,
      status: store.is_active ? 'active' : 'inactive' as const,
      last_sync: store.updated_at,
      created_at: store.created_at,
      user_id: store.empresa_id
    }));

    // Converter dados do Mercado Livre para o formato Store
    const mercadoLivreStoresList: Store[] = (mercadoLivreStores || []).map((store: MercadoLivreTokenRow) => ({
      id: store.loja_id_ML || store.id, // Usar loja_id_ML como identificador para filtros
      name: store.loja || 'Loja Mercado Livre',
      platform: 'mercadolivre' as const,
      status: 'active' as const,
      last_sync: new Date().toISOString(),
      created_at: new Date().toISOString(),
      user_id: store.empresa
    }));

    // Combinar todas as lojas
    return [...shopeeStoresList, ...mercadoLivreStoresList];
  } catch (error) {
    console.error('Erro ao buscar lojas do banco:', error);
    throw error;
  }
};

export function useStores(): UseStoresReturn {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalStores, setTotalStores] = useState(0);
  const { toast } = useToast();

  // Busca lojas reais do Supabase
  const fetchStores = async (filters?: StoreFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar lojas do banco de dados
      let allStores = await fetchStoresFromDatabase();
      
      // Aplica filtros
      if (filters) {
        if (filters.platform) {
          allStores = allStores.filter(store => store.platform === filters.platform);
        }
        if (filters.status) {
          allStores = allStores.filter(store => store.status === filters.status);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          allStores = allStores.filter(store => 
            store.name.toLowerCase().includes(searchLower)
          );
        }
      }
      
      setStores(allStores);
      setTotalStores(allStores.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.network.serverError;
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createStore = async (storeData: CreateStoreForm): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula validação de API keys
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newStore: Store = {
        id: Date.now().toString(),
        name: storeData.name,
        platform: storeData.platform,
        api_key: storeData.api_key,
        secret_key: storeData.secret_key,
        status: 'active',
        created_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        user_id: 'a3a6aa30-04f9-4954-aa0d-c5f8c53962eb'
      };
      
      setStores(prev => [newStore, ...prev]);
      setTotalStores(prev => prev + 1);
      
      toast({
        title: 'Sucesso',
        description: SUCCESS_MESSAGES.crud.created
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.network.serverError;
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateStore = async (id: string, storeData: Partial<Store>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStores(prev => prev.map(store => 
        store.id === id ? { ...store, ...storeData } : store
      ));
      
      toast({
        title: 'Sucesso',
        description: SUCCESS_MESSAGES.crud.updated
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.network.serverError;
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteStore = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setStores(prev => prev.filter(store => store.id !== id));
      setTotalStores(prev => prev - 1);
      
      toast({
        title: 'Sucesso',
        description: SUCCESS_MESSAGES.crud.deleted
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.network.serverError;
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async (id: string): Promise<boolean> => {
    const store = stores.find(s => s.id === id);
    if (!store) return false;
    
    const newStatus = store.status === 'active' ? 'inactive' : 'active';
    return await updateStore(id, { status: newStatus });
  };

  const syncStore = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula processo de sincronização
      await updateStore(id, { status: 'syncing' });
      
      // Simula tempo de sincronização
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await updateStore(id, { 
        status: 'active',
        last_sync: new Date().toISOString()
      });
      
      toast({
        title: 'Sucesso',
        description: 'Sincronização concluída com sucesso'
      });
      
      return true;
    } catch (err) {
      await updateStore(id, { status: 'error' });
      const errorMessage = err instanceof Error ? err.message : 'Erro na sincronização';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshStores = async () => {
    await fetchStores();
  };

  // Carrega lojas na inicialização
  useEffect(() => {
    fetchStores();
  }, []);

  return {
    stores,
    loading,
    error,
    totalStores,
    createStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    syncStore,
    fetchStores,
    refreshStores
  };
}

// Hook para loja específica
export function useStore(id: string) {
  const { stores, loading, error, updateStore, syncStore } = useStores();
  const store = stores.find(s => s.id === id);
  
  return {
    store,
    loading,
    error,
    updateStore: (storeData: Partial<Store>) => updateStore(id, storeData),
    syncStore: () => syncStore(id)
  };
}