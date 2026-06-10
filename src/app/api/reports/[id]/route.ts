import { NextResponse } from 'next/server';
import { unlink, writeFile, readdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    const jsonPath = path.join(UPLOAD_DIR, `${id}.json`);
    const metaPath = path.join(UPLOAD_DIR, `${id}_meta.json`);
    const signedPath = path.join(UPLOAD_DIR, `${id}_signed.json`);

    try {
      await unlink(jsonPath);
    } catch (e) {}

    try {
      await unlink(metaPath);
    } catch (e) {}

    try {
      await unlink(signedPath);
    } catch (e) {}

    // Also delete any video file (could be .webm, .mp4, .mov, etc.)
    try {
      const allFiles = await readdir(UPLOAD_DIR);
      const videoFiles = allFiles.filter(f => f.startsWith(`${id}.`) && !f.endsWith('.json'));
      for (const vf of videoFiles) {
        try { await unlink(path.join(UPLOAD_DIR, vf)); } catch (e) {}
      }
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API DELETE /reports/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    const body = await request.json();
    const jsonPath = path.join(UPLOAD_DIR, `${id}.json`);
    
    await writeFile(jsonPath, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API PUT /reports/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update report' }, { status: 500 });
  }
}
