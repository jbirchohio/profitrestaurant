import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Validation schemas
const ingredientSchema = z.object({
  inventoryItemId: z.string().cuid('Invalid inventory item ID'),
  quantityUsed: z.number()
    .positive('Quantity used must be positive')
    .max(1000, 'Quantity is too high'),
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit cannot exceed 20 characters'),
  notes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
});

const createRecipeSchema = z.object({
  name: z.string()
    .min(1, 'Recipe name is required')
    .max(100, 'Recipe name cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  category: z.string()
    .max(50, 'Category cannot exceed 50 characters')
    .optional(),
  preparationTime: z.number()
    .int('Preparation time must be an integer')
    .min(0, 'Preparation time cannot be negative')
    .max(1440, 'Preparation time is too long')
    .optional(),
  servingSize: z.number()
    .int('Serving size must be an integer')
    .min(1, 'Serving size must be at least 1')
    .optional(),
  fixedPrice: z.number()
    .min(0, 'Price cannot be negative')
    .max(1000, 'Price is too high')
    .optional(),
  isActive: z.boolean().default(true),
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  ingredients: z.array(ingredientSchema)
    .min(1, 'A recipe must have at least one ingredient')
    .max(50, 'A recipe cannot have more than 50 ingredients'),
  instructions: z.string()
    .max(5000, 'Instructions cannot exceed 5000 characters')
    .optional(),
  tags: z.array(z.string().max(20))
    .max(10, 'Cannot have more than 10 tags')
    .optional(),
});

// Query parameters schema
const getRecipesQuerySchema = z.object({
  restaurantId: z.string().cuid('Invalid restaurant ID'),
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  isActive: z.string().optional(),
  hasInventory: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /api/recipes
 * Fetches recipes with filtering, sorting, and pagination.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validation = getRecipesQuerySchema.safeParse(query);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      search,
      category,
      minPrice,
      maxPrice,
      isActive,
      hasInventory,
      limit = '10',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = validation.data;

    // Build the where clause based on query parameters
    const where: any = { restaurantId };
    
    // Text search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Category filter
    if (category) {
      where.category = category;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      where.fixedPrice = {};
      if (minPrice) where.fixedPrice.gte = Number(minPrice);
      if (maxPrice) where.fixedPrice.lte = Number(maxPrice);
    }
    
    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // Has inventory filter (simplified - would need actual inventory check)
    if (hasInventory === 'true') {
      where.ingredients = {
        some: {
          inventoryItem: {
            quantity: { gt: 0 }
          }
        }
      };
    }

    // Set up pagination
    const take = Math.min(Number(limit) || 10, 100); // Max 100 items per page
    const skip = Number(offset) || 0;
    
    // Validate sort fields
    const validSortFields = ['name', 'category', 'fixedPrice', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    // Get total count for pagination
    const total = await prisma.recipe.count({ where });
    
    // Fetch paginated results
    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        },
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { [sortField]: order },
      take,
      skip,
    });

    // Calculate summary stats
    const stats = await prisma.recipe.aggregate({
      where,
      _count: true,
      _avg: {
        fixedPrice: true,
      },
      _sum: {
        fixedPrice: true,
      },
    });

    return NextResponse.json({
      data: recipes,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + recipes.length < total,
      },
      summary: {
        totalRecipes: stats._count,
        averagePrice: stats._avg?.fixedPrice ?? 0,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch recipes',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      },
      { status: 500 }
    );
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
    const newRecipe = await prisma.$transaction(async (prisma) => {
      const recipe = await prisma.recipe.create({
        data: recipeData,
      });

      await prisma.recipeIngredient.createMany({
        data: ingredients.map((ing) => ({
          ...ing,
          recipeId: recipe.id,
        })),
      });

      return prisma.recipe.findUnique({
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
