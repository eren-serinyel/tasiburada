import fs from 'fs/promises';
import path from 'path';
import { PATHS } from './config.js';
import { Artifact } from './types.js';

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

export async function readArtifact(filename: string): Promise<Artifact | null> {
  const fullPath = path.join(PATHS.ARTIFACTS, filename);
  try {
    const data = await fs.readFile(fullPath, 'utf8');
    if (!data.trim()) return null;
    return JSON.parse(stripBOM(data));
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      console.error(`Error reading artifact ${filename}:`, e.message);
    }
    return null;
  }
}

export async function listArtifacts(): Promise<string[]> {
  try {
    const files = await fs.readdir(PATHS.ARTIFACTS);
    return files.filter(f => f.endsWith('-result.json'));
  } catch (error) {
    console.error('Error listing artifacts:', error);
    return [];
  }
}
