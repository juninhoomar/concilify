import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OperationalMetric } from "@/types";

interface OperationalMetricsProps {
  title?: string;
  description?: string;
  metrics: OperationalMetric[];
  className?: string;
}

export function OperationalMetrics({ 
  title = "Eficácia Operacional",
  description = "Status das operações em andamento",
  metrics,
  className = ""
}: OperationalMetricsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${metric.color}`} />
                <span className="text-sm font-medium">{metric.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook para gerenciar métricas operacionais
export function useOperationalMetrics() {
  // Mock data - será substituído pela integração com Supabase
  const metrics: OperationalMetric[] = [
    { label: "Aguardando Cancelamento", value: 12, color: "bg-yellow-500" },
    { label: "Aguardando Devolução", value: 8, color: "bg-orange-500" },
    { label: "Problemas", value: 3, color: "bg-red-500" },
    { label: "Aguardando Reembolso", value: 5, color: "bg-blue-500" },
    { label: "Teste", value: 2, color: "bg-purple-500" },
    { label: "Devolvido Estoque Usado", value: 15, color: "bg-green-500" },
    { label: "Manutenção", value: 7, color: "bg-gray-500" },
    { label: "Devoluções Concluídas", value: 23, color: "bg-emerald-500" },
  ];

  return {
    metrics
  };
}