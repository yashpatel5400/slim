import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

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
        ...style
      }}
      {...props}
    />
  )),
  { ssr: false }
);

// Define the Editor component
const Editor = () => {
  const [latexCode, setLatexCode] = useState<string>(
    '\\documentclass{article}\n' +
    '\\usepackage{amsmath, amssymb, amsthm}\n' +
    '\\title{My Document}\n' +
    '\\author{Your Name}\n' +
    '\\begin{document}\n' +
    '\\maketitle\n' +
    '\\section{Introduction}\n' +
    'Hello, \\LaTeX! This is a sample document.\n' +
    '\\end{document}'
  );
  
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const compileTimeout = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Use a ref to track the current PDF URL for cleanup
  const pdfUrlRef = useRef<string>('');

  // Clean up PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  // Compile LaTeX to PDF
  const compileLatex = useCallback(async (code: string) => {
    if (!code.trim()) {
      setPdfUrl('');
      pdfUrlRef.current = '';
      return;
    }

    setIsCompiling(true);
    setError(null);

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile LaTeX');
      }
      const { pdf: pdfBase64 } = await response.json();
      
      // Convert base64 to blob and create object URL
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Revoke previous URL if exists
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      
      const newPdfUrl = URL.createObjectURL(blob);
      pdfUrlRef.current = newPdfUrl;
      setPdfUrl(newPdfUrl);
    } catch (err) {
      console.error('Compilation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compile LaTeX');
      setPdfUrl('');
      pdfUrlRef.current = '';
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // Debounce compilation
  useEffect(() => {
    if (compileTimeout.current) {
      clearTimeout(compileTimeout.current);
    }

    compileTimeout.current = setTimeout(() => {
      compileLatex(latexCode);
    }, 1000);

    return () => {
      if (compileTimeout.current) {
        clearTimeout(compileTimeout.current);
      }
    };
  }, [latexCode, compileLatex]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">LaTeX Editor</h1>
        <p className="text-sm opacity-90">Type LaTeX on the left, see the PDF preview on the right</p>
      </header>
      
      <div className="flex-1 overflow-hidden flex">
        <div className="flex w-full h-full">
          {/* Editor Pane */}
          <div className="w-1/2 h-full bg-white border-r border-gray-200 overflow-auto">
            <SimpleEditor
              value={latexCode}
              onChange={(code: string) => setLatexCode(code)}
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
              }}
            />
          </div>
          
          {/* Resize handle */}
          <div className="w-2 bg-gray-200 hover:bg-blue-300 cursor-col-resize" />
          
          {/* Preview Pane */}
          <div className="w-1/2 h-full overflow-auto bg-gray-100 p-4">
            {isCompiling ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Compiling LaTeX...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4 bg-red-50 rounded">
                <p className="font-bold">Compilation Error:</p>
                <pre className="whitespace-pre-wrap mt-2 text-sm">{error}</pre>
              </div>
            ) : pdfUrl ? (
              <iframe
                ref={previewRef}
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border border-gray-300 bg-white"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Compiled PDF will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-200 p-2 text-center text-sm text-gray-600">
        LaTeX Editor - {new Date().getFullYear()}
      </footer>

      <style jsx global>{`
        /* Basic styles for the editor container */
        .editor-container {
          height: 100%;
          width: 100%;
          overflow: auto;
        }
        
        /* Ensure the iframe takes full height */
        iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        
        /* Loading and error states */
        .loading-state, .error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
          text-align: center;
        }
        
        .error-state {
          color: #e53e3e;
          background-color: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Editor;
