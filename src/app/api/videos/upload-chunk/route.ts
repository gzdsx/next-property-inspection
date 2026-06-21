import {NextRequest, NextResponse} from 'next/server';
import {writeFile, mkdir} from 'fs/promises';
import {existsSync} from 'fs';
import path from 'path';

const CHUNKS_DIR = path.join(process.cwd(), '.temp', 'chunks');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const fileId = formData.get('file_id') as string;
        const chunkIndex = formData.get('chunk_index') as string;
        const chunk = formData.get('file') as File;

        if (!fileId || chunkIndex === null || !chunk) {
            return NextResponse.json({error: 'Missing required fields'}, {status: 400});
        }

        const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
        const chunkDir = path.join(CHUNKS_DIR, safeFileId);
        if (!existsSync(chunkDir)) {
            await mkdir(chunkDir, {recursive: true});
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());
        const safeIndex = parseInt(chunkIndex, 10);
        await writeFile(path.join(chunkDir, `chunk_${safeIndex}`), buffer);

        return NextResponse.json({success: true, chunkIndex: Number(chunkIndex)});
    } catch (error: any) {
        console.error('[Upload Chunk Error]:', error);
        return NextResponse.json({error: error.message || 'Chunk upload failed'}, {status: 500});
    }
}

export const maxDuration = 60;
