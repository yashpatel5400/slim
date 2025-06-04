export interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
}

const DOCUMENTS_KEY = 'latex_editor_documents';

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }
};

export const getDocuments = (): Document[] => {
  try {
    const docsJson = safeLocalStorage.getItem(DOCUMENTS_KEY);
    if (!docsJson) return [];
    const parsed = JSON.parse(docsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing documents:', error);
    return [];
  }
};

export const getDocument = (id: string): Document | undefined => {
  try {
    const docs = getDocuments();
    return docs.find(doc => doc.id === id);
  } catch (error) {
    console.error('Error getting document:', error);
    return undefined;
  }
};

export const saveDocument = (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Document => {
  try {
    const docs = getDocuments();
    const now = new Date().toISOString();
    
    let updatedDoc: Document;
    
    if (doc.id) {
      // Update existing document
      const index = docs.findIndex(d => d.id === doc.id);
      if (index === -1) throw new Error('Document not found');
      
      updatedDoc = {
        ...docs[index],
        ...doc,
        updatedAt: now,
      };
      
      docs[index] = updatedDoc;
    } else {
      // Create new document
      const newDoc: Document = {
        ...doc,
        id: `doc_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      
      updatedDoc = newDoc;
      docs.push(updatedDoc);
    }
    
    safeLocalStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    return updatedDoc;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

export const deleteDocument = (id: string): void => {
  try {
    const docs = getDocuments().filter(doc => doc.id !== id);
    safeLocalStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const getDefaultDocument = (): Omit<Document, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: 'Untitled Document',
  content: `% Default LaTeX template with common packages and theorem environments
\\documentclass{article}

% Essential packages
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{float}
\\usepackage{mathtools}
\\usepackage{amsthm}
\\usepackage{subcaption}
\\usepackage{url}
\\usepackage{bbm}
\\usepackage{xcolor}
\\usepackage{enumitem}

% Theorem environments
\\theoremstyle{plain}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{proposition}[theorem]{Proposition}
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{corollary}[theorem]{Corollary}

\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{assumption}[theorem]{Assumption}

\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{Remark}
\\newtheorem{example}[theorem]{Example}

% Document information
\\title{My Document}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Hello, \\LaTeX! This is a sample document with common mathematical environments pre-configured.

\\begin{theorem}[Pythagorean Theorem]
In a right triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides:
\\begin{equation*}
a^2 + b^2 = c^2
\\end{equation*}
\\end{theorem}

\\begin{proof}
The proof is left as an exercise for the reader.
\\end{proof}

\\section{Getting Started}
Edit this document and click the 'Compile' button to see the PDF preview. You can use all the theorem environments and packages listed above.

\\end{document}`
});
