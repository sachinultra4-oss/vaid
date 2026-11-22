import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { DATA } from '../data/clinicData';
import { SlotImage } from '../context/ClinicContext';

const MomentDepth3D = lazy(() => import('./MomentDepth3D'));

export function HerbsTunnel3D() {
  const trackRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [activeProgress, setActiveProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { rootMargin: '200px' }
    );
    io.observe(el);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return () => io.disconnect();

    let rafId = 0;
    let current = 0;

    const update = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const totalScrollable = Math.max(1, trackRef.current.offsetHeight - window.innerHeight);
      const raw = Math.min(1, Math.max(0, -rect.top / totalScrollable));
      current += (raw - current) * 0.16;
      progressRef.current = current;
      setActiveProgress(current);
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  const totalHerbs = DATA.herbs.length;
  const herbFloat = activeProgress * (totalHerbs - 1);
  const focusedIdx = Math.min(totalHerbs - 1, Math.max(0, Math.round(herbFloat)));
  const focusedHerb = DATA.herbs[focusedIdx];

  const jumpToHerb = (idx: number) => {
    if (!trackRef.current) return;
    const totalScrollable = Math.max(1, trackRef.current.offsetHeight - window.innerHeight);
    const targetTop =
      window.scrollY +
      trackRef.current.getBoundingClientRect().top +
      (idx / (totalHerbs - 1)) * totalScrollable;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  return (
    <section
      id="herbs"
      ref={trackRef}
      aria-label="The Herbs"
      className="relative bg-[#F4EFE2] text-[#12201A] border-t border-[#12201A]/10 md:h-[300svh]"
    >
      <div className="md:sticky md:top-0 md:h-[100svh] w-full overflow-hidden flex items-center py-16 md:py-0">
        {isVisible && (
          <Suspense fallback={null}>
            <MomentDepth3D variant="cream" progressRef={progressRef} />
          </Suspense>
        )}

        <div className="relative z-10 max-w-[1200px] w-full mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="font-hindi t-14 text-[#3E7A4A] font-bold">शुद्ध जड़ी-बूटियाँ</p>
              <h2 className="font-serif t-44 font-medium mt-1">The herbs</h2>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Herb tunnel items">
              {DATA.herbs.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  role="tab"
                  aria-selected={i === focusedIdx}
                  onClick={() => jumpToHerb(i)}
                  className={`px-3.5 py-2 min-h-[44px] rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                    i === focusedIdx
                      ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                      : 'bg-[#FAF7EF] text-[#12201A] border-[#12201A]/20 hover:border-[#3E7A4A]'
                  }`}
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div
              className="lg:col-span-7 relative h-[340px] sm:h-[400px] flex items-center justify-center overflow-hidden"
              style={{ perspective: '1000px' }}
            >
              {DATA.herbs.map((herb, i) => {
                const delta = i - herbFloat;
                const tz = delta >= 0 ? -delta * 320 : -delta * 380;
                const tx = (i % 2 === 0 ? -1 : 1) * Math.min(Math.abs(delta), 2) * 55;
                const hidden = delta < -0.65 || delta > 2.5;

                return (
                  <div
                    key={herb.id}
                    style={{
                      transform: `translate3d(${tx}px, 0, ${tz}px)`,
                      zIndex: 30 - Math.round(Math.abs(delta) * 5),
                      visibility: hidden ? 'hidden' : 'visible',
                    }}
                    className="absolute w-full max-w-[340px] aspect-[4/3] rounded-2xl border border-[#12201A]/16 bg-[#FAF7EF] p-3"
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden bg-[#E5DEC9]">
                      <SlotImage
                        slotId={`herb-${herb.id}`}
                        fallbackSrc={herb.image}
                        fallbackAlt={herb.alt}
                        width={1200}
                        height={1200}
                        sizes="340px"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5 clinic-card p-6 sm:p-8">
              <div className="flex items-center justify-between text-sm text-[#C9A24B] font-bold">
                <span className="tabular-nums">0{focusedIdx + 1} / 0{totalHerbs}</span>
                <span className="font-hindi text-[#3E7A4A]">{focusedHerb.hindi}</span>
              </div>
              <h3 className="font-serif t-44 font-medium text-[#12201A] mt-3">
                {focusedHerb.name}
              </h3>
              <p className="t-16 text-[#12201A]/85 mt-3">{focusedHerb.traditionalUse}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
