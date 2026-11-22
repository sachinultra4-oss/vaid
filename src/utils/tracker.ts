const VID_KEY = 'khushdil_vid';
const SID_KEY = 'khushdil_sid';
const ATTR_KEY = 'khushdil_first_attr';
const CONSENT_KEY = 'khushdil_cookie_consent';

export type CookieConsentState = 'accepted' | 'essential' | 'unset';

export interface FirstAttribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
  gclid: string;
  referrer: string;
  source_label: string;
}

interface QueuedEvent {
  event_name: string;
  section_id: string;
  label: string;
  numeric_value?: number;
  path: string;
  created_at: string;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let vid = window.localStorage.getItem(VID_KEY);
    if (!vid) {
      vid = randomId();
      window.localStorage.setItem(VID_KEY, vid);
    }
    return vid;
  } catch {
    return randomId();
  }
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let sid = window.sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = randomId();
      window.sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return randomId();
  }
}

function deriveSourceLabel(
  utmSource: string,
  utmMedium: string,
  referrer: string,
  fbclid: string,
  gclid: string
): string {
  const s = utmSource.toLowerCase();
  const med = utmMedium.toLowerCase();
  const ref = referrer.toLowerCase();
  if (s === 'ig_bio' || (s === 'instagram' && (med === 'bio' || med === 'profile'))) {
    return 'Instagram bio link';
  }
  if (s.includes('instagram') || ref.includes('instagram.com') || ref.includes('l.instagram.com')) {
    return med === 'bio' ? 'Instagram bio link' : 'Instagram';
  }
  if (fbclid || s.includes('facebook') || s === 'fb' || ref.includes('facebook.com')) return 'Facebook';
  if (gclid || s.includes('google') || ref.includes('google.')) return 'Google';
  if (s.includes('whatsapp') || ref.includes('wa.me')) return 'WhatsApp';
  return utmSource || (ref ? ref : 'Direct');
}

export function captureAttribution(): FirstAttribution {
  if (typeof window === 'undefined') {
    return {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      fbclid: '',
      gclid: '',
      referrer: '',
      source_label: 'Direct',
    };
  }
  const params = new URLSearchParams(window.location.search);
  const current: FirstAttribution = {
    utm_source: params.get('utm_source') || params.get('ref') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    fbclid: params.get('fbclid') || '',
    gclid: params.get('gclid') || '',
    referrer: document.referrer || '',
    source_label: '',
  };
  current.source_label = deriveSourceLabel(
    current.utm_source,
    current.utm_medium,
    current.referrer,
    current.fbclid,
    current.gclid
  );

  try {
    const existingRaw = window.localStorage.getItem(ATTR_KEY);
    if (!existingRaw) {
      window.localStorage.setItem(ATTR_KEY, JSON.stringify(current));
      return current;
    }
    return JSON.parse(existingRaw) as FirstAttribution;
  } catch {
    return current;
  }
}

export function getConsentState(): CookieConsentState {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === 'accepted' || raw === 'essential') return raw;
  } catch {
    // ignore
  }
  return 'unset';
}

export function setConsentState(value: 'accepted' | 'essential'): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // ignore
  }
}

let pixelsLoaded = false;

export function loadConsentPixels(metaPixelId: string, ga4Id: string): void {
  if (typeof window === 'undefined' || pixelsLoaded) return;
  if (window.location.pathname.startsWith('/admin')) return;
  if (getConsentState() !== 'accepted') return;

  pixelsLoaded = true;

  if (ga4Id && /^[A-Za-z0-9-]+$/.test(ga4Id)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(s);

    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = (...args: unknown[]) => w.dataLayer.push(args);
    w.gtag('js', new Date());
    w.gtag('config', ga4Id, { anonymize_ip: true });
  }

  if (metaPixelId && /^[0-9]+$/.test(metaPixelId)) {
    const w = window as unknown as {
      fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
      _fbq?: unknown;
    };
    if (!w.fbq) {
      const fbqFn = function (...args: unknown[]) {
        if (typeof fbqFn.callMethod === 'function') {
          (fbqFn.callMethod as (...a: unknown[]) => void)(...args);
        } else {
          fbqFn.queue = fbqFn.queue || [];
          fbqFn.queue.push(args);
        }
      } as ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
      fbqFn.queue = [];
      w.fbq = fbqFn;
      w._fbq = fbqFn;

      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
    }
    w.fbq('init', metaPixelId);
    w.fbq('track', 'PageView');
  }
}

class ClinicTracker {
  private queue: QueuedEvent[] = [];
  private startedAt = Date.now();
  private timer: number | null = null;
  private initialized = false;
  private adminLoggedIn = false;

  public setAdminSession(isAdmin: boolean): void {
    this.adminLoggedIn = isAdmin;
  }

  private shouldSkip(): boolean {
    if (typeof window === 'undefined') return true;
    if (this.adminLoggedIn || window.location.pathname.startsWith('/admin')) return true;
    if (/bot|crawler|spider|headless|lighthouse/i.test(navigator.userAgent)) return true;
    return false;
  }

  public init(): () => void {
    if (this.initialized || this.shouldSkip()) return () => {};
    this.initialized = true;
    this.startedAt = Date.now();
    captureAttribution();

    this.track('page_view', 'page', document.title || 'Home');

    // Batch flush every 5 seconds
    this.timer = window.setInterval(() => {
      this.flush();
    }, 5000);

    // Scroll depth 25 / 50 / 75 / 100
    const seenDepths = new Set<number>();
    const onScroll = () => {
      if (this.shouldSkip()) return;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / docH) * 100));
      for (const mark of [25, 50, 75, 100]) {
        if (pct >= mark && !seenDepths.has(mark)) {
          seenDepths.add(mark);
          this.track('scroll_depth', 'page', `${mark}%`, mark);
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // 50% Section Views via IntersectionObserver
    const seenSections = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id') || '';
            if (id && !seenSections.has(id)) {
              seenSections.add(id);
              this.track('section_view', id, id);
            }
          }
        }
      },
      { threshold: 0.45 }
    );
    window.setTimeout(() => {
      document.querySelectorAll('main section[id]').forEach((sec) => io.observe(sec));
    }, 300);

    const onPageHide = () => {
      this.flush(true);
    };
    window.addEventListener('pagehide', onPageHide);

    return () => {
      if (this.timer) window.clearInterval(this.timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      io.disconnect();
      this.initialized = false;
    };
  }

  public track(
    event_name: string,
    section_id: string,
    label: string,
    numeric_value?: number
  ): void {
    if (this.shouldSkip()) return;
    this.queue.push({
      event_name,
      section_id,
      label,
      numeric_value,
      path: window.location.pathname,
      created_at: new Date().toISOString(),
    });
    if (this.queue.length >= 12) {
      this.flush();
    }
  }

  public flush(useBeacon = false): void {
    if (this.shouldSkip()) return;
    if (this.queue.length === 0 && !useBeacon) return;

    const attr = captureAttribution();
    const eventsToSend = this.queue.splice(0, 50);
    const payload = JSON.stringify({
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      duration_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      screen_width: window.innerWidth,
      language: navigator.language || 'en',
      referrer: attr.referrer,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_content: attr.utm_content,
      fbclid: attr.fbclid,
      gclid: attr.gclid,
      events: eventsToSend,
    });

    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon('/api/public/track', blob);
      return;
    }

    fetch('/api/public/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // ignore offline telemetry drops
    });
  }
}

export const tracker = new ClinicTracker();

export async function submitPublicInquiry(input: {
  patient_name: string;
  patient_phone: string;
  concern?: string;
  duration?: string;
  visit_mode?: string;
  preferred_time?: string;
  quiz_dosha?: string;
  channel: 'form' | 'quiz_whatsapp' | 'whatsapp_tap' | 'call_tap';
}): Promise<void> {
  const attr = captureAttribution();
  await fetch('/api/public/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      ...input,
      visitor_id: getVisitorId(),
      first_source: attr.source_label,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      fbclid: attr.fbclid,
      gclid: attr.gclid,
    }),
  }).catch(() => {
    // non-blocking so WhatsApp deep link still opens
  });

  // Never send health concerns to external pixels; only generic Lead event when consented
  if (getConsentState() === 'accepted') {
    const w = window as unknown as {
      fbq?: (...args: unknown[]) => void;
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof w.fbq === 'function') w.fbq('track', 'Lead');
    if (typeof w.gtag === 'function') w.gtag('event', 'generate_lead');
  }
}
