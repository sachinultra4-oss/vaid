import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { DATA } from '../data/clinicData';
import { SlotImage } from '../context/ClinicContext';

const MomentDepth3D = lazy(() => import('./MomentDepth3D'));

export function CareProcess3D() {
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

  const totalSteps = DATA.careSteps.length;
  const stepFloat = activeProgress * (totalSteps - 1);
  const activeStepIdx = Math.min(totalSteps - 1, Math.max(0, Math.round(stepFloat)));
  const currentStep = DATA.careSteps[activeStepIdx];

  const jumpToStep = (idx: number) => {
    if (!trackRef.current) return;
    const totalScrollable = Math.max(1, trackRef.current.offsetHeight - window.innerHeight);
    const targetTop =
      window.scrollY +
      trackRef.current.getBoundingClientRect().top +
      (idx / (totalSteps - 1)) * totalScrollable;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  return (
    <section
      id="process"
      ref={trackRef}
      aria-label="How care works"
      className="relative bg-[#0E3B26] text-[#F4EFE2] md:h-[400svh]"
    >
      <div className="md:sticky md:top-0 md:h-[100svh] w-full overflow-hidden flex items-center py-16 md:py-0">
        {isVisible && (
          <Suspense fallback={null}>
            <MomentDepth3D variant="forest" progressRef={progressRef} />
          </Suspense>
        )}

        <div className="relative z-10 max-w-[1200px] w-full mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="font-hindi t-14 text-[#C9A24B]">देखभाल की प्रक्रिया</p>
            <h2 className="font-serif t-28 text-[#F4EFE2]/90">How care works</h2>

            <div className="pt-2">
              <div className="font-serif t-120 text-[#C9A24B] leading-none tabular-nums">
                {currentStep.num}
              </div>
              <p className="font-hindi t-14 text-[#C9A24B] mt-3">{currentStep.hindi}</p>
              <h3 className="font-serif t-44 font-medium text-[#F4EFE2] mt-1">
                {currentStep.title}
              </h3>
              <p className="t-16 text-[#F4EFE2]/88 mt-3 max-w-md">{currentStep.line1}</p>
              <p className="t-16 text-[#F4EFE2]/75 mt-1 max-w-md">{currentStep.line2}</p>
            </div>

            <div className="flex items-center gap-3 pt-4" role="tablist" aria-label="Care steps">
              {DATA.careSteps.map((st, idx) => {
                const isActive = idx === activeStepIdx;
                return (
                  <button
                    key={st.num}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Step ${st.num}: ${st.title}`}
                    onClick={() => jumpToStep(idx)}
                    className={`h-3 rounded-full transition-all duration-200 cursor-pointer ${
                      isActive ? 'w-10 bg-[#C9A24B]' : 'w-3 bg-[#F4EFE2]/35 hover:bg-[#F4EFE2]/65'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div
            className="lg:col-span-6 relative h-[360px] sm:h-[440px] flex items-center justify-center"
            style={{ perspective: '1100px' }}
          >
            {DATA.careSteps.map((step, idx) => {
              const delta = idx - stepFloat;
              const tz = delta >= 0 ? -delta * 380 : -delta * 420;
              const ty = delta * 18;
              const isPast = delta < -0.75;
              const isFar = delta > 2.6;

              return (
                <div
                  key={step.num}
                  style={{
                    transform: `translate3d(0, ${ty}px, ${tz}px)`,
                    zIndex: 20 - Math.round(Math.abs(delta) * 4),
                    visibility: isPast || isFar ? 'hidden' : 'visible',
                  }}
                  className="absolute w-full max-w-[380px] aspect-[4/5] rounded-2xl border border-[#C9A24B]/40 bg-[#FAF7EF]/10 backdrop-blur-md p-3 flex flex-col justify-between overflow-hidden"
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-[#12201A]">
                    <SlotImage
                      slotId={`plate-${idx + 1}`}
                      fallbackSrc={step.image}
                      fallbackAlt={step.alt}
                      width={1000}
                      height={1300}
                      sizes="380px"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
