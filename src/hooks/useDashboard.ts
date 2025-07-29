import { useState, useEffect, useMemo } from 'react';
import type { DashboardData, PerformanceMetric } from '@/types';
import { DASHBOARD_PERIODS, DASHBOARD_CATEGORIES } from '@/lib/constants';

// Mock data - será substituído pela integração com Supabase
const mockPerformanceData: DashboardData = {
  faturamento: [
    { name: "Importados", values: ["4.070,69", "9.188,03", "13.113,84", "13.852,24", "23.935,19", "24.785,43", "29.155,48", "393,60"] },
    { name: "Geral", values: ["816.585,55", "1.372.728,34", "865.342,91", "759.895,76", "528.191,86", "794.294,10", "1.390.531,55", "4.245,01"] },
    { name: "Usado", values: ["99.819,00", "51.894,66", "77.564,75", "78.884,81", "32.720,58", "46.406,98", "24.231,43", "2.426,00"] },
    { name: "Usado Kit", values: ["-", "4.964,31", "5.364,24", "18.836,06", "14.290,20", "2.681,62", "-", "-"] },
    { name: "Geral Kit", values: ["1.327.389,12", "1.357.326,15", "1.104.834,03", "1.047.647,11", "792.798,40", "614.471,79", "172.455,77", "829,00"] },
    { name: "Importados Kit", values: ["74.086,31", "128.754,86", "147.992,98", "123.061,91", "99.530,34", "69.081,45", "120.550,20", "3.084,92"] },
    { name: "Embalagem", values: ["-", "729,00", "729,00", "210,00", "115,40", "3.854,99", "-", "-"] },
    { name: "Acessórios Geral", values: ["-", "3.306,90", "117,37", "-", "156,06", "704,95", "-", "-"] },
    { name: "Acessórios Iphone", values: ["-", "154,03", "530,01", "617,13", "288,11", "272,32", "18,00", "-"] },
  ],
  rentabilidade: [
    { name: "Importados", values: ["784,98", "1.480,67", "1.253,30", "2.353,85", "1.805,42", "2.345,47", "4.111,06", "82,40"] },
    { name: "Geral", values: ["124.911,85", "195.671,80", "129.137,96", "112.429,84", "74.060,48", "117.561,37", "210.747,94", "400,03"] },
    { name: "Usado", values: ["7.053,15", "1.809,72", "3.599,15", "-1.293,29", "823,04", "460,50", "1.809,38", "236,00"] },
    { name: "Usado Kit", values: ["-", "406,55", "-1.546,52", "1.511,46", "1.196,70", "225,25", "-", "-"] },
    { name: "Geral Kit", values: ["200.173,61", "193.601,15", "155.648,42", "149.005,21", "101.108,36", "79.252,21", "25.212,02", "60,50"] },
    { name: "Importados Kit", values: ["14.138,41", "22.638,59", "27.509,62", "22.388,79", "18.371,72", "12.602,05", "22.381,67", "640,41"] },
    { name: "Embalagem", values: ["-", "-", "21,65", "10,62", "-", "23.373,76", "-", "-"] },
    { name: "Acessórios Geral", values: ["-", "2.805,40", "53,92", "-", "27,20", "12.800,55", "63,00", "-"] },
    { name: "Acessórios Iphone", values: ["-", "2,18", "15,67", "6,36", "10,20", "10,60", "8,00", "-"] },
  ],
  estoque: [
    { name: "Importados", values: ["2.186,90", "5.061,10", "7.771,20", "12.318,60", "15.911,50", "16.093,50", "17.384,10", "214,80"] },
    { name: "Geral", values: ["45.230,15", "52.847,32", "48.592,18", "51.203,44", "49.871,23", "53.294,87", "55.847,91", "58.293,45"] },
    { name: "Embalagem", values: ["1.250,00", "1.320,00", "1.180,00", "1.450,00", "1.380,00", "1.520,00", "1.290,00", "1.340,00"] },
    { name: "Acessórios Geral", values: ["850,30", "920,45", "780,20", "1.050,80", "890,15", "1.120,90", "950,75", "1.080,60"] },
    { name: "Usado", values: ["3.450,80", "2.890,25", "4.120,90", "3.780,45", "4.320,60", "3.950,30", "4.580,75", "4.230,15"] },
    { name: "Acessórios Iphone", values: ["520,40", "480,90", "650,30", "590,80", "710,20", "630,45", "580,90", "620,75"] },
  ]
};

const mockOperationalData = [
  { label: "Aguardando Cancelamento", value: 12, color: "bg-yellow-500" },
  { label: "Aguardando Devolução", value: 8, color: "bg-orange-500" },
  { label: "Problemas", value: 3, color: "bg-red-500" },
  { label: "Aguardando Reembolso", value: 5, color: "bg-blue-500" },
  { label: "Teste", value: 2, color: "bg-purple-500" },
  { label: "Devolvido Estoque Usado", value: 15, color: "bg-green-500" },
  { label: "Manutenção", value: 7, color: "bg-gray-500" },
  { label: "Devoluções Concluídas", value: 23, color: "bg-emerald-500" },
];

// Função para gerar colunas de data baseadas no período selecionado
const generateDateColumns = (period: string) => {
  const today = new Date();
  const columns = [];
  
  if (period === DASHBOARD_PERIODS.WEEK) {
    // Para semana: mostrar intervalos de domingo a sábado
    for (let i = 7; i >= 0; i--) {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - (i * 7));
      
      // Encontrar o domingo da semana
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - endDate.getDay());
      
      // Encontrar o sábado da semana
      const saturdayDate = new Date(startDate);
      saturdayDate.setDate(startDate.getDate() + 6);
      
      const startFormatted = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const endFormatted = saturdayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      columns.push(`${startFormatted} - ${endFormatted}`);
    }
  } else if (period === DASHBOARD_PERIODS.MONTH) {
    // Para mês: mostrar nome do mês
    for (let i = 7; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);
      
      const monthFormatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      columns.push(monthFormatted.charAt(0).toUpperCase() + monthFormatted.slice(1));
    }
  } else if (period === DASHBOARD_PERIODS.DAY) {
    // Para dia: mostrar apenas dia/mês (ex: 10/10, 11/10, 12/10)
    for (let i = 7; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayFormatted = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
      columns.push(dayFormatted);
    }
  } else {
    // Fallback: mostrar semanas
    for (let i = 7; i >= 0; i--) {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() - (i * 7));
      
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - endDate.getDay());
      
      const saturdayDate = new Date(startDate);
      saturdayDate.setDate(startDate.getDate() + 6);
      
      const startFormatted = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const endFormatted = saturdayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      columns.push(`${startFormatted} - ${endFormatted}`);
    }
  }
  
  return columns;
};

export function useDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState(DASHBOARD_PERIODS.WEEK);
  const [activeCategory, setActiveCategory] = useState(DASHBOARD_CATEGORIES.REVENUE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simula carregamento de dados
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedPeriod, activeCategory]);

  // Gerar colunas de data baseadas no período selecionado
  const dateColumns = useMemo(() => generateDateColumns(selectedPeriod), [selectedPeriod]);

  // Dados formatados para a tabela
  const tableData = useMemo(() => {
    const categoryData = mockPerformanceData[activeCategory as keyof DashboardData] || [];
    return categoryData.map((item, index) => ({
      id: index.toString(),
      name: item.name,
      ...dateColumns.reduce((acc, date, dateIndex) => {
        acc[date] = item.values[dateIndex] || '-';
        return acc;
      }, {} as Record<string, string>)
    }));
  }, [activeCategory, dateColumns]);

  // Colunas da tabela
  const tableColumns = useMemo(() => [
    {
      key: 'name',
      label: 'Categoria',
      sortable: true,
      className: 'w-40 font-medium'
    },
    ...dateColumns.map((date, index) => ({
      key: date,
      label: date,
      sortable: false,
      className: `text-right min-w-24 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-gray-50 dark:bg-gray-950/20'}`,
    }))
  ], [dateColumns]);

  // Funções para atualizar filtros
  const updatePeriod = (period: string) => {
    setSelectedPeriod(period);
  };

  const updateCategory = (category: string) => {
    setActiveCategory(category);
  };

  // Função para exportar dados
  const exportData = async (format: 'csv' | 'excel') => {
    try {
      setIsLoading(true);
      // Implementar lógica de exportação
      console.log(`Exportando dados em formato ${format}`);
      // Simula delay de exportação
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      setError('Erro ao exportar dados');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // Estado
    selectedPeriod,
    activeCategory,
    isLoading,
    error,
    
    // Dados
    tableData,
    tableColumns,
    operationalData: mockOperationalData,
    dateColumns,
    
    // Ações
    updatePeriod,
    updateCategory,
    exportData,
    
    // Constantes
    periods: Object.values(DASHBOARD_PERIODS),
    categories: Object.values(DASHBOARD_CATEGORIES)
  };
}