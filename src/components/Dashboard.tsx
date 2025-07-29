import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Filter } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useDashboard } from "@/hooks/useDashboard";
import { DASHBOARD_PERIODS, DASHBOARD_CATEGORIES } from "@/lib/constants";
import type { DashboardData, PerformanceMetric } from "@/types";

import { OperationalMetrics, useOperationalMetrics } from "@/components/ui/operational-metrics";
import { StockCard } from "@/components/StockCard";
import { DASHBOARD_PERIOD_LABELS, DASHBOARD_CATEGORY_LABELS } from "@/lib/constants";

export function Dashboard() {
  const {
    selectedPeriod,
    activeCategory,
    isLoading,
    error,
    tableData,
    tableColumns,
    updatePeriod,
    updateCategory,
    exportData,
    periods,
    categories
  } = useDashboard();
  
  const { metrics } = useOperationalMetrics();
  
  // Estado para filtro de data
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = async (format: 'csv' | 'excel') => {
    await exportData(format);
  };
  
  const handleDateFilter = () => {
    // Lógica para aplicar filtro de data (será implementada quando conectar com banco)
    console.log('Filtro de data:', { dateFrom, dateTo });
  };

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="text-center text-destructive">
          <p>Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Performance</h2>
            <p className="text-muted-foreground">
              Análise detalhada de performance por categoria e período
            </p>
          </div>
        </div>
        
        {/* Filtros */}
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Filtros</CardTitle>
             <CardDescription>
               Selecione o período e datas para análise
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {/* Filtro de Período */}
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                   <CalendarDays className="h-4 w-4" />
                   <Label>Período:</Label>
                 </div>
                 <Select value={selectedPeriod} onValueChange={updatePeriod}>
                   <SelectTrigger className="w-32">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {periods.map((period) => (
                       <SelectItem key={period} value={period}>
                         {DASHBOARD_PERIOD_LABELS[period as keyof typeof DASHBOARD_PERIOD_LABELS]}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               
               {/* Filtro de Data */}
               <div className="flex items-end gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="date-from">Data de Início</Label>
                   <Input
                     id="date-from"
                     type="date"
                     value={dateFrom}
                     onChange={(e) => setDateFrom(e.target.value)}
                     className="w-40"
                   />
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="date-to">Data de Fim</Label>
                   <Input
                     id="date-to"
                     type="date"
                     value={dateTo}
                     onChange={(e) => setDateTo(e.target.value)}
                     className="w-40"
                   />
                 </div>
                 <Button onClick={handleDateFilter} className="mb-0">
                   Aplicar Filtro
                 </Button>
                 <Button 
                   variant="outline" 
                   onClick={() => {
                     setDateFrom('');
                     setDateTo('');
                   }}
                   className="mb-0"
                 >
                   Limpar
                 </Button>
               </div>
             </div>
           </CardContent>
         </Card>
      </div>

      {/* Performance Data Tabs */}
      <Tabs value={activeCategory} onValueChange={updateCategory} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          {categories
            .filter((category) => category !== 'estoque')
            .map((category) => (
              <TabsTrigger key={category} value={category}>
                {DASHBOARD_CATEGORY_LABELS[category as keyof typeof DASHBOARD_CATEGORY_LABELS]}
              </TabsTrigger>
            ))}
        </TabsList>

        {categories
          .filter((category) => category !== 'estoque')
          .map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {DASHBOARD_CATEGORY_LABELS[category as keyof typeof DASHBOARD_CATEGORY_LABELS]}
                </CardTitle>
                <CardDescription>Dados por período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  title="Dados de Performance"
                  data={tableData}
                  columns={tableColumns}
                  loading={isLoading}
                  searchPlaceholder="Buscar categoria..."
                  emptyMessage="Nenhum dado encontrado"
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Stock Card */}
      <StockCard className="mb-6" />

      {/* Operational Metrics */}
      <OperationalMetrics metrics={metrics} />
    </div>
  );
}