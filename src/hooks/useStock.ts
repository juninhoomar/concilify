import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface StockProduct {
  id: number;
  nome: string;
  codigo: string;
  preco_custo: number;
  saldo_virtual_total: number;
  saldo_fisico: number;
  tipo: string;
  situacao: string;
  formato: string;
  categoria: string;
}

interface StockCategory {
  id: string;
  nome: string;
  total_produtos: number;
  valor_total: number;
  quantidade_total: number;
}

interface StockFilters {
  tipo?: string;
  situacao?: string;
  formato?: string;
  categoria?: string;
}

export function useStock() {
  const [stockData, setStockData] = useState<StockCategory[]>([]);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StockFilters>({ formato: 'S' });
  const [availableFilters, setAvailableFilters] = useState({
    tipos: [] as string[],
    situacoes: [] as string[],
    formatos: [] as string[]
  });
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({});

  // Categorias conhecidas com seus IDs
  const categorias = [
    { id: '8680318', descricao: 'Geral' },
    { id: '9164372', descricao: 'Importados' },
    { id: '9860107', descricao: 'Embalagem' },
    { id: '10800334', descricao: 'Geral Kit' },
    { id: '10804361', descricao: 'Importados Kit' },
    { id: '10926683', descricao: 'Usado' },
    { id: '11444263', descricao: 'Acessórios Geral' },
    { id: '11459003', descricao: 'Usado Kit' },
    { id: '11640303', descricao: 'Acessórios iPhone' }
  ];

  // Buscar dados dos produtos usando a view otimizada
  const fetchStockData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('stock_summary')
        .select('*');

      // Aplicar filtros
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.situacao) {
        query = query.eq('situacao', filters.situacao);
      }
      if (filters.formato) {
        query = query.eq('formato', filters.formato);
      }
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Processar dados por categoria agregando por categoria
      const categoryData: Record<string, StockCategory> = {};

      data?.forEach((row) => {
        const categoriaId = row.categoria;
        const categoriaInfo = categorias.find(cat => cat.id === categoriaId);
        const categoriaNome = categoriaInfo?.descricao || 'Categoria não encontrada';
        
        if (!categoryData[categoriaId]) {
          categoryData[categoriaId] = {
            id: categoriaId,
            nome: categoriaNome,
            total_produtos: 0,
            valor_total: 0,
            quantidade_total: 0
          };
        }

        categoryData[categoriaId].total_produtos += row.total_produtos || 0;
        categoryData[categoriaId].quantidade_total += row.quantidade_total || 0;
        categoryData[categoriaId].valor_total += row.valor_total || 0;
      });

      setStockData(Object.values(categoryData));
      
      // Inicializar activeCategories se estiver vazio
      if (Object.keys(activeCategories).length === 0) {
        const initialActiveCategories: Record<string, boolean> = {};
        Object.values(categoryData).forEach(cat => {
          initialActiveCategories[cat.id] = true;
        });
        setActiveCategories(initialActiveCategories);
      }

      // Limpar produtos já que não precisamos mais carregar todos
      setProducts([]);
    } catch (err) {
      console.error('Erro ao buscar dados de estoque:', err);
      setError('Erro ao carregar dados de estoque');
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar opções de filtros disponíveis usando a view otimizada
  const fetchFilterOptions = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('stock_summary')
        .select('tipo, situacao, formato')
        .not('tipo', 'is', null)
        .not('situacao', 'is', null)
        .not('formato', 'is', null);

      if (fetchError) {
        throw fetchError;
      }

      const tipos = [...new Set(data?.map(p => p.tipo).filter(Boolean))] as string[];
      const situacoes = [...new Set(data?.map(p => p.situacao).filter(Boolean))] as string[];
      const formatos = [...new Set(data?.map(p => p.formato).filter(Boolean))] as string[];

      setAvailableFilters({
        tipos: tipos.sort(),
        situacoes: situacoes.sort(),
        formatos: formatos.sort()
      });
    } catch (err) {
      console.error('Erro ao buscar opções de filtros:', err);
    }
  };

  // Atualizar filtros
  const updateFilters = (newFilters: Partial<StockFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({});
  };

  // Função para alternar o estado de ativação de uma categoria
  const toggleCategoryActive = (categoryId: string, isActive: boolean) => {
    setActiveCategories(prev => ({
      ...prev,
      [categoryId]: isActive
    }));
  };

  // Calcular totais gerais, considerando apenas categorias ativas
  const totalGeral = {
    produtos: stockData.reduce((sum, cat) => activeCategories[cat.id] ? sum + cat.total_produtos : sum, 0),
    quantidade: stockData.reduce((sum, cat) => activeCategories[cat.id] ? sum + cat.quantidade_total : sum, 0),
    valor: stockData.reduce((sum, cat) => activeCategories[cat.id] ? sum + cat.valor_total : sum, 0)
  };

  useEffect(() => {
    fetchStockData();
  }, [filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  return {
    stockData,
    products,
    isLoading,
    error,
    filters,
    availableFilters,
    categorias,
    totalGeral,
    updateFilters,
    clearFilters,
    refetch: fetchStockData,
    activeCategories,
    toggleCategoryActive
  };
}