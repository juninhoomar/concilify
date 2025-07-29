import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Package, TrendingUp, Hash, DollarSign } from "lucide-react";
import { useStock } from "@/hooks/useStock";
import { FORMAT_CONFIG } from "@/lib/constants";

interface StockCardProps {
  className?: string;
}

export function StockCard({ className = "" }: StockCardProps) {
  const {
    stockData,
    isLoading,
    error,
    filters,
    availableFilters,
    totalGeral,
    updateFilters,
    clearFilters,
    activeCategories,
    toggleCategoryActive
  } = useStock();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(FORMAT_CONFIG.currency.locale, {
      style: 'currency',
      currency: FORMAT_CONFIG.currency.currency
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(FORMAT_CONFIG.number.locale).format(value);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive">
            <p>Erro ao carregar dados: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Estoque Atual
        </CardTitle>
        <CardDescription>
          Visualização do estoque atual por categoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Tipo:</label>
              <Select
                value={filters.tipo || "todos"}
                onValueChange={(value) => updateFilters({ tipo: value === "todos" ? undefined : value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableFilters.tipos.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Situação:</label>
              <Select
                value={filters.situacao || "todas"}
                onValueChange={(value) => updateFilters({ situacao: value === "todas" ? undefined : value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {availableFilters.situacoes.map((situacao) => (
                    <SelectItem key={situacao} value={situacao}>
                      {situacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Formato:</label>
              <Select
                value={filters.formato || "S"}
                onValueChange={(value) => updateFilters({ formato: value === "todos" ? undefined : value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {availableFilters.formatos.map((formato) => {
                    const formatoLabel = formato === 'E' ? 'Composto' : formato === 'S' ? 'Simples' : formato;
                    return (
                      <SelectItem key={formato} value={formato}>
                        {formatoLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="ml-auto"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Hash className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total de Produtos</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatNumber(totalGeral.produtos)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">Quantidade Total</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatNumber(totalGeral.quantidade)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalGeral.valor)}</p>
          </div>
        </div>

        {/* Dados por Categoria */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando dados de estoque...</p>
          </div>
        ) : stockData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum produto encontrado com os filtros aplicados</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold mb-4">Por Categoria</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockData.map((category) => (
                <div
                  key={category.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-sm">{category.nome}</h5>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        ID: {category.id}
                      </Badge>
                      <Switch
                        checked={activeCategories[category.id] !== false} // Default to true if not explicitly false
                        onCheckedChange={(checked) => toggleCategoryActive(category.id, checked)}
                        aria-label={`Toggle visibility for ${category.nome}`}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Produtos:</span>
                      <span className="text-sm font-medium">{formatNumber(category.total_produtos)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Quantidade:</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatNumber(category.quantidade_total)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Valor Total:</span>
                      <span className="text-sm font-medium text-purple-600">
                        {formatCurrency(category.valor_total)}
                      </span>
                    </div>
                    
                    {category.quantidade_total > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Valor Médio:</span>
                        <span className="text-sm font-medium text-blue-600">
                        {category.quantidade_total > 0 ? formatCurrency(category.valor_total / category.quantidade_total) : formatCurrency(0)}
                      </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}