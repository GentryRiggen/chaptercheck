/**
 * Data generators for database seeding.
 *
 * These generators create realistic test data for the ChapterCheck database.
 * Data is generated deterministically based on index to allow for reproducible seeding.
 */

// ============================================
// SEEDED RANDOM HELPERS
// ============================================

/**
 * Simple seeded random number generator using a linear congruential generator.
 * Provides reproducible random sequences based on seed value.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters (same as glibc)
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate a random hex string of specified length using seeded random.
 */
function seededRandomHex(random: () => number, length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(random() * chars.length)];
  }
  return result;
}

/**
 * Pick a random item from an array using seeded random.
 */
function seededRandomPick<T>(random: () => number, arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Generate a random integer in range [min, max] using seeded random.
 */
function seededRandomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Return true with the given probability (0-1) using seeded random.
 */
function seededRandomChance(random: () => number, probability: number): boolean {
  return random() < probability;
}

/**
 * Generate a random timestamp within a range of days from now.
 * Returns a timestamp in the past (daysAgo days ago to now).
 */
function seededRandomTimestamp(random: () => number, maxDaysAgo: number): number {
  const now = Date.now();
  const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;
  const randomMs = Math.floor(random() * maxMs);
  return now - randomMs;
}

/**
 * Convert a string to a URL-safe slug.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================
// NAME DATA FOR USERS AND AUTHORS
// ============================================

const FIRST_NAMES = [
  // American/British
  "John",
  "Sarah",
  "Michael",
  "Emma",
  "James",
  "Emily",
  "William",
  "Olivia",
  "David",
  "Sophia",
  "Robert",
  "Isabella",
  "Joseph",
  "Mia",
  "Thomas",
  "Charlotte",
  "Christopher",
  "Amelia",
  "Daniel",
  "Harper",
  "Matthew",
  "Evelyn",
  "Anthony",
  "Abigail",
  "Andrew",
  "Elizabeth",
  "Joshua",
  "Avery",
  "Ryan",
  "Grace",
  "Brandon",
  "Chloe",
  "Tyler",
  "Victoria",
  "Kevin",
  "Madison",
  "Brian",
  "Scarlett",
  "George",
  "Hannah",
  // Hispanic
  "Carlos",
  "Maria",
  "Diego",
  "Sofia",
  "Miguel",
  "Valentina",
  "Alejandro",
  "Camila",
  "Luis",
  "Lucia",
  "Fernando",
  "Elena",
  "Rafael",
  "Carmen",
  "Gabriel",
  "Ana",
  "Javier",
  "Rosa",
  "Roberto",
  "Gabriela",
  "Francisco",
  "Patricia",
  "Manuel",
  "Daniela",
  "Ricardo",
  "Mariana",
  "Eduardo",
  "Alejandra",
  "Jorge",
  "Natalia",
  "Pablo",
  "Paula",
  "Andres",
  "Andrea",
  "Sebastian",
  "Valeria",
  "Mateo",
  "Ximena",
  // East Asian
  "Yuki",
  "Kenji",
  "Wei",
  "Mei",
  "Hiroshi",
  "Sakura",
  "Takeshi",
  "Yui",
  "Kazuki",
  "Hana",
  "Chen",
  "Li",
  "Jun",
  "Xiao",
  "Hao",
  "Ling",
  "Min",
  "Jing",
  "Feng",
  "Yu",
  "Soo-Min",
  "Ji-Hoon",
  "Min-Jun",
  "Seo-Yeon",
  "Hyun",
  "Minji",
  "Tae",
  "Eun",
  "Sung",
  "Da-Som",
  "Akira",
  "Ren",
  "Haruto",
  "Aoi",
  "Sota",
  "Mio",
  "Riku",
  "Ema",
  "Yuto",
  "Hinata",
  // South Asian
  "Raj",
  "Priya",
  "Arjun",
  "Ananya",
  "Vikram",
  "Deepa",
  "Amit",
  "Neha",
  "Rohan",
  "Kavya",
  "Aditya",
  "Shreya",
  "Nikhil",
  "Pooja",
  "Rahul",
  "Nisha",
  "Suresh",
  "Sunita",
  "Pranav",
  "Meera",
  "Vivek",
  "Anjali",
  "Sanjay",
  "Rekha",
  "Kiran",
  "Lakshmi",
  "Ravi",
  "Divya",
  "Ajay",
  "Sita",
  "Hassan",
  "Fatima",
  "Ahmed",
  "Aisha",
  "Ali",
  "Zainab",
  "Omar",
  "Mariam",
  "Tariq",
  "Yasmin",
  // African
  "Kwame",
  "Amara",
  "Kofi",
  "Zara",
  "Chidi",
  "Adaeze",
  "Obinna",
  "Nneka",
  "Emeka",
  "Chioma",
  "Oluwaseun",
  "Adetola",
  "Tunde",
  "Folake",
  "Babatunde",
  "Yetunde",
  "Segun",
  "Abiodun",
  "Femi",
  "Bisi",
  "Tendai",
  "Tariro",
  "Farai",
  "Rudo",
  "Tanaka",
  "Nyasha",
  "Thabo",
  "Lerato",
  "Sipho",
  "Nomsa",
  "Mandla",
  "Thandiwe",
  "Bongani",
  "Lindiwe",
  "Kagiso",
  "Palesa",
  "Jabari",
  "Adia",
  "Jelani",
  "Zuri",
  // European
  "Pierre",
  "Ingrid",
  "Hans",
  "Lucia",
  "Francois",
  "Marie",
  "Klaus",
  "Greta",
  "Sven",
  "Astrid",
  "Lars",
  "Freya",
  "Erik",
  "Helga",
  "Magnus",
  "Sigrid",
  "Bjorn",
  "Elsa",
  "Nikolai",
  "Svetlana",
  "Ivan",
  "Natasha",
  "Dmitri",
  "Olga",
  "Alexei",
  "Anastasia",
  "Sergei",
  "Marina",
  "Viktor",
  "Katarina",
  "Marco",
  "Giulia",
  "Alessandro",
  "Francesca",
  "Luca",
  "Chiara",
  "Giovanni",
  "Lorenzo",
];

const LAST_NAMES = [
  // American/British
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Thompson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  // Hispanic
  "Lopez",
  "Gonzalez",
  "Hernandez",
  "Perez",
  "Sanchez",
  "Ramirez",
  "Torres",
  "Rivera",
  "Gomez",
  "Flores",
  "Morales",
  "Ortiz",
  "Gutierrez",
  "Ruiz",
  "Diaz",
  "Reyes",
  "Cruz",
  "Vargas",
  "Castro",
  "Mendez",
  // East Asian
  "Wang",
  "Li",
  "Zhang",
  "Liu",
  "Chen",
  "Yang",
  "Huang",
  "Wu",
  "Zhou",
  "Xu",
  "Tanaka",
  "Suzuki",
  "Yamamoto",
  "Watanabe",
  "Ito",
  "Nakamura",
  "Kobayashi",
  "Saito",
  "Yoshida",
  "Sasaki",
  "Kim",
  "Park",
  "Choi",
  "Jung",
  "Kang",
  "Cho",
  "Yoon",
  "Jang",
  "Lim",
  "Han",
  // South Asian
  "Patel",
  "Sharma",
  "Kumar",
  "Singh",
  "Gupta",
  "Verma",
  "Reddy",
  "Nair",
  "Mehta",
  "Joshi",
  "Rao",
  "Pillai",
  "Iyer",
  "Mukherjee",
  "Ghosh",
  "Das",
  "Bhat",
  "Kapoor",
  "Malhotra",
  "Chatterjee",
  "Khan",
  "Hussain",
  "Ahmed",
  "Rahman",
  // African
  "Okonkwo",
  "Achebe",
  "Nwosu",
  "Okoro",
  "Adeyemi",
  "Oyelaran",
  "Adesanya",
  "Bakare",
  "Eze",
  "Nnamdi",
  "Moyo",
  "Dube",
  "Ncube",
  "Ndlovu",
  "Mwangi",
  "Kipchoge",
  "Wanjiku",
  "Ochieng",
  "Kamau",
  "Banda",
  // European
  "Mueller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Dupont",
  "Bernard",
  "Dubois",
  "Moreau",
  "Laurent",
  "Simon",
  "Michel",
  "Leroy",
  "Rossi",
  "Russo",
  "Ferrari",
  "Esposito",
  "Bianchi",
  "Romano",
  "Colombo",
  "Ricci",
  "Ivanov",
  "Petrov",
  "Smirnov",
  "Kuznetsov",
  "Popov",
  "Sokolov",
  "Johansson",
  "Andersson",
  "Karlsson",
  "Nilsson",
  "Eriksson",
  "Larsson",
  "Olsson",
  "Persson",
];

const AUTHOR_BIO_GENRES = [
  "fantasy",
  "science fiction",
  "mystery",
  "thriller",
  "romance",
  "historical fiction",
  "horror",
  "literary fiction",
  "adventure",
  "young adult",
  "urban fantasy",
  "epic fantasy",
  "space opera",
  "cyberpunk",
  "cozy mystery",
  "psychological thriller",
];

const AUTHOR_BIO_TEMPLATES: Array<
  (name: string, genre: string, bookCount: number, age: number) => string
> = [
  (name, genre) =>
    `${name} is a bestselling author of ${genre} novels, known for creating immersive worlds and unforgettable characters.`,
  (name, genre, bookCount) =>
    `Known for ${genre} fiction, ${name} has written over ${bookCount} books that have captivated readers worldwide.`,
  (name, _genre, _bookCount, age) =>
    `${name} began writing at the age of ${age} and has since become one of the most acclaimed voices in contemporary fiction.`,
  (name, genre) =>
    `Award-winning author ${name} explores themes of identity, belonging, and transformation through compelling ${genre} narratives.`,
  (name, genre) =>
    `${name} has been crafting ${genre} stories for over two decades, earning critical acclaim and a devoted readership.`,
  (name) =>
    `With a background in journalism, ${name} brings a keen eye for detail and authentic voice to every story.`,
  (name, genre) =>
    `${name}'s ${genre} novels have been translated into over 30 languages and adapted for film and television.`,
  (name) =>
    `A former professor of creative writing, ${name} now writes full-time from a cabin in the mountains.`,
];

// Middle initials for author names
const MIDDLE_INITIALS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "P",
  "R",
  "S",
  "T",
  "W",
];

// ============================================
// TYPES
// ============================================

export interface GeneratedUser {
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: "admin" | "editor" | "viewer";
  hasPremium: boolean;
}

export interface GeneratedAuthor {
  name: string;
  bio?: string;
  imageR2Key?: string;
}

export interface GeneratedSeries {
  name: string;
  description?: string;
}

export interface GeneratedBook {
  title: string;
  subtitle?: string;
  description?: string;
  isbn?: string;
  publishedYear?: number;
  coverImageR2Key?: string;
  language?: string;
  duration?: number;
  seriesId?: string;
  seriesOrder?: number;
  authorIds: string[];
}

export interface GeneratedReview {
  userId: string;
  bookId: string;
  isRead: boolean;
  rating?: number;
  reviewText?: string;
  isReadPrivate: boolean;
  isReviewPrivate: boolean;
  readAt?: number;
  reviewedAt?: number;
}

// ============================================
// USER GENERATOR
// ============================================

export function generateUsers(count: number): GeneratedUser[] {
  const users: GeneratedUser[] = [];
  const random = createSeededRandom(42); // Fixed seed for reproducibility

  for (let i = 0; i < count; i++) {
    const firstName = seededRandomPick(random, FIRST_NAMES);
    const lastName = seededRandomPick(random, LAST_NAMES);
    const randomNum = seededRandomInt(random, 1, 999);

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@example.com`;
    const name = `${firstName} ${lastName}`;
    const imageUrl = `https://i.pravatar.cc/150?u=${email}`;

    // Role distribution: 80% viewer, 15% editor, 5% admin
    const roleRand = random();
    let role: "admin" | "editor" | "viewer";
    if (roleRand < 0.05) {
      role = "admin";
    } else if (roleRand < 0.2) {
      role = "editor";
    } else {
      role = "viewer";
    }

    // 30% have premium
    const hasPremium = seededRandomChance(random, 0.3);

    const clerkId = `seed_user_${i}_${seededRandomHex(random, 8)}`;

    users.push({
      clerkId,
      email,
      name,
      imageUrl,
      role,
      hasPremium,
    });
  }

  return users;
}

// ============================================
// AUTHOR GENERATOR
// ============================================

export function generateAuthors(count: number): GeneratedAuthor[] {
  const authors: GeneratedAuthor[] = [];
  const random = createSeededRandom(123); // Different seed from users
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name: string;
    let attempts = 0;

    // Generate unique author name
    do {
      name = generateAuthorName(random);
      attempts++;
    } while (usedNames.has(name) && attempts < 100);

    usedNames.add(name);

    // 20% chance of no bio
    let bio: string | undefined;
    if (!seededRandomChance(random, 0.2)) {
      const genre = seededRandomPick(random, AUTHOR_BIO_GENRES);
      const bookCount = seededRandomInt(random, 5, 50);
      const age = seededRandomInt(random, 12, 25);
      const template = seededRandomPick(random, AUTHOR_BIO_TEMPLATES);
      bio = template(name, genre, bookCount, age);
    }

    // Generate image URL using name slug
    const nameSlug = slugify(name);
    const imageR2Key = `https://picsum.photos/seed/${nameSlug}/400/600`;

    authors.push({
      name,
      bio,
      imageR2Key,
    });
  }

  return authors;
}

/**
 * Generate an author name with various styles:
 * - Standard: "FirstName LastName"
 * - With middle initial: "FirstName M. LastName"
 * - Pen name style: "F.M. LastName"
 * - Full initials: "F.M.L. LastName"
 */
function generateAuthorName(random: () => number): string {
  const firstName = seededRandomPick(random, FIRST_NAMES);
  const lastName = seededRandomPick(random, LAST_NAMES);
  const styleRand = random();

  // 60% standard name
  if (styleRand < 0.6) {
    return `${firstName} ${lastName}`;
  }

  // 25% with middle initial: "Robert A. Jordan"
  if (styleRand < 0.85) {
    const middleInitial = seededRandomPick(random, MIDDLE_INITIALS);
    return `${firstName} ${middleInitial}. ${lastName}`;
  }

  // 10% pen name with first initial: "N.K. Jemisin" style
  if (styleRand < 0.95) {
    const middleInitial = seededRandomPick(random, MIDDLE_INITIALS);
    return `${firstName.charAt(0)}.${middleInitial}. ${lastName}`;
  }

  // 5% three initials: "J.R.R. Tolkien" style
  const middleInitial1 = seededRandomPick(random, MIDDLE_INITIALS);
  const middleInitial2 = seededRandomPick(random, MIDDLE_INITIALS);
  return `${firstName.charAt(0)}.${middleInitial1}.${middleInitial2}. ${lastName}`;
}

// ============================================
// WORD POOLS FOR GENERATION
// ============================================

const NOUNS = [
  "shadow",
  "light",
  "throne",
  "crown",
  "blade",
  "storm",
  "fire",
  "ice",
  "blood",
  "dragon",
  "empire",
  "kingdom",
  "night",
  "star",
  "moon",
  "sea",
  "stone",
  "iron",
  "silver",
  "gold",
  "tower",
  "realm",
  "world",
  "dawn",
  "dusk",
  "wind",
  "flame",
  "ash",
  "bone",
  "soul",
];

const ADJECTIVES = [
  "dark",
  "broken",
  "fallen",
  "rising",
  "eternal",
  "forgotten",
  "hidden",
  "lost",
  "crimson",
  "silver",
  "ancient",
  "final",
  "black",
  "white",
  "burning",
  "frozen",
  "shattered",
  "sacred",
  "cursed",
  "blessed",
];

const SERIES_SUFFIXES = [
  "Chronicles",
  "Saga",
  "Cycle",
  "Archive",
  "Trilogy",
  "Series",
  "Sequence",
  "Legacy",
];

const GENRES = [
  "fantasy",
  "science fiction",
  "epic",
  "dark fantasy",
  "urban fantasy",
  "space opera",
];

const CHARACTER_TYPES = [
  "a young mage",
  "an exiled prince",
  "a reluctant hero",
  "a powerful sorceress",
  "an unlikely band of adventurers",
  "a fallen knight",
  "a mysterious stranger",
  "twin siblings",
];

const PREMISES = [
  "magic comes at a terrible price",
  "the old gods are returning",
  "empires rise and fall on the edge of a blade",
  "the dead do not stay buried",
  "prophecy shapes the fate of nations",
  "technology and magic collide",
  "ancient powers awaken from slumber",
  "war threatens to consume all",
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function seededRandomItems<T>(random: () => number, arr: T[], count: number): T[] {
  // Fisher-Yates shuffle with seeded random
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// SERIES GENERATOR
// ============================================

function generateSeriesName(random: () => number): string {
  const pattern = Math.floor(random() * 5);

  switch (pattern) {
    case 0: // "The [Noun] [Noun]"
      return `The ${capitalize(seededRandomPick(random, NOUNS))} ${capitalize(seededRandomPick(random, NOUNS))}`;

    case 1: // "[Adjective] [Noun]"
      return `${capitalize(seededRandomPick(random, ADJECTIVES))} ${capitalize(seededRandomPick(random, NOUNS))}`;

    case 2: // "[Noun] of [Noun]"
      return `${capitalize(seededRandomPick(random, NOUNS))} of ${capitalize(seededRandomPick(random, NOUNS))}`;

    case 3: // "The [Noun] Chronicles/Saga/Cycle"
      return `The ${capitalize(seededRandomPick(random, NOUNS))} ${seededRandomPick(random, SERIES_SUFFIXES)}`;

    case 4: // Single evocative word (capitalized noun)
    default:
      return capitalize(seededRandomPick(random, NOUNS));
  }
}

function generateSeriesDescription(random: () => number): string | undefined {
  // 15% chance of no description
  if (random() < 0.15) {
    return undefined;
  }

  const template = Math.floor(random() * 3);

  switch (template) {
    case 0:
      return `An epic ${seededRandomPick(random, GENRES)} series following ${seededRandomPick(random, CHARACTER_TYPES)} on a journey that will change everything.`;

    case 1:
      return `In a world where ${seededRandomPick(random, PREMISES)}, heroes must rise to face impossible odds.`;

    case 2:
    default:
      return `The ${seededRandomPick(random, ADJECTIVES)} saga of ${seededRandomPick(random, CHARACTER_TYPES)} caught in the struggle between ${seededRandomPick(random, NOUNS)} and ${seededRandomPick(random, NOUNS)}.`;
  }
}

export function generateSeries(count: number): GeneratedSeries[] {
  const series: GeneratedSeries[] = [];
  const usedNames = new Set<string>();
  const random = createSeededRandom(456); // Fixed seed for reproducibility

  for (let i = 0; i < count; i++) {
    let name = generateSeriesName(random);
    // Ensure unique names
    let attempts = 0;
    while (usedNames.has(name) && attempts < 100) {
      name = generateSeriesName(random);
      attempts++;
    }
    usedNames.add(name);

    series.push({
      name,
      description: generateSeriesDescription(random),
    });
  }

  return series;
}

// ============================================
// BOOK GENERATOR
// ============================================

type BookGenre = "fantasy" | "scifi" | "thriller" | "romance" | "mystery" | "horror";

const BOOK_GENRES: BookGenre[] = ["fantasy", "scifi", "thriller", "romance", "mystery", "horror"];

const GENRE_WORD_POOLS: Record<
  BookGenre,
  {
    nouns: string[];
    adjectives: string[];
    verbs: string[];
    places: string[];
    people: string[];
  }
> = {
  fantasy: {
    nouns: [
      "sword",
      "crown",
      "dragon",
      "wizard",
      "prophecy",
      "kingdom",
      "quest",
      "magic",
      "throne",
      "curse",
    ],
    adjectives: [
      "enchanted",
      "forbidden",
      "legendary",
      "ancient",
      "mystical",
      "dark",
      "golden",
      "shadowed",
    ],
    verbs: ["bind", "awaken", "summon", "forge", "break", "rule"],
    places: [
      "Eldoria",
      "the Northern Wastes",
      "the Crystal Spire",
      "Shadowfen",
      "the Burning Isles",
    ],
    people: ["king", "queen", "mage", "knight", "heir", "oracle"],
  },
  scifi: {
    nouns: [
      "nebula",
      "singularity",
      "protocol",
      "exodus",
      "genesis",
      "horizon",
      "frontier",
      "signal",
    ],
    adjectives: [
      "infinite",
      "quantum",
      "stellar",
      "hyperdrive",
      "synthetic",
      "parallel",
      "terminal",
    ],
    verbs: ["colonize", "terraform", "upload", "transmit", "override"],
    places: ["Kepler-7", "the Outer Rim", "Station Omega", "New Terra", "the Void"],
    people: ["captain", "pilot", "engineer", "commander", "scientist"],
  },
  thriller: {
    nouns: [
      "protocol",
      "conspiracy",
      "target",
      "operation",
      "asset",
      "betrayal",
      "deadline",
      "witness",
    ],
    adjectives: ["deadly", "classified", "covert", "final", "hidden", "silent", "lethal"],
    verbs: ["extract", "eliminate", "expose", "hunt"],
    places: ["Moscow", "the Pentagon", "Berlin", "the Embassy", "Langley"],
    people: ["agent", "assassin", "operative", "informant", "traitor"],
  },
  romance: {
    nouns: ["heart", "promise", "summer", "wedding", "chance", "destiny", "kiss", "secret"],
    adjectives: [
      "unexpected",
      "forbidden",
      "eternal",
      "stolen",
      "second",
      "reckless",
      "undeniable",
    ],
    verbs: ["love", "believe", "trust", "surrender"],
    places: ["Paris", "the vineyard", "the coast", "Willow Creek", "the manor"],
    people: ["duke", "billionaire", "stranger", "neighbor", "rival"],
  },
  mystery: {
    nouns: ["murder", "secret", "confession", "alibi", "clue", "victim", "suspect", "inheritance"],
    adjectives: ["missing", "silent", "buried", "twisted", "final", "cold"],
    verbs: ["disappear", "reveal", "solve", "uncover"],
    places: ["the manor", "Ravenswood", "the gallery", "Blackwater", "the library"],
    people: ["detective", "widow", "heiress", "inspector", "witness"],
  },
  horror: {
    nouns: ["whisper", "nightmare", "shadow", "curse", "presence", "hunger", "vessel", "ritual"],
    adjectives: ["haunted", "malevolent", "forgotten", "wicked", "unholy", "restless"],
    verbs: ["consume", "possess", "awaken", "feed"],
    places: ["the basement", "Hollow Hill", "the asylum", "the woods", "the attic"],
    people: ["child", "priest", "caretaker", "medium", "stranger"],
  },
};

const LANGUAGES = [
  { code: "en", weight: 85 },
  { code: "es", weight: 5 },
  { code: "fr", weight: 4 },
  { code: "de", weight: 3 },
  { code: "ja", weight: 3 },
];

function generateBookTitle(random: () => number, genre: BookGenre): string {
  const pool = GENRE_WORD_POOLS[genre];
  const pattern = Math.floor(random() * 4);

  switch (pattern) {
    case 0: // "The [Noun] of [Place]"
      return `The ${capitalize(seededRandomPick(random, pool.nouns))} of ${seededRandomPick(random, pool.places)}`;

    case 1: // "[Verb]er of [Noun]s"
      return `${capitalize(seededRandomPick(random, pool.verbs))}er of ${capitalize(seededRandomPick(random, pool.nouns))}s`;

    case 2: // "[Adjective] [Noun]"
      return `${capitalize(seededRandomPick(random, pool.adjectives))} ${capitalize(seededRandomPick(random, pool.nouns))}`;

    case 3: // "The [Person]'s [Noun]"
    default:
      return `The ${capitalize(seededRandomPick(random, pool.people))}'s ${capitalize(seededRandomPick(random, pool.nouns))}`;
  }
}

function generateBookSubtitle(random: () => number, seriesName?: string): string | undefined {
  // 70% chance of no subtitle
  if (random() < 0.7) {
    return undefined;
  }

  if (seriesName && random() < 0.5) {
    const bookNumber = Math.floor(random() * 5) + 1;
    const ordinal = ["One", "Two", "Three", "Four", "Five"][bookNumber - 1];
    return `Book ${ordinal} of ${seriesName}`;
  }

  const subtitlePatterns = [
    `A ${capitalize(seededRandomPick(random, ADJECTIVES))} Novel`,
    `A Novel of ${capitalize(seededRandomPick(random, NOUNS))} and ${capitalize(seededRandomPick(random, NOUNS))}`,
    "A Standalone Novel",
    `The ${capitalize(seededRandomPick(random, ADJECTIVES))} Beginning`,
  ];

  return seededRandomPick(random, subtitlePatterns);
}

function generateBookDescription(random: () => number, genre: BookGenre): string {
  const pool = GENRE_WORD_POOLS[genre];
  const sentences = 2 + Math.floor(random() * 3); // 2-4 sentences

  const openers = [
    `In the ${seededRandomPick(random, pool.adjectives)} world of ${seededRandomPick(random, pool.places)}, nothing is as it seems.`,
    `When ${seededRandomPick(random, pool.nouns)} threatens everything, one ${seededRandomPick(random, pool.people)} must rise.`,
    `A ${seededRandomPick(random, pool.adjectives)} tale of ${seededRandomPick(random, pool.nouns)} and ${seededRandomPick(random, pool.nouns)}.`,
    `The ${seededRandomPick(random, pool.nouns)} has been ${seededRandomPick(random, pool.adjectives)} for centuries. Until now.`,
  ];

  const middles = [
    `Secrets long buried come to light.`,
    `Alliances will be tested and loyalties questioned.`,
    `The truth is more ${seededRandomPick(random, pool.adjectives)} than anyone imagined.`,
    `Every choice has consequences that echo through time.`,
  ];

  const closers = [
    `Nothing will ever be the same.`,
    `The ${seededRandomPick(random, pool.nouns)} awaits.`,
    `Some ${seededRandomPick(random, pool.nouns)}s are worth any price.`,
    `The journey begins here.`,
  ];

  const parts = [seededRandomPick(random, openers)];
  if (sentences >= 3) {
    parts.push(seededRandomPick(random, middles));
  }
  if (sentences >= 4) {
    parts.push(seededRandomPick(random, middles));
  }
  parts.push(seededRandomPick(random, closers));

  return parts.join(" ");
}

function generateISBN(random: () => number): string {
  // Generate ISBN-13 format: 978-X-XXXX-XXXX-X
  const prefix = "978";
  const group = Math.floor(random() * 10).toString();
  const publisher = Math.floor(random() * 10000)
    .toString()
    .padStart(4, "0");
  const title = Math.floor(random() * 10000)
    .toString()
    .padStart(4, "0");

  // Calculate check digit (ISBN-13 checksum)
  const digits = `${prefix}${group}${publisher}${title}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${prefix}-${group}-${publisher}-${title}-${checkDigit}`;
}

function generatePublishedYear(random: () => number): number {
  // 70% after 2000, weighted toward recent years
  if (random() < 0.7) {
    // 2000-2024, weighted toward more recent
    const yearsFrom2000 = Math.floor(Math.pow(random(), 0.5) * 25);
    return 2024 - yearsFrom2000;
  } else {
    // 1950-1999
    return 1950 + Math.floor(random() * 50);
  }
}

function generateLanguage(random: () => number): string {
  const totalWeight = LANGUAGES.reduce((sum, l) => sum + l.weight, 0);
  let r = random() * totalWeight;

  for (const { code, weight } of LANGUAGES) {
    r -= weight;
    if (r <= 0) return code;
  }
  return "en";
}

function generateDuration(random: () => number): number {
  // 3-40 hours in seconds (10800-144000)
  // Weighted toward 8-15 hours (typical audiobook length)
  const hours = 3 + Math.floor(random() * 37);
  const minutes = Math.floor(random() * 60);
  return hours * 3600 + minutes * 60;
}

function selectAuthorIds(random: () => number, authorIds: string[]): string[] {
  if (authorIds.length === 0) return [];

  const rand = random();
  let numAuthors: number;

  if (rand < 0.7) {
    numAuthors = 1; // 70% one author
  } else if (rand < 0.95) {
    numAuthors = 2; // 25% two authors
  } else {
    numAuthors = 3; // 5% three authors
  }

  return seededRandomItems(random, authorIds, Math.min(numAuthors, authorIds.length));
}

export function generateBooks(
  count: number,
  authorIds: string[],
  seriesIds: string[]
): GeneratedBook[] {
  const books: GeneratedBook[] = [];
  const usedTitles = new Set<string>();
  const random = createSeededRandom(789); // Fixed seed for reproducibility

  // Track series order assignments
  const seriesOrderMap = new Map<string, number>();

  for (let i = 0; i < count; i++) {
    const genre = seededRandomPick(random, BOOK_GENRES);

    // Generate unique title
    let title = generateBookTitle(random, genre);
    let attempts = 0;
    while (usedTitles.has(title) && attempts < 100) {
      title = generateBookTitle(random, genre);
      attempts++;
    }
    usedTitles.add(title);

    // Determine if book belongs to a series (60%)
    let seriesId: string | undefined;
    let seriesOrder: number | undefined;

    if (seriesIds.length > 0 && random() < 0.6) {
      seriesId = seededRandomPick(random, seriesIds);

      // Get next order for this series
      const currentOrder = seriesOrderMap.get(seriesId) || 0;

      // 10% chance of a decimal (novella between books)
      if (currentOrder > 0 && random() < 0.1) {
        seriesOrder = currentOrder + 0.5;
      } else {
        seriesOrder = currentOrder + 1;
        seriesOrderMap.set(seriesId, seriesOrder);
      }
    }

    // Generate cover image URL using title slug
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    books.push({
      title,
      subtitle: generateBookSubtitle(random, seriesId ? `the series` : undefined),
      description: generateBookDescription(random, genre),
      isbn: generateISBN(random),
      publishedYear: generatePublishedYear(random),
      coverImageR2Key: `https://picsum.photos/seed/${titleSlug}/300/450`,
      language: generateLanguage(random),
      duration: generateDuration(random),
      seriesId,
      seriesOrder,
      authorIds: selectAuthorIds(random, authorIds),
    });
  }

  return books;
}

// ============================================
// REVIEW GENERATION TYPES AND HELPERS
// ============================================

type UserPersona =
  | "harsh_critic"
  | "enthusiast"
  | "balanced"
  | "positive_leaning"
  | "negative_leaning";

type BookQualityTier = "masterpiece" | "great" | "good" | "mediocre" | "bad";

type ReviewLength =
  | "none"
  | "single_sentence"
  | "few_sentences"
  | "one_paragraph"
  | "three_paragraphs";

function seededPickWeighted<T>(
  random: () => number,
  options: Array<{ value: T; weight: number }>
): T {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let r = random() * totalWeight;
  for (const option of options) {
    r -= option.weight;
    if (r <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

function assignUserPersona(random: () => number): UserPersona {
  return seededPickWeighted(random, [
    { value: "harsh_critic", weight: 15 },
    { value: "enthusiast", weight: 15 },
    { value: "balanced", weight: 40 },
    { value: "positive_leaning", weight: 20 },
    { value: "negative_leaning", weight: 10 },
  ]);
}

function assignBookQualityTier(random: () => number): BookQualityTier {
  return seededPickWeighted(random, [
    { value: "masterpiece", weight: 10 },
    { value: "great", weight: 25 },
    { value: "good", weight: 30 },
    { value: "mediocre", weight: 25 },
    { value: "bad", weight: 10 },
  ]);
}

function getUserPersonaRatingBias(persona: UserPersona): number[] {
  // Returns [weight1, weight2, weight3] for ratings 1, 2, 3
  switch (persona) {
    case "harsh_critic":
      return [60, 30, 10];
    case "enthusiast":
      return [5, 25, 70];
    case "balanced":
      return [33, 33, 34];
    case "positive_leaning":
      return [10, 40, 50];
    case "negative_leaning":
      return [40, 45, 15];
  }
}

function getBookQualityRatingBias(tier: BookQualityTier): number[] {
  // Returns [weight1, weight2, weight3] for ratings 1, 2, 3
  switch (tier) {
    case "masterpiece":
      return [5, 20, 75];
    case "great":
      return [10, 35, 55];
    case "good":
      return [30, 40, 30];
    case "mediocre":
      return [50, 35, 15];
    case "bad":
      return [70, 25, 5];
  }
}

function calculateRating(
  random: () => number,
  persona: UserPersona,
  tier: BookQualityTier
): number {
  const personaBias = getUserPersonaRatingBias(persona);
  const bookBias = getBookQualityRatingBias(tier);

  // Combine biases by averaging
  const combined = [
    (personaBias[0] + bookBias[0]) / 2,
    (personaBias[1] + bookBias[1]) / 2,
    (personaBias[2] + bookBias[2]) / 2,
  ];

  return seededPickWeighted(random, [
    { value: 1, weight: combined[0] },
    { value: 2, weight: combined[1] },
    { value: 3, weight: combined[2] },
  ]);
}

function pickReviewLength(random: () => number): ReviewLength {
  return seededPickWeighted(random, [
    { value: "none", weight: 15 },
    { value: "single_sentence", weight: 20 },
    { value: "few_sentences", weight: 30 },
    { value: "one_paragraph", weight: 20 },
    { value: "three_paragraphs", weight: 15 },
  ]);
}

// ============================================
// REVIEW TEXT TEMPLATES
// ============================================

const REVIEW_ASPECTS = [
  "plot",
  "characters",
  "world-building",
  "pacing",
  "narration",
  "prose style",
  "ending",
  "twists",
  "emotional impact",
  "themes",
  "dialogue",
  "character development",
  "atmosphere",
  "voice acting",
  "story structure",
];

const REVIEW_POSITIVE_ADJECTIVES = [
  "amazing",
  "brilliant",
  "captivating",
  "compelling",
  "engaging",
  "fantastic",
  "gripping",
  "immersive",
  "incredible",
  "masterful",
  "outstanding",
  "phenomenal",
  "riveting",
  "stunning",
  "superb",
  "wonderful",
];

const REVIEW_NEGATIVE_ADJECTIVES = [
  "boring",
  "confusing",
  "disappointing",
  "dull",
  "flat",
  "frustrating",
  "lackluster",
  "mediocre",
  "predictable",
  "shallow",
  "slow",
  "tedious",
  "underdeveloped",
  "uninspired",
  "weak",
];

const MIXED_TRANSITIONS = [
  "However,",
  "That said,",
  "On the other hand,",
  "Unfortunately,",
  "But",
  "Despite this,",
  "Still,",
];

// Rating 1 templates
const NEGATIVE_OPENERS = [
  "Couldn't finish this.",
  "I really wanted to like this but it just didn't work for me.",
  "Disappointing on multiple levels.",
  "Not for me at all.",
  "Struggled to get through this one.",
  "I had high hopes but was let down.",
  "DNF'd at about 40%.",
  "This was a chore to listen to.",
];

const NEGATIVE_COMPLAINTS = [
  "The pacing was painfully slow.",
  "I couldn't connect with any of the characters.",
  "The plot made no sense.",
  "The narrator's voice was grating.",
  "Nothing happened for the first several hours.",
  "The dialogue felt stilted and unnatural.",
  "Too many subplots that went nowhere.",
  "The ending completely fell apart.",
  "Full of cliches and predictable twists.",
  "The main character was insufferable.",
  "The world-building was confusing and inconsistent.",
  "Way too long for the story it was telling.",
];

// Rating 2 templates
const MIXED_OPENERS = [
  "It was okay.",
  "Not bad, not great.",
  "A solid 'meh' from me.",
  "Had its moments.",
  "I can see why some people love this, but...",
  "Decent enough, I suppose.",
  "It's fine.",
  "Mixed feelings on this one.",
];

const MIXED_POSITIVES = [
  "The concept was interesting",
  "Some of the characters were memorable",
  "The narrator did a good job",
  "The world-building had potential",
  "There were some genuinely exciting moments",
  "The prose was pleasant enough",
  "The beginning was promising",
  "A few scenes really stood out",
];

const MIXED_NEGATIVES = [
  "the execution fell short",
  "it dragged in the middle",
  "some characters felt underdeveloped",
  "the ending was rushed",
  "it didn't quite come together",
  "some plot threads were left hanging",
  "it was longer than it needed to be",
  "the pacing was uneven",
];

// Rating 3 templates
const POSITIVE_OPENERS = [
  "Absolutely loved this!",
  "One of my favorites this year.",
  "Couldn't put it down.",
  "This was incredible.",
  "What a ride!",
  "Exceeded all my expectations.",
  "I'm still thinking about this weeks later.",
  "Instant favorite.",
  "Why did I wait so long to read this?",
  "This deserves all the hype.",
];

const POSITIVE_PRAISES = [
  "The characters felt like real people I wanted to know.",
  "Every twist caught me off guard in the best way.",
  "The narrator brought this story to life perfectly.",
  "The world-building is incredibly detailed and immersive.",
  "The emotional moments hit hard.",
  "The pacing was perfect - never a dull moment.",
  "The prose is beautiful without being overwrought.",
  "Such a satisfying ending.",
  "The character development is top-notch.",
  "The dialogue is sharp and witty.",
  "The themes are handled with nuance and care.",
  "The atmosphere drew me in completely.",
];

// Extended content for longer reviews
const PERSONAL_SETUPS = [
  "I've been meaning to read this for a while and finally got around to it.",
  "This was recommended by a friend and I'm so glad I listened.",
  "Picked this up on a whim and was pleasantly surprised.",
  "This has been on my TBR for years.",
  "I went in completely blind and that was the perfect way to experience this.",
  "Second time through and it's even better.",
  "Finally jumped on the bandwagon with this one.",
];

const COMPARISONS = [
  "Reminds me of early Brandon Sanderson but with its own unique voice.",
  "If you liked Project Hail Mary, you'll probably enjoy this.",
  "Gave me similar vibes to The Name of the Wind.",
  "Fans of character-driven fantasy will eat this up.",
  "Think Game of Thrones meets modern sensibilities.",
  "Has the cozy feel of a Becky Chambers novel.",
  "Scratched the same itch as The Expanse series.",
  "Similar energy to Andy Weir's work.",
];

const RECOMMENDATIONS = [
  "Perfect for long road trips.",
  "Highly recommend the audiobook specifically.",
  "Would definitely recommend to fans of the genre.",
  "Already planning to check out more from this author.",
  "Can't wait for the sequel.",
  "Going to be recommending this to everyone.",
  "This should be more popular than it is.",
  "A must-read for anyone who enjoys thoughtful fiction.",
];

const NEGATIVE_RECOMMENDATIONS = [
  "Maybe skip this one.",
  "I wouldn't recommend it unless you're really into this specific niche.",
  "There are better options in the genre.",
  "Life's too short for books like this.",
  "Save your credit for something else.",
];

const PARAGRAPH_CLOSERS = [
  "Overall, I think this is worth checking out if you're in the right mood for it.",
  "In the end, I'm glad I gave it a chance.",
  "All things considered, this was a worthwhile listen.",
  "Despite some flaws, I found myself invested by the end.",
  "Would I recommend it? With some caveats, yes.",
  "Not perfect, but definitely memorable.",
  "A flawed gem that I still appreciated.",
];

// ============================================
// REVIEW TEXT GENERATION
// ============================================

function generateSingleSentence(random: () => number, rating: number): string {
  const aspect = seededRandomPick(random, REVIEW_ASPECTS);

  if (rating === 1) {
    const templates = [
      `The ${aspect} was ${seededRandomPick(random, REVIEW_NEGATIVE_ADJECTIVES)}.`,
      seededRandomPick(random, NEGATIVE_COMPLAINTS),
      seededRandomPick(random, NEGATIVE_OPENERS),
      `Not a fan of the ${aspect} at all.`,
      `Couldn't get past the ${seededRandomPick(random, REVIEW_NEGATIVE_ADJECTIVES)} ${aspect}.`,
    ];
    return seededRandomPick(random, templates);
  }

  if (rating === 2) {
    const templates = [
      seededRandomPick(random, MIXED_OPENERS),
      `The ${aspect} was okay but nothing special.`,
      `${seededRandomPick(random, MIXED_POSITIVES)} but ${seededRandomPick(random, MIXED_NEGATIVES)}.`,
      `Some good ideas, uneven execution.`,
      `Had potential but didn't quite deliver.`,
    ];
    return seededRandomPick(random, templates);
  }

  // Rating 3
  const templates = [
    seededRandomPick(random, POSITIVE_OPENERS),
    seededRandomPick(random, POSITIVE_PRAISES),
    `The ${aspect} was ${seededRandomPick(random, REVIEW_POSITIVE_ADJECTIVES)}.`,
    `${capitalize(seededRandomPick(random, REVIEW_POSITIVE_ADJECTIVES))} ${aspect} throughout.`,
    `Loved everything about the ${aspect}.`,
  ];
  return seededRandomPick(random, templates);
}

function generateFewSentences(random: () => number, rating: number): string {
  const sentences: string[] = [];
  const numSentences = 2 + Math.floor(random() * 3); // 2-4 sentences

  if (rating === 1) {
    sentences.push(seededRandomPick(random, NEGATIVE_OPENERS));
    for (let i = 1; i < numSentences; i++) {
      sentences.push(seededRandomPick(random, NEGATIVE_COMPLAINTS));
    }
  } else if (rating === 2) {
    sentences.push(seededRandomPick(random, MIXED_OPENERS));
    sentences.push(
      `${seededRandomPick(random, MIXED_POSITIVES)}, but ${seededRandomPick(random, MIXED_NEGATIVES)}.`
    );
    if (numSentences > 2) {
      const aspect = seededRandomPick(random, REVIEW_ASPECTS);
      sentences.push(`The ${aspect} was decent enough.`);
    }
    if (numSentences > 3) {
      sentences.push(`I might check out more from this author.`);
    }
  } else {
    sentences.push(seededRandomPick(random, POSITIVE_OPENERS));
    sentences.push(seededRandomPick(random, POSITIVE_PRAISES));
    if (numSentences > 2) {
      sentences.push(seededRandomPick(random, POSITIVE_PRAISES));
    }
    if (numSentences > 3) {
      sentences.push(seededRandomPick(random, RECOMMENDATIONS));
    }
  }

  return sentences.join(" ");
}

function generateOneParagraph(random: () => number, rating: number): string {
  const sentences: string[] = [];

  // Optional personal setup
  if (random() > 0.5) {
    sentences.push(seededRandomPick(random, PERSONAL_SETUPS));
  }

  if (rating === 1) {
    sentences.push(seededRandomPick(random, NEGATIVE_OPENERS));
    sentences.push(seededRandomPick(random, NEGATIVE_COMPLAINTS));
    sentences.push(seededRandomPick(random, NEGATIVE_COMPLAINTS));
    const aspect = seededRandomPick(random, REVIEW_ASPECTS);
    sentences.push(
      `The ${aspect} was particularly ${seededRandomPick(random, REVIEW_NEGATIVE_ADJECTIVES)}.`
    );
    if (random() > 0.5) {
      sentences.push(seededRandomPick(random, NEGATIVE_RECOMMENDATIONS));
    }
  } else if (rating === 2) {
    sentences.push(seededRandomPick(random, MIXED_OPENERS));
    sentences.push(`${seededRandomPick(random, MIXED_POSITIVES)}, and I appreciated that.`);
    sentences.push(
      `${seededRandomPick(random, MIXED_TRANSITIONS)} ${seededRandomPick(random, MIXED_NEGATIVES)}.`
    );
    const aspect = seededRandomPick(random, REVIEW_ASPECTS);
    sentences.push(`The ${aspect} was a mixed bag - some parts worked, others didn't.`);
    sentences.push(seededRandomPick(random, PARAGRAPH_CLOSERS));
  } else {
    sentences.push(seededRandomPick(random, POSITIVE_OPENERS));
    sentences.push(seededRandomPick(random, POSITIVE_PRAISES));
    sentences.push(seededRandomPick(random, POSITIVE_PRAISES));
    if (random() > 0.5) {
      sentences.push(seededRandomPick(random, COMPARISONS));
    }
    sentences.push(seededRandomPick(random, RECOMMENDATIONS));
  }

  return sentences.join(" ");
}

function generateThreeParagraphs(random: () => number, rating: number): string {
  const paragraphs: string[] = [];

  // Paragraph 1: Setup and initial impression
  const p1Sentences: string[] = [];
  p1Sentences.push(seededRandomPick(random, PERSONAL_SETUPS));

  if (rating === 1) {
    p1Sentences.push(
      `I was hoping for something better, but ${seededRandomPick(random, NEGATIVE_COMPLAINTS).toLowerCase()}`
    );
    p1Sentences.push(`From the beginning, I could tell this wasn't going to work for me.`);
  } else if (rating === 2) {
    p1Sentences.push(`I had moderate expectations going in, and that's about what I got.`);
    p1Sentences.push(seededRandomPick(random, MIXED_OPENERS));
  } else {
    p1Sentences.push(`From the first chapter, I knew this was going to be something special.`);
    p1Sentences.push(seededRandomPick(random, POSITIVE_OPENERS));
  }
  paragraphs.push(p1Sentences.join(" "));

  // Paragraph 2: Detailed analysis
  const p2Sentences: string[] = [];
  const aspect1 = seededRandomPick(random, REVIEW_ASPECTS);
  const aspect2 = seededRandomPick(
    random,
    REVIEW_ASPECTS.filter((a) => a !== aspect1)
  );

  if (rating === 1) {
    p2Sentences.push(
      `The ${aspect1} was ${seededRandomPick(random, REVIEW_NEGATIVE_ADJECTIVES)} throughout.`
    );
    p2Sentences.push(seededRandomPick(random, NEGATIVE_COMPLAINTS));
    p2Sentences.push(
      `And don't even get me started on the ${aspect2} - ${seededRandomPick(random, REVIEW_NEGATIVE_ADJECTIVES)} is the kindest word I can use.`
    );
    p2Sentences.push(seededRandomPick(random, NEGATIVE_COMPLAINTS));
  } else if (rating === 2) {
    p2Sentences.push(`Let me break down what worked and what didn't.`);
    p2Sentences.push(
      `The ${aspect1} was actually quite good - ${seededRandomPick(random, MIXED_POSITIVES).toLowerCase()}.`
    );
    p2Sentences.push(
      `${seededRandomPick(random, MIXED_TRANSITIONS)} the ${aspect2} ${seededRandomPick(random, MIXED_NEGATIVES)}.`
    );
    p2Sentences.push(`It's this inconsistency that keeps me from rating it higher.`);
  } else {
    p2Sentences.push(`The ${aspect1} was ${seededRandomPick(random, REVIEW_POSITIVE_ADJECTIVES)}.`);
    p2Sentences.push(seededRandomPick(random, POSITIVE_PRAISES));
    p2Sentences.push(
      `The ${aspect2} was equally impressive - ${seededRandomPick(random, POSITIVE_PRAISES).toLowerCase()}`
    );
    if (random() > 0.5) {
      p2Sentences.push(seededRandomPick(random, COMPARISONS));
    }
  }
  paragraphs.push(p2Sentences.join(" "));

  // Paragraph 3: Conclusion and recommendation
  const p3Sentences: string[] = [];

  if (rating === 1) {
    p3Sentences.push(`In conclusion, this just wasn't for me.`);
    p3Sentences.push(seededRandomPick(random, NEGATIVE_RECOMMENDATIONS));
    p3Sentences.push(
      `I'm sure some people enjoy it, but I found the experience frustrating from start to finish.`
    );
  } else if (rating === 2) {
    p3Sentences.push(seededRandomPick(random, PARAGRAPH_CLOSERS));
    p3Sentences.push(`If the premise sounds interesting to you, it might be worth a try.`);
    p3Sentences.push(`Just don't go in expecting perfection and you might enjoy it.`);
  } else {
    p3Sentences.push(
      `I cannot recommend this highly enough. ${seededRandomPick(random, RECOMMENDATIONS)}`
    );
    p3Sentences.push(`This is exactly the kind of book that reminds me why I love reading.`);
    if (random() > 0.5) {
      p3Sentences.push(`Already planning my re-listen!`);
    }
  }
  paragraphs.push(p3Sentences.join(" "));

  return paragraphs.join("\n\n");
}

function generateReviewText(
  random: () => number,
  rating: number,
  length: ReviewLength
): string | undefined {
  switch (length) {
    case "none":
      return undefined;
    case "single_sentence":
      return generateSingleSentence(random, rating);
    case "few_sentences":
      return generateFewSentences(random, rating);
    case "one_paragraph":
      return generateOneParagraph(random, rating);
    case "three_paragraphs":
      return generateThreeParagraphs(random, rating);
  }
}

// ============================================
// MAIN REVIEW GENERATOR
// ============================================

export function generateReviews(
  count: number,
  userIds: string[],
  bookIds: string[]
): GeneratedReview[] {
  if (userIds.length === 0 || bookIds.length === 0) {
    return [];
  }

  const reviews: GeneratedReview[] = [];
  const usedPairs = new Set<string>();
  const random = createSeededRandom(789); // Different seed from users/authors

  // Pre-assign personas to users and quality tiers to books
  const userPersonas = new Map<string, UserPersona>();
  for (const userId of userIds) {
    userPersonas.set(userId, assignUserPersona(random));
  }

  const bookQualityTiers = new Map<string, BookQualityTier>();
  for (const bookId of bookIds) {
    bookQualityTiers.set(bookId, assignBookQualityTier(random));
  }

  // Maximum possible unique pairs
  const maxPossiblePairs = userIds.length * bookIds.length;
  const targetCount = Math.min(count, maxPossiblePairs);

  let attempts = 0;
  const maxAttempts = targetCount * 10; // Prevent infinite loops

  while (reviews.length < targetCount && attempts < maxAttempts) {
    attempts++;

    const userId = seededRandomPick(random, userIds);
    const bookId = seededRandomPick(random, bookIds);
    const pairKey = `${userId}:${bookId}`;

    // Skip if this user already reviewed this book
    if (usedPairs.has(pairKey)) {
      continue;
    }
    usedPairs.add(pairKey);

    const persona = userPersonas.get(userId)!;
    const tier = bookQualityTiers.get(bookId)!;

    const rating = calculateRating(random, persona, tier);
    const reviewLength = pickReviewLength(random);
    const reviewText = generateReviewText(random, rating, reviewLength);

    // Privacy settings
    const isReadPrivate = random() < 0.1;
    const isReviewPrivate = isReadPrivate ? true : random() < 0.1;

    // Generate random timestamps (within past 2 years / 730 days)
    // readAt is when the book was finished, reviewedAt is when review was written
    // reviewedAt should be same or slightly after readAt
    const readAt = seededRandomTimestamp(random, 730);
    // Review written 0-7 days after finishing the book
    const reviewDelay = Math.floor(random() * 7 * 24 * 60 * 60 * 1000);
    const reviewedAt = readAt + reviewDelay;

    reviews.push({
      userId,
      bookId,
      isRead: true,
      rating,
      reviewText,
      isReadPrivate,
      isReviewPrivate,
      readAt,
      reviewedAt: rating || reviewText ? reviewedAt : undefined,
    });
  }

  return reviews;
}
