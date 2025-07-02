import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Enhanced validation schema
const createExpenseSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(255, 'Description cannot exceed 255 characters')
    .trim(),
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount is too large'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'], {
    errorMap: () => ({ message: 'Invalid frequency' })
  }),
  category: z.string().min(1, 'Category is required'),
  date: z.string().datetime('Invalid date format'),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

// Query parameters schema
const getExpensesQuerySchema = z.object({
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  category: z.string().optional(),
  minAmount: z.string().optional(),
  maxAmount: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

/**
 * GET /api/expenses
 * Fetches expenses with filtering and pagination.
 * Query Parameters:
 * - restaurantId: string (required)
 * - startDate?: ISO date string
 * - endDate?: ISO date string
 * - category?: string
 * - minAmount?: number
 * - maxAmount?: number
 * - frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME'
 * - limit?: number (for pagination)
 * - offset?: number (for pagination)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = getExpensesQuerySchema.safeParse(query);
    if (!validation.success) {
      console.error('Invalid query parameters:', validation.error);
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      startDate,
      endDate,
      category,
      minAmount,
      maxAmount,
      frequency,
      limit,
      offset,
    } = validation.data;

    // Build the where clause based on query parameters
    const where: any = { restaurantId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    if (category) where.category = category;
    if (frequency) where.frequency = frequency;
    
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = Number(minAmount);
      if (maxAmount) where.amount.lte = Number(maxAmount);
    }

    // Set up pagination
    const take = limit ? Math.min(Number(limit), 100) : 10; // Default to 10, max 100
    const skip = offset ? Number(offset) : 0;

    // Get total count for pagination
    const total = await prisma.expense.count({ where });
    
    // Fetch paginated results
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // Using createdAt instead of date to match schema
      take,
      skip,
    });

    // Calculate summary stats
    const stats = await prisma.expense.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      data: expenses,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + expenses.length < total,
      },
      summary: {
        totalAmount: stats._sum.amount || 0,
        averageAmount: stats._avg.amount || 0,
        count: stats._count,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch expenses',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/expenses
 * Creates a new expense with validation and error handling.
 */
export async function POST(request: Request) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      );
    }

    // Validate request data against schema
    const validation = createExpenseSchema.safeParse(body);
    if (!validation.success) {
      console.error('Validation failed:', validation.error);
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validation.error.flatten() 
        }, 
        { status: 400 }
      );
    }

    const { date, ...expenseData } = validation.data;
    
    // Convert date string to Date object
    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      console.error('Invalid date format:', date);
      return NextResponse.json(
        { error: 'Invalid date format. Please use ISO 8601 format' },
        { status: 400 }
      );
    }

    // Check if restaurant exists
    const restaurantExists = await prisma.restaurant.findUnique({
      where: { id: expenseData.restaurantId },
      select: { id: true }
    });

    if (!restaurantExists) {
      console.error('Restaurant not found:', expenseData.restaurantId);
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Create the expense with transaction for data consistency
    const newExpense = await prisma.$transaction(async (tx) => {
      // Map the data to match the Prisma schema
      const expenseInput = {
        ...expenseData,
        date: expenseDate,
        // Ensure all required fields are included
        category: expenseData.category || 'UNCATEGORIZED',
        // Map to the correct field names based on your schema
        amount: Number(expenseData.amount),
        frequency: expenseData.frequency || 'ONE_TIME',
        description: expenseData.description?.trim()
      };

      // Create the expense
      const expense = await tx.expense.create({
        data: expenseInput,
      });
      
      // Note: Removed restaurant timestamp update as updatedAt is not in the schema
      
      return expense;
    });

    console.log('Successfully created expense:', newExpense.id);
    
    return NextResponse.json(newExpense, { status: 201 });
    
  } catch (error: unknown) {
    console.error('Failed to create expense:', error);
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Expense with these details already exists' },
          { status: 409 }
        );
      }
      
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Related record not found' },
          { status: 404 }
        );
      }
    }
    
    // Generic error response
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponse: { error: string; details?: string } = { 
      error: 'Failed to create expense'
    };
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = errorMessage;
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
