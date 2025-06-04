'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the Editor component with SSR disabled
const Editor = dynamic(
  () => import('@/app/components/Editor'),
  { ssr: false }
);

export default function EditorPage() {
  const searchParams = useSearchParams();
  const [initialContent, setInitialContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for content in URL parameters
    const contentParam = searchParams.get('content');
    if (contentParam) {
      try {
        // Decode the content from the URL
        const decodedContent = decodeURIComponent(contentParam);
        setInitialContent(decodedContent);
      } catch (error) {
        console.error('Error decoding content:', error);
      }
    }
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <Editor 
        initialContent={initialContent} 
        onBack={() => router.push('/home')} 
      />
    </div>
  );
}
