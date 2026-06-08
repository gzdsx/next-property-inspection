import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { readFile } from 'fs/promises';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
    }

    const formData = await req.formData();
    const propertyId = formData.get('propertyId') as string | null;
    const address = formData.get('address') as string | null;
    const notes = formData.get('notes') as string | null;
    const pdfFile = formData.get('pdf') as File | null;
    const imageFiles = formData.getAll('images') as File[];

    if (!propertyId && !address && !notes && !pdfFile && imageFiles.length === 0) {
      return NextResponse.json({ knowledgeBase: '' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [];

    // Load and process previous property record history if provided
    let historicalDataText = '';
    if (propertyId) {
      try {
        const uploadsDir = process.env.PORTAL_UPLOAD_DIR;
        let dataDir = '';
        const fs = require('fs');
        const path = require('path');
        
        if (uploadsDir) {
          dataDir = path.join(path.dirname(uploadsDir), 'data');
        } else {
          dataDir = path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'data');
        }
        
        const propsFilePath = path.join(dataDir, 'properties.json');
        if (fs.existsSync(propsFilePath)) {
          const content = await readFile(propsFilePath, 'utf-8');
          const properties = JSON.parse(content);
          const prop = properties.find((p: any) => p.id === propertyId);
          if (prop) {
            historicalDataText += `=== HISTORICAL PROPERTY DETAILS ===\n`;
            historicalDataText += `Name/Address: ${prop.name}\n`;
            historicalDataText += `Property Type: ${prop.type || 'N/A'}\n`;
            if (prop.rooms) {
              historicalDataText += `Rooms & Layout: ${prop.rooms.bedrooms || 0} Bedrooms, ${prop.rooms.bathrooms || 0} Bathrooms`;
              if (prop.rooms.ensuite) historicalDataText += `, ${prop.rooms.ensuite} Ensuite(s)`;
              if (prop.rooms.livingRooms) historicalDataText += `, ${prop.rooms.livingRooms} Living Room(s)`;
              if (prop.rooms.kitchenType) historicalDataText += `, Kitchen Type: ${prop.rooms.kitchenType}`;
              if (prop.rooms.storeys) historicalDataText += `, Storeys: ${prop.rooms.storeys}`;
              historicalDataText += `\nIncluded Areas: Hallway: ${prop.rooms.hallway ? 'Yes' : 'No'}, Outdoor: ${prop.rooms.outdoor ? 'Yes' : 'No'}`;
              if (prop.rooms.study !== undefined) historicalDataText += `, Study: ${prop.rooms.study ? 'Yes' : 'No'}`;
              if (prop.rooms.utility !== undefined) historicalDataText += `, Utility Room: ${prop.rooms.utility ? 'Yes' : 'No'}`;
              if (prop.rooms.guestWc !== undefined) historicalDataText += `, Guest WC: ${prop.rooms.guestWc ? 'Yes' : 'No'}`;
              if (prop.rooms.storage !== undefined) historicalDataText += `, Storage Closets: ${prop.rooms.storage ? 'Yes' : 'No'}`;
              historicalDataText += `\n`;
            }
            
            // Extract completed historical visits, sort by date descending and use only the latest one
            const completedVisits = (prop.drafts || []).filter((d: any) => d.status === 'Completed' && d.reportId);
            if (completedVisits.length > 0) {
              const sortedVisits = [...completedVisits].sort(
                (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              const latestVisit = sortedVisits[0];
              
              historicalDataText += `\n=== LATEST HISTORICAL WALKTHROUGH INSPECTION LOGS ===\n`;
              historicalDataText += `- [${latestVisit.date}] ${latestVisit.type} (Inspector: ${latestVisit.inspectorName}):\n`;
              
              // Read the upload report json
              let reportFilePath = '';
              if (uploadsDir) {
                reportFilePath = path.join(uploadsDir, `${latestVisit.reportId}.json`);
              } else {
                reportFilePath = path.join(process.cwd(), '..', 'video-portal-demo', 'public', 'uploads', `${latestVisit.reportId}.json`);
              }
              
              if (fs.existsSync(reportFilePath)) {
                try {
                  const reportContent = await readFile(reportFilePath, 'utf-8');
                  const records = JSON.parse(reportContent);
                  if (Array.isArray(records) && records.length > 0) {
                    records.forEach((rec: any) => {
                      const cond = rec.condition || 'Unknown';
                      const desc = rec.description || 'No notes';
                      historicalDataText += `  * ${rec.room_name || 'General Area'} - ${rec.item_name || 'Element'}: Condition is [${cond}] · ${desc}\n`;
                    });
                  } else {
                    historicalDataText += `  * No defects recorded.\n`;
                  }
                } catch (e) {
                  historicalDataText += `  * [Failed to parse detailed walkthrough records for this visit.]\n`;
                }
              } else {
                historicalDataText += `  * [Detail walkthrough records file not found.]\n`;
              }
            } else {
              historicalDataText += `\nNo completed historical visits found for this property.\n`;
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading historical property details:", err);
      }
    }

    if (historicalDataText) {
      parts.push({ text: `Historical Property and Walkthrough Inspection Records (Extracted from Database):\n${historicalDataText}\n` });
    }

    // 0. Process Address
    if (address) {
      parts.push({ text: `Property Address: ${address}\n` });
    }

    // 1. Process PDF — 直接以 base64 inlineData 传给 Gemini（原生支持 PDF 解析）
    // 不再依赖 pdf-parse，Gemini 可以直接读取 PDF 内容，包括表格和格式
    if (pdfFile) {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        parts.push({ text: 'Previous Inspection Report (attached PDF):' });
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        });
      } catch (err) {
        console.error('Error processing PDF:', err);
        parts.push({ text: '[A PDF was uploaded but could not be processed.]' });
      }
    }

    // 2. Process Notes
    if (notes) {
      parts.push({ text: `Inspector's Manual Notes/Focus Items:\n${notes}\n` });
    }

    // 3. Process Images (Floorplans)
    if (imageFiles.length > 0) {
      parts.push({ text: `Floorplans/Reference Images:` });
      for (const imageFile of imageFiles) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64Data = buffer.toString('base64');
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: imageFile.type || 'image/jpeg'
            }
          });
        } catch (err) {
          console.error("Error processing Image:", err);
        }
      }
    }

    // 4. Instructions for Synthesis
    parts.push({ 
      text: `Task: You are an expert property inspection assistant analyzing preparation materials. 
Please synthesize a highly structured "Pre-inspection Knowledge Base" based on the provided historical property walkthrough logs (if linked), PDF reports, reference floorplans, and inspector manual notes.

CRITICAL INSTRUCTION FOR FLOORPLAN & ROOM NAMING CONVENTIONS: 
If a floorplan is provided (Upload Floor Plan), you MUST extract a complete, logical list of ALL rooms and areas shown and map/translate them to the unified system naming conventions matching the "Add Property" database schema:
- Bedrooms -> Use "Bedroom 1", "Bedroom 2", "Bedroom 3", etc. (Numbered starting from 1)
- Main Bathrooms -> Use "Main Bathroom" (or "Main Bathroom 1" etc. if multiple)
- Ensuite Bathrooms -> Use "Ensuite Bathroom 1", "Ensuite Bathroom 2", etc.
- Living/Sitting Rooms -> Use "Living Room" or "Sitting Room" (or "Living Room 1" etc.)
- Kitchen Type -> Use "Kitchen" or "Kitchen/Living Combo" (if open-plan kitchen and living combo)
- Hallway & Landing -> Use "Hallway", "Stairs", "Landing"
- Study / Office -> Use "Study" or "Office"
- Utility / Laundry Room -> Use "Utility Room"
- Guest WC -> Use "Guest WC"
- HP / Storage Closets -> Use "Storage Closet" or "Hot Press"
- Floors/Storeys -> Group the rooms by storey level if multiple storeys are identified (e.g., "Ground Floor", "First Floor").
Organize them into a suggested "Inspection Route" (e.g., Ground Floor: Hallway -> Living Room -> Kitchen/Living Combo -> Guest WC; First Floor: Stairs -> Landing -> Bedroom 1 -> Ensuite Bathroom 1 -> Bedroom 2 -> Main Bathroom...).
The primary purpose of this floorplan extraction is to ensure the AI knows EXACTLY which areas exist and uses these standard names to match the system database, guiding the inspector room-by-room and preventing any area from being missed. Any room generated in the "Inspection Route & Room Checklist" and "Key Focus Areas" MUST use these standard names.

CRITICAL INSTRUCTION FOR INFORMATION FUSION & KEY FOCUS AREAS:
You MUST integrate and fuse all available sources of input into a coherent, single unified "Key Focus Areas" section:
1. If a previous property is linked ("Link Previous Property"), analyze its historical defect logs (from the latest completed walkthrough record).
2. If manual notes/focus items are provided, extract the inspector's specific instructions.
3. If a PDF report is uploaded, parse its core findings.
Combine these items by room/area and by priority. Do NOT create separate lists for manual notes, historical visits, and PDF contents. Instead, merge them so that if a room (e.g., "Bedroom 1") is mentioned in both the historical logs (e.g., damp wall) and the manual notes (e.g., check window locks), they are listed together under a single, unified checklist for that area under "Key Focus Areas". Make sure no manual instructions or historical concerns are omitted.

Output format: Return the synthesized knowledge base clearly. Start with the "Inspection Route & Room Checklist", followed by "Key Focus Areas". Do not include conversational filler.`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
    });

    return NextResponse.json({ knowledgeBase: response.text });

  } catch (error: any) {
    console.error('Failed to pre-process inspection data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
