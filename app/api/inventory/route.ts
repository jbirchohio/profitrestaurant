import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Zod schema for validating the request body when creating an inventory item
const createInventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  totalCost: z.number().min(0, 'Total cost cannot be negative'),
  vendor: z.string().optional(),
  purchasedAt: z.string().datetime(), // ISO 8601 date string
  restaurantId: z.string().cuid('Invalid restaurant ID'),
});

/**
 * GET /api/inventory
 * Fetches all inventory items for a specific restaurant.
 * Query Params: restaurantId (required)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { purchasedAt: 'desc' },
    });
    return NextResponse.json(inventoryItems);
  } catch (error) {
    console.error('Failed to fetch inventory items:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory items' }, { status: 500 });
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

    const { purchasedAt, ...data } = validation.data;

    const newItem = await prisma.inventoryItem.create({
      data: {
        ...data,
        purchasedAt: new Date(purchasedAt),
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create inventory item:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2002') {
        return NextResponse.json({ error: 'An inventory item with this SKU already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}

/**
 * PATCH /api/inventory/[id]
 * Updates an existing inventory item.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;
    const body = await request.json();
    
    // Allow partial updates, so make all fields optional
    const updateSchema = createInventoryItemSchema.partial();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { purchasedAt, ...data } = validation.data;
    const updateData: any = { ...data };
    
    if (purchasedAt) {
      updateData.purchasedAt = new Date(purchasedAt);
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    if (error instanceof Error && 'code' in error) {
      if ((error as any).code === 'P2025') {
        return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
      }
      if ((error as any).code === 'P2002') {
        return NextResponse.json({ error: 'An inventory item with this SKU already exists' }, { status: 409 });
      }
    }
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/[id]
 * Deletes an inventory item.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = params.id;

    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
