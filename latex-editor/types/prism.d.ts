import 'prismjs';

declare module 'prismjs' {
  interface Token {
    type: string;
    content: string | Token[];
    alias?: string | string[];
  }

  interface TokenStream extends Array<Token | string> {}

  interface Grammar {
    [key: string]: any;
  }

  interface Languages {
    [key: string]: Grammar | undefined;
    latex?: Grammar;
    markup?: Grammar;
  }


  interface PrismType {
    highlight: (text: string, grammar: Grammar, language: string) => string;
    languages: Languages;
  }
}

declare global {
  interface Window {
    Prism?: import('prismjs').PrismType;
  }
}

export {};
