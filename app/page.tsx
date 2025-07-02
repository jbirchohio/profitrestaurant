import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to <span className="text-indigo-600">Neon Nachos</span> Finance Tracker
        </h1>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
          Your all-in-one solution for managing restaurant finances, tracking inventory, and boosting profitability.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 shadow-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
