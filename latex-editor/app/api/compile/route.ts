import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    // Create a temporary directory for LaTeX compilation
    const tempDir = tmpdir();
    const tempFile = join(tempDir, `latex-${Date.now()}.tex`);
    const outputFile = tempFile.replace(/\.tex$/, '.pdf');

    // Write the LaTeX content to a temporary file
    await writeFile(tempFile, content);

    // Compile the LaTeX file to PDF
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const latex = spawn('pdflatex', [
        '-interaction=nonstopmode',
        '-halt-on-error',
        `-output-directory=${tempDir}`,
        tempFile
      ]);

      let errorOutput = '';
      let output = '';

      latex.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      latex.stdout.on('data', (data) => {
        output += data.toString();
      });

      latex.on('close', async (code) => {
        try {
          if (code !== 0) {
            throw new Error(`LaTeX compilation failed: ${errorOutput || output}`);
          }
          
          // Read the generated PDF
          const fs = await import('fs/promises');
          const pdf = await fs.readFile(outputFile);
          
          // Clean up temporary files
          await Promise.all([
            fs.unlink(tempFile),
            fs.unlink(outputFile),
            fs.unlink(outputFile.replace(/\.pdf$/, '.log')),
            fs.unlink(outputFile.replace(/\.pdf$/, '.aux'))
          ].map(p => p.catch(() => {})));
          
          resolve(pdf);
        } catch (error) {
          reject(error);
        }
      });
    });

    // Return the PDF as a base64 string
    const pdfBase64 = pdfBuffer.toString('base64');
    return NextResponse.json({ pdf: pdfBase64 });

  } catch (error) {
    console.error('LaTeX compilation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compile LaTeX' },
      { status: 500 }
    );
  }
}
