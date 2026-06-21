export interface EmailAttachment {
  filename: string;
  /** base64-encoded content */
  content: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

const DEFAULT_FROM = "Rosewood Living <hello@rosewoodliving.com.au>";

/**
 * Best-effort transactional email via Resend's REST API (no SDK needed in
 * Workers). Returns `sent: false` silently when no API key is configured.
 */
export async function sendEmail(
  env: Env,
  msg: EmailMessage,
): Promise<{ sent: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) return { sent: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        reply_to: msg.replyTo,
        attachments: msg.attachments,
      }),
    });
    if (!res.ok) {
      return { sent: false, error: `Resend ${res.status}: ${await res.text()}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** Minimal branded HTML wrapper for transactional mail. */
export function emailShell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3ecdf;font-family:Georgia,'Times New Roman',serif;color:#241b14">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px">
    <div style="font-size:20px;letter-spacing:0.04em;color:#7a4434"><strong>ROSEWOOD LIVING</strong></div>
    <div style="height:1px;background:#d6c8b1;margin:18px 0 28px"></div>
    <h1 style="font-size:24px;font-weight:normal;margin:0 0 16px">${heading}</h1>
    <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#57473a">${bodyHtml}</div>
    <div style="height:1px;background:#d6c8b1;margin:32px 0 16px"></div>
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8b7a66;margin:0">
      Rosewood Living &middot; Community &amp; Affordable Housing Management &amp; Advisory &middot; Sydney, NSW
    </p>
  </div></body></html>`;
}
