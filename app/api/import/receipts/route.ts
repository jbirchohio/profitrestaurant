import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'papaparse';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'receipts' | 'inventory' | 'sales';
    const restaurantId = formData.get('restaurantId') as string;

    if (!file || !type || !restaurantId) {
      return NextResponse.json(
        { error: 'File, type, and restaurantId are required' },
        { status: 400 }
      );
    }

    // Read the file content
    const fileContent = await file.text();
    
    // Parse CSV
    const results = await new Promise<any[]>((resolve, reject) => {
      parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error: Error) => reject(error)
      });
    });

    // Process based on import type
    switch (type) {
      case 'receipts':
        await processReceipts(results, restaurantId);
        break;
      case 'inventory':
        await processInventory(results, restaurantId);
        break;
      case 'sales':
        await processSales(results, restaurantId);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid import type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${results.length} ${type} records imported successfully`
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process import' },
      { status: 500 }
    );
  }
}

async function processReceipts(rows: any[], restaurantId: string) {
  const expenses = rows.map(row => ({
    vendor: row.vendor || 'Unknown',
    amount: parseFloat(row.amount || '0'),
    date: new Date(row.date || Date.now()),
    category: row.category || 'Uncategorized',
    description: row.description || `Expense from ${row.vendor || 'unknown vendor'}`,
    frequency: 'ONE_TIME', // Assuming 'ONE_TIME' is a valid enum value
    paymentMethod: row.paymentMethod || 'OTHER',
    referenceNumber: row.referenceNumber || `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    notes: row.notes || 'Imported from CSV',
    restaurantId,
    userId: 'system-import' // Default user ID for imports
  }));

  await prisma.expense.createMany({
    data: expenses,
    skipDuplicates: true
  });
}

async function processInventory(rows: any[], restaurantId: string) {
  const items = rows.map(row => ({
    name: row.name || 'Unnamed Item',
    category: row.category || 'Uncategorized',
    quantity: parseFloat(row.quantity || '0'),
    unit: row.unit || 'each',
    unitPrice: parseFloat(row.unitPrice || '0'),
    sku: row.sku || `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    totalCost: parseFloat(row.totalCost) || (parseFloat(row.unitPrice || '0') * parseFloat(row.quantity || '0')),
    purchasedAt: new Date(row.date || Date.now()),
    restaurantId,
    supplier: row.supplier || 'Unknown',
    reorderPoint: parseFloat(row.reorderPoint || '0') || null,
    notes: row.notes || ''
  }));

  await prisma.inventoryItem.createMany({
    data: items,
    skipDuplicates: true
  });
}

async function processSales(rows: any[], restaurantId: string) {
  const sales = rows.map(row => ({
    date: new Date(row.date || Date.now()),
    netSales: parseFloat(row.netSales || '0'),
    grossSales: parseFloat(row.grossSales) || (parseFloat(row.netSales || '0') + parseFloat(row.discounts || '0')),
    tax: parseFloat(row.tax || '0'),
    tips: parseFloat(row.tips || '0'),
    paymentMethod: row.paymentMethod || 'Other',
    discounts: parseFloat(row.discounts || '0'),
    refunds: parseFloat(row.refunds || '0'),
    deliveryFees: parseFloat(row.deliveryFees || '0'),
    restaurantId,
    transactionId: row.transactionId || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    notes: row.notes || ''
  }));

  await prisma.saleEntry.createMany({
    data: sales,
    skipDuplicates: true
  });
}
