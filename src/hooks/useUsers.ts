import { useState, useEffect } from 'react';
import { User, CreateUserForm, UserFilters, ApiResponse, PaginatedResponse } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/constants';

// Hook customizado para gerenciamento de usuários
// Seguindo os princípios Single Responsibility e Single Source of Truth

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  totalUsers: number;
  createUser: (userData: CreateUserForm) => Promise<boolean>;
  updateUser: (id: string, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  toggleUserStatus: (id: string) => Promise<boolean>;
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

// Dados mockados temporários - serão substituídos pela integração com Supabase
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@concilify.com',
    role: 'admin',
    status: 'active',
    created_at: '2024-01-10T09:00:00Z',
    last_login: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@concilify.com',
    role: 'gestor',
    status: 'active',
    created_at: '2024-01-12T14:20:00Z',
    last_login: '2024-01-15T08:15:00Z'
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro@concilify.com',
    role: 'operador',
    status: 'inactive',
    created_at: '2024-01-05T16:45:00Z'
  }
];

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const { toast } = useToast();

  // Simula chamada à API - será substituído pela integração com Supabase
  const fetchUsers = async (filters?: UserFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula delay da API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredUsers = [...MOCK_USERS];
      
      // Aplica filtros
      if (filters) {
        if (filters.role) {
          filteredUsers = filteredUsers.filter(user => user.role === filters.role);
        }
        if (filters.status) {
          filteredUsers = filteredUsers.filter(user => user.status === filters.status);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
          );
        }
      }
      
      setUsers(filteredUsers);
      setTotalUsers(filteredUsers.length);
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

  const createUser = async (userData: CreateUserForm): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: 'active',
        created_at: new Date().toISOString()
      };
      
      setUsers(prev => [newUser, ...prev]);
      setTotalUsers(prev => prev + 1);
      
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

  const updateUser = async (id: string, userData: Partial<User>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, ...userData } : user
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

  const deleteUser = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simula chamada à API
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setUsers(prev => prev.filter(user => user.id !== id));
      setTotalUsers(prev => prev - 1);
      
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

  const toggleUserStatus = async (id: string): Promise<boolean> => {
    const user = users.find(u => u.id === id);
    if (!user) return false;
    
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    return await updateUser(id, { status: newStatus });
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  // Carrega usuários na inicialização
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    totalUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    fetchUsers,
    refreshUsers
  };
}

// Hook para usuário específico
export function useUser(id: string) {
  const { users, loading, error, updateUser } = useUsers();
  const user = users.find(u => u.id === id);
  
  return {
    user,
    loading,
    error,
    updateUser: (userData: Partial<User>) => updateUser(id, userData)
  };
}