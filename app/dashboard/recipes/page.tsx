import { RecipesClient } from './recipes-client';

export default function RecipesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Recipe Management & Costing</h1>
      <RecipesClient />
    </div>
  );
}
