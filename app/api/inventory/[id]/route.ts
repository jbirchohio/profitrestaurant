import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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

const createInventoryItemSchema = z.object(inventoryItemBaseSchema);

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
