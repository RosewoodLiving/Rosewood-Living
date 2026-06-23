import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LoiInput } from "./schemas";
import { CREST_PNG_BASE64, CREST_PNG_WIDTH, CREST_PNG_HEIGHT } from "./crest-logo";

const ROSEWOOD = rgb(0.478, 0.267, 0.204); // #7a4434
const INK = rgb(0.141, 0.106, 0.078); // #241b14
const INK_SOFT = rgb(0.341, 0.278, 0.227);
const LINE = rgb(0.839, 0.784, 0.694);

// A4 in points
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 64;
const MAX_W = PAGE_W - MARGIN * 2;

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

/** Reference like RL-20260621-AVE */
function reference(company: string, now: Date): string {
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const tag = (company.replace(/[^a-zA-Z]/g, "").slice(0, 3) || "RWL").toUpperCase();
  return `RL-${stamp}-${tag}`;
}

interface Cursor {
  y: number;
}

function drawParagraph(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  cursor: Cursor,
  opts: { lineHeight?: number; color?: ReturnType<typeof rgb>; gapAfter?: number } = {},
) {
  const lineHeight = opts.lineHeight ?? size * 1.5;
  const color = opts.color ?? INK_SOFT;
  const words = text.split(/\s+/);
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > MAX_W && line) {
      page.drawText(line, { x: MARGIN, y: cursor.y, size, font, color });
      cursor.y -= lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, { x: MARGIN, y: cursor.y, size, font, color });
    cursor.y -= lineHeight;
  }
  cursor.y -= opts.gapAfter ?? 0;
}

export async function generateLoiPdf(
  data: LoiInput,
  now: Date = new Date(),
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Rosewood Living — Letter of Intent");
  doc.setAuthor("Rosewood Living");
  doc.setSubject("Letter of Intent — Affordable Housing Management & Advisory");

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const cursor: Cursor = { y: PAGE_H - MARGIN };

  // Letterhead — crest medallion + wordmark
  const crest = await doc.embedPng(base64ToUint8(CREST_PNG_BASE64));
  const crestH = 46;
  const crestW = crestH * (CREST_PNG_WIDTH / CREST_PNG_HEIGHT);
  const headTop = PAGE_H - MARGIN;
  page.drawImage(crest, {
    x: MARGIN,
    y: headTop - crestH,
    width: crestW,
    height: crestH,
  });

  const textX = MARGIN + crestW + 14;
  page.drawText("ROSEWOOD LIVING", {
    x: textX,
    y: headTop - 21,
    size: 18,
    font: serifBold,
    color: ROSEWOOD,
  });
  page.drawText("Community & Affordable Housing — Management & Advisory", {
    x: textX,
    y: headTop - 36,
    size: 9.5,
    font: sans,
    color: INK_SOFT,
  });

  // Reference (right aligned)
  const ref = reference(data.company, now);
  page.drawText(`Ref ${ref}`, {
    x: PAGE_W - MARGIN - sans.widthOfTextAtSize(`Ref ${ref}`, 9.5),
    y: headTop - 9,
    size: 9.5,
    font: sans,
    color: INK_SOFT,
  });

  cursor.y = headTop - crestH - 16;
  page.drawLine({
    start: { x: MARGIN, y: cursor.y },
    end: { x: PAGE_W - MARGIN, y: cursor.y },
    thickness: 1,
    color: LINE,
  });
  cursor.y -= 34;

  // Date
  page.drawText(formatDate(now), { x: MARGIN, y: cursor.y, size: 11, font: serif, color: INK_SOFT });
  cursor.y -= 28;

  // Recipient block
  for (const [i, lineText] of [data.fullName, data.role, data.company, data.projectLocation].entries()) {
    page.drawText(lineText, {
      x: MARGIN,
      y: cursor.y,
      size: 11,
      font: i === 0 ? serifBold : serif,
      color: i === 0 ? INK : INK_SOFT,
    });
    cursor.y -= 16;
  }
  cursor.y -= 16;

  // Subject
  const subject = `Re: Letter of Intent — Affordable Housing Management for ${data.projectLocation}`;
  drawParagraph(page, subject, serifBold, 12, cursor, { lineHeight: 17, color: INK, gapAfter: 14 });

  // Salutation + body (placeholder clauses — replace with approved wording before go-live)
  const dwellingClause = data.dwellings
    ? `the proposed development of approximately ${data.dwellings} dwellings`
    : "the proposed development";

  const paragraphs = [
    `Dear ${data.fullName},`,
    `Rosewood Living is pleased to confirm its intent to partner with ${data.company} on ${dwellingClause} at ${data.projectLocation}. This letter records our in-principle commitment to act as your community and affordable housing partner for the project.`,
    `Subject to contract and the relevant planning approvals, Rosewood Living intends to manage the affordable housing component of the development as a registered Tier 3 Community Housing Provider, for a period of approximately fifteen (15) years from the issue of the Occupation Certificate, in accordance with applicable NSW affordable housing and community housing requirements.`,
    `On this basis, the project may be positioned to access the planning advantages available to developments that deliver affordable housing, including the additional floor space available under the relevant State Environmental Planning Policy. Our advisory team will work alongside yours to optimise the scheme and the affordable housing outcome.`,
    `This letter is an expression of intent only. It is not legally binding, does not create an obligation on either party to proceed, and is provided to support your planning and feasibility process. Final terms will be set out in a separate management and advisory agreement.`,
    `We would welcome the opportunity to progress this with you.`,
  ];

  for (const [i, p] of paragraphs.entries()) {
    drawParagraph(page, p, serif, 10.5, cursor, {
      lineHeight: 15.5,
      color: i === 0 ? INK : INK_SOFT,
      gapAfter: 10,
    });
  }

  // Signature block
  cursor.y -= 8;
  page.drawText("Yours sincerely,", { x: MARGIN, y: cursor.y, size: 10.5, font: serif, color: INK_SOFT });
  cursor.y -= 40;
  page.drawText("Rosewood Living", { x: MARGIN, y: cursor.y, size: 12, font: serifBold, color: INK });
  cursor.y -= 15;
  page.drawText("Licensee-in-Charge", { x: MARGIN, y: cursor.y, size: 9.5, font: sans, color: INK_SOFT });

  // Footer
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 22 },
    end: { x: PAGE_W - MARGIN, y: MARGIN + 22 },
    thickness: 1,
    color: LINE,
  });
  page.drawText(
    "Rosewood Living  ·  238 Victoria Rd, Gladesville NSW 2111  ·  info@rosewoodliving.com.au  ·  ABN 11 142 441 549",
    { x: MARGIN, y: MARGIN + 8, size: 8, font: sans, color: INK_SOFT },
  );

  return await doc.save();
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
