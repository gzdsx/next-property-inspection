import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
    }

    const JOBS_DIR = path.join(process.cwd(), '.temp', 'jobs');
    const jobFile = path.join(JOBS_DIR, `${jobId}.json`);

    if (!existsSync(jobFile)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const content = await readFile(jobFile, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get job status' }, { status: 500 });
  }
}
