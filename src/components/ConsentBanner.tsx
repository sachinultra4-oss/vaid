import React, { useEffect, useState } from 'react';
import { useClinicData } from '../context/ClinicContext';
import {
  getConsentState,
  loadConsentPixels,
  setConsentState,
  type CookieConsentState,
} from '../utils/tracker';

export function ConsentBanner({ onNavigatePrivacy }: { onNavigatePrivacy: () => void }) {
  const { settings } = useClinicData();
  const [consent, setConsent] = useState<CookieConsentState>('accepted');

  useEffect(() => {
    const current = getConsentState();
    setConsent(current);
    if (current === 'accepted') {
      loadConsentPixels(settings.metaPixelId, settings.ga4Id);
    }
  }, [settings.metaPixelId, settings.ga4Id]);

  if (consent !== 'unset') return null;

  const choose = (choice: 'accepted' | 'essential') => {
    setConsentState(choice);
    setConsent(choice);
    if (choice === 'accepted') {
      loadConsentPixels(settings.metaPixelId, settings.ga4Id);
    }
  };

  return (
    <aside
      aria-label="Cookie and privacy preference"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-lg z-40 rounded-2xl bg-[#FAF7EF] border border-[#12201A]/20 p-4 sm:p-5 shadow-xl text-[#12201A]"
    >
      <p className="t-14 text-[#12201A]/90">
        {settings.cookieBannerText}{' '}
        <button
          type="button"
          onClick={onNavigatePrivacy}
          className="underline font-bold text-[#0E3B26] cursor-pointer"
        >
          Read privacy policy
        </button>
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="px-4 py-2 min-h-[40px] rounded-full bg-[#0E3B26] text-[#F4EFE2] text-sm font-bold hover:bg-[#145034] cursor-pointer"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => choose('essential')}
          className="px-4 py-2 min-h-[40px] rounded-full border border-[#12201A]/30 text-[#12201A] text-sm font-bold hover:bg-[#12201A]/5 cursor-pointer"
        >
          Only essentials
        </button>
      </div>
    </aside>
  );
}
