// Odeslání e-mailu přes Resend (https://resend.com). Bez RESEND_API_KEY se nic neodesílá,
// e-mail se jen zapíše do logu jako „skipped“ – web tak funguje i bez nastavené služby.
// Odesílatel: EMAIL_FROM, např. "PokeLou <objednavky@pokelou.cz>" (doména musí být v Resend ověřená).

export type Attachment = { filename: string; /** base64 */ content: string; /** pro <img src="cid:…"> */ contentId?: string };

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: Attachment[];
};

export type MailResult = { status: "sent" | "failed" | "skipped"; providerId?: string; error?: string };

/** Testovací odesílatel Resendu: doručí jen na e-mail majitele účtu, než se ověří doména. */
export const DEFAULT_FROM = "PokeLou <onboarding@resend.dev>";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function deliver(mail: Mail, opts: { idempotencyKey?: string; fetchImpl?: typeof fetch } = {}): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "test") console.info(`[e-mail] RESEND_API_KEY chybí, neodesláno: „${mail.subject}“`);
    return { status: "skipped", error: "Chybí RESEND_API_KEY" };
  }
  const body = {
    from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
    to: [mail.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    ...(mail.headers ? { headers: mail.headers } : {}),
    ...(mail.attachments?.length
      ? { attachments: mail.attachments.map((a) => ({ filename: a.filename, content: a.content, ...(a.contentId ? { content_id: a.contentId } : {}) })) }
      : {}),
  };
  try {
    const res = await (opts.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { status: "failed", error: `${res.status} ${data.name ?? ""} ${data.message ?? ""}`.trim().slice(0, 500) };
    return { status: "sent", providerId: data.id };
  } catch (e) {
    return { status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
  }
}
