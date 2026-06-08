import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// -----------------------------------------------------------------------------
// 跨项目上传终点 (Cross-Project Upload Endpoint)
// -----------------------------------------------------------------------------
// 为了让原型系统能够实现"手机端一键结束，PC大屏立即查看"的连贯体验，
// 我们通过环境变量 PORTAL_UPLOAD_DIR 指向管理后台 (video-portal-demo) 的 public 目录，
// 这样手机端 Next.js 接收到数据后，直接将文件写入了后台项目的静态资源目录中，
// 从而免去了复杂的对象存储（如 AWS S3 或 OSS）的配置。
const UPLOAD_DIR = process.env.PORTAL_UPLOAD_DIR || path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'uploads');

export async function POST(req: NextRequest) {
  try {
    // 1. 解析前端传来的 FormData
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;
    const jsonFile = formData.get('json') as File | null;
    const metaFile = formData.get('meta') as File | null;

    if (!videoFile || !jsonFile) {
      return NextResponse.json({ error: 'Missing files' }, { status: 400 });
    }

    // 2. 确保目标文件夹存在，如果不存在则自动创建
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // 3. 生成基于时间戳+随机数的唯一 ID 作为这个巡检报告的标识
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Parse meta to extract coverPhoto and save as separate file
    let metaBuffer = metaFile ? Buffer.from(await metaFile.arrayBuffer()) : null;
    if (metaBuffer) {
      try {
        const metaObj = JSON.parse(metaBuffer.toString('utf-8'));
        // Check both field names with both formats:
        // - 'coverPhotoBase64': raw base64 (no data: prefix) from inspection app
        // - 'coverPhoto': full data URL (data:image/...) 
        const rawB64 = metaObj.coverPhotoBase64 || '';
        const dataUrl = metaObj.coverPhoto || '';
        let imgBuffer: Buffer | null = null;
        
        if (rawB64.length > 100) {
          // Raw base64 without data: prefix
          imgBuffer = Buffer.from(rawB64, 'base64');
        } else if (dataUrl.startsWith('data:image')) {
          const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
          if (matches) imgBuffer = Buffer.from(matches[1], 'base64');
        }
        
        if (imgBuffer && imgBuffer.length > 100) {
          await writeFile(path.join(UPLOAD_DIR, `${uniqueId}_cover.jpg`), imgBuffer);
          delete metaObj.coverPhotoBase64; // remove large base64 field
          metaObj.coverPhoto = `${uniqueId}_cover.jpg`; // store as filename
          metaBuffer = Buffer.from(JSON.stringify(metaObj, null, 2));
        }
      } catch (e) { /* keep original metaBuffer if parsing fails */ }
    }

    // 4. 保存录像文件（使用原始扩展名）
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const videoExt = videoFile.name.split('.').pop() || 'webm';
    await writeFile(path.join(UPLOAD_DIR, `${uniqueId}.${videoExt}`), videoBuffer);

    // 5. 保存巡检记录数据 (Records JSON)
    const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, `${uniqueId}.json`), jsonBuffer);

    // 6. 保存额外的元数据 (包含用户填写的属性地址、巡检员姓名和封面图)
    if (metaBuffer) {
      await writeFile(path.join(UPLOAD_DIR, `${uniqueId}_meta.json`), metaBuffer);
    }

    // 返回成功，并把生成的 ID 给前端，用于生成二维码
    return NextResponse.json({ success: true, reportId: uniqueId });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
