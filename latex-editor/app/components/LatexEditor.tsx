'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface LatexEditorProps {
  theme?: "light" | "vs-dark";
  
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Common LaTeX environments and commands
const latexSnippets = [
  // Environments
  { label: 'document', insertText: 'document{\n\t$0\n}' },
  { label: 'itemize', insertText: 'begin{itemize}\n\t\\item $0\n\\end{itemize}' },
  { label: 'enumerate', insertText: 'begin{enumerate}\n\t\\item $0\n\\end{enumerate}' },
  { label: 'equation', insertText: 'begin{equation}\n\t$0\n\\end{equation}' },
  { label: 'align', insertText: 'begin{align}\n\t$0\n\\end{align}' },
  { label: 'figure', insertText: 'begin{figure}[h]\n\t\\centering\n\t\\includegraphics[width=0.8\\textwidth]{$1}\n\t\\caption{$2}\n\t\\label{fig:$3}\n\\end{figure}\n$0' },
  // Common commands
  { label: 'section', insertText: 'section{$1}\n$0' },
  { label: 'subsection', insertText: 'subsection{$1}\n$0' },
  { label: 'textbf', insertText: 'textbf{$1}$0' },
  { label: 'textit', insertText: 'textit{$1}$0' },
  { label: 'emph', insertText: 'emph{$1}$0' },
  { label: 'cite', insertText: 'cite{$1}$0' },
  { label: 'ref', insertText: 'ref{$1}$0' },
  { label: 'label', insertText: 'label{$1}$0' },
  { label: 'frac', insertText: 'frac{$1}{$2}$0' },
  { label: 'sqrt', insertText: 'sqrt{$1}$0' },
  { label: 'sum', insertText: 'sum_{$1}^{$2} $0' },
  { label: 'int', insertText: 'int_{$1}^{$2} $0' },
  { label: 'left', insertText: 'left( $1 \\right)$0' },
  { label: 'right', insertText: 'right) $0' },
];

// Convert snippets to Monaco completion items
const getLatexCompletions = (): any[] => {
  return latexSnippets.map(snippet => ({
    label: `\\${snippet.label}`,
    kind: 14, // Snippet
    insertText: snippet.insertText.startsWith('\\') ? snippet.insertText : `\\${snippet.insertText}`,
    insertTextRules: 4, // AdjustIndentation
    documentation: `LaTeX ${snippet.label} ${snippet.label.includes('begin') ? 'environment' : 'command'}`,
    detail: 'LaTeX Snippet',
    range: undefined,
  }));
};

export default function LatexEditor({  value, onChange, className = '' , theme = "light" }: LatexEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Handle editor mount
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);
    
    // Focus the editor
    editor.focus();
    
    // Set up custom commands and keybindings
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => {
        // Save functionality can be handled by parent
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          metaKey: true
        }));
      }
    );
  };

  // Set up LaTeX language support
  useEffect(() => {
    if (isEditorReady && typeof window !== "undefined" && window.monaco) {
      // Register a new language for LaTeX
      monaco.languages.register({ id: 'latex' });
      
      // Set up syntax highlighting
      monaco.languages.setMonarchTokensProvider('latex', {
        defaultToken: '',
        tokenPostfix: '.tex',
        
        // Common LaTeX patterns
        escapes: /\\(?:[\w-]|[^\x00-\x7F])/,
        symbols: /[=><!~?:&|+\-*\/^%]+/,
        
        // Main tokenizer
        tokenizer: {
          root: [
            // Commands
            [/\\[a-zA-Z_\x80-\uFFFF]+/, 'tag'],
            
            // Math mode
            [/\$\$/, { token: 'keyword', bracket: '@open', next: '@math' }],
            [/\$/, { token: 'keyword', bracket: '@open', next: '@inline_math' }],
            
            // Comments
            [/%.*$/, 'comment'],
            
            // Delimiters
            [/[{}()\[\]]/, '@brackets'],
            [/[<>]/, 'delimiter.html'],
            
            // Numbers
            [/\d+[\w\d]*/, 'number'],
            
            // Text
            [/[^\\%\$\{\}\s]+/, 'string'],
          ],
          
          math: [
            [/(\$\$)/, { token: 'keyword', bracket: '@close', next: '@pop' }],
            [/[^\$]+/, 'string'],
            [/\$/, 'string']
          ],
          
          inline_math: [
            [/([^\\]|^)(\$)/, { token: 'keyword', bracket: '@close', next: '@pop' }],
            [/[^\$]+/, 'string'],
            [/\$/, 'string']
          ]
        }
      });
      
      // Register completion provider
      monaco.languages.registerCompletionItemProvider('latex', {
        provideCompletionItems: (model, position) => {
          // Get text until the position
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });
          
          // Check if we're after a backslash
          const match = textUntilPosition.match(/\\[a-zA-Z]*$/);
          if (!match) {
            return { suggestions: [] };
          }
          
          const suggestions = getLatexCompletions();
          return { suggestions };
        }
      });
      
      // Set up auto-closing pairs
      monaco.languages.setLanguageConfiguration('latex', {
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '`', close: '`' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: '`', close: "'" },
          { open: '"', close: '"\n' },
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '`', close: '`' },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: '`', close: "'" },
          { open: '"', close: '"\n' },
        ],
      });
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [isEditorReady, theme]);

  // Update theme when it changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.monaco) {
      window.monaco.editor.setTheme(theme);
    }
  }, [theme]);

  return (
    <div className={`h-full w-full ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="latex"
        value={value}
        onChange={(value) => onChange(value || '')}
        onMount={(editor, monaco) => handleEditorDidMount(editor, monaco)}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          fontFamily: '"Fira Code", "Fira Mono", monospace',
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          theme: theme,
        }}
      />
    </div>
  );
}
