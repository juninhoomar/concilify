import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, TableActions } from '@/components/ui/data-table';
import { FormModal, useFormModal, validateForm } from '@/components/ui/form-modal';
import { UserStatusBadge } from '@/components/ui/status-badge';
import { useUsers } from '@/hooks/useUsers';
import { USER_ROLES } from '@/lib/constants';
import type { CreateUserForm, User } from '@/types';

// Campos do formulário de criação de usuário
const USER_FORM_FIELDS = [
  {
    name: 'name',
    label: 'Nome',
    type: 'text' as const,
    placeholder: 'Digite o nome completo',
    required: true
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email' as const,
    placeholder: 'Digite o email',
    required: true
  },
  {
    name: 'role',
    label: 'Função',
    type: 'select' as const,
    placeholder: 'Selecione a função',
    required: true,
    options: Object.keys(USER_ROLES).map(role => ({
        value: role,
        label: USER_ROLES[role as keyof typeof USER_ROLES].label
      }))
  },
  {
    name: 'temporaryPassword',
    label: 'Senha Temporária',
    type: 'password' as const,
    placeholder: 'Digite uma senha temporária',
    required: true
  }
];

// Valores iniciais do formulário
const INITIAL_FORM_VALUES: CreateUserForm = {
  name: '',
  email: '',
  role: 'operador',
  temporaryPassword: ''
};

const UserManagement = () => {
  const { 
    users, 
    loading, 
    error,
    createUser, 
    updateUser, 
    deleteUser,
    fetchUsers 
  } = useUsers();
  
  const {
    open,
    values,
    errors,
    loading: formLoading,
    onChange,
    openModal,
    closeModal
  } = useFormModal<CreateUserForm>(INITIAL_FORM_VALUES);
  
  const [searchValue, setSearchValue] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  // Filtra usuários baseado nos filtros ativos
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchValue || 
        user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.email.toLowerCase().includes(searchValue.toLowerCase());
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchValue, roleFilter, statusFilter]);

  // Manipula criação de usuário
  const handleCreateUser = async () => {
    const formErrors = validateForm(USER_FORM_FIELDS, values);
    
    if (Object.keys(formErrors).length > 0) {
      Object.entries(formErrors).forEach(([field, message]) => {
        // Aqui você pode definir os erros no formulário
        console.error(`${field}: ${message}`);
      });
      return;
    }
    
    const success = await createUser(values);
    if (success) {
      closeModal();
    }
  };

  // Manipula exclusão de usuário
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      await deleteUser(userId);
    }
  };

  // Manipula alternância de status
  const handleToggleStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await updateUser(userId, { status: newStatus });
    }
  };

  const getRoleBadge = (role: User["role"]) => {
    const variants = {
      admin: "bg-red-100 text-red-800",
      gestor: "bg-blue-100 text-blue-800",
      operador: "bg-green-100 text-green-800"
    };
    
    const labels = {
      admin: "Administrador",
      gestor: "Gestor", 
      operador: "Operador"
    };

    return (
      <Badge className={variants[role]}>
        <Shield className="h-3 w-3 mr-1" />
        {labels[role]}
      </Badge>
    );
  };

  const getStatusBadge = (status: User["status"]) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800"
    };
    
    const labels = {
      active: "Ativo",
      inactive: "Inativo"
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  // Configuração das colunas da tabela
  const columns = [
    {
      key: 'name',
      label: 'Usuário',
      render: (value: string, user: User) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Função',
      render: (value: string) => (
        <span className="font-medium">
          {USER_ROLES[value as keyof typeof USER_ROLES].label}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        const statusConfig = {
          active: { label: 'Ativo', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
          inactive: { label: 'Inativo', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
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
      key: 'created_at',
      label: 'Criado em',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('pt-BR')}
        </span>
      )
    },
    {
      key: 'last_login',
      label: 'Último Login',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString('pt-BR') : 'Nunca'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: any, user: User) => (
        <TableActions>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                {user.status === 'active' ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciamento de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
      </div>

      <DataTable
        title="Usuários"
        data={filteredUsers}
        columns={columns}
        loading={loading}
        error={error}
        searchPlaceholder="Buscar usuários..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={[
          {
            key: 'role',
            label: 'Função',
            options: Object.keys(USER_ROLES).map(role => ({
                value: role,
                label: USER_ROLES[role as keyof typeof USER_ROLES].label
              })),
            value: roleFilter,
            onChange: setRoleFilter
          },
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'active', label: 'Ativo' },
              { value: 'inactive', label: 'Inativo' }
            ],
            value: statusFilter,
            onChange: setStatusFilter
          }
        ]}
        actions={{
          create: {
            label: 'Novo Usuário',
            onClick: () => openModal()
          },
          refresh: {
            onClick: fetchUsers
          }
        }}
        emptyMessage="Nenhum usuário encontrado."
      />

      <FormModal
        open={open}
        onOpenChange={closeModal}
        title="Criar Novo Usuário"
        description="Adicione um novo usuário ao sistema. Eles receberão um email com as credenciais."
        fields={USER_FORM_FIELDS}
        values={values}
        onChange={onChange}
        onSubmit={handleCreateUser}
        loading={formLoading}
        errors={errors}
        submitLabel="Criar Usuário"
      />
    </div>
  );
};

export default UserManagement;