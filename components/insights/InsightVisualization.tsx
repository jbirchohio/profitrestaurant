'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface InsightVisualizationProps {
  data: {
    date: string;
    amount: number;
    category: string;
  }[];
  insights: string[];
  title: string;
}

export function InsightVisualization({ data, insights, title }: InsightVisualizationProps) {
  // Process data for visualization
  const categoryTotals = data.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = 0;
    }
    acc[item.category] += item.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryTotals).map(([category, amount]) => ({
    name: category,
    value: amount,
  }));

  // Sort by value descending and take top 5
  const topCategories = [...chartData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline" className="ml-2">
            AI Insights
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCategories}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Amount']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              <Bar 
                dataKey="value" 
                fill="#8884d8"
                name="Amount"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium">Key Insights</h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Top Categories</h4>
            <div className="space-y-2">
              {topCategories.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="font-medium">${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
