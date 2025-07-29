import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  USER_STATUS_CONFIG, 
  STORE_STATUS_CONFIG, 
  ORDER_STATUS_CONFIG 
} from '@/lib/constants';
import type { UserStatus, StoreStatus, OrderStatus } from '@/types';

// Componente reutilizável para badges de status
// Seguindo os princípios DRY e Single Responsibility

interface StatusBadgeProps {
  status: UserStatus | StoreStatus | OrderStatus;
  type: 'user' | 'store' | 'order';
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (type) {
      case 'user':
        return USER_STATUS_CONFIG[status as UserStatus];
      case 'store':
        return STORE_STATUS_CONFIG[status as StoreStatus];
      case 'order':
        return ORDER_STATUS_CONFIG[status as OrderStatus];
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      className={cn(
        config.color,
        'font-medium',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

// Componentes específicos para cada tipo (opcional, para melhor DX)
export function UserStatusBadge({ 
  status, 
  className 
}: { 
  status: UserStatus; 
  className?: string; 
}) {
  return <StatusBadge status={status} type="user" className={className} />;
}

export function StoreStatusBadge({ 
  status, 
  className 
}: { 
  status: StoreStatus; 
  className?: string; 
}) {
  return <StatusBadge status={status} type="store" className={className} />;
}

export function OrderStatusBadge({ 
  status, 
  className 
}: { 
  status: OrderStatus; 
  className?: string; 
}) {
  return <StatusBadge status={status} type="order" className={className} />;
}