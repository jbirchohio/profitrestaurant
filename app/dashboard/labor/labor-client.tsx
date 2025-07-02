'use client';

import { useState, useEffect, FormEvent } from 'react';
import { LaborEntry } from '@prisma/client';
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

export function LaborClient() {
  const [entries, setEntries] = useState<LaborEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartData = (entries || [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString(),
      value: entry.totalWages,
    }));

  // Dummy restaurantId
  const restaurantId = 'clxne1o4w00007867z1f896l9';

  async function fetchLabor() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/labor?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch labor data');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLabor();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    
    try {
      const formData = new FormData(event.currentTarget);
      const dateInput = formData.get('date') as string;
      
      // Validate date input
      if (!dateInput) {
        throw new Error('Date is required');
      }
      
      // Create a date string in local timezone but ensure it's in ISO format
      const localDate = new Date(dateInput);
      if (isNaN(localDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Format date to ISO string without timezone offset
      const formattedDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString();
      
      const newEntry = {
        date: formattedDate,
        totalWages: parseFloat(formData.get('totalWages') as string),
        totalHours: parseFloat(formData.get('totalHours') as string),
        employees: parseInt(formData.get('employees') as string, 10),
        restaurantId,
      };

      console.log('Submitting labor entry:', newEntry);
      
      const response = await fetch('/api/labor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('API Error:', responseData);
        throw new Error(responseData.error || responseData.message || 'Failed to add entry');
      }
      
      // Refresh the labor entries
      await fetchLabor();
      event.currentTarget.reset();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Error in handleSubmit:', errorMessage, err);
      setError(errorMessage);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-3">
        <TrendChart data={chartData} title="Labor Cost Over Time" />
      </div>
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Labor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Wages</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${entry.totalWages.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{entry.totalHours}</TableCell>
                      <TableCell className="text-right">{entry.employees}</TableCell>
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
            <CardTitle>Add Labor Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required /></div>
              <div><Label htmlFor="totalWages">Total Wages</Label><Input id="totalWages" name="totalWages" type="number" step="0.01" required /></div>
              <div><Label htmlFor="totalHours">Total Hours</Label><Input id="totalHours" name="totalHours" type="number" step="0.01" required /></div>
              <div><Label htmlFor="employees">Number of Employees</Label><Input id="employees" name="employees" type="number" required /></div>
              <Button type="submit" className="w-full">Add Entry</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
