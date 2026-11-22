import React, { useEffect, useState } from 'react';
import { Download, History, Plus, RotateCcw, Save, Send, Trash2, UserPlus } from 'lucide-react';
import type {
  AdminRole,
  AdminUserPublic,
  ClinicPublicContent,
  ClinicSettingsAdmin,
  ContentVersionRecord,
  NotificationLogEntry,
} from '../types/clinic';
import { adminFetch } from './adminApi';

export function ContentEditorPage({
  token,
  initialContent,
  versions,
  onSaved,
  onPublicRefresh,
}: {
  token: string;
  initialContent: ClinicPublicContent;
  versions: ContentVersionRecord[];
  onSaved: (nextContent: ClinicPublicContent, nextVersions: ContentVersionRecord[]) => void;
  onPublicRefresh: () => void;
}) {
  const [draft, setDraft] = useState<ClinicPublicContent>(initialContent);
  const [summary, setSummary] = useState('Updated clinic details');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    setDraft(initialContent);
  }, [initialContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{
        content: ClinicPublicContent;
        versions: ContentVersionRecord[];
      }>('/api/admin/content', token, {
        method: 'PUT',
        body: JSON.stringify({ content: draft, summary }),
      });
      onSaved(data.content, data.versions);
      setDraft(data.content);
      onPublicRefresh();
      setMsg('Saved live content changes to website.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{
        content: ClinicPublicContent;
        versions: ContentVersionRecord[];
      }>(`/api/admin/content/restore/${versionId}`, token, { method: 'POST' });
      onSaved(data.content, data.versions);
      setDraft(data.content);
      onPublicRefresh();
      setMsg('Restored selected snapshot live.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Restore failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif t-28 font-medium">Live Content Editor</h2>
        <p className="t-14 text-[#12201A]/75">
          Edit phone numbers, district, timings, treatments, patient stories, FAQs, and reel links without redeploying.
        </p>
      </div>

      {err && <div role="alert" className="p-3.5 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold">{err}</div>}
      {msg && <div className="p-3.5 rounded-xl bg-[#3E7A4A]/15 border border-[#3E7A4A] t-14 font-bold text-[#0E3B26]">{msg}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Clinic Info */}
        <div className="clinic-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="md:col-span-2 font-serif t-20 font-medium">Clinic Details & Placeholders</h3>
          <div>
            <label className="block t-14 font-bold mb-1">Degree / Qualification</label>
            <input
              type="text"
              value={draft.degree}
              onChange={(e) => setDraft({ ...draft, degree: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Years in Practice</label>
            <input
              type="text"
              value={draft.yearsInPractice}
              onChange={(e) => setDraft({ ...draft, yearsInPractice: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Street & District</label>
            <input
              type="text"
              value={draft.streetAndDistrict}
              onChange={(e) => setDraft({ ...draft, streetAndDistrict: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Clinic Timings</label>
            <input
              type="text"
              value={draft.timings}
              onChange={(e) => setDraft({ ...draft, timings: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          {draft.phones.map((ph, idx) => (
            <div key={idx}>
              <label className="block t-14 font-bold mb-1">Phone {idx + 1} Display</label>
              <input
                type="text"
                value={ph.display}
                onChange={(e) => {
                  const clean = e.target.value;
                  const digits = clean.replace(/\D/g, '');
                  const next = [...draft.phones];
                  next[idx] = {
                    display: clean,
                    tel: `+91${digits}`,
                    whatsapp: `91${digits}`,
                  };
                  setDraft({ ...draft, phones: next });
                }}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
              />
            </div>
          ))}
        </div>

        {/* Treatments */}
        <div className="clinic-card p-6 space-y-4">
          <h3 className="font-serif t-20 font-medium">Treatments (8 Cards)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draft.treatments.map((tr, i) => (
              <div key={tr.id} className="p-4 rounded-xl bg-[#F4EFE2]/55 border border-[#12201A]/10 space-y-2">
                <input
                  type="text"
                  value={tr.title}
                  onChange={(e) => {
                    const next = [...draft.treatments];
                    next[i] = { ...tr, title: e.target.value };
                    setDraft({ ...draft, treatments: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] font-bold text-sm"
                />
                <textarea
                  rows={2}
                  value={tr.softLine}
                  onChange={(e) => {
                    const next = [...draft.treatments];
                    next[i] = { ...tr, softLine: e.target.value };
                    setDraft({ ...draft, treatments: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="clinic-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif t-20 font-medium">Patient Stories / Reviews</h3>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  reviews: [
                    ...draft.reviews,
                    {
                      id: `rev-${Date.now()}`,
                      quote: '[Real review here]',
                      name: '[Patient name]',
                      detail: '[Concern / District]',
                      consent_given: false,
                      is_published: true,
                    },
                  ],
                })
              }
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Review</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {draft.reviews.map((rev, i) => (
              <div key={rev.id} className="p-4 rounded-xl bg-[#F4EFE2]/55 border border-[#12201A]/10 space-y-2">
                <textarea
                  rows={3}
                  value={rev.quote}
                  onChange={(e) => {
                    const next = [...draft.reviews];
                    next[i] = { ...rev, quote: e.target.value };
                    setDraft({ ...draft, reviews: next });
                  }}
                  className="w-full p-2 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-sm"
                />
                <input
                  type="text"
                  value={rev.name}
                  onChange={(e) => {
                    const next = [...draft.reviews];
                    next[i] = { ...rev, name: e.target.value };
                    setDraft({ ...draft, reviews: next });
                  }}
                  placeholder="Patient name"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-xs font-bold"
                />
                <input
                  type="text"
                  value={rev.detail}
                  onChange={(e) => {
                    const next = [...draft.reviews];
                    next[i] = { ...rev, detail: e.target.value };
                    setDraft({ ...draft, reviews: next });
                  }}
                  placeholder="Concern / District"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="clinic-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif t-20 font-medium">Questions & Answers</h3>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  faqs: [
                    ...draft.faqs,
                    { id: `faq-${Date.now()}`, question: 'New question', answer: '', is_published: true },
                  ],
                })
              }
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>
          <div className="space-y-3">
            {draft.faqs.map((f, i) => (
              <div key={f.id} className="p-4 rounded-xl bg-[#F4EFE2]/55 border border-[#12201A]/10 space-y-2">
                <input
                  type="text"
                  value={f.question}
                  onChange={(e) => {
                    const next = [...draft.faqs];
                    next[i] = { ...f, question: e.target.value };
                    setDraft({ ...draft, faqs: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] font-bold text-sm"
                />
                <textarea
                  rows={2}
                  value={f.answer}
                  onChange={(e) => {
                    const next = [...draft.faqs];
                    next[i] = { ...f, answer: e.target.value };
                    setDraft({ ...draft, faqs: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reels */}
        <div className="clinic-card p-6 space-y-4">
          <h3 className="font-serif t-20 font-medium">Reels Titles & Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draft.reels.map((r, i) => (
              <div key={r.id} className="p-4 rounded-xl bg-[#F4EFE2]/55 border border-[#12201A]/10 space-y-2">
                <input
                  type="text"
                  value={r.title}
                  onChange={(e) => {
                    const next = [...draft.reels];
                    next[i] = { ...r, title: e.target.value };
                    setDraft({ ...draft, reels: next });
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] font-bold text-sm"
                />
                <input
                  type="text"
                  value={r.videoUrl}
                  onChange={(e) => {
                    const next = [...draft.reels];
                    next[i] = { ...r, videoUrl: e.target.value };
                    setDraft({ ...draft, reels: next });
                  }}
                  placeholder="MP4 video URL"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#12201A]/20 bg-[#FAF7EF] text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="clinic-card p-5 flex flex-wrap items-center justify-between gap-4">
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief note for version history"
            className="flex-1 min-w-[220px] min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Publish Content Changes'}</span>
          </button>
        </div>
      </form>

      {/* Version History */}
      <div className="clinic-card p-6 space-y-3">
        <div className="flex items-center gap-2 font-serif t-20 font-medium">
          <History className="w-5 h-5 text-[#C9A24B]" />
          <span>Version History</span>
        </div>
        {versions.length === 0 ? (
          <p className="t-14 text-[#12201A]/60">No prior edits saved yet.</p>
        ) : (
          <div className="divide-y divide-[#12201A]/10">
            {versions.map((v) => (
              <div key={v.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="t-14 font-bold">{v.summary}</p>
                  <p className="text-xs text-[#12201A]/65">
                    {new Date(v.created_at).toLocaleString()} · by {v.edited_by}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restoreVersion(v.id)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsPage({
  token,
  initialSettings,
  admins,
  notifications,
  onUpdated,
  onPublicRefresh,
}: {
  token: string;
  initialSettings: ClinicSettingsAdmin;
  admins: AdminUserPublic[];
  notifications: NotificationLogEntry[];
  onUpdated: (
    s: ClinicSettingsAdmin,
    a: AdminUserPublic[],
    n: NotificationLogEntry[]
  ) => void;
  onPublicRefresh: () => void;
}) {
  const [settings, setSettings] = useState<ClinicSettingsAdmin>(initialSettings);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('staff');
  const [newAdminTwoStep, setNewAdminTwoStep] = useState(false);
  const [deletePhone, setDeletePhone] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{ settings: ClinicSettingsAdmin }>(
        '/api/admin/settings',
        token,
        { method: 'PUT', body: JSON.stringify(settings) }
      );
      setSettings(data.settings);
      onUpdated(data.settings, admins, notifications);
      onPublicRefresh();
      setMsg('Saved clinic settings and pixel configuration.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed.');
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{ admins: AdminUserPublic[] }>('/api/admin/admins', token, {
        method: 'POST',
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPass,
          role: newAdminRole,
          two_step_enabled: newAdminTwoStep,
        }),
      });
      onUpdated(settings, data.admins, notifications);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPass('');
      setMsg('Added clinic admin user.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not add user.');
    }
  };

  const removeAdmin = async (id: string) => {
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{ admins: AdminUserPublic[] }>(
        `/api/admin/admins/${id}`,
        token,
        { method: 'DELETE' }
      );
      onUpdated(settings, data.admins, notifications);
      setMsg('Removed admin user.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Could not remove user.');
    }
  };

  const sendSummaryNow = async () => {
    setMsg('');
    try {
      const data = await adminFetch<{ notifications: NotificationLogEntry[]; message: string }>(
        '/api/admin/daily-summary/send',
        token,
        { method: 'POST' }
      );
      onUpdated(settings, admins, data.notifications);
      setMsg(data.message);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Failed to generate daily summary.');
    }
  };

  const deletePatientData = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      const data = await adminFetch<{ message: string }>(
        '/api/admin/patient-data/delete',
        token,
        { method: 'POST', body: JSON.stringify({ phone: deletePhone }) }
      );
      setDeletePhone('');
      setMsg(data.message);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Deletion failed.');
    }
  };

  const downloadBackup = async () => {
    const jsonText = await adminFetch<string>('/api/admin/export-all', token);
    const blob = new Blob([typeof jsonText === 'string' ? jsonText : JSON.stringify(jsonText, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khushdil-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif t-28 font-medium">Settings, Access & Privacy</h2>
        <p className="t-14 text-[#12201A]/75">
          Owner-only controls for ad pixels (loaded only after visitor consent), staff accounts, notifications, and data deletion.
        </p>
      </div>

      {err && <div role="alert" className="p-3.5 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold">{err}</div>}
      {msg && <div className="p-3.5 rounded-xl bg-[#3E7A4A]/15 border border-[#3E7A4A] t-14 font-bold text-[#0E3B26]">{msg}</div>}

      <form onSubmit={saveSettings} className="clinic-card p-6 space-y-5">
        <h3 className="font-serif t-20 font-medium">Pixels, Notifications & Privacy Text</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block t-14 font-bold mb-1">Meta Pixel ID (optional)</label>
            <input
              type="text"
              value={settings.metaPixelId}
              onChange={(e) => setSettings({ ...settings, metaPixelId: e.target.value })}
              placeholder="Digits only — loads only after Accept"
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Google Analytics 4 ID (optional)</label>
            <input
              type="text"
              value={settings.ga4Id}
              onChange={(e) => setSettings({ ...settings, ga4Id: e.target.value })}
              placeholder="G-XXXXXXXXXX — loads only after Accept"
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Owner Notification Email</label>
            <input
              type="email"
              value={settings.ownerEmail}
              onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
          <div>
            <label className="block t-14 font-bold mb-1">Daily Summary Time</label>
            <input
              type="time"
              value={settings.dailySummaryTime}
              onChange={(e) => setSettings({ ...settings, dailySummaryTime: e.target.value })}
              className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 t-14 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.instantAlertEnabled}
              onChange={(e) => setSettings({ ...settings, instantAlertEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#0E3B26]"
            />
            <span>Instant inquiry notifications</span>
          </label>
          <label className="flex items-center gap-2 t-14 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dailySummaryEnabled}
              onChange={(e) => setSettings({ ...settings, dailySummaryEnabled: e.target.checked })}
              className="w-4 h-4 accent-[#0E3B26]"
            />
            <span>8pm daily summary log</span>
          </label>
        </div>

        <div>
          <label className="block t-14 font-bold mb-1">Cookie Notice Text</label>
          <textarea
            rows={2}
            value={settings.cookieBannerText}
            onChange={(e) => setSettings({ ...settings, cookieBannerText: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
        </div>

        <div>
          <label className="block t-14 font-bold mb-1">Privacy Summary (/privacy)</label>
          <textarea
            rows={2}
            value={settings.privacySummary}
            onChange={(e) => setSettings({ ...settings, privacySummary: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
        </div>

        <button type="submit" className="btn-primary">
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </form>

      {/* Admin Users & Roles */}
      <div className="clinic-card p-6 space-y-5">
        <h3 className="font-serif t-20 font-medium">Admin Users & Roles</h3>
        <div className="divide-y divide-[#12201A]/10">
          {admins.map((u) => (
            <div key={u.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="t-14 font-bold">
                  {u.name}{' '}
                  <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs bg-[#0E3B26] text-[#F4EFE2]">
                    {u.role}
                  </span>
                  {u.two_step_enabled && (
                    <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-[#C9A24B]/25">
                      2-step
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#12201A]/65">{u.email}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAdmin(u.id)}
                className="p-2 rounded-full border border-[#C46A3C]/40 text-[#C46A3C] hover:bg-[#C46A3C] hover:text-[#F4EFE2] cursor-pointer"
                title="Remove user"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addAdmin} className="pt-4 border-t border-[#12201A]/12 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <input
            type="text"
            required
            value={newAdminName}
            onChange={(e) => setNewAdminName(e.target.value)}
            placeholder="Staff name"
            className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
          <input
            type="email"
            required
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            placeholder="Email"
            className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            value={newAdminPass}
            onChange={(e) => setNewAdminPass(e.target.value)}
            placeholder="Password (8+)"
            className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
          <select
            value={newAdminRole}
            onChange={(e) => setNewAdminRole(e.target.value as AdminRole)}
            className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#FAF7EF] text-sm font-bold"
          >
            <option value="staff">Staff (Inquiries & Photos)</option>
            <option value="owner">Owner (Full Access)</option>
          </select>
          <button type="submit" className="btn-primary px-4">
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
          <label className="md:col-span-5 flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={newAdminTwoStep}
              onChange={(e) => setNewAdminTwoStep(e.target.checked)}
              className="w-4 h-4 accent-[#0E3B26]"
            />
            <span>Require 2-step email code for this user</span>
          </label>
        </form>
      </div>

      {/* Notifications, Backup & Patient Data Deletion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clinic-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif t-20 font-medium">Alert Log & 8pm Summary</h3>
            <button type="button" onClick={sendSummaryNow} className="btn-secondary px-3 py-1.5 text-xs">
              <Send className="w-3.5 h-3.5" />
              <span>Run Summary Now</span>
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="t-14 text-[#12201A]/60">No notifications triggered yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-[#F4EFE2]/55 text-xs">
                  <div className="flex justify-between font-bold text-[#0E3B26]">
                    <span>{n.subject}</span>
                    <span>{n.dispatched_via}</span>
                  </div>
                  <p className="mt-1 text-[#12201A]/80">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="clinic-card p-6 space-y-5">
          <div>
            <h3 className="font-serif t-20 font-medium mb-2">Export & Patient Privacy Tool</h3>
            <button type="button" onClick={downloadBackup} className="btn-secondary">
              <Download className="w-4 h-4" />
              <span>Download Full Clinic Backup (JSON)</span>
            </button>
          </div>

          <form onSubmit={deletePatientData} className="pt-4 border-t border-[#12201A]/12 space-y-3">
            <label className="block t-14 font-bold text-[#C46A3C]">
              Delete a patient’s data by phone number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                required
                value={deletePhone}
                onChange={(e) => setDeletePhone(e.target.value)}
                placeholder="10-digit patient mobile"
                className="flex-1 min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
              />
              <button type="submit" className="px-4 min-h-[42px] rounded-full bg-[#C46A3C] text-[#F4EFE2] text-sm font-bold cursor-pointer">
                Delete Data
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
