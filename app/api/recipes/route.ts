import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const createRecipeSchema = z.object({
  name: z.string().min(1, 'Recipe name is required'),
  fixedPrice: z.number().optional(),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  ingredients: z.array(z.object({
    inventoryItemId: z.string().cuid('Invalid inventory item ID'),
    quantityUsed: z.number().positive('Quantity used must be positive'),
  })).min(1, 'A recipe must have at least one ingredient'),
});

/**
 * GET /api/recipes
 * Fetches all recipes for a specific restaurant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID is required' }, { status: 400 });
  }

  try {
    const recipes = await prisma.recipe.findMany({
      where: { restaurantId },
      include: {
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

/**
 * POST /api/recipes
 * Creates a new recipe with its ingredients.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createRecipeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { ingredients, ...recipeData } = validation.data;

    // Use a transaction to ensure the recipe and its ingredients are created together
    const newRecipe = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const recipe = await tx.recipe.create({
        data: recipeData,
      });

      await tx.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          ...ing,
          recipeId: recipe.id,
        })),
      });

      return tx.recipe.findUnique({
        where: { id: recipe.id },
        include: { ingredients: true },
      });
    });

    return NextResponse.json(newRecipe, { status: 201 });
  } catch (error) {
    console.error('Failed to create recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
