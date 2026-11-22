import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  ExternalLink,
  FileEdit,
  Image as ImageIcon,
  Inbox,
  LogOut,
  MousePointerClick,
  RefreshCw,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import { useClinicData } from '../context/ClinicContext';
import type {
  AdminUserPublic,
  AdSpendRecord,
  ClinicPublicContent,
  ClinicSettingsAdmin,
  ContentVersionRecord,
  InquiryRecord,
  NotificationLogEntry,
  PhotoSlotRecord,
} from '../types/clinic';
import { tracker } from '../utils/tracker';
import { AdminAuthScreen, type AuthSession } from './AdminAuthScreen';
import { adminFetch, computePresetDates, type DateRangeFilter } from './adminApi';
import { ContentEditorPage, SettingsPage } from './ContentAndSettings';
import { InquiriesManager } from './InquiriesManager';
import { PhotosManager } from './PhotosManager';
import { DualLineChart, HorizontalBarList, HourlyHeatmap } from './SvgCharts';

type AdminTab =
  | 'overview'
  | 'visitors'
  | 'sources'
  | 'inquiries'
  | 'behaviour'
  | 'contact-taps'
  | 'photos'
  | 'content'
  | 'settings';

interface OverviewResponse {
  role: 'owner' | 'staff';
  newInquiriesCount: number;
  missingPhotosCount: number;
  missingAltCount: number;
  kpis: {
    visitors: number | null;
    visitorsDelta: number | null;
    pageViews: number | null;
    pageViewsDelta: number | null;
    inquiries: number;
    inquiriesDelta: number | null;
    callsTapped: number;
    callsDelta: number | null;
    whatsappTaps: number;
    whatsappDelta: number | null;
    conversionRate: number | null;
    conversionDelta: number | null;
  };
  dailySeries: Array<{ date: string; visitors: number; inquiries: number }>;
  topSources: Array<{ source: string; visitors: number; inquiries: number }>;
  needsAttention: InquiryRecord[];
  followUpsDue: InquiryRecord[];
}

interface VisitorsResponse {
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  avgDurationSec: number;
  pagesPerVisit: number;
  liveVisitors: number;
  devices: Record<string, number>;
  browsers: Record<string, number>;
  languages: Record<string, number>;
  locations: Record<string, number>;
  heatmap: number[][];
}

interface SourcesResponse {
  sources: Array<{
    source: string;
    visits: number;
    uniqueVisitors: number;
    inquiries: number;
    fbclidHits: number;
    gclidHits: number;
  }>;
  campaigns: Array<{
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    visits: number;
    inquiries: number;
  }>;
  adSpend: AdSpendRecord[];
  totalSpendInr: number;
  costPerInquiryInr: number | null;
}

interface BehaviourResponse {
  scrollDepth: Record<string, number>;
  sections: Array<{ label: string; count: number }>;
  treatments: Array<{ label: string; count: number }>;
  bodyMapHotspots: Array<{ label: string; count: number }>;
  quiz: { starts: number; completions: number; results: Array<{ label: string; count: number }> };
  reels: Array<{ label: string; count: number }>;
  faqs: Array<{ label: string; count: number }>;
  formFunnel: {
    form_view: number;
    form_step_1: number;
    form_step_2: number;
    form_step_3: number;
    form_submit: number;
  };
}

interface ContactTapsResponse {
  calls: Array<{ label: string; count: number }>;
  whatsapp: Array<{ label: string; count: number }>;
  instagram: Array<{ label: string; count: number }>;
  directions: Array<{ label: string; count: number }>;
  totals: {
    callTaps: number;
    whatsappTaps: number;
    instagramTaps: number;
    directionsTaps: number;
  };
}

function DeltaLabel({ val, suffix = '%' }: { val: number | null; suffix?: string }) {
  if (val === null) return null;
  const positive = val >= 0;
  return (
    <p className={`text-xs font-bold mt-1 ${positive ? 'text-[#3E7A4A]' : 'text-[#C46A3C]'}`}>
      {positive ? `+${val}${suffix}` : `${val}${suffix}`} vs previous period
    </p>
  );
}

export function AdminDashboard({ onNavigatePublic }: { onNavigatePublic: () => void }) {
  const { refreshBootstrap } = useClinicData();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dateRange, setDateRange] = useState<DateRangeFilter>(() => ({
    preset: '30d',
    ...computePresetDates('30d'),
  }));
  const [globalSearch, setGlobalSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tab states
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [visitors, setVisitors] = useState<VisitorsResponse | null>(null);
  const [sources, setSources] = useState<SourcesResponse | null>(null);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [behaviour, setBehaviour] = useState<BehaviourResponse | null>(null);
  const [contactTaps, setContactTaps] = useState<ContactTapsResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoSlotRecord[]>([]);
  const [contentData, setContentData] = useState<{
    content: ClinicPublicContent;
    versions: ContentVersionRecord[];
  } | null>(null);
  const [settingsData, setSettingsData] = useState<{
    settings: ClinicSettingsAdmin;
    admins: AdminUserPublic[];
    notifications: NotificationLogEntry[];
  } | null>(null);

  // Ad spend input state
  const [spendChannel, setSpendChannel] = useState('Instagram / Meta Ads');
  const [spendAmount, setSpendAmount] = useState('');

  // Enforce noindex meta tag while /admin is mounted
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const prevContent = meta.getAttribute('content') || '';
    meta.setAttribute('content', 'noindex, nofollow');
    tracker.setAdminSession(true);

    return () => {
      tracker.setAdminSession(false);
      if (created && meta?.parentNode) meta.parentNode.removeChild(meta);
      else if (meta) meta.setAttribute('content', prevContent);
    };
  }, []);

  // Auto sign-out on 12h expiry
  useEffect(() => {
    if (!session) return;
    const msLeft = session.exp - Date.now();
    if (msLeft <= 0) {
      setSession(null);
      return;
    }
    const t = window.setTimeout(() => setSession(null), msLeft);
    return () => window.clearTimeout(t);
  }, [session]);

  const loadActiveTab = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    const qs = `from=${encodeURIComponent(dateRange.from)}&to=${encodeURIComponent(dateRange.to)}`;
    const t = session.token;

    try {
      // Always keep overview badge fresh
      const ov = await adminFetch<OverviewResponse>(`/api/admin/overview?${qs}`, t);
      setOverview(ov);

      if (activeTab === 'visitors' && session.user.role === 'owner') {
        setVisitors(await adminFetch<VisitorsResponse>(`/api/admin/visitors?${qs}`, t));
      } else if (activeTab === 'sources' && session.user.role === 'owner') {
        setSources(await adminFetch<SourcesResponse>(`/api/admin/sources?${qs}`, t));
      } else if (activeTab === 'inquiries') {
        const res = await adminFetch<{ inquiries: InquiryRecord[] }>('/api/admin/inquiries', t);
        setInquiries(res.inquiries);
      } else if (activeTab === 'behaviour' && session.user.role === 'owner') {
        setBehaviour(await adminFetch<BehaviourResponse>(`/api/admin/behaviour?${qs}`, t));
      } else if (activeTab === 'contact-taps' && session.user.role === 'owner') {
        setContactTaps(await adminFetch<ContactTapsResponse>(`/api/admin/contact-taps?${qs}`, t));
      } else if (activeTab === 'photos') {
        const res = await adminFetch<{ photos: PhotoSlotRecord[] }>('/api/admin/photos', t);
        setPhotos(res.photos);
      } else if (activeTab === 'content' && session.user.role === 'owner') {
        setContentData(
          await adminFetch<{ content: ClinicPublicContent; versions: ContentVersionRecord[] }>(
            '/api/admin/content',
            t
          )
        );
      } else if (activeTab === 'settings' && session.user.role === 'owner') {
        setSettingsData(
          await adminFetch<{
            settings: ClinicSettingsAdmin;
            admins: AdminUserPublic[];
            notifications: NotificationLogEntry[];
          }>('/api/admin/settings', t)
        );
      }
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 401) {
        setSession(null);
      } else {
        setError(e.message || 'Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  }, [session, activeTab, dateRange]);

  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  if (!session) {
    return (
      <AdminAuthScreen
        onAuthenticated={(s) => {
          setSession(s);
          setActiveTab(s.user.role === 'staff' ? 'inquiries' : 'overview');
        }}
        onBackPublic={onNavigatePublic}
      />
    );
  }

  const isOwner = session.user.role === 'owner';

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    ownerOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'visitors', label: 'Visitors', icon: Users, ownerOnly: true },
    { id: 'sources', label: 'Sources & Ads', icon: Activity, ownerOnly: true },
    { id: 'inquiries', label: 'Inquiries', icon: Inbox },
    { id: 'behaviour', label: 'Behaviour', icon: Activity, ownerOnly: true },
    { id: 'contact-taps', label: 'Contact Taps', icon: MousePointerClick, ownerOnly: true },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
    { id: 'content', label: 'Content', icon: FileEdit, ownerOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, ownerOnly: true },
  ];

  const visibleNav = navItems.filter((item) => !item.ownerOnly || isOwner);

  const saveAdSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendAmount) return;
    await adminFetch('/api/admin/ad-spend', session.token, {
      method: 'POST',
      body: JSON.stringify({
        month_key: new Date().toISOString().slice(0, 7),
        channel: spendChannel,
        amount_inr: Number(spendAmount),
      }),
    });
    setSpendAmount('');
    loadActiveTab();
  };

  return (
    <div className="min-h-screen bg-[#F4EFE2] text-[#12201A] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0E3B26] text-[#F4EFE2] p-5 justify-between">
        <div>
          <div className="pb-6 border-b border-[#F4EFE2]/15">
            <p className="font-serif t-20 font-medium text-[#F4EFE2]">Khushdil Clinic</p>
            <p className="text-xs text-[#C9A24B] font-bold mt-0.5 uppercase">
              {session.user.role} · {session.user.name}
            </p>
          </div>

          <nav className="mt-6 space-y-1.5" aria-label="Dashboard navigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#F4EFE2] text-[#0E3B26]'
                      : 'text-[#F4EFE2]/85 hover:bg-[#F4EFE2]/10'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'inquiries' && (overview?.newInquiriesCount || 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#C46A3C] text-[#F4EFE2]">
                      {overview?.newInquiriesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#F4EFE2]/15 space-y-2">
          <button
            type="button"
            onClick={onNavigatePublic}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-[#F4EFE2]/85 hover:bg-[#F4EFE2]/10 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Public Site</span>
          </button>
          <button
            type="button"
            onClick={() => setSession(null)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-[#C9A24B] hover:bg-[#F4EFE2]/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 pb-24 lg:pb-12">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#FAF7EF]/92 backdrop-blur-md border-b border-[#12201A]/12 px-4 sm:px-8 py-3.5">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['today', '7d', '30d'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDateRange({ preset, ...computePresetDates(preset) })}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                    dateRange.preset === preset
                      ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                      : 'bg-[#F4EFE2] text-[#12201A] border-[#12201A]/20'
                  }`}
                >
                  {preset === 'today' ? 'Today' : preset === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, preset: 'custom', from: e.target.value })}
                aria-label="From date"
                className="px-2.5 py-1 rounded-full border border-[#12201A]/20 bg-[#FAF7EF] text-xs font-bold"
              />
              <span className="text-xs font-bold text-[#12201A]/50">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, preset: 'custom', to: e.target.value })}
                aria-label="To date"
                className="px-2.5 py-1 rounded-full border border-[#12201A]/20 bg-[#FAF7EF] text-xs font-bold"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#12201A]/50" />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Quick search..."
                  className="w-36 sm:w-48 min-h-[36px] pl-8 pr-3 rounded-full border border-[#12201A]/20 bg-[#F4EFE2]/60 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('inquiries')}
                className="px-3 py-1.5 rounded-full bg-[#C46A3C] text-[#F4EFE2] text-xs font-bold cursor-pointer"
              >
                New inquiries: {overview?.newInquiriesCount ?? 0}
              </button>

              <button
                type="button"
                onClick={loadActiveTab}
                title="Refresh dashboard"
                className="p-2 rounded-full border border-[#12201A]/20 hover:bg-[#12201A]/5 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setSession(null)}
                className="lg:hidden p-2 rounded-full border border-[#12201A]/20 text-[#C46A3C] cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          {error && (
            <div role="alert" className="p-4 rounded-xl bg-[#C46A3C]/15 border border-[#C46A3C] t-14 font-bold">
              {error}
            </div>
          )}

          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif t-28 font-medium">Clinic Overview</h1>
                <p className="t-14 text-[#12201A]/70">
                  {overview.missingPhotosCount > 0
                    ? `${overview.missingPhotosCount} photo slot(s) currently show stand-ins (${overview.missingAltCount} missing alt text).`
                    : 'All clinic photo slots are populated.'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {isOwner && (
                  <>
                    <div className="clinic-card p-4">
                      <p className="text-xs font-bold text-[#12201A]/65">Visitors</p>
                      <p className="font-serif t-28 mt-1 tabular-nums">{overview.kpis.visitors ?? 0}</p>
                      <DeltaLabel val={overview.kpis.visitorsDelta} />
                    </div>
                    <div className="clinic-card p-4">
                      <p className="text-xs font-bold text-[#12201A]/65">Page Views</p>
                      <p className="font-serif t-28 mt-1 tabular-nums">{overview.kpis.pageViews ?? 0}</p>
                      <DeltaLabel val={overview.kpis.pageViewsDelta} />
                    </div>
                  </>
                )}
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Inquiries</p>
                  <p className="font-serif t-28 mt-1 tabular-nums">{overview.kpis.inquiries}</p>
                  <DeltaLabel val={overview.kpis.inquiriesDelta} />
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Calls Tapped</p>
                  <p className="font-serif t-28 mt-1 tabular-nums">{overview.kpis.callsTapped}</p>
                  <DeltaLabel val={overview.kpis.callsDelta} />
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">WhatsApp Taps</p>
                  <p className="font-serif t-28 mt-1 tabular-nums">{overview.kpis.whatsappTaps}</p>
                  <DeltaLabel val={overview.kpis.whatsappDelta} />
                </div>
                {isOwner && (
                  <div className="clinic-card p-4">
                    <p className="text-xs font-bold text-[#12201A]/65">Conversion</p>
                    <p className="font-serif t-28 mt-1 tabular-nums">
                      {overview.kpis.conversionRate ?? 0}%
                    </p>
                    <DeltaLabel val={overview.kpis.conversionDelta} suffix=" pts" />
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 clinic-card p-6">
                    <h2 className="font-serif t-20 font-medium mb-4">Visitors & Inquiries per Day</h2>
                    <DualLineChart data={overview.dailySeries} />
                  </div>

                  <div className="lg:col-span-4 clinic-card p-6">
                    <h2 className="font-serif t-20 font-medium mb-4">Top 5 Sources</h2>
                    {overview.topSources.length === 0 ? (
                      <p className="t-14 text-[#12201A]/60">No source traffic recorded yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="border-b border-[#12201A]/12 text-xs text-[#12201A]/65">
                          <tr>
                            <th className="py-2 text-left">Source</th>
                            <th className="py-2 text-right">Visitors</th>
                            <th className="py-2 text-right">Inquiries</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#12201A]/10">
                          {overview.topSources.map((s) => (
                            <tr key={s.source}>
                              <td className="py-2.5 font-bold">{s.source}</td>
                              <td className="py-2.5 text-right tabular-nums">{s.visitors}</td>
                              <td className="py-2.5 text-right tabular-nums text-[#C46A3C] font-bold">
                                {s.inquiries}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="clinic-card p-6 space-y-3">
                  <h2 className="font-serif t-20 font-medium text-[#C46A3C]">
                    Needs Attention (&gt;2h uncontacted)
                  </h2>
                  {overview.needsAttention.length === 0 ? (
                    <p className="t-14 text-[#12201A]/65">All recent inquiries have been contacted.</p>
                  ) : (
                    overview.needsAttention.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl bg-[#F4EFE2]/65 flex items-center justify-between gap-2">
                        <div>
                          <p className="t-14 font-bold">{item.patient_name}</p>
                          <p className="text-xs text-[#12201A]/70">{item.patient_phone} · {item.concern}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('inquiries')}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Open
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="clinic-card p-6 space-y-3">
                  <h2 className="font-serif t-20 font-medium text-[#0E3B26]">Follow-up Reminders Due</h2>
                  {overview.followUpsDue.length === 0 ? (
                    <p className="t-14 text-[#12201A]/65">No follow-ups scheduled for today.</p>
                  ) : (
                    overview.followUpsDue.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl bg-[#F4EFE2]/65 flex items-center justify-between gap-2">
                        <div>
                          <p className="t-14 font-bold">{item.patient_name}</p>
                          <p className="text-xs text-[#3E7A4A]">Due {item.follow_up_date} · {item.patient_phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('inquiries')}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Open
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. VISITORS (OWNER ONLY) */}
          {activeTab === 'visitors' && isOwner && visitors && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif t-28 font-medium">Visitors</h1>
                  <p className="t-14 text-[#12201A]/70">Anonymous visitor counts & coarse region only (no IPs stored).</p>
                </div>
                <span className="px-4 py-2 rounded-full bg-[#0E3B26] text-[#F4EFE2] text-sm font-bold">
                  Live right now (last 5 min): {visitors.liveVisitors}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Unique Visitors</p>
                  <p className="font-serif t-28 tabular-nums">{visitors.uniqueVisitors}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">New Visitors</p>
                  <p className="font-serif t-28 tabular-nums">{visitors.newVisitors}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Returning</p>
                  <p className="font-serif t-28 tabular-nums">{visitors.returningVisitors}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Avg Time on Site</p>
                  <p className="font-serif t-28 tabular-nums">{visitors.avgDurationSec}s</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Pages / Visit</p>
                  <p className="font-serif t-28 tabular-nums">{visitors.pagesPerVisit}</p>
                </div>
              </div>

              <div className="clinic-card p-6">
                <h2 className="font-serif t-20 font-medium mb-4">Hourly Visit Heatmap</h2>
                <HourlyHeatmap grid={visitors.heatmap} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="clinic-card p-6">
                  <h3 className="font-serif t-20 font-medium mb-4">Devices</h3>
                  <HorizontalBarList
                    items={Object.entries(visitors.devices).map(([label, count]) => ({ label, count }))}
                  />
                </div>
                <div className="clinic-card p-6">
                  <h3 className="font-serif t-20 font-medium mb-4">Browsers & Language</h3>
                  <HorizontalBarList
                    items={Object.entries(visitors.browsers).map(([label, count]) => ({ label, count }))}
                    color="#3E7A4A"
                  />
                </div>
                <div className="clinic-card p-6">
                  <h3 className="font-serif t-20 font-medium mb-4">Approximate Region</h3>
                  <HorizontalBarList
                    items={Object.entries(visitors.locations).map(([label, count]) => ({ label, count }))}
                    color="#C46A3C"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. SOURCES & ADS (OWNER ONLY) */}
          {activeTab === 'sources' && isOwner && sources && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif t-28 font-medium">Sources & Ads Attribution</h1>
                  <p className="t-14 text-[#12201A]/70">
                    Tracks Instagram, Instagram bio link, Google, WhatsApp, Facebook, UTM tags, and fbclid/gclid.
                  </p>
                </div>
                <div className="clinic-card px-5 py-3 flex items-center gap-6">
                  <div>
                    <p className="text-xs text-[#12201A]/60 font-bold">Total Ad Spend</p>
                    <p className="font-serif t-20 font-bold">₹{sources.totalSpendInr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#12201A]/60 font-bold">Cost / Inquiry</p>
                    <p className="font-serif t-20 font-bold text-[#C46A3C]">
                      {sources.costPerInquiryInr !== null ? `₹${sources.costPerInquiryInr}` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="clinic-card overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-[#12201A]/12 bg-[#F4EFE2]/55 text-xs uppercase">
                    <tr>
                      <th className="p-3.5">Channel / Source</th>
                      <th className="p-3.5 text-right">Visits</th>
                      <th className="p-3.5 text-right">Unique Visitors</th>
                      <th className="p-3.5 text-right">Inquiries</th>
                      <th className="p-3.5 text-right">fbclid / gclid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#12201A]/10">
                    {sources.sources.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#12201A]/60">
                          No referral traffic recorded in this period yet.
                        </td>
                      </tr>
                    ) : (
                      sources.sources.map((s) => (
                        <tr key={s.source}>
                          <td className="p-3.5 font-bold">{s.source}</td>
                          <td className="p-3.5 text-right tabular-nums">{s.visits}</td>
                          <td className="p-3.5 text-right tabular-nums">{s.uniqueVisitors}</td>
                          <td className="p-3.5 text-right tabular-nums font-bold text-[#C46A3C]">
                            {s.inquiries}
                          </td>
                          <td className="p-3.5 text-right tabular-nums text-xs">
                            {s.fbclidHits} / {s.gclidHits}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Ad Spend Form */}
              <div className="clinic-card p-6 space-y-4">
                <h2 className="font-serif t-20 font-medium">Enter Monthly Ad Spend (INR)</h2>
                <form onSubmit={saveAdSpend} className="flex flex-wrap gap-3 items-center">
                  <select
                    value={spendChannel}
                    onChange={(e) => setSpendChannel(e.target.value)}
                    className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#FAF7EF] text-sm font-bold"
                  >
                    <option value="Instagram / Meta Ads">Instagram / Meta Ads</option>
                    <option value="Google Search Ads">Google Search Ads</option>
                    <option value="Other Promotion">Other Promotion</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    placeholder="Amount in INR (e.g. 5000)"
                    className="min-h-[42px] px-3 rounded-xl border border-[#12201A]/20 bg-[#F4EFE2]/45 text-sm"
                  />
                  <button type="submit" className="btn-primary px-5">
                    Save Spend
                  </button>
                </form>

                {sources.adSpend.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {sources.adSpend.map((a) => (
                      <div key={a.id} className="px-3.5 py-2 rounded-xl bg-[#F4EFE2] border border-[#12201A]/12 text-xs font-bold">
                        {a.month_key} · {a.channel}: ₹{a.amount_inr.toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. INQUIRIES (OWNER + STAFF) */}
          {activeTab === 'inquiries' && (
            <InquiriesManager
              token={session.token}
              inquiries={inquiries}
              globalSearch={globalSearch}
              onUpdated={setInquiries}
            />
          )}

          {/* 5. BEHAVIOUR (OWNER ONLY) */}
          {activeTab === 'behaviour' && isOwner && behaviour && (
            <div className="space-y-6">
              <h1 className="font-serif t-28 font-medium">Visitor Behaviour & Funnels</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Scroll Depth Reached</h2>
                  <HorizontalBarList
                    items={Object.entries(behaviour.scrollDepth).map(([label, count]) => ({
                      label,
                      count,
                    }))}
                  />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Booking Form Drop-off Funnel</h2>
                  <HorizontalBarList
                    color="#C46A3C"
                    items={[
                      { label: 'Form Viewed', count: behaviour.formFunnel.form_view },
                      { label: 'Step 1 (Details)', count: behaviour.formFunnel.form_step_1 },
                      { label: 'Step 2 (Concern)', count: behaviour.formFunnel.form_step_2 },
                      { label: 'Step 3 (Preference)', count: behaviour.formFunnel.form_step_3 },
                      { label: 'Submitted', count: behaviour.formFunnel.form_submit },
                    ]}
                  />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Most-Seen Sections</h2>
                  <HorizontalBarList items={behaviour.sections} color="#3E7A4A" />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Treatment Card Clicks</h2>
                  <HorizontalBarList items={behaviour.treatments} color="#0E3B26" />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Body Map Hotspot Clicks</h2>
                  <HorizontalBarList items={behaviour.bodyMapHotspots} color="#C46A3C" />
                </div>

                <div className="clinic-card p-6 space-y-4">
                  <h2 className="font-serif t-20 font-medium">Body Type Quiz Summary</h2>
                  <div className="flex gap-6 text-sm font-bold">
                    <span>Starts: {behaviour.quiz.starts}</span>
                    <span>Completions: {behaviour.quiz.completions}</span>
                  </div>
                  <HorizontalBarList items={behaviour.quiz.results} color="#C9A24B" />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Reels Played</h2>
                  <HorizontalBarList items={behaviour.reels} color="#0E3B26" />
                </div>

                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">FAQs Opened</h2>
                  <HorizontalBarList items={behaviour.faqs} color="#3E7A4A" />
                </div>
              </div>
            </div>
          )}

          {/* 6. CONTACT TAPS (OWNER ONLY) */}
          {activeTab === 'contact-taps' && isOwner && contactTaps && (
            <div className="space-y-6">
              <h1 className="font-serif t-28 font-medium">Contact Taps</h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Phone Call Taps</p>
                  <p className="font-serif t-28 tabular-nums">{contactTaps.totals.callTaps}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">WhatsApp Taps</p>
                  <p className="font-serif t-28 tabular-nums">{contactTaps.totals.whatsappTaps}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Instagram Taps</p>
                  <p className="font-serif t-28 tabular-nums">{contactTaps.totals.instagramTaps}</p>
                </div>
                <div className="clinic-card p-4">
                  <p className="text-xs font-bold text-[#12201A]/65">Map / Directions</p>
                  <p className="font-serif t-28 tabular-nums">{contactTaps.totals.directionsTaps}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">Call Number Breakdown</h2>
                  <HorizontalBarList items={contactTaps.calls} color="#0E3B26" />
                </div>
                <div className="clinic-card p-6">
                  <h2 className="font-serif t-20 font-medium mb-4">WhatsApp Taps by Section</h2>
                  <HorizontalBarList items={contactTaps.whatsapp} color="#3E7A4A" />
                </div>
              </div>
            </div>
          )}

          {/* 7. PHOTOS (OWNER + STAFF) */}
          {activeTab === 'photos' && (
            <PhotosManager
              token={session.token}
              photos={photos}
              onUpdated={setPhotos}
              onPublicRefresh={refreshBootstrap}
            />
          )}

          {/* 8. CONTENT (OWNER ONLY) */}
          {activeTab === 'content' && isOwner && contentData && (
            <ContentEditorPage
              token={session.token}
              initialContent={contentData.content}
              versions={contentData.versions}
              onSaved={(nextC, nextV) => setContentData({ content: nextC, versions: nextV })}
              onPublicRefresh={refreshBootstrap}
            />
          )}

          {/* 9. SETTINGS (OWNER ONLY) */}
          {activeTab === 'settings' && isOwner && settingsData && (
            <SettingsPage
              token={session.token}
              initialSettings={settingsData.settings}
              admins={settingsData.admins}
              notifications={settingsData.notifications}
              onUpdated={(s, a, n) => setSettingsData({ settings: s, admins: a, notifications: n })}
              onPublicRefresh={refreshBootstrap}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile dashboard navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0E3B26] text-[#F4EFE2] border-t border-[#C9A24B]/30 flex overflow-x-auto px-2 py-1.5 gap-1"
      >
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`shrink-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                active ? 'bg-[#F4EFE2] text-[#0E3B26]' : 'text-[#F4EFE2]/80'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
