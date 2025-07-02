import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createLaborEntrySchema = z.object({
  date: z.string().datetime(),
  totalWages: z.number().positive('Total wages must be positive'),
  totalHours: z.number().positive('Total hours must be positive'),
  employees: z.number().int().positive('Number of employees must be a positive integer'),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

/**
 * GET /api/labor
 * Fetches all labor entries for a specific restaurant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    const laborEntries = await prisma.laborEntry.findMany({
      where: { restaurantId },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(laborEntries);
  } catch (error) {
    console.error('Failed to fetch labor entries:', error);
    return NextResponse.json({ error: 'Failed to fetch labor entries' }, { status: 500 });
  }
}

/**
 * POST /api/labor
 * Creates a new labor entry.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createLaborEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, ...data } = validation.data;

    const newLaborEntry = await prisma.laborEntry.create({
      data: {
        ...data,
        date: new Date(date),
      },
    });

    return NextResponse.json(newLaborEntry, { status: 201 });
  } catch (error) {
    console.error('Failed to create labor entry:', error);
    return NextResponse.json({ error: 'Failed to create labor entry' }, { status: 500 });
  }
}
