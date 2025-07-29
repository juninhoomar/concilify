import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Componente DataTable reutilizável
// Seguindo os princípios DRY e Single Responsibility

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange?: (value: string) => void;
  }[];
  actions?: {
    create?: {
      label: string;
      onClick: () => void;
    } | {
      label: string;
      onClick: () => void;
      variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
      icon?: React.ReactNode;
    }[];
    refresh?: {
      onClick: () => void;
    };
  };
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id: string }>(
  props: DataTableProps<T>
) {
  const {
    title,
    data,
    columns,
    loading = false,
    error = null,
    searchPlaceholder = 'Pesquisar...',
    searchValue = '',
    onSearchChange,
    filters = [],
    actions,
    emptyMessage = 'Nenhum item encontrado.',
    className
  } = props;

  const renderCellValue = (column: Column<T>, item: T) => {
    if (column.render) {
      return column.render(
        column.key.includes('.') 
          ? column.key.split('.').reduce((obj, key) => obj?.[key], item as any)
          : (item as any)[column.key],
        item
      );
    }
    
    const value = column.key.includes('.')
      ? column.key.split('.').reduce((obj, key) => obj?.[key], item as any)
      : (item as any)[column.key];
    
    return value || '-';
  };

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-red-600">Erro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          {actions?.refresh && (
            <Button 
              onClick={actions.refresh.onClick}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {actions?.refresh && (
              <Button
                onClick={actions.refresh.onClick}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={cn(
                  'h-4 w-4',
                  loading && 'animate-spin'
                )} />
              </Button>
            )}
            {actions?.create && (
              Array.isArray(actions.create) ? (
                actions.create.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.onClick}
                    variant={action.variant || 'default'}
                    size="sm"
                    disabled={loading}
                    className={action.className}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))
              ) : (
                <Button
                  onClick={actions.create.onClick}
                  size="sm"
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {actions.create.label}
                </Button>
              )
            )}
          </div>
        </div>
        
        {/* Filtros e Pesquisa */}
        {(onSearchChange || filters.length > 0) && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            {onSearchChange && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            )}
            
            {filters.map((filter) => (
              <Select
                key={filter.key}
                value={filter.value || 'all'}
                onValueChange={filter.onChange}
                disabled={loading}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead 
                      key={String(column.key)}
                      className={cn(
                        column.className,
                        column.sortable && 'cursor-pointer hover:bg-gray-50'
                      )}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    {columns.map((column) => (
                      <TableCell 
                        key={`${item.id}-${String(column.key)}`}
                        className={column.className}
                      >
                        {renderCellValue(column, item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Informações de paginação/total */}
        {data.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>
              Mostrando {data.length} {data.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de ações para células da tabela
interface TableActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function TableActions({ children, className }: TableActionsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

// Hook para gerenciar estado da tabela
export function useDataTable<T>(initialData: T[] = []) {
  const [data, setData] = React.useState<T[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchValue, setSearchValue] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string>>({});

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  return {
    data,
    setData,
    loading,
    setLoading,
    error,
    setError,
    searchValue,
    setSearchValue,
    filters,
    updateFilter,
    clearFilters
  };
}