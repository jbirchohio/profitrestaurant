import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Enhanced validation schemas
const inventoryItemBaseSchema = {
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name cannot exceed 255 characters')
    .trim(),
  sku: z.string()
    .min(1, 'SKU is required')
    .max(100, 'SKU cannot exceed 100 characters')
    .trim(),
  quantity: z.number()
    .min(0, 'Quantity cannot be negative')
    .max(1000000, 'Quantity is too large'),
  unitPrice: z.number()
    .min(0, 'Unit price cannot be negative')
    .max(1000000, 'Unit price is too large'),
  totalCost: z.number()
    .min(0, 'Total cost cannot be negative')
    .max(1000000, 'Total cost is too large'),
  category: z.string()
    .min(1, 'Category is required')
    .max(100, 'Category cannot exceed 100 characters'),
  vendor: z.string()
    .max(255, 'Vendor name cannot exceed 255 characters')
    .optional(),
  purchasedAt: z.string()
    .datetime('Invalid date format')
    .refine(date => new Date(date).toString() !== 'Invalid Date', {
      message: 'Invalid purchase date',
    }),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
};

const createInventoryItemSchema = z.object(inventoryItemBaseSchema).omit({ totalCost: true });

// Query parameters schema
const getInventoryQuerySchema = z.object({
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  category: z.string().optional(),
  supplier: z.string().optional(),
  minQuantity: z.string().optional(),
  maxQuantity: z.string().optional(),
  minUnitCost: z.string().optional(),
  maxUnitCost: z.string().optional(),
  minTotalCost: z.string().optional(), // Added missing field
  maxTotalCost: z.string().optional(), // Added missing field
  expiresBefore: z.string().datetime().optional(),
  purchasedAfter: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

/**
 * GET /api/inventory
 * Fetches inventory items with filtering, sorting, and pagination.
 * Query Parameters:
 * - restaurantId: string (required)
 * - category?: string
 * - vendor?: string
 * - minQuantity?: number
 * - maxQuantity?: number
 * - minUnitPrice?: number
 * - maxUnitPrice?: number
 * - minTotalCost?: number
 * - maxTotalCost?: number
 * - purchasedAfter?: ISO date string
 * - search?: string (searches in name and SKU)
 * - sortBy?: 'name' | 'quantity' | 'unitPrice' | 'totalCost' | 'purchasedAt'
 * - sortOrder?: 'asc' | 'desc'
 * - limit?: number (default: 10, max: 100)
 * - offset?: number (default: 0)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = getInventoryQuerySchema.safeParse(query);
    if (!validation.success) {
      console.error('Invalid query parameters:', validation.error);
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Extract and map query parameters to internal variable names
    const restaurantId = validation.data.restaurantId;
    const category = validation.data.category;
    const vendor = validation.data.supplier; // Map supplier to vendor
    const minQuantity = validation.data.minQuantity;
    const maxQuantity = validation.data.maxQuantity;
    const minUnitPrice = validation.data.minUnitCost; // Map minUnitCost to minUnitPrice
    const maxUnitPrice = validation.data.maxUnitCost; // Map maxUnitCost to maxUnitPrice
    
    // For total cost filtering, we'll need to handle this in the query
    // as these fields might not be directly in the query schema
    const minTotalCost = validation.data.minTotalCost;
    const maxTotalCost = validation.data.maxTotalCost;
    
    const purchasedAfter = validation.data.purchasedAfter;
    const search = validation.data.search;
    const sortBy = validation.data.sortBy || 'purchasedAt';
    const sortOrder = validation.data.sortOrder || 'desc';
    const limit = validation.data.limit || '10';
    const offset = validation.data.offset || '0';

    // Build the where clause based on query parameters
    const where: any = { restaurantId };
    
    if (category) where.category = category;
    if (vendor) where.vendor = vendor;
    
    if (minQuantity || maxQuantity) {
      where.quantity = {};
      if (minQuantity) where.quantity.gte = Number(minQuantity);
      if (maxQuantity) where.quantity.lte = Number(maxQuantity);
    }
    
    if (minUnitPrice || maxUnitPrice) {
      where.unitPrice = {};
      if (minUnitPrice) where.unitPrice.gte = Number(minUnitPrice);
      if (maxUnitPrice) where.unitPrice.lte = Number(maxUnitPrice);
    }
    
    if (minTotalCost || maxTotalCost) {
      where.totalCost = {};
      if (minTotalCost) where.totalCost.gte = Number(minTotalCost);
      if (maxTotalCost) where.totalCost.lte = Number(maxTotalCost);
    }
    
    if (purchasedAfter) {
      where.purchasedAt = { gte: new Date(purchasedAfter) };
    }
    
    // Text search across name and SKU
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Set up pagination
    const take = Math.min(Number(limit) || 10, 100); // Max 100 items per page
    const skip = Number(offset) || 0;

    // Validate sort fields
    const validSortFields = ['name', 'quantity', 'unitPrice', 'totalCost', 'purchasedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'purchasedAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const total = await prisma.inventoryItem.count({ where });
    
    // Fetch paginated results
    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      orderBy: { [sortField]: order },
      take,
      skip,
    });

    // Calculate summary stats
    const stats = await prisma.inventoryItem.aggregate({
      where,
      _sum: { 
        quantity: true,
        totalCost: true,
      },
      _avg: { 
        unitPrice: true,
        totalCost: true,
      },
      _count: true,
    });

    return NextResponse.json({
      data: inventoryItems,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + inventoryItems.length < total,
      },
      summary: {
        totalItems: stats._count,
        totalQuantity: stats._sum.quantity || 0,
        totalCost: stats._sum.totalCost || 0,
        averageUnitPrice: stats._avg.unitPrice || 0,
        averageTotalCost: stats._avg.totalCost || 0,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch inventory items:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory items',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory
 * Creates a new inventory item.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createInventoryItemSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { purchasedAt, quantity, unitPrice, ...data } = validation.data;
    const totalCost = quantity * unitPrice;

    const newItem = await prisma.inventoryItem.create({
      data: {
        ...data,
        quantity,
        unitPrice,
        purchasedAt: new Date(purchasedAt),
        totalCost,
      },
    });

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to create inventory item:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'An inventory item with this SKU already exists' },
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
    
    return NextResponse.json(
      { 
        error: 'Failed to create inventory item',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
  }
}
