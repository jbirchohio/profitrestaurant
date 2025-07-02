import { LoansClient } from './loans-client';

export default function LoansPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Loans & Recurring Expenses</h1>
      <LoansClient />
    </div>
  );
}
