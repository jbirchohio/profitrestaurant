'use client';

import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add a simple check to log if the component renders
  useEffect(() => {
    console.log('RootLayout mounted');
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Neon Nachos Finance Tracker</title>
        <meta name="description" content="Track and analyze your restaurant's financial data." />
      </head>
      <body className={`${inter.className} min-h-screen bg-white`}>
        {children}
      </body>
    </html>
  );
}
