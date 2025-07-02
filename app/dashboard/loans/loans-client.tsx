'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Loan } from '@prisma/client';
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

export function LoansClient() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restaurantId = 'clxne1o4w00007867z1f896l9';

  async function fetchLoans() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/loans?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch loans');
      const data = await response.json();
      setLoans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLoans();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newLoan = {
      description: formData.get('description') as string,
      balance: parseFloat(formData.get('balance') as string),
      interestRate: parseFloat(formData.get('interestRate') as string),
      paymentAmount: parseFloat(formData.get('paymentAmount') as string),
      paymentCycle: formData.get('paymentCycle') as string,
      restaurantId,
    };

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoan),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add loan');
      }
      fetchLoans();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Loans</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p>Loading...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Interest Rate</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.description}</TableCell>
                      <TableCell className="text-right">${loan.balance.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{loan.interestRate}%</TableCell>
                      <TableCell className="text-right">${loan.paymentAmount.toFixed(2)} / {loan.paymentCycle}</TableCell>
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
            <CardTitle>Add New Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="description">Description</Label><Input id="description" name="description" required /></div>
              <div><Label htmlFor="balance">Balance</Label><Input id="balance" name="balance" type="number" step="0.01" required /></div>
              <div><Label htmlFor="interestRate">Interest Rate (%)</Label><Input id="interestRate" name="interestRate" type="number" step="0.01" required /></div>
              <div><Label htmlFor="paymentAmount">Payment Amount</Label><Input id="paymentAmount" name="paymentAmount" type="number" step="0.01" required /></div>
              <div><Label htmlFor="paymentCycle">Payment Cycle</Label><Input id="paymentCycle" name="paymentCycle" placeholder="e.g., monthly" required /></div>
              <Button type="submit" className="w-full">Add Loan</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
