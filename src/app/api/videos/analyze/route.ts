import {NextRequest, NextResponse} from 'next/server';
import {GoogleGenAI, Type} from '@google/genai';
import {unlink} from 'fs/promises';
import {existsSync} from 'fs';
import path from 'path';

const VIDEOS_DIR = path.join(process.cwd(), '.temp', 'videos');

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({error: 'GEMINI_API_KEY is missing'}, {status: 500});
        }

        const {filePath, mimeType, fileName} = await req.json();

        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(VIDEOS_DIR) || !existsSync(resolved)) {
            return NextResponse.json({error: 'Video file not found'}, {status: 400});
        }

        const ai = new GoogleGenAI({apiKey});

        const uploadedFile = await ai.files.upload({
            file: resolved,
            config: {
                mimeType: mimeType || 'video/mp4',
                displayName: `batch_analysis_${fileName || 'video'}`
            }
        });

        const MAX_POLLS = 100;
        const POLL_INTERVAL = 3000;
        let activeFile = uploadedFile;

        for (let i = 0; i < MAX_POLLS; i++) {
            const fileInfo = await ai.files.get({name: uploadedFile.name!});
            if ((fileInfo as any).state === 'ACTIVE') {
                activeFile = fileInfo;
                break;
            }
            if ((fileInfo as any).state === 'FAILED') {
                throw new Error('Gemini File API processing failed');
            }
            if (i === MAX_POLLS - 1) {
                throw new Error('Timeout waiting for Gemini file processing');
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }

        const systemInstruction = `You are an expert Property Inspection Assistant for an Irish real estate agency.
Your role is to carefully watch the uploaded inspection video, listen to the inspector's spoken descriptions and explanations, and extract a complete list of inspected items and defects.

CRITICAL ROOM NAMING STANDARD:
You MUST ALWAYS map, normalize, and save the room/area name using unified standard room naming conventions, regardless of what the inspector verbally calls it.
Unified Room Naming Mapping rules:
- Bedrooms -> Use "Bedroom 1", "Bedroom 2", "Bedroom 3", etc.
- Ensuite Bathrooms -> Use "Ensuite Bathroom 1", "Ensuite Bathroom 2", etc.
- Main Bathrooms -> Use "Main Bathroom" (or "Main Bathroom 1" etc. if multiple)
- Living/Sitting Rooms -> Use "Living Room" or "Sitting Room"
- Kitchen Type -> Use "Kitchen" or "Kitchen/Living Combo"
- Hallway & Landing -> Use "Hallway", "Stairs", "Landing"
- Study / Office -> Use "Study" or "Office"
- Utility / Laundry Room -> Use "Utility Room"
- Guest WC -> Use "Guest WC"
- HP / Storage Closets -> Use "Storage Closet" or "Hot Press"
- Exterior/Garden -> Use "Exterior Front", "Exterior Rear", "Garden" or "Patio"

INSPECTION EXTRACTION RULES:
1. Examine both visual details and audio narrative.
2. For each inspected item, extract:
   - room_name: Standardized room name in ENGLISH
   - item_name: Standard item name in ENGLISH (e.g. Flooring, Walls, Ceiling, Radiator, Window, Door, Lighting)
   - description: Material or specific type in ENGLISH
   - condition: Strictly one of: "New Item", "Good", "Fair", "Poor", "Very Poor"
   - severity: "Low", "Medium", "High", or "" if no issue
   - elapsedSeconds: Time in seconds from video start when item is shown/discussed
3. All fields must be in ENGLISH.
4. Output must be a valid JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {text: 'Analyze this property inspection video and extract all inspected room items, their descriptions, conditions, and severity.'},
                {
                    fileData: {
                        mimeType: activeFile.mimeType!,
                        fileUri: activeFile.uri!
                    }
                }
            ],
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            room_name: {type: Type.STRING, description: "Standardized room name"},
                            item_name: {type: Type.STRING, description: "Item being inspected"},
                            description: {type: Type.STRING, description: "Material or details"},
                            condition: {type: Type.STRING, description: "New Item/Good/Fair/Poor/Very Poor"},
                            severity: {type: Type.STRING, description: "Low/Medium/High or empty"},
                            elapsedSeconds: {type: Type.INTEGER, description: "Time in seconds from video start"}
                        },
                        required: ["room_name", "item_name", "description", "condition", "elapsedSeconds"]
                    }
                }
            }
        });

        let items: any[] = [];
        if (response.text) {
            try {
                const parsed = JSON.parse(response.text);
                items = Array.isArray(parsed) ? parsed.map((r: any, idx: number) => ({
                    id: `item_${Date.now()}_${idx}`,
                    ...r
                })) : [];
            } catch {
                console.error('Failed to parse Gemini response');
            }
        }

        try {
            await ai.files.delete({name: uploadedFile.name!});
        } catch {}

        try {
            if (existsSync(resolved)) await unlink(resolved);
        } catch {}

        return NextResponse.json({success: true, items});
    } catch (error: any) {
        console.error('[Video Analysis Error]:', error);
        return NextResponse.json({error: error.message || 'Analysis failed'}, {status: 500});
    }
}

export const maxDuration = 300;
