import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { loiSchema, firstError } from "../../lib/schemas";
import { storeLead } from "../../lib/leads";
import { sendEmail, emailShell } from "../../lib/email";
import { generateLoiPdf, uint8ToBase64 } from "../../lib/pdf";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "Invalid request." }, 400);
  }

  const parsed = loiSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, message: firstError(parsed.error) }, 400);
  }
  const d = parsed.data;

  // Convert optional digit-strings to numbers for the dedicated integer columns.
  const num = (v: string | undefined): number | null =>
    v && v.length ? Number(v) : null;

  // Structured per-type breakdown (only the fields the developer actually filled in)
  // — used to enrich the team notification email.
  const breakdown: [string, string][] = (
    [
      ["Total apartments / units", d.totalApartments],
      ["Affordable housing apartments", d.affordableApartments],
      ["Boarding rooms", d.boardingRooms],
      ["Co-living rooms", d.coLivingRooms],
      ["Serviced apartments", d.servicedApartments],
      ["Retail floor area (m²)", d.retailAreaSqm],
      ["Commercial floor area (m²)", d.commercialAreaSqm],
    ] as [string, string | undefined][]
  ).filter((entry): entry is [string, string] => Boolean(entry[1]));

  await storeLead(env, {
    lead_type: "letter_of_intent",
    name: d.fullName,
    company: d.company,
    role: d.role,
    email: d.email,
    phone: d.phone,
    project_location: d.projectLocation,
    development_types: d.developmentTypes,
    dwellings: d.dwellings,
    project_stage: d.projectStage,
    total_apartments: num(d.totalApartments),
    affordable_apartments: num(d.affordableApartments),
    boarding_rooms: num(d.boardingRooms),
    co_living_rooms: num(d.coLivingRooms),
    serviced_apartments: num(d.servicedApartments),
    retail_area_sqm: num(d.retailAreaSqm),
    commercial_area_sqm: num(d.commercialAreaSqm),
    message: d.message ?? null,
    source: "loi_form",
  });

  // Generate the personalised LOI.
  let pdfBase64: string;
  try {
    const bytes = await generateLoiPdf(d);
    pdfBase64 = uint8ToBase64(bytes);
  } catch (err) {
    return json(
      { ok: false, message: "We couldn't generate your letter. Please try again or contact us." },
      500,
    );
  }

  const fileName = `Rosewood-Living-Letter-of-Intent-${d.company.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.pdf`;
  const notifyTo = env.LEADS_NOTIFY_TO || "hello@rosewoodliving.com.au";

  // Email the developer their copy with the PDF attached.
  await sendEmail(env, {
    to: d.email,
    subject: "Your Letter of Intent — Rosewood Living",
    attachments: [{ filename: fileName, content: pdfBase64 }],
    html: emailShell(
      `Your Letter of Intent, ${esc(d.fullName)}`,
      `<p>Thank you — please find your personalised Letter of Intent for
        <strong>${esc(d.projectLocation)}</strong> attached.</p>
       <p>This letter records our in-principle intent to act as your community and affordable
        housing partner. Our team will be in touch to take the next step with you.</p>`,
    ),
  });

  // Notify the team.
  await sendEmail(env, {
    to: notifyTo,
    replyTo: d.email,
    subject: `New Letter of Intent — ${d.company} (${d.projectLocation})`,
    attachments: [{ filename: fileName, content: pdfBase64 }],
    html: emailShell(
      "New Letter of Intent issued",
      `<p><strong>${esc(d.fullName)}</strong>, ${esc(d.role)} — ${esc(d.company)}</p>
       <p>Email: ${esc(d.email)}<br/>Phone: ${esc(d.phone)}</p>
       <p>Address: ${esc(d.projectLocation)}<br/>Development type(s): ${esc(d.developmentTypes)}<br/>
        Total dwellings: ${esc(d.dwellings)}<br/>Stage: ${esc(d.projectStage)}</p>
       ${
         breakdown.length
           ? `<p><strong>Breakdown</strong><br/>${breakdown
               .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
               .join("<br/>")}</p>`
           : ""
       }
       <p style="white-space:pre-wrap">${esc(d.message ?? "—")}</p>`,
    ),
  });

  return json({ ok: true, pdfBase64, fileName });
};
