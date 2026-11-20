"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar, Button, Field, Icon, inputCls, PageHeader, Panel } from "@/components/ui";

const NOTIFS = [
  ["assigned", "A task is assigned to me"],
  ["mention", "Someone @mentions me"],
  ["comment", "Comments on my tasks"],
  ["due", "Due tomorrow and overdue reminders"],
  ["approval", "Client approvals and change requests"],
  ["digest", "Daily email digest at 9:00 am"],
] as const;

export default function SettingsPage() {
  const s = useStore();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(s.me.name);
  const [title, setTitle] = useState(s.me.title);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [prefs, setPrefs] = useState<Record<string, { app: boolean; email: boolean }>>(() => Object.fromEntries(NOTIFS.map(([k]) => [k, { app: k !== "digest", email: ["assigned", "approval", "digest"].includes(k) }])));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" sub={s.live ? "Your name, job title and photo." : "Your profile, password and notification choices."} />
      <div className="space-y-6">
        <Panel title="Profile">
          <form
            className="grid gap-4 p-5 sm:grid-cols-[auto_1fr]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              s.updateMe({ name: name.trim(), title: title.trim() });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <Avatar user={s.me} size={72} />
              <button type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy} className="text-xs font-semibold text-brand hover:underline disabled:opacity-50">
                {photoBusy ? "Uploading…" : "Change photo"}
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (f.size > 3 * 1024 * 1024) return setPhotoError("Photo must be under 3 MB.");
                  setPhotoBusy(true);
                  setPhotoError(null);
                  try {
                    s.updateMe({ photo: await s.uploadPhoto(f) });
                  } catch (err) {
                    setPhotoError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setPhotoBusy(false);
                  }
                }}
              />
              {photoError && <span className="max-w-[9rem] text-center text-[11px] text-urgent">{photoError}</span>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
              </Field>
              <Field label="Job title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email">
                  <input defaultValue={s.me.email} disabled className={`${inputCls} bg-canvas text-muted`} />
                </Field>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit">Save changes</Button>
                {saved && (
                  <span className="flex items-center gap-1 text-sm font-medium text-ok">
                    <Icon name="check" size={16} /> Saved
                  </span>
                )}
              </div>
            </div>
          </form>
        </Panel>

        {!s.live && (
        <>
        <Panel title="Notifications">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-faint uppercase">
                  <th className="px-5 py-2.5 font-semibold">When</th>
                  <th className="px-3 py-2.5 text-center font-semibold">In app</th>
                  <th className="px-5 py-2.5 text-center font-semibold">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {NOTIFS.map(([k, l]) => (
                  <tr key={k}>
                    <td className="px-5 py-3">{l}</td>
                    {(["app", "email"] as const).map((ch) => (
                      <td key={ch} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={prefs[k][ch]}
                          onChange={(e) => setPrefs((p) => ({ ...p, [k]: { ...p[k], [ch]: e.target.checked } }))}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                          aria-label={`${l} by ${ch}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">WhatsApp alerts arrive in version 2.</p>
        </Panel>

        <Panel title="Password">
          <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <Field label="Current password">
              <input type="password" className={inputCls} />
            </Field>
            <Field label="New password" hint="At least 8 characters">
              <input type="password" className={inputCls} />
            </Field>
            <div>
              <Button variant="outline" type="submit">
                Update password
              </Button>
            </div>
          </form>
        </Panel>
        </>
        )}

        <Button variant="ghost" onClick={() => (s.live ? s.signOut() : router.push("/login"))} className="text-urgent">
          <Icon name="logout" size={16} /> Sign out
        </Button>
      </div>
    </div>
  );
}
