import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { SlotImage, formatPhoneWhatsApp, useClinicData } from '../context/ClinicContext';
import { submitPublicInquiry, tracker } from '../utils/tracker';

export function TreatmentsGrid() {
  const { content } = useClinicData();
  const primaryPhone = content.phones[0] || DATA.phones[0];

  return (
    <section
      id="treatments"
      className="min-h-[100svh] py-20 sm:py-24 bg-[#F4EFE2] text-[#12201A]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-12">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">उपचार क्षेत्र</p>
          <h2 className="font-serif t-44 font-medium mt-1">What we treat</h2>
          <p className="t-16 text-[#12201A]/80 mt-3">
            Personal, classical Ayurvedic support tailored to your body type and daily routine.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {content.treatments.map((item, idx) => {
            const fallbackItem = DATA.treatments[idx];
            return (
              <article key={item.id} className="clinic-card flex flex-col justify-between">
                <div>
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#E5DEC9]">
                    <SlotImage
                      slotId={item.slot_id}
                      fallbackSrc={fallbackItem?.image || ''}
                      fallbackAlt={fallbackItem?.alt || item.title}
                      width={1200}
                      height={900}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="card-photo w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <p className="font-hindi t-14 text-[#3E7A4A]">{item.hindi}</p>
                    <h3 className="font-serif t-20 font-semibold text-[#12201A] mt-1">
                      {item.title}
                    </h3>
                    <p className="t-14 text-[#12201A]/75 mt-2">{item.softLine}</p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2">
                  <a
                    href={formatPhoneWhatsApp(
                      primaryPhone,
                      `Namaste Vaid Dr. Jashan Sandhu, I would like guidance regarding ${item.title} (${item.hindi}).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      tracker.track('treatment_click', 'treatments', item.title);
                      tracker.track('whatsapp_tap', 'treatments', item.title);
                      submitPublicInquiry({
                        patient_name: 'WhatsApp Visitor',
                        patient_phone: '',
                        concern: item.title,
                        channel: 'whatsapp_tap',
                      });
                    }}
                    className="draw-link t-14"
                  >
                    <span>Ask on WhatsApp</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
