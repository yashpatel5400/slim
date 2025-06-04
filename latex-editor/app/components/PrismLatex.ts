// This file contains the LaTeX language definition for Prism.js

const registerPrismLatex = () => {
  if (typeof window === 'undefined' || !window.Prism) return;
  
  const Prism = window.Prism;
  
  // Define LaTeX language grammar
  const latexGrammar: any = {
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

  // Add the LaTeX language to Prism
  (Prism.languages as any).latex = latexGrammar;

  // Add LaTeX to markup languages if markup exists
  if (Prism.languages.markup) {
    (Prism.languages.markup as any).latex = latexGrammar;
  }
};

export default registerPrismLatex;
