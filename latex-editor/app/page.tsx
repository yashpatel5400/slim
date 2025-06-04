'use client';

import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the home page
  redirect('/home');
  
  // This return is necessary for TypeScript, but will never be reached
  return null;
}
