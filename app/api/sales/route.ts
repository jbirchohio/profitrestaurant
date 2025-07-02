import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateNetSales } from '@/utils/calculations';

const createSaleEntrySchema = z.object({
  date: z.string().datetime(),
  grossSales: z.number().positive('Gross sales must be positive'),
  discounts: z.number().min(0, 'Discounts cannot be negative'),
  refunds: z.number().min(0, 'Refunds cannot be negative'),
  deliveryFees: z.number().min(0, 'Delivery fees cannot be negative'),
  tips: z.number().min(0, 'Tips cannot be negative'),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

/**
 * GET /api/sales
 * Fetches all sales entries for a specific restaurant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    const salesEntries = await prisma.saleEntry.findMany({
      where: { restaurantId },
      orderBy: { date: 'desc' },
    });
        return NextResponse.json({ data: salesEntries });
  } catch (error) {
    console.error('Failed to fetch sales entries:', error);
    return NextResponse.json({ error: 'Failed to fetch sales entries' }, { status: 500 });
  }
}

/**
 * POST /api/sales
 * Creates a new sales entry and calculates the net sales.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, date, ...saleData } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    // Calculate net sales before saving
    const netSales = calculateNetSales(saleData);

    const newSaleEntry = await prisma.saleEntry.create({
      data: {
        ...saleData,
        date: new Date(date), // Ensure date is a Date object
        netSales,
        restaurant: {
          connect: { id: restaurantId },
        },
      },
    });
    return NextResponse.json(newSaleEntry, { status: 201 });
  } catch (error) {
    console.error('Failed to create sale entry:', error);
    return NextResponse.json({ error: 'Failed to create sale entry' }, { status: 500 });
  }
}
