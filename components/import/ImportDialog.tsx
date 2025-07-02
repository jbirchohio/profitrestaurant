'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CsvImporter } from './CsvImporter';

interface ImportDialogProps {
  restaurantId: string;
  onImportComplete?: () => void;
}

export function ImportDialog({ restaurantId, onImportComplete }: ImportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleImportComplete = () => {
    setOpen(false);
    if (onImportComplete) onImportComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon className="mr-2 h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import receipts, inventory, or sales data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CsvImporter 
            restaurantId={restaurantId} 
            onComplete={handleImportComplete} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
