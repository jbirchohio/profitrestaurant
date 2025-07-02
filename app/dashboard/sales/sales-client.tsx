'use client';

import { useState, useEffect, FormEvent } from 'react';
import { SaleEntry } from '@prisma/client';
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

export function SalesClient() {
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartData = entries
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString(),
      value: entry.netSales,
    }));

  // Dummy restaurantId
  const restaurantId = 'clxne1o4w00007867z1f896l9';

  async function fetchSales() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sales?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSales();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
        const dateValue = formData.get('date') as string;
    // The browser returns date as 'YYYY-MM-DD'. We need to parse it correctly, considering timezones.
    // Creating a new Date from this string will interpret it as UTC, so we add the timezone offset to keep it as the user's local date.
    const localDate = new Date(dateValue);
    const userTimezoneOffset = localDate.getTimezoneOffset() * 60000;
    const correctedDate = new Date(localDate.getTime() + userTimezoneOffset);

    const newEntry = {
      date: correctedDate.toISOString(),
      grossSales: parseFloat(formData.get('grossSales') as string),
      discounts: parseFloat(formData.get('discounts') as string),
      refunds: parseFloat(formData.get('refunds') as string),
      deliveryFees: parseFloat(formData.get('deliveryFees') as string),
      tips: parseFloat(formData.get('tips') as string),
      restaurantId,
    };

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add entry');
      }
      fetchSales();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-3">
        <TrendChart data={chartData} title="Net Sales Over Time" />
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Gross Sales</TableHead>
                    <TableHead className="text-right">Net Sales</TableHead>
                    <TableHead className="text-right">Discounts</TableHead>
                    <TableHead className="text-right">Refunds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${entry.grossSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${entry.netSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${entry.discounts.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${entry.refunds.toFixed(2)}</TableCell>
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
            <CardTitle>Add Sales Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required /></div>
              <div><Label htmlFor="grossSales">Gross Sales</Label><Input id="grossSales" name="grossSales" type="number" step="0.01" required /></div>
              <div><Label htmlFor="discounts">Discounts</Label><Input id="discounts" name="discounts" type="number" step="0.01" required /></div>
              <div><Label htmlFor="refunds">Refunds</Label><Input id="refunds" name="refunds" type="number" step="0.01" required /></div>
              <div><Label htmlFor="deliveryFees">Delivery Fees</Label><Input id="deliveryFees" name="deliveryFees" type="number" step="0.01" required /></div>
              <div><Label htmlFor="tips">Tips</Label><Input id="tips" name="tips" type="number" step="0.01" required /></div>
              <Button type="submit" className="w-full">Add Entry</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
