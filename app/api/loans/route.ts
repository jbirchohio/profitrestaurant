import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createLoanSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  balance: z.number().positive('Balance must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  paymentAmount: z.number().positive('Payment amount must be positive'),
  paymentCycle: z.string().min(1, 'Payment cycle is required'),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

/**
 * GET /api/loans
 * Fetches all loans for a specific restaurant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    const loans = await prisma.loan.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
        return NextResponse.json({ data: loans });
  } catch (error) {
    console.error('Failed to fetch loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

/**
 * POST /api/loans
 * Creates a new loan.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const newLoan = await prisma.loan.create({
      data: validation.data,
    });

    return NextResponse.json(newLoan, { status: 201 });
  } catch (error) {
    console.error('Failed to create loan:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}
