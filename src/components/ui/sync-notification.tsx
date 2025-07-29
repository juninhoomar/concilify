import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, RefreshCw, Package, Edit, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncResult {
  success: boolean;
  totalNew: number;
  totalUpdated: number;
  totalUnchanged: number;
  totalProcessed: number;
  error?: string;
}

interface SyncNotificationProps {
  result: SyncResult;
  className?: string;
  onClose?: () => void;
}

const SyncNotification: React.FC<SyncNotificationProps> = ({ 
  result, 
  className,
  onClose 
}) => {
  console.log('🔍 [DEBUG] SyncNotification recebeu resultado:', result);
  const getVariant = () => {
    if (!result.success) return 'destructive';
    if (result.totalNew > 0 || result.totalUpdated > 0) return 'default';
    return 'default';
  };

  const getIcon = () => {
    if (!result.success) return <XCircle className="h-4 w-4" />;
    if (result.totalNew > 0 || result.totalUpdated > 0) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <RefreshCw className="h-4 w-4 text-blue-600" />;
  };

  const getTitle = () => {
    if (!result.success) return 'Erro na Sincronização';
    if (result.totalNew === 0 && result.totalUpdated === 0) return 'Sincronização Concluída';
    return 'Sincronização Bem-sucedida';
  };

  const getDescription = () => {
    console.log('🔍 [DEBUG] Gerando descrição para resultado:', {
      success: result.success,
      totalNew: result.totalNew,
      totalUpdated: result.totalUpdated,
      totalUnchanged: result.totalUnchanged,
      totalProcessed: result.totalProcessed,
      error: result.error
    });
    
    if (!result.success) {
      return result.error || 'Ocorreu um erro durante a sincronização dos pedidos.';
    }

    if (result.totalNew === 0 && result.totalUpdated === 0 && result.totalUnchanged === 0) {
      return 'Nenhum pedido foi encontrado para sincronizar.';
    }

    if (result.totalNew === 0 && result.totalUpdated === 0) {
      return `${result.totalUnchanged} pedidos verificados - todos já estão atualizados.`;
    }

    // Criar descrição detalhada baseada nos números
    const parts = [];
    if (result.totalNew > 0) {
      parts.push(`${result.totalNew} novo${result.totalNew > 1 ? 's' : ''}`);
    }
    if (result.totalUpdated > 0) {
      parts.push(`${result.totalUpdated} atualizado${result.totalUpdated > 1 ? 's' : ''}`);
    }
    if (result.totalUnchanged > 0) {
      parts.push(`${result.totalUnchanged} inalterado${result.totalUnchanged > 1 ? 's' : ''}`);
    }

    const description = parts.length > 0 
      ? `${parts.join(', ')} de ${result.totalProcessed} pedidos processados.`
      : `${result.totalProcessed} pedidos foram processados com sucesso.`;

    console.log('🔍 [DEBUG] Descrição gerada:', description);
    return description;
  };

  return (
    <Alert 
      variant={getVariant()} 
      className={cn(
        "relative border-l-4 shadow-md",
        result.success 
          ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" 
          : "border-l-red-500",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-sm font-semibold">
            {getTitle()}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {getDescription()}
          </AlertDescription>
          
          {result.success && (result.totalNew > 0 || result.totalUpdated > 0 || result.totalUnchanged > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {result.totalNew > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                >
                  <Package className="h-3 w-3 mr-1" />
                  {result.totalNew} novos
                </Badge>
              )}
              
              {result.totalUpdated > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {result.totalUpdated} atualizados
                </Badge>
              )}
              
              {result.totalUnchanged > 0 && (
                <Badge 
                  variant="secondary" 
                  className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                >
                  <Minus className="h-3 w-3 mr-1" />
                  {result.totalUnchanged} inalterados
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar notificação"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  );
};

export default SyncNotification;
export type { SyncResult };