import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Enhanced validation schemas
const laborEntryBaseSchema = {
  date: z.string()
    .datetime('Invalid date format')
    .refine(date => new Date(date).toString() !== 'Invalid Date', {
      message: 'Invalid date',
    }),
  totalWages: z.number()
    .min(0, 'Total wages must be positive')
    .max(1000000, 'Total wages are too high'),
  totalHours: z.number()
    .min(0, 'Total hours must be positive')
    .max(10000, 'Total hours are too high'),
  employees: z.number()
    .int('Number of employees must be an integer')
    .min(0, 'Number of employees cannot be negative')
    .max(1000, 'Number of employees is too high'),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
};

const createLaborEntrySchema = z.object(laborEntryBaseSchema);

// Query parameters schema
const getLaborQuerySchema = z.object({
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  employeeName: z.string().optional(),
  position: z.string().optional(),
  minHours: z.string().optional(),
  maxHours: z.string().optional(),
  minRate: z.string().optional(),
  maxRate: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
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
    console.log('Received labor entry request:', body);
    
    const validation = createLaborEntrySchema.safeParse(body);

    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { date, ...data } = validation.data;
    
    // Convert date string to Date object
    const entryDate = new Date(date);
    
    if (isNaN(entryDate.getTime())) {
      console.error('Invalid date format received:', date);
      return NextResponse.json({ 
        error: 'Invalid date format. Please use ISO 8601 format (e.g., 2023-01-01T00:00:00.000Z)' 
      }, { status: 400 });
    }

    console.log('Creating labor entry with data:', { ...data, date: entryDate });
    
    const newLaborEntry = await prisma.laborEntry.create({
      data: {
        ...data,
        date: entryDate,
      },
    });

    console.log('Successfully created labor entry:', newLaborEntry);
    return NextResponse.json(newLaborEntry, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create labor entry:', error);
    return NextResponse.json({ 
      error: 'Failed to create labor entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
