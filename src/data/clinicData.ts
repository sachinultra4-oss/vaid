export interface TreatmentCard {
  id: string;
  title: string;
  hindi: string;
  softLine: string;
  image: string;
  alt: string;
}

export interface BodyHotspot {
  id: string;
  label: string;
  hindi: string;
  x: number;
  y: number;
  description: string;
}

export interface CareStep {
  num: string;
  title: string;
  hindi: string;
  line1: string;
  line2: string;
  image: string;
  alt: string;
}

export interface HerbItem {
  id: string;
  name: string;
  hindi: string;
  traditionalUse: string;
  image: string;
  alt: string;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  prompt: string;
  options: {
    label: string;
    dosha: 'Vata' | 'Pitta' | 'Kapha';
  }[];
}

export interface ReelSlot {
  id: string;
  title: string;
  poster: string;
  videoUrl: string;
  alt: string;
}

export interface ReviewPlaceholder {
  id: string;
  quote: string;
  name: string;
  detail: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * SINGLE DATA & PLACEHOLDER OBJECT
 * Brackets indicate items for Dr. Jashan Sandhu to confirm before launch.
 */
export const DATA = {
  clinicName: 'Khushdil Ayurvedic Clinic',
  doctorName: 'Vaid Dr. Jashan Sandhu',
  shortDoctor: 'Vaid Jashan Sandhu',
  instagramHandle: '@vaid.jashansandhu',
  instagramUrl: 'https://www.instagram.com/vaid.jashansandhu',
  instagramFollowers: '13K+',
  bioLines: [
    'Ayurvedic: Balance Life Naturally',
    'Old Generation Business',
    'Only Ayurvedic Medicine',
  ],
  phones: [
    { display: '62846-64722', tel: '+916284664722', whatsapp: '916284664722' },
    { display: '78889-49756', tel: '+917888949756', whatsapp: '917888949756' },
  ],
  placeholders: {
    degree: '[B.A.M.S. / Degree Placeholder]',
    yearsInPractice: '[Years in Practice Placeholder]',
    streetAndDistrict: '[Street & District Placeholder, Punjab]',
    timings: '[Clinic Timings Placeholder]',
  },
  photos: {
    hero: '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
    vaidPortrait: '/src/assets/images/vaid_portrait_standin_1795261360995.jpg',
    herbsStill: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
    apothecary: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
    teaInfusion: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
    herbalOil: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
  },
  standInCredit:
    'Editorial clinic, portrait, and herbal photographs shown here are temporary stand-ins until real clinic photography is supplied by Dr. Jashan Sandhu.',

  treatments: [
    {
      id: 'joint-care',
      title: 'Joint Care',
      hindi: 'जोड़ों की देखभाल',
      softLine: '[Placeholder: Gentle herbal support and oil guidance for stiffness and daily joint comfort.]',
      image: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      alt: 'Brass bowl of warm herbal sesame oil with fresh neem leaves',
    },
    {
      id: 'digestion',
      title: 'Digestion',
      hindi: 'पाचन संतुलन',
      softLine: '[Placeholder: Classical digestive herbs and meal-timing guidance for gas, acidity, and gut comfort.]',
      image: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      alt: 'Terracotta cup of warm herbal infusion beside cardamom and cinnamon',
    },
    {
      id: 'weight-balance',
      title: 'Weight Balance',
      hindi: 'वज़न संतुलन',
      softLine: '[Placeholder: Individualized metabolic herbs paired with realistic daily food habits.]',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Whole Ayurvedic roots, turmeric, and amla in brass bowls on stone',
    },
    {
      id: 'sugar-balance',
      title: 'Sugar Balance',
      hindi: 'शुगर देखभाल',
      softLine: '[Placeholder: Traditional botanical support alongside regular checkups and your physician’s advice.]',
      image: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      alt: 'Amber glass apothecary bottles on forest green clinic shelves',
    },
    {
      id: 'skin',
      title: 'Skin',
      hindi: 'त्वचा देखभाल',
      softLine: '[Placeholder: Cooling internal herbs and gentle routine care for recurring skin sensitivity.]',
      image: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      alt: 'Neem leaves and herbal oil prepared for skin nourishment',
    },
    {
      id: 'hair',
      title: 'Hair',
      hindi: 'बालों की देखभाल',
      softLine: '[Placeholder: Scalp-nourishing herbal oils and nutritional care for hair strength.]',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Amla and whole botanicals arranged on travertine stone',
    },
    {
      id: 'womens-wellness',
      title: "Women's Wellness",
      hindi: 'महिला स्वास्थ्य',
      softLine: '[Placeholder: Private, unhurried Ayurvedic guidance for cyclical comfort and vitality.]',
      image: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      alt: 'Warm herbal decoction with fresh tulsi sprigs on linen',
    },
    {
      id: 'sleep-stress',
      title: 'Sleep & Stress',
      hindi: 'नींद और तनाव',
      softLine: '[Placeholder: Calming herbs and evening wind-down routines to support restful nights.]',
      image: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      alt: 'Traditional herbal jars and brass measuring spoons in soft daylight',
    },
  ] as TreatmentCard[],

  bodyHotspots: [
    {
      id: 'hair',
      label: 'Hair & Scalp',
      hindi: 'बाल और सिर',
      x: 140,
      y: 44,
      description:
        '[Placeholder: Cooling scalp oils and traditional herbs like amla and bhringraj to support root strength and calm.]',
    },
    {
      id: 'mind-sleep',
      label: 'Mind & Sleep',
      hindi: 'मन और नींद',
      x: 140,
      y: 78,
      description:
        '[Placeholder: Grounding botanicals and simple evening routines to help restless thoughts settle before bed.]',
    },
    {
      id: 'skin',
      label: 'Skin Care',
      hindi: 'त्वचा',
      x: 82,
      y: 162,
      description:
        '[Placeholder: Gentle blood-cooling herbs and dietary guidance for recurring dryness, redness, or discomfort.]',
    },
    {
      id: 'gut',
      label: 'Gut & Digestion',
      hindi: 'पाचन',
      x: 140,
      y: 190,
      description:
        '[Placeholder: Warm digestive spices, triphala care, and meal-timing adjustments for bloating and acidity.]',
    },
    {
      id: 'womens-health',
      label: "Women's Health",
      hindi: 'महिला स्वास्थ्य',
      x: 140,
      y: 238,
      description:
        '[Placeholder: Patient, private consultations supporting monthly balance, iron nourishment, and steady energy.]',
    },
    {
      id: 'joints',
      label: 'Joints & Mobility',
      hindi: 'जोड़ और कमर',
      x: 108,
      y: 325,
      description:
        '[Placeholder: Herbal formulations and warm oil massage guidance to ease morning stiffness and support movement.]',
    },
  ] as BodyHotspot[],

  careSteps: [
    {
      num: '01',
      title: 'Pulse Check (Nadi Pariksha)',
      hindi: 'नाड़ी परीक्षा',
      line1: 'Vaid ji reads your pulse and listens carefully without rushing.',
      line2: 'Online patients share a detailed symptom and daily habit picture.',
      image: '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
      alt: 'Ayurvedic Vaid consultation desk with brass mortar and handwritten notes',
    },
    {
      num: '02',
      title: 'Talk About the Root Cause',
      hindi: 'मूल कारण की समझ',
      line1: 'We look beyond surface discomfort to digestion, sleep, and seasons.',
      line2: 'You understand why symptoms recur before any herbs are chosen.',
      image: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      alt: 'Traditional apothecary shelves with labeled amber glass bottles',
    },
    {
      num: '03',
      title: 'Natural Medicine Plan',
      hindi: 'शुद्ध आयुर्वेदिक दवा',
      line1: 'Only Ayurvedic medicine prepared from whole classical herbs.',
      line2: 'Tailored to your body constitution, age, and current routine.',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Whole dried ashwagandha, turmeric roots, and amla in brass bowls',
    },
    {
      num: '04',
      title: 'Food & Daily Routine',
      hindi: 'खान-पान और दिनचर्या',
      line1: 'Practical kitchen spices, warm water habits, and meal timings.',
      line2: 'Simple adjustments designed to fit real family schedules.',
      image: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      alt: 'Clay cup of warm herbal infusion with cardamom and tulsi leaves',
    },
    {
      num: '05',
      title: 'Steady Follow-Up',
      hindi: 'नियमित देखभाल',
      line1: 'Check-ins with Vaid ji via clinic visit or WhatsApp as your body settles.',
      line2: 'Formulations and diet guidance are gently adjusted step by step.',
      image: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      alt: 'Hammered brass bowl of golden herbal oil and cream linen cloth',
    },
  ] as CareStep[],

  herbs: [
    {
      id: 'ashwagandha',
      name: 'Ashwagandha',
      hindi: 'अश्वगंधा',
      traditionalUse: 'Traditionally valued for quiet strength, stamina, and restorative rest.',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Dried Ashwagandha roots on natural travertine stone',
    },
    {
      id: 'neem',
      name: 'Neem',
      hindi: 'नीम',
      traditionalUse: 'Classical bitter botanical supporting clean skin and internal cooling.',
      image: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      alt: 'Fresh green neem leaves beside warm herbal oil',
    },
    {
      id: 'tulsi',
      name: 'Tulsi',
      hindi: 'तुलसी',
      traditionalUse: 'Sacred kitchen leaf used daily for clear breathing and seasonal comfort.',
      image: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      alt: 'Fresh tulsi sprigs beside a terracotta cup of herbal decoction',
    },
    {
      id: 'giloy',
      name: 'Giloy',
      hindi: 'गिलोय',
      traditionalUse: 'Known as Guduchi in classical texts to support balanced immunity.',
      image: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      alt: 'Guduchi and classical herbal jars on clinic wood shelves',
    },
    {
      id: 'turmeric',
      name: 'Turmeric',
      hindi: 'हल्दी',
      traditionalUse: 'Warm golden root supporting joint ease, digestion, and blood clarity.',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Fresh cut turmeric rhizomes in soft natural daylight',
    },
    {
      id: 'amla',
      name: 'Amla',
      hindi: 'आंवला',
      traditionalUse: 'Gentle cooling Rasayana supporting digestion, hair, and vitality.',
      image: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      alt: 'Dried amla fruits in an antique brass bowl',
    },
  ] as HerbItem[],

  quizQuestions: [
    {
      id: 'body-feel',
      topic: 'Body Feel',
      prompt: 'How does your body usually feel through the day?',
      options: [
        { label: 'Light, thin, or quick to feel dry and stiff', dosha: 'Vata' },
        { label: 'Medium build, warm, sometimes easily heated', dosha: 'Pitta' },
        { label: 'Solid, steady, sometimes heavy after rest', dosha: 'Kapha' },
      ],
    },
    {
      id: 'digestion',
      topic: 'Digestion',
      prompt: 'How does your stomach behave after regular meals?',
      options: [
        { label: 'Bloating, gas, or irregular appetite', dosha: 'Vata' },
        { label: 'Strong hunger, acidity, or warm burning', dosha: 'Pitta' },
        { label: 'Slow digestion or feeling full for a long time', dosha: 'Kapha' },
      ],
    },
    {
      id: 'sleep',
      topic: 'Sleep',
      prompt: 'What is your typical night’s sleep like?',
      options: [
        { label: 'Light sleep, waking up easily at night', dosha: 'Vata' },
        { label: 'Moderate sleep, waking warm or alert early', dosha: 'Pitta' },
        { label: 'Deep, long sleep, hard to wake in the morning', dosha: 'Kapha' },
      ],
    },
    {
      id: 'energy',
      topic: 'Energy',
      prompt: 'How does your daily energy move?',
      options: [
        { label: 'Comes in quick bursts, then tires suddenly', dosha: 'Vata' },
        { label: 'Sharp and focused when fed on time', dosha: 'Pitta' },
        { label: 'Calm and lasting once you get moving', dosha: 'Kapha' },
      ],
    },
    {
      id: 'mood',
      topic: 'Mood',
      prompt: 'How do you usually respond during busy weeks?',
      options: [
        { label: 'Mind races, worries quickly, feels unsettled', dosha: 'Vata' },
        { label: 'Frustrated, impatient, or irritable when delayed', dosha: 'Pitta' },
        { label: 'Quiet, patient, prefers familiar slow routines', dosha: 'Kapha' },
      ],
    },
  ] as QuizQuestion[],

  doshaDescriptions: {
    Vata: 'Vata reflects air and movement. Keeping meals warm, freshly cooked, and regular—alongside calming oils—helps settle dryness and restlessness.',
    Pitta: 'Pitta reflects fire and digestion. Favoring cool, mild foods, avoiding skipped meals, and resting before late night helps soothe heat and acidity.',
    Kapha: 'Kapha reflects earth and stability. Light warm meals, morning movement, and gentle digestive spices help lift heaviness and sluggish energy.',
  } as Record<'Vata' | 'Pitta' | 'Kapha', string>,

  reels: [
    {
      id: 'reel-1',
      title: 'Whole Herbs & Classical Formulations',
      poster: '/src/assets/images/apothecary_bottles_clinic_1795261361545.jpg',
      videoUrl:
        '/assets/aistudio/AQMA_-_5_Yo18v10902s62QS4rbv2JoI8_ZKQ1q4GQpLPJ_Ljcw4KExT3-Rvk7VpT89RYVcyefHD0IFknZyFhcWxowQs-_Y4_26b220a3.mp4',
      alt: 'Whole herbs and classical Ayurvedic clinic reel poster',
    },
    {
      id: 'reel-2',
      title: 'Herbal Combo Care & Courier Dispatch',
      poster: '/src/assets/images/herbs_mortars_still_1795261360892.jpg',
      videoUrl:
        '/assets/aistudio/AQMHVdNt1X2YiifOW-JngxOCDMdoM89NnFykXTxMdv-29MwjpfhkAQ04Yr8u3rSSDxsXZDDcqj2got6zG8OHk0CkMiqKCat-_94cacfbc.mp4',
      alt: 'Herbal combo packs and courier dispatch reel poster',
    },
    {
      id: 'reel-3',
      title: 'Inside Khushdil Ayurvedic Clinic',
      poster: '/src/assets/images/hero_clinic_ayurveda_1795261360884.jpg',
      videoUrl:
        '/assets/aistudio/AQNhH0YoEy2muVVBO8od8E8wR_bP6znSMGynmsy2HaXBqawzzDr3t2yywPvfiAVHlJJUd2usSGeDJcJNPordXPXhbuG9esG1_e0c6bbde.mp4',
      alt: 'Inside Khushdil Ayurvedic Clinic consultation room poster',
    },
    {
      id: 'reel-4',
      title: 'Natural Strength & Old-Generation Wisdom',
      poster: '/src/assets/images/ayurvedic_tea_wellness_1795261360627.jpg',
      videoUrl:
        '/assets/aistudio/AQOItAwV4KHo6va8EXtCP8pSWGmIvzM7MEKyZG8VF-_mGl62ra7lq5lg2y3G0Y4ln1M7RMKrUi27SdGy7nXH6z6h3hVRmkb9_df85cf82.mp4',
      alt: 'Traditional vitality formulation reel poster',
    },
    {
      id: 'reel-5',
      title: 'Clinic Visit & Real Guidance',
      poster: '/src/assets/images/herbal_oil_abhyanga_1795261360856.jpg',
      videoUrl:
        '/assets/aistudio/AQPIitXYUWG9wckqkXe9Ot2Pfr3RGoWTF_DgB6sGOH-yjllLHlXDcaEQweRdirgqU0BUj4pKpjXznREZ9V7nfPuU9IsseOvq_3ae41630.mp4',
      alt: 'Patient clinic visit and strength guidance reel poster',
    },
  ] as ReelSlot[],

  reviews: [
    {
      id: 'rev-1',
      quote: '[Real review here]',
      name: '[Patient name]',
      detail: '[Concern / District Placeholder]',
    },
    {
      id: 'rev-2',
      quote: '[Real review here]',
      name: '[Patient name]',
      detail: '[Concern / District Placeholder]',
    },
    {
      id: 'rev-3',
      quote: '[Real review here]',
      name: '[Patient name]',
      detail: '[Concern / District Placeholder]',
    },
  ] as ReviewPlaceholder[],

  faqs: [
    {
      question: 'Is the medicine only Ayurvedic?',
      answer:
        '[Placeholder: Yes. Khushdil Ayurvedic Clinic works strictly with classical Ayurvedic herbal formulations, powders, decoctions, and oils—never synthetic steroids or hidden chemicals.]',
    },
    {
      question: 'How does the first visit work?',
      answer:
        '[Placeholder: Vaid Dr. Jashan Sandhu begins with Nadi Pariksha (pulse reading) or a structured online history talk covering digestion, sleep, daily meals, and symptoms before suggesting a plan.]',
    },
    {
      question: 'Should I bring old reports?',
      answer:
        '[Placeholder: Yes, bringing recent blood tests, scans, or prescriptions helps Vaid ji understand your complete health picture before offering guidance.]',
    },
    {
      question: 'Can I consult online?',
      answer:
        '[Placeholder: Yes. Online phone and WhatsApp video consultations are available, with clear dosage instructions and courier dispatch arranged if needed.]',
    },
    {
      question: 'How long does care usually take?',
      answer:
        '[Placeholder: Ayurveda supports steady root-level balance rather than overnight masking. Timelines depend on your age, digestion, and how long symptoms have been present.]',
    },
    {
      question: 'Is it safe with my current tablets?',
      answer:
        '[Placeholder: Please tell Vaid ji about every medicine you take. Sharing your current prescriptions allows herbs and meal guidance to be planned safely alongside your doctor’s care.]',
    },
  ] as FaqEntry[],
};

export function buildWhatsAppLink(message: string, phoneIndex: 0 | 1 = 0): string {
  return `https://wa.me/${DATA.phones[phoneIndex].whatsapp}?text=${encodeURIComponent(message)}`;
}
