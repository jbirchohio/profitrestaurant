import { NextResponse } from 'next/server';
import { analyzeCsvData } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { csvData, importType } = await request.json();
    
    if (!csvData) {
      return NextResponse.json(
        { error: 'No CSV data provided' },
        { status: 400 }
      );
    }

    if (!['receipts', 'inventory', 'sales'].includes(importType)) {
      return NextResponse.json(
        { error: 'Invalid import type' },
        { status: 400 }
      );
    }

    const analysis = await analyzeCsvData(csvData, importType);
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CSV' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge'; // Use Edge Runtime for faster response times
