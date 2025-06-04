'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the Editor component with SSR disabled
const Editor = dynamic(
  () => import('@/app/components/Editor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function DocumentEditorPage() {
  const params = useParams();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <div className="min-h-screen bg-gray-100">
      <Editor 
        documentId={documentId}
        onBack={() => window.location.href = '/home'}
      />
    </div>
  );
}
