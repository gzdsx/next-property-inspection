import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET() {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json([]);
    }

    const files = await readdir(UPLOAD_DIR);
    // Only process the main records json
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('_meta.json') && !f.includes('_signed.json'));
    
    const reports = await Promise.all(
      jsonFiles.map(async (file) => {
        const id = file.replace('.json', '');
        const filePath = path.join(UPLOAD_DIR, file);
        const fileStat = await stat(filePath);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const records = JSON.parse(content);
          
          let address = '';
          let inspectorName = '';
          let coverPhoto = '';
          const metaPath = path.join(UPLOAD_DIR, `${id}_meta.json`);
          if (existsSync(metaPath)) {
            const metaContent = await readFile(metaPath, 'utf-8');
            try {
              const meta = JSON.parse(metaContent);
              address = meta.address || '';
              inspectorName = meta.inspectorName || '';
              // Support both formats:
              // - new: meta.coverPhoto = filename (e.g. '1234_cover.jpg')
              // - old/legacy: meta.coverPhotoBase64 = raw base64 (skip, cleanup script will fix)
              if (meta.coverPhoto && !meta.coverPhoto.startsWith('data:') && meta.coverPhoto.length < 200) {
                coverPhoto = meta.coverPhoto; // new format: already a filename
              }
              // If still a large base64/raw base64, don't send it - leave empty until cleanup runs
            } catch (e) {}
          }

          const isSigned = existsSync(path.join(UPLOAD_DIR, `${id}_signed.json`));
          
          return {
            id,
            timestamp: parseInt(id, 10), // Since id is Date.now() or Date.now()_random
            createdAt: fileStat.mtime.toISOString(),
            defectCount: Array.isArray(records) ? records.length : 0,
            address,
            inspectorName,
            coverPhoto, // filename like '1234_cover.jpg'
            isSigned
          };
        } catch (err) {
          console.error(`Failed to parse ${file}`, err);
          return null;
        }
      })
    );

    // Filter out nulls and sort by newest first
    const validReports = reports
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(validReports);
  } catch (error) {
    console.error('API /reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
