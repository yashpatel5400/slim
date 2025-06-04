// This file contains the LaTeX language definition for Prism.js

// Register the LaTeX language with Prism
if (typeof window !== 'undefined' && window.Prism) {
  const Prism = window.Prism;
  
  // Define LaTeX language
  (Prism.languages as any).latex = {
    'comment': /%[^\r\n]*/,
    'string': {
      pattern: /([\s\[])(\\(?:[a-z]+\*?|.)(?:\s*\[[^\]]*\])*\{[^}]*\})/i,
      lookbehind: true,
      greedy: true,
      inside: {
        'keyword': /^\\(?:[a-z]+\*?|.)/i,
        'punctuation': /[\[\]{}]/,
        'string': /[\s\S]+/
      }
    },
    'keyword': /\\(?:[a-z]+\*?|.)/i,
    'punctuation': /[\[\]{}&]/
  };

  // Add the LaTeX language to the list of known languages
  Prism.languages.markup = Prism.languages.markup || {};
  (Prism.languages.markup as any).latex = Prism.languages.latex;
}

export {};
