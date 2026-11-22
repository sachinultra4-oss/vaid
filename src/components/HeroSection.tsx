import React from 'react';
import { Phone } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { SlotImage, useClinicData } from '../context/ClinicContext';
import { tracker } from '../utils/tracker';

const HEADLINE_WORDS = ['Ayurvedic', 'care', 'by', 'Vaid', 'Jashan', 'Sandhu.'];

export function HeroSection() {
  const { content } = useClinicData();
  const primaryPhone = content.phones[0] || DATA.phones[0];

  return (
    <section
      id="hero"
      className="relative min-h-[100svh] w-full flex items-end sm:items-center pt-24 pb-12 sm:py-20 overflow-hidden bg-[#0E3B26]"
    >
      {/* Full-bleed Hero Slot (priority load, responsive srcset) */}
      <SlotImage
        slotId="hero"
        fallbackSrc={DATA.photos.hero}
        fallbackAlt="Ayurvedic consultation desk with brass mortar, fresh herbs, and amber glass bottles"
        width={2400}
        height={1400}
        priority
        sizes="100vw"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Clean Legibility Edge */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#12201A]/58 sm:bg-transparent sm:bg-gradient-to-r sm:from-[#12201A]/90 sm:via-[#12201A]/62 sm:to-[#12201A]/15"
      />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl text-[#F4EFE2]">
          <p className="font-hindi t-14 tracking-wide text-[#C9A24B] mb-4">
            आयुर्वेदिक दवाखाना
          </p>

          <h1 className="font-serif t-72 font-medium tracking-tight text-[#F4EFE2]">
            {HEADLINE_WORDS.map((word, idx) => (
              <span key={word} className="hero-word-mask">
                <span
                  className={`hero-word ${idx >= 3 ? 'italic text-[#DDE6C8]' : ''}`}
                  style={{ animationDelay: `${80 + idx * 70}ms` }}
                >
                  {word}
                </span>
              </span>
            ))}
          </h1>

          <p className="t-20 text-[#F4EFE2]/92 mt-5 max-w-xl">
            Only Ayurvedic medicine. {content.instagramFollowers} follow his work on Instagram.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#book"
              onClick={() => tracker.track('hero_book_tap', 'hero', 'Book a consultation')}
              className="btn-primary bg-[#F4EFE2] text-[#0E3B26] hover:bg-[#FAF7EF]"
            >
              <span>Book a consultation</span>
            </a>

            <a
              href={`tel:${primaryPhone.tel}`}
              onClick={() => tracker.track('call_tap', 'hero', primaryPhone.display)}
              className="btn-secondary btn-secondary-light"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span>Call {primaryPhone.display}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
