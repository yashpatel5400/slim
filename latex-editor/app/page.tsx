'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'katex/dist/katex.min.css';

// Import the Editor component dynamically to avoid SSR issues
const Editor = dynamic(
  () => import('./components/Editor'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center min-h-screen">Loading editor...</div>
  }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Editor />
    </div>
  );
}
