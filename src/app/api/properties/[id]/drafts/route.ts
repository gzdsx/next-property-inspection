import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const PROPS_FILE = path.join(process.cwd(), 'public', 'data', 'properties.json');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const content = await readFile(PROPS_FILE, 'utf-8');
    const props = JSON.parse(content);
    const prop = props.find((p: any) => p.id === id);
    return NextResponse.json(prop?.drafts || []);
  } catch (e) {
    return NextResponse.json([]);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { drafts } = await req.json();
    const content = await readFile(PROPS_FILE, 'utf-8');
    const props = JSON.parse(content);
    const idx = props.findIndex((p: any) => p.id === id);
    if (idx !== -1) {
      props[idx].drafts = drafts;
      await writeFile(PROPS_FILE, JSON.stringify(props, null, 2), 'utf-8');
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
