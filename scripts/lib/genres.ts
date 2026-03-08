/**
 * OL subject → genre mapping and genre cache for import/enrich scripts.
 *
 * OL subjects mix genres ("Fantasy"), topics ("Kings and rulers"),
 * and metadata ("Accessible book"). We use an allowlist of recognized genres
 * and map OL subject variations to canonical genre names.
 */

import { ConvexHttpClient } from "convex/browser";

import { api } from "../../packages/convex-backend/convex/_generated/api";

// =============================================================================
// GENRE ALLOWLIST
// =============================================================================

// Map of OL subject (lowercased) → canonical genre name
const GENRE_MAP = new Map<string, string>([
  // Fiction genres
  ["fantasy", "Fantasy"],
  ["epic fantasy", "Epic Fantasy"],
  ["urban fantasy", "Urban Fantasy"],
  ["dark fantasy", "Dark Fantasy"],
  ["science fiction", "Science Fiction"],
  ["science fiction, general", "Science Fiction"],
  ["fiction, science fiction, general", "Science Fiction"],
  ["sci-fi", "Science Fiction"],
  ["mystery", "Mystery"],
  ["mystery and detective stories", "Mystery"],
  ["detective and mystery stories", "Mystery"],
  ["detective", "Mystery"],
  ["thriller", "Thriller"],
  ["thrillers", "Thriller"],
  ["suspense", "Thriller"],
  ["psychological thriller", "Psychological Thriller"],
  ["romance", "Romance"],
  ["romance fiction", "Romance"],
  ["contemporary romance", "Contemporary Romance"],
  ["paranormal romance", "Paranormal Romance"],
  ["horror", "Horror"],
  ["horror fiction", "Horror"],
  ["horror tales", "Horror"],
  ["historical fiction", "Historical Fiction"],
  ["fiction, historical", "Historical Fiction"],
  ["fiction, historical, general", "Historical Fiction"],
  ["adventure", "Adventure"],
  ["adventure fiction", "Adventure"],
  ["adventure and adventurers", "Adventure"],
  ["action & adventure", "Adventure"],
  ["literary fiction", "Literary Fiction"],
  ["literary", "Literary Fiction"],
  ["classics", "Classics"],
  ["classic literature", "Classics"],
  ["dystopian", "Dystopian"],
  ["dystopias", "Dystopian"],
  ["dystopian fiction", "Dystopian"],
  ["crime", "Crime"],
  ["crime fiction", "Crime"],
  ["war", "War"],
  ["war fiction", "War"],
  ["war stories", "War"],
  ["humor", "Humor"],
  ["humorous fiction", "Humor"],
  ["comedy", "Humor"],
  ["satire", "Satire"],
  ["drama", "Drama"],
  ["gothic", "Gothic"],
  ["gothic fiction", "Gothic"],
  ["western", "Western"],
  ["westerns", "Western"],
  ["spy stories", "Espionage"],
  ["espionage", "Espionage"],
  ["coming of age", "Coming Of Age"],
  ["bildungsroman", "Coming Of Age"],
  ["fairy tales", "Fairy Tales"],
  ["folklore", "Folklore"],
  ["mythology", "Mythology"],
  ["steampunk", "Steampunk"],
  ["cyberpunk", "Cyberpunk"],
  ["space opera", "Space Opera"],
  ["military fiction", "Military Fiction"],
  ["political fiction", "Political Fiction"],
  ["magical realism", "Magical Realism"],
  ["short stories", "Short Stories"],
  ["graphic novels", "Graphic Novel"],
  ["graphic novel", "Graphic Novel"],
  ["comics", "Graphic Novel"],

  // Non-fiction genres
  ["biography", "Biography"],
  ["biography & autobiography", "Biography"],
  ["autobiography", "Autobiography"],
  ["memoir", "Memoir"],
  ["memoirs", "Memoir"],
  ["history", "History"],
  ["world history", "History"],
  ["science", "Science"],
  ["popular science", "Science"],
  ["philosophy", "Philosophy"],
  ["psychology", "Psychology"],
  ["self-help", "Self-Help"],
  ["self help", "Self-Help"],
  ["personal development", "Self-Help"],
  ["business", "Business"],
  ["business & economics", "Business"],
  ["economics", "Economics"],
  ["politics", "Politics"],
  ["political science", "Politics"],
  ["travel", "Travel"],
  ["travel writing", "Travel"],
  ["religion", "Religion"],
  ["spirituality", "Spirituality"],
  ["art", "Art"],
  ["music", "Music"],
  ["cooking", "Cooking"],
  ["cookbooks", "Cooking"],
  ["health", "Health"],
  ["health & fitness", "Health"],
  ["technology", "Technology"],
  ["computers", "Technology"],
  ["true crime", "True Crime"],
  ["nature", "Nature"],
  ["environment", "Environment"],
  ["poetry", "Poetry"],
  ["essays", "Essays"],
  ["journalism", "Journalism"],
  ["mathematics", "Mathematics"],
  ["sociology", "Sociology"],
  ["anthropology", "Anthropology"],
  ["linguistics", "Linguistics"],
  ["education", "Education"],
  ["parenting", "Parenting"],

  // Age categories
  ["young adult", "Young Adult"],
  ["young adult fiction", "Young Adult"],
  ["ya", "Young Adult"],
  ["children's fiction", "Children's"],
  ["children", "Children's"],
  ["children's literature", "Children's"],
  ["middle grade", "Middle Grade"],

  // Crossover subjects that map well to genres
  ["vampires", "Vampires"],
  ["werewolves", "Werewolves"],
  ["zombies", "Zombies"],
  ["dragons", "Dragons"],
  ["magic", "Magic"],
  ["wizards", "Wizards"],
  ["witches", "Witches"],
  ["robots", "Robots"],
  ["aliens", "Aliens"],
  ["time travel", "Time Travel"],
  ["apocalyptic", "Post-Apocalyptic"],
  ["post-apocalyptic", "Post-Apocalyptic"],
  ["superheroes", "Superheroes"],
  ["pirates", "Pirates"],
  ["napoleonic wars", "Historical Fiction"],
  ["world war, 1939-1945", "War"],
  ["entrepreneurship", "Entrepreneurship"],
  ["litrpg", "LitRPG"],
  ["gamelit", "GameLit"],
  ["progression fantasy", "Progression Fantasy"],
  ["cultivation", "Cultivation"],
  ["harem", "Harem"],
  ["isekai", "Isekai"],
  ["wuxia", "Wuxia"],
  ["xianxia", "Xianxia"],
]);

// =============================================================================
// EXTRACT GENRES
// =============================================================================

/**
 * Extract clean genre names from OL subjects using the allowlist.
 * Returns up to maxGenres unique genres.
 */
export function extractGenres(subjects: string[] | undefined, maxGenres = 5): string[] {
  if (!subjects?.length) return [];

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const subject of subjects) {
    const lower = subject.toLowerCase().trim();
    const canonical = GENRE_MAP.get(lower);

    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      genres.push(canonical);
      if (genres.length >= maxGenres) break;
    }
  }

  return genres;
}

// =============================================================================
// GENRE CACHE
// =============================================================================

/**
 * Caches genre name → Convex ID mappings to avoid repeated upserts.
 */
export class GenreCache {
  private cache = new Map<string, string>();

  async resolve(
    genreName: string,
    client: ConvexHttpClient,
    dryRun: boolean
  ): Promise<string | null> {
    const key = genreName.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key)!;

    if (dryRun) {
      this.cache.set(key, `dry-run-${key}`);
      return `dry-run-${key}`;
    }

    const result = await client.mutation(api.seed.mutations.upsertGenreByName, {
      name: genreName,
    });

    if (result.genreId) {
      this.cache.set(key, result.genreId);
      return result.genreId;
    }

    return null;
  }

  get size(): number {
    return this.cache.size;
  }
}
