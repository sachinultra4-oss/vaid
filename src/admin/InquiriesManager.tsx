import React, { useState } from 'react';
import {
  Check,
  Download,
  LayoutGrid,
  List,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-react';
import type { InquiryRecord, InquiryStatus } from '../types/clinic';
import { adminFetch } from './adminApi';

const STATUSES: InquiryStatus[] = [
  'New',
  'Contacted',
  'Booked',
  'Visited',
  'Closed',
  'Not interested',
];

export function InquiriesManager({
  token,
  inquiries,
  globalSearch,
  onUpdated,
}: {
  token: string;
  inquiries: InquiryRecord[];
  globalSearch: string;
  onUpdated: (next: InquiryRecord[]) => void;
}) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [selected, setSelected] = useState<InquiryRecord | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [followUpInput, setFollowUpInput] = useState('');
  const [saving, setSaving] = useState(false);

  const combinedQ = (localSearch || globalSearch).trim().toLowerCase();
  const sources = Array.from(new Set(inquiries.map((i) => i.first_source || 'Direct')));

  const filtered = inquiries.filter((i) => {
    if (statusFilter !== 'All' && i.status !== statusFilter) return false;
    if (sourceFilter !== 'All' && (i.first_source || 'Direct') !== sourceFilter) return false;
    if (combinedQ) {
      const hay = `${i.patient_name} ${i.patient_phone} ${i.concern} ${i.notes} ${i.quiz_dosha}`.toLowerCase();
      if (!hay.includes(combinedQ)) return false;
    }
    return true;
  });

  const patchInquiry = async (
    id: string,
    payload: { status?: InquiryStatus; notes?: string; follow_up_date?: string; note?: string }
  ) => {
    setSaving(true);
    try {
      const data = await adminFetch<{ inquiry: InquiryRecord }>(
        `/api/admin/inquiries/${id}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      const nextList = inquiries.map((item) => (item.id === id ? data.inquiry : item));
      onUpdated(nextList);
      if (selected?.id === id) {
        setSelected(data.inquiry);
        setNoteInput(data.inquiry.notes);
        setFollowUpInput(data.inquiry.follow_up_date);
      }
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = async () => {
    const csv = await adminFetch<string>('/api/admin/inquiries/export.csv', token);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `khushdil-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (inq: InquiryRecord) => {
    setSelected(inq);
    setNoteInput(inq.notes);
    setFollowUpInput(inq.follow_up_date);
  };

  const buildReplyUrl = (inq: InquiryRecord) => {
    const clean = inq.patient_phone.replace(/\D/g, '');
    const waNum = clean.length === 10 ? `91${clean}` : clean;
    const msg = `Namaste ${inq.patient_name}, this is Khushdil Ayurvedic Clinic (Vaid Dr. Jashan Sandhu) following up on your ${inq.concern || 'consultation'} inquiry.`;
    return waNum.length >= 10
      ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/916284664722?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif t-28 font-medium">Inquiries & Leads</h2>
          <p className="t-14 text-[#12201A]/75">
            Form submissions, quiz leads, and WhatsApp consultations. Duplicate phone numbers merge automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="btn-secondary px-4"
          >
            {viewMode === 'table' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            <span>{viewMode === 'table' ? 'Cards' : 'Table'}</span>
          </button>
          <button type="button" onClick={downloadCsv} className="btn-primary px-5">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="clinic-card p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#12201A]/50" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name, phone, concern, notes..."
            className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[40px] px-3 rounded-xl border border-[#12201A]/20 bg-[#FAF7EF] text-sm font-bold"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="min-h-[40px] px-3 rounded-xl border border-[#12201A]/20 bg-[#FAF7EF] text-sm font-bold"
        >
          <option value="All">All Sources</option>
          {sources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={selected ? 'lg:col-span-7' : 'lg:col-span-12'}>
          {filtered.length === 0 ? (
            <div className="clinic-card p-8 text-center t-16 text-[#12201A]/65">
              No inquiries match the selected filters yet.
            </div>
          ) : viewMode === 'table' ? (
            <div className="clinic-card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#12201A]/15 bg-[#F4EFE2]/60 text-xs uppercase">
                  <tr>
                    <th className="p-3.5">Patient</th>
                    <th className="p-3.5">Concern / Source</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12201A]/10">
                  {filtered.map((inq) => (
                    <tr
                      key={inq.id}
                      onClick={() => openDetail(inq)}
                      className={`cursor-pointer hover:bg-[#F4EFE2]/45 ${
                        selected?.id === inq.id ? 'bg-[#0E3B26]/5' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-[#12201A]">
                          {inq.patient_name}
                          {inq.duplicate_count > 1 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-[#C9A24B]/25 text-xs">
                              ×{inq.duplicate_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#12201A]/75 tabular-nums">{inq.patient_phone}</div>
                        <div className="text-[11px] text-[#12201A]/55">
                          {new Date(inq.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold">{inq.concern || inq.quiz_dosha || 'General'}</div>
                        <div className="text-xs text-[#3E7A4A]">
                          {inq.first_source} · {inq.channel}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            inq.status === 'New'
                              ? 'bg-[#C46A3C] text-[#F4EFE2]'
                              : inq.status === 'Booked' || inq.status === 'Visited'
                              ? 'bg-[#0E3B26] text-[#F4EFE2]'
                              : 'bg-[#12201A]/10 text-[#12201A]'
                          }`}
                        >
                          {inq.status}
                        </span>
                      </td>
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {inq.patient_phone.replace(/\D/g, '').length >= 10 && (
                            <a
                              href={`tel:+91${inq.patient_phone.replace(/\D/g, '').slice(-10)}`}
                              title="Call patient"
                              className="p-2 rounded-full border border-[#12201A]/20 hover:bg-[#0E3B26] hover:text-[#F4EFE2]"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <a
                            href={buildReplyUrl(inq)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp reply"
                            className="p-2 rounded-full border border-[#12201A]/20 hover:bg-[#3E7A4A] hover:text-[#F4EFE2]"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                          {inq.status === 'New' && (
                            <button
                              type="button"
                              onClick={() => patchInquiry(inq.id, { status: 'Contacted' })}
                              className="px-2.5 py-1 rounded-full bg-[#0E3B26] text-[#F4EFE2] text-xs font-bold cursor-pointer"
                            >
                              Mark Contacted
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((inq) => (
                <div
                  key={inq.id}
                  onClick={() => openDetail(inq)}
                  className="clinic-card p-5 space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold t-16">{inq.patient_name}</p>
                      <p className="t-14 text-[#12201A]/75">{inq.patient_phone}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0E3B26] text-[#F4EFE2]">
                      {inq.status}
                    </span>
                  </div>
                  <p className="t-14">
                    <strong>Concern:</strong> {inq.concern || inq.quiz_dosha || 'General'}
                  </p>
                  <p className="text-xs text-[#3E7A4A] font-bold">
                    {inq.first_source} · {new Date(inq.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Detail & History Panel */}
        {selected && (
          <div className="lg:col-span-5 clinic-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif t-28 font-medium">{selected.patient_name}</h3>
                <p className="t-14 font-bold text-[#3E7A4A]">{selected.patient_phone}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="t-14 font-bold underline cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm bg-[#F4EFE2]/60 p-3.5 rounded-xl">
              <div><span className="text-[#12201A]/60 block text-xs">Concern</span><strong>{selected.concern || '-'}</strong></div>
              <div><span className="text-[#12201A]/60 block text-xs">Duration</span><strong>{selected.duration || '-'}</strong></div>
              <div><span className="text-[#12201A]/60 block text-xs">Mode & Time</span><strong>{[selected.visit_mode, selected.preferred_time].filter(Boolean).join(' · ') || '-'}</strong></div>
              <div><span className="text-[#12201A]/60 block text-xs">Source</span><strong>{selected.first_source}</strong></div>
            </div>

            <div className="space-y-2">
              <label className="block t-14 font-bold">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={saving}
                    onClick={() => patchInquiry(selected.id, { status: st })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                      selected.status === st
                        ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                        : 'bg-[#FAF7EF] text-[#12201A] border-[#12201A]/20'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block t-14 font-bold mb-1">Follow-up Reminder Date</label>
              <input
                type="date"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
              />
            </div>

            <div>
              <label className="block t-14 font-bold mb-1">Clinic Notes</label>
              <textarea
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write call outcome, pulse note, or prescription plan..."
                className="w-full p-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  patchInquiry(selected.id, {
                    notes: noteInput,
                    follow_up_date: followUpInput,
                  })
                }
                className="btn-primary px-5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Notes & Reminder'}</span>
              </button>
              <a
                href={buildReplyUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Reply</span>
              </a>
            </div>

            <div className="pt-4 border-t border-[#12201A]/12 space-y-2">
              <p className="t-14 font-bold">Audit History</p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {selected.history.map((h) => (
                  <div key={h.id} className="text-xs p-2.5 rounded-xl bg-[#F4EFE2]/55 border border-[#12201A]/10">
                    <div className="flex justify-between font-bold text-[#0E3B26]">
                      <span>{h.action_type}</span>
                      <span>{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[#12201A]/85 mt-0.5">{h.note}</p>
                    <p className="text-[#12201A]/55">by {h.actor_email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
