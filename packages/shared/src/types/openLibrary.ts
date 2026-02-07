export interface OpenLibraryBookSuggestion {
  key: string;
  title: string;
  subtitle?: string;
  description?: string;
  isbn?: string;
  publishedYear?: number;
  language?: string;
  coverUrl?: string;
  authors: Array<{ name: string; key?: string }>;
}

export interface OpenLibraryAuthorSuggestion {
  key: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  topWork?: string;
}
