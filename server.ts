import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  consumeResetCode,
  createResetCode,
  createTwoStepChallenge,
  hashPassword,
  issueSessionToken,
  recordLoginFailure,
  sanitizeAdminUser,
  verifyPassword,
  verifySessionToken,
  verifyTwoStepChallenge,
  type TokenPayload,
} from './server/auth.ts';
import { store, UPLOADS_DIR } from './server/store.ts';
import type {
  AdminRole,
  ClinicPublicContent,
  InquiryChannel,
  InquiryRecord,
  InquiryStatus,
  NotificationLogEntry,
  PhotoSlotRecord,
  PublicBootstrapPayload,
} from './src/types/clinic.ts';

interface AuthedRequest extends Request {
  authUser?: TokenPayload;
}

const VALID_STATUSES: InquiryStatus[] = [
  'New',
  'Contacted',
  'Booked',
  'Visited',
  'Closed',
  'Not interested',
];

const VALID_CHANNELS: InquiryChannel[] = ['form', 'quiz_whatsapp', 'whatsapp_tap', 'call_tap'];

const BOT_UA_REGEX = /bot|crawler|spider|slurp|headless|lighthouse|bingpreview|facebookexternalhit/i;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function sanitizeText(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function classifySource(
  sourceRaw: string,
  referrerRaw: string,
  utmMedium: string,
  fbclid: string,
  gclid: string
): string {
  const s = (sourceRaw || '').toLowerCase();
  const ref = (referrerRaw || '').toLowerCase();
  const med = (utmMedium || '').toLowerCase();

  if (s === 'ig_bio' || (s === 'instagram' && (med === 'bio' || med === 'profile'))) {
    return 'Instagram bio link';
  }
  if (s.includes('instagram') || ref.includes('instagram.com') || ref.includes('l.instagram.com')) {
    return med === 'bio' ? 'Instagram bio link' : 'Instagram';
  }
  if (fbclid || s.includes('facebook') || s === 'fb' || ref.includes('facebook.com')) {
    return 'Facebook';
  }
  if (gclid || s.includes('google') || ref.includes('google.')) {
    return 'Google';
  }
  if (s.includes('whatsapp') || ref.includes('wa.me') || ref.includes('whatsapp.com')) {
    return 'WhatsApp';
  }
  if (s && s !== 'direct') return sourceRaw.slice(0, 40);
  if (ref) {
    try {
      return new URL(ref).hostname.replace(/^www\./, '');
    } catch {
      return 'Referral';
    }
  }
  return 'Direct';
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  return 'Other';
}

function parseDevice(ua: string, width: number): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet/i.test(ua) || (width >= 640 && width < 1024 && /android|mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/mobi|android|iphone/i.test(ua) || (width > 0 && width < 640)) {
    return 'mobile';
  }
  return 'desktop';
}

function parseApproxLocation(req: Request): { city: string; state: string } {
  // Never read or store IP address. Only inspect coarse CDN/proxy region headers if provided.
  const city = sanitizeText(req.headers['x-vercel-ip-city'] || req.headers['cf-ipcity'], 40);
  const state = sanitizeText(
    req.headers['x-vercel-ip-country-region'] || req.headers['cf-region'],
    40
  );
  const country = sanitizeText(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'], 16);
  return {
    city: city ? decodeURIComponent(city) : country === 'IN' ? 'Punjab Region' : 'Local / Unknown',
    state: state || (country === 'IN' ? 'Punjab, IN' : 'India'),
  };
}

function parseDateWindow(fromStr?: string, toStr?: string) {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  let startMs = fromStr
    ? new Date(fromStr.length <= 10 ? `${fromStr}T00:00:00.000Z` : fromStr).getTime()
    : defaultFrom.getTime();
  let endMs = toStr
    ? new Date(toStr.length <= 10 ? `${toStr}T23:59:59.999Z` : toStr).getTime()
    : now.getTime();

  if (Number.isNaN(startMs)) startMs = defaultFrom.getTime();
  if (Number.isNaN(endMs)) endMs = now.getTime();
  if (endMs < startMs) endMs = startMs + 24 * 60 * 60 * 1000 - 1;

  const spanMs = Math.max(24 * 60 * 60 * 1000, endMs - startMs);
  const prevEndMs = startMs - 1;
  const prevStartMs = prevEndMs - spanMs;

  return { startMs, endMs, prevStartMs, prevEndMs };
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function inRange(iso: string, startMs: number, endMs: number): boolean {
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t >= startMs && t <= endMs;
}

function detectImageMagic(buf: Buffer): 'webp' | 'png' | 'jpeg' | null {
  if (buf.length < 12) return null;
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  return null;
}

function decodeDataUrl(dataUrl: string, maxBytes = 10 * 1024 * 1024): { buf: Buffer; ext: string } | null {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length === 0 || buf.length > maxBytes) return null;
  const kind = detectImageMagic(buf);
  if (!kind) return null;
  return { buf, ext: kind === 'jpeg' ? 'jpg' : kind };
}

function safeWriteUpload(fileName: string, buf: Buffer): string {
  const cleanName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.resolve(UPLOADS_DIR, cleanName);
  if (!dest.startsWith(UPLOADS_DIR + path.sep)) {
    throw new Error('Invalid upload path');
  }
  fs.writeFileSync(dest, buf);
  return `/uploads/${cleanName}`;
}

async function dispatchOwnerNotification(
  type: NotificationLogEntry['type'],
  subject: string,
  body: string
): Promise<void> {
  const state = store.getState();
  const recipient = state.settings.ownerEmail || 'owner@khushdilclinic.in';
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();
  let dispatchedVia: 'webhook' | 'server_log' = 'server_log';

  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, recipient, subject, body, created_at: new Date().toISOString() }),
      });
      if (resp.ok) dispatchedVia = 'webhook';
    } catch {
      // Fallback to local log without blocking patient submission
    }
  }

  state.notifications.push({
    id: crypto.randomUUID(),
    type,
    recipient,
    subject,
    body,
    dispatched_via: dispatchedVia,
    created_at: new Date().toISOString(),
  });
  store.save();
}

function getPublishedPhotos(photos: Record<string, PhotoSlotRecord>): Record<string, PhotoSlotRecord> {
  const result: Record<string, PhotoSlotRecord> = {};
  for (const [k, p] of Object.entries(photos)) {
    const canPublish = p.is_published && (!p.has_patient_face || p.consent_given);
    result[k] = canPublish
      ? { ...p, previous_snapshot: undefined }
      : { ...p, url: '', url_480: '', url_960: '', url_1920: '', url_original: '', previous_snapshot: undefined };
  }
  return result;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  req.authUser = payload;
  next();
}

function requireOwner(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required.' });
    return;
  }
  next();
}

function csvEscape(val: unknown): string {
  const s = String(val ?? '').replace(/\r?\n/g, ' ');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function seedEnvAdminIfNeeded(): Promise<void> {
  const state = store.getState();
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (state.admins.length === 0 && envEmail && envPass && envPass.length >= 8) {
    const password_hash = await hashPassword(envPass);
    state.admins.push({
      id: crypto.randomUUID(),
      email: envEmail,
      name: 'Vaid Dr. Jashan Sandhu',
      role: 'owner',
      password_hash,
      two_step_enabled: false,
      created_at: new Date().toISOString(),
      last_login_at: null,
    });
    store.save();
  }
}

export async function createServerApp(options: { skipFrontend?: boolean } = {}) {
  await seedEnvAdminIfNeeded();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '15mb' }));
  app.use(express.text({ type: 'text/plain', limit: '2mb' }));

  // Serve uploaded WebP/JPEG/PNG photos statically without throwing ENOENT stack traces
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', fallthrough: true }));
  app.use('/uploads', (_req: Request, res: Response) => {
    res.status(404).end();
  });

  app.get('/favicon.ico', (_req: Request, res: Response) => {
    const publicLogo = path.resolve(
      process.cwd(),
      'public/assets/aistudio/747882622_18462579148112646_5609709282036442747_n.jpg_2bb6d326.jpeg'
    );
    const distLogo = path.resolve(
      process.cwd(),
      'dist/assets/aistudio/747882622_18462579148112646_5609709282036442747_n.jpg_2bb6d326.jpeg'
    );
    if (fs.existsSync(publicLogo)) {
      res.sendFile(publicLogo);
    } else if (fs.existsSync(distLogo)) {
      res.sendFile(distLogo);
    } else {
      res.status(204).end();
    }
  });

  // ========================================================================
  // PUBLIC API (Strict read of published assets + insert telemetry/inquiries)
  // ========================================================================
  app.get('/api/public/bootstrap', (_req: Request, res: Response) => {
    const state = store.getState();
    const publishedPhotos = getPublishedPhotos(state.photos);
    const hasStandInPhotos = Object.values(publishedPhotos).some(
      (p) => Boolean(p.url) && p.is_standin
    );
    const publishedContent: ClinicPublicContent = {
      ...state.content,
      reviews: state.content.reviews.filter((r) => r.is_published),
      faqs: state.content.faqs.filter((f) => f.is_published),
    };
    const payload: PublicBootstrapPayload = {
      photos: publishedPhotos,
      content: publishedContent,
      settings: {
        metaPixelId: state.settings.metaPixelId,
        ga4Id: state.settings.ga4Id,
        cookieBannerText: state.settings.cookieBannerText,
        privacySummary: state.settings.privacySummary,
      },
      hasStandInPhotos,
    };
    res.json(payload);
  });

  app.post('/api/public/track', (req: Request, res: Response) => {
    const ua = sanitizeText(req.headers['user-agent'], 300);
    if (BOT_UA_REGEX.test(ua)) {
      res.status(204).end();
      return;
    }

    let body: Record<string, unknown> = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body) as Record<string, unknown>;
      } catch {
        res.status(400).json({ error: 'Invalid telemetry payload.' });
        return;
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body as Record<string, unknown>;
    }

    const visitorId = sanitizeText(body.visitor_id, 64);
    const sessionId = sanitizeText(body.session_id, 64);
    if (!visitorId || !sessionId) {
      res.status(400).json({ error: 'Missing visitor or session ID.' });
      return;
    }

    const state = store.getState();
    const nowIso = new Date().toISOString();
    const screenWidth = typeof body.screen_width === 'number' ? body.screen_width : 1200;
    const language = sanitizeText(body.language, 24) || 'en';
    const referrer = sanitizeText(body.referrer, 300);
    const utmSource = sanitizeText(body.utm_source, 80);
    const utmMedium = sanitizeText(body.utm_medium, 80);
    const utmCampaign = sanitizeText(body.utm_campaign, 120);
    const utmContent = sanitizeText(body.utm_content, 120);
    const fbclid = sanitizeText(body.fbclid, 120);
    const gclid = sanitizeText(body.gclid, 120);
    const sourceLabel = classifySource(utmSource, referrer, utmMedium, fbclid, gclid);
    const approx = parseApproxLocation(req);

    const existingVisitor = state.visitors[visitorId];
    if (!existingVisitor) {
      state.visitors[visitorId] = {
        visitor_id: visitorId,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        first_source: sourceLabel,
        first_utm_source: utmSource,
        first_utm_medium: utmMedium,
        first_utm_campaign: utmCampaign,
        first_utm_content: utmContent,
        first_fbclid: fbclid,
        first_gclid: gclid,
        device_type: parseDevice(ua, screenWidth),
        browser: parseBrowser(ua),
        language,
        approx_city: approx.city,
        approx_state: approx.state,
        visit_count: 1,
      };
    } else {
      existingVisitor.last_seen_at = nowIso;
    }

    const durationInc =
      typeof body.duration_seconds === 'number' && body.duration_seconds >= 0
        ? Math.min(7200, Math.round(body.duration_seconds))
        : 0;

    const existingSession = state.sessions[sessionId];
    if (!existingSession) {
      if (existingVisitor) {
        existingVisitor.visit_count += 1;
      }
      state.sessions[sessionId] = {
        session_id: sessionId,
        visitor_id: visitorId,
        started_at: nowIso,
        last_active_at: nowIso,
        duration_seconds: durationInc,
        page_views: 1,
        referrer,
        source_label: sourceLabel,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        fbclid,
        gclid,
      };
    } else {
      existingSession.last_active_at = nowIso;
      if (durationInc > existingSession.duration_seconds) {
        existingSession.duration_seconds = durationInc;
      }
    }

    const incomingEvents = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
    for (const ev of incomingEvents) {
      if (!ev || typeof ev !== 'object') continue;
      const e = ev as Record<string, unknown>;
      const eventName = sanitizeText(e.event_name, 64);
      if (!eventName || eventName.startsWith('/admin')) continue;

      // Never store health concern/diagnosis text inside analytics events
      const rawLabel = sanitizeText(e.label, 80);
      if (eventName === 'page_view' && existingSession) {
        existingSession.page_views += 1;
      }
      state.events.push({
        id: crypto.randomUUID(),
        visitor_id: visitorId,
        session_id: sessionId,
        event_name: eventName,
        section_id: sanitizeText(e.section_id, 64),
        label: rawLabel,
        numeric_value: typeof e.numeric_value === 'number' ? e.numeric_value : null,
        path: sanitizeText(e.path, 120) || '/',
        created_at: sanitizeText(e.created_at, 40) || nowIso,
      });
    }

    store.save();
    res.status(204).end();
  });

  app.post('/api/public/inquiries', async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const patientName = sanitizeText(body.patient_name, 100) || 'WhatsApp / Website Visitor';
    const rawPhone = sanitizeText(body.patient_phone, 30);
    const normalizedPhone = normalizePhone(rawPhone);
    const channelRaw = sanitizeText(body.channel, 32) as InquiryChannel;
    const channel: InquiryChannel = VALID_CHANNELS.includes(channelRaw) ? channelRaw : 'form';

    if (channel === 'form' && normalizedPhone.length < 10) {
      res.status(400).json({ error: 'Please provide a valid 10-digit mobile number.' });
      return;
    }

    const concern = sanitizeText(body.concern, 160);
    const duration = sanitizeText(body.duration, 80);
    const visitMode = sanitizeText(body.visit_mode, 60);
    const preferredTime = sanitizeText(body.preferred_time, 60);
    const quizDosha = sanitizeText(body.quiz_dosha, 30);
    const visitorId = sanitizeText(body.visitor_id, 64);

    const state = store.getState();
    const visitor = visitorId ? state.visitors[visitorId] : undefined;

    const firstSource =
      sanitizeText(body.first_source, 80) || visitor?.first_source || 'Direct';
    const utmSource = sanitizeText(body.utm_source, 80) || visitor?.first_utm_source || '';
    const utmMedium = sanitizeText(body.utm_medium, 80) || visitor?.first_utm_medium || '';
    const utmCampaign = sanitizeText(body.utm_campaign, 120) || visitor?.first_utm_campaign || '';
    const fbclid = sanitizeText(body.fbclid, 120) || visitor?.first_fbclid || '';
    const gclid = sanitizeText(body.gclid, 120) || visitor?.first_gclid || '';

    const nowIso = new Date().toISOString();

    // Duplicate phone numbers merge into one patient record
    const existing =
      normalizedPhone.length >= 10
        ? state.inquiries.find((inq) => inq.patient_phone === normalizedPhone)
        : undefined;

    if (existing) {
      existing.duplicate_count += 1;
      existing.updated_at = nowIso;
      if (patientName && patientName !== 'WhatsApp / Website Visitor') {
        existing.patient_name = patientName;
      }
      if (concern) existing.concern = concern;
      if (duration) existing.duration = duration;
      if (visitMode) existing.visit_mode = visitMode;
      if (preferredTime) existing.preferred_time = preferredTime;
      if (quizDosha) existing.quiz_dosha = quizDosha;
      existing.history.unshift({
        id: crypto.randomUUID(),
        inquiry_id: existing.id,
        actor_email: 'system@patient-merge',
        action_type: 'repeat_inquiry_merged',
        from_status: existing.status,
        to_status: existing.status,
        note: `Repeat ${channel} inquiry merged (${concern || quizDosha || 'general'})`,
        created_at: nowIso,
      });
      store.save();

      if (state.settings.instantAlertEnabled) {
        await dispatchOwnerNotification(
          'instant_inquiry',
          `Repeat patient inquiry: ${existing.patient_name}`,
          `Phone: ${existing.patient_phone} | Channel: ${channel} | Source: ${firstSource}`
        );
      }
      res.status(201).json({ id: existing.id, merged: true });
      return;
    }

    const newRecord: InquiryRecord = {
      id: crypto.randomUUID(),
      patient_phone: normalizedPhone || 'WhatsApp tap',
      patient_name: patientName,
      concern,
      duration,
      visit_mode: visitMode,
      preferred_time: preferredTime,
      quiz_dosha: quizDosha,
      channel,
      status: 'New',
      first_source: firstSource,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      fbclid,
      gclid,
      visitor_id: visitorId,
      follow_up_date: '',
      notes: '',
      duplicate_count: 1,
      created_at: nowIso,
      updated_at: nowIso,
      contacted_at: null,
      history: [
        {
          id: crypto.randomUUID(),
          inquiry_id: '',
          actor_email: 'website@khushdil',
          action_type: 'created',
          from_status: '',
          to_status: 'New',
          note: `Submitted via ${channel} (${firstSource})`,
          created_at: nowIso,
        },
      ],
    };
    newRecord.history[0].inquiry_id = newRecord.id;
    state.inquiries.unshift(newRecord);
    store.save();

    if (state.settings.instantAlertEnabled) {
      await dispatchOwnerNotification(
        'instant_inquiry',
        `New Khushdil Clinic Inquiry: ${newRecord.patient_name}`,
        `Phone: ${newRecord.patient_phone} | Channel: ${channel} | Source: ${firstSource}`
      );
    }

    res.status(201).json({ id: newRecord.id, merged: false });
  });

  // ========================================================================
  // AUTHENTICATION API (/api/auth/*)
  // ========================================================================
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    const state = store.getState();
    res.json({
      needsBootstrap: state.admins.length === 0,
    });
  });

  app.post('/api/auth/bootstrap', async (req: Request, res: Response) => {
    const state = store.getState();
    if (state.admins.length > 0) {
      res.status(409).json({ error: 'Owner account is already set up. Please sign in.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const email = sanitizeText(body.email, 120).toLowerCase();
    const name = sanitizeText(body.name, 80) || 'Vaid Dr. Jashan Sandhu';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email.includes('@') || password.length < 8) {
      res.status(400).json({ error: 'Enter a valid email and password (at least 8 characters).' });
      return;
    }

    const password_hash = await hashPassword(password);
    const nowIso = new Date().toISOString();
    const owner = {
      id: crypto.randomUUID(),
      email,
      name,
      role: 'owner' as AdminRole,
      password_hash,
      two_step_enabled: false,
      created_at: nowIso,
      last_login_at: nowIso,
    };
    state.admins.push(owner);
    state.settings.ownerEmail = email;
    store.save();

    const { token, exp } = issueSessionToken(owner);
    res.status(201).json({ token, exp, user: sanitizeAdminUser(owner) });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = sanitizeText(body.email, 120).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    const rateKey = email || 'unknown';

    const limit = checkLoginRateLimit(rateKey);
    if (!limit.allowed) {
      res.status(429).json({
        error: `Too many failed sign-in attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minute(s).`,
      });
      return;
    }

    const state = store.getState();
    const user = state.admins.find((a) => a.email === email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      recordLoginFailure(rateKey);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    clearLoginFailures(rateKey);

    if (user.two_step_enabled) {
      const challenge = createTwoStepChallenge(user.id);
      await dispatchOwnerNotification(
        'instant_inquiry',
        'Khushdil Admin 2-Step Verification Code',
        `Verification code for ${user.email}: ${challenge.code}`
      );
      res.json({
        requiresTwoStep: true,
        challengeId: challenge.challengeId,
        previewHint:
          process.env.NODE_ENV !== 'production'
            ? `Code dispatched (dev check: ${challenge.code})`
            : 'Verification code sent to clinic notification email.',
      });
      return;
    }

    user.last_login_at = new Date().toISOString();
    store.save();
    const { token, exp } = issueSessionToken(user);
    res.json({ token, exp, user: sanitizeAdminUser(user) });
  });

  app.post('/api/auth/verify-two-step', (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const challengeId = sanitizeText(body.challengeId, 80);
    const code = sanitizeText(body.code, 16);
    const userId = verifyTwoStepChallenge(challengeId, code);
    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired verification code.' });
      return;
    }
    const state = store.getState();
    const user = state.admins.find((a) => a.id === userId);
    if (!user) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    user.last_login_at = new Date().toISOString();
    store.save();
    const { token, exp } = issueSessionToken(user);
    res.json({ token, exp, user: sanitizeAdminUser(user) });
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = sanitizeText(body.email, 120).toLowerCase();
    const state = store.getState();
    const user = state.admins.find((a) => a.email === email);
    let previewCode = '';
    if (user) {
      const code = createResetCode(email);
      previewCode = process.env.NODE_ENV !== 'production' ? code : '';
      await dispatchOwnerNotification(
        'instant_inquiry',
        'Khushdil Admin Password Reset Code',
        `Reset code for ${email}: ${code} (expires in 15 minutes)`
      );
    }
    res.json({
      message: 'If that clinic email is registered, a 6-digit reset code has been dispatched.',
      previewCode,
    });
  });

  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = sanitizeText(body.email, 120).toLowerCase();
    const code = sanitizeText(body.code, 16);
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    if (!consumeResetCode(email, code)) {
      res.status(400).json({ error: 'Invalid or expired reset code.' });
      return;
    }
    const state = store.getState();
    const user = state.admins.find((a) => a.email === email);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    user.password_hash = await hashPassword(newPassword);
    store.save();
    res.json({ message: 'Password updated. You can sign in now.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const user = state.admins.find((a) => a.id === req.authUser?.sub);
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists.' });
      return;
    }
    res.json({ user: sanitizeAdminUser(user) });
  });

  // ========================================================================
  // ADMIN API — PROTECTED BY AUTH & ROLE RBAC
  // ========================================================================
  app.get('/api/admin/overview', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const { startMs, endMs, prevStartMs, prevEndMs } = parseDateWindow(
      req.query.from as string | undefined,
      req.query.to as string | undefined
    );

    const sessionsCur = Object.values(state.sessions).filter((s) =>
      inRange(s.started_at, startMs, endMs)
    );
    const sessionsPrev = Object.values(state.sessions).filter((s) =>
      inRange(s.started_at, prevStartMs, prevEndMs)
    );

    const uniqueVisitorsCur = new Set(sessionsCur.map((s) => s.visitor_id)).size;
    const uniqueVisitorsPrev = new Set(sessionsPrev.map((s) => s.visitor_id)).size;

    const eventsCur = state.events.filter((e) => inRange(e.created_at, startMs, endMs));
    const eventsPrev = state.events.filter((e) => inRange(e.created_at, prevStartMs, prevEndMs));

    const pageViewsCur = eventsCur.filter((e) => e.event_name === 'page_view').length || sessionsCur.length;
    const pageViewsPrev = eventsPrev.filter((e) => e.event_name === 'page_view').length || sessionsPrev.length;

    const inquiriesCur = state.inquiries.filter((i) => inRange(i.created_at, startMs, endMs));
    const inquiriesPrev = state.inquiries.filter((i) => inRange(i.created_at, prevStartMs, prevEndMs));

    const callsCur = eventsCur.filter((e) => e.event_name === 'call_tap').length;
    const callsPrev = eventsPrev.filter((e) => e.event_name === 'call_tap').length;

    const waCur = eventsCur.filter((e) => e.event_name === 'whatsapp_tap').length;
    const waPrev = eventsPrev.filter((e) => e.event_name === 'whatsapp_tap').length;

    const convCur =
      uniqueVisitorsCur > 0 ? Number(((inquiriesCur.length / uniqueVisitorsCur) * 100).toFixed(1)) : 0;
    const convPrev =
      uniqueVisitorsPrev > 0 ? Number(((inquiriesPrev.length / uniqueVisitorsPrev) * 100).toFixed(1)) : 0;

    const dayMap = new Map<string, { date: string; visitors: Set<string>; inquiries: number }>();
    const dayCursor = new Date(startMs);
    dayCursor.setUTCHours(0, 0, 0, 0);
    while (dayCursor.getTime() <= endMs && dayMap.size < 90) {
      const key = dayCursor.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, visitors: new Set(), inquiries: 0 });
      dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }
    for (const s of sessionsCur) {
      const k = s.started_at.slice(0, 10);
      dayMap.get(k)?.visitors.add(s.visitor_id);
    }
    for (const inq of inquiriesCur) {
      const k = inq.created_at.slice(0, 10);
      const entry = dayMap.get(k);
      if (entry) entry.inquiries += 1;
    }

    const dailySeries = Array.from(dayMap.values()).map((d) => ({
      date: d.date,
      visitors: d.visitors.size,
      inquiries: d.inquiries,
    }));

    // Top 5 sources
    const sourceStats = new Map<string, { source: string; visitors: Set<string>; inquiries: number }>();
    for (const s of sessionsCur) {
      const key = s.source_label || 'Direct';
      if (!sourceStats.has(key)) {
        sourceStats.set(key, { source: key, visitors: new Set(), inquiries: 0 });
      }
      sourceStats.get(key)!.visitors.add(s.visitor_id);
    }
    for (const inq of inquiriesCur) {
      const key = inq.first_source || 'Direct';
      if (!sourceStats.has(key)) {
        sourceStats.set(key, { source: key, visitors: new Set(), inquiries: 0 });
      }
      sourceStats.get(key)!.inquiries += 1;
    }
    const topSources = Array.from(sourceStats.values())
      .map((item) => ({
        source: item.source,
        visitors: item.visitors.size,
        inquiries: item.inquiries,
      }))
      .sort((a, b) => b.visitors - a.visitors || b.inquiries - a.inquiries)
      .slice(0, 5);

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const needsAttention = state.inquiries.filter(
      (i) => i.status === 'New' && new Date(i.created_at).getTime() <= twoHoursAgo
    );

    const todayDate = new Date().toISOString().slice(0, 10);
    const followUpsDue = state.inquiries.filter(
      (i) =>
        Boolean(i.follow_up_date) &&
        i.follow_up_date <= todayDate &&
        i.status !== 'Closed' &&
        i.status !== 'Not interested'
    );

    const newInquiriesCount = state.inquiries.filter((i) => i.status === 'New').length;
    const missingPhotosCount = Object.values(state.photos).filter((p) => !p.url).length;
    const missingAltCount = Object.values(state.photos).filter((p) => p.url && !p.alt_text.trim()).length;

    const isOwner = req.authUser?.role === 'owner';

    res.json({
      role: req.authUser?.role,
      newInquiriesCount,
      missingPhotosCount,
      missingAltCount,
      kpis: {
        visitors: isOwner ? uniqueVisitorsCur : null,
        visitorsDelta: isOwner ? calcDelta(uniqueVisitorsCur, uniqueVisitorsPrev) : null,
        pageViews: isOwner ? pageViewsCur : null,
        pageViewsDelta: isOwner ? calcDelta(pageViewsCur, pageViewsPrev) : null,
        inquiries: inquiriesCur.length,
        inquiriesDelta: calcDelta(inquiriesCur.length, inquiriesPrev.length),
        callsTapped: callsCur,
        callsDelta: calcDelta(callsCur, callsPrev),
        whatsappTaps: waCur,
        whatsappDelta: calcDelta(waCur, waPrev),
        conversionRate: isOwner ? convCur : null,
        conversionDelta: isOwner ? Number((convCur - convPrev).toFixed(1)) : null,
      },
      dailySeries: isOwner ? dailySeries : [],
      topSources: isOwner ? topSources : [],
      needsAttention: needsAttention.slice(0, 12),
      followUpsDue: followUpsDue.slice(0, 12),
    });
  });

  // Visitors (Owner Only)
  app.get('/api/admin/visitors', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const { startMs, endMs } = parseDateWindow(
      req.query.from as string | undefined,
      req.query.to as string | undefined
    );

    const sessions = Object.values(state.sessions).filter((s) =>
      inRange(s.started_at, startMs, endMs)
    );
    const visitorIds = new Set(sessions.map((s) => s.visitor_id));
    const activeVisitors = Array.from(visitorIds)
      .map((id) => state.visitors[id])
      .filter(Boolean);

    let returningCount = 0;
    let newCount = 0;
    const devices: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    const browsers: Record<string, number> = {};
    const languages: Record<string, number> = {};
    const locations: Record<string, number> = {};

    for (const v of activeVisitors) {
      if (v.visit_count > 1) returningCount += 1;
      else newCount += 1;
      devices[v.device_type] = (devices[v.device_type] || 0) + 1;
      browsers[v.browser] = (browsers[v.browser] || 0) + 1;
      languages[v.language] = (languages[v.language] || 0) + 1;
      const loc = `${v.approx_city}, ${v.approx_state}`;
      locations[loc] = (locations[loc] || 0) + 1;
    }

    const totalDuration = sessions.reduce((acc, s) => acc + s.duration_seconds, 0);
    const totalPageViews = sessions.reduce((acc, s) => acc + s.page_views, 0);

    // 7x24 heatmap (day 0=Sun..6=Sat, hour 0..23)
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const s of sessions) {
      const d = new Date(s.started_at);
      heatmap[d.getDay()][d.getHours()] += 1;
    }

    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    const liveVisitors = new Set(
      Object.values(state.sessions)
        .filter((s) => new Date(s.last_active_at).getTime() >= fiveMinsAgo)
        .map((s) => s.visitor_id)
    ).size;

    res.json({
      uniqueVisitors: activeVisitors.length,
      newVisitors: newCount,
      returningVisitors: returningCount,
      avgDurationSec: sessions.length ? Math.round(totalDuration / sessions.length) : 0,
      pagesPerVisit: sessions.length ? Number((totalPageViews / sessions.length).toFixed(1)) : 0,
      liveVisitors,
      devices,
      browsers,
      languages,
      locations,
      heatmap,
    });
  });

  // Sources & Ads (Owner Only)
  app.get('/api/admin/sources', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const { startMs, endMs } = parseDateWindow(
      req.query.from as string | undefined,
      req.query.to as string | undefined
    );

    const sessions = Object.values(state.sessions).filter((s) =>
      inRange(s.started_at, startMs, endMs)
    );
    const inquiries = state.inquiries.filter((i) => inRange(i.created_at, startMs, endMs));

    const bySource = new Map<
      string,
      { source: string; visits: number; visitors: Set<string>; inquiries: number; fbclidHits: number; gclidHits: number }
    >();

    for (const s of sessions) {
      const key = s.source_label || 'Direct';
      if (!bySource.has(key)) {
        bySource.set(key, {
          source: key,
          visits: 0,
          visitors: new Set(),
          inquiries: 0,
          fbclidHits: 0,
          gclidHits: 0,
        });
      }
      const entry = bySource.get(key)!;
      entry.visits += 1;
      entry.visitors.add(s.visitor_id);
      if (s.fbclid) entry.fbclidHits += 1;
      if (s.gclid) entry.gclidHits += 1;
    }

    for (const inq of inquiries) {
      const key = inq.first_source || 'Direct';
      if (!bySource.has(key)) {
        bySource.set(key, {
          source: key,
          visits: 0,
          visitors: new Set(),
          inquiries: 0,
          fbclidHits: 0,
          gclidHits: 0,
        });
      }
      bySource.get(key)!.inquiries += 1;
    }

    // UTM Campaign table
    const campaigns = new Map<
      string,
      { utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string; visits: number; inquiries: number }
    >();
    for (const s of sessions) {
      if (!s.utm_source && !s.utm_campaign && !s.fbclid && !s.gclid) continue;
      const key = `${s.utm_source}|${s.utm_medium}|${s.utm_campaign}|${s.utm_content}`;
      if (!campaigns.has(key)) {
        campaigns.set(key, {
          utm_source: s.utm_source || (s.fbclid ? 'meta_fbclid' : s.gclid ? 'google_gclid' : '-'),
          utm_medium: s.utm_medium || '-',
          utm_campaign: s.utm_campaign || '-',
          utm_content: s.utm_content || '-',
          visits: 0,
          inquiries: 0,
        });
      }
      campaigns.get(key)!.visits += 1;
    }
    for (const inq of inquiries) {
      if (!inq.utm_source && !inq.utm_campaign && !inq.fbclid && !inq.gclid) continue;
      const key = `${inq.utm_source}|${inq.utm_medium}|${inq.utm_campaign}|`;
      if (campaigns.has(key)) campaigns.get(key)!.inquiries += 1;
    }

    const totalSpend = state.adSpend.reduce((sum, a) => sum + a.amount_inr, 0);
    const totalPaidInquiries = inquiries.filter((i) => i.fbclid || i.gclid || i.utm_medium === 'cpc' || i.utm_medium === 'paid').length;

    res.json({
      sources: Array.from(bySource.values())
        .map((x) => ({
          source: x.source,
          visits: x.visits,
          uniqueVisitors: x.visitors.size,
          inquiries: x.inquiries,
          fbclidHits: x.fbclidHits,
          gclidHits: x.gclidHits,
        }))
        .sort((a, b) => b.visits - a.visits),
      campaigns: Array.from(campaigns.values()),
      adSpend: state.adSpend,
      totalSpendInr: totalSpend,
      costPerInquiryInr:
        totalPaidInquiries > 0
          ? Math.round(totalSpend / totalPaidInquiries)
          : inquiries.length > 0 && totalSpend > 0
          ? Math.round(totalSpend / inquiries.length)
          : null,
    });
  });

  app.post('/api/admin/ad-spend', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const monthKey = sanitizeText(body.month_key, 16) || new Date().toISOString().slice(0, 7);
    const channel = sanitizeText(body.channel, 48) || 'Instagram / Meta Ads';
    const amountInr = Number(body.amount_inr);
    const notes = sanitizeText(body.notes, 200);

    if (Number.isNaN(amountInr) || amountInr < 0) {
      res.status(400).json({ error: 'Enter a valid non-negative ad spend amount.' });
      return;
    }

    const state = store.getState();
    const existing = state.adSpend.find((a) => a.month_key === monthKey && a.channel === channel);
    if (existing) {
      existing.amount_inr = amountInr;
      existing.notes = notes;
      existing.updated_at = new Date().toISOString();
    } else {
      state.adSpend.push({
        id: crypto.randomUUID(),
        month_key: monthKey,
        channel,
        amount_inr: amountInr,
        notes,
        updated_at: new Date().toISOString(),
      });
    }
    store.save();
    res.json({ adSpend: state.adSpend });
  });

  // Inquiries (Owner + Staff)
  app.get('/api/admin/inquiries', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const statusFilter = sanitizeText(req.query.status, 32);
    const sourceFilter = sanitizeText(req.query.source, 48);
    const q = sanitizeText(req.query.q, 80).toLowerCase();

    let rows = state.inquiries;
    if (statusFilter && statusFilter !== 'All') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (sourceFilter && sourceFilter !== 'All') {
      rows = rows.filter((r) => r.first_source === sourceFilter);
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          r.patient_phone.toLowerCase().includes(q) ||
          r.concern.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }

    res.json({ inquiries: rows });
  });

  app.patch('/api/admin/inquiries/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const inquiry = state.inquiries.find((i) => i.id === req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: 'Inquiry not found.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const nowIso = new Date().toISOString();
    const actor = req.authUser?.email || 'admin';

    if (typeof body.status === 'string' && VALID_STATUSES.includes(body.status as InquiryStatus)) {
      const nextStatus = body.status as InquiryStatus;
      if (nextStatus !== inquiry.status) {
        inquiry.history.unshift({
          id: crypto.randomUUID(),
          inquiry_id: inquiry.id,
          actor_email: actor,
          action_type: 'status_change',
          from_status: inquiry.status,
          to_status: nextStatus,
          note: sanitizeText(body.note, 200) || `Status changed to ${nextStatus}`,
          created_at: nowIso,
        });
        inquiry.status = nextStatus;
        if (nextStatus === 'Contacted' && !inquiry.contacted_at) {
          inquiry.contacted_at = nowIso;
        }
      }
    }

    if (typeof body.notes === 'string' && body.notes.trim() !== inquiry.notes) {
      const cleanNotes = sanitizeText(body.notes, 1000);
      inquiry.notes = cleanNotes;
      inquiry.history.unshift({
        id: crypto.randomUUID(),
        inquiry_id: inquiry.id,
        actor_email: actor,
        action_type: 'note_updated',
        from_status: inquiry.status,
        to_status: inquiry.status,
        note: cleanNotes,
        created_at: nowIso,
      });
    }

    if (typeof body.follow_up_date === 'string') {
      inquiry.follow_up_date = sanitizeText(body.follow_up_date, 20);
    }

    inquiry.updated_at = nowIso;
    store.save();
    res.json({ inquiry });
  });

  app.get('/api/admin/inquiries/export.csv', requireAuth, (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const headers = [
      'ID',
      'Date',
      'Patient Name',
      'Phone',
      'Concern',
      'Duration',
      'Visit Mode',
      'Preferred Time',
      'Quiz Body Type',
      'Channel',
      'Status',
      'Source',
      'Follow Up Date',
      'Notes',
    ];
    const lines = [headers.join(',')];
    for (const r of state.inquiries) {
      lines.push(
        [
          r.id,
          r.created_at,
          r.patient_name,
          r.patient_phone,
          r.concern,
          r.duration,
          r.visit_mode,
          r.preferred_time,
          r.quiz_dosha,
          r.channel,
          r.status,
          r.first_source,
          r.follow_up_date,
          r.notes,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="khushdil-inquiries.csv"');
    res.send(lines.join('\n'));
  });

  // Behaviour (Owner Only)
  app.get('/api/admin/behaviour', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const { startMs, endMs } = parseDateWindow(
      req.query.from as string | undefined,
      req.query.to as string | undefined
    );
    const events = state.events.filter((e) => inRange(e.created_at, startMs, endMs));

    const countByLabel = (eventName: string) => {
      const map: Record<string, number> = {};
      for (const e of events) {
        if (e.event_name !== eventName) continue;
        const k = e.label || e.section_id || 'Unknown';
        map[k] = (map[k] || 0) + 1;
      }
      return Object.entries(map)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    };

    const scrollDepth = {
      '25%': events.filter((e) => e.event_name === 'scroll_depth' && e.numeric_value === 25).length,
      '50%': events.filter((e) => e.event_name === 'scroll_depth' && e.numeric_value === 50).length,
      '75%': events.filter((e) => e.event_name === 'scroll_depth' && e.numeric_value === 75).length,
      '100%': events.filter((e) => e.event_name === 'scroll_depth' && e.numeric_value === 100).length,
    };

    const formFunnel = {
      form_view: events.filter((e) => e.event_name === 'form_view').length,
      form_step_1: events.filter((e) => e.event_name === 'form_step_1').length,
      form_step_2: events.filter((e) => e.event_name === 'form_step_2').length,
      form_step_3: events.filter((e) => e.event_name === 'form_step_3').length,
      form_submit: events.filter((e) => e.event_name === 'form_submit').length,
    };

    res.json({
      scrollDepth,
      sections: countByLabel('section_view'),
      treatments: countByLabel('treatment_click'),
      bodyMapHotspots: countByLabel('bodymap_hotspot'),
      quiz: {
        starts: events.filter((e) => e.event_name === 'quiz_start').length,
        completions: events.filter((e) => e.event_name === 'quiz_complete').length,
        results: countByLabel('quiz_complete'),
      },
      reels: countByLabel('reel_play'),
      faqs: countByLabel('faq_open'),
      formFunnel,
    });
  });

  // Contact Taps (Owner Only)
  app.get('/api/admin/contact-taps', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const { startMs, endMs } = parseDateWindow(
      req.query.from as string | undefined,
      req.query.to as string | undefined
    );
    const events = state.events.filter((e) => inRange(e.created_at, startMs, endMs));

    const group = (name: string) => {
      const map: Record<string, number> = {};
      for (const e of events) {
        if (e.event_name !== name) continue;
        const key = `${e.label || 'Primary'} (${e.section_id || 'page'})`;
        map[key] = (map[key] || 0) + 1;
      }
      return Object.entries(map)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
    };

    res.json({
      calls: group('call_tap'),
      whatsapp: group('whatsapp_tap'),
      instagram: group('instagram_tap'),
      directions: group('directions_tap'),
      totals: {
        callTaps: events.filter((e) => e.event_name === 'call_tap').length,
        whatsappTaps: events.filter((e) => e.event_name === 'whatsapp_tap').length,
        instagramTaps: events.filter((e) => e.event_name === 'instagram_tap').length,
        directionsTaps: events.filter((e) => e.event_name === 'directions_tap').length,
      },
    });
  });

  // Photos CMS (Owner + Staff)
  app.get('/api/admin/photos', requireAuth, (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    res.json({ photos: Object.values(state.photos) });
  });

  app.post('/api/admin/photos/:slotId/upload', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const slotId = sanitizeText(req.params.slotId, 64);
    if (!Object.prototype.hasOwnProperty.call(state.photos, slotId)) {
      res.status(404).json({ error: 'Unknown photo slot ID.' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const existing = state.photos[slotId];
    const { previous_snapshot: _ignoredPrev, ...snapshotCopy } = existing;

    const origDecoded = typeof body.original === 'string' ? decodeDataUrl(body.original) : null;
    if (!origDecoded) {
      res.status(400).json({ error: 'Invalid or oversized photo file (max 10 MB, JPEG/PNG/WebP).' });
      return;
    }

    const stamp = Date.now();
    const urlOriginal = safeWriteUpload(`${slotId}-${stamp}-orig.${origDecoded.ext}`, origDecoded.buf);
    const d480 = typeof body.w480 === 'string' ? decodeDataUrl(body.w480) : null;
    const d960 = typeof body.w960 === 'string' ? decodeDataUrl(body.w960) : null;
    const d1920 = typeof body.w1920 === 'string' ? decodeDataUrl(body.w1920) : null;

    const url480 = d480 ? safeWriteUpload(`${slotId}-${stamp}-480.webp`, d480.buf) : urlOriginal;
    const url960 = d960 ? safeWriteUpload(`${slotId}-${stamp}-960.webp`, d960.buf) : urlOriginal;
    const url1920 = d1920 ? safeWriteUpload(`${slotId}-${stamp}-1920.webp`, d1920.buf) : url960;

    const altText = sanitizeText(body.alt_text, 240);
    const hasFace = Boolean(body.has_patient_face);
    const consentGiven = Boolean(body.consent_given);
    const requestedPublish = body.is_published !== false;
    const isPublished = requestedPublish && (!hasFace || consentGiven);

    state.photos[slotId] = {
      ...existing,
      url: url960,
      url_480: url480,
      url_960: url960,
      url_1920: url1920,
      url_original: urlOriginal,
      alt_text: altText || existing.alt_text,
      focal_x:
        typeof body.focal_x === 'number' ? Math.min(100, Math.max(0, Math.round(body.focal_x))) : existing.focal_x,
      focal_y:
        typeof body.focal_y === 'number' ? Math.min(100, Math.max(0, Math.round(body.focal_y))) : existing.focal_y,
      has_patient_face: hasFace,
      consent_given: hasFace ? consentGiven : true,
      is_published: isPublished,
      is_standin: false,
      updated_at: new Date().toISOString(),
      previous_snapshot: snapshotCopy,
    };

    store.save();
    res.json({
      photo: state.photos[slotId],
      blockedByConsent: hasFace && !consentGiven,
    });
  });

  app.patch('/api/admin/photos/:slotId', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const slotId = sanitizeText(req.params.slotId, 64);
    if (!Object.prototype.hasOwnProperty.call(state.photos, slotId)) {
      res.status(404).json({ error: 'Unknown photo slot ID.' });
      return;
    }

    const existing = state.photos[slotId];
    const { previous_snapshot: _ignoredPrev2, ...snapshotCopy } = existing;

    const body = (req.body || {}) as Record<string, unknown>;
    const hasFace =
      typeof body.has_patient_face === 'boolean' ? body.has_patient_face : existing.has_patient_face;
    const consentGiven =
      typeof body.consent_given === 'boolean' ? body.consent_given : existing.consent_given;
    const requestedPublish =
      typeof body.is_published === 'boolean' ? body.is_published : existing.is_published;

    if (requestedPublish && hasFace && !consentGiven) {
      res.status(400).json({ error: 'Patient face photos require consent ticked before publishing.' });
      return;
    }

    state.photos[slotId] = {
      ...existing,
      alt_text: typeof body.alt_text === 'string' ? sanitizeText(body.alt_text, 240) : existing.alt_text,
      focal_x:
        typeof body.focal_x === 'number' ? Math.min(100, Math.max(0, Math.round(body.focal_x))) : existing.focal_x,
      focal_y:
        typeof body.focal_y === 'number' ? Math.min(100, Math.max(0, Math.round(body.focal_y))) : existing.focal_y,
      has_patient_face: hasFace,
      consent_given: consentGiven,
      is_published: requestedPublish,
      updated_at: new Date().toISOString(),
      previous_snapshot: snapshotCopy,
    };
    store.save();
    res.json({ photo: state.photos[slotId] });
  });

  app.post('/api/admin/photos/:slotId/undo', requireAuth, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const slotId = sanitizeText(req.params.slotId, 64);
    const existing = state.photos[slotId];
    if (!existing || !existing.previous_snapshot) {
      res.status(400).json({ error: 'No previous change available to undo for this slot.' });
      return;
    }
    state.photos[slotId] = {
      ...existing.previous_snapshot,
      updated_at: new Date().toISOString(),
      previous_snapshot: null,
    };
    store.save();
    res.json({ photo: state.photos[slotId] });
  });

  // Content Editor (Owner Only)
  app.get('/api/admin/content', requireAuth, requireOwner, (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    res.json({
      content: state.content,
      versions: state.contentVersions.slice(0, 20),
    });
  });

  app.put('/api/admin/content', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const body = (req.body || {}) as { content?: ClinicPublicContent; summary?: string };
    if (!body.content || typeof body.content !== 'object') {
      res.status(400).json({ error: 'Invalid content payload.' });
      return;
    }

    // Save version snapshot first
    state.contentVersions.unshift({
      id: crypto.randomUUID(),
      edited_by: req.authUser?.email || 'owner',
      summary: sanitizeText(body.summary, 120) || 'Edited clinic content',
      snapshot: JSON.parse(JSON.stringify(state.content)) as ClinicPublicContent,
      created_at: new Date().toISOString(),
    });
    state.contentVersions = state.contentVersions.slice(0, 30);

    state.content = {
      ...state.content,
      ...body.content,
    };
    store.save();
    res.json({
      content: state.content,
      versions: state.contentVersions,
    });
  });

  app.post('/api/admin/content/restore/:versionId', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const ver = state.contentVersions.find((v) => v.id === req.params.versionId);
    if (!ver) {
      res.status(404).json({ error: 'Version not found.' });
      return;
    }
    state.contentVersions.unshift({
      id: crypto.randomUUID(),
      edited_by: req.authUser?.email || 'owner',
      summary: `Restored snapshot from ${new Date(ver.created_at).toLocaleString()}`,
      snapshot: JSON.parse(JSON.stringify(state.content)) as ClinicPublicContent,
      created_at: new Date().toISOString(),
    });
    state.content = JSON.parse(JSON.stringify(ver.snapshot)) as ClinicPublicContent;
    store.save();
    res.json({ content: state.content, versions: state.contentVersions });
  });

  // Settings, Users, Daily Summary, Privacy Deletion (Owner Only)
  app.get('/api/admin/settings', requireAuth, requireOwner, (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    res.json({
      settings: state.settings,
      admins: state.admins.map(sanitizeAdminUser),
      notifications: state.notifications.slice(-20).reverse(),
    });
  });

  app.put('/api/admin/settings', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const body = (req.body || {}) as Record<string, unknown>;
    state.settings = {
      metaPixelId:
        typeof body.metaPixelId === 'string'
          ? body.metaPixelId.replace(/[^0-9]/g, '').slice(0, 32)
          : state.settings.metaPixelId,
      ga4Id:
        typeof body.ga4Id === 'string'
          ? sanitizeText(body.ga4Id, 32).replace(/[^A-Za-z0-9-]/g, '')
          : state.settings.ga4Id,
      cookieBannerText:
        typeof body.cookieBannerText === 'string'
          ? sanitizeText(body.cookieBannerText, 400)
          : state.settings.cookieBannerText,
      privacySummary:
        typeof body.privacySummary === 'string'
          ? sanitizeText(body.privacySummary, 1000)
          : state.settings.privacySummary,
      ownerEmail:
        typeof body.ownerEmail === 'string'
          ? sanitizeText(body.ownerEmail, 120)
          : state.settings.ownerEmail,
      dailySummaryTime:
        typeof body.dailySummaryTime === 'string'
          ? sanitizeText(body.dailySummaryTime, 10)
          : state.settings.dailySummaryTime,
      dailySummaryEnabled:
        typeof body.dailySummaryEnabled === 'boolean'
          ? body.dailySummaryEnabled
          : state.settings.dailySummaryEnabled,
      instantAlertEnabled:
        typeof body.instantAlertEnabled === 'boolean'
          ? body.instantAlertEnabled
          : state.settings.instantAlertEnabled,
    };
    store.save();
    res.json({ settings: state.settings });
  });

  app.post('/api/admin/admins', requireAuth, requireOwner, async (req: AuthedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const email = sanitizeText(body.email, 120).toLowerCase();
    const name = sanitizeText(body.name, 80);
    const role: AdminRole = body.role === 'owner' ? 'owner' : 'staff';
    const password = typeof body.password === 'string' ? body.password : '';
    const twoStep = Boolean(body.two_step_enabled);

    if (!email.includes('@') || !name || password.length < 8) {
      res.status(400).json({ error: 'Name, valid email, and password (8+ chars) are required.' });
      return;
    }

    const state = store.getState();
    if (state.admins.some((a) => a.email === email)) {
      res.status(409).json({ error: 'An admin user with this email already exists.' });
      return;
    }

    const password_hash = await hashPassword(password);
    state.admins.push({
      id: crypto.randomUUID(),
      email,
      name,
      role,
      password_hash,
      two_step_enabled: twoStep,
      created_at: new Date().toISOString(),
      last_login_at: null,
    });
    store.save();
    res.status(201).json({ admins: state.admins.map(sanitizeAdminUser) });
  });

  app.delete('/api/admin/admins/:id', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const state = store.getState();
    if (req.params.id === req.authUser?.sub) {
      res.status(400).json({ error: 'You cannot delete your own active account.' });
      return;
    }
    state.admins = state.admins.filter((a) => a.id !== req.params.id);
    store.save();
    res.json({ admins: state.admins.map(sanitizeAdminUser) });
  });

  app.post('/api/admin/daily-summary/send', requireAuth, requireOwner, async (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayVisitors = new Set(
      Object.values(state.sessions)
        .filter((s) => s.started_at.startsWith(todayPrefix))
        .map((s) => s.visitor_id)
    ).size;
    const todayInquiries = state.inquiries.filter((i) => i.created_at.startsWith(todayPrefix));
    const pending = state.inquiries.filter((i) => i.status === 'New').length;

    const summaryBody = `Date: ${todayPrefix} | Visitors: ${todayVisitors} | Today Inquiries: ${todayInquiries.length} | Uncontacted (New): ${pending}`;
    await dispatchOwnerNotification(
      'daily_summary',
      `Khushdil Clinic Daily Summary (${todayPrefix})`,
      summaryBody
    );
    res.json({ message: 'Daily summary dispatched.', notifications: state.notifications.slice(-20).reverse() });
  });

  app.post('/api/admin/patient-data/delete', requireAuth, requireOwner, (req: AuthedRequest, res: Response) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const phone = normalizePhone(sanitizeText(body.phone, 30));
    if (phone.length < 10) {
      res.status(400).json({ error: 'Enter a valid 10-digit patient mobile number.' });
      return;
    }
    const state = store.getState();
    const before = state.inquiries.length;
    state.inquiries = state.inquiries.filter((i) => i.patient_phone !== phone);
    const deletedCount = before - state.inquiries.length;
    store.save();
    res.json({ deletedCount, message: `Deleted ${deletedCount} inquiry record(s) for ${phone}.` });
  });

  app.get('/api/admin/export-all', requireAuth, requireOwner, (_req: AuthedRequest, res: Response) => {
    const state = store.getState();
    const safeDump = {
      exported_at: new Date().toISOString(),
      content: state.content,
      settings: state.settings,
      inquiries: state.inquiries,
      adSpend: state.adSpend,
      photos: Object.values(state.photos).map((p) => ({
        slot_id: p.slot_id,
        url: p.url,
        alt_text: p.alt_text,
        consent_given: p.consent_given,
        updated_at: p.updated_at,
      })),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="khushdil-clinic-backup.json"');
    res.send(JSON.stringify(safeDump, null, 2));
  });

  // Return clean JSON 404 for unknown /api routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Clean error handler for malformed JSON / oversized payloads (no stack trace leaks)
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    if (err?.type === 'entity.too.large') {
      res.status(413).json({ error: 'Uploaded payload exceeds limit.' });
      return;
    }
    res.status(err?.status || 500).json({ error: 'Internal server error.' });
  });

  // ========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC DIST (PROD)
  // ========================================================================
  if (!options.skipFrontend) {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const vitePkg = 'vite';
      const { createServer: createViteServer } = (await import(
        /* @vite-ignore */ vitePkg
      )) as typeof import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use((req, res, next) => {
        if (req.path.startsWith('/admin')) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        next();
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distDir));
      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/admin')) {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return app;
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isMainModule) {
  const port = Number(process.env.PORT) || 3000;
  createServerApp()
    .then((app) => {
      app.listen(port, '0.0.0.0', () => {
        console.log(`Khushdil Clinic server running at http://0.0.0.0:${port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
