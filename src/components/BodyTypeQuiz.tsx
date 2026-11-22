import React, { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { formatPhoneWhatsApp, useClinicData } from '../context/ClinicContext';
import { submitPublicInquiry, tracker } from '../utils/tracker';

export function BodyTypeQuiz() {
  const { content } = useClinicData();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Array<'Vata' | 'Pitta' | 'Kapha' | null>>(
    Array(DATA.quizQuestions.length).fill(null)
  );
  const [completed, setCompleted] = useState(false);
  const startedRef = useRef(false);

  const primaryPhone = content.phones[0] || DATA.phones[0];
  const currentQuestion = DATA.quizQuestions[step];
  const progressPercent = completed
    ? 100
    : Math.round(((step + 1) / DATA.quizQuestions.length) * 100);

  const computeDoshaFrom = (list: Array<'Vata' | 'Pitta' | 'Kapha' | null>): 'Vata' | 'Pitta' | 'Kapha' => {
    const counts = { Vata: 0, Pitta: 0, Kapha: 0 };
    list.forEach((a) => {
      if (a) counts[a] += 1;
    });
    if (counts.Pitta >= counts.Vata && counts.Pitta >= counts.Kapha) return 'Pitta';
    if (counts.Kapha >= counts.Vata && counts.Kapha >= counts.Pitta) return 'Kapha';
    return 'Vata';
  };

  const selectOption = (dosha: 'Vata' | 'Pitta' | 'Kapha') => {
    if (!startedRef.current) {
      startedRef.current = true;
      tracker.track('quiz_start', 'body-type', 'Started Quiz');
    }

    const next = [...answers];
    next[step] = dosha;
    setAnswers(next);

    if (step < DATA.quizQuestions.length - 1) {
      setStep(step + 1);
    } else {
      const finalDosha = computeDoshaFrom(next);
      setCompleted(true);
      tracker.track('quiz_complete', 'body-type', finalDosha);
    }
  };

  const resetQuiz = () => {
    startedRef.current = false;
    setStep(0);
    setAnswers(Array(DATA.quizQuestions.length).fill(null));
    setCompleted(false);
  };

  const resultDosha = computeDoshaFrom(answers);
  const whatsappUrl = formatPhoneWhatsApp(
    primaryPhone,
    `Namaste Vaid Dr. Jashan Sandhu, I tried the Body Type guide on your website.\nMy result leaned toward: ${resultDosha}.\nPlease guide me on a personal consultation.`
  );

  return (
    <section
      id="body-type"
      className="min-h-[100svh] py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 flex items-center"
    >
      <div className="max-w-[1200px] w-full mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">प्रकृति परिचय</p>
          <h2 className="font-serif t-44 font-medium mt-1">Find your body type</h2>
          <p className="t-16 text-[#12201A]/80 mt-2">
            Five quick questions to explore your natural Ayurvedic tendency. A simple guide, not a diagnosis.
          </p>
        </div>

        <div className="clinic-card p-6 sm:p-10 max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm font-bold text-[#12201A]/75 mb-2">
              <span>
                {completed
                  ? 'Your Guide Summary'
                  : `Question ${step + 1} of ${DATA.quizQuestions.length} · ${currentQuestion.topic}`}
              </span>
              <span className="tabular-nums text-[#C9A24B]">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#12201A]/10 overflow-hidden">
              <div
                className="h-full bg-[#0E3B26] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {!completed ? (
            <div>
              <h3 className="font-serif t-28 font-medium text-[#12201A] mb-6">
                {currentQuestion.prompt}
              </h3>

              <div className="space-y-3">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => selectOption(opt.dosha)}
                    className="w-full min-h-[52px] px-5 py-3.5 rounded-2xl border border-[#12201A]/20 bg-[#F4EFE2]/60 hover:bg-[#0E3B26] hover:text-[#F4EFE2] hover:border-[#0E3B26] text-left text-base font-bold flex items-center justify-between gap-4 transition-colors cursor-pointer"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="mt-6 t-14 font-bold text-[#12201A]/70 hover:text-[#12201A] cursor-pointer min-h-[44px]"
                >
                  ← Previous question
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <p className="t-14 font-bold uppercase tracking-wider text-[#3E7A4A]">
                Primary Tendency
              </p>
              <h3 className="font-serif t-44 font-medium text-[#0E3B26]">{resultDosha}</h3>
              <p className="t-16 text-[#12201A]/85 max-w-xl">
                {DATA.doshaDescriptions[resultDosha]}
              </p>
              <p className="t-14 text-[#C46A3C] font-bold">
                A simple guide, not a diagnosis.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    tracker.track('whatsapp_tap', 'body-type', `Quiz ${resultDosha}`);
                    submitPublicInquiry({
                      patient_name: 'Body Type Quiz Visitor',
                      patient_phone: '',
                      quiz_dosha: resultDosha,
                      concern: `Body Type Guide (${resultDosha})`,
                      channel: 'quiz_whatsapp',
                    });
                  }}
                  className="btn-primary"
                >
                  <span>Send my answer to Vaid ji on WhatsApp</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </a>

                <button type="button" onClick={resetQuiz} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Try again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
