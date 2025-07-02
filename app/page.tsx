'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    console.log('HomePage mounted');
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl mb-6">
          Welcome to Neon Nachos Finance Tracker
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Your all-in-one solution for managing restaurant finances, tracking inventory, and boosting profitability.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
