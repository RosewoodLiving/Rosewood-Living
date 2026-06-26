import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LoiInput } from "./schemas";
import { CREST_PNG_BASE64, CREST_PNG_WIDTH, CREST_PNG_HEIGHT } from "./crest-logo";
import { SIGNATURE_PNG_BASE64, SIGNATURE_PNG_WIDTH, SIGNATURE_PNG_HEIGHT } from "./signature";

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

/** Best-effort suburb extraction from a free-text address (token before the state). */
function parseSuburb(address: string): string | null {
  const match = address.match(
    /,\s*([A-Za-z .'\-]+?)\s+(?:NSW|New South Wales|ACT|VIC|QLD|SA|WA|TAS|NT)\b/i,
  );
  const suburb = match?.[1]?.trim();
  return suburb && suburb.length >= 2 ? suburb : null;
}

/** A noun describing the affordable housing, chosen from the selected development type(s). */
function dwellingNoun(developmentTypes: string): string {
  const types = developmentTypes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (types.some((t) => t === "Apartments / Units" || t === "Mixed use")) return "apartments";
  if (types.includes("Boarding house")) return "boarding rooms";
  if (types.includes("Co-living housing")) return "co-living rooms";
  if (types.includes("Serviced apartments")) return "serviced apartments";
  return "dwellings";
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

/** Word-wrapped paragraph that can switch fonts/colour per segment (e.g. a bold address). */
function drawRichText(
  page: PDFPage,
  segments: { text: string; bold?: boolean }[],
  opts: {
    font: PDFFont;
    bold: PDFFont;
    size: number;
    lineHeight?: number;
    color?: ReturnType<typeof rgb>;
    boldColor?: ReturnType<typeof rgb>;
    gapAfter?: number;
  },
  cursor: Cursor,
) {
  const lineHeight = opts.lineHeight ?? opts.size * 1.5;
  const baseColor = opts.color ?? INK_SOFT;
  const boldColor = opts.boldColor ?? INK;
  const spaceW = opts.font.widthOfTextAtSize(" ", opts.size);

  const tokens: { text: string; font: PDFFont; color: ReturnType<typeof rgb> }[] = [];
  for (const seg of segments) {
    const font = seg.bold ? opts.bold : opts.font;
    const color = seg.bold ? boldColor : baseColor;
    for (const word of seg.text.split(/\s+/)) {
      if (word.length) tokens.push({ text: word, font, color });
    }
  }

  let x = MARGIN;
  let atLineStart = true;
  for (const t of tokens) {
    const w = t.font.widthOfTextAtSize(t.text, opts.size);
    if (!atLineStart && x + spaceW + w > MARGIN + MAX_W) {
      cursor.y -= lineHeight;
      x = MARGIN;
      atLineStart = true;
    }
    if (!atLineStart) x += spaceW;
    page.drawText(t.text, { x, y: cursor.y, size: opts.size, font: t.font, color: t.color });
    x += w;
    atLineStart = false;
  }
  cursor.y -= lineHeight;
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
  for (const [i, lineText] of [data.fullName, data.role, data.company].entries()) {
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

  // Subject / title
  const noun = dwellingNoun(data.developmentTypes);
  // Title-case the noun so it matches the capitalisation of the rest of the heading.
  const nounTitle = noun
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const subject = `Letter of Intent — Submission for Affordable Housing Uplift & Management of Affordable Housing ${nounTitle} at ${data.projectLocation}`;
  drawParagraph(page, subject, serifBold, 12, cursor, { lineHeight: 17, color: INK, gapAfter: 14 });

  // Body — modelled on the approved Rosewood Living letter wording.
  const suburb = parseSuburb(data.projectLocation);
  const locationSuffix = suburb ? ` based in ${suburb}, New South Wales` : " in New South Wales";

  // Salutation
  drawParagraph(page, `Dear ${data.fullName},`, serif, 10.5, cursor, {
    lineHeight: 15.5,
    color: INK,
    gapAfter: 10,
  });

  // First paragraph keeps the project address in bold for emphasis.
  drawRichText(
    page,
    [
      {
        text: "We write to submit this Letter of Intent confirming our proposal to manage the affordable housing component within the proposed development at ",
      },
      { text: data.projectLocation, bold: true },
      {
        text: ` on behalf of ${data.company}. Rosewood Living confirms its intention to manage the affordable housing ${noun} for a minimum period of fifteen (15) years. This management period will commence from the date of issue of the Occupation Certificate.`,
      },
    ],
    { font: serif, bold: serifBold, size: 10.5, lineHeight: 15.5, color: INK_SOFT, boldColor: INK, gapAfter: 10 },
    cursor,
  );

  const remaining = [
    `Rosewood Living is a registered Tier 3 Community Housing Provider, and ${data.company} is a leading developer${locationSuffix}.`,
    `We confirm that all affordable housing dwellings within the development will be managed in accordance with the NSW Affordable Housing Guidelines and any conditions of consent issued by the Department of Planning, Housing and Infrastructure. This agreement will come into effect upon handover of the affordable housing ${noun} following the issue of the Occupation Certificate.`,
    `We trust this Letter of Intent satisfies the requirements of the Development Application documentation. Should you require any further information or clarification, please do not hesitate to contact us.`,
  ];

  for (const p of remaining) {
    drawParagraph(page, p, serif, 10.5, cursor, { lineHeight: 15.5, color: INK_SOFT, gapAfter: 10 });
  }

  // Signature block — Leon's embedded signature above the name + title.
  cursor.y -= 8;
  page.drawText("Yours sincerely,", { x: MARGIN, y: cursor.y, size: 10.5, font: serif, color: INK_SOFT });
  cursor.y -= 8;

  const signature = await doc.embedPng(base64ToUint8(SIGNATURE_PNG_BASE64));
  const sigW = 150;
  const sigH = sigW * (SIGNATURE_PNG_HEIGHT / SIGNATURE_PNG_WIDTH);
  page.drawImage(signature, { x: MARGIN, y: cursor.y - sigH, width: sigW, height: sigH });
  // Clear the full signature height plus breathing room so the name never overlaps the ink.
  cursor.y -= sigH + 22;

  page.drawText("(Leon) See Chan", { x: MARGIN, y: cursor.y, size: 12, font: serifBold, color: INK });
  cursor.y -= 15;
  page.drawText("Licensee in Charge", { x: MARGIN, y: cursor.y, size: 9.5, font: sans, color: INK_SOFT });

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
