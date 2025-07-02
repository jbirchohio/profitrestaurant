'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, AlertTriangle, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ImportDialog } from '@/components/import/ImportDialog';
import { InsightVisualization } from '@/components/insights/InsightVisualization';

// Mock data for visualization - replace with actual data from your API
const mockVisualizationData = [
  { date: '2023-01-01', amount: 1200, category: 'Food Supplies' },
  { date: '2023-01-02', amount: 1500, category: 'Beverages' },
  { date: '2023-01-03', amount: 800, category: 'Cleaning Supplies' },
  { date: '2023-01-04', amount: 2000, category: 'Food Supplies' },
  { date: '2023-01-05', amount: 1000, category: 'Beverages' },
];

const mockInsights = [
  'Food Supplies account for 60% of total expenses',
  'Beverage costs increased by 15% compared to last month',
  'Consider bulk purchasing for Cleaning Supplies to save 10-15%',
];

interface DashboardData {
  metrics: {
    revenue: number;
    netProfit: number;
    cogs: number;
    laborCost: number;
    revenueChange: number;
  };
  insights: string[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <p className="text-lg text-muted-foreground">
          {error || 'No data available'}
        </p>
      </div>
    );
  }

  const { metrics, insights } = data;
  const isRevenueIncrease = metrics.revenueChange >= 0;

  // In a real app, you'd get this from your auth context or API
  const restaurantId = '1';

  const handleImportComplete = () => {
    // Refresh dashboard data after import
    window.location.reload();
  };

  // Format currency with proper sign and color
  const formatChange = (value: number) => {
    const isPositive = value >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="h-4 w-4 mr-1" />
        {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
        <ImportDialog 
          restaurantId={restaurantId} 
          onImportComplete={handleImportComplete} 
        />
      </div>
      
      {/* AI-Powered Insights Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <span>💡</span> AI-Powered Insights
        </h2>
        <InsightVisualization 
          data={mockVisualizationData}
          insights={mockInsights}
          title="Expense Analysis"
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</p>
              <span className="text-sm font-medium">
                {formatChange(metrics.revenueChange)}
              </span>
            </div>
            <p className={`text-xs ${isRevenueIncrease ? 'text-green-500' : 'text-red-500'}`}>
              {isRevenueIncrease ? '+' : ''}{metrics.revenueChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.netProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.netProfit / (metrics.revenue || 1)) * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost of Goods Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics.cogs)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.revenue * (metrics.cogs / 100))} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics.laborCost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics.revenue * (metrics.laborCost / 100))} total
            </p>
          </CardContent>
        </Card>
      </div>
      
      {insights && insights.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <li key={index} className="text-muted-foreground flex items-start">
                    <span className="mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
