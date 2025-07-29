import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, testConnection, Database } from '../lib/supabase';

// Hook para integração com Supabase
interface SupabaseConfig {
  url: string;
  anonKey: string;
}

interface UseSupabaseReturn {
  isConnected: boolean;
  isLoading: boolean;
  connect: (config?: SupabaseConfig) => Promise<boolean>;
  disconnect: () => void;
  query: (table: string, filters?: Record<string, any>) => Promise<any[]>;
  insert: (table: string, data: Record<string, any>) => Promise<any>;
  update: (table: string, id: string, data: Record<string, any>) => Promise<any>;
  delete: (table: string, id: string) => Promise<boolean>;
  upload: (bucket: string, path: string, file: File) => Promise<string | null>;
}

interface QueryOptions {
  select?: string;
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export function useSupabase(): UseSupabaseReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verifica conexão na inicialização
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      const result = await testConnection();
      setIsConnected(result.success);
      setIsLoading(false);
      
      if (result.success) {
        toast.success('Conectado ao Supabase com sucesso');
      } else {
        toast.error(`Erro na conexão: ${result.message}`);
      }
    };
    
    checkConnection();
  }, []);

  // Conecta ao Supabase (já configurado)
  const connect = useCallback(async (config?: SupabaseConfig): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const result = await testConnection();
      setIsConnected(result.success);
      
      if (result.success) {
        toast.success('Conectado ao Supabase com sucesso');
      } else {
        toast.error(result.message);
      }
      
      return result.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na conexão';
      toast.error(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Desconecta do Supabase
  const disconnect = useCallback(() => {
    setIsConnected(false);
    toast.info('Desconectado do Supabase');
  }, []);

  // Executa query no Supabase
  const query = useCallback(async (table: string, filters: Record<string, any> = {}): Promise<any[]> => {
    if (!isConnected) {
      throw new Error('Não conectado ao Supabase');
    }

    setIsLoading(true);

    try {
      let queryBuilder = supabase.from(table).select('*');
      
      // Aplica filtros se fornecidos
      Object.entries(filters).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na consulta';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Insert no Supabase
  const insert = useCallback(async (table: string, data: Record<string, any>): Promise<any> => {
    if (!isConnected) {
      throw new Error('Não conectado ao Supabase');
    }
    
    setIsLoading(true);
    
    try {
      const { data: insertedData, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Registro inserido com sucesso');
      return insertedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na inserção';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Update no Supabase
  const update = useCallback(async (table: string, id: string, data: Record<string, any>): Promise<any> => {
    if (!isConnected) {
      throw new Error('Não conectado ao Supabase');
    }
    
    setIsLoading(true);
    
    try {
      const { data: updatedData, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Registro atualizado com sucesso');
      return updatedData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na atualização';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Delete no Supabase
  const deleteRecord = useCallback(async (table: string, id: string): Promise<boolean> => {
    if (!isConnected) {
      throw new Error('Não conectado ao Supabase');
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Registro excluído com sucesso');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na exclusão';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Upload de arquivo no Supabase Storage
  const upload = useCallback(async (bucket: string, path: string, file: File): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Não conectado ao Supabase');
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      toast.success('Arquivo enviado com sucesso');
      return publicUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload';
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  return {
    isConnected,
    isLoading,
    connect,
    disconnect,
    query,
    insert,
    update,
    delete: deleteRecord,
    upload
  };
}

// Hook para configuração do Supabase
export function useSupabaseConfig() {
  const [config, setConfig] = useState<SupabaseConfig>({
    url: 'https://uvszeoysaaphqsliinpj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g'
  });

  const updateConfig = (newConfig: Partial<SupabaseConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const resetConfig = () => {
    setConfig({
      url: 'https://uvszeoysaaphqsliinpj.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2c3plb3lzYWFwaHFzbGlpbnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTEyNDIsImV4cCI6MjA2ODE2NzI0Mn0.dhN-sIYcpX-3EQmVMSB7hvEsW25CQ0DmiNmzpQdZq6g'
    });
  };

  return {
    config,
    updateConfig,
    resetConfig
  };
}