/**
 * Lightweight multilingual layer (spec §11.2: English, Hindi, Marathi).
 * Extensible for further regional languages: add a code to LANGUAGES and a
 * dictionary entry. Missing keys fall back to English, then to the key itself.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

type Dict = Record<string, string>;

const en: Dict = {
  "auth.signIn": "Sign in",
  "auth.signOut": "Sign out",
  "auth.signUp": "Create account",
  "auth.signInTitle": "Sign in to your portal",
  "auth.signUpTitle": "Create a prototype account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.role": "Role",
  "auth.login": "Login",
  "auth.error": "Authentication error",
  "auth.working": "Please wait…",
  "auth.checkingSession": "Checking your session…",
  "auth.checkEmail": "Check your email to confirm this account, then sign in.",
  "auth.needAccount": "Need an account? Create one",
  "auth.haveAccount": "Already have an account? Sign in",
  "auth.unauthorized": "Access not permitted",
  "auth.unauthorizedBody":
    "Your account role does not permit access to this portal. Role-based access control blocked the request.",
  "auth.goToMyPortal": "Go to my portal",
  "auth.signedInAs": "Signed in as",
  "auth.notSignedIn": "Not signed in",
  "auth.roleHint": "Prototype only. A real deployment assigns roles administratively.",
  "auth.syntheticIdentities":
    "Use synthetic demo identities only. Never enter real citizen or government credentials.",
  "auth.account": "Account",
  "app.name": "Integrated Land Acquisition & Management Platform",
  "app.short": "BhoomiTrack",
  "app.tagline": "One parcel — one acquisition case — one traceable lifecycle.",
  "nav.home": "Home",
  "nav.officer": "Officer / Admin",
  "nav.ministry": "Ministry / Oversight",
  "nav.citizen": "Citizen",
  "nav.about": "About the platform",
  "common.language": "Language",
  "common.largeText": "Large text",
  "common.demoRole": "Demo role",
  "common.comingPhase": "Arrives in a later build phase",
  "common.openPortal": "Open portal",
  "banner.prototype":
    "Prototype build. Case-level data is synthetic or representative — not official government records.",
  "banner.citizenPrototype":
    "Prototype build. Case-level data is representative — not official government records.",
  "landing.title": "BhoomiTrack",
  "landing.subtitle": "Integrated Land Acquisition & Management Platform",
  "landing.choose": "Choose your portal",
  "officer.title": "Officer / Admin workspace",
  "officer.subtitle":
    "Create and progress acquisition cases, manage parcels, documents, objections and possession.",
  "ministry.title": "Ministry / Oversight dashboard",
  "ministry.subtitle":
    "Portfolio health, stage distribution, compensation pipeline, objection analytics and risk.",
  "citizen.title": "My land, my case",
  "citizen.subtitle":
    "See which land of yours is involved, what is happening, and what you need to do next.",
  "citizen.q1": "What land of mine is involved?",
  "citizen.q2": "What is happening right now?",
  "citizen.q3": "Do I need to do anything?",
  "citizen.q4": "Is the information and payment correct?",
  "citizen.q5": "How do I report an issue and track it?",
};

const hi: Dict = {
  "auth.signIn": "साइन इन",
  "auth.signOut": "साइन आउट",
  "auth.signUp": "खाता बनाएँ",
  "auth.signInTitle": "अपने पोर्टल में साइन इन करें",
  "auth.signUpTitle": "प्रोटोटाइप खाता बनाएँ",
  "auth.email": "ईमेल",
  "auth.password": "पासवर्ड",
  "auth.role": "भूमिका",
  "auth.login": "लॉगिन",
  "auth.error": "प्रमाणीकरण त्रुटि",
  "auth.working": "कृपया प्रतीक्षा करें…",
  "auth.checkingSession": "आपका सत्र जाँचा जा रहा है…",
  "auth.checkEmail": "खाते की पुष्टि हेतु ईमेल देखें, फिर साइन इन करें।",
  "auth.needAccount": "खाता नहीं है? बनाएँ",
  "auth.haveAccount": "पहले से खाता है? साइन इन करें",
  "auth.unauthorized": "पहुँच अनुमत नहीं",
  "auth.unauthorizedBody":
    "आपकी भूमिका इस पोर्टल तक पहुँच की अनुमति नहीं देती। भूमिका-आधारित नियंत्रण ने अनुरोध रोक दिया।",
  "auth.goToMyPortal": "मेरे पोर्टल पर जाएँ",
  "auth.signedInAs": "साइन इन:",
  "auth.notSignedIn": "साइन इन नहीं",
  "auth.roleHint": "केवल प्रोटोटाइप। वास्तविक तैनाती में भूमिकाएँ प्रशासनिक रूप से दी जाती हैं।",
  "auth.syntheticIdentities":
    "केवल काल्पनिक डेमो पहचान का उपयोग करें। वास्तविक नागरिक या शासकीय क्रेडेंशियल दर्ज न करें।",
  "auth.account": "खाता",
  "app.name": "Integrated Land Acquisition & Management Platform",
  "app.short": "BhoomiTrack",
  "app.tagline": "एक भूखंड — एक अधिग्रहण प्रकरण — एक पूर्ण अभिलेख शृंखला।",
  "nav.home": "मुखपृष्ठ",
  "nav.officer": "अधिकारी / प्रशासन",
  "nav.ministry": "मंत्रालय / निगरानी",
  "nav.citizen": "नागरिक",
  "nav.about": "प्रणाली के बारे में",
  "common.language": "भाषा",
  "common.largeText": "बड़ा पाठ",
  "common.demoRole": "डेमो भूमिका",
  "common.comingPhase": "आगामी चरण में उपलब्ध होगा",
  "common.openPortal": "पोर्टल खोलें",
  "banner.prototype":
    "प्रोटोटाइप संस्करण। प्रकरण-स्तरीय आंकड़े काल्पनिक/प्रतिनिधिक हैं — शासकीय अभिलेख नहीं।",
  "banner.citizenPrototype":
    "प्रोटोटाइप संस्करण। प्रकरण-स्तरीय आंकड़े प्रतिनिधिक हैं — शासकीय अभिलेख नहीं।",
  "landing.title": "BhoomiTrack",
  "landing.subtitle": "Integrated Land Acquisition & Management Platform",
  "landing.choose": "अपना पोर्टल चुनें",
  "officer.title": "अधिकारी / प्रशासन कार्यक्षेत्र",
  "officer.subtitle":
    "प्रकरण बनाएँ और आगे बढ़ाएँ, भूखंड, दस्तावेज़, आपत्तियाँ एवं कब्ज़ा प्रबंधित करें।",
  "ministry.title": "मंत्रालय / निगरानी डैशबोर्ड",
  "ministry.subtitle": "पोर्टफोलियो स्थिति, चरण वितरण, मुआवज़ा प्रवाह, आपत्ति विश्लेषण और जोखिम।",
  "citizen.title": "मेरी भूमि, मेरा प्रकरण",
  "citizen.subtitle":
    "देखें कि आपकी कौन-सी भूमि प्रभावित है, क्या हो रहा है, और आपको आगे क्या करना है।",
  "citizen.q1": "मेरी कौन-सी भूमि इसमें शामिल है?",
  "citizen.q2": "अभी क्या हो रहा है?",
  "citizen.q3": "क्या मुझे कुछ करना है?",
  "citizen.q4": "क्या जानकारी और भुगतान सही है?",
  "citizen.q5": "समस्या कैसे दर्ज करूँ और उसे कैसे देखूँ?",
};

const mr: Dict = {
  "auth.signIn": "साइन इन",
  "auth.signOut": "साइन आउट",
  "auth.signUp": "खाते तयार करा",
  "auth.signInTitle": "आपल्या पोर्टलमध्ये साइन इन करा",
  "auth.signUpTitle": "प्रोटोटाइप खाते तयार करा",
  "auth.email": "ईमेल",
  "auth.password": "पासवर्ड",
  "auth.role": "भूमिका",
  "auth.login": "लॉगिन",
  "auth.error": "प्रमाणीकरण त्रुटी",
  "auth.working": "कृपया थांबा…",
  "auth.checkingSession": "आपले सत्र तपासले जात आहे…",
  "auth.checkEmail": "खाते निश्चित करण्यासाठी ईमेल पहा, नंतर साइन इन करा.",
  "auth.needAccount": "खाते नाही? तयार करा",
  "auth.haveAccount": "खाते आहे? साइन इन करा",
  "auth.unauthorized": "प्रवेश अनुमत नाही",
  "auth.unauthorizedBody":
    "आपली भूमिका या पोर्टलमध्ये प्रवेशाची अनुमती देत नाही. भूमिका-आधारित नियंत्रणाने विनंती अडवली.",
  "auth.goToMyPortal": "माझ्या पोर्टलवर जा",
  "auth.signedInAs": "साइन इन:",
  "auth.notSignedIn": "साइन इन नाही",
  "auth.roleHint": "केवळ प्रोटोटाइप. प्रत्यक्ष वापरात भूमिका प्रशासकीयरित्या दिल्या जातात.",
  "auth.syntheticIdentities":
    "केवळ काल्पनिक डेमो ओळख वापरा. खरी नागरिक किंवा शासकीय क्रेडेन्शियल्स टाकू नका.",
  "auth.account": "खाते",
  "app.name": "Integrated Land Acquisition & Management Platform",
  "app.short": "BhoomiTrack",
  "app.tagline": "एक भूखंड — एक संपादन प्रकरण — एक संपूर्ण नोंद शृंखला.",
  "nav.home": "मुख्यपृष्ठ",
  "nav.officer": "अधिकारी / प्रशासन",
  "nav.ministry": "मंत्रालय / देखरेख",
  "nav.citizen": "नागरिक",
  "nav.about": "प्रणालीविषयी",
  "common.language": "भाषा",
  "common.largeText": "मोठा मजकूर",
  "common.demoRole": "डेमो भूमिका",
  "common.comingPhase": "पुढील टप्प्यात उपलब्ध होईल",
  "common.openPortal": "पोर्टल उघडा",
  "banner.prototype":
    "प्रोटोटाइप आवृत्ती. प्रकरण-स्तरीय माहिती काल्पनिक/प्रातिनिधिक आहे — शासकीय नोंदी नाहीत.",
  "banner.citizenPrototype":
    "प्रोटोटाइप आवृत्ती. प्रकरण-स्तरीय माहिती प्रातिनिधिक आहे — शासकीय नोंदी नाहीत.",
  "landing.title": "BhoomiTrack",
  "landing.subtitle": "Integrated Land Acquisition & Management Platform",
  "landing.choose": "आपले पोर्टल निवडा",
  "officer.title": "अधिकारी / प्रशासन कार्यक्षेत्र",
  "officer.subtitle": "प्रकरणे तयार करा व पुढे न्या; भूखंड, कागदपत्रे, हरकती व ताबा हाताळा.",
  "ministry.title": "मंत्रालय / देखरेख डॅशबोर्ड",
  "ministry.subtitle": "एकूण स्थिती, टप्पा वितरण, मोबदला प्रवाह, हरकत विश्लेषण आणि जोखीम.",
  "citizen.title": "माझी जमीन, माझे प्रकरण",
  "citizen.subtitle": "तुमची कोणती जमीन बाधित आहे, काय सुरू आहे आणि पुढे काय करायचे ते पहा.",
  "citizen.q1": "माझी कोणती जमीन यात आहे?",
  "citizen.q2": "सध्या काय सुरू आहे?",
  "citizen.q3": "मला काही करायचे आहे का?",
  "citizen.q4": "माहिती व देयक बरोबर आहे का?",
  "citizen.q5": "तक्रार कशी नोंदवू आणि कशी पाहू?",
};

const DICTS: Record<LangCode, Dict> = { en, hi, mr };

const STORAGE_KEY = "sih26016.lang";

type I18nValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  // Read the stored preference after hydration to avoid SSR mismatch.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && stored in DICTS) setLangState(stored);
  }, []);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((key: string) => DICTS[lang][key] ?? en[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
