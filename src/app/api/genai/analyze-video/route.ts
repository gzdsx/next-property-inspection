import {NextRequest, NextResponse} from 'next/server';
import {GoogleGenAI, Type} from '@google/genai';
import {writeFile, mkdir, unlink, copyFile} from 'fs/promises';
import path from 'path';
import {existsSync} from 'fs';

// -----------------------------------------------------------------------------
// 跨项目上传与存储 (Cross-Project Save & Upload Locations)
// -----------------------------------------------------------------------------
const UPLOAD_DIR = process.env.PORTAL_UPLOAD_DIR || path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'uploads');
const TEMP_DIR = path.join(process.cwd(), '.temp');
const JOBS_DIR = path.join(TEMP_DIR, 'jobs');

interface BackgroundParams {
    uniqueId: string;
    tempFilePath: string;
    ext: string;
    address: string | null;
    inspectorName: string | null;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    reference: string | null;
    coverPhoto: string | null;
    apiKey: string;
    mimeType: string;
    originalFileName: string;
}

export async function POST(req: NextRequest) {
    let tempFilePath = '';

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({error: 'GEMINI_API_KEY is missing'}, {status: 500});
        }

        // 1. 解析前端传来的 FormData
        const formData = await req.formData();
        const videoFile = formData.get('video') as File | null;
        const address = formData.get('address') as string | null;
        const inspectorName = formData.get('inspectorName') as string | null;
        const companyName = formData.get('companyName') as string | null;
        const phone = formData.get('phone') as string | null;
        const email = formData.get('email') as string | null;
        const reference = formData.get('reference') as string | null;
        const coverPhoto = formData.get('coverPhoto') as string | null; // dataUrl/base64 string

        if (!videoFile) {
            return NextResponse.json({error: 'Video file is required'}, {status: 400});
        }

        // 2. 确保本地临时目录、上传目录和任务跟踪目录存在
        if (!existsSync(TEMP_DIR)) {
            await mkdir(TEMP_DIR, {recursive: true});
        }
        if (!existsSync(JOBS_DIR)) {
            await mkdir(JOBS_DIR, {recursive: true});
        }
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, {recursive: true});
        }

        const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ext = path.extname(videoFile.name) || '.webm';
        tempFilePath = path.join(TEMP_DIR, `${uniqueId}${ext}`);

        // 3. 把上传的视频流临时写入本地文件 (在此处完成上传，以便后续后台访问)
        const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
        await writeFile(tempFilePath, videoBuffer);
        console.log(`[Offline Video Upload] Video saved locally: ${tempFilePath}`);

        // 4. 初始化并在本地注册一个 Job 状态为 processing
        const jobStatus = {
            jobId: uniqueId,
            status: 'processing',
            address: address || "Offline Property Video",
            inspectorName: inspectorName || "Offline Inspector",
            createdAt: new Date().toISOString(),
        };
        await writeFile(path.join(JOBS_DIR, `${uniqueId}.json`), JSON.stringify(jobStatus, null, 2), 'utf-8');

        // 5. 启动非阻塞的后台处理 worker (不加 await 立即响应前端)
        runBackgroundAnalysis({
            uniqueId,
            tempFilePath,
            ext,
            address,
            inspectorName,
            companyName,
            phone,
            email,
            reference,
            coverPhoto,
            apiKey,
            mimeType: videoFile.type || 'video/webm',
            originalFileName: videoFile.name
        }).catch(err => {
            console.error(`[Offline Video Async] Background Thread Crash for Job ${uniqueId}:`, err);
        });

        // 6. 立即返回响应给前端，告知任务已提交后台处理
        return NextResponse.json({
            success: true,
            jobId: uniqueId,
            status: 'processing',
            message: '视频上传成功，AI 深度分析已在后台异步启动，您可以安全关闭或退出当前页面。'
        });

    } catch (error: any) {
        console.error('[Offline Video Upload Error]:', error);
        return NextResponse.json({error: error.message || 'Upload and job start failed'}, {status: 500});
    }
}

// -----------------------------------------------------------------------------
// 异步后台分析 Worker 线程实现
// -----------------------------------------------------------------------------
async function runBackgroundAnalysis(params: BackgroundParams) {
    const {
        uniqueId,
        tempFilePath,
        ext,
        address,
        inspectorName,
        companyName,
        phone,
        email,
        reference,
        coverPhoto,
        apiKey,
        mimeType,
        originalFileName
    } = params;

    let uploadedFileRef: any = null;
    console.log(`[Offline Video Async] Starting Background Job: ${uniqueId}`);

    try {
        // 1. 初始化 Google GenAI SDK 并通过 File API 上传视频
        const ai = new GoogleGenAI({apiKey});

        console.log(`[Offline Video Async] [Job ${uniqueId}] Uploading video to Gemini File API: ${tempFilePath}`);
        uploadedFileRef = await ai.files.upload({
            file: tempFilePath,
            config: {
                mimeType: mimeType,
                displayName: `inspection_${uniqueId}`
            }
        });
        console.log(`[Offline Video Async] [Job ${uniqueId}] Upload to Gemini completed. File URI: ${uploadedFileRef.uri}`);

        // 2. ⏳ 轮询等待 Google File API 将视频处理为 ACTIVE 状态
        console.log(`[Offline Video Async] [Job ${uniqueId}] Waiting for file to become ACTIVE (polling)...`);
        const MAX_POLLS = 100;      // 最多轮询 100 次 = 约 5 分钟
        const POLL_INTERVAL = 3000; // 每 3 秒查一次

        for (let i = 0; i < MAX_POLLS; i++) {
            const fileInfo = await ai.files.get({name: uploadedFileRef.name});
            console.log(`[Offline Video Async] [Job ${uniqueId}] Poll ${i + 1}: state = ${(fileInfo as any).state}`);

            if ((fileInfo as any).state === 'ACTIVE') {
                uploadedFileRef = fileInfo; // 用最新的 fileInfo 替换（含完整 uri/mimeType）
                console.log(`[Offline Video Async] [Job ${uniqueId}] File is ACTIVE after ${i + 1} polls. Proceeding to analysis.`);
                break;
            }

            if ((fileInfo as any).state === 'FAILED') {
                throw new Error(`Google File API processing failed for file: ${uploadedFileRef.name}`);
            }

            if (i === MAX_POLLS - 1) {
                throw new Error(`Timeout: File ${uploadedFileRef.name} did not become ACTIVE after ${MAX_POLLS * POLL_INTERVAL / 1000}s`);
            }

            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }

        // 3. 调用 Gemini 3.5 Flash 模型做多模态视音频结构化提取
        const systemInstruction = `You are an expert Property Inspection Assistant for an Irish real estate agency.
Your role is to carefully watch the uploaded inspection video, listen to the inspector's spoken descriptions and explanations, and extract a complete list of inspected items and defects.

CRITICAL ROOM NAMING STANDARD:
You MUST ALWAYS map, normalize, and save the room/area name in the extracted JSON array using the unified standard room naming conventions, regardless of what the inspector verbally calls it in the narration. NEVER use loose, colloquial, or non-standard spoken names.
Unified Room Naming Mapping rules:
- Bedrooms -> Use "Bedroom 1", "Bedroom 2", "Bedroom 3", etc. (Numbered starting from 1)
- Ensuite Bathrooms -> Use "Ensuite Bathroom 1", "Ensuite Bathroom 2", etc. (For bathrooms inside bedrooms)
- Main Bathrooms -> Use "Main Bathroom" (or "Main Bathroom 1" etc. if multiple)
- Living/Sitting Rooms -> Use "Living Room" or "Sitting Room"
- Kitchen Type -> Use "Kitchen" or "Kitchen/Living Combo"
- Hallway & Landing -> Use "Hallway", "Stairs", "Landing"
- Study / Office -> Use "Study" or "Office"
- Utility / Laundry Room -> Use "Utility Room"
- Guest WC -> Use "Guest WC"
- HP / Storage Closets -> Use "Storage Closet" or "Hot Press"
- Exterior/Garden -> Use "Exterior Front", "Exterior Rear", "Garden" or "Patio"
If the inspector verbally says "BR1", "first bedroom", "main bed" or "bedroom", map it to "Bedroom 1". If they say "family bath" or "bath", map it to "Main Bathroom". If they say "lounge", map it to "Living Room". If they say "laundry", map it to "Utility Room". If they say "downstairs toilet", map it to "Guest WC". Strictly enforce these mapped terms.

INSPECTION EXTRACTION RULES:
1. You MUST examine both the visual details in the video and the audio narrative.
2. For each inspected item, extract:
   - room_name: The room or area in ENGLISH, strictly normalized (e.g. LIVING ROOM, KITCHEN, BEDROOM 1, HALLWAY, EXTERIOR FRONT). Map and translate inspector's verbal words.
   - item_name: The standard item name in ENGLISH (e.g. Flooring, Walls, Ceiling, Radiator, Window, Door, Lighting, Kitchen Sink).
   - description: Material or specific type of the item, in ENGLISH (e.g. Oak laminate flooring, Painted plaster walls, UPVC Double glazed window). Translate from Chinese if spoken.
   - condition: The physical condition of the item. You MUST strictly evaluate and rate it on this 5-level scale: "New Item", "Good", "Fair", "Poor", or "Very Poor". Do NOT use any other free-text, colloquial phrases, or Chinese words.
   - severity: If there is a damage/issue, classify severity as "Low", "Medium", "High". If the item is in good condition, set severity to empty string "".
   - elapsedSeconds: The elapsed time in seconds from the start of the video when this item or defect is shown or discussed (e.g. 26). This MUST be an integer representing seconds.
3. Translate all extracted fields into ENGLISH. Do not return any Chinese characters in any field.
4. Output must be a valid JSON array of objects representing these records. Do not include any markdown formatting outside of the JSON block.`;

        const promptText = `Please analyze the uploaded property inspection video and extract all inspected room items, their descriptions, conditions, and severity. 
Ensure you listen carefully to the narration and look for visible defects shown in the camera feed.`;

        console.log(`[Offline Video Async] [Job ${uniqueId}] Querying gemini-3.5-flash for structured analysis...`);
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
                {text: promptText},
                {
                    fileData: {
                        mimeType: uploadedFileRef.mimeType,
                        fileUri: uploadedFileRef.uri
                    }
                }
            ],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    description: "List of property items inspected in the video",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            room_name: {
                                type: Type.STRING,
                                description: "The room name in ENGLISH, strictly mapped to unified conventions: EXTERIOR FRONT, EXTERIOR REAR, HALLWAY, STAIRS, LANDING, LIVING ROOM, SITTING ROOM, KITCHEN, KITCHEN/LIVING COMBO, UTILITY ROOM, GUEST WC, STORAGE CLOSET, HOT PRESS, STUDY, OFFICE, BEDROOM 1, BEDROOM 2, ENSUITE BATHROOM 1, ENSUITE BATHROOM 2, MAIN BATHROOM."
                            },
                            item_name: {
                                type: Type.STRING,
                                description: "The item being checked in ENGLISH (e.g. Window, Flooring)"
                            },
                            description: {type: Type.STRING, description: "Specific material or details in ENGLISH"},
                            condition: {
                                type: Type.STRING,
                                description: "The physical condition of the item. You MUST strictly use EXACTLY one of these 5 options: 'New Item', 'Good', 'Fair', 'Poor', or 'Very Poor'. No other terms are allowed."
                            },
                            severity: {
                                type: Type.STRING,
                                description: "Issue severity (Low/Medium/High or empty string)"
                            },
                            elapsedSeconds: {
                                type: Type.INTEGER,
                                description: "The elapsed time in seconds from the start of the video when this item or defect is shown or discussed (e.g., 26 for 26 seconds)."
                            }
                        },
                        required: ["room_name", "item_name", "description", "condition", "elapsedSeconds"]
                    }
                }
            }
        });

        const resultText = response.text;
        console.log(`[Offline Video Async] [Job ${uniqueId}] Analysis completed! Extracted JSON length: ${resultText?.length}`);

        // Validate and parse the records
        let records = [];
        if (resultText) {
            try {
                const parsed = JSON.parse(resultText);
                if (Array.isArray(parsed)) {
                    records = parsed.map((r, idx) => ({
                        id: r.id || `item_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
                        ...r
                    }));
                } else {
                    records = parsed;
                }
            } catch (e) {
                console.error(`[Offline Video Async] [Job ${uniqueId}] Failed to parse Gemini output as JSON`, e);
            }
        }

        // 4. 跨项目写入后台 PC Dashboard
        // 保存视频文件副本 (利用 copyFile 性能更好且不占内存)
        const targetVideoPath = path.join(UPLOAD_DIR, `${uniqueId}${ext}`);
        await copyFile(tempFilePath, targetVideoPath);
        console.log(`[Offline Video Async] [Job ${uniqueId}] Saved video copy to: ${targetVideoPath}`);

        // 保存条目记录 JSON
        const targetJsonPath = path.join(UPLOAD_DIR, `${uniqueId}.json`);
        await writeFile(targetJsonPath, JSON.stringify(records, null, 2));
        console.log(`[Offline Video Async] [Job ${uniqueId}] Saved records JSON to: ${targetJsonPath}`);

        // Save cover photo as separate image file to avoid bloating meta.json
        let coverPhotoFilename = '';
        if (coverPhoto && coverPhoto.startsWith('data:image')) {
            try {
                const matches = coverPhoto.match(/^data:image\/\w+;base64,(.+)$/);
                if (matches) {
                    const imgBuffer = Buffer.from(matches[1], 'base64');
                    coverPhotoFilename = `${uniqueId}_cover.jpg`;
                    await writeFile(path.join(UPLOAD_DIR, coverPhotoFilename), imgBuffer);
                }
            } catch (e) { /* ignore cover photo save error */
            }
        }

        // Create a thumbnail copy from the cover photo
        if (coverPhotoFilename) {
            try {
                await copyFile(
                    path.join(UPLOAD_DIR, coverPhotoFilename),
                    path.join(UPLOAD_DIR, `${uniqueId}_thumb.jpg`)
                );
            } catch (e) { /* ignore */
            }
        }

        // 保存元数据 JSON (_meta.json)
        const metadata = {
            address: address || "Offline Property Video",
            inspectorName: inspectorName || "Offline Inspector",
            companyName: companyName || "",
            phone: phone || "",
            email: email || "",
            reference: reference || "",
            coverPhoto: coverPhotoFilename || "",
            isOfflineVideo: true,
            originalFileName: originalFileName
        };
        const targetMetaPath = path.join(UPLOAD_DIR, `${uniqueId}_meta.json`);
        await writeFile(targetMetaPath, JSON.stringify(metadata, null, 2));
        console.log(`[Offline Video Async] [Job ${uniqueId}] Saved metadata JSON to: ${targetMetaPath}`);

        // 5. 成功后删除 Google GenAI 临时存储，彻底保护数据隐私
        try {
            console.log(`[Offline Video Async] [Job ${uniqueId}] Deleting temporary Gemini File API reference: ${uploadedFileRef.name}`);
            await ai.files.delete({name: uploadedFileRef.name});
        } catch (delErr) {
            console.error(`[Offline Video Async] [Job ${uniqueId}] Failed to delete temporary File API reference:`, delErr);
        }

        // 6. 更新 Job 状态为 completed
        const finalJobStatus = {
            jobId: uniqueId,
            status: 'completed',
            reportId: uniqueId,
            recordCount: records.length,
            address: address || "Offline Property Video",
            inspectorName: inspectorName || "Offline Inspector",
            completedAt: new Date().toISOString()
        };
        await writeFile(path.join(JOBS_DIR, `${uniqueId}.json`), JSON.stringify(finalJobStatus, null, 2), 'utf-8');
        console.log(`[Offline Video Async] [Job ${uniqueId}] Background job successfully finalized!`);

    } catch (error: any) {
        console.error(`[Offline Video Async] [Job ${uniqueId}] Background Worker Failed:`, error);

        // 更新 Job 状态为 failed 记录错误
        const failedJobStatus = {
            jobId: uniqueId,
            status: 'failed',
            error: error.message || 'Analysis failed',
            address: address || "Offline Property Video",
            inspectorName: inspectorName || "Offline Inspector",
            failedAt: new Date().toISOString()
        };
        try {
            await writeFile(path.join(JOBS_DIR, `${uniqueId}.json`), JSON.stringify(failedJobStatus, null, 2), 'utf-8');
        } catch (e) {
            console.error("Failed to write failed job status JSON", e);
        }
    } finally {
        // 7. 清理本地 .temp 目录下的视频临时缓存文件
        if (tempFilePath && existsSync(tempFilePath)) {
            try {
                console.log(`[Offline Video Async] [Job ${uniqueId}] Cleaning up local temporary file: ${tempFilePath}`);
                await unlink(tempFilePath);
            } catch (err) {
                console.error("Failed to clean up local temporary file:", err);
            }
        }
    }
}
