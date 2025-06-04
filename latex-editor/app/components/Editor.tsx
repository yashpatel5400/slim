import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Document, getDocument, saveDocument, getDefaultDocument } from '../services/documentService';

// Use a simple textarea for now to ensure text visibility
const SimpleEditor = dynamic(
  () => Promise.resolve(({ value, onChange, style, ...props }: any) => (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        height: '100%',
        padding: '16px',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontFamily: '\'Fira Code\', \'Fira Mono\', monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        backgroundColor: '#fff',
        color: '#000000',
        ...style
      }}
      {...props}
      className="text-black"
    />
  )),
  { ssr: false }
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

  // Auto-compile when content changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (content) {
        compileLatex();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [content, compileLatex]);

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
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
                'Compile'
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
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Editor */}
          <div className="w-1/2 h-full border-r border-gray-200 bg-white">
            <SimpleEditor
              value={content}
              onChange={setContent}
              style={{ fontFamily: 'monospace' }}
              spellCheck={false}
              className="h-full w-full p-4 focus:outline-none"
            />
          </div>
          
          {/* Preview */}
          <div className="w-1/2 h-full bg-gray-50 overflow-auto">
            {pdfUrl ? (
              <iframe
                ref={previewRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No preview available</h3>
                  <p className="mt-1 text-sm text-gray-500">Compile your LaTeX to see the PDF preview.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
