import { SaleEntry } from '@prisma/client';

/**
 * Calculates Net Sales from a SaleEntry object.
 * Net Sales = Gross Sales - Discounts - Refunds
 */
export function calculateNetSales(sale: Omit<SaleEntry, 'id' | 'createdAt' | 'restaurantId' | 'netSales'>): number {
  return sale.grossSales - sale.discounts - sale.refunds;
}

/**
 * Calculates the labor cost as a percentage of net sales.
 */
export function calculateLaborPercentage(totalLaborCost: number, netSales: number): number {
  if (netSales === 0) {
    return 0; // Avoid division by zero
  }
  return (totalLaborCost / netSales) * 100;
}

/**
 * Calculates the average hourly wage.
 */
export function calculateAverageHourlyWage(totalWages: number, totalHours: number): number {
  if (totalHours === 0) {
    return 0; // Avoid division by zero
  }
  return totalWages / totalHours;
}

/**
 * Calculates the cost of a recipe based on its ingredients and current inventory prices.
 */
export function calculateRecipeCost(ingredients: { quantityUsed: number; inventoryItem: { unitPrice: number } }[]): number {
  return ingredients.reduce((total, ingredient) => {
    return total + (ingredient.quantityUsed * ingredient.inventoryItem.unitPrice);
  }, 0);
}

/**
 * Calculates the ideal sale price for a recipe to meet a target food cost percentage.
 */
export function calculateIdealSalePrice(recipeCost: number, targetFoodCostPercentage: number): number {
  if (targetFoodCostPercentage <= 0 || targetFoodCostPercentage >= 100) {
    throw new Error('Target food cost percentage must be between 0 and 100.');
  }
  return recipeCost / (targetFoodCostPercentage / 100);
}

/**
 * Generates weekly Cost of Goods Sold (COGS) from a list of inventory purchases.
 */
export function calculateWeeklyCogs(inventoryItems: { totalCost: number }[]): number {
  return inventoryItems.reduce((total, item) => total + item.totalCost, 0);
}
