'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Recipe, InventoryItem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { calculateRecipeCost } from '@/utils/calculations';

// Define a type for Recipe with its relations
type RecipeWithRelations = Recipe & {
  ingredients: { 
    quantityUsed: number;
    inventoryItem: InventoryItem;
  }[];
};

export function RecipesClient() {
  const [recipes, setRecipes] = useState<RecipeWithRelations[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restaurantId = 'clxne1o4w00007867z1f896l9';

  async function fetchData() {
    setIsLoading(true);
    try {
      const [recipesRes, inventoryRes] = await Promise.all([
        fetch(`/api/recipes?restaurantId=${restaurantId}`),
        fetch(`/api/inventory?restaurantId=${restaurantId}`),
      ]);
      if (!recipesRes.ok) throw new Error('Failed to fetch recipes');
      if (!inventoryRes.ok) throw new Error('Failed to fetch inventory');
      
      const recipesData = await recipesRes.json();
      const inventoryData = await inventoryRes.json();
      
      setRecipes(recipesData);
      setInventory(inventoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // This is a simplified handler. A real implementation would need to handle adding ingredients dynamically.
    alert('Adding recipes from the UI is complex and will be implemented fully in a future step. For now, please add recipes directly via the API or database.');
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Recipe List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Calculated Cost</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Food Cost %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.map((recipe) => {
                    const cost = calculateRecipeCost(recipe.ingredients);
                    const foodCostPercentage = recipe.fixedPrice && recipe.fixedPrice > 0 ? (cost / recipe.fixedPrice) * 100 : 0;
                    return (
                      <TableRow key={recipe.id}>
                        <TableCell>{recipe.name}</TableCell>
                        <TableCell className="text-right">${cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${(recipe.fixedPrice || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{foodCostPercentage.toFixed(2)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Add New Recipe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Recipe creation requires dynamically adding ingredients. This feature will be fully built out in a subsequent step.
              </p>
              <div><Label htmlFor="name">Recipe Name</Label><Input id="name" name="name" required /></div>
              <div><Label htmlFor="fixedPrice">Sale Price</Label><Input id="fixedPrice" name="fixedPrice" type="number" step="0.01" /></div>
              {/* Ingredient selection would go here */}
              <Button type="submit" className="w-full" disabled>Add Recipe (Coming Soon)</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
