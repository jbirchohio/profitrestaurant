import { InventoryClient } from './inventory-client';

// This is a server component, which is great for initial page loads.
export default function InventoryPage() {
  // In a real app, you might fetch initial data here and pass it to the client component.
  // For simplicity, we'll let the client component handle all data fetching.
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory Management</h1>
      <InventoryClient />
    </div>
  );
}
