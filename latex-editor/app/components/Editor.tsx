'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'katex/dist/katex.min.css';

// Type definitions
declare global {
  interface Window {
    Prism?: typeof import('prismjs');
  }
}

// Import Prism types
import 'prismjs';

type PrismToken = {
  type: string;
  content: string | PrismToken[];
  alias?: string | string[];
};

// Import components with proper typing
const CodeEditor = dynamic<{
  value: string;
  onValueChange: (code: string) => void;
  highlight: (code: string) => Promise<string>;
  padding: number;
  style: React.CSSProperties;
  className?: string;
}>(
  () => import('react-simple-code-editor').then(mod => mod.default),
  { ssr: false }
);

const Split = dynamic(
  () => import('react-split').then(mod => mod.default),
  { ssr: false }
);

// Import PrismJS for syntax highlighting
const importPrism = async () => {
  if (typeof window !== 'undefined') {
    const Prism = await import('prismjs');
    // Import the LaTeX language definition
    await import('./PrismLatex');
    return Prism;
  }
  return null;
};

// Import KaTeX for rendering LaTeX
const importKatex = async () => {
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
            
            if ('renderToString' in katex) {
              html += (katex as any).renderToString(mathContent, {
                throwOnError: false,
                displayMode
              });
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
    try {
      const Prism = await importPrism();
      if (Prism?.highlight) {
        // Ensure the LaTeX language is loaded
        if (!(Prism.languages as any).latex) {
          await import('./PrismLatex');
        }
        
        return Prism.highlight(
          code,
          (Prism.languages as any).latex || (Prism.languages as any).markup || {},
          'latex'
        );
      }
      return code;
    } catch (err) {
      console.error('Error highlighting code:', err);
      return code;
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">LaTeX Editor</h1>
        <p className="text-sm opacity-80">Type LaTeX on the left, see the preview on the right</p>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <Split
          className="split h-full"
          sizes={[50, 50]}
          minSize={300}
          expandToMin={false}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
        >
          <div className="h-full overflow-auto bg-gray-900 p-4">
            {typeof window !== 'undefined' && CodeEditor ? (
              <CodeEditor
                value={latexCode}
                onValueChange={code => setLatexCode(code)}
                highlight={highlight}
                padding={10}
                style={{
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                  fontSize: 14,
                  minHeight: '100%',
                  color: '#f8f8f2',
                  backgroundColor: '#1e1e1e',
                }}
                className="h-full"
              />
            ) : (
              <textarea
                className="w-full h-full p-2 bg-gray-800 text-white font-mono"
                value={latexCode}
                onChange={(e) => setLatexCode(e.target.value)}
              />
            )}
          </div>
          
          <div 
            ref={previewRef}
            className="h-full overflow-auto bg-white p-6 prose max-w-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4 bg-red-50 rounded">
                <p className="font-bold">Error:</p>
                <p>{error}</p>
                <p className="mt-2 text-sm">
                  Note: This is a basic preview. Complex LaTeX documents might not render correctly.
                </p>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        </Split>
      </div>
      
      <footer className="bg-gray-800 text-white text-xs p-2 text-center">
        LaTeX Editor - {new Date().getFullYear()}
      </footer>
    </div>
  );
}
