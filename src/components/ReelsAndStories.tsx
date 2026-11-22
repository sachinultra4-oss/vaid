import React, { useState } from 'react';
import { ArrowUpRight, Instagram, Pause, Play, Quote, Volume2, VolumeX } from 'lucide-react';
import { DATA } from '../data/clinicData';
import { SlotImage, useClinicData } from '../context/ClinicContext';
import { tracker } from '../utils/tracker';

export function ReelsSection() {
  const { content } = useClinicData();
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [unmutedId, setUnmutedId] = useState<string | null>(null);

  return (
    <section
      id="reels"
      className="py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 text-[#12201A]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="font-hindi t-14 text-[#3E7A4A] font-bold">इंस्टाग्राम रील्स</p>
            <h2 className="font-serif t-44 font-medium mt-1">Reels</h2>
          </div>

          <a
            href={content.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => tracker.track('instagram_tap', 'reels', content.instagramHandle)}
            className="btn-secondary"
          >
            <Instagram className="w-4 h-4" aria-hidden="true" />
            <span>Follow {content.instagramHandle}</span>
          </a>
        </div>

        {/* Straight Equal Row of 5 Vertical Reel Cards (muted by default, real MP4 videos) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {content.reels.map((reel, idx) => {
            const isPlaying = activeReelId === reel.id;
            const isUnmuted = unmutedId === reel.id;
            const fallbackPoster = DATA.reels[idx]?.poster || '';

            return (
              <div key={reel.id} className="clinic-card relative aspect-[9/16] bg-[#0E3B26]">
                {reel.videoUrl && isPlaying ? (
                  <video
                    src={reel.videoUrl}
                    muted={!isUnmuted}
                    playsInline
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <SlotImage
                    slotId={reel.slot_id || reel.id}
                    fallbackSrc={fallbackPoster}
                    fallbackAlt={`${reel.title} video poster`}
                    width={720}
                    height={1280}
                    sizes="(max-width: 640px) 50vw, 240px"
                    className="card-photo w-full h-full object-cover"
                  />
                )}

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12201A]/88 via-transparent to-transparent"
                />

                <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
                  <p className="font-serif text-[16px] leading-snug text-[#F4EFE2]">
                    {reel.title}
                  </p>
                  {reel.videoUrl ? (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPlaying) {
                            tracker.track('reel_play', 'reels', reel.title);
                            setActiveReelId(reel.id);
                          } else {
                            setActiveReelId(null);
                            setUnmutedId(null);
                          }
                        }}
                        aria-label={isPlaying ? `Pause ${reel.title}` : `Play ${reel.title} muted`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F4EFE2] min-h-[44px] cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-[#C9A24B]" aria-hidden="true" />
                        ) : (
                          <Play className="w-4 h-4 text-[#C9A24B]" aria-hidden="true" />
                        )}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      {isPlaying && (
                        <button
                          type="button"
                          onClick={() => setUnmutedId(isUnmuted ? null : reel.id)}
                          aria-label={isUnmuted ? 'Mute reel audio' : 'Unmute reel audio'}
                          className="w-10 h-10 rounded-full bg-[#12201A]/60 border border-[#F4EFE2]/30 text-[#F4EFE2] flex items-center justify-center cursor-pointer"
                        >
                          {isUnmuted ? (
                            <Volume2 className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <VolumeX className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <a
                      href={reel.instagramUrl || content.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => tracker.track('reel_play', 'reels', reel.title)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C9A24B] min-h-[44px]"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>Watch on Instagram</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PatientStoriesSection() {
  const { content } = useClinicData();

  return (
    <section
      id="stories"
      className="py-20 sm:py-24 bg-[#F4EFE2] border-t border-[#12201A]/10 text-[#12201A]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-10">
          <p className="font-hindi t-14 text-[#3E7A4A] font-bold">रोगियों के अनुभव</p>
          <h2 className="font-serif t-44 font-medium mt-1">Patient stories</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.reviews.map((rev) => (
            <article key={rev.id} className="clinic-card p-6 sm:p-7 flex flex-col justify-between min-h-[220px]">
              <div>
                <Quote className="w-6 h-6 text-[#C9A24B] mb-4" aria-hidden="true" />
                <p className="font-serif t-20 text-[#12201A]">{rev.quote}</p>
              </div>
              <div className="pt-5 mt-6 border-t border-[#12201A]/10">
                <p className="t-14 font-bold text-[#12201A]">{rev.name}</p>
                <p className="t-14 text-[#12201A]/65">{rev.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
