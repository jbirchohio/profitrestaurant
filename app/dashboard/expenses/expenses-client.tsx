'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Expense } from '@prisma/client';
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
import { TrendChart } from '@/components/charts/TrendChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ExpensesClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState('ONE_TIME');

  const chartData = (expenses || [])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((expense) => ({
      date: new Date(expense.createdAt).toLocaleDateString(),
      value: expense.amount,
    }));

  const restaurantId = 'clxne1o4w00007867z1f896l9';

  async function fetchExpenses() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/expenses?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
            const responseData = await response.json();
      setExpenses(responseData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
        const newExpense = {
      description: formData.get('description') as string,
      amount: parseFloat(formData.get('amount') as string),
      frequency: frequency,
      category: formData.get('category') as string,
      date: new Date().toISOString(),
      restaurantId,
    };

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add expense');
      }
      fetchExpenses();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-3">
        <TrendChart data={chartData} title="Expenses Over Time" />
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.frequency}</TableCell>
                      <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="description">Description</Label><Input id="description" name="description" required /></div>
              <div><Label htmlFor="amount">Amount</Label><Input id="amount" name="amount" type="number" step="0.01" required /></div>
                            <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" required />
              </div>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-Time</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Add Expense</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
