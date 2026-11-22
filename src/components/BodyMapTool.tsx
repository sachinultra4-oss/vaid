import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { formatPhoneWhatsApp, useClinicData } from '../context/ClinicContext';
import { submitPublicInquiry, tracker } from '../utils/tracker';

export function BodyMapTool() {
  const { content } = useClinicData();
  const [activeId, setActiveId] = useState<string>(DATA.bodyHotspots[0].id);
  const activeSpot =
    DATA.bodyHotspots.find((h) => h.id === activeId) || DATA.bodyHotspots[0];
  const primaryPhone = content.phones[0] || DATA.phones[0];

  const selectHotspot = (spotId: string, label: string) => {
    setActiveId(spotId);
    tracker.track('bodymap_hotspot', 'body-map', label);
  };

  return (
    <section
      id="body-map"
      className="min-h-[100svh] py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 flex items-center"
    >
      <div className="max-w-[1200px] w-full mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">शरीर मानचित्र</p>
          <h2 className="font-serif t-44 font-medium mt-1">Where it troubles you</h2>
          <p className="t-16 text-[#12201A]/80 mt-2">
            Select any point on the body map to read how Ayurvedic care supports that area.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Centered Line-Art Body SVG with 6 Clay Hotspots */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[300px] aspect-[280/440] bg-[#FAF7EF] border border-[#12201A]/14 rounded-2xl p-4">
              <svg
                viewBox="0 0 280 440"
                className="w-full h-full"
                fill="none"
                role="img"
                aria-label="Interactive human body care map"
              >
                <circle cx="140" cy="54" r="24" stroke="#12201A" strokeOpacity="0.45" strokeWidth="1.6" />
                <path
                  d="M126 78 V94 C104 98, 86 112, 76 142 L58 214 C56 222, 66 226, 70 218 L90 156 L96 228 L88 396 C88 404, 100 406, 102 396 L132 252 H148 L178 396 C180 406, 192 404, 192 396 L184 228 L190 156 L210 218 C214 226, 224 222, 222 214 L204 142 C194 112, 176 98, 154 94 V78"
                  stroke="#12201A"
                  strokeOpacity="0.45"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="140"
                  y1="88"
                  x2="140"
                  y2="245"
                  stroke="#C9A24B"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {DATA.bodyHotspots.map((spot) => {
                  const selected = spot.id === activeId;
                  return (
                    <g key={spot.id}>
                      {selected && (
                        <circle
                          cx={spot.x}
                          cy={spot.y}
                          r="18"
                          stroke="#C46A3C"
                          strokeWidth="1.5"
                          fill="#C46A3C"
                          fillOpacity="0.14"
                        />
                      )}
                      <circle
                        cx={spot.x}
                        cy={spot.y}
                        r="10"
                        fill={selected ? '#0E3B26' : '#C46A3C'}
                        stroke="#FAF7EF"
                        strokeWidth="2.5"
                      />
                    </g>
                  );
                })}
              </svg>

              {DATA.bodyHotspots.map((spot) => {
                const selected = spot.id === activeId;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    aria-label={`${spot.label} (${spot.hindi})`}
                    aria-pressed={selected}
                    onClick={() => selectHotspot(spot.id, spot.label)}
                    style={{
                      left: `${(spot.x / 280) * 100}%`,
                      top: `${(spot.y / 440) * 100}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-transparent cursor-pointer"
                  />
                );
              })}
            </div>
          </div>

          {/* Right Detail Panel */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Body care areas">
              {DATA.bodyHotspots.map((spot) => {
                const selected = spot.id === activeId;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectHotspot(spot.id, spot.label)}
                    className={`px-4 py-2 min-h-[44px] rounded-full text-sm font-bold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                        : 'bg-[#FAF7EF] text-[#12201A] border-[#12201A]/20 hover:border-[#C46A3C]'
                    }`}
                  >
                    {spot.label}
                  </button>
                );
              })}
            </div>

            <div
              key={activeSpot.id}
              className="clinic-card p-6 sm:p-8 transition-transform duration-300 ease-out"
            >
              <p className="font-hindi t-14 text-[#C46A3C] font-bold">{activeSpot.hindi}</p>
              <h3 className="font-serif t-28 font-medium text-[#12201A] mt-1">
                {activeSpot.label}
              </h3>
              <p className="t-16 text-[#12201A]/85 mt-3">{activeSpot.description}</p>

              <div className="mt-6 pt-5 border-t border-[#12201A]/10">
                <a
                  href={formatPhoneWhatsApp(
                    primaryPhone,
                    `Namaste Vaid Dr. Jashan Sandhu, I would like to ask about ${activeSpot.label} (${activeSpot.hindi}).`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    tracker.track('whatsapp_tap', 'body-map', activeSpot.label);
                    submitPublicInquiry({
                      patient_name: 'WhatsApp Visitor',
                      patient_phone: '',
                      concern: activeSpot.label,
                      channel: 'whatsapp_tap',
                    });
                  }}
                  className="btn-primary"
                >
                  <span>Ask on WhatsApp</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
