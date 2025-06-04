'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'katex/dist/katex.min.css';

// Import Prism types
import 'prismjs';

// Type for our custom Prism instance
type CustomPrism = {
  highlight: (code: string, grammar: any, language: string) => string;
  languages: {
    [key: string]: any;
    markup?: any;
    latex?: any;
  };
};

// Extend Prism's type declarations
declare global {
  interface Window {
    Prism?: CustomPrism;
  }
}

// Simple wrapper component for the editor
const SimpleCodeEditor = dynamic(
  () => import('react-simple-code-editor'),
  { ssr: false }
);

// Simple wrapper for Split component
const SplitPane = dynamic(
  () => import('react-split'),
  { ssr: false }
);

// Import PrismJS for syntax highlighting
const importPrism = async (): Promise<CustomPrism | null> => {
  if (typeof window === 'undefined') return null;
  
  try {
    const Prism = (await import('prismjs')) as any;
    // Import and register the LaTeX language
    const registerPrismLatex = (await import('./PrismLatex')).default;
    registerPrismLatex();
    
    // Return the Prism instance (handle both ESM and CJS exports)
    return Prism.default || Prism;
  } catch (error) {
    console.error('Failed to load Prism:', error);
    return null;
  }
};

// Import KaTeX for rendering LaTeX
const importKatex = async (): Promise<{
  renderToString: (formula: string, options: { throwOnError: boolean; displayMode: boolean }) => string;
} | null> => {
  if (typeof window !== 'undefined') {
    const katex = await import('katex');
    return katex.default || katex;
  }
  return null;
};

interface MathPart {
  type: 'text' | 'math';
  content: string;
}

// Default LaTeX template
const DEFAULT_LATEX = String.raw`\documentclass{article}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{amsthm}

\title{My Document}
\author{Your Name}
\date{\today}

\begin{document}
\maketitle

\section{Introduction}
This is a simple LaTeX document. Type your LaTeX code here and see the preview update in real-time.

\section{Math Example}
The Pythagorean theorem states that in a right triangle:
\[ a^2 + b^2 = c^2 \]

\section{Theorem Environment}
\begin{theorem}
There are infinitely many prime numbers.
\end{theorem}

\end{document}`;

export default function Editor() {
  const [latexCode, setLatexCode] = useState(DEFAULT_LATEX);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // Initialize editor state on mount
  useEffect(() => {
    setIsEditorReady(true);
    return () => setIsEditorReady(false);
  }, []);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Process LaTeX code and render math expressions
  const processLatex = useCallback(async (code: string) => {
    const katex = await importKatex();
    if (!katex) return 'Error loading KaTeX';
    
    try {
      // Simple regex to match math expressions
      const mathRegex = /(\$\$[^$]*\$\$|\\\[[^]*?\\\]|\\\([^]*?\\\)|\$[^$\n]+?\$)/g;
      const parts: Array<{type: 'text' | 'math'; content: string}> = [];
      let lastIndex = 0;
      let match;
      
      // Split the content into math and non-math parts
      while ((match = mathRegex.exec(code)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: code.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'math', content: match[0] });
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < code.length) {
        parts.push({ type: 'text', content: code.slice(lastIndex) });
      }
      
      let html = '';
      
      // Process each part
      for (const part of parts) {
        if (part.type === 'text') {
          // Escape HTML and convert line breaks to <br> tags for regular text
          html += part.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        } else {
          // Process math content
          try {
            const mathContent = part.content
              .replace(/^\$\$|\$\$$/g, '')
              .replace(/^\\\[|\\\]$/g, '')
              .replace(/^\\\(|\\\)$/g, '');
              
            const displayMode = part.content.startsWith('$$') || part.content.startsWith('\\[');
            
            if (katex?.renderToString) {
              try {
                html += katex.renderToString(mathContent, {
                  throwOnError: false,
                  displayMode
                });
              } catch (err) {
                console.error('Error rendering math with KaTeX:', err);
                html += displayMode ? `\\[${mathContent}\\]` : `\\(${mathContent}\\)`;
              }
            } else {
              html += displayMode ? `\\[${mathContent}\\]` : `\\(${mathContent}\\)`;
            }
          } catch (err) {
            const error = err as Error;
            html += `<span class="text-red-500">Error rendering math: ${error.message}</span>`;
          }
        }
      }
      
      return html;
    } catch (err) {
      console.error('Error processing LaTeX:', err);
      return `<span class="text-red-500">Error processing LaTeX: ${(err as Error).message}</span>`;
    }
  }, []);
  
  // Update preview when LaTeX code changes
  useEffect(() => {
    let isMounted = true;
    
    const updatePreview = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const html = await processLatex(latexCode);
        if (isMounted) {
          setPreviewHtml(html);
        }
      } catch (err) {
        if (isMounted) {
          setError('Error rendering LaTeX. Make sure your code is valid.');
          console.error('Error rendering LaTeX:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(updatePreview, 500); // Debounce to prevent too many updates

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [latexCode, processLatex]);

  // Highlight LaTeX syntax
  const highlight = useCallback(async (code: string) => {
    if (typeof window === 'undefined') return code;
    
    try {
      const Prism = await importPrism();
      if (!Prism) return code;
      
      // Import and register the LaTeX language if not already registered
      if (!Prism.languages.latex) {
        const registerPrismLatex = (await import('./PrismLatex')).default;
        registerPrismLatex();
      }
      
      const grammar = Prism.languages.latex || Prism.languages.markup || {};
      return Prism.highlight(code, grammar, 'latex');
    } catch (err) {
      console.error('Error highlighting code:', err);
      return code;
    }
  }, []);

  // Add tabSize prop to the editor
  const editorStyle = {
    fontFamily: '"Fira code", "Fira Mono", monospace',
    fontSize: '14px',
    backgroundColor: '#f8f9fa',
    borderRadius: '0.5rem',
    border: '1px solid #e9ecef',
    minHeight: '100%',
    outline: 'none',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">LaTeX Editor</h1>
        <p className="text-sm opacity-90">Type LaTeX on the left, see the preview on the right</p>
      </header>
      
      <div className="flex-1 overflow-hidden flex">
        <div className="flex w-full h-full">
          {/* Editor Pane */}
          <div className="w-1/2 h-full bg-white border-r border-gray-200 overflow-auto">
            <div className="p-4 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="h-full">
                  {isEditorReady && (
                    <div className="simple-code-editor h-full">
                      <SimpleCodeEditor
                        value={latexCode}
                        onValueChange={setLatexCode}
                        highlight={highlight}
                        padding={16}
                        tabSize={2}
                        insertSpaces={true}
                        ignoreTabKey={false}
                        style={{
                          fontFamily: 'Fira Code, Fira Mono, monospace',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          height: '100%',
                          outline: 'none',
                        }}
                        textareaClassName="editor-textarea"
                        preClassName="editor-pre"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Resize handle */}
          <div className="w-2 bg-gray-200 hover:bg-blue-300 cursor-col-resize" />
          
          {/* Preview Pane */}
          <div className="w-1/2 h-full overflow-auto bg-white p-4">
            {error ? (
              <div className="text-red-500 p-4 bg-red-50 rounded">
                <p className="font-bold">Error:</p>
                <p>{error}</p>
              </div>
            ) : (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                <p className="mt-4 text-sm text-gray-500">
                  Note: This is a basic preview. Complex LaTeX documents might not render correctly.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-200 p-2 text-center text-sm text-gray-600">
        {isLoading && <div className="inline-block mr-2">Rendering...</div>}
        LaTeX Editor - {new Date().getFullYear()}
      </footer>

      <style jsx global>{`
        .simple-code-editor {
          position: relative;
          height: 100%;
          font-family: 'Fira Code', 'Fira Mono', monospace;
          font-size: 14px;
          line-height: 1.5;
          color: #000;
          background: white;
        }
        
        .simple-code-editor > * {
          margin: 0;
          border: 0;
          background: none;
          box-sizing: border-box;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          tab-size: 2;
          white-space: pre !important;
        }
        
        .editor-textarea {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          padding: 16px;
          resize: none;
          color: inherit;
          caret-color: #000;
          z-index: 1;
          outline: none;
          overflow: auto;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          white-space: pre !important;
        }
        
        .editor-pre {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          padding: 16px;
          pointer-events: none;
          overflow: visible;
          z-index: 0;
          white-space: pre !important;
        }
        
        .editor-pre code {
          display: block;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          white-space: pre !important;
          background: transparent;
          color: transparent;
        }
        
        /* Show only the syntax highlighted parts */
        .editor-pre code .token {
          color: inherit !important;
        }
        
        /* Hide the raw HTML tags */
        .editor-pre code .token.tag,
        .editor-pre code .token.punctuation {
          color: transparent !important;
        }
        
        /* Syntax highlighting colors */
        .token.keyword { color: #7c4dff; }
        .token.string { color: #39b54a; }
        .token.comment { color: #9e9e9e; font-style: italic; }
        .token.function { color: #00bcd4; }
        .token.operator { color: #666; }
        .token.punctuation { color: #555; }
        .token.selector { color: #e53935; }
        .token.attr-name { color: #ff6f00; }
        .token.attr-value { color: #39b54a; }
      `}</style>
    </div>
  );
}
