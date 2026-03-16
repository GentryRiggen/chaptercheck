// This file is intentionally empty.
//
// GlobalDataProviders (CurrentUserProvider, GenreProvider, TagProvider) use the
// type-based @Environment(Type.self) pattern — the same approach used by
// AudioPlayerManager and DownloadManager — so no EnvironmentKey definitions
// are needed. The providers are injected in MainView via `.environment(provider)`.
