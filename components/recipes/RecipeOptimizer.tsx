'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IngredientResult {
  name: string;
  quantity: number;
  cost: number;
}

interface OptimizeResponse {
  ingredients: IngredientResult[];
  totalCost: number;
  costPercentage: number;
  overBudget?: boolean;
}

export function RecipeOptimizer() {
  const [salesPrice, setSalesPrice] = useState(10);
  const [foodCost, setFoodCost] = useState(30);
  const [ingredientsText, setIngredientsText] = useState(
    '[{"name":"Chicken Breast","weight":0.5},{"name":"Cheese","weight":0.3},{"name":"Lettuce","weight":0.2}]'
  );
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ingredients = JSON.parse(ingredientsText);
      setLoading(true);
      const res = await fetch('/api/optimize-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesPrice: Number(salesPrice),
          targetFoodCostPct: Number(foodCost),
          ingredients,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert('Failed to optimize recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recipe Optimizer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="salePrice">Sales Price ($)</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              value={salesPrice}
              onChange={(e) => setSalesPrice(parseFloat(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="foodCost">Target Food Cost %</Label>
            <Input
              id="foodCost"
              type="number"
              step="0.1"
              value={foodCost}
              onChange={(e) => setFoodCost(parseFloat(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ingredients">Ingredients JSON</Label>
            <Textarea
              id="ingredients"
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Provide an array of ingredients with optional weight or lockedQty.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Calculating...' : 'Optimize'}
          </Button>
        </form>
        {result && (
          <div className="mt-6 space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Ounces</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.ingredients.map((ing) => (
                  <TableRow key={ing.name}>
                    <TableCell>{ing.name}</TableCell>
                    <TableCell className="text-right">{ing.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${ing.cost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-sm">
              Total Cost: ${result.totalCost.toFixed(2)} ({result.costPercentage.toFixed(1)}% of price)
            </div>
            {result.overBudget && (
              <div className="text-sm text-red-500">Warning: current recipe exceeds budget</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
