/**
 * RAG File Upload Service
 * Handles file parsing for PDF, Markdown, and code files
 */

import * as pdfParse from "pdf-parse";
const pdf = ((pdfParse as Record<string, unknown>).default || pdfParse) as (
  buffer: Buffer
) => Promise<{ text: string; numpages: number }>;

// Supported file extensions and their MIME types
export const SUPPORTED_FILE_TYPES = {
  // Documents
  ".pdf": "application/pdf",
  ".md": "text/markdown",
  ".txt": "text/plain",

  // Code files
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".py": "text/x-python",
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".html": "text/html",
  ".css": "text/css",
  ".sql": "text/sql",
  ".sh": "text/x-shellscript",
  ".bash": "text/x-shellscript",
} as const;

export type SupportedExtension = keyof typeof SUPPORTED_FILE_TYPES;

export interface ParsedFile {
  content: string;
  metadata: {
    filename: string;
    extension: string;
    mimeType: string;
    pageCount?: number;
    wordCount: number;
    charCount: number;
  };
}

/**
 * Check if a file extension is supported
 */
export function isSupportedFileType(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext in SUPPORTED_FILE_TYPES;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Get MIME type for a file extension
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename) as SupportedExtension;
  return SUPPORTED_FILE_TYPES[ext] || "application/octet-stream";
}

/**
 * Parse PDF file and extract text content
 */
async function parsePDF(
  buffer: Buffer
): Promise<{ text: string; pageCount: number }> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parse Markdown file with basic formatting preservation
 */
function parseMarkdown(content: string): string {
  // Keep the markdown as-is for better context
  // The chunking will handle section boundaries
  return content;
}

/**
 * Parse code file with language detection
 */
function parseCodeFile(content: string, extension: string): string {
  // Add language hint for better context
  const languageMap: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".py": "Python",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".html": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
    ".sh": "Shell",
    ".bash": "Bash",
  };

  const language = languageMap[extension] || "Code";
  return `[${language} File]\n\n${content}`;
}

/**
 * Main file parsing function
 */
export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedFile> {
  const extension = getFileExtension(filename);
  const mimeType = getMimeType(filename);

  if (!isSupportedFileType(filename)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  let content: string;
  let pageCount: number | undefined;

  if (extension === ".pdf") {
    const pdfResult = await parsePDF(buffer);
    content = pdfResult.text;
    pageCount = pdfResult.pageCount;
  } else {
    // Text-based files
    const textContent = buffer.toString("utf-8");

    if (extension === ".md") {
      content = parseMarkdown(textContent);
    } else if (extension in SUPPORTED_FILE_TYPES && extension !== ".txt") {
      content = parseCodeFile(textContent, extension);
    } else {
      content = textContent;
    }
  }

  // Calculate word and character counts
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  return {
    content,
    metadata: {
      filename,
      extension,
      mimeType,
      pageCount,
      wordCount,
      charCount,
    },
  };
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  return size <= MAX_SIZE;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract title from file content
 */
export function extractTitleFromContent(
  content: string,
  filename: string
): string {
  // Try to extract title from markdown heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try to extract from first non-empty line
  const firstLine = content.split("\n").find(line => line.trim().length > 0);
  if (firstLine && firstLine.length < 100) {
    return firstLine.trim();
  }

  // Fall back to filename without extension
  return filename.replace(/\.[^.]+$/, "");
}

/**
 * Detect source type from file extension
 */
export function detectSourceType(
  extension: string
): "file" | "code" | "documentation" {
  const codeExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".json",
    ".yaml",
    ".yml",
    ".html",
    ".css",
    ".sql",
    ".sh",
    ".bash",
  ];
  const docExtensions = [".md", ".txt", ".pdf"];

  if (codeExtensions.includes(extension)) {
    return "code";
  }
  if (docExtensions.includes(extension)) {
    return "documentation";
  }
  return "file";
}
