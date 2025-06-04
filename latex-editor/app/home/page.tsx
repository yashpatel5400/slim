'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  const handleNewDocument = () => {
    router.push('/editor');
  };

  const handleOpenDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Encode the content to pass it in the URL
      const encodedContent = encodeURIComponent(content);
      router.push(`/editor?content=${encodedContent}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">LaTeX Editor</h1>
        <p className="text-gray-600 mb-8">Create or open a LaTeX document to get started</p>
        
        <div className="space-y-4">
          <button
            onClick={handleNewDocument}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            New Document
          </button>
          
          <div className="relative">
            <input
              type="file"
              id="file-upload"
              accept=".tex,.txt"
              onChange={handleOpenDocument}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="block w-full cursor-pointer bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-md font-medium hover:bg-blue-50 transition-colors text-center"
            >
              Open Existing File
            </label>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Recent Documents</h2>
          <p className="text-gray-500 text-sm">No recent documents</p>
        </div>
      </div>
    </div>
  );
}
