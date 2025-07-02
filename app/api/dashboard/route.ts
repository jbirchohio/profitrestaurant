import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiInsights } from '@/lib/ai';

interface RecipeWithIngredients {
  id: string;
  name: string;
  fixedPrice: number | null;
  ingredients: {
    quantityUsed: number;
    inventoryItem: {
      unitPrice: number;
    };
  }[];
}

export async function GET() {
  try {
    // Fetch necessary data from the database
    const [totalRevenue, totalExpenses, recipes] = await Promise.all([
      prisma.saleEntry.aggregate({
        _sum: {
          netSales: true,
        },
        where: {
          date: {
            gte: new Date(new Date().setDate(1)), // Current month
          },
        },
      }),
      prisma.expense.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)), // Current month
          },
        },
      }),
      prisma.recipe.findMany({
        include: {
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
        },
      }) as unknown as RecipeWithIngredients[],
    ]);

    // Calculate COGS (Cost of Goods Sold)
    // Note: This is a simplified calculation - you might want to track actual recipe usage
    const cogs = (recipes as unknown as RecipeWithIngredients[]).reduce((total: number, recipe: RecipeWithIngredients) => {
      const itemCost = recipe.ingredients.reduce((sum: number, { quantityUsed, inventoryItem }) => {
        return sum + (inventoryItem.unitPrice * quantityUsed);
      }, 0);
      // Using a default of 10 sales per recipe for demo purposes
      // In a real app, you'd track actual sales
      const salesThisMonth = 10; // This should come from your sales data
      return total + (itemCost * salesThisMonth);
    }, 0);

    // Calculate labor cost
    const laborCost = await prisma.laborEntry.aggregate({
      _sum: {
        totalWages: true,
      },
      where: {
        date: {
          gte: new Date(new Date().setDate(1)), // Current month
        },
      },
    });

    // Calculate metrics
    const revenue = totalRevenue._sum.netSales || 0;
    const expenses = totalExpenses._sum.amount || 0;
    const laborCostTotal = laborCost._sum.totalWages || 0;
    const netProfit = revenue - expenses - cogs - laborCostTotal;
    const cogsPercentage = revenue > 0 ? (cogs / revenue) * 100 : 0;
    const laborCostPercentage = revenue > 0 ? (laborCostTotal / revenue) * 100 : 0;

    // Get previous month data for comparison
    const prevMonthStart = new Date();
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    prevMonthStart.setDate(1);
    
    const prevMonthEnd = new Date();
    prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);
    prevMonthEnd.setDate(0);

    const prevMonthRevenue = await prisma.saleEntry.aggregate({
      _sum: {
        netSales: true,
      },
      where: {
        date: {
          gte: prevMonthStart,
          lte: prevMonthEnd,
        },
      },
    });

    const prevRevenue = prevMonthRevenue._sum.netSales || 0;
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Get high food cost recipes for AI insights
    const highCostRecipes = (recipes as unknown as RecipeWithIngredients[])
      .filter(recipe => recipe.fixedPrice !== null)
      .map(recipe => {
        const itemCost = recipe.ingredients.reduce((sum, { quantityUsed, inventoryItem }) => {
          return sum + (inventoryItem.unitPrice * quantityUsed);
        }, 0);
        const price = recipe.fixedPrice || 1; // Avoid division by zero
        const costPercentage = (itemCost / price) * 100;
        return { name: recipe.name, costPercentage };
      })
      .filter(recipe => recipe.costPercentage > 35); // Flag recipes with >35% food cost

    // Get low inventory items for AI insights
    const lowInventory = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lte: 10, // Assuming 10 is the par level - adjust as needed
        },
      },
    });

    // Generate AI insights using the new AI service
    const aiInsights = await getAiInsights({
      revenue,
      expenses: expenses + cogs + laborCostTotal,
      netProfit,
      cogs: cogsPercentage,
      laborCost: laborCostPercentage,
      revenueChange,
      highFoodCostRecipes: highCostRecipes,
      lowInventoryItems: lowInventory.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    });

    // Combine AI insights with system alerts
    const insights = [
      ...aiInsights,
      ...(highCostRecipes.length > 0 ? [
        `High food cost recipes: ${highCostRecipes.map(r => `"${r.name}" (${r.costPercentage.toFixed(1)}%)`).join(', ')}.`
      ] : []),
      ...(lowInventory.length > 0 ? [
        `Low inventory: ${lowInventory.map(i => i.name).join(', ')}.`
      ] : [])
    ].slice(0, 5); // Limit to 5 insights total

    return NextResponse.json({
      metrics: {
        revenue,
        netProfit,
        cogs: cogsPercentage,
        laborCost: laborCostPercentage,
        revenueChange,
      },
      insights,
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
