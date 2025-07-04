import OpenAI from 'openai';
import { type ChatCompletionMessageParam } from 'openai/resources/chat';
import { parse } from 'papaparse';

// Define types for our financial data
interface FinancialMetrics {
  revenue: number;
  expenses: number;
  netProfit: number;
  cogs: number;
  laborCost: number;
  revenueChange: number;
  highFoodCostRecipes?: Array<{
    name: string;
    costPercentage: number;
  }>;
  lowInventoryItems?: Array<{
    name: string;
    quantity: number;
  }>;
}

// Initialize OpenAI client as null - will be initialized on the server side
let openai: OpenAI | null = null;

// Function to get OpenAI client (only works on server side)
const getOpenAIClient = (): OpenAI | null => {
  // This function will only work on the server side
  if (typeof window !== 'undefined') {
    console.warn('OpenAI client cannot be initialized in the browser');
    return null;
  }

  if (!openai) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.warn('OpenAI API key is not set. AI features will be disabled.');
        return null;
      }
      
      openai = new OpenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      return null;
    }
  }
  
  return openai;
};

/**
 * Generates AI-powered insights based on financial data
 * @param data Financial metrics and other relevant data
 * @returns Array of actionable insights
 */
export const getAiInsights = async (data: FinancialMetrics): Promise<string[]> => {
  try {
    // If OpenAI client is not initialized, return default insights
    if (!openai) {
      console.warn('OpenAI client not initialized. Using default insights.');
      return generateDefaultInsights(data);
    }

    // Prepare the prompt for the AI
    const prompt = createPrompt(data);

    // Double-check openai is still available
    if (!openai) {
      console.warn('OpenAI client became unavailable. Using default insights.');
      return generateDefaultInsights(data);
    }

    // Define messages with proper typing
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a financial advisor for restaurants. Provide 3-5 concise, actionable insights based on the provided financial data. Focus on cost optimization, revenue opportunities, and operational improvements.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and format the insights
    const content = response.choices[0]?.message?.content;
    if (!content) return generateDefaultInsights(data);
    
    const insights = content
      .split('\n')
      .filter((line: string) => line.trim().length > 0 && !line.trim().startsWith('Note:'))
      .slice(0, 5) // Limit to 5 insights max
      .map(insight => insight.trim());

    return insights.length > 0 ? insights : generateDefaultInsights(data);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateDefaultInsights(data);
  }
};

/**
 * Creates a detailed prompt for the AI based on financial data
 */
function createPrompt(data: FinancialMetrics): string {
  return `
    Here are the current financial metrics for the restaurant:
    - Monthly Revenue: $${data.revenue.toLocaleString()}
    - Monthly Expenses: $${data.expenses.toLocaleString()}
    - Net Profit: $${data.netProfit.toLocaleString()}
    - Cost of Goods Sold (COGS): ${data.cogs}% of revenue
    - Labor Cost: ${data.laborCost}% of revenue
    - Revenue Change from last month: ${data.revenueChange}%
    
    ${data.highFoodCostRecipes?.length ? `
    High Food Cost Recipes (cost > 30% of menu price):
    ${data.highFoodCostRecipes.map(r => `- ${r.name}: ${r.costPercentage}%`).join('\n    ')}
    ` : ''}
    
    ${data.lowInventoryItems?.length ? `
    Low Inventory Items (quantity < 10):
    ${data.lowInventoryItems.map(i => `- ${i.name}: ${i.quantity} remaining`).join('\n    ')}
    ` : ''}
    
    Based on this data, please provide 3-5 specific, actionable insights to improve profitability.
    Focus on:
    1. Cost reduction opportunities
    2. Revenue optimization
    3. Operational improvements
    4. Menu engineering suggestions
    
    Format each insight as a concise bullet point starting with "• "
  `;
}

/**
 * Generates default insights when AI is not available
 */
function generateDefaultInsights(data: FinancialMetrics): string[] {
  const insights: string[] = [];
  
  // Basic profitability analysis
  if (data.netProfit < data.revenue * 0.1) {
    insights.push('• Consider reviewing pricing strategy as net profit margin is below 10%');
  }
  
  // Food cost analysis
  if (data.cogs > 35) {
    insights.push(`• High COGS (${data.cogs}% of revenue). Review ingredient costs and portion sizes.`);
  }
  
  // Labor cost analysis
  if (data.laborCost > 30) {
    insights.push(`• Labor costs (${data.laborCost}% of revenue) are above industry average. Consider optimizing staff scheduling.`);
  }
  
  // Revenue trend
  if (data.revenueChange < 0) {
    insights.push(`• Revenue decreased by ${Math.abs(data.revenueChange)}% from last month. Investigate potential causes.`);
  }
  
  // Add more default insights based on your needs
  insights.push('• Consider implementing daily specials to move inventory with lower turnover');
  insights.push('• Review portion sizes and prep waste to reduce food costs');
  
  return insights.slice(0, 5); // Return max 5 insights
}

// Define the analysis result type to match what CsvImporter expects
export type CsvAnalysisResult = {
  analysis: string;
  insights: string[];
  summary?: string;
  recommendations?: string[];
  error?: string;
  stats?: {
    totalRecords: number;
    sampleSize: number;
    fields: string[];
  };
};

// Helper function to create a valid error response
const createErrorResponse = (message: string): CsvAnalysisResult => ({
  analysis: message,
  insights: [],
  stats: {
    totalRecords: 0,
    sampleSize: 0,
    fields: []
  }
});

/**
 * Analyzes CSV data and provides AI-powered insights
 * @param csvData Raw CSV string data
 * @param importType Type of data being imported ('receipts' | 'inventory' | 'sales')
 * @returns Object containing analysis and insights
 */
export const analyzeCsvData = async (csvData: string, importType: 'receipts' | 'inventory' | 'sales'): Promise<CsvAnalysisResult> => {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      console.warn('OpenAI client not available. Running in browser or API key not set.');
      return createErrorResponse('AI analysis is not available in this environment');
    }

    // Parse CSV data
    const { data, errors, meta } = await new Promise<any>((resolve) => {
      parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => resolve(results),
        error: (error: Error) => resolve({ data: [], errors: [error], meta: { fields: [] } })
      });
    });

    if (errors && errors.length > 0) {
      return createErrorResponse(`CSV parsing error: ${errors[0].message}`);
    }

    if (!data || data.length === 0) {
      return createErrorResponse('No valid data found in the CSV');
    }

    // Take a sample of the data for analysis (to avoid token limits)
    const sampleData = data.slice(0, Math.min(50, data.length));
    
    // Prepare the prompt based on import type with more specific instructions
    let systemPrompt = 'You are a senior restaurant analyst with expertise in financial optimization and operational efficiency. ';
    let userPrompt = `Analyze this ${importType} data and provide detailed, actionable insights. Focus on:\n\n`;
    
    switch (importType) {
      case 'receipts':
        systemPrompt += 'Your expertise is in identifying cost-saving opportunities and optimizing vendor relationships.';
        userPrompt += `1. Top 3 vendors by spending and potential for bulk discounts\n` +
                     `2. Unusual or outlier expenses that need attention\n` +
                     `3. Recurring subscriptions or services that could be optimized\n` +
                     `4. Seasonal spending patterns\n` +
                     `5. Specific, actionable recommendations to reduce costs\n\n` +
                     `Data sample:\n${JSON.stringify(sampleData, null, 2)}`;
        break;
        
      case 'inventory':
        systemPrompt += 'Your expertise is in inventory optimization and waste reduction.';
        userPrompt += `1. Items with highest waste or spoilage risk\n` +
                     `2. Potential for bulk purchasing opportunities\n` +
                     `3. Items that are overstocked or understocked\n` +
                     `4. Seasonal inventory patterns\n` +
                     `5. Specific recommendations to optimize inventory levels\n\n` +
                     `Data sample:\n${JSON.stringify(sampleData, null, 2)}`;
        break;
        
      case 'sales':
        systemPrompt += 'Your expertise is in revenue optimization and menu engineering.';
        userPrompt += `1. Best and worst performing menu items by revenue and margin\n` +
                     `2. Peak sales days and times\n` +
                     `3. Opportunities for upselling or menu adjustments\n` +
                     `4. Customer preferences and trends\n` +
                     `5. Specific recommendations to increase revenue\n\n` +
                     `Data sample:\n${JSON.stringify(sampleData, null, 2)}`;
        break;
    }

    // Check if OpenAI client is available
    if (!openai) {
      console.warn('OpenAI client is not available. Cannot analyze CSV data.');
      return createErrorResponse('AI analysis is currently unavailable. Please check your OpenAI API key configuration.');
    }

    // Call OpenAI API for analysis with more detailed instructions
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt + ' Provide specific, actionable insights with clear recommendations. ' +
                   'Use bullet points for clarity and include specific numbers when possible. ' +
                   'Focus on insights that can directly impact the bottom line.'
        },
        { 
          role: 'user', 
          content: userPrompt + `\n\nProvide a detailed analysis with 3-5 key insights in markdown format. ` +
                   `For each insight, include:\n` +
                   `1. The specific finding or pattern\n` +
                   `2. Its potential impact (quantified if possible)\n` +
                   `3. 1-2 specific action items\n\n` +
                   `Format the response in clear, concise markdown with proper headings and bullet points.`
        }
      ],
      temperature: 0.7, // Slightly higher temperature for more creative insights
      max_tokens: 1500,
    });

    const analysis = response.choices[0]?.message?.content || 'No analysis available';
    
    // Extract insights as bullet points
    const insights = analysis
      .split('\n')
      .filter(line => line.trim().startsWith('- ') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[-\d\.\s]+/, '').trim())
      .filter(Boolean);

    return {
      analysis,
      insights: insights.length > 0 ? insights : ['No specific insights could be generated from the data'],
      stats: {
        totalRecords: data.length,
        sampleSize: sampleData.length,
        fields: Object.keys(data[0] || {})
      }
    };
    
  } catch (error: unknown) {
    console.error('Error analyzing CSV data with AI:', error);
    return createErrorResponse(
      `Error analyzing CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

export interface IngredientInput {
  name: string;
  averageUnitCost: number;
  weight?: number;
  lockedQty?: number;
}

export interface OptimizedRecipe {
  ingredients: { name: string; quantity: number; cost: number }[];
  totalCost: number;
  costPercentage: number;
  overBudget: boolean;
}

function simpleOptimize(
  salesPrice: number,
  targetPct: number,
  items: IngredientInput[]
): OptimizedRecipe {
  const budget = salesPrice * (targetPct / 100);
  let remainingBudget = budget;
  let totalCost = 0;
  const results: { name: string; quantity: number; cost: number }[] = [];
  const unlocked: IngredientInput[] = [];

  items.forEach((ing) => {
    if (ing.lockedQty && ing.averageUnitCost) {
      const cost = ing.lockedQty * ing.averageUnitCost;
      results.push({ name: ing.name, quantity: ing.lockedQty, cost });
      totalCost += cost;
      remainingBudget -= cost;
    } else {
      unlocked.push(ing);
    }
  });

  const totalWeight = unlocked.reduce((sum, i) => sum + (i.weight ?? 0), 0);
  unlocked.forEach((ing) => {
    const weight =
      totalWeight > 0
        ? (ing.weight ?? 0) / totalWeight
        : 1 / unlocked.length;
    const allocation = remainingBudget * weight;
    const qty = ing.averageUnitCost
      ? allocation / ing.averageUnitCost
      : 0;
    results.push({ name: ing.name, quantity: qty, cost: allocation });
    totalCost += allocation;
  });

  return {
    ingredients: results,
    totalCost,
    costPercentage: (totalCost / salesPrice) * 100,
    overBudget: totalCost > budget,
  };
}

export async function generateRecipeBuild(params: {
  salesPrice: number;
  targetFoodCostPct: number;
  ingredients: IngredientInput[];
  strategy?: string;
}): Promise<OptimizedRecipe> {
  const { salesPrice, targetFoodCostPct, ingredients, strategy } = params;
  const openai = getOpenAIClient();
  if (!openai) {
    return simpleOptimize(salesPrice, targetFoodCostPct, ingredients);
  }

  const budget = salesPrice * (targetFoodCostPct / 100);
  const system =
    'You are a culinary cost optimizer. Given ingredient costs, return JSON with suggested ounces for each ingredient to meet the budget.';
  const ingredientInfo = ingredients
    .map((i) => `${i.name} $${i.averageUnitCost}/oz weight:${i.weight ?? ''} locked:${i.lockedQty ?? ''}`)
    .join('\n');
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Sale price: $${salesPrice}\nTarget cost: ${targetFoodCostPct}% (budget $${budget.toFixed(
        2
      )})\nIngredients:\n${ingredientInfo}\nStrategy: ${strategy ||
        'balanced'}\nReturn JSON array like [{"name":"Ingredient","quantity":oz,"cost":num}] and totalCost.`,
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.4,
      max_tokens: 300,
    });
    const text = response.choices[0].message?.content || '';
    const json = JSON.parse(text.trim());
    const results = json.ingredients as { name: string; quantity: number; cost: number }[];
    const totalCost = json.totalCost as number;
    return {
      ingredients: results,
      totalCost,
      costPercentage: (totalCost / salesPrice) * 100,
      overBudget: totalCost > budget,
    };
  } catch (err) {
    console.error('AI optimization failed, using fallback:', err);
    return simpleOptimize(salesPrice, targetFoodCostPct, ingredients);
  }
}

