import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Leaf } from 'lucide-react';
import { DATA } from '../data/clinicData';
import type {
  ClinicPublicContent,
  ClinicSettingsPublic,
  PhotoSlotRecord,
  PublicBootstrapPayload,
} from '../types/clinic';

interface ClinicContextValue {
  photos: Record<string, PhotoSlotRecord>;
  content: ClinicPublicContent;
  settings: ClinicSettingsPublic;
  hasStandInPhotos: boolean;
  loaded: boolean;
  refreshBootstrap: () => Promise<void>;
}

const DEFAULT_CONTENT: ClinicPublicContent = {
  clinicName: DATA.clinicName,
  doctorName: DATA.doctorName,
  shortDoctor: DATA.shortDoctor,
  instagramHandle: DATA.instagramHandle,
  instagramUrl: DATA.instagramUrl,
  instagramFollowers: DATA.instagramFollowers,
  phones: DATA.phones,
  degree: DATA.placeholders.degree,
  yearsInPractice: DATA.placeholders.yearsInPractice,
  streetAndDistrict: DATA.placeholders.streetAndDistrict,
  timings: DATA.placeholders.timings,
  standInCredit: DATA.standInCredit,
  treatments: DATA.treatments.map((t, i) => ({
    id: t.id,
    slot_id:
      ['treat-joints', 'treat-digestion', 'treat-weight', 'treat-sugar', 'treat-skin', 'treat-hair', 'treat-women', 'treat-sleep'][i] ||
      'treat-joints',
    title: t.title,
    hindi: t.hindi,
    softLine: t.softLine,
  })),
  reviews: DATA.reviews.map((r) => ({
    ...r,
    consent_given: false,
    is_published: true,
  })),
  faqs: DATA.faqs.map((f, i) => ({
    id: `faq-${i + 1}`,
    question: f.question,
    answer: f.answer,
    is_published: true,
  })),
  reels: DATA.reels.map((r) => ({
    id: r.id,
    slot_id: r.id,
    title: r.title,
    videoUrl: r.videoUrl,
    instagramUrl: DATA.instagramUrl,
  })),
};

const DEFAULT_SETTINGS: ClinicSettingsPublic = {
  metaPixelId: '',
  ga4Id: '',
  cookieBannerText:
    'We use simple website analytics to improve clinic visits and optional marketing pixels only if you accept.',
  privacySummary:
    'Khushdil Ayurvedic Clinic stores website visit stats for up to 14 months and consultation inquiries for up to 24 months.',
};

const ClinicContext = createContext<ClinicContextValue>({
  photos: {},
  content: DEFAULT_CONTENT,
  settings: DEFAULT_SETTINGS,
  hasStandInPhotos: true,
  loaded: false,
  refreshBootstrap: async () => {},
});

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<Record<string, PhotoSlotRecord>>({});
  const [content, setContent] = useState<ClinicPublicContent>(DEFAULT_CONTENT);
  const [settings, setSettings] = useState<ClinicSettingsPublic>(DEFAULT_SETTINGS);
  const [hasStandInPhotos, setHasStandInPhotos] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) return;
      const data = (await res.json()) as PublicBootstrapPayload;
      if (data.photos) setPhotos(data.photos);
      if (data.content) setContent(data.content);
      if (data.settings) setSettings(data.settings);
      setHasStandInPhotos(Boolean(data.hasStandInPhotos));
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  return (
    <ClinicContext.Provider
      value={{ photos, content, settings, hasStandInPhotos, loaded, refreshBootstrap }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinicData() {
  return useContext(ClinicContext);
}

interface SlotImageProps {
  slotId: string;
  fallbackSrc?: string;
  fallbackAlt?: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export function SlotImage({
  slotId,
  fallbackSrc = '',
  fallbackAlt = '',
  width,
  height,
  priority = false,
  className = 'w-full h-full object-cover',
  sizes = '(max-width: 768px) 100vw, 50vw',
}: SlotImageProps) {
  const { photos, loaded } = useClinicData();
  const [imgLoaded, setImgLoaded] = useState(false);
  const slot = photos[slotId];

  // Determine source strictly: once loaded, respect slot.url (if empty -> Missing stand-in block)
  const effectiveSrc = slot ? slot.url : loaded ? '' : fallbackSrc;
  const effectiveAlt = slot?.alt_text || fallbackAlt || slot?.label || 'Clinic photograph';

  if (!effectiveSrc) {
    return (
      <div
        aria-label={effectiveAlt}
        className="w-full h-full bg-[#E5DEC9] flex items-center justify-center text-[#0E3B26]/35"
      >
        <Leaf className="w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  const srcSetParts: string[] = [];
  if (slot?.url_480) srcSetParts.push(`${slot.url_480} 480w`);
  if (slot?.url_960) srcSetParts.push(`${slot.url_960} 960w`);
  if (slot?.url_1920) srcSetParts.push(`${slot.url_1920} 1920w`);
  const srcSet = srcSetParts.length > 0 ? srcSetParts.join(', ') : undefined;

  const objectPosition = slot ? `${slot.focal_x}% ${slot.focal_y}%` : '50% 50%';

  return (
    <img
      src={effectiveSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={effectiveAlt}
      width={slot?.target_width || width}
      height={slot?.target_height || height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setImgLoaded(true)}
      style={{ objectPosition }}
      className={`${className} transition-opacity duration-300 ${
        imgLoaded || priority ? 'opacity-100' : 'opacity-85'
      }`}
    />
  );
}

export function formatPhoneWhatsApp(phoneObj: { whatsapp: string }, message: string): string {
  return `https://wa.me/${phoneObj.whatsapp}?text=${encodeURIComponent(message)}`;
}
