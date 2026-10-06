/** Interface language. Book titles in the TOC stay in the edition's language. */

const KEY = "lsb-ui-lang";

const STR = {
  fr: {
    mass: "Messe du jour",
    compare: "comparer",
    suggestions: "suggestions de lecture",
    kindSyn: "suggestions synoptiques",
    kindVt: "suggestions vétérotestamentaires",
    kindAc: "accomplissement",
    closeCol: "Fermer la colonne",
    manuscript: "Manuscrit",
    chapters: "Chapitres",
    chapter: "Chapitre {n}",
    prevDay: "Jour précédent",
    nextDay: "Jour suivant",
    massDate: "Date de la messe",
    language: "Langue",
    settings: "Paramètres",
    empty: "Aucun livre dans ce testament pour cette version.",
    gospel: "Évangile",
    psalm: "Psaume",
    firstReading: "Première lecture",
    reading: "Lecture",
    noReadings: "Aucune lecture à afficher pour ce jour.",
  },
  en: {
    mass: "Mass of the day",
    compare: "compare",
    suggestions: "reading suggestions",
    kindSyn: "synoptic suggestions",
    kindVt: "Old Testament suggestions",
    kindAc: "fulfillment",
    closeCol: "Close the column",
    manuscript: "Manuscript",
    chapters: "Chapters",
    chapter: "Chapter {n}",
    prevDay: "Previous day",
    nextDay: "Next day",
    massDate: "Mass date",
    language: "Language",
    settings: "Settings",
    empty: "No book in this testament for this version.",
    gospel: "Gospel",
    psalm: "Psalm",
    firstReading: "First reading",
    reading: "Reading",
    noReadings: "No reading for this day.",
  },
  de: {
    mass: "Messe des Tages",
    compare: "vergleichen",
    suggestions: "Lesevorschläge",
    kindSyn: "synoptische Vorschläge",
    kindVt: "alttestamentliche Vorschläge",
    kindAc: "Erfüllung",
    closeCol: "Spalte schließen",
    manuscript: "Handschrift",
    chapters: "Kapitel",
    chapter: "Kapitel {n}",
    prevDay: "Vorheriger Tag",
    nextDay: "Nächster Tag",
    massDate: "Datum der Messe",
    language: "Sprache",
    settings: "Einstellungen",
    empty: "Kein Buch in diesem Testament für diese Fassung.",
    gospel: "Evangelium",
    psalm: "Psalm",
    firstReading: "Erste Lesung",
    reading: "Lesung",
    noReadings: "Keine Lesung für diesen Tag.",
  },
  es: {
    mass: "Misa del día",
    compare: "comparar",
    suggestions: "sugerencias de lectura",
    kindSyn: "sugerencias sinópticas",
    kindVt: "sugerencias veterotestamentarias",
    kindAc: "cumplimiento",
    closeCol: "Cerrar la columna",
    manuscript: "Manuscrito",
    chapters: "Capítulos",
    chapter: "Capítulo {n}",
    prevDay: "Día anterior",
    nextDay: "Día siguiente",
    massDate: "Fecha de la misa",
    language: "Idioma",
    settings: "Ajustes",
    empty: "Ningún libro en este testamento para esta versión.",
    gospel: "Evangelio",
    psalm: "Salmo",
    firstReading: "Primera lectura",
    reading: "Lectura",
    noReadings: "Ninguna lectura para este día.",
  },
  it: {
    mass: "Messa del giorno",
    compare: "confronta",
    suggestions: "suggerimenti di lettura",
    kindSyn: "suggerimenti sinottici",
    kindVt: "suggerimenti veterotestamentari",
    kindAc: "compimento",
    closeCol: "Chiudi la colonna",
    manuscript: "Manoscritto",
    chapters: "Capitoli",
    chapter: "Capitolo {n}",
    prevDay: "Giorno precedente",
    nextDay: "Giorno seguente",
    massDate: "Data della messa",
    language: "Lingua",
    settings: "Impostazioni",
    empty: "Nessun libro in questo testamento per questa versione.",
    gospel: "Vangelo",
    psalm: "Salmo",
    firstReading: "Prima lettura",
    reading: "Lettura",
    noReadings: "Nessuna lettura per questo giorno.",
  },
  pt: {
    mass: "Missa do dia",
    compare: "comparar",
    suggestions: "sugestões de leitura",
    kindSyn: "sugestões sinóticas",
    kindVt: "sugestões veterotestamentárias",
    kindAc: "cumprimento",
    closeCol: "Fechar a coluna",
    manuscript: "Manuscrito",
    chapters: "Capítulos",
    chapter: "Capítulo {n}",
    prevDay: "Dia anterior",
    nextDay: "Dia seguinte",
    massDate: "Data da missa",
    language: "Língua",
    settings: "Definições",
    empty: "Nenhum livro neste testamento para esta versão.",
    gospel: "Evangelho",
    psalm: "Salmo",
    firstReading: "Primeira leitura",
    reading: "Leitura",
    noReadings: "Nenhuma leitura para este dia.",
  },
  nl: {
    mass: "Mis van de dag",
    compare: "vergelijken",
    suggestions: "leessuggesties",
    kindSyn: "synoptische suggesties",
    kindVt: "oudtestamentische suggesties",
    kindAc: "vervulling",
    closeCol: "Kolom sluiten",
    manuscript: "Handschrift",
    chapters: "Hoofdstukken",
    chapter: "Hoofdstuk {n}",
    prevDay: "Vorige dag",
    nextDay: "Volgende dag",
    massDate: "Datum van de mis",
    language: "Taal",
    settings: "Instellingen",
    empty: "Geen boek in dit testament voor deze versie.",
    gospel: "Evangelie",
    psalm: "Psalm",
    firstReading: "Eerste lezing",
    reading: "Lezing",
    noReadings: "Geen lezing voor deze dag.",
  },
  sv: {
    mass: "Dagens mässa",
    compare: "jämför",
    suggestions: "läsförslag",
    kindSyn: "synoptiska förslag",
    kindVt: "gammaltestamentliga förslag",
    kindAc: "uppfyllelse",
    closeCol: "Stäng kolumnen",
    manuscript: "Handskrift",
    chapters: "Kapitel",
    chapter: "Kapitel {n}",
    prevDay: "Föregående dag",
    nextDay: "Nästa dag",
    massDate: "Mässans datum",
    language: "Språk",
    settings: "Inställningar",
    empty: "Ingen bok i detta testamente för denna version.",
    gospel: "Evangelium",
    psalm: "Psalm",
    firstReading: "Första läsningen",
    reading: "Läsning",
    noReadings: "Ingen läsning för denna dag.",
  },
  no: {
    mass: "Dagens messe",
    compare: "sammenlign",
    suggestions: "leseforslag",
    kindSyn: "synoptiske forslag",
    kindVt: "gammaltestamentlege forslag",
    kindAc: "oppfylling",
    closeCol: "Lukk kolonnen",
    manuscript: "Handskrift",
    chapters: "Kapitler",
    chapter: "Kapittel {n}",
    prevDay: "Forrige dag",
    nextDay: "Neste dag",
    massDate: "Dato for messen",
    language: "Språk",
    settings: "Innstillinger",
    empty: "Ingen bok i dette testamentet for denne versjonen.",
    gospel: "Evangelium",
    psalm: "Salme",
    firstReading: "Første lesning",
    reading: "Lesning",
    noReadings: "Ingen lesning for denne dagen.",
  },
  fi: {
    mass: "Päivän messu",
    compare: "vertaa",
    suggestions: "lukuehdotukset",
    kindSyn: "synoptiset ehdotukset",
    kindVt: "vanhan testamentin ehdotukset",
    kindAc: "täyttymys",
    closeCol: "Sulje sarake",
    manuscript: "Käsikirjoitus",
    chapters: "Luvut",
    chapter: "Luku {n}",
    prevDay: "Edellinen päivä",
    nextDay: "Seuraava päivä",
    massDate: "Messun päivä",
    language: "Kieli",
    settings: "Asetukset",
    empty: "Ei kirjaa tässä testamentissa tälle käännökselle.",
    gospel: "Evankeliumi",
    psalm: "Psalmi",
    firstReading: "Ensimmäinen lukukappale",
    reading: "Lukukappale",
    noReadings: "Ei lukukappaletta tälle päivälle.",
  },
  hu: {
    mass: "A nap miséje",
    compare: "összevetés",
    suggestions: "olvasási javaslatok",
    kindSyn: "szinoptikus javaslatok",
    kindVt: "ószövetségi javaslatok",
    kindAc: "beteljesedés",
    closeCol: "Oszlop bezárása",
    manuscript: "Kézirat",
    chapters: "Fejezetek",
    chapter: "{n}. fejezet",
    prevDay: "Előző nap",
    nextDay: "Következő nap",
    massDate: "A mise napja",
    language: "Nyelv",
    settings: "Beállítások",
    empty: "Nincs könyv ebben a szövetségben ehhez a változathoz.",
    gospel: "Evangélium",
    psalm: "Zsoltár",
    firstReading: "Első olvasmány",
    reading: "Olvasmány",
    noReadings: "Nincs olvasmány erre a napra.",
  },
  cs: {
    mass: "Mše dne",
    compare: "porovnat",
    suggestions: "návrhy četby",
    kindSyn: "synoptické návrhy",
    kindVt: "starozákonní návrhy",
    kindAc: "naplnění",
    closeCol: "Zavřít sloupec",
    manuscript: "Rukopis",
    chapters: "Kapitoly",
    chapter: "Kapitola {n}",
    prevDay: "Předchozí den",
    nextDay: "Následující den",
    massDate: "Datum mše",
    language: "Jazyk",
    settings: "Nastavení",
    empty: "V tomto zákoně není pro tuto verzi žádná kniha.",
    gospel: "Evangelium",
    psalm: "Žalm",
    firstReading: "První čtení",
    reading: "Čtení",
    noReadings: "Pro tento den není čtení.",
  },
  sr: {
    mass: "Misa dana",
    compare: "uporedi",
    suggestions: "predlozi za čitanje",
    kindSyn: "sinoptički predlozi",
    kindVt: "starozavetni predlozi",
    kindAc: "ispunjenje",
    closeCol: "Zatvori stubac",
    manuscript: "Rukopis",
    chapters: "Poglavlja",
    chapter: "Poglavlje {n}",
    prevDay: "Prethodni dan",
    nextDay: "Sledeći dan",
    massDate: "Datum mise",
    language: "Jezik",
    settings: "Podešavanja",
    empty: "Nema knjige u ovom zavetu za ovu verziju.",
    gospel: "Jevanđelje",
    psalm: "Psalam",
    firstReading: "Prvo čitanje",
    reading: "Čitanje",
    noReadings: "Nema čitanja za ovaj dan.",
  },
  ru: {
    mass: "Месса дня",
    compare: "сравнить",
    suggestions: "предложения для чтения",
    kindSyn: "синоптические предложения",
    kindVt: "ветхозаветные предложения",
    kindAc: "исполнение",
    closeCol: "Закрыть столбец",
    manuscript: "Рукопись",
    chapters: "Главы",
    chapter: "Глава {n}",
    prevDay: "Предыдущий день",
    nextDay: "Следующий день",
    massDate: "Дата мессы",
    language: "Язык",
    settings: "Настройки",
    empty: "В этом завете нет книги для этой версии.",
    gospel: "Евангелие",
    psalm: "Псалом",
    firstReading: "Первое чтение",
    reading: "Чтение",
    noReadings: "Нет чтений на этот день.",
  },
  el: {
    mass: "Λειτουργία της ημέρας",
    compare: "σύγκριση",
    suggestions: "προτάσεις ανάγνωσης",
    kindSyn: "συνοπτικές προτάσεις",
    kindVt: "προτάσεις Παλαιάς Διαθήκης",
    kindAc: "εκπλήρωση",
    closeCol: "Κλείσιμο στήλης",
    manuscript: "Χειρόγραφο",
    chapters: "Κεφάλαια",
    chapter: "Κεφάλαιο {n}",
    prevDay: "Προηγούμενη ημέρα",
    nextDay: "Επόμενη ημέρα",
    massDate: "Ημερομηνία λειτουργίας",
    language: "Γλώσσα",
    settings: "Ρυθμίσεις",
    empty: "Κανένα βιβλίο σε αυτή τη διαθήκη για αυτή την έκδοση.",
    gospel: "Ευαγγέλιο",
    psalm: "Ψαλμός",
    firstReading: "Πρώτο ανάγνωσμα",
    reading: "Ανάγνωσμα",
    noReadings: "Κανένα ανάγνωσμα για αυτή την ημέρα.",
  },
  la: {
    mass: "Missa diei",
    compare: "compara",
    suggestions: "suggestiones lectionis",
    kindSyn: "suggestiones synopticae",
    kindVt: "suggestiones Veteris Testamenti",
    kindAc: "impletio",
    closeCol: "Claude columnam",
    manuscript: "Manuscriptum",
    chapters: "Capita",
    chapter: "Caput {n}",
    prevDay: "Dies prior",
    nextDay: "Dies posterior",
    massDate: "Dies missae",
    language: "Lingua",
    settings: "Optiones",
    empty: "Nullus liber in hoc testamento pro hac versione.",
    gospel: "Evangelium",
    psalm: "Psalmus",
    firstReading: "Lectio prima",
    reading: "Lectio",
    noReadings: "Nulla lectio hoc die.",
  },
  he: {
    mass: "מיסת היום",
    compare: "השוואה",
    suggestions: "הצעות קריאה",
    kindSyn: "הצעות סינופטיות",
    kindVt: "הצעות מן המקרא",
    kindAc: "התגשמות",
    closeCol: "סגור את הטור",
    manuscript: "כתב יד",
    chapters: "פרקים",
    chapter: "פרק {n}",
    prevDay: "היום הקודם",
    nextDay: "היום הבא",
    massDate: "תאריך המיסה",
    language: "שפה",
    settings: "הגדרות",
    empty: "אין ספר בברית זו לגרסה זו.",
    gospel: "בשורה",
    psalm: "מזמור",
    firstReading: "קריאה ראשונה",
    reading: "קריאה",
    noReadings: "אין קריאה ליום זה.",
  },
  ar: {
    mass: "قداس اليوم",
    compare: "قارن",
    suggestions: "اقتراحات القراءة",
    kindSyn: "اقتراحات إزائية",
    kindVt: "اقتراحات من العهد القديم",
    kindAc: "تحقيق",
    closeCol: "إغلاق العمود",
    manuscript: "مخطوط",
    chapters: "الإصحاحات",
    chapter: "الإصحاح {n}",
    prevDay: "اليوم السابق",
    nextDay: "اليوم التالي",
    massDate: "تاريخ القداس",
    language: "اللغة",
    settings: "الإعدادات",
    empty: "لا كتاب في هذا العهد لهذه الترجمة.",
    gospel: "إنجيل",
    psalm: "مزمور",
    firstReading: "القراءة الأولى",
    reading: "قراءة",
    noReadings: "لا قراءة لهذا اليوم.",
  },
  zh: {
    mass: "本日弥撒",
    compare: "对照",
    suggestions: "阅读建议",
    kindSyn: "对观建议",
    kindVt: "旧约建议",
    kindAc: "应验",
    closeCol: "关闭此栏",
    manuscript: "抄本",
    chapters: "章",
    chapter: "第{n}章",
    prevDay: "前一天",
    nextDay: "后一天",
    massDate: "弥撒日期",
    language: "语言",
    settings: "设置",
    empty: "此译本在这一约中没有书卷。",
    gospel: "福音",
    psalm: "诗篇",
    firstReading: "第一读经",
    reading: "读经",
    noReadings: "这一天没有读经。",
  },
  ja: {
    mass: "本日のミサ",
    compare: "対訳",
    suggestions: "朗読の提案",
    kindSyn: "共観の提案",
    kindVt: "旧約の提案",
    kindAc: "成就",
    closeCol: "列を閉じる",
    manuscript: "写本",
    chapters: "章",
    chapter: "第{n}章",
    prevDay: "前日",
    nextDay: "翌日",
    massDate: "ミサの日付",
    language: "言語",
    settings: "設定",
    empty: "この約には、この訳の書がありません。",
    gospel: "福音書",
    psalm: "詩編",
    firstReading: "第一朗読",
    reading: "朗読",
    noReadings: "この日の朗読はありません。",
  },
  tl: {
    mass: "Misa ng araw",
    compare: "ihambing",
    suggestions: "mungkahi sa pagbasa",
    kindSyn: "mungkahing sinoptiko",
    kindVt: "mungkahi mula sa Lumang Tipan",
    kindAc: "katuparan",
    closeCol: "Isara ang hanay",
    manuscript: "Manuskrito",
    chapters: "Mga kabanata",
    chapter: "Kabanata {n}",
    prevDay: "Nakaraang araw",
    nextDay: "Susunod na araw",
    massDate: "Petsa ng misa",
    language: "Wika",
    settings: "Mga setting",
    empty: "Walang aklat sa tipang ito para sa bersiyong ito.",
    gospel: "Ebanghelyo",
    psalm: "Awit",
    firstReading: "Unang pagbasa",
    reading: "Pagbasa",
    noReadings: "Walang pagbasa para sa araw na ito.",
  },
};

const NAMES = {
  fr: "Français",
  en: "English",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
  no: "Norsk",
  fi: "Suomi",
  hu: "Magyar",
  cs: "Čeština",
  sr: "Srpski",
  ru: "Русский",
  el: "Ελληνικά",
  la: "Latina",
  he: "עברית",
  ar: "العربية",
  zh: "中文",
  ja: "日本語",
  tl: "Tagalog",
};

const INTL = {
  fr: "fr-FR",
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  sv: "sv-SE",
  no: "nb-NO",
  fi: "fi-FI",
  hu: "hu-HU",
  cs: "cs-CZ",
  sr: "sr-Latn",
  ru: "ru-RU",
  el: "el-GR",
  la: "la",
  he: "he-IL",
  ar: "ar",
  zh: "zh-CN",
  ja: "ja-JP",
  tl: "fil",
};

const ORDER = Object.keys(NAMES);

const BRAND = {
  fr: "La Sainte Bible",
  en: "The Holy Bible",
  de: "Die Heilige Bibel",
  es: "La Santa Biblia",
  it: "La Sacra Bibbia",
  pt: "A Bíblia Sagrada",
  nl: "De Heilige Bijbel",
  sv: "Den Heliga Bibeln",
  no: "Den hellige Bibelen",
  fi: "Pyhä Raamattu",
  hu: "A Szent Biblia",
  cs: "Svatá bible",
  sr: "Sveta Biblija",
  ru: "Священная Библия",
  el: "Η Αγία Γραφή",
  la: "Biblia Sacra",
  he: "הביבליה הקדושה",
  ar: "الكتاب المقدس",
  zh: "圣经",
  ja: "聖書",
  tl: "Ang Banal na Bibliya",
};

const VERSE = {
  fr: {
    one: "verset {n}",
    two: "verset {a} et {b}",
    many: "versets {list} et {last}",
    mixed: "versets {list}",
    open: "{n} et suivants",
    span: "{a} à {b}",
    chap: "Chap. {n}",
  },
  en: {
    one: "verse {n}",
    two: "verses {a} and {b}",
    many: "verses {list} and {last}",
    mixed: "verses {list}",
    open: "{n} ff.",
    span: "{a}–{b}",
    chap: "Ch. {n}",
  },
  de: {
    one: "Vers {n}",
    two: "Verse {a} und {b}",
    many: "Verse {list} und {last}",
    mixed: "Verse {list}",
    open: "{n} ff.",
    span: "{a}–{b}",
    chap: "Kap. {n}",
  },
  es: {
    one: "versículo {n}",
    two: "versículos {a} y {b}",
    many: "versículos {list} y {last}",
    mixed: "versículos {list}",
    open: "{n} y siguientes",
    span: "{a} a {b}",
    chap: "Cap. {n}",
  },
  it: {
    one: "versetto {n}",
    two: "versetti {a} e {b}",
    many: "versetti {list} e {last}",
    mixed: "versetti {list}",
    open: "{n} e seguenti",
    span: "{a}–{b}",
    chap: "Cap. {n}",
  },
  pt: {
    one: "versículo {n}",
    two: "versículos {a} e {b}",
    many: "versículos {list} e {last}",
    mixed: "versículos {list}",
    open: "{n} e seguintes",
    span: "{a} a {b}",
    chap: "Cap. {n}",
  },
  nl: {
    one: "vers {n}",
    two: "verzen {a} en {b}",
    many: "verzen {list} en {last}",
    mixed: "verzen {list}",
    open: "{n} en volgende",
    span: "{a}–{b}",
    chap: "Hfdst. {n}",
  },
  sv: {
    one: "vers {n}",
    two: "verserna {a} och {b}",
    many: "verserna {list} och {last}",
    mixed: "verserna {list}",
    open: "{n} och följande",
    span: "{a}–{b}",
    chap: "Kap. {n}",
  },
  no: {
    one: "vers {n}",
    two: "vers {a} og {b}",
    many: "versene {list} og {last}",
    mixed: "versene {list}",
    open: "{n} og følgende",
    span: "{a}–{b}",
    chap: "Kap. {n}",
  },
  fi: {
    one: "jae {n}",
    two: "jakeet {a} ja {b}",
    many: "jakeet {list} ja {last}",
    mixed: "jakeet {list}",
    open: "{n} ja seuraavat",
    span: "{a}–{b}",
    chap: "Luku {n}",
  },
  hu: {
    one: "{n}. vers",
    two: "{a}. és {b}. vers",
    many: "{list}. és {last}. vers",
    mixed: "{list}. vers",
    open: "{n}. verstől",
    span: "{a}–{b}. vers",
    chap: "{n}. fejezet",
  },
  cs: {
    one: "verš {n}",
    two: "verše {a} a {b}",
    many: "verše {list} a {last}",
    mixed: "verše {list}",
    open: "{n} a následující",
    span: "{a}–{b}",
    chap: "Kap. {n}",
  },
  sr: {
    one: "stih {n}",
    two: "stihovi {a} i {b}",
    many: "stihovi {list} i {last}",
    mixed: "stihovi {list}",
    open: "{n} i dalje",
    span: "{a}–{b}",
    chap: "Gl. {n}",
  },
  ru: {
    one: "стих {n}",
    two: "стихи {a} и {b}",
    many: "стихи {list} и {last}",
    mixed: "стихи {list}",
    open: "{n} и далее",
    span: "{a}–{b}",
    chap: "Гл. {n}",
  },
  el: {
    one: "στίχος {n}",
    two: "στίχοι {a} και {b}",
    many: "στίχοι {list} και {last}",
    mixed: "στίχοι {list}",
    open: "{n} κ.εξ.",
    span: "{a}–{b}",
    chap: "Κεφ. {n}",
  },
  la: {
    one: "versus {n}",
    two: "versus {a} et {b}",
    many: "versus {list} et {last}",
    mixed: "versus {list}",
    open: "{n} et seq.",
    span: "{a}–{b}",
    chap: "Cap. {n}",
  },
  he: {
    one: "פסוק {n}",
    two: "פסוקים {a} ו־{b}",
    many: "פסוקים {list} ו־{last}",
    mixed: "פסוקים {list}",
    open: "{n} ואילך",
    span: "{a}–{b}",
    chap: "פרק {n}",
  },
  ar: {
    one: "الآية {n}",
    two: "الآيتان {a} و{b}",
    many: "الآيات {list} و{last}",
    mixed: "الآيات {list}",
    open: "{n} وما يليه",
    span: "{a}–{b}",
    chap: "الإصحاح {n}",
  },
  zh: {
    one: "第{n}节",
    two: "第{a}、{b}节",
    many: "第{list}、{last}节",
    mixed: "{list}",
    open: "第{n}节及以下",
    span: "第{a}–{b}节",
    chap: "第{n}章",
  },
  ja: {
    one: "第{n}節",
    two: "第{a}・{b}節",
    many: "第{list}・{last}節",
    mixed: "{list}",
    open: "第{n}節以下",
    span: "第{a}–{b}節",
    chap: "第{n}章",
  },
  tl: {
    one: "talata {n}",
    two: "mga talata {a} at {b}",
    many: "mga talata {list} at {last}",
    mixed: "mga talata {list}",
    open: "{n} at mga sumusunod",
    span: "{a}–{b}",
    chap: "Kabanata {n}",
  },
};

function fillPhrase(template, vars) {
  let s = template;
  for (const [k, v] of Object.entries(vars || {})) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function versePhrase(kind, vars) {
  const pack = VERSE[getUiLang()] || VERSE.fr;
  const template = pack[kind] || VERSE.fr[kind] || "";
  return fillPhrase(template, vars);
}

const OTHERS = {
  fr: "autres",
  en: "others",
  de: "andere",
  es: "otras",
  it: "altre",
  pt: "outras",
  nl: "andere",
  sv: "andra",
  no: "andre",
  fi: "muut",
  hu: "mások",
  cs: "ostatní",
  sr: "ostale",
  ru: "другие",
  el: "άλλες",
  la: "aliae",
  he: "אחרות",
  ar: "أخرى",
  zh: "其他",
  ja: "その他",
  tl: "iba pa",
};

const SECTIONS = {
  fr: ["Pentateuque", "Livres historiques", "Livres poétiques", "Prophètes", "Évangiles", "Actes", "Épîtres", "Apocalypse"],
  en: ["Pentateuch", "Historical books", "Poetic books", "Prophets", "Gospels", "Acts", "Epistles", "Revelation"],
  de: ["Pentateuch", "Geschichtsbücher", "Poetische Bücher", "Propheten", "Evangelien", "Apostelgeschichte", "Briefe", "Offenbarung"],
  es: ["Pentateuco", "Libros históricos", "Libros poéticos", "Profetas", "Evangelios", "Hechos", "Epístolas", "Apocalipsis"],
  it: ["Pentateuco", "Libri storici", "Libri poetici", "Profeti", "Vangeli", "Atti", "Lettere", "Apocalisse"],
  pt: ["Pentateuco", "Livros históricos", "Livros poéticos", "Profetas", "Evangelhos", "Atos", "Epístolas", "Apocalipse"],
  nl: ["Pentateuch", "Historische boeken", "Poëtische boeken", "Profeten", "Evangeliën", "Handelingen", "Brieven", "Openbaring"],
  sv: ["Pentateuken", "Historiska böcker", "Poetiska böcker", "Profeterna", "Evangelier", "Apostlagärningarna", "Breven", "Uppenbarelseboken"],
  no: ["Pentateuken", "Historiske bøker", "Poetiske bøker", "Profetene", "Evangeliene", "Apostlenes gjerninger", "Brev", "Åpenbaringen"],
  fi: ["Pentateukki", "Historialliset kirjat", "Runolliset kirjat", "Profeetat", "Evankeliumit", "Apostolien teot", "Kirjeet", "Ilmestyskirja"],
  hu: ["Pentateuchus", "Történeti könyvek", "Költői könyvek", "Próféták", "Evangéliumok", "Apostolok cselekedetei", "Levelek", "Jelenések"],
  cs: ["Pentateuch", "Historické knihy", "Básnické knihy", "Proroci", "Evangelia", "Skutky", "Listy", "Zjevení"],
  sr: ["Petoknjižje", "Istorijske knjige", "Poetske knjige", "Proroci", "Jevanđelja", "Dela", "Poslanice", "Otkrovenje"],
  ru: ["Пятикнижие", "Исторические книги", "Поэтические книги", "Пророки", "Евангелия", "Деяния", "Послания", "Откровение"],
  el: ["Πεντάτευχος", "Ιστορικά", "Ποιητικά", "Προφήτες", "Ευαγγέλια", "Πράξεις", "Επιστολές", "Αποκάλυψη"],
  la: ["Pentateuchus", "Libri historici", "Libri poetici", "Prophetae", "Evangelia", "Actus", "Epistulae", "Apocalypsis"],
  he: ["חמישה חומשי תורה", "ספרים היסטוריים", "ספרים שיריים", "נביאים", "בשורות", "מעשי השליחים", "איגרות", "חזון"],
  ar: ["الأسفار الخمسة", "الأسفار التاريخية", "الأسفار الشعرية", "الأنبياء", "الأناجيل", "أعمال الرسل", "الرسائل", "الرؤيا"],
  zh: ["摩西五经", "历史书", "诗歌书", "先知书", "福音书", "使徒行传", "书信", "启示录"],
  ja: ["モーセ五書", "歴史書", "詩文書", "預言書", "福音書", "使徒言行録", "書簡", "黙示録"],
  tl: ["Pentateuko", "Mga aklat pangkasaysayan", "Mga aklat patula", "Mga propeta", "Mga Ebanghelyo", "Mga Gawa", "Mga sulat", "Pahayag"],
};

const SECTION_IDS = [
  "pentateuque",
  "historiques",
  "poetiques",
  "prophetes",
  "evangiles",
  "actes",
  "epitres",
  "apocalypse",
];

// Sigla for suggestion bubbles. French stays BOOKS.short. Psalms use t("psalm").
const ABBR_LANGS = ["en", "de", "es", "it", "pt", "la", "ru", "zh"];
const ABBR_ROWS = `
genese Gen|1. Mose|Gn|Gen|Gn|Gn|Быт|创
exode Ex|2. Mose|Ex|Es|Ex|Ex|Исх|出
levitique Lev|3. Mose|Lv|Lv|Lv|Lv|Лев|利
nombres Num|4. Mose|Nm|Nm|Nm|Nm|Чис|民
deuteronome Deut|5. Mose|Dt|Dt|Dt|Dt|Втор|申
josue Josh|Jos|Jos|Gs|Js|Ios|Нав|书
juges Judg|Ri|Jue|Gdc|Jz|Idc|Суд|士
ruth Ruth|Rut|Rt|Rt|Rt|Rt|Руф|得
1-samuel 1 Sam|1. Sam|1 S|1 Sam|1 Sm|1 Reg|1 Цар|撒上
2-samuel 2 Sam|2. Sam|2 S|2 Sam|2 Sm|2 Reg|2 Цар|撒下
1-rois 1 Kgs|1. Kön|1 R|1 Re|1 Rs|3 Reg|3 Цар|王上
2-rois 2 Kgs|2. Kön|2 R|2 Re|2 Rs|4 Reg|4 Цар|王下
1-chroniques 1 Chr|1. Chr|1 Cr|1 Cr|1 Cr|1 Par|1 Пар|代上
2-chroniques 2 Chr|2. Chr|2 Cr|2 Cr|2 Cr|2 Par|2 Пар|代下
esdras Ezra|Esra|Esd|Esd|Ed|Esd|Езд|拉
nehemie Neh|Neh|Neh|Ne|Ne|Neh|Неем|尼
esther Esth|Est|Est|Est|Et|Est|Есф|斯
job Job|Hi|Job|Gb|Jó|Iob|Иов|伯
proverbes Prov|Spr|Pr|Pr|Pr|Prv|Прит|箴
ecclesiaste Eccl|Pred|Ec|Qo|Ecl|Ecl|Еккл|传
cantique Song|Hld|Ct|Ct|Ct|Ct|Песн|歌
esaie Isa|Jes|Is|Is|Is|Is|Ис|赛
jeremie Jer|Jer|Jr|Ger|Jr|Ier|Иер|耶
lamentations Lam|Klgl|Lm|Lam|Lm|Lam|Плач|哀
ezechiel Ezek|Hes|Ez|Ez|Ez|Ez|Иез|结
daniel Dan|Dan|Dn|Dn|Dn|Dn|Дан|但
osee Hos|Hos|Os|Os|Os|Os|Ос|何
joel Joel|Joel|Jl|Gl|Jl|Ioel|Иоил|珥
amos Amos|Am|Am|Am|Am|Am|Ам|摩
abdias Obad|Obd|Abd|Abd|Ab|Abd|Авд|俄
jonas Jonah|Jona|Jon|Gio|Jn|Ion|Иона|拿
michee Mic|Mich|Mi|Mi|Mq|Mi|Мих|弥
nahum Nah|Nah|Nah|Na|Na|Na|Наум|鸿
habacuc Hab|Hab|Hab|Ab|Hc|Hab|Авв|哈
sophonie Zeph|Zef|Sof|Sof|Sf|So|Соф|番
aggee Hag|Hag|Ag|Ag|Ag|Agg|Агг|该
zacharie Zech|Sach|Zac|Zc|Zc|Za|Зах|亚
malachie Mal|Mal|Mal|Ml|Ml|Mal|Мал|玛
tobie Tob|Tob|Tob|Tb|Tb|Tb|Тов|多
judith Jdt|Jdt|Jdt|Gdt|Jt|Idt|Иф|友
sagesse Wis|Weish|Sab|Sap|Sb|Sap|Прем|智
siracide Sir|Sir|Eclo|Sir|Eclo|Sir|Сир|德
baruch Bar|Bar|Bar|Bar|Bar|Bar|Вар|巴
1-maccabees 1 Macc|1. Makk|1 Mac|1 Mac|1 Mac|1 Mcc|1 Мак|马一
2-maccabees 2 Macc|2. Makk|2 Mac|2 Mac|2 Mac|2 Mcc|2 Мак|马二
3-maccabees 3 Macc|3. Makk|3 Mac|3 Mac|3 Mac|3 Mcc|3 Мак|马三
4-maccabees 4 Macc|4. Makk|4 Mac|4 Mac|4 Mac|4 Mcc|4 Мак|马四
matthieu Mt|Mt|Mt|Mt|Mt|Mt|Мф|太
marc Mk|Mk|Mc|Mc|Mc|Mc|Мк|可
luc Lk|Lk|Lc|Lc|Lc|Lc|Лк|路
jean Jn|Joh|Jn|Gv|Jo|Io|Ин|约
actes Acts|Apg|Hch|At|At|Act|Деян|徒
romains Rom|Röm|Rm|Rm|Rm|Rm|Рим|罗
1-corinthiens 1 Cor|1. Kor|1 Co|1 Cor|1 Cor|1 Cor|1 Кор|林前
2-corinthiens 2 Cor|2. Kor|2 Co|2 Cor|2 Cor|2 Cor|2 Кор|林后
galates Gal|Gal|Ga|Gal|Gl|Gal|Гал|加
ephesiens Eph|Eph|Ef|Ef|Ef|Eph|Еф|弗
philippiens Phil|Phil|Flp|Fil|Fp|Phlp|Флп|腓
colossiens Col|Kol|Col|Col|Cl|Col|Кол|西
1-thessaloniciens 1 Thess|1. Thess|1 Ts|1 Ts|1 Ts|1 Th|1 Фес|帖前
2-thessaloniciens 2 Thess|2. Thess|2 Ts|2 Ts|2 Ts|2 Th|2 Фес|帖后
1-timothee 1 Tim|1. Tim|1 Tm|1 Tm|1 Tm|1 Tm|1 Тим|提前
2-timothee 2 Tim|2. Tim|2 Tm|2 Tm|2 Tm|2 Tm|2 Тим|提后
tite Titus|Tit|Tit|Tt|Tt|Tt|Тит|多
philemon Phlm|Phlm|Flm|Fm|Fm|Phlm|Флм|门
hebreux Heb|Hebr|Heb|Eb|Hb|Hbr|Евр|来
jacques Jas|Jak|Stg|Gc|Tg|Iac|Иак|雅
1-pierre 1 Pet|1. Petr|1 P|1 Pt|1 Pe|1 Pt|1 Пет|彼前
2-pierre 2 Pet|2. Petr|2 P|2 Pt|2 Pe|2 Pt|2 Пет|彼后
1-jean 1 Jn|1. Joh|1 Jn|1 Gv|1 Jo|1 Io|1 Ин|约一
2-jean 2 Jn|2. Joh|2 Jn|2 Gv|2 Jo|2 Io|2 Ин|约二
3-jean 3 Jn|3. Joh|3 Jn|3 Gv|3 Jo|3 Io|3 Ин|约三
jude Jude|Jud|Jud|Gd|Jd|Iud|Иуд|犹
apocalypse Rev|Offb|Ap|Ap|Ap|Apc|Откр|启
`;

const ABBR = {};
for (const line of ABBR_ROWS.trim().split("\n")) {
  const trimmed = line.trim();
  const sp = trimmed.indexOf(" ");
  const id = trimmed.slice(0, sp);
  const cells = trimmed.slice(sp + 1).split("|");
  ABBR[id] = {};
  ABBR_LANGS.forEach((lang, i) => {
    ABBR[id][lang] = cells[i];
  });
}

const CANON = {
  fr: { protestant: "canon protestant", catholic: "canon catholique", orthodox: "canon orthodoxe", jewish: "canon hébraïque" },
  en: { protestant: "Protestant canon", catholic: "Catholic canon", orthodox: "Orthodox canon", jewish: "Hebrew canon" },
  de: { protestant: "protestantischer Kanon", catholic: "katholischer Kanon", orthodox: "orthodoxer Kanon", jewish: "hebräischer Kanon" },
  es: { protestant: "canon protestante", catholic: "canon católico", orthodox: "canon ortodoxo", jewish: "canon hebreo" },
  it: { protestant: "canone protestante", catholic: "canone cattolico", orthodox: "canone ortodosso", jewish: "canone ebraico" },
  pt: { protestant: "cânone protestante", catholic: "cânone católico", orthodox: "cânone ortodoxo", jewish: "cânone hebraico" },
  nl: { protestant: "protestantse canon", catholic: "katholieke canon", orthodox: "orthodoxe canon", jewish: "Hebreeuwse canon" },
  sv: { protestant: "protestantisk kanon", catholic: "katolsk kanon", orthodox: "ortodox kanon", jewish: "hebreisk kanon" },
  no: { protestant: "protestantisk kanon", catholic: "katolsk kanon", orthodox: "ortodoks kanon", jewish: "hebraisk kanon" },
  fi: { protestant: "protestanttinen kaanon", catholic: "katolinen kaanon", orthodox: "ortodoksinen kaanon", jewish: "heprealainen kaanon" },
  hu: { protestant: "protestáns kánon", catholic: "katolikus kánon", orthodox: "ortodox kánon", jewish: "héber kánon" },
  cs: { protestant: "protestantský kánon", catholic: "katolický kánon", orthodox: "ortodoxní kánon", jewish: "hebrejský kánon" },
  sr: { protestant: "protestantski kanon", catholic: "katolički kanon", orthodox: "pravoslavni kanon", jewish: "hebrejski kanon" },
  ru: { protestant: "протестантский канон", catholic: "католический канон", orthodox: "православный канон", jewish: "еврейский канон" },
  el: { protestant: "προτεσταντικός κανόνας", catholic: "καθολικός κανόνας", orthodox: "ορθόδοξος κανόνας", jewish: "εβραϊκός κανόνας" },
  la: { protestant: "canon protestanticum", catholic: "canon catholicum", orthodox: "canon orthodoxum", jewish: "canon hebraicum" },
  he: { protestant: "קאנון פרוטסטנטי", catholic: "קאנון קתולי", orthodox: "קאנון אורתודוקסי", jewish: "תנ״ך" },
  ar: { protestant: "قانون بروتستانتي", catholic: "قانون كاثوليكي", orthodox: "قانون أرثوذكسي", jewish: "قانون عبري" },
  zh: { protestant: "新教正典", catholic: "天主教正典", orthodox: "正教正典", jewish: "希伯来正典" },
  ja: { protestant: "プロテスタント正典", catholic: "カトリック正典", orthodox: "正教正典", jewish: "ヘブライ正典" },
  tl: { protestant: "kanon na Protestante", catholic: "kanon na Katoliko", orthodox: "kanon na Ortodokso", jewish: "kanon na Hebreo" },
};

const LICENSE_WORD = {
  fr: "licence",
  en: "license",
  de: "Lizenz",
  es: "licencia",
  it: "licenza",
  pt: "licença",
  nl: "licentie",
  sv: "licens",
  no: "lisens",
  fi: "lisenssi",
  hu: "licenc",
  cs: "licence",
  sr: "licenca",
  ru: "лицензия",
  el: "άδεια",
  la: "licentia",
  he: "רישיון",
  ar: "رخصة",
  zh: "许可",
  ja: "ライセンス",
  tl: "lisensya",
};

export function canonPhrase(kind) {
  if (!kind || kind === "dss") return "";
  const pack = CANON[getUiLang()] || CANON.fr;
  return pack[kind] || CANON.fr[kind] || "";
}

export function abeggCredit() {
  const word = LICENSE_WORD[getUiLang()] || LICENSE_WORD.fr;
  return `Martin Abegg, ETCBC, ${word} CC BY-NC 4.0`;
}

export function brandName() {
  return BRAND[getUiLang()] || BRAND.fr;
}

export function othersLabel() {
  return OTHERS[getUiLang()] || OTHERS.fr;
}

export function sectionLabel(id, lang) {
  const i = SECTION_IDS.indexOf(id);
  if (i < 0) return "";
  const code = lang || getUiLang();
  const row = SECTIONS[code] || SECTIONS.fr;
  return row[i] || SECTIONS.fr[i] || id;
}

const TITLE_LANGS = ["en", "de", "es", "it", "la", "ru", "zh", "el"];
const TITLE_ROWS = `
genese Genesis|1. Mose|Génesis|Genesi|Genesis|Бытие|创世记|Γένεσις
exode Exodus|2. Mose|Éxodo|Esodo|Exodus|Исход|出埃及记|Έξοδος
levitique Leviticus|3. Mose|Levítico|Levitico|Leviticus|Левит|利未记|Λευιτικόν
nombres Numbers|4. Mose|Números|Numeri|Numeri|Числа|民数记|Αριθμοί
deuteronome Deuteronomy|5. Mose|Deuteronomio|Deuteronomio|Deuteronomium|Второзаконие|申命记|Δευτερονόμιον
josue Joshua|Josua|Josué|Giosuè|Iosue|Иисус Навин|约书亚记|Ιησούς
juges Judges|Richter|Jueces|Giudici|Iudices|Судьи|士师记|Κριταί
ruth Ruth|Rut|Rut|Rut|Ruth|Руфь|路得记|Ρουθ
1-samuel 1 Samuel|1. Samuel|1 Samuel|1 Samuele|1 Samuel|1 Царств|撒母耳记上|Α΄ Σαμουήλ
2-samuel 2 Samuel|2. Samuel|2 Samuel|2 Samuele|2 Samuel|2 Царств|撒母耳记下|Β΄ Σαμουήλ
1-rois 1 Kings|1. Könige|1 Reyes|1 Re|1 Regum|3 Царств|列王纪上|Α΄ Βασιλέων
2-rois 2 Kings|2. Könige|2 Reyes|2 Re|2 Regum|4 Царств|列王纪下|Β΄ Βασιλέων
1-chroniques 1 Chronicles|1. Chronik|1 Crónicas|1 Cronache|1 Paralipomenon|1 Паралипоменон|历代志上|Α΄ Χρονικών
2-chroniques 2 Chronicles|2. Chronik|2 Crónicas|2 Cronache|2 Paralipomenon|2 Паралипомеνοн|历代志下|Β΄ Χρονικών
esdras Ezra|Esra|Esdras|Esdra|Esdras|Ездра|以斯拉记|Έσδρας
nehemie Nehemiah|Nehemia|Nehemías|Neemia|Nehemias|Неемия|尼希米记|Νεεμίας
esther Esther|Ester|Ester|Ester|Esther|Есфирь|以斯帖记|Εσθήρ
job Job|Hiob|Job|Giobbe|Iob|Иов|约伯记|Ιώβ
proverbes Proverbs|Sprüche|Proverbios|Proverbi|Proverbia|Притчи|箴言|Παροιμίαι
ecclesiaste Ecclesiastes|Prediger|Eclesiastés|Qoelet|Ecclesiastes|Екклесиаст|传道书|Εκκλησιαστής
cantique Song of Songs|Hohelied|Cantar|Cantico|Canticum|Песнь Песней|雅歌|Άσμα
esaie Isaiah|Jesaja|Isaías|Isaia|Isaias|Исаия|以赛亚书|Ησαΐας
jeremie Jeremiah|Jeremia|Jeremías|Geremia|Ieremias|Иеремия|耶利米书|Ιερεμίας
lamentations Lamentations|Klagelieder|Lamentaciones|Lamentazioni|Lamentationes|Плач|耶利米哀歌|Θρήνοι
ezechiel Ezekiel|Hesekiel|Ezequiel|Ezechiele|Ezechiel|Иезекииль|以西结书|Ιεζεκιήλ
daniel Daniel|Daniel|Daniel|Daniele|Daniel|Даниил|但以理书|Δανιήλ
osee Hosea|Hosea|Oseas|Osea|Osee|Осия|何西阿书|Ωσηέ
joel Joel|Joel|Joel|Gioele|Ioel|Иоиль|约珥书|Ιωήλ
amos Amos|Amos|Amós|Amos|Amos|Амос|阿摩司书|Αμώς
abdias Obadiah|Obadja|Abdías|Abdia|Abdias|Авдий|俄巴底亚书|Αβδιού
jonas Jonah|Jona|Jonás|Giona|Ionas|Иона|约拿书|Ιωνάς
michee Micah|Micha|Miqueas|Michea|Michaeas|Михей|弥迦书|Μιχαίας
nahum Nahum|Nahum|Nahúm|Naum|Nahum|Наум|那鸿书|Ναούμ
habacuc Habakkuk|Habakuk|Habacuc|Abacuc|Habacuc|Аввакум|哈巴谷书|Αββακούμ
sophonie Zephaniah|Zefanja|Sofonías|Sofonia|Sophonias|Софония|西番雅书|Σοφονίας
aggee Haggai|Haggai|Ageo|Aggeo|Aggaeus|Аггей|哈该书|Αγγαίος
zacharie Zechariah|Sacharja|Zacarías|Zaccaria|Zacharias|Захария|撒迦利亚书|Ζαχαρίας
malachie Malachi|Maleachi|Malaquías|Malachia|Malachias|Малахия|玛拉基书|Μαλαχίας
tobie Tobit|Tobit|Tobías|Tobia|Tobias|Товит|多俾亚传|Τωβίτ
judith Judith|Judit|Judit|Giuditta|Iudith|Иудифь|友弟德传|Ιουδίθ
sagesse Wisdom|Weisheit|Sabiduría|Sapienza|Sapientia|Премудрость|智慧篇|Σοφία
siracide Sirach|Sirach|Eclesiástico|Siracide|Sirach|Сирах|德训篇|Σειράχ
baruch Baruch|Baruch|Baruc|Baruc|Baruch|Варух|巴录书|Βαρούχ
1-maccabees 1 Maccabees|1. Makkabäer|1 Macabeos|1 Maccabei|1 Maccabaei|1 Маккавеев|玛加伯上|Α΄ Μακκαβαίων
2-maccabees 2 Maccabees|2. Makkabäer|2 Macabeos|2 Maccabei|2 Maccabaei|2 Маккавеев|玛加伯下|Β΄ Μακκαβαίων
3-maccabees 3 Maccabees|3. Makkabäer|3 Macabeos|3 Maccabei|3 Maccabaei|3 Маккавеев|玛加伯三|Γ΄ Μακκαβαίων
4-maccabees 4 Maccabees|4. Makkabäer|4 Macabeos|4 Maccabei|4 Maccabaei|4 Маккавеев|玛加伯四|Δ΄ Μακκαβαίων
matthieu Matthew|Matthäus|Mateo|Matteo|Matthaeus|Матфей|马太福音|Ματθαίος
marc Mark|Markus|Marcos|Marco|Marcus|Марк|马可福音|Μάρκος
luc Luke|Lukas|Lucas|Luca|Lucas|Лука|路加福音|Λουκάς
jean John|Johannes|Juan|Giovanni|Ioannes|Иоанн|约翰福音|Ιωάννης
actes Acts|Apostelgeschichte|Hechos|Atti|Actus|Деяния|使徒行传|Πράξεις
romains Romans|Römer|Romanos|Romani|Romani|Римлянам|罗马书|Ρωμαίους
1-corinthiens 1 Corinthians|1. Korinther|1 Corintios|1 Corinzi|1 Corinthios|1 Коринфянам|哥林多前书|Α΄ Κορινθίους
2-corinthiens 2 Corinthians|2. Korinther|2 Corintios|2 Corinzi|2 Corinthios|2 Коринфянам|哥林多后书|Β΄ Κορινθίους
galates Galatians|Galater|Gálatas|Galati|Galatae|Галатам|加拉太书|Γαλάτες
ephesiens Ephesians|Epheser|Efesios|Efesini|Ephesios|Ефесянам|以弗所书|Εφεσίους
philippiens Philippians|Philipper|Filipenses|Filippesi|Philippenses|Филиппийцам|腓立比书|Φιλιππησίους
colossiens Colossians|Kolosser|Colosenses|Colossesi|Colossenses|Колоссянам|歌罗西书|Κολοσσαείς
1-thessaloniciens 1 Thessalonians|1. Thessalonicher|1 Tesalonicenses|1 Tessalonicesi|1 Thessalonicenses|1 Фессалоникийцам|帖撒罗尼迦前书|Α΄ Θεσσαλονικείς
2-thessaloniciens 2 Thessalonians|2. Thessalonicher|2 Tesalonicenses|2 Tessalonicesi|2 Thessalonicenses|2 Фессалоникийцам|帖撒罗尼迦后书|Β΄ Θεσσαλονικείς
1-timothee 1 Timothy|1. Timotheus|1 Timoteo|1 Timoteo|1 Timotheum|1 Тимофею|提摩太前书|Α΄ Τιμόθεον
2-timothee 2 Timothy|2. Timotheus|2 Timoteo|2 Timoteo|2 Timotheum|2 Тимофею|提摩太后书|Β΄ Τιμόθεον
tite Titus|Titus|Tito|Tito|Titus|Титу|提多书|Τίτον
philemon Philemon|Philemon|Filemón|Filemone|Philemon|Филимону|腓利门书|Φιλήμονα
hebreux Hebrews|Hebräer|Hebreos|Ebrei|Hebraeos|Евреям|希伯来书|Εβραίους
jacques James|Jakobus|Santiago|Giacomo|Iacobus|Иакова|雅各书|Ιάκωβος
1-pierre 1 Peter|1. Petrus|1 Pedro|1 Pietro|1 Petrus|1 Петра|彼得前书|Α΄ Πέτρου
2-pierre 2 Peter|2. Petrus|2 Pedro|2 Pietro|2 Petrus|2 Петра|彼得后书|Β΄ Πέτρου
1-jean 1 John|1. Johannes|1 Juan|1 Giovanni|1 Ioannes|1 Иоанна|约翰一书|Α΄ Ιωάννου
2-jean 2 John|2. Johannes|2 Juan|2 Giovanni|2 Ioannes|2 Иоанна|约翰二书|Β΄ Ιωάννου
3-jean 3 John|3. Johannes|3 Juan|3 Giovanni|3 Ioannes|3 Иоанна|约翰三书|Γ΄ Ιωάννου
jude Jude|Judas|Judas|Giuda|Iudas|Иуды|犹大书|Ιούδας
apocalypse Revelation|Offenbarung|Apocalipsis|Apocalisse|Apocalypsis|Откровение|启示录|Αποκάλυψη
`;

const BOOK_TITLES = {};
for (const line of TITLE_ROWS.trim().split("\n")) {
  const trimmed = line.trim();
  const sp = trimmed.indexOf(" ");
  const id = trimmed.slice(0, sp);
  const cells = trimmed.slice(sp + 1).split("|");
  BOOK_TITLES[id] = {};
  TITLE_LANGS.forEach((lang, i) => {
    if (cells[i]) BOOK_TITLES[id][lang] = cells[i];
  });
}

export function bookTitle(id) {
  if (!id) return "";
  if (id === "psaumes" || id === "psaume-151") return t("psalm");
  const lang = getUiLang();
  if (lang === "fr") return "";
  return BOOK_TITLES[id]?.[lang] || BOOK_TITLES[id]?.en || "";
}

export function bookAbbr(id, fallback = "") {
  if (id === "psaumes" || id === "psaume-151") return t("psalm");
  const lang = getUiLang();
  if (lang === "fr") return fallback || id;
  return ABBR[id]?.[lang] || ABBR[id]?.en || fallback || id;
}

const GEAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
  '<path fill="currentColor" d="M10.2 2.4h3.6l.5 2.2a7.6 7.6 0 0 1 1.8.9l2-1.1 2.5 2.5-1.1 2a7.6 7.6 0 0 1 .9 1.8l2.2.5v3.6l-2.2.5a7.6 7.6 0 0 1-.9 1.8l1.1 2-2.5 2.5-2-1.1a7.6 7.6 0 0 1-1.8.9l-.5 2.2h-3.6l-.5-2.2a7.6 7.6 0 0 1-1.8-.9l-2 1.1-2.5-2.5 1.1-2a7.6 7.6 0 0 1-.9-1.8l-2.2-.5V9.2l2.2-.5a7.6 7.6 0 0 1 .9-1.8l-1.1-2 2.5-2.5 2 1.1a7.6 7.6 0 0 1 1.8-.9l.5-2.2Zm1.8 6.1a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/>' +
  "</svg>";

export function uiLangs() {
  return ORDER.slice();
}

export function uiLangName(code) {
  return NAMES[code] || NAMES.fr;
}

export function getUiLang() {
  try {
    const v = localStorage.getItem(KEY);
    if (v && STR[v]) return v;
  } catch {
    /* ignore */
  }
  return "fr";
}

export function intlLocale() {
  return INTL[getUiLang()] || "fr-FR";
}

export function t(key, n) {
  const pack = STR[getUiLang()] || STR.fr;
  const s = pack[key] ?? STR.fr[key] ?? key;
  return n == null ? s : String(s).replaceAll("{n}", String(n));
}

export function setUiLang(code) {
  const next = STR[code] ? code : "fr";
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  applyUiLang();
  document.dispatchEvent(new CustomEvent("lsb:ui-lang", { detail: { lang: next } }));
}

function applyUiLang() {
  document.documentElement.lang = getUiLang();
  const brand = brandName();
  document.querySelectorAll(".brand").forEach((el) => {
    const strong = el.querySelector("strong");
    if (strong) strong.textContent = brand;
    else el.textContent = brand;
  });
  const sep = " — ";
  const cut = document.title.lastIndexOf(sep);
  document.title = (cut >= 0 ? document.title.slice(0, cut) + sep : "") + brand;
  const link = document.querySelector('.nav-links a[href*="messe.html"]');
  if (link) link.textContent = t("mass");
  const gear = document.querySelector(".ui-gear");
  if (gear) gear.setAttribute("aria-label", t("settings"));
}

export function closeUiLangMenu() {
  document.querySelector(".ui-lang-menu")?.remove();
  document.querySelectorAll(".ui-gear[aria-expanded='true']").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
}

function openUiLangMenu(anchor) {
  closeUiLangMenu();
  document.querySelector(".edition-menu")?.remove();
  document.querySelector(".parallels-menu")?.remove();
  document.querySelector(".volume-menu")?.remove();
  document.querySelector(".qumran-menu")?.remove();

  const menu = document.createElement("ul");
  menu.className = "ui-lang-menu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", t("language"));
  const current = getUiLang();
  const cap = document.createElement("li");
  cap.className = "ui-lang-caption";
  cap.textContent = t("language");
  menu.append(cap);
  let currentBtn = null;
  for (const code of ORDER) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = NAMES[code];
    btn.lang = code;
    btn.dir = code === "he" || code === "ar" ? "rtl" : "ltr";
    if (code === current) {
      btn.classList.add("is-current");
      btn.setAttribute("aria-selected", "true");
      currentBtn = btn;
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeUiLangMenu();
      if (code !== getUiLang()) setUiLang(code);
    });
    li.append(btn);
    menu.append(li);
  }
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.getBoundingClientRect().width;
  let left = r.right - mw;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  menu.style.left = `${left}px`;
  menu.style.top = `${r.bottom + 4}px`;
  anchor.setAttribute("aria-expanded", "true");
  currentBtn?.scrollIntoView({ block: "nearest" });

  const onDoc = (e) => {
    if (menu.contains(e.target) || anchor.contains(e.target)) return;
    closeUiLangMenu();
    document.removeEventListener("pointerdown", onDoc, true);
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key !== "Escape") return;
    closeUiLangMenu();
    document.removeEventListener("pointerdown", onDoc, true);
    document.removeEventListener("keydown", onKey);
    anchor.focus();
  };
  document.addEventListener("pointerdown", onDoc, true);
  document.addEventListener("keydown", onKey);
}

export function mountUiGear() {
  const nav = document.querySelector(".nav-links");
  if (!nav) return null;
  let btn = nav.querySelector(".ui-gear");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-gear";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = GEAR_SVG;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.querySelector(".ui-lang-menu")) closeUiLangMenu();
      else openUiLangMenu(btn);
    });
    nav.append(btn);
  }
  applyUiLang();
  return btn;
}
