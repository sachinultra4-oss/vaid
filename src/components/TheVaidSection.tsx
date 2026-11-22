import React from 'react';
import { DATA } from '../data/clinicData';
import { SlotImage, useClinicData } from '../context/ClinicContext';

export function TheVaidSection() {
  const { content } = useClinicData();

  return (
    <section
      id="the-vaid"
      className="min-h-[100svh] py-20 sm:py-24 bg-[#F4EFE2] text-[#12201A] flex items-center"
    >
      <div className="max-w-[1200px] w-full mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left: Portrait in Straight Rounded Frame (no caption below picture) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl overflow-hidden border border-[#12201A]/15 bg-[#FAF7EF] aspect-[3/4] max-w-[440px] mx-auto">
            <SlotImage
              slotId="portrait"
              fallbackSrc={DATA.photos.vaidPortrait}
              fallbackAlt="Documentary portrait representing Vaid Dr. Jashan Sandhu in clinic"
              width={1200}
              height={1500}
              sizes="(max-width: 1024px) 100vw, 440px"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right: Heading, 3 Plain Boxed Facts, One Small Caveat Hand Note */}
        <div className="lg:col-span-7 space-y-6">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">वैद्य जी</p>

          <h2 className="font-serif t-44 font-medium text-[#12201A]">
            Old-generation healing,{' '}
            <span className="italic text-[#3E7A4A]">only Ayurvedic medicine.</span>
          </h2>

          <p className="t-16 text-[#12201A]/85 max-w-xl">
            At {content.clinicName}, {content.doctorName} practices an unhurried, family-style approach to Ayurveda—balancing life naturally through pulse reading, pure herbs, and practical food wisdom.
          </p>

          {/* 3 Plain Boxed Facts */}
          <div className="flex flex-wrap gap-3 pt-2">
            <span className="px-4 py-2.5 rounded-2xl bg-[#FAF7EF] border border-[#12201A]/18 t-14 font-bold text-[#12201A]">
              {content.degree}
            </span>
            <span className="px-4 py-2.5 rounded-2xl bg-[#FAF7EF] border border-[#12201A]/18 t-14 font-bold text-[#12201A]">
              {content.yearsInPractice}
            </span>
            <span className="px-4 py-2.5 rounded-2xl bg-[#FAF7EF] border border-[#12201A]/18 t-14 font-bold text-[#0E3B26]">
              Only Ayurvedic medicine
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-6">
            <a href="#book" className="btn-primary">
              <span>Book a consultation</span>
            </a>
            <span className="font-hand text-[28px] leading-none text-[#3E7A4A] -rotate-2">
              Talk to Vaid ji.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
