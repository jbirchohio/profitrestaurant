import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateRecipeBuild, IngredientInput } from '@/lib/ai';

const ingredientSchema = z.object({
  name: z.string(),
  weight: z.number().optional(),
  lockedQty: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const schema = z.object({
      salesPrice: z.number().positive(),
      targetFoodCostPct: z.number().min(1).max(100),
      ingredients: z.array(ingredientSchema),
      restaurantId: z.string().cuid().optional(),
      strategy: z.string().optional(),
    });

    const { salesPrice, targetFoodCostPct, ingredients, restaurantId, strategy } =
      schema.parse(body);

    const items: IngredientInput[] = [];
    for (const ing of ingredients) {
      const avg = await prisma.inventoryItem.aggregate({
        _avg: { unitPrice: true },
        where: { name: ing.name, ...(restaurantId ? { restaurantId } : {}) },
      });
      items.push({
        name: ing.name,
        averageUnitCost: avg._avg.unitPrice || 0,
        weight: ing.weight,
        lockedQty: ing.lockedQty,
      });
    }

    const result = await generateRecipeBuild({
      salesPrice,
      targetFoodCostPct,
      ingredients: items,
      strategy,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Optimize recipe error:', error);
    return NextResponse.json({ error: 'Failed to optimize recipe' }, { status: 500 });
  }
}
