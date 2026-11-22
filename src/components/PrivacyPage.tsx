import React from 'react';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { useClinicData } from '../context/ClinicContext';

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  const { content, settings } = useClinicData();

  return (
    <div className="min-h-screen bg-[#F4EFE2] text-[#12201A] py-12 px-5 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to {content.clinicName}</span>
        </button>

        <div className="clinic-card p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-3 text-[#0E3B26]">
            <ShieldCheck className="w-6 h-6 text-[#3E7A4A]" aria-hidden="true" />
            <span className="t-14 font-bold uppercase tracking-wider">Privacy & Data Notice</span>
          </div>

          <h1 className="font-serif t-44 font-medium text-[#12201A]">
            How {content.clinicName} handles your information
          </h1>

          <p className="t-16 text-[#12201A]/85">{settings.privacySummary}</p>

          <div className="space-y-4 pt-4 border-t border-[#12201A]/12 t-16 text-[#12201A]/85">
            <div>
              <h2 className="font-serif t-20 font-semibold text-[#12201A] mb-1">
                1. What we collect when you browse
              </h2>
              <p>
                We store a random browser identifier and general visit information (pages viewed, buttons tapped, approximate region, and referral source such as Instagram or Google). We do not use invasive device fingerprinting and never store your full IP address.
              </p>
            </div>

            <div>
              <h2 className="font-serif t-20 font-semibold text-[#12201A] mb-1">
                2. Consultation & health details
              </h2>
              <p>
                Your name, phone number, and health concern entered in the consultation form are accessible only to Vaid Dr. Jashan Sandhu and authorized clinic staff. Health concerns are never included in website analytics events or shared with external advertising pixels.
              </p>
            </div>

            <div>
              <h2 className="font-serif t-20 font-semibold text-[#12201A] mb-1">
                3. How long data is kept
              </h2>
              <p>
                Website analytics logs are retained for up to 14 months. Patient inquiry records are retained for up to 24 months so Vaid ji can review follow-ups accurately.
              </p>
            </div>

            <div>
              <h2 className="font-serif t-20 font-semibold text-[#12201A] mb-1">
                4. Request deletion of your data
              </h2>
              <p>
                You can request immediate removal of your consultation record at any time by calling or messaging our clinic numbers below:
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {content.phones.map((p) => (
                  <a key={p.display} href={`tel:${p.tel}`} className="btn-secondary">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    <span>+91 {p.display}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
