import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { InventoryItem } from '@prisma/client';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().min(0, 'Quantity must be non-negative')),
  unitPrice: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'Unit price must be non-negative')),
  totalCost: z.preprocess((a) => parseFloat(z.string().parse(a)), z.number().min(0, 'Total cost must be non-negative')),
  vendor: z.string().optional(),
  purchasedAt: z.preprocess((a) => new Date(z.string().parse(a)), z.date()),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const restaurantId = formData.get('restaurantId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
    }

    const fileContent = await file.text();
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

        const validationPromises = records.map(async (record: Record<string, string>) => {
      const validation = inventoryItemSchema.safeParse(record);
      if (validation.success) {
        return prisma.inventoryItem.create({
          data: {
            ...validation.data,
            restaurantId,
          },
        });
      } else {
        console.error('Invalid record:', validation.error.flatten());
        return Promise.resolve(null);
      }
    });

    const results = await Promise.all(validationPromises);
        const successfulImports = results.filter((r: InventoryItem | null): r is InventoryItem => r !== null).length;

    return NextResponse.json(
      {
        message: `Successfully imported ${successfulImports} of ${records.length} records.`,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to import inventory:', error);
    return NextResponse.json({ error: 'Failed to import inventory' }, { status: 500 });
  }
}
