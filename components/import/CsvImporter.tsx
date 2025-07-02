'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Loader2 } from 'lucide-react';
import { analyzeCsvData, type CsvAnalysisResult } from '@/lib/ai';

type ImportType = 'receipts' | 'inventory' | 'sales';

interface CsvImporterProps {
  restaurantId: string;
  onComplete?: () => void;
}

export function CsvImporter({ restaurantId, onComplete }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>('receipts');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const [analysis, setAnalysis] = useState<CsvAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setAnalysis(null);
    
    try {
      // First, upload and import the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);
      formData.append('restaurantId', restaurantId);

      const response = await fetch('/api/import/receipts', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import file');
      }

      // If import is successful, analyze the data
      setIsAnalyzing(true);
      try {
        const fileContent = await file.text();
        
        // Call the API endpoint for analysis
        const response = await fetch('/api/analyze-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvData: fileContent,
            importType,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to analyze CSV data');
        }

        const analysis = await response.json();
        
        // Ensure we have a consistent shape for the analysis
        const processedAnalysis = {
          analysis: analysis.analysis || analysis.summary || 'Analysis completed',
          insights: analysis.insights || [],
          stats: analysis.stats || {
            totalRecords: 0,
            sampleSize: 0,
            fields: []
          },
          summary: analysis.summary,
          recommendations: analysis.recommendations || [],
          error: analysis.error
        };
        
        setAnalysis(processedAnalysis);

        toast({
          title: 'Success',
          description: `${data.message || 'File imported successfully'}. ${processedAnalysis.insights.length} insights generated.`,
        });
      } catch (error) {
        console.error('Analysis error:', error);
        setAnalysis({
          analysis: 'Analysis failed',
          insights: ['Failed to analyze the uploaded file. Please try again.'],
          error: error instanceof Error ? error.message : 'Unknown error during analysis'
        });
        
        toast({
          title: 'Analysis Error',
          description: 'The file was imported, but we encountered an error during analysis.',
          variant: 'destructive',
        });
      }

      setFile(null);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Import Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to import {importType} data.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="importType">Import Type</Label>
          <Select 
            value={importType} 
            onValueChange={(value: ImportType) => setImportType(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select import type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receipts">Receipts</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="file">CSV File</Label>
          <Input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: .csv
          </p>
        </div>

        <div className="grid gap-2">
          <Label>CSV Format</Label>
          <div className="rounded-md bg-muted p-4 text-sm">
            {importType === 'receipts' && (
              <pre className="text-xs">
                date,amount,category,description,vendor
                2023-01-01,150.50,Supplies,Paper goods,Office Supply Co
                2023-01-02,89.99,Food,Produce,Local Market
              </pre>
            )}
            {importType === 'inventory' && (
              <pre className="text-xs">
                name,category,quantity,unit,unitPrice,date
                Chicken Breast,Meat,50,lb,3.99,2023-01-01
                Tomatoes,Produce,25,lb,1.99,2023-01-01
              </pre>
            )}
            {importType === 'sales' && (
              <pre className="text-xs">
                date,netSales,tax,tips,paymentMethod
                2023-01-01,1200.50,96.04,180.08,credit
                2023-01-02,950.25,76.02,142.54,cash
              </pre>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            type="submit" 
            disabled={!file || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAnalyzing ? 'Analyzing...' : 'Importing...'}
              </>
            ) : 'Import & Analyze'}
          </Button>

          {analysis && (
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>AI Analysis</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="text-sm text-muted-foreground mb-2">
                  Analyzed {analysis.stats?.totalRecords} records with {analysis.stats?.sampleSize} samples.
                </div>
                <div className="space-y-1">
                  {analysis.insights.map((insight, i) => (
                    <div key={i} className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </form>
    </div>
  );
}
