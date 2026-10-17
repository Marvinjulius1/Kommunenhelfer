/**
 * Mehrsprachigkeit: Oberflächentexte (UI-Chrome) + Hilfsfunktion für
 * übersetzbare Konfigurationstexte (LText).
 *
 * Fallback-Kette:
 *   Leichte Sprache (ls)  → Deutsch
 *   tr / uk / ar / ru     → Englisch → Deutsch (wer kein Deutsch spricht, versteht eher Englisch)
 * Verbindlich ist immer die deutsche Fassung.
 */
import type { GemeindeConfig, LText, Sprache } from "@/config/types";

export const SPRACHEN: Sprache[] = ["de", "ls", "en", "tr", "uk", "ar", "ru"];

/** Name der Sprache in der Sprache selbst (für die Sprachwahl) */
export const SPRACHNAMEN: Record<Sprache, string> = {
  de: "Deutsch",
  ls: "Leichte Sprache",
  en: "English",
  tr: "Türkçe",
  uk: "Українська",
  ar: "العربية",
  ru: "Русский",
};

/** HTML-Sprachattribut (Leichte Sprache ist Deutsch) */
export const HTML_LANG: Record<Sprache, string> = { de: "de", ls: "de", en: "en", tr: "tr", uk: "uk", ar: "ar", ru: "ru" };
/** Gebietsschema für Datum, Zahl und Sprachausgabe */
export const LOCALE: Record<Sprache, string> = { de: "de-DE", ls: "de-DE", en: "en-GB", tr: "tr-TR", uk: "uk-UA", ar: "ar", ru: "ru-RU" };

export function rtl(lang: Sprache): boolean {
  return lang === "ar";
}

/** Deutsche Oberfläche (Deutsch oder Leichte Sprache)? Steuert die vielen de/en-Texte in Komponenten. */
export function deutsch(lang: Sprache): boolean {
  return lang === "de" || lang === "ls";
}

export function tx(text: LText | undefined, lang: Sprache): string {
  if (text === undefined) return "";
  if (typeof text === "string") return text;
  if (lang === "ls") return text.ls ?? text.de;
  return text[lang] ?? (lang === "de" ? undefined : text.en) ?? text.de;
}

/** Schrift unter dem Wappen. Standard: "Bürgerservice online". */
export function untertitel(tenant: Pick<GemeindeConfig, "texte">, lang: Sprache): string {
  return tx(
    tenant.texte.untertitel ?? {
      de: "Bürgerservice online",
      ls: "Das Rathaus im Internet",
      en: "Online citizen services",
      tr: "Online vatandaş hizmetleri",
      uk: "Онлайн-послуги для громадян",
      ar: "خدمات المواطنين عبر الإنترنت",
      ru: "Онлайн-услуги для граждан",
    },
    lang,
  );
}

const de = {
  menuDienste: "Dienste",
  menuTermine: "Termine",
  menuHilfe: "Hilfe",
  menuKontakt: "Kontakt",
  menuAnliegen: "Meine Anliegen",
  menuOeffnen: "Menü öffnen",
  menuSchliessen: "Menü schließen",
  themeWechseln: "Erscheinungsbild wechseln",
  senden: "Absenden",
  eingabeLabel: "Ihr Anliegen",
  alleLeistungen: "Alle Leistungen von A bis Z",
  neuesAnliegen: "Neues Anliegen",
  einenMoment: "Einen Moment bitte …",
  sie: "Sie",
  fehlerAllgemein: "Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.",
  zuVieleAnfragen: "Sie haben sehr viele Anfragen gesendet. Bitte warten Sie einen Moment.",
  impressum: "Impressum",
  datenschutz: "Datenschutz",
  barrierefreiheit: "Barrierefreiheit",
  zurueck: "Zurück",
  weiter: "Weiter",
  startseite: "Zur Startseite",
  quelle: "Quelle",
  onlineBeantragen: "Online beantragen",
  terminBuchen: "Termin buchen",
  kontaktAufnehmen: "Kontakt aufnehmen",
  unterlagen: "Das brauchen Sie",
  gebuehren: "Gebühren",
  ablauf: "So geht es",
  fristen: "Fristen",
  kostenfrei: "kostenfrei",
  dauer: "Dauer",
  oeffnungszeiten: "Öffnungszeiten",
  geschlossen: "geschlossen",
  hauptinhalt: "Zum Hauptinhalt springen",
  sprache: "Sprache",
  leichteSprache: "Leichte Sprache",
  vorlesen: "Vorlesen",
  vorlesenStopp: "Vorlesen beenden",
  spracheingabe: "Spracheingabe",
  uebersetzungHinweis: "",
};

export type Dict = typeof de;

const ls: Dict = {
  ...de,
  menuDienste: "Was Sie hier machen können",
  menuTermine: "Termin machen",
  menuHilfe: "Hilfe",
  menuAnliegen: "Meine Sachen beim Amt",
  eingabeLabel: "Was möchten Sie?",
  alleLeistungen: "Alle Sachen vom Amt",
  neuesAnliegen: "Neue Frage",
  fehlerAllgemein: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.",
  zuVieleAnfragen: "Sie haben sehr viel geschickt. Bitte warten Sie kurz.",
  onlineBeantragen: "Im Internet beantragen",
  terminBuchen: "Termin machen",
  kontaktAufnehmen: "Mit dem Amt sprechen",
  unterlagen: "Das brauchen Sie",
  gebuehren: "Das kostet es",
  ablauf: "So geht es",
  fristen: "Bis wann?",
  kostenfrei: "kostet nichts",
  dauer: "So lange dauert es",
  oeffnungszeiten: "Wann ist das Rathaus offen?",
  geschlossen: "zu",
  hauptinhalt: "Zum Inhalt",
};

const en: Dict = {
  menuDienste: "Services",
  menuTermine: "Appointments",
  menuHilfe: "Help",
  menuKontakt: "Contact",
  menuAnliegen: "My requests",
  menuOeffnen: "Open menu",
  menuSchliessen: "Close menu",
  themeWechseln: "Change appearance",
  senden: "Send",
  eingabeLabel: "Your request",
  alleLeistungen: "All services from A to Z",
  neuesAnliegen: "New request",
  einenMoment: "One moment please …",
  sie: "You",
  fehlerAllgemein: "Unfortunately that did not work. Please try again.",
  zuVieleAnfragen: "You have sent many requests. Please wait a moment.",
  impressum: "Legal notice",
  datenschutz: "Privacy",
  barrierefreiheit: "Accessibility",
  zurueck: "Back",
  weiter: "Continue",
  startseite: "Back to start",
  quelle: "Source",
  onlineBeantragen: "Apply online",
  terminBuchen: "Book an appointment",
  kontaktAufnehmen: "Contact us",
  unterlagen: "What you need",
  gebuehren: "Fees",
  ablauf: "How it works",
  fristen: "Deadlines",
  kostenfrei: "free of charge",
  dauer: "Duration",
  oeffnungszeiten: "Opening hours",
  geschlossen: "closed",
  hauptinhalt: "Skip to main content",
  sprache: "Language",
  leichteSprache: "Easy German",
  vorlesen: "Read aloud",
  vorlesenStopp: "Stop reading",
  spracheingabe: "Voice input",
  uebersetzungHinweis: "This translation is for guidance. Only the German version is legally binding.",
};

const tr: Dict = {
  menuDienste: "Hizmetler",
  menuTermine: "Randevular",
  menuHilfe: "Yardım",
  menuKontakt: "İletişim",
  menuAnliegen: "Başvurularım",
  menuOeffnen: "Menüyü aç",
  menuSchliessen: "Menüyü kapat",
  themeWechseln: "Görünümü değiştir",
  senden: "Gönder",
  eingabeLabel: "Talebiniz",
  alleLeistungen: "A'dan Z'ye tüm hizmetler",
  neuesAnliegen: "Yeni talep",
  einenMoment: "Bir dakika lütfen …",
  sie: "Siz",
  fehlerAllgemein: "Maalesef olmadı. Lütfen tekrar deneyin.",
  zuVieleAnfragen: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.",
  impressum: "Künye",
  datenschutz: "Gizlilik",
  barrierefreiheit: "Erişilebilirlik",
  zurueck: "Geri",
  weiter: "Devam",
  startseite: "Ana sayfaya",
  quelle: "Kaynak",
  onlineBeantragen: "Online başvur",
  terminBuchen: "Randevu al",
  kontaktAufnehmen: "İletişime geç",
  unterlagen: "Gerekli belgeler",
  gebuehren: "Ücretler",
  ablauf: "Nasıl işler",
  fristen: "Süreler",
  kostenfrei: "ücretsiz",
  dauer: "Süre",
  oeffnungszeiten: "Çalışma saatleri",
  geschlossen: "kapalı",
  hauptinhalt: "Ana içeriğe geç",
  sprache: "Dil",
  leichteSprache: "Kolay Almanca",
  vorlesen: "Sesli oku",
  vorlesenStopp: "Okumayı durdur",
  spracheingabe: "Sesli giriş",
  uebersetzungHinweis: "Bu çeviri bilgilendirme amaçlıdır. Yalnızca Almanca metin bağlayıcıdır.",
};

const uk: Dict = {
  menuDienste: "Послуги",
  menuTermine: "Запис на прийом",
  menuHilfe: "Допомога",
  menuKontakt: "Контакти",
  menuAnliegen: "Мої звернення",
  menuOeffnen: "Відкрити меню",
  menuSchliessen: "Закрити меню",
  themeWechseln: "Змінити вигляд",
  senden: "Надіслати",
  eingabeLabel: "Ваше звернення",
  alleLeistungen: "Усі послуги від А до Я",
  neuesAnliegen: "Нове звернення",
  einenMoment: "Зачекайте, будь ласка …",
  sie: "Ви",
  fehlerAllgemein: "На жаль, не вдалося. Спробуйте ще раз.",
  zuVieleAnfragen: "Ви надіслали забагато запитів. Зачекайте трохи.",
  impressum: "Вихідні дані",
  datenschutz: "Захист даних",
  barrierefreiheit: "Доступність",
  zurueck: "Назад",
  weiter: "Далі",
  startseite: "На головну",
  quelle: "Джерело",
  onlineBeantragen: "Подати онлайн",
  terminBuchen: "Записатися на прийом",
  kontaktAufnehmen: "Зв'язатися",
  unterlagen: "Що потрібно",
  gebuehren: "Збори",
  ablauf: "Як це працює",
  fristen: "Терміни",
  kostenfrei: "безкоштовно",
  dauer: "Тривалість",
  oeffnungszeiten: "Години роботи",
  geschlossen: "зачинено",
  hauptinhalt: "Перейти до основного змісту",
  sprache: "Мова",
  leichteSprache: "Проста німецька",
  vorlesen: "Прочитати вголос",
  vorlesenStopp: "Зупинити читання",
  spracheingabe: "Голосове введення",
  uebersetzungHinweis: "Цей переклад має довідковий характер. Юридично обов'язковою є лише німецька версія.",
};

const ar: Dict = {
  menuDienste: "الخدمات",
  menuTermine: "المواعيد",
  menuHilfe: "المساعدة",
  menuKontakt: "اتصل بنا",
  menuAnliegen: "طلباتي",
  menuOeffnen: "فتح القائمة",
  menuSchliessen: "إغلاق القائمة",
  themeWechseln: "تغيير المظهر",
  senden: "إرسال",
  eingabeLabel: "طلبك",
  alleLeistungen: "جميع الخدمات",
  neuesAnliegen: "طلب جديد",
  einenMoment: "لحظة من فضلك …",
  sie: "أنت",
  fehlerAllgemein: "للأسف لم ينجح ذلك. يرجى المحاولة مرة أخرى.",
  zuVieleAnfragen: "لقد أرسلت طلبات كثيرة. يرجى الانتظار قليلاً.",
  impressum: "بيانات الناشر",
  datenschutz: "حماية البيانات",
  barrierefreiheit: "إمكانية الوصول",
  zurueck: "رجوع",
  weiter: "متابعة",
  startseite: "إلى الصفحة الرئيسية",
  quelle: "المصدر",
  onlineBeantragen: "تقديم الطلب عبر الإنترنت",
  terminBuchen: "حجز موعد",
  kontaktAufnehmen: "تواصل معنا",
  unterlagen: "ما تحتاجه",
  gebuehren: "الرسوم",
  ablauf: "كيف يتم ذلك",
  fristen: "المواعيد النهائية",
  kostenfrei: "مجاناً",
  dauer: "المدة",
  oeffnungszeiten: "أوقات الدوام",
  geschlossen: "مغلق",
  hauptinhalt: "الانتقال إلى المحتوى الرئيسي",
  sprache: "اللغة",
  leichteSprache: "ألمانية مبسطة",
  vorlesen: "قراءة بصوت عالٍ",
  vorlesenStopp: "إيقاف القراءة",
  spracheingabe: "الإدخال الصوتي",
  uebersetzungHinweis: "هذه الترجمة للإرشاد فقط. النسخة الألمانية وحدها هي الملزمة قانونياً.",
};

const ru: Dict = {
  menuDienste: "Услуги",
  menuTermine: "Запись на приём",
  menuHilfe: "Помощь",
  menuKontakt: "Контакты",
  menuAnliegen: "Мои обращения",
  menuOeffnen: "Открыть меню",
  menuSchliessen: "Закрыть меню",
  themeWechseln: "Сменить оформление",
  senden: "Отправить",
  eingabeLabel: "Ваше обращение",
  alleLeistungen: "Все услуги от А до Я",
  neuesAnliegen: "Новое обращение",
  einenMoment: "Минуточку …",
  sie: "Вы",
  fehlerAllgemein: "К сожалению, не получилось. Попробуйте ещё раз.",
  zuVieleAnfragen: "Вы отправили слишком много запросов. Подождите немного.",
  impressum: "Выходные данные",
  datenschutz: "Защита данных",
  barrierefreiheit: "Доступность",
  zurueck: "Назад",
  weiter: "Далее",
  startseite: "На главную",
  quelle: "Источник",
  onlineBeantragen: "Подать онлайн",
  terminBuchen: "Записаться на приём",
  kontaktAufnehmen: "Связаться",
  unterlagen: "Что нужно",
  gebuehren: "Сборы",
  ablauf: "Как это работает",
  fristen: "Сроки",
  kostenfrei: "бесплатно",
  dauer: "Длительность",
  oeffnungszeiten: "Часы работы",
  geschlossen: "закрыто",
  hauptinhalt: "Перейти к основному содержанию",
  sprache: "Язык",
  leichteSprache: "Простой немецкий",
  vorlesen: "Прочитать вслух",
  vorlesenStopp: "Остановить чтение",
  spracheingabe: "Голосовой ввод",
  uebersetzungHinweis: "Этот перевод носит справочный характер. Юридически обязательной является только немецкая версия.",
};

const dicts: Record<Sprache, Dict> = { de, ls, en, tr, uk, ar, ru };

export function dict(lang: Sprache): Dict {
  return dicts[lang] ?? de;
}

export const WOCHENTAGE: Record<Sprache, Record<string, string>> = {
  de: { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" },
  ls: { mo: "Montag", di: "Dienstag", mi: "Mittwoch", do: "Donnerstag", fr: "Freitag", sa: "Samstag", so: "Sonntag" },
  en: { mo: "Monday", di: "Tuesday", mi: "Wednesday", do: "Thursday", fr: "Friday", sa: "Saturday", so: "Sunday" },
  tr: { mo: "Pazartesi", di: "Salı", mi: "Çarşamba", do: "Perşembe", fr: "Cuma", sa: "Cumartesi", so: "Pazar" },
  uk: { mo: "Понеділок", di: "Вівторок", mi: "Середа", do: "Четвер", fr: "П'ятниця", sa: "Субота", so: "Неділя" },
  ar: { mo: "الاثنين", di: "الثلاثاء", mi: "الأربعاء", do: "الخميس", fr: "الجمعة", sa: "السبت", so: "الأحد" },
  ru: { mo: "Понедельник", di: "Вторник", mi: "Среда", do: "Четверг", fr: "Пятница", sa: "Суббота", so: "Воскресенье" },
};

export function formatEuro(betrag: number, lang: Sprache = "de"): string {
  return new Intl.NumberFormat(LOCALE[lang] ?? "de-DE", { style: "currency", currency: "EUR" }).format(betrag);
}
