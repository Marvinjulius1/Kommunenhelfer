/**
 * Übersetzungen der Leistungstitel (und Kurztexte in Leichter Sprache).
 * Fehlt ein Text, zeigt das Portal Englisch bzw. Deutsch (siehe lib/i18n.ts).
 * Verbindlich ist immer die deutsche Fassung.
 *
 * Hinweis für den Echtbetrieb: Übersetzungen von einer Fachübersetzung prüfen lassen;
 * Texte in Leichter Sprache von einer Prüfgruppe (Menschen mit Lernschwierigkeiten).
 */
import type { LText, Leistung } from "@/config/types";

type Ue = { en?: string; tr: string; uk: string; ar: string; ru: string; ls?: string };

const TITEL: Record<string, Ue> = {
  "hund-anmelden": { tr: "Köpek kaydı", uk: "Зареєструвати собаку", ar: "تسجيل كلب", ru: "Зарегистрировать собаку", ls: "Hund anmelden" },
  "hund-abmelden": { tr: "Köpek kaydını silme", uk: "Зняти собаку з обліку", ar: "إلغاء تسجيل كلب", ru: "Снять собаку с учёта", ls: "Hund abmelden" },
  "wohnsitz-anmelden": { tr: "İkamet kaydı (taşınma)", uk: "Реєстрація місця проживання (переїзд)", ar: "تسجيل السكن (الانتقال)", ru: "Регистрация по месту жительства (переезд)", ls: "Sie ziehen um: Neue Adresse melden" },
  "wohnsitz-abmelden": { tr: "İkamet kaydını silme (yurt dışına taşınma)", uk: "Зняття з реєстрації (виїзд за кордон)", ar: "إلغاء تسجيل السكن (الانتقال إلى الخارج)", ru: "Снятие с регистрации (выезд за границу)", ls: "Sie ziehen ins Ausland: Abmelden" },
  namensaenderung: { en: "Change of name", tr: "İsim değişikliği", uk: "Зміна імені", ar: "تغيير الاسم", ru: "Изменение имени", ls: "Namen ändern" },
  personalausweis: { tr: "Kimlik kartı başvurusu", uk: "Оформити посвідчення особи", ar: "طلب بطاقة الهوية", ru: "Оформить удостоверение личности", ls: "Neuen Personal-Ausweis beantragen" },
  reisepass: { tr: "Pasaport başvurusu", uk: "Оформити паспорт", ar: "طلب جواز سفر", ru: "Оформить заграничный паспорт", ls: "Reise-Pass beantragen" },
  meldebescheinigung: { tr: "İkamet belgesi", uk: "Довідка про реєстрацію", ar: "شهادة تسجيل السكن", ru: "Справка о регистрации", ls: "Bescheinigung über Ihre Adresse" },
  geburtsurkunde: { tr: "Doğum belgesi talebi", uk: "Замовити свідоцтво про народження", ar: "طلب شهادة ميلاد", ru: "Заказать свидетельство о рождении", ls: "Geburts-Urkunde bestellen" },
  fuehrungszeugnis: { en: "Certificate of good conduct", tr: "Sabıka kaydı belgesi", uk: "Довідка про несудимість", ar: "شهادة حسن السيرة والسلوك", ru: "Справка о несудимости", ls: "Führungs-Zeugnis beantragen" },
  "gewerbe-anmelden": { tr: "İşyeri kaydı", uk: "Зареєструвати підприємницьку діяльність", ar: "تسجيل نشاط تجاري", ru: "Зарегистрировать предпринимательскую деятельность", ls: "Eigene Firma anmelden" },
  "gewerbe-abmelden": { tr: "İşyeri kaydını silme", uk: "Припинити підприємницьку діяльність", ar: "إلغاء تسجيل نشاط تجاري", ru: "Прекратить предпринимательскую деятельность", ls: "Eigene Firma abmelden" },
  halteverbot: { tr: "Taşınma veya inşaat için park yasağı", uk: "Тимчасова заборона стоянки", ar: "منع وقوف مؤقت للانتقال أو البناء", ru: "Временный запрет стоянки", ls: "Park-Verbot für den Umzug" },
  bewohnerparkausweis: { tr: "Sakin park kartı", uk: "Паркувальний дозвіл для мешканців", ar: "تصريح وقوف للسكان", ru: "Парковочное разрешение для жителей", ls: "Park-Ausweis für Anwohner" },
  sperrmuell: { tr: "Büyük eşya atığı", uk: "Вивезення великогабаритного сміття", ar: "طلب إزالة النفايات الضخمة", ru: "Вывоз крупногабаритного мусора", ls: "Sperr-Müll: Große Sachen abholen lassen" },
  muelltonne: { tr: "Çöp kutusu siparişi veya değişimi", uk: "Замовити або замінити сміттєвий бак", ar: "طلب أو تغيير حاوية النفايات", ru: "Заказать или заменить мусорный бак", ls: "Müll-Tonne bestellen oder tauschen" },
  lastschrift: { tr: "Otomatik ödeme talimatı", uk: "Прямий дебет / змінити банківські реквізити", ar: "الخصم المباشر أو تغيير الحساب البنكي", ru: "Прямое списание / изменить банковские реквизиты", ls: "Geld vom Konto abbuchen lassen" },
  uebermittlungssperre: { tr: "Verilerimin aktarılmasına itiraz", uk: "Заборона передачі моїх даних", ar: "الاعتراض على نقل بياناتي", ru: "Запрет на передачу моих данных", ls: "Ihre Daten nicht weitergeben" },
  melderegisterauskunft: { tr: "Adres sorgusu", uk: "Довідка з реєстру (адреса особи)", ar: "استعلام عن عنوان شخص", ru: "Справка из регистра (адрес человека)", ls: "Adresse von einer Person erfragen" },
  "ausweis-verlust": { tr: "Kimlik kayıp veya çalındı", uk: "Документ втрачено або викрадено", ar: "فقدان أو سرقة الهوية", ru: "Документ утерян или украден", ls: "Ausweis verloren oder gestohlen" },
  eheschliessung: { tr: "Evlilik başvurusu", uk: "Подати заяву на шлюб", ar: "تسجيل الزواج", ru: "Подать заявление на брак", ls: "Heiraten: Beim Standes-Amt anmelden" },
  sterbefall: { tr: "Ölüm kaydı", uk: "Реєстрація смерті", ar: "تسجيل الوفاة", ru: "Регистрация смерти", ls: "Jemand ist gestorben" },
  "kita-anmeldung": { tr: "Kreş başvurusu", uk: "Записати дитину до садочка", ar: "التسجيل في حضانة الأطفال", ru: "Записать ребёнка в детский сад", ls: "Platz im Kinder-Garten anmelden" },
  "buecherei-ausweis": { tr: "Kütüphane kartı", uk: "Читацький квиток", ar: "بطاقة المكتبة", ru: "Читательский билет", ls: "Ausweis für die Bücherei" },
  "raum-buchen": { tr: "Toplum merkezinde salon kiralama", uk: "Орендувати приміщення", ar: "حجز قاعة في المركز المجتمعي", ru: "Арендовать помещение", ls: "Raum im Bürger-Haus mieten" },
  vereinsfoerderung: { tr: "Dernekler için destek", uk: "Підтримка для об'єднань", ar: "دعم الجمعيات", ru: "Поддержка для объединений", ls: "Geld für Vereine" },
  bauantrag: { tr: "Yapı ruhsatı başvurusu", uk: "Дозвіл на будівництво", ar: "طلب رخصة بناء", ru: "Разрешение на строительство", ls: "Bauen: Erlaubnis beantragen" },
  wohngeld: { tr: "Kira yardımı", uk: "Житлова допомога", ar: "إعانة السكن", ru: "Жилищное пособие", ls: "Geld für die Miete" },
  "kfz-zulassung": { tr: "Araç kaydı", uk: "Реєстрація автомобіля", ar: "تسجيل السيارة", ru: "Регистрация автомобиля", ls: "Auto anmelden, ummelden oder abmelden" },
  schwerbehindertenausweis: { en: "Disability card", tr: "Ağır engelli kimlik kartı", uk: "Посвідчення особи з інвалідністю", ar: "بطاقة ذوي الإعاقة الشديدة", ru: "Удостоверение инвалида", ls: "Ausweis für Menschen mit Behinderung" },
};

/** Kurztexte in Leichter Sprache für die häufigsten Anliegen */
const KURZ_LS: Record<string, string> = {
  "hund-anmelden": "Sie haben einen Hund? Dann müssen Sie ihn bei der Stadt anmelden. Sie bezahlen dafür Hunde-Steuer. Sie bekommen eine Marke für das Hals-Band.",
  "wohnsitz-anmelden": "Sie sind umgezogen? Dann müssen Sie Ihre neue Adresse melden. Das müssen Sie in 2 Wochen machen.",
  personalausweis: "Ihr Ausweis ist bald ungültig? Dann brauchen Sie einen neuen. Dafür müssen Sie ins Rathaus kommen. Bringen Sie ein Foto mit.",
  reisepass: "Sie wollen verreisen? Für manche Länder brauchen Sie einen Reise-Pass. Dafür müssen Sie ins Rathaus kommen.",
  meldebescheinigung: "Manchmal müssen Sie zeigen: Hier wohne ich. Dafür gibt es die Melde-Bescheinigung. Sie können sie im Internet bestellen.",
  sperrmuell: "Sie haben große Sachen, die Sie nicht mehr brauchen? Zum Beispiel ein altes Sofa. Wir holen die Sachen bei Ihnen ab.",
  "ausweis-verlust": "Ihr Ausweis ist weg? Sagen Sie es uns schnell. Rufen Sie auch diese Nummer an: 116 116. Dann kann niemand Ihren Ausweis benutzen.",
  wohngeld: "Ihre Miete ist zu teuer für Sie? Vielleicht bekommen Sie Geld dazu. Das heißt Wohn-Geld.",
};

function mit(text: LText, extra: Partial<Record<"en" | "tr" | "uk" | "ar" | "ru" | "ls", string>>): LText {
  const basis = typeof text === "string" ? { de: text } : text;
  return { ...basis, ...Object.fromEntries(Object.entries(extra).filter(([k, v]) => v && !(k in basis))) };
}

export function uebersetze(leistungen: Leistung[]): Leistung[] {
  return leistungen.map((l) => {
    const t = TITEL[l.id];
    return {
      ...l,
      titel: t ? mit(l.titel, t) : l.titel,
      kurz: KURZ_LS[l.id] ? mit(l.kurz, { ls: KURZ_LS[l.id] }) : l.kurz,
    };
  });
}

export const TEXTE = {
  untertitel: {
    de: "Bürgerservice online",
    ls: "Das Rathaus im Internet",
    en: "Online citizen services",
    tr: "Online vatandaş hizmetleri",
    uk: "Онлайн-послуги для громадян",
    ar: "خدمات المواطنين عبر الإنترنت",
    ru: "Онлайн-услуги для граждан",
  },
  platzhalter: {
    de: "Wie kann ich Ihnen helfen?",
    ls: "Was möchten Sie?",
    en: "How can I help you?",
    tr: "Size nasıl yardımcı olabilirim?",
    uk: "Чим я можу допомогти?",
    ar: "كيف يمكنني مساعدتك؟",
    ru: "Чем я могу помочь?",
  },
  begruessung: {
    de: "Guten Tag. Beschreiben Sie Ihr Anliegen in einem Satz – ich zeige Ihnen den Weg.",
    ls: "Guten Tag. Schreiben Sie hier, was Sie möchten. Ich helfe Ihnen.",
    en: "Hello. Describe your request in one sentence – I will show you the way.",
    tr: "Merhaba. Talebinizi bir cümleyle yazın – size yolu göstereyim.",
    uk: "Добрий день. Опишіть своє звернення одним реченням – я підкажу, що робити.",
    ar: "مرحباً. صف طلبك في جملة واحدة – وسأرشدك إلى الطريق.",
    ru: "Здравствуйте. Опишите ваше обращение одним предложением – я подскажу, что делать.",
  },
} satisfies Record<string, LText>;
