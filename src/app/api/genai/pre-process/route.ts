import {NextResponse} from 'next/server';
import {GoogleGenAI} from '@google/genai';
import {apiGet} from "@/lib/api";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({error: 'GEMINI_API_KEY is missing'}, {status: 500});
        }

        const formData = await req.formData();
        const propertyId = formData.get('propertyId') as string | null;
        const propertyAddress = formData.get('propertyAddress') as string | null;
        const notes = formData.get('notes') as string | null;
        const pdfFile = formData.get('pdfFile') as File | null;
        const imageFiles = formData.getAll('imageFiles') as File[];

        if (!propertyId && !propertyAddress && !notes && !pdfFile && imageFiles.length === 0) {
            return NextResponse.json({knowledgeBase: ''});
        }

        const ai = new GoogleGenAI({apiKey});
        const parts: any[] = [];

        // Load and process previous property record history if provided
        let historicalDataText = '';
        if (propertyId) {
            const response = await apiGet(`/inspection/properties/${propertyId}`);
            const prop = response.data;
            historicalDataText += `=== HISTORICAL PROPERTY DETAILS ===\n`;
            historicalDataText += `Name/Address: ${prop.name}\n`;
            historicalDataText += `Property Type: ${prop.type || 'N/A'}\n`;
            historicalDataText += `Rooms & Layout: ${prop.bedrooms || 0} Bedrooms, ${prop.main_bathrooms || 0} Bathrooms`;
            if (prop.ensuite_bathrooms) historicalDataText += `, ${prop.ensuite_bathrooms} Ensuite(s)`;
            if (prop.living_rooms) historicalDataText += `, ${prop.living_rooms} Living Room(s)`;
            if (prop.kitchen_type) historicalDataText += `, Kitchen Type: ${prop.kitchen_type}`;
            if (prop.storeys) historicalDataText += `, Storeys: ${prop.storeys}`;
            if (prop.includes?.hallway !== undefined) historicalDataText += `, Hallway: ${prop.includes.hallway ? 'Yes' : 'No'}`;
            if (prop.includes?.outdoor !== undefined) historicalDataText += `, Outdoor: ${prop.includes.outdoor ? 'Yes' : 'No'}`;
            if (prop.includes?.study !== undefined) historicalDataText += `, Study: ${prop.includes.study ? 'Yes' : 'No'}`;
            if (prop.includes?.utility !== undefined) historicalDataText += `, Utility Room: ${prop.includes.utility ? 'Yes' : 'No'}`;
            if (prop.includes?.guestWc !== undefined) historicalDataText += `, Guest WC: ${prop.includes.guestWc ? 'Yes' : 'No'}`;
            if (prop.includes?.storage !== undefined) historicalDataText += `, Storage Closets: ${prop.includes.storage ? 'Yes' : 'No'}`;
            historicalDataText += `\n`;

            // const reportRes = await apiGet(`/inspection/reports`, {property_id: propertyId});
            // const {total, items: reports} = response.data;
        }

        if (historicalDataText) {
            parts.push({text: `Historical Property and Walkthrough Inspection Records (Extracted from Database):\n${historicalDataText}\n`});
        }

        // 0. Process Address
        if (propertyAddress) {
            parts.push({text: `Property Address: ${propertyAddress}\n`});
        }

        // 1. Process PDF — 直接以 base64 inlineData 传给 Gemini（原生支持 PDF 解析）
        // 不再依赖 pdf-parse，Gemini 可以直接读取 PDF 内容，包括表格和格式
        if (pdfFile) {
            try {
                const arrayBuffer = await pdfFile.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString('base64');
                parts.push({text: 'Previous Inspection Report (attached PDF):'});
                parts.push({
                    inlineData: {
                        data: base64Data,
                        mimeType: 'application/pdf',
                    },
                });
            } catch (err) {
                console.error('Error processing PDF:', err);
                parts.push({text: '[A PDF was uploaded but could not be processed.]'});
            }
        }

        // 2. Process Notes
        if (notes) {
            parts.push({text: `Inspector's Manual Notes/Focus Items:\n${notes}\n`});
        }

        // 3. Process Images (Floorplans)
        if (imageFiles.length > 0) {
            parts.push({text: `Floorplans/Reference Images:`});
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

        return NextResponse.json({knowledgeBase: response.text});

    } catch (error: any) {
        console.error('Failed to pre-process inspection data:', error);
        return NextResponse.json({error: error.message}, {status: 500});
    }
}
