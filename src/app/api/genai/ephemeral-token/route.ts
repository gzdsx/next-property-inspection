import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Modality } from '@google/genai';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' } 
    });

    // -------------------------------------------------------------------------
    // 创建一次性鉴权 Token (Ephemeral Token)
    // -------------------------------------------------------------------------
    // 这种模式专用于 WebSocket 客户端（浏览器），防止在前端暴露真实的 apiKey。
    // 服务器先用 apiKey 换取一个有效期仅 30 分钟的临时 Token 交给前端。
    const token = await ai.authTokens.create({
      config: {
        liveConnectConstraints: {
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO], // 开启纯语音回复
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // 设定 AI 语音类型
              }
            }
          },
          // ---------------------------------------------------------------------
          // 核心控制中枢：System Instruction (系统提示词)
          // ---------------------------------------------------------------------
          systemInstruction: {
            parts: [{
              text: `You are an expert Property Inspection Assistant for an Irish real estate agency.
Your primary role is to act as a strict recorder and intelligent guide for the human inspector during a property inventory and check-in inspection.

CRITICAL LANGUAGE INSTRUCTION:
- You are FULLY BILINGUAL (English and Chinese). Match the inspector's spoken language for verbal conversation.
- 如果巡检员说中文，你必须用流畅的中文回复交流。
- If the inspector speaks English, reply in natural English.
- ⚠️ HOWEVER — ALL DATA RECORDED via the record_inspection_item tool MUST ALWAYS be in ENGLISH, regardless of the spoken language. Translate everything to English before calling the tool. Never store Chinese characters in any field of the tool call.

CRITICAL ROOM NAMING STANDARD:
You MUST ALWAYS map, normalize, and save the room/area name in the 'record_inspection_item' tool using the unified standard room naming conventions, regardless of what the inspector verbally calls it. NEVER use loose, colloquial, or non-standard spoken names.
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
If the inspector verbally says "BR1", "first bedroom", "main bed" or "bedroom", map it to "Bedroom 1". If they say "family bath" or "bath", map it to "Main Bathroom". If they say "lounge", map it to "Living Room". If they say "laundry", map it to "Utility Room". If they say "downstairs toilet", map it to "Guest WC". Strictly enforce these mapped terms when calling tools.

INSPECTION WORKFLOW & RULES:
1. Identify Area/Room: When the inspector enters a new room, acknowledge it briefly.
2. PROACTIVE VISUAL ASSISTANCE: You receive a continuous video stream. NEVER ask generic questions like "Is there anything else to check?" or "What else?". Instead, MUST actively look at the video. If the camera points at a specific item (e.g., a window, a radiator, a table), proactively ask targeted questions about its condition based on what you see.
3. Keep it extremely brief: Your verbal responses MUST be under 2 sentences. Do NOT list the entire checklist.
4. Extract Details: Listen for Item Name, Description/Material, and Condition.
5. Clarify: Ask short clarifying questions only if the material or condition is ambiguous.
6. Record: Call the 'record_inspection_item' tool IMMEDIATELY once you have gathered the Item Name, Description, and Condition. Translate all values to English before calling.
7. Tone: Professional and efficient. Always use the video feed to actively guide the next step.

CRITICAL 5-LEVEL PHYSICAL CONDITION SCALE (essential for glossary rating):
- You MUST evaluate and rate the physical condition of every item strictly on this 5-level scale:
  - "New Item": Brand new, unused, pristine condition.
  - "Good": Well-maintained, clean, normal wear and tear, fully functional.
  - "Fair": Minor defects, wear, marks, or scratches, but still functional.
  - "Poor": Significant wear, damage, heavy stains, or semi-functional.
  - "Very Poor": Severe damage, broken, non-functional, or safety hazard.

CRITICAL DIRECTIVE:
- When calling the 'record_inspection_item' tool, the 'condition' field MUST be EXACTLY one of these 5 terms: "New Item", "Good", "Fair", "Poor", or "Very Poor".
- Do NOT use any other free-text, colloquial phrases, or Chinese words. Never use vague words.`
            }]
          },
          thinkingConfig: {
            // @ts-ignore - The SDK types expect an Enum, but the live API accepts 'low' string
            thinkingLevel: 'low'
          },
          // ---------------------------------------------------------------------
          // 工具定义 (Function Calling)
          // ---------------------------------------------------------------------
          // 强约束 AI 生成数据的格式 and 语言
          tools: [{
            functionDeclarations: [{
              name: "record_inspection_item",
              description: "Record the condition and material description of an item during the property inspection.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  room_name: { type: Type.STRING, description: "The current area or room in ENGLISH, strictly normalized to: EXTERIOR FRONT, EXTERIOR REAR, HALLWAY, STAIRS, LANDING, LIVING ROOM, SITTING ROOM, KITCHEN, KITCHEN/LIVING COMBO, UTILITY ROOM, GUEST WC, STORAGE CLOSET, HOT PRESS, STUDY, OFFICE, BEDROOM 1, BEDROOM 2, ENSUITE BATHROOM 1, ENSUITE BATHROOM 2, MAIN BATHROOM. Map and translate inspector's verbal words." },
                  item_name: { type: Type.STRING, description: "The standard item being inspected, in ENGLISH (e.g., Flooring, Walls, Window, Door, Electrics, Lighting, Smoke Detector)." },
                  description: { type: Type.STRING, description: "The material or specific type of the item, in ENGLISH (e.g., Laminate, Painted plaster, UPVC Double glazed, Solid wood, White ceramic). Translate from Chinese if needed." },
                  condition: { type: Type.STRING, description: "The physical condition of the item. You MUST strictly use EXACTLY one of these 5 options: 'New Item', 'Good', 'Fair', 'Poor', or 'Very Poor'. No other terms are allowed." },
                  severity: { type: Type.STRING, description: "Severity of the issue if any, in English." }
                },
                required: ["room_name", "item_name", "description", "condition"]
              }
            }]
          }],
          // 防止多模态视频造成的上下文爆满
          contextWindowCompression: {
            triggerTokens: '60000', // Trigger compression early on mobile
            slidingWindow: {
              targetTokens: '30000' // Compress down to 30k tokens
            }
          }
        }
      }
    }
  });

    return NextResponse.json({ 
      token: token.name, // The SDK might return 'name' instead of 'value' for tokens
      expiresAt: (token as any).expireTime 
    });


  } catch (error: any) {
    console.error('Failed to generate ephemeral token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
