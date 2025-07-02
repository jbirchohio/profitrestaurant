import { ExpensesClient } from './expenses-client';

export default function ExpensesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Recurring Expenses</h1>
      <ExpensesClient />
    </div>
  );
}
