import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

function getPropertiesFilePath() {
  if (process.env.PORTAL_UPLOAD_DIR) {
    return path.join(path.dirname(process.env.PORTAL_UPLOAD_DIR), 'data', 'properties.json');
  }
  return path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'data', 'properties.json');
}

export async function GET() {
  try {
    const filePath = getPropertiesFilePath();
    if (!existsSync(filePath)) {
      return NextResponse.json([]);
    }
    const content = await readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch (e) {
    return NextResponse.json([]);
  }
}
