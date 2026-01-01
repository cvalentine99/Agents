import * as fs from 'fs';
import * as path from 'path';

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

export interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  entries: DirectoryEntry[];
  breadcrumbs: { name: string; path: string }[];
}

// Security: Allowed base paths for browsing
const ALLOWED_BASE_PATHS = [
  '/home/ubuntu',
  '/tmp',
];

// Security: Check if path is within allowed directories
function isPathAllowed(targetPath: string): boolean {
  const normalizedPath = path.normalize(targetPath);
  return ALLOWED_BASE_PATHS.some(basePath => 
    normalizedPath.startsWith(basePath) || normalizedPath === basePath
  );
}

// Security: Sanitize path to prevent traversal attacks
function sanitizePath(inputPath: string): string {
  // Remove null bytes
  let sanitized = inputPath.replace(/\0/g, '');
  // Normalize the path
  sanitized = path.normalize(sanitized);
  // Resolve to absolute path
  if (!path.isAbsolute(sanitized)) {
    sanitized = path.join('/home/ubuntu', sanitized);
  }
  return sanitized;
}

// Generate breadcrumbs for navigation
function generateBreadcrumbs(targetPath: string): { name: string; path: string }[] {
  const parts = targetPath.split('/').filter(Boolean);
  const breadcrumbs: { name: string; path: string }[] = [];
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    breadcrumbs.push({
      name: part,
      path: currentPath
    });
  }
  
  return breadcrumbs;
}

// List directory contents
export async function listDirectory(targetPath: string, directoriesOnly: boolean = true): Promise<BrowseResult> {
  const sanitizedPath = sanitizePath(targetPath);
  
  // Security check
  if (!isPathAllowed(sanitizedPath)) {
    throw new Error(`Access denied: Path "${sanitizedPath}" is outside allowed directories`);
  }
  
  // Check if path exists and is a directory
  try {
    const stats = await fs.promises.stat(sanitizedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path "${sanitizedPath}" is not a directory`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Directory not found: "${sanitizedPath}"`);
    }
    throw error;
  }
  
  // Read directory contents
  const items = await fs.promises.readdir(sanitizedPath, { withFileTypes: true });
  
  const entries: DirectoryEntry[] = [];
  
  for (const item of items) {
    // Skip hidden files/directories (starting with .)
    if (item.name.startsWith('.')) continue;
    
    const itemPath = path.join(sanitizedPath, item.name);
    const isDir = item.isDirectory();
    
    // If directoriesOnly, skip files
    if (directoriesOnly && !isDir) continue;
    
    try {
      const itemStats = await fs.promises.stat(itemPath);
      entries.push({
        name: item.name,
        path: itemPath,
        isDirectory: isDir,
        size: isDir ? undefined : itemStats.size,
        modifiedAt: itemStats.mtime
      });
    } catch {
      // Skip items we can't stat (permission issues, etc.)
      continue;
    }
  }
  
  // Sort: directories first, then alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Calculate parent path
  const parentPath = sanitizedPath === '/home/ubuntu' ? null : path.dirname(sanitizedPath);
  const safeParentPath = parentPath && isPathAllowed(parentPath) ? parentPath : null;
  
  return {
    currentPath: sanitizedPath,
    parentPath: safeParentPath,
    entries,
    breadcrumbs: generateBreadcrumbs(sanitizedPath)
  };
}

// Check if a path is a valid project directory (has package.json or similar)
export async function isProjectDirectory(targetPath: string): Promise<{
  isProject: boolean;
  projectType: string | null;
  indicators: string[];
}> {
  const sanitizedPath = sanitizePath(targetPath);
  
  if (!isPathAllowed(sanitizedPath)) {
    return { isProject: false, projectType: null, indicators: [] };
  }
  
  const indicators: string[] = [];
  let projectType: string | null = null;
  
  // Check for various project indicators
  const projectFiles = [
    { file: 'package.json', type: 'Node.js' },
    { file: 'Cargo.toml', type: 'Rust' },
    { file: 'requirements.txt', type: 'Python' },
    { file: 'pyproject.toml', type: 'Python' },
    { file: 'go.mod', type: 'Go' },
    { file: 'pom.xml', type: 'Java/Maven' },
    { file: 'build.gradle', type: 'Java/Gradle' },
    { file: 'Gemfile', type: 'Ruby' },
    { file: 'composer.json', type: 'PHP' },
    { file: '.git', type: 'Git Repository' },
  ];
  
  for (const { file, type } of projectFiles) {
    const filePath = path.join(sanitizedPath, file);
    try {
      await fs.promises.access(filePath);
      indicators.push(file);
      if (!projectType) projectType = type;
    } catch {
      // File doesn't exist, continue
    }
  }
  
  return {
    isProject: indicators.length > 0,
    projectType,
    indicators
  };
}

// Get recent directories (from a stored list)
export function getRecentDirectories(): string[] {
  // This would typically be stored in a database per user
  // For now, return some common project locations
  return [
    '/home/ubuntu/coding-wheel',
    '/home/ubuntu',
  ];
}

// Create a new directory
export async function createDirectory(parentPath: string, dirName: string): Promise<string> {
  const sanitizedParent = sanitizePath(parentPath);
  
  if (!isPathAllowed(sanitizedParent)) {
    throw new Error('Access denied: Cannot create directory in this location');
  }
  
  // Sanitize directory name
  const safeDirName = dirName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const newPath = path.join(sanitizedParent, safeDirName);
  
  if (!isPathAllowed(newPath)) {
    throw new Error('Access denied: Invalid directory name');
  }
  
  await fs.promises.mkdir(newPath, { recursive: true });
  return newPath;
}
