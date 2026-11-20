import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only email helpers. Needs these env vars (Vercel → Settings → Environment Variables):
 *   SUPABASE_SERVICE_ROLE_KEY  read who to email (server only, never sent to browsers)
 *   RESEND_API_KEY             from resend.com → API Keys
 *   EMAIL_FROM                 e.g. "Workboard <tasks@yourdomain.com>" (domain verified in Resend)
 *   APP_URL                    e.g. https://team-task-manager-pied-six.vercel.app
 * Without RESEND_API_KEY nothing is sent; the app keeps working.
 */

export const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const emailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && APP_URL);

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One plain, readable layout for every email. `blocks` are already-escaped HTML. */
export function layout(opts: { heading: string; intro?: string; blocks?: string[]; cta?: { label: string; href: string } }) {
  const cta = opts.cta
    ? `<p style="margin:28px 0 0"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#1f6f5c;color:#fff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:8px">${esc(opts.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f4f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1c1a">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;font-weight:600">Workboard</p>
<div style="background:#fff;border:1px solid #e6e3dc;border-radius:14px;padding:28px">
<h1 style="margin:0;font-size:20px;line-height:1.3">${esc(opts.heading)}</h1>
${opts.intro ? `<p style="margin:10px 0 0;color:#5f5c55;font-size:15px;line-height:1.5">${esc(opts.intro)}</p>` : ""}
${(opts.blocks ?? []).join("")}
${cta}
</div>
<p style="margin:18px 4px 0;color:#8a867d;font-size:12px;line-height:1.5">You can turn these emails off in Workboard → Settings.</p>
</div></body></html>`;
}

export function taskList(title: string, items: { title: string; meta: string; href: string }[], tone = "#1d1c1a") {
  if (!items.length) return "";
  const rows = items
    .map(
      (i) =>
        `<li style="padding:10px 0;border-top:1px solid #eeebe4"><a href="${esc(i.href)}" style="color:#1d1c1a;font-weight:600;text-decoration:none">${esc(i.title)}</a><br><span style="color:#8a867d;font-size:13px">${esc(i.meta)}</span></li>`,
    )
    .join("");
  return `<h2 style="margin:24px 0 4px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${tone}">${esc(title)} (${items.length})</h2><ul style="list-style:none;margin:0;padding:0">${rows}</ul>`;
}

export { esc };
