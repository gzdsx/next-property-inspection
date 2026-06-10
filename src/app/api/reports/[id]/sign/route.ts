import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing report ID' }, { status: 400 });
    }

    const { signature } = await request.json();

    const signedMarkerPath = path.join(UPLOAD_DIR, `${id}_signed.json`);
    
    // Save signature along with signedAt timestamp
    await writeFile(signedMarkerPath, JSON.stringify({ 
      signedAt: new Date().toISOString(),
      signature: signature || ""
    }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API /reports/[id]/sign error:', error);
    return NextResponse.json({ error: 'Failed to record signature' }, { status: 500 });
  }
}
