import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const DEFAULT_PROFILE = {
  companyName: 'Irish PropTech Agency',
  inspectorName: 'Steven Smith',
  phone: '07701 068531',
  email: 'inspector@irishproptech.ie',
  reference: '035474'
};

function getProfileFilePath() {
  if (process.env.PORTAL_UPLOAD_DIR) {
    // If upload dir is defined, data dir should be next to uploads folder (public/data)
    return path.join(path.dirname(process.env.PORTAL_UPLOAD_DIR), 'data', 'inspector_profile.json');
  }
  return path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'data', 'inspector_profile.json');
}

export async function GET() {
  try {
    const filePath = getProfileFilePath();
    if (!existsSync(filePath)) {
      return NextResponse.json(DEFAULT_PROFILE);
    }
    const content = await readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(content));
  } catch (e) {
    return NextResponse.json(DEFAULT_PROFILE);
  }
}

export async function POST(req: Request) {
  try {
    const newProfile = await req.json();
    const filePath = getProfileFilePath();
    
    // Ensure parent dir exists (it should be created by video-portal-demo ensureDataDir, but let's be safe)
    const dir = path.dirname(filePath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await writeFile(filePath, JSON.stringify(newProfile, null, 2), 'utf-8');
    return NextResponse.json({ success: true, profile: newProfile });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
