'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveDocument, getDefaultDocument } from '@/app/services/documentService';

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Create a new document and redirect to its editor page
    const createNewDocument = () => {
      try {
        const defaultDoc = getDefaultDocument();
        const newDoc = saveDocument({
          ...defaultDoc,
          title: searchParams?.get('title') || 'Untitled Document',
        });
        
        // Redirect to the new document's editor page
        router.push(`/editor/${newDoc.id}`);
      } catch (error) {
        console.error('Error creating new document:', error);
        router.push('/home');
      }
    };

    createNewDocument();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Creating new document...</p>
      </div>
    </div>
  );
}
