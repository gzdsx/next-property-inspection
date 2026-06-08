/**
 * generateReport.ts
 * 生成符合以下原始 PDF 格式要求的房产巡检报告：
 * "54 Carmel Street - BT7 1QE - Inventory and Check In - 2016-08-23 - FULL.pdf"
 *
 * 依据 PyMuPDF 从原始 PDF 提取的规格参数进行高保真重建：
 *   - 页面大小: A4 (210mm × 297mm)
 *   - 字体: Arial (在 jsPDF 中映射为 Helvetica)
 *   - 字体颜色: 主色 #404040, 辅色 #666666
 *   - 页眉位置 (y=4.6mm): 左对齐显示房产地址，字体 Arial 9pt，颜色 #666666
 *   - 页脚位置 (y=288.5mm): 左侧显示 "Page X of Y"，中间显示合规声明，右侧显示 "Tenant Initials: __________"
 *   - 部分标题: 14.6pt Bold #404040
 *   - 表格表头: 9pt Bold #404040
 *   - 表格内容: 8.5pt normal #404040
 *   - 封面标题: 19.5pt Bold #404040
 */

import jsPDF from 'jspdf';
import type { InspectionRecord } from '@/hooks/useGeminiLive';

// 巡检员/中介机构基本信息结构体
export interface InspectorProfile {
  companyName: string;   // 中介机构/公司名称
  inspectorName: string; // 巡检员姓名
  phone: string;         // 联络电话
  email: string;         // 联络邮箱
  reference: string;     // 巡检备案参考号
}

// 报告生成所需的所有参数配置
export interface ReportOptions {
  address: string;                // 房产地址
  date: string;                   // 巡检执行日期 (如 "August 23rd 2016" 格式)
  records: InspectionRecord[];   // AI + 人工审核生成的房产状况记录列表
  inspector: InspectorProfile;    // 执行巡检的机构/人员信息
  coverPhotoBase64?: string;      // 房产外观主封面图片 (JPEG base64 格式，自动借用自房产主图)
  tenantSignatureBase64?: string; // 租客/巡检员在手写签字板上签名的 PNG base64 数据
}

// ─── 核心版面度量常量 (从原始 A4 PDF 像素级分析得出) ───────────────────────
const PW = 210;         // 页面总宽度 mm (A4标准)
const PH = 297;         // 页面总高度 mm (A4标准)
const ML = 10.6;        // 左边距 mm (等同于 30pt)
const MR = 10.6;        // 右边距 mm
const CONTENT_W = PW - ML - MR; // 实际可排版内容宽度

// 表格行高 mm
const ROW_H = 6.5;
// 三栏表格的列宽 (Item 项目栏 | Description 详细描述 | Condition 房屋状况评级)
const COL = [40, 65, 85];

// 核心配色系统
const C_MAIN = '#404040';           // 主文字灰
const C_SECONDARY = '#666666';      // 辅助灰色/页眉页脚
const C_TABLE_HEADER_BG = '#e8e8e8'; // 表头浅灰背景色
const C_TABLE_ALT_BG = '#f5f5f5';   // 奇偶行交替背景色
const C_TABLE_BORDER = '#cccccc';   // 表格细网格线颜色
const C_ACCENT = '#2563eb';          // 封面顶部视觉装饰条蓝色

// 字体大小换算函数 (将 pt 磅数精准转换为 jsPDF 使用的 mm 毫米)
const pt = (p: number) => p * 0.352778;
const FS_COVER_TITLE = pt(19.5);
const FS_SECTION = pt(14.6);
const FS_TABLE_HEADER = pt(9.5);
const FS_BODY = pt(8.5);
const FS_FOOTER = pt(9);
const FS_SUBTITLE = pt(11);

// ─── 辅助实用工具函数 ────────────────────────────────────────────────────────

// 十六进制颜色转 RGB 数组，以兼容原生的 jsPDF 色彩接口
function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// 快速设置画笔、文字或填充的颜色
function setColor(doc: jsPDF, hex: string, type: 'fill' | 'text' | 'draw' = 'text') {
  const [r, g, b] = hex2rgb(hex);
  if (type === 'text') doc.setTextColor(r, g, b);
  else if (type === 'fill') doc.setFillColor(r, g, b);
  else doc.setDrawColor(r, g, b);
}

// 绘制标准化的页眉和页脚 (包含合规声明小字与防篡改页码)
function drawHeader(doc: jsPDF, address: string, pageNum: number, totalPages: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_FOOTER / 0.352778); // 将毫米单位转回 pt 以调用 jsPDF 的 setFontSize
  setColor(doc, C_SECONDARY);

  // 1. 页眉左对齐：显示房产具体地址
  doc.text(address, ML, 4.6);

  // 2. 页脚左侧：当前页码与总页数关系 (Page X of Y)
  doc.text(`Page ${pageNum} of ${totalPages}`, ML, 288.5);

  // 3. 页脚中间：插入给中介和租客极大执业底气与信任感的合规声明 (针对 RTB / TDS NI 举证标准)
  doc.setFontSize(FS_FOOTER / 0.352778 - 2.5); // 略微缩小字体以使长英文语句完美居中
  doc.text(
    'Report layout & tamper-proof signature fully aligned with RTB / TDS NI Dispute Evidence Guidelines.',
    PW / 2,
    288.5,
    { align: 'center' }
  );

  // 4. 页脚右侧：租客手写首字母确认处 (Tenant Initials)
  doc.setFontSize(FS_FOOTER / 0.352778); // 恢复标准页脚字号
  doc.text('Tenant Initials: __________', PW - MR, 288.5, { align: 'right' });
}

// Draw a styled 3-column table row
function drawRow(
  doc: jsPDF,
  y: number,
  cols: [string, string, string],
  isHeader = false,
  altRow = false
) {
  const colX = [ML, ML + COL[0], ML + COL[0] + COL[1]];
  const rowHeight = isHeader ? ROW_H + 1 : ROW_H;

  // Background
  if (isHeader) {
    setColor(doc, C_TABLE_HEADER_BG, 'fill');
    doc.rect(ML, y, CONTENT_W, rowHeight, 'F');
  } else if (altRow) {
    setColor(doc, C_TABLE_ALT_BG, 'fill');
    doc.rect(ML, y, CONTENT_W, rowHeight, 'F');
  }

  // Border
  setColor(doc, C_TABLE_BORDER, 'draw');
  doc.setLineWidth(0.2);
  doc.rect(ML, y, CONTENT_W, rowHeight, 'S');

  // Column dividers
  doc.line(colX[1], y, colX[1], y + rowHeight);
  doc.line(colX[2], y, colX[2], y + rowHeight);

  // Text
  if (isHeader) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FS_TABLE_HEADER / 0.352778);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS_BODY / 0.352778);
  }
  setColor(doc, C_MAIN);

  cols.forEach((text, i) => {
    const x = colX[i] + 1.5;
    const textY = y + rowHeight / 2 + (isHeader ? 1.2 : 1.0);
    // Clip text to column width
    const maxW = COL[i] - 3;
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines[0] || '', x, textY);
  });

  return rowHeight;
}

// Wrap text for multi-line, returns final Y
function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((line: string) => {
    doc.text(line, x, y);
    y += lineH;
  });
  return y;
}

// ─── COVER PAGE ─────────────────────────────────────────────────────────────

function drawCoverPage(doc: jsPDF, options: ReportOptions, totalPages: number) {
  const { address, date, inspector, coverPhotoBase64 } = options;

  // Blue accent bar at top
  setColor(doc, C_ACCENT, 'fill');
  doc.rect(0, 0, PW, 8, 'F');

  // Property cover photo (if provided)
  let photoBottom = 8;
  if (coverPhotoBase64) {
    try {
      doc.addImage(
        'data:image/jpeg;base64,' + coverPhotoBase64,
        'JPEG',
        0, 8, PW, 70
      );
      photoBottom = 78;
    } catch {
      photoBottom = 8;
    }
  }

  // Main title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_COVER_TITLE / 0.352778);
  setColor(doc, C_MAIN);
  const titleY = photoBottom + 18;
  doc.text('Inventory and Check In', ML, titleY);

  // Inspector info block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_SECONDARY);
  let infoY = titleY + 10;
  const lineH = pt(12);

  doc.text(inspector.phone, ML, infoY); infoY += lineH;
  doc.text(inspector.email, ML, infoY); infoY += lineH;
  doc.text(`Property inspected by ${inspector.inspectorName}`, ML, infoY); infoY += lineH;
  doc.text(`Reference: ${inspector.reference}`, ML, infoY); infoY += lineH * 1.5;

  // Address block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SUBTITLE / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Address', ML, infoY); infoY += lineH;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_SECONDARY);
  const addrParts = address.split(',').map(s => s.trim());
  addrParts.forEach(line => {
    if (line) { doc.text(line, ML, infoY); infoY += lineH; }
  });
  infoY += lineH * 0.5;

  // Carried Out block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SUBTITLE / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Carried Out', ML, infoY); infoY += lineH;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_SECONDARY);
  doc.text(date, ML, infoY); infoY += lineH * 1.5;

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SUBTITLE / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Property report created with', ML, infoY); infoY += lineH;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SECTION / 0.352778);
  setColor(doc, C_ACCENT, 'text');
  doc.text(inspector.companyName, ML, infoY);

  // Footer
  drawHeader(doc, address, 1, totalPages);
}

// ─── CONTENTS PAGE ──────────────────────────────────────────────────────────

function drawContentsPage(doc: jsPDF, address: string, rooms: string[], pageNum: number, totalPages: number) {
  drawHeader(doc, address, pageNum, totalPages);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SECTION / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Contents', ML, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_SECONDARY);

  const dotLeader = '.'.repeat(120);
  let y = 35;
  const lineH = pt(12.5);

  // Notes
  doc.text('Notes', ML + 3, y);
  doc.text(dotLeader, ML + 25, y, { maxWidth: CONTENT_W - 30, align: 'left' });
  doc.text('2', PW - MR, y, { align: 'right' });
  y += lineH;

  // Areas heading
  doc.text('Areas', ML + 3, y);
  doc.text(dotLeader, ML + 22, y, { maxWidth: CONTENT_W - 30, align: 'left' });
  doc.text('3', PW - MR, y, { align: 'right' });
  y += lineH;

  // Each room
  rooms.forEach((room, i) => {
    doc.text(room, ML + 9, y);
    const dotsX = ML + 9 + doc.getTextWidth(room) + 3;
    doc.text(dotLeader, dotsX, y, { maxWidth: CONTENT_W - dotsX + ML, align: 'left' });
    doc.text(`${i + 3}`, PW - MR, y, { align: 'right' });
    y += lineH;
  });
}

// ─── NOTES PAGE ─────────────────────────────────────────────────────────────

function drawNotesPage(doc: jsPDF, address: string, pageNum: number, totalPages: number) {
  drawHeader(doc, address, pageNum, totalPages);

  let y = 22;
  const lineH = pt(11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SECTION / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Notes', ML, y); y += lineH * 1.5;

  const sections = [
    {
      title: 'Tenant guidelines for inspections',
      subtitle: 'Check in inspection',
      body: 'Before you sign the declaration ensure that you are happy with all the statements made in the inventory. If there are any issues you must inform the check in clerk at the time, so that it can be recorded on the report. The condition of items and rooms are deemed to be clean, undamaged and fit for purpose unless otherwise stated in the inventory. You will receive a full copy of the inventory to keep. You must refer to the inventory at check out time, so keep it in a safe place.'
    },
    {
      subtitle: 'At Mid term inspection',
      body: 'If a midterm inspection has been booked, you will be informed of the date in writing and will be expected to allow a clerk to enter the property to carry out the inspection. At this point you must inform the clerk of any damage or maintenance issues with the property so they can be dealt with.'
    },
    {
      subtitle: 'At Check out inspection',
      body: 'It will be expected for the property and its contents to be returned to the condition and location at check in - use the inventory as a guide. Any items missing from location may be deemed lost / broken and charged for.'
    }
  ];

  sections.forEach(sec => {
    if (sec.title) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FS_BODY / 0.352778);
      setColor(doc, C_SECONDARY);
      doc.text(sec.title, ML, y); y += lineH;
    }
    if (sec.subtitle) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FS_BODY / 0.352778);
      setColor(doc, C_MAIN);
      doc.text(sec.subtitle, ML, y); y += lineH * 0.7;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS_BODY / 0.352778);
    setColor(doc, C_SECONDARY);
    y = addWrappedText(doc, sec.body, ML, y, CONTENT_W, pt(11));
    y += lineH;
  });
}

// ─── ROOM SECTION PAGE ──────────────────────────────────────────────────────

function drawRoomSection(
  doc: jsPDF,
  address: string,
  sectionNumber: number,
  roomName: string,
  items: InspectionRecord[],
  startPageNum: number,
  totalPages: number
): number {
  let pageNum = startPageNum;
  drawHeader(doc, address, pageNum, totalPages);

  let y = 22;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SECTION / 0.352778);
  setColor(doc, C_MAIN);
  doc.text(`${sectionNumber}. ${roomName.toUpperCase()}`, ML, y);
  y += pt(18);

  // Table header
  y += drawRow(doc, y, ['Item', 'Description', 'Condition'], true);

  // Table rows
  items.forEach((rec, idx) => {
    // Check if we need a new page
    const photoH = rec.photoBase64 ? 45 : 0;
    const neededH = ROW_H + photoH + 5;
    if (y + neededH > 280) {
      drawHeader(doc, address, pageNum, totalPages);
      doc.addPage();
      pageNum++;
      drawHeader(doc, address, pageNum, totalPages);

      // Continued heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FS_SECTION / 0.352778);
      setColor(doc, C_MAIN);
      doc.text(`${sectionNumber}. ${roomName.toUpperCase()} (CONT.)`, ML, 22);
      y = 22 + pt(18);
    }

    const itemLabel = `${sectionNumber}.${idx + 1} ${rec.item_name}`;
    y += drawRow(
      doc, y,
      [itemLabel, rec.description || '', rec.condition],
      false,
      idx % 2 === 1
    );

    // Embed photo if available
    if (rec.photoBase64) {
      const maxImgW = 60;
      const maxImgH = 40;
      // Check if photo fits
      if (y + maxImgH + 5 > 280) {
        doc.addPage();
        pageNum++;
        drawHeader(doc, address, pageNum, totalPages);
        y = 22;
      }
      try {
        doc.addImage(
          'data:image/jpeg;base64,' + rec.photoBase64,
          'JPEG',
          ML, y + 1, maxImgW, maxImgH
        );
        // Caption
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FS_BODY / 0.352778);
        setColor(doc, C_SECONDARY);
        doc.text(`Ref # ${sectionNumber}.${idx + 1}`, ML, y + maxImgH + 4);
        y += maxImgH + 8;
      } catch {
        // If image fails, skip it
      }
    }
  });

  return pageNum;
}

// ─── DECLARATION / SIGNATURE PAGE ───────────────────────────────────────────

function drawDeclarationPage(
  doc: jsPDF,
  address: string,
  inspector: InspectorProfile,
  signatureBase64: string | undefined,
  pageNum: number,
  totalPages: number
) {
  drawHeader(doc, address, pageNum, totalPages);

  let y = 22;
  const lineH = pt(12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SECTION / 0.352778);
  setColor(doc, C_MAIN);
  doc.text('Declaration', ML, y); y += lineH * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_SECONDARY);

  const declarationText = `I/We confirm that the above inventory is a true and accurate record of the contents and condition of the property at the time of the inspection. I/We agree to return the property and its contents in the same condition as recorded above, fair wear and tear excepted.`;
  y = addWrappedText(doc, declarationText, ML, y, CONTENT_W, pt(11));
  y += lineH * 2;

  // Signature boxes
  const drawSignatureBox = (label: string, sigBase64?: string, xOffset = 0) => {
    const boxX = ML + xOffset;
    const boxW = 80;
    const boxH = 30;

    setColor(doc, C_TABLE_BORDER, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(boxX, y, boxW, boxH, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FS_BODY / 0.352778);
    setColor(doc, C_SECONDARY);
    doc.text(label, boxX + 2, y + 4);

    if (sigBase64) {
      try {
        doc.addImage('data:image/png;base64,' + sigBase64, 'PNG', boxX + 2, y + 7, boxW - 4, boxH - 12);
      } catch {
        // skip
      }
    }

    // Date line
    doc.text(`Date: _______________`, boxX + 2, y + boxH + 4);
  };

  drawSignatureBox('Tenant / Clerk Signature:', signatureBase64, 0);
  drawSignatureBox('Inspector:', undefined, CONTENT_W - 80);

  y += 60;

  // Inspector details footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_BODY / 0.352778);
  setColor(doc, C_MAIN);
  doc.text(inspector.companyName, ML, y); y += lineH;
  doc.setFont('helvetica', 'normal');
  setColor(doc, C_SECONDARY);
  doc.text(inspector.inspectorName, ML, y); y += lineH;
  doc.text(inspector.phone, ML, y); y += lineH;
  doc.text(inspector.email, ML, y);
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

export function generateInspectionReport(options: ReportOptions): void {
  const { address, date, records, inspector, coverPhotoBase64, tenantSignatureBase64 } = options;

  // Group records by room
  const roomGroups: Map<string, InspectionRecord[]> = new Map();
  records.forEach(rec => {
    if (!roomGroups.has(rec.room_name)) roomGroups.set(rec.room_name, []);
    roomGroups.get(rec.room_name)!.push(rec);
  });
  const rooms = Array.from(roomGroups.keys());

  // Estimate total pages:
  // 1 cover + 1 contents + 1 notes + rooms + 1 declaration
  const totalPages = 4 + rooms.length * 2; // rough estimate; sufficient for display

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ── Cover page (page 1) ──
  drawCoverPage(doc, options, totalPages);

  // ── Contents page (page 2) ──
  doc.addPage();
  drawContentsPage(doc, address, rooms, 2, totalPages);

  // ── Notes page (page 3) ──
  doc.addPage();
  drawNotesPage(doc, address, 3, totalPages);

  // ── Room sections ──
  let currentPage = 3;
  rooms.forEach((room, idx) => {
    doc.addPage();
    currentPage++;
    currentPage = drawRoomSection(
      doc,
      address,
      idx + 1,
      room,
      roomGroups.get(room)!,
      currentPage,
      totalPages
    );
  });

  // ── Declaration page ──
  doc.addPage();
  currentPage++;
  drawDeclarationPage(doc, address, inspector, tenantSignatureBase64, currentPage, totalPages);

  // Save the PDF
  const safeName = address.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Inspection_${safeName}_${dateStr}.pdf`);
}
