import fs from 'node:fs';
import path from 'node:path';
import type {
  AdSpendRecord,
  AdminUserRecord,
  ClinicPublicContent,
  ClinicSettingsAdmin,
  ContentVersionRecord,
  InquiryRecord,
  NotificationLogEntry,
  PhotoSlotRecord,
  SessionRecord,
  TrackingEventRecord,
  VisitorRecord,
} from '../src/types/clinic.ts';

export interface DatabaseState {
  admins: AdminUserRecord[];
  photos: Record<string, PhotoSlotRecord>;
  content: ClinicPublicContent;
  contentVersions: ContentVersionRecord[];
  settings: ClinicSettingsAdmin;
  visitors: Record<string, VisitorRecord>;
  sessions: Record<string, SessionRecord>;
  events: TrackingEventRecord[];
  inquiries: InquiryRecord[];
  adSpend: AdSpendRecord[];
  notifications: NotificationLogEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'clinic-db.json');
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

function slot(
  slot_id: string,
  category: PhotoSlotRecord['category'],
  label: string,
  target_width: number,
  target_height: number,
  url: string,
  alt_text: string,
  is_standin: boolean
): PhotoSlotRecord {
  return {
    slot_id,
    category,
    label,
    target_width,
    target_height,
    url,
    url_480: '',
    url_960: '',
    url_1920: '',
    url_original: url,
    alt_text,
    focal_x: 50,
    focal_y: 50,
    has_patient_face: false,
    consent_given: true,
    is_published: true,
    is_standin,
    updated_at: new Date().toISOString(),
    previous_snapshot: null,
  };
}

export function createDefaultPhotos(): Record<string, PhotoSlotRecord> {
  const list: PhotoSlotRecord[] = [
    slot(
      'logo',
      'brand',
      'Clinic Emblem Logo (600x600)',
      600,
      600,
      '/assets/aistudio/747882622_18462579148112646_5609709282036442747_n.jpg_2bb6d326.jpeg',
      'Khushdil Ayurvedic Clinic emblem with Vaid Dr. Jashan Sandhu and golden mortar',
      false
    ),
    slot('og-image', 'brand', 'Social Share OG Image (1200x630)', 1200, 630, '', '', false),
    slot(
      'hero',
      'hero',
      'Hero Banner (2400x1400)',
      2400,
      1400,
      '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
      'Ayurvedic consultation desk with brass mortar, fresh herbs, and amber glass bottles',
      true
    ),
    slot(
      'portrait',
      'hero',
      'The Vaid Portrait (1200x1500)',
      1200,
      1500,
      '/src/assets/images/vaid_portrait_standin_1795261360995.jpg',
      'Documentary portrait representing Vaid Dr. Jashan Sandhu in clinic',
      true
    ),
    slot('clinic-front', 'clinic', 'Clinic Exterior Front (1600x1000)', 1600, 1000, '', '', false),
    slot('clinic-inside-1', 'clinic', 'Clinic Interior 1 (1600x1000)', 1600, 1000, '', '', false),
    slot('clinic-inside-2', 'clinic', 'Clinic Interior 2 (1600x1000)', 1600, 1000, '', '', false),
    slot('clinic-inside-3', 'clinic', 'Clinic Interior 3 (1600x1000)', 1600, 1000, '', '', false),
    slot('medicines-1', 'medicines', 'Medicines & Jars 1 (1400x1400)', 1400, 1400, '', '', false),
    slot('medicines-2', 'medicines', 'Medicines & Jars 2 (1400x1400)', 1400, 1400, '', '', false),
    slot('medicines-3', 'medicines', 'Medicines & Jars 3 (1400x1400)', 1400, 1400, '', '', false),

    slot(
      'treat-joints',
      'treatments',
      'Treatment: Joint Care (1200x900)',
      1200,
      900,
      '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      'Brass bowl of warm herbal sesame oil with fresh neem leaves',
      true
    ),
    slot(
      'treat-digestion',
      'treatments',
      'Treatment: Digestion (1200x900)',
      1200,
      900,
      '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      'Terracotta cup of warm herbal infusion beside cardamom and cinnamon',
      true
    ),
    slot(
      'treat-weight',
      'treatments',
      'Treatment: Weight Balance (1200x900)',
      1200,
      900,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Whole Ayurvedic roots, turmeric, and amla in brass bowls on stone',
      true
    ),
    slot(
      'treat-sugar',
      'treatments',
      'Treatment: Sugar Balance (1200x900)',
      1200,
      900,
      '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      'Amber glass apothecary bottles on forest green clinic shelves',
      true
    ),
    slot(
      'treat-skin',
      'treatments',
      'Treatment: Skin Care (1200x900)',
      1200,
      900,
      '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      'Neem leaves and herbal oil prepared for skin nourishment',
      true
    ),
    slot(
      'treat-hair',
      'treatments',
      'Treatment: Hair Care (1200x900)',
      1200,
      900,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Amla and whole botanicals arranged on travertine stone',
      true
    ),
    slot(
      'treat-women',
      'treatments',
      'Treatment: Women’s Wellness (1200x900)',
      1200,
      900,
      '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      'Warm herbal decoction with fresh tulsi sprigs on linen',
      true
    ),
    slot(
      'treat-sleep',
      'treatments',
      'Treatment: Sleep & Stress (1200x900)',
      1200,
      900,
      '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      'Traditional herbal jars and brass measuring spoons in soft daylight',
      true
    ),

    slot(
      'plate-1',
      'process',
      'Care Step 01: Pulse Check (1000x1300)',
      1000,
      1300,
      '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
      'Ayurvedic Vaid consultation desk with brass mortar and handwritten notes',
      true
    ),
    slot(
      'plate-2',
      'process',
      'Care Step 02: Root Cause (1000x1300)',
      1000,
      1300,
      '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      'Traditional apothecary shelves with labeled amber glass bottles',
      true
    ),
    slot(
      'plate-3',
      'process',
      'Care Step 03: Natural Plan (1000x1300)',
      1000,
      1300,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Whole dried ashwagandha, turmeric roots, and amla in brass bowls',
      true
    ),
    slot(
      'plate-4',
      'process',
      'Care Step 04: Food & Routine (1000x1300)',
      1000,
      1300,
      '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      'Clay cup of warm herbal infusion with cardamom and tulsi leaves',
      true
    ),
    slot(
      'plate-5',
      'process',
      'Care Step 05: Follow-Up (1000x1300)',
      1000,
      1300,
      '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      'Hammered brass bowl of golden herbal oil and cream linen cloth',
      true
    ),

    slot(
      'herb-ashwagandha',
      'herbs',
      'Herb: Ashwagandha (1200x1200)',
      1200,
      1200,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Dried Ashwagandha roots on natural travertine stone',
      true
    ),
    slot(
      'herb-neem',
      'herbs',
      'Herb: Neem (1200x1200)',
      1200,
      1200,
      '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      'Fresh green neem leaves beside warm herbal oil',
      true
    ),
    slot(
      'herb-tulsi',
      'herbs',
      'Herb: Tulsi (1200x1200)',
      1200,
      1200,
      '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      'Fresh tulsi sprigs beside a terracotta cup of herbal decoction',
      true
    ),
    slot(
      'herb-giloy',
      'herbs',
      'Herb: Giloy (1200x1200)',
      1200,
      1200,
      '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      'Guduchi and classical herbal jars on clinic wood shelves',
      true
    ),
    slot(
      'herb-turmeric',
      'herbs',
      'Herb: Turmeric (1200x1200)',
      1200,
      1200,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Fresh cut turmeric rhizomes in soft natural daylight',
      true
    ),
    slot(
      'herb-amla',
      'herbs',
      'Herb: Amla (1200x1200)',
      1200,
      1200,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Dried amla fruits in an antique brass bowl',
      true
    ),

    slot(
      'reel-1',
      'reels',
      'Reel 1 Poster (720x1280)',
      720,
      1280,
      '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      'Whole herbs and Bhasmas clinic shelf reel poster',
      true
    ),
    slot(
      'reel-2',
      'reels',
      'Reel 2 Poster (720x1280)',
      720,
      1280,
      '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      'Herbal formulations and courier care reel poster',
      true
    ),
    slot(
      'reel-3',
      'reels',
      'Reel 3 Poster (720x1280)',
      720,
      1280,
      '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
      'Inside Khushdil Ayurvedic Clinic consultation room poster',
      true
    ),
    slot(
      'reel-4',
      'reels',
      'Reel 4 Poster (720x1280)',
      720,
      1280,
      '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      'Traditional vitality herbs and daily guidance poster',
      true
    ),
    slot(
      'reel-5',
      'reels',
      'Reel 5 Poster (720x1280)',
      720,
      1280,
      '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      'Patient visit and strength guidance reel poster',
      true
    ),
  ];

  const map: Record<string, PhotoSlotRecord> = {};
  for (const item of list) {
    map[item.slot_id] = item;
  }
  return map;
}

export function createDefaultContent(): ClinicPublicContent {
  return {
    clinicName: 'Khushdil Ayurvedic Clinic',
    doctorName: 'Vaid Dr. Jashan Sandhu',
    shortDoctor: 'Vaid Jashan Sandhu',
    instagramHandle: '@vaid.jashansandhu',
    instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
    instagramFollowers: '13K+',
    phones: [
      { display: '62846-64722', tel: '+916284664722', whatsapp: '916284664722' },
      { display: '78889-49756', tel: '+917888949756', whatsapp: '917888949756' },
    ],
    degree: '[B.A.M.S. / Degree Placeholder]',
    yearsInPractice: '[Years in Practice Placeholder]',
    streetAndDistrict: '[Street & District Placeholder, Punjab]',
    timings: '[Clinic Timings Placeholder]',
    standInCredit:
      'Editorial clinic, portrait, and herbal photographs shown here are temporary stand-ins until real clinic photography is supplied by Dr. Jashan Sandhu.',
    treatments: [
      {
        id: 'joint-care',
        slot_id: 'treat-joints',
        title: 'Joint Care',
        hindi: 'जोड़ों की देखभाल',
        softLine: '[Placeholder: Gentle herbal support and oil guidance for stiffness and daily joint comfort.]',
      },
      {
        id: 'digestion',
        slot_id: 'treat-digestion',
        title: 'Digestion',
        hindi: 'पाचन संतुलन',
        softLine: '[Placeholder: Classical digestive herbs and meal-timing guidance for gas, acidity, and gut comfort.]',
      },
      {
        id: 'weight-balance',
        slot_id: 'treat-weight',
        title: 'Weight Balance',
        hindi: 'वज़न संतुलन',
        softLine: '[Placeholder: Individualized metabolic herbs paired with realistic daily food habits.]',
      },
      {
        id: 'sugar-balance',
        slot_id: 'treat-sugar',
        title: 'Sugar Balance',
        hindi: 'शुगर देखभाल',
        softLine: '[Placeholder: Traditional botanical support alongside regular checkups and your physician’s advice.]',
      },
      {
        id: 'skin',
        slot_id: 'treat-skin',
        title: 'Skin',
        hindi: 'त्वचा देखभाल',
        softLine: '[Placeholder: Cooling internal herbs and gentle routine care for recurring skin sensitivity.]',
      },
      {
        id: 'hair',
        slot_id: 'treat-hair',
        title: 'Hair',
        hindi: 'बालों की देखभाल',
        softLine: '[Placeholder: Scalp-nourishing herbal oils and nutritional care for hair strength.]',
      },
      {
        id: 'womens-wellness',
        slot_id: 'treat-women',
        title: "Women's Wellness",
        hindi: 'महिला स्वास्थ्य',
        softLine: '[Placeholder: Private, unhurried Ayurvedic guidance for cyclical comfort and vitality.]',
      },
      {
        id: 'sleep-stress',
        slot_id: 'treat-sleep',
        title: 'Sleep & Stress',
        hindi: 'नींद और तनाव',
        softLine: '[Placeholder: Calming herbs and evening wind-down routines to support restful nights.]',
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        quote: '[Real review here]',
        name: '[Patient name]',
        detail: '[Concern / District Placeholder]',
        consent_given: false,
        is_published: true,
      },
      {
        id: 'rev-2',
        quote: '[Real review here]',
        name: '[Patient name]',
        detail: '[Concern / District Placeholder]',
        consent_given: false,
        is_published: true,
      },
      {
        id: 'rev-3',
        quote: '[Real review here]',
        name: '[Patient name]',
        detail: '[Concern / District Placeholder]',
        consent_given: false,
        is_published: true,
      },
    ],
    faqs: [
      {
        id: 'faq-1',
        question: 'Is the medicine only Ayurvedic?',
        answer:
          '[Placeholder: Yes. Khushdil Ayurvedic Clinic works strictly with classical Ayurvedic herbal formulations, powders, decoctions, and oils—never synthetic steroids or hidden chemicals.]',
        is_published: true,
      },
      {
        id: 'faq-2',
        question: 'How does the first visit work?',
        answer:
          '[Placeholder: Vaid Dr. Jashan Sandhu begins with Nadi Pariksha (pulse reading) or a structured online history talk covering digestion, sleep, daily meals, and symptoms before suggesting a plan.]',
        is_published: true,
      },
      {
        id: 'faq-3',
        question: 'Should I bring old reports?',
        answer:
          '[Placeholder: Yes, bringing recent blood tests, scans, or prescriptions helps Vaid ji understand your complete health picture before offering guidance.]',
        is_published: true,
      },
      {
        id: 'faq-4',
        question: 'Can I consult online?',
        answer:
          '[Placeholder: Yes. Online phone and WhatsApp video consultations are available, with clear dosage instructions and courier dispatch arranged if needed.]',
        is_published: true,
      },
      {
        id: 'faq-5',
        question: 'How long does care usually take?',
        answer:
          '[Placeholder: Ayurveda supports steady root-level balance rather than overnight masking. Timelines depend on your age, digestion, and how long symptoms have been present.]',
        is_published: true,
      },
      {
        id: 'faq-6',
        question: 'Is it safe with my current tablets?',
        answer:
          '[Placeholder: Please tell Vaid ji about every medicine you take. Sharing your current prescriptions allows herbs and meal guidance to be planned safely alongside your doctor’s care.]',
        is_published: true,
      },
    ],
    reels: [
      {
        id: 'reel-1',
        slot_id: 'reel-1',
        title: 'Whole Herbs & Classical Formulations',
        videoUrl:
          '/assets/aistudio/AQMA_-_5_Yo18v10902s62QS4rbv2JoI8_ZKQ1q4GQpLPJ_Ljcw4KExT3-Rvk7VpT89RYVcyefHD0IFknZyFhcWxowQs-_Y4_26b220a3.mp4',
        instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
      },
      {
        id: 'reel-2',
        slot_id: 'reel-2',
        title: 'Herbal Combo Care & Courier Dispatch',
        videoUrl:
          '/assets/aistudio/AQMHVdNt1X2YiifOW-JngxOCDMdoM89NnFykXTxMdv-29MwjpfhkAQ04Yr8u3rSSDxsXZDDcqj2got6zG8OHk0CkMiqKCat-_94cacfbc.mp4',
        instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
      },
      {
        id: 'reel-3',
        slot_id: 'reel-3',
        title: 'Inside Khushdil Ayurvedic Clinic',
        videoUrl:
          '/assets/aistudio/AQNhH0YoEy2muVVBO8od8E8wR_bP6znSMGynmsy2HaXBqawzzDr3t2yywPvfiAVHlJJUd2usSGeDJcJNPordXPXhbuG9esG1_e0c6bbde.mp4',
        instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
      },
      {
        id: 'reel-4',
        slot_id: 'reel-4',
        title: 'Natural Strength & Old-Generation Wisdom',
        videoUrl:
          '/assets/aistudio/AQOItAwV4KHo6va8EXtCP8pSWGmIvzM7MEKyZG8VF-_mGl62ra7lq5lg2y3G0Y4ln1M7RMKrUi27SdGy7nXH6z6h3hVRmkb9_df85cf82.mp4',
        instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
      },
      {
        id: 'reel-5',
        slot_id: 'reel-5',
        title: 'Clinic Visit & Real Guidance',
        videoUrl:
          '/assets/aistudio/AQPIitXYUWG9wckqkXe9Ot2Pfr3RGoWTF_DgB6sGOH-yjllLHlXDcaEQweRdirgqU0BUj4pKpjXznREZ9V7nfPuU9IsseOvq_3ae41630.mp4',
        instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
      },
    ],
  };
}

export function createDefaultSettings(): ClinicSettingsAdmin {
  return {
    metaPixelId: '',
    ga4Id: '',
    cookieBannerText:
      'We use simple website analytics to improve clinic visits and optional marketing pixels only if you accept.',
    privacySummary:
      'Khushdil Ayurvedic Clinic stores website visit stats for up to 14 months and consultation inquiries for up to 24 months. Health details are visible only to authorized clinic staff and are never shared with ad networks.',
    ownerEmail: 'owner@khushdilclinic.in',
    dailySummaryTime: '20:00',
    dailySummaryEnabled: true,
    instantAlertEnabled: true,
  };
}

class ClinicStore {
  private state: DatabaseState;

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    this.state = this.load();
  }

  private load(): DatabaseState {
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        const defaultsPhotos = createDefaultPhotos();
        const mergedPhotos: Record<string, PhotoSlotRecord> = { ...defaultsPhotos };
        if (parsed.photos) {
          for (const [k, v] of Object.entries(parsed.photos)) {
            if (v && typeof v === 'object') {
              mergedPhotos[k] = v;
            }
          }
        }
        return {
          admins: Array.isArray(parsed.admins) ? parsed.admins : [],
          photos: mergedPhotos,
          content: parsed.content ? parsed.content : createDefaultContent(),
          contentVersions: Array.isArray(parsed.contentVersions) ? parsed.contentVersions : [],
          settings: parsed.settings ? { ...createDefaultSettings(), ...parsed.settings } : createDefaultSettings(),
          visitors: parsed.visitors || {},
          sessions: parsed.sessions || {},
          events: Array.isArray(parsed.events) ? parsed.events : [],
          inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
          adSpend: Array.isArray(parsed.adSpend) ? parsed.adSpend : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        };
      } catch {
        // Fall through to clean initialization if corrupted
      }
    }

    const fresh: DatabaseState = {
      admins: [],
      photos: createDefaultPhotos(),
      content: createDefaultContent(),
      contentVersions: [],
      settings: createDefaultSettings(),
      visitors: {},
      sessions: {},
      events: [],
      inquiries: [],
      adSpend: [],
      notifications: [],
    };
    this.saveState(fresh);
    return fresh;
  }

  private saveState(target: DatabaseState = this.state): void {
    const tmp = `${DB_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(target, null, 2), 'utf8');
    fs.renameSync(tmp, DB_PATH);
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public save(): void {
    // Keep bounded event log in file store (retention cap 14 months / max 50,000 events)
    const fourteenMonthsAgo = Date.now() - 425 * 24 * 60 * 60 * 1000;
    if (this.state.events.length > 25000) {
      this.state.events = this.state.events
        .filter((e) => new Date(e.created_at).getTime() >= fourteenMonthsAgo)
        .slice(-25000);
    }
    if (this.state.notifications.length > 200) {
      this.state.notifications = this.state.notifications.slice(-200);
    }
    this.saveState();
  }
}

export const store = new ClinicStore();
