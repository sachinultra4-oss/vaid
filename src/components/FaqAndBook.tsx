import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Lock, MapPin, MessageCircle, Phone, Plus } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { formatPhoneWhatsApp, useClinicData } from '../context/ClinicContext';
import { submitPublicInquiry, tracker } from '../utils/tracker';

export function QuestionsSection() {
  const { content } = useClinicData();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="questions"
      className="py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 text-[#12201A]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">सामान्य प्रश्न</p>
          <h2 className="font-serif t-44 font-medium mt-1">Questions</h2>
        </div>

        <div className="divide-y divide-[#12201A]/15 border-y border-[#12201A]/15 max-w-3xl">
          {content.faqs.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={item.id || item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    const next = isOpen ? null : idx;
                    setOpenIdx(next);
                    if (next !== null) {
                      tracker.track('faq_open', 'questions', item.question);
                    }
                  }}
                  className="w-full py-5 min-h-[56px] flex items-center justify-between gap-6 text-left cursor-pointer"
                >
                  <span className="font-serif t-20 font-medium text-[#12201A]">
                    {item.question}
                  </span>
                  <Plus
                    className={`w-5 h-5 shrink-0 text-[#0E3B26] transition-transform duration-200 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="t-16 text-[#12201A]/80 pb-5 pr-8">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function BookSection() {
  const { content } = useClinicData();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [concern, setConcern] = useState(content.treatments[0]?.title || 'Joint Care');
  const [duration, setDuration] = useState('1–6 months');
  const [visitMode, setVisitMode] = useState('Clinic visit');
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [sentUrl, setSentUrl] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const viewedRef = useRef(false);

  const primaryPhone = content.phones[0] || DATA.phones[0];

  useEffect(() => {
    const el = formRef.current;
    if (!el || viewedRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          tracker.track('form_view', 'book', 'Booking Form Viewed');
          tracker.track('form_step_1', 'book', 'Step 1');
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const validateStep1 = () => {
    const nextErr: { name?: string; phone?: string } = {};
    if (!name.trim()) nextErr.name = 'Please enter your name.';
    if (phone.replace(/\D/g, '').length < 10) {
      nextErr.phone = 'Please enter a valid 10-digit phone number.';
    }
    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      tracker.track('form_step_2', 'book', 'Step 2');
    } else if (step === 2) {
      setStep(3);
      tracker.track('form_step_3', 'book', 'Step 3');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    tracker.track('form_submit', 'book', 'Submitted');
    tracker.flush();

    await submitPublicInquiry({
      patient_name: name.trim(),
      patient_phone: phone.trim(),
      concern,
      duration,
      visit_mode: visitMode,
      preferred_time: preferredTime,
      channel: 'form',
    });

    const msg = `Namaste Vaid Dr. Jashan Sandhu,\nI would like to book a consultation at ${content.clinicName}.\nName: ${name.trim()}\nPhone: ${phone.trim()}\nConcern: ${concern}\nHow long: ${duration}\nVisit: ${visitMode}\nPreferred time: ${preferredTime}`;
    const url = formatPhoneWhatsApp(primaryPhone, msg);
    setSentUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section
      id="book"
      className="py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 text-[#12201A]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="font-hindi t-14 text-[#3E7A4A] font-bold">मुलाकात बुक करें</p>
            <h2 className="font-serif t-44 font-medium mt-1">Book a consultation</h2>
            <p className="t-16 text-[#12201A]/80 mt-3">
              Speak directly with {content.clinicName} or send your consultation details on WhatsApp.
            </p>
          </div>

          <div className="flex flex-col gap-3 items-start">
            {content.phones.map((p) => (
              <a
                key={p.display}
                href={`tel:${p.tel}`}
                onClick={() => tracker.track('call_tap', 'book', p.display)}
                className="btn-secondary"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>Call {p.display}</span>
              </a>
            ))}
            <a
              href={formatPhoneWhatsApp(
                primaryPhone,
                'Namaste Vaid Dr. Jashan Sandhu, I would like to book a consultation.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                tracker.track('whatsapp_tap', 'book', 'Direct WhatsApp');
                submitPublicInquiry({
                  patient_name: 'WhatsApp Visitor',
                  patient_phone: '',
                  concern: 'General consultation',
                  channel: 'whatsapp_tap',
                });
              }}
              className="btn-primary"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>Message on WhatsApp</span>
            </a>
          </div>

          <div className="pt-4 border-t border-[#12201A]/15 space-y-1.5 t-14 text-[#12201A]/80">
            <p className="flex items-start gap-2 font-bold text-[#12201A]">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#3E7A4A]" aria-hidden="true" />
              <span>{content.streetAndDistrict}</span>
            </p>
            <p className="pl-6">{content.timings}</p>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 clinic-card p-6 sm:p-8"
        >
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm font-bold text-[#12201A]/75 mb-2">
              <span>Step {step} of 3</span>
              <span className="tabular-nums text-[#C9A24B]">
                {step === 1 ? 'Your details' : step === 2 ? 'Health concern' : 'Visit preference'}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#12201A]/10 overflow-hidden">
              <div
                className="h-full bg-[#0E3B26] transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="book-name" className="block t-14 font-bold mb-1.5">
                  Name *
                </label>
                <input
                  id="book-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base text-[#12201A]"
                />
                {errors.name && (
                  <p role="alert" className="t-14 text-[#C46A3C] font-bold mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="book-phone" className="block t-14 font-bold mb-1.5">
                  Phone number *
                </label>
                <input
                  id="book-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#12201A]/25 bg-[#F4EFE2]/45 text-base text-[#12201A]"
                />
                {errors.phone && (
                  <p role="alert" className="t-14 text-[#C46A3C] font-bold mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="book-concern" className="block t-14 font-bold mb-1.5">
                  Concern
                </label>
                <select
                  id="book-concern"
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#12201A]/25 bg-[#FAF7EF] text-base text-[#12201A]"
                >
                  {content.treatments.map((t) => (
                    <option key={t.id} value={t.title}>
                      {t.title} ({t.hindi})
                    </option>
                  ))}
                  <option value="Other concern">Other concern</option>
                </select>
              </div>

              <div>
                <label htmlFor="book-duration" className="block t-14 font-bold mb-1.5">
                  How long
                </label>
                <select
                  id="book-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#12201A]/25 bg-[#FAF7EF] text-base text-[#12201A]"
                >
                  <option value="Less than 1 month">Less than 1 month</option>
                  <option value="1–6 months">1–6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <span className="block t-14 font-bold mb-2">Clinic or online</span>
                <div className="grid grid-cols-2 gap-3">
                  {['Clinic visit', 'Online call'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVisitMode(mode)}
                      className={`min-h-[46px] px-4 rounded-xl border font-bold text-base cursor-pointer ${
                        visitMode === mode
                          ? 'bg-[#0E3B26] text-[#F4EFE2] border-[#0E3B26]'
                          : 'bg-[#F4EFE2]/50 text-[#12201A] border-[#12201A]/25'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="book-time" className="block t-14 font-bold mb-1.5">
                  Preferred time
                </label>
                <select
                  id="book-time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full min-h-[46px] px-4 rounded-xl border border-[#12201A]/25 bg-[#FAF7EF] text-base text-[#12201A]"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((step - 1) as 1 | 2)} className="btn-secondary">
                Back
              </button>
            ) : (
              <span />
            )}

            {step < 3 ? (
              <button type="button" onClick={handleNext} className="btn-primary">
                <span>Next step</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" className="btn-primary">
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>Send on WhatsApp</span>
              </button>
            )}
          </div>

          {sentUrl && (
            <p className="mt-4 t-14 font-bold text-[#3E7A4A]">
              Saved & opening WhatsApp...{' '}
              <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="underline">
                Tap here if needed
              </a>
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export function FooterSection({
  onNavigatePrivacy,
  onOpenAdmin,
}: {
  onNavigatePrivacy: () => void;
  onOpenAdmin: () => void;
}) {
  const { content, hasStandInPhotos } = useClinicData();

  return (
    <footer className="bg-[#0E3B26] text-[#F4EFE2] pt-16 pb-24 md:pb-12">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-[#C9A24B]/30">
          <div className="md:col-span-5 space-y-2">
            <p className="font-serif t-28 font-medium">{content.clinicName}</p>
            <p className="t-16 text-[#F4EFE2]/80">
              {content.doctorName} · Ayurvedic: Balance Life Naturally
            </p>
            <p className="t-14 text-[#F4EFE2]/70">
              Old Generation Business · Only Ayurvedic Medicine
            </p>
          </div>

          <div className="md:col-span-3 space-y-2 t-14">
            <p className="font-bold text-[#C9A24B]">Sections</p>
            <div className="flex flex-col gap-1.5 items-start">
              <a href="#treatments" className="hover:text-[#C9A24B]">Treatments</a>
              <a href="#process" className="hover:text-[#C9A24B]">Process</a>
              <a href="#the-vaid" className="hover:text-[#C9A24B]">The Vaid</a>
              <a href="#reels" className="hover:text-[#C9A24B]">Reels</a>
              <a href="#book" className="hover:text-[#C9A24B]">Book</a>
              <button
                type="button"
                onClick={onNavigatePrivacy}
                className="hover:text-[#C9A24B] cursor-pointer text-left"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 hover:text-[#C9A24B] cursor-pointer text-left text-[#F4EFE2]/85"
              >
                <Lock className="w-3.5 h-3.5 text-[#C9A24B]" aria-hidden="true" />
                <span>Clinic Admin</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-2 t-14">
            <p className="font-bold text-[#C9A24B]">Direct Contact</p>
            <div className="flex flex-col gap-1.5">
              {content.phones.map((p) => (
                <a
                  key={p.display}
                  href={`tel:${p.tel}`}
                  onClick={() => tracker.track('call_tap', 'footer', p.display)}
                  className="hover:text-[#C9A24B]"
                >
                  +91 {p.display}
                </a>
              ))}
              <a
                href={content.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => tracker.track('instagram_tap', 'footer', content.instagramHandle)}
                className="hover:text-[#C9A24B]"
              >
                Instagram {content.instagramHandle}
              </a>
            </div>
          </div>
        </div>

        <div className="py-10 overflow-hidden">
          <p className="font-serif t-120 font-medium tracking-tight text-[#F4EFE2] text-center select-none">
            KHUSHDIL
          </p>
        </div>

        <div className="pt-6 border-t border-[#F4EFE2]/15 space-y-2 t-14 text-[#F4EFE2]/75 text-center md:text-left">
          <p>Results vary from person to person. Please consult before use.</p>
          {hasStandInPhotos && <p>{content.standInCredit}</p>}
        </div>
      </div>
    </footer>
  );
}
