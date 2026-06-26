import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { enquirySchema, firstError } from "../../lib/schemas";
import { storeLead } from "../../lib/leads";
import { sendEmail, emailShell } from "../../lib/email";

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

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, message: firstError(parsed.error) }, 400);
  }
  const d = parsed.data;

  await storeLead(env, {
    lead_type: "general_enquiry",
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone ?? null,
    project_stage: d.projectStage ?? null,
    message: d.message,
    source: "home_enquiry",
  });

  const notifyTo = env.LEADS_NOTIFY_TO || "hello@rosewoodliving.com.au";

  await sendEmail(env, {
    to: notifyTo,
    replyTo: d.email,
    subject: `New enquiry — ${d.company}`,
    html: emailShell(
      "New general enquiry",
      `<p><strong>${esc(d.name)}</strong> — ${esc(d.company)}</p>
       <p>Email: ${esc(d.email)}<br/>Phone: ${esc(d.phone ?? "—")}<br/>Stage: ${esc(d.projectStage ?? "—")}</p>
       <p style="white-space:pre-wrap">${esc(d.message)}</p>`,
    ),
  });

  await sendEmail(env, {
    to: d.email,
    subject: "We've received your enquiry — Rosewood Living",
    html: emailShell(
      `Thank you, ${esc(d.name)}`,
      `<p>Thank you for reaching out to Rosewood Living. We've received your enquiry and one of
        our advisors will be in touch shortly to talk through your project.</p>
       <p>In the meantime, if your project is ready to move forward, you can request a
        personalised Letter of Intent at any time.</p>`,
    ),
  });

  return json({ ok: true });
};
