import {NextRequest, NextResponse} from 'next/server';
import {readFile, writeFile, mkdir, readdir, rm} from 'fs/promises';
import {existsSync} from 'fs';
import path from 'path';

const CHUNKS_DIR = path.join(process.cwd(), '.temp', 'chunks');
const VIDEOS_DIR = path.join(process.cwd(), '.temp', 'videos');

export async function POST(req: NextRequest) {
    try {
        const {file_id, file_ext, total_chunks} = await req.json();

        if (!file_id || !total_chunks) {
            return NextResponse.json({error: 'Missing required fields'}, {status: 400});
        }

        const safeFileId = file_id.replace(/[^a-zA-Z0-9_-]/g, '');
        const chunkDir = path.join(CHUNKS_DIR, safeFileId);
        if (!existsSync(chunkDir)) {
            return NextResponse.json({error: 'Chunks not found'}, {status: 404});
        }

        if (!existsSync(VIDEOS_DIR)) {
            await mkdir(VIDEOS_DIR, {recursive: true});
        }

        const chunks: Buffer[] = [];
        for (let i = 0; i < total_chunks; i++) {
            const chunkPath = path.join(chunkDir, `chunk_${i}`);
            if (!existsSync(chunkPath)) {
                return NextResponse.json({error: `Missing chunk ${i}`}, {status: 400});
            }
            chunks.push(await readFile(chunkPath));
        }

        const safeExt = (file_ext || 'mp4').replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${safeFileId}.${safeExt}`;
        const filePath = path.join(VIDEOS_DIR, fileName);
        await writeFile(filePath, Buffer.concat(chunks));

        await rm(chunkDir, {recursive: true, force: true});

        return NextResponse.json({
            success: true,
            fileId: safeFileId,
            filePath,
            fileName,
        });
    } catch (error: any) {
        console.error('[Merge Chunks Error]:', error);
        return NextResponse.json({error: error.message || 'Merge failed'}, {status: 500});
    }
}
