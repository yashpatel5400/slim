import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Document, getDocument, saveDocument, getDefaultDocument } from '../services/documentService';

// Import the new LaTeX editor
const LatexEditor = dynamic(
  () => import('./LatexEditor'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

interface EditorProps {
  documentId?: string;
  onBack?: () => void;
  isNewDocument?: boolean;
}

export default function Editor({ documentId, onBack, isNewDocument = false }: EditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "vs-dark">("light");
  
  // Toggle between light and dark theme
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "light" ? "vs-dark" : "light");
  }, []);
  const compileTimeout = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const pdfUrlRef = useRef<string>('');

  // Save the current document
  const saveCurrentDocument = useCallback(async () => {
    if (!content) return;
    
    setIsSaving(true);
    try {
      const docToSave = {
        id: document?.id,
        title: title || 'Untitled Document',
        content,
      };
      
      const savedDoc = saveDocument(docToSave);
      setDocument(savedDoc);
      setIsNew(false);
      return savedDoc;
    } catch (error) {
      console.error('Error saving document:', error);
      setError('Failed to save document');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [content, document?.id, title]);

  // Compile LaTeX to PDF
  const compileLatex = useCallback(async () => {
    if (!content) return;
    
    setIsCompiling(true);
    setError(null);
    
    // Clear any existing timeout
    if (compileTimeout.current) {
      clearTimeout(compileTimeout.current);
    }
    
    // Save the document first
    const savedDoc = await saveCurrentDocument();
    if (!savedDoc) {
      setIsCompiling(false);
      return;
    }
    
    // Set a timeout to prevent rapid compilation
    compileTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/compile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: savedDoc.content }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to compile LaTeX');
        }
        
        const data = await response.json();
        
        // Create a blob URL for the PDF
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Clean up previous URL if it exists
        if (pdfUrlRef.current) {
          URL.revokeObjectURL(pdfUrlRef.current);
        }
        
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
        
      } catch (error) {
        console.error('Error compiling LaTeX:', error);
        setError('Failed to compile LaTeX. Please check your syntax.');
      } finally {
        setIsCompiling(false);
      }
    }, 500); // Small delay to prevent rapid requests
  }, [content, saveCurrentDocument]);

  // Load document on mount or when documentId changes
  useEffect(() => {
    // If we have a documentId, try to load the document
    if (documentId) {
      const doc = getDocument(documentId);
      if (doc) {
        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.content);
        setIsNew(false);
      } else if (isNewDocument || searchParams?.get('new') === 'true') {
        // Create new document
        const defaultDoc = getDefaultDocument();
        setDocument(null);
        setTitle(defaultDoc.title);
        setContent(defaultDoc.content);
        setIsNew(true);
      } else {
        // Document not found, redirect to home
        router.push('/home');
      }
    } else if (isNewDocument || searchParams?.get('new') === 'true') {
      // Create new document without an ID
      const defaultDoc = getDefaultDocument();
      setDocument(null);
      setTitle(defaultDoc.title);
      setContent(defaultDoc.content);
      setIsNew(true);
    } else {
      // No document ID and not creating new, redirect to home
      router.push('/home');
    }
  }, [documentId, isNewDocument, router, searchParams]);

  // Clean up PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      if (compileTimeout.current) {
        clearTimeout(compileTimeout.current);
      }
    };
  }, []);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!document && !isNew) return;
    
    const timeoutId = setTimeout(async () => {
      if (content) {
        await saveCurrentDocument();
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [content, document, isNew, saveCurrentDocument]);

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-150"
              title="Back to documents"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold text-gray-900 bg-gray-50 rounded-lg px-3 py-1.5 w-full max-w-md border border-transparent focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all duration-200"
                placeholder="Document Title"
              />
            </div>
            {isSaving && (
              <div className="flex items-center text-sm text-gray-500 ml-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-150"
              title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              )}
            </button>
            <button
              onClick={compileLatex}
              disabled={isCompiling}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isCompiling 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              } transition-colors duration-150`}
            >
              {isCompiling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Compiling...
                </>
              ) : (
                'Compile PDF'
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-white">
        <div className="h-full flex flex-col lg:flex-row">
          {/* Editor */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 overflow-hidden">
            <LatexEditor
              value={content}
              onChange={setContent}
              className="h-full"
              theme={theme}
            />
          </div>
          
          {/* Preview */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-gray-50 overflow-auto">
            {pdfUrl ? (
              <iframe
                ref={previewRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Preview Available</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Click the "Compile PDF" button to generate a preview of your LaTeX document.
                </p>
                <div className="mt-6 space-y-2 text-left text-sm text-gray-600 bg-blue-50 p-4 rounded-lg max-w-md">
                  <p className="font-medium">Quick Tips:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Type <code className="bg-blue-100 px-1 rounded">\\</code> to see available LaTeX commands</li>
                    <li>Use <code className="bg-blue-100 px-1 rounded">\\begin{'{...}'}</code> to start an environment</li>
                    <li>Press <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-sm text-xs">Ctrl</kbd> + <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-sm text-xs">S</kbd> to save</li>
                    <li>Click <span className="font-medium">Compile PDF</span> to update the preview</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
