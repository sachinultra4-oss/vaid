import React, { Suspense, lazy, useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import type { AuthSession } from './admin/AdminAuthScreen';
import { AdminAccessModal } from './components/AdminAccessModal';
import { BodyMapTool } from './components/BodyMapTool';
import { BodyTypeQuiz } from './components/BodyTypeQuiz';
import { CareProcess3D } from './components/CareProcess3D';
import { ConsentBanner } from './components/ConsentBanner';
import { BookSection, FooterSection, QuestionsSection } from './components/FaqAndBook';
import { HerbsTunnel3D } from './components/HerbsTunnel3D';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { PatientStoriesSection, ReelsSection } from './components/ReelsAndStories';
import { TheVaidSection } from './components/TheVaidSection';
import { TreatmentsGrid } from './components/TreatmentsGrid';
import { ClinicProvider, formatPhoneWhatsApp, useClinicData } from './context/ClinicContext';
import { submitPublicInquiry, tracker } from './utils/tracker';

const AdminDashboard = lazy(() =>
  import('./admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const PrivacyPage = lazy(() =>
  import('./components/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);

function PublicClinicSite({
  onNavigatePrivacy,
  onOpenAdmin,
}: {
  onNavigatePrivacy: () => void;
  onOpenAdmin: () => void;
}) {
  const { content } = useClinicData();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docH > 0 ? window.scrollY / docH : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const stopTracking = tracker.init();
    return () => stopTracking();
  }, []);

  const primaryPhone = content.phones[0] || {
    display: '62846-64722',
    tel: '+916284664722',
    whatsapp: '916284664722',
  };

  return (
    <div className="min-h-screen bg-[#F4EFE2] text-[#12201A]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-[#0E3B26] focus:text-[#F4EFE2] focus:font-bold"
      >
        Skip to main content
      </a>

      <Navbar scrollProgress={scrollProgress} onOpenAdmin={onOpenAdmin} />

      <main id="main-content">
        <HeroSection />
        <TreatmentsGrid />
        <BodyMapTool />
        <CareProcess3D />
        <TheVaidSection />
        <HerbsTunnel3D />
        <BodyTypeQuiz />
        <ReelsSection />
        <PatientStoriesSection />
        <QuestionsSection />
        <BookSection />
      </main>

      <FooterSection onNavigatePrivacy={onNavigatePrivacy} onOpenAdmin={onOpenAdmin} />

      {/* Mobile Floating WhatsApp + Call Buttons */}
      <div
        className="md:hidden fixed right-4 z-40 flex items-center gap-2.5"
        style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        aria-label="Quick contact actions"
      >
        <a
          href={`tel:${primaryPhone.tel}`}
          aria-label={`Call ${primaryPhone.display}`}
          onClick={() => tracker.track('call_tap', 'floating_bar', primaryPhone.display)}
          className="w-12 h-12 rounded-full bg-[#0E3B26] text-[#F4EFE2] border border-[#C9A24B]/40 flex items-center justify-center shadow-lg"
        >
          <Phone className="w-5 h-5" aria-hidden="true" />
        </a>
        <a
          href={formatPhoneWhatsApp(
            primaryPhone,
            'Namaste Vaid Dr. Jashan Sandhu, I would like to ask about a consultation.'
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Message on WhatsApp"
          onClick={() => {
            tracker.track('whatsapp_tap', 'floating_bar', 'Floating WhatsApp');
            submitPublicInquiry({
              patient_name: 'WhatsApp Visitor',
              patient_phone: '',
              concern: 'General consultation',
              channel: 'whatsapp_tap',
            });
          }}
          className="w-12 h-12 rounded-full bg-[#3E7A4A] text-[#F4EFE2] border border-[#F4EFE2]/30 flex items-center justify-center shadow-lg"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
        </a>
      </div>

      <ConsentBanner onNavigatePrivacy={onNavigatePrivacy} />
    </div>
  );
}

function AppRouter() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [adminSession, setAdminSession] = useState<AuthSession | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPathname(to);
      window.scrollTo({ top: 0 });
    }
  };

  const handleOpenAdmin = () => {
    if (adminSession && adminSession.exp > Date.now()) {
      navigate('/admin');
    } else {
      setAdminModalOpen(true);
    }
  };

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F4EFE2]" />}>
        <AdminDashboard
          onNavigatePublic={() => navigate('/')}
          session={adminSession}
          onSessionChange={setAdminSession}
        />
      </Suspense>
    );
  }

  if (pathname.startsWith('/privacy')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F4EFE2]" />}>
        <PrivacyPage onBack={() => navigate('/')} />
      </Suspense>
    );
  }

  return (
    <>
      <PublicClinicSite
        onNavigatePrivacy={() => navigate('/privacy')}
        onOpenAdmin={handleOpenAdmin}
      />
      <AdminAccessModal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onAuthenticated={(session) => {
          setAdminSession(session);
          setAdminModalOpen(false);
          navigate('/admin');
        }}
        onOpenFullAuth={() => navigate('/admin')}
      />
    </>
  );
}

export default function App() {
  return (
    <ClinicProvider>
      <AppRouter />
    </ClinicProvider>
  );
}
