import React, { useEffect, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { SlotImage, useClinicData } from '../context/ClinicContext';
import { tracker } from '../utils/tracker';

export function Navbar({ scrollProgress }: { scrollProgress: number }) {
  const { content } = useClinicData();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navItems = [
    { label: 'Treatments', href: '#treatments' },
    { label: 'Process', href: '#process' },
    { label: 'The Vaid', href: '#the-vaid' },
    { label: 'Reels', href: '#reels' },
    { label: 'Book', href: '#book' },
  ];

  const primaryPhone = content.phones[0] || {
    display: '62846-64722',
    tel: '+916284664722',
    whatsapp: '916284664722',
  };

  return (
    <>
      <header className="fixed top-3 left-0 right-0 z-40 px-4 sm:px-8 pointer-events-none">
        <div className="max-w-[1200px] mx-auto pointer-events-auto">
          <div className="relative rounded-full bg-[#FAF7EF]/85 backdrop-blur-md border border-[#12201A]/15 px-4 sm:px-6 h-14 flex items-center justify-between gap-6 overflow-hidden">
            {/* Real Clinic Emblem Logo */}
            <a
              href="#hero"
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
              aria-label={`${content.clinicName} home`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#C9A24B] shrink-0 bg-[#0E3B26]">
                <SlotImage
                  slotId="logo"
                  fallbackSrc="/assets/aistudio/747882622_18462579148112646_5609709282036442747_n.jpg_2bb6d326.jpeg"
                  fallbackAlt="Khushdil Ayurvedic Clinic emblem"
                  width={600}
                  height={600}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-serif font-semibold text-base sm:text-[18px] text-[#12201A] tracking-tight">
                Khushdil
              </span>
            </a>

            {/* Desktop Nav Links */}
            <nav
              aria-label="Main navigation"
              className="hidden md:flex items-center gap-7 text-[15px] font-bold text-[#12201A]"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="draw-link whitespace-nowrap shrink-0"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Right Action + Mobile Menu Button */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${primaryPhone.tel}`}
                onClick={() => tracker.track('call_tap', 'navbar', primaryPhone.display)}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0E3B26] text-[#F4EFE2] text-sm font-bold whitespace-nowrap hover:bg-[#145034] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{primaryPhone.display}</span>
              </a>

              <button
                type="button"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-drawer"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                onClick={() => setMenuOpen((prev) => !prev)}
                className="md:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-full border border-[#12201A]/25 text-sm font-bold text-[#12201A] cursor-pointer"
              >
                {menuOpen ? (
                  <>
                    <X className="w-4 h-4" aria-hidden="true" />
                    <span>Close</span>
                  </>
                ) : (
                  <>
                    <Menu className="w-4 h-4" aria-hidden="true" />
                    <span>Menu</span>
                  </>
                )}
              </button>
            </div>

            {/* Thin Gold Scroll Progress Line */}
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C9A24B] origin-left"
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, scrollProgress))})` }}
            />
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Drawer */}
      {menuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-50 bg-[#0E3B26] text-[#F4EFE2] p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-[28px] font-semibold">Khushdil</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full border border-[#F4EFE2]/40 text-sm font-bold cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              <span>Close Menu</span>
            </button>
          </div>

          <nav className="flex flex-col gap-5" aria-label="Mobile links">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="font-serif text-[44px] leading-tight text-[#F4EFE2] hover:text-[#C9A24B]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pt-6 border-t border-[#F4EFE2]/20 flex flex-col gap-3">
            <a
              href={`tel:${primaryPhone.tel}`}
              onClick={() => tracker.track('call_tap', 'mobile_drawer', primaryPhone.display)}
              className="btn-secondary btn-secondary-light w-full justify-center"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span>Call {primaryPhone.display}</span>
            </a>
            <a
              href="#book"
              onClick={() => setMenuOpen(false)}
              className="btn-primary bg-[#F4EFE2] text-[#0E3B26] w-full justify-center"
            >
              <span>Book a consultation</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
