import { api } from "@chaptercheck/convex-backend/_generated/api";
import type { Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction } from "convex/react";
import {
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  type DownloadProgressData,
  type DownloadResumable,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  // Legacy API required for DownloadResumable with progress tracking — the
  // new expo-file-system v19 File.downloadFileAsync API does not support it.
} from "expo-file-system/legacy";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DownloadRecord {
  audioFileId: string;
  bookId: string;
  bookTitle: string;
  displayName: string;
  localPath: string;
  fileSize: number;
  downloadedAt: number;
}

interface ActiveDownload {
  progress: number; // 0-1
}

interface DownloadedBookSummary {
  bookId: string;
  bookTitle: string;
  files: DownloadRecord[];
  totalSize: number;
}

interface DownloadManagerContextValue {
  downloadFile: (
    audioFileId: Id<"audioFiles">,
    bookId: Id<"books">,
    bookTitle: string,
    displayName: string,
    fileSize: number,
    format: string
  ) => Promise<void>;
  downloadAllForBook: (
    bookId: Id<"books">,
    audioFiles: Array<{
      _id: Id<"audioFiles">;
      displayName: string;
      fileSize: number;
      format: string;
    }>,
    bookTitle: string
  ) => Promise<void>;
  cancelDownload: (audioFileId: string) => void;
  deleteDownload: (audioFileId: string) => Promise<void>;
  deleteDownloadsForBook: (bookId: string) => Promise<void>;
  deleteAllDownloads: () => Promise<void>;
  getLocalPath: (audioFileId: string) => string | null;
  isDownloaded: (audioFileId: string) => boolean;
  getDownloadProgress: (audioFileId: string) => number | null;
  getStorageUsed: () => number;
  getStorageUsedForBook: (bookId: string) => number;
  getDownloadedBooks: () => DownloadedBookSummary[];
  downloads: Map<string, DownloadRecord>;
  activeDownloads: Map<string, ActiveDownload>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "chaptercheck-downloads";
const DOWNLOADS_DIR = `${documentDirectory}downloads/`;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DownloadManagerContext = createContext<DownloadManagerContextValue | null>(null);

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Map<string, DownloadRecord>>(new Map());
  const [activeDownloads, setActiveDownloads] = useState<Map<string, ActiveDownload>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);

  // Refs for stable callback access — avoids stale closures in long-running
  // async functions like downloadFile
  const downloadsRef = useRef(downloads);
  downloadsRef.current = downloads;

  const activeDownloadsRef = useRef(activeDownloads);
  activeDownloadsRef.current = activeDownloads;

  // Refs for active download resumables (to support cancellation)
  const resumablesRef = useRef<Map<string, DownloadResumable>>(new Map());
  // Ref to track downloads-in-progress for downloadAllForBook cancellation
  const bookDownloadAbortRef = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Persistence — runs as a side-effect whenever downloads changes, rather than
  // inside state updaters (which React expects to be pure)
  // ---------------------------------------------------------------------------

  const skipNextPersistRef = useRef(true); // skip the initial mount
  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const data = Object.fromEntries(downloads);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {
      // Non-critical write failure
    });
  }, [downloads]);

  // ---------------------------------------------------------------------------
  // Initialize: load persisted records, ensure download dir, verify files
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Ensure downloads directory exists
      const dirInfo = await getInfoAsync(DOWNLOADS_DIR);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
      }

      // Load persisted download records
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as Record<string, DownloadRecord>;
          const verified = new Map<string, DownloadRecord>();

          // Verify each file still exists on disk
          for (const [id, record] of Object.entries(parsed)) {
            const info = await getInfoAsync(record.localPath);
            if (info.exists) {
              verified.set(id, record);
            }
          }

          if (!cancelled) {
            setDownloads(verified);
          }
        }
      } catch {
        // Failed to read — start fresh
      }

      if (!cancelled) {
        setIsInitialized(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Download a single file
  // ---------------------------------------------------------------------------

  const downloadFile = useCallback(
    async (
      audioFileId: Id<"audioFiles">,
      bookId: Id<"books">,
      bookTitle: string,
      displayName: string,
      fileSize: number,
      format: string
    ) => {
      const id = audioFileId as string;

      // Use refs for guard check — the callback may be stale but refs are always current
      if (downloadsRef.current.has(id) || activeDownloadsRef.current.has(id)) return;

      // Mark as active
      setActiveDownloads((prev) => {
        const next = new Map(prev);
        next.set(id, { progress: 0 });
        return next;
      });

      try {
        // Get presigned URL
        const { streamUrl } = await generateStreamUrl({ audioFileId });

        const localPath = `${DOWNLOADS_DIR}${id}.${format}`;

        const callback = (data: DownloadProgressData) => {
          // Ignore late-firing callbacks after download completed/cancelled
          if (!resumablesRef.current.has(id)) return;
          if (data.totalBytesExpectedToWrite > 0) {
            const progress = data.totalBytesWritten / data.totalBytesExpectedToWrite;
            setActiveDownloads((prev) => {
              const next = new Map(prev);
              next.set(id, { progress });
              return next;
            });
          }
        };

        const downloadResumable = createDownloadResumable(streamUrl, localPath, {}, callback);

        resumablesRef.current.set(id, downloadResumable);

        const result = await downloadResumable.downloadAsync();

        // Clean up resumable ref
        resumablesRef.current.delete(id);

        if (!result) {
          // Download was cancelled
          setActiveDownloads((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          return;
        }

        // Record the download
        const record: DownloadRecord = {
          audioFileId: id,
          bookId: bookId as string,
          bookTitle,
          displayName,
          localPath,
          fileSize,
          downloadedAt: Date.now(),
        };

        // Update both states — React batches these into a single re-render
        setDownloads((prev) => {
          const next = new Map(prev);
          next.set(id, record);
          return next;
        });
        setActiveDownloads((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        // Clean up on failure
        resumablesRef.current.delete(id);
        setActiveDownloads((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });

        // Try to clean up partial file
        const localPath = `${DOWNLOADS_DIR}${id}.${format}`;
        try {
          const info = await getInfoAsync(localPath);
          if (info.exists) {
            await deleteAsync(localPath, { idempotent: true });
          }
        } catch {
          // Ignore cleanup failure
        }

        const message = err instanceof Error ? err.message : "Download failed";
        Alert.alert("Download Failed", message);
      }
    },
    [generateStreamUrl]
  );

  // ---------------------------------------------------------------------------
  // Download all files for a book (sequentially)
  // ---------------------------------------------------------------------------

  const downloadAllForBook = useCallback(
    async (
      bookId: Id<"books">,
      audioFiles: Array<{
        _id: Id<"audioFiles">;
        displayName: string;
        fileSize: number;
        format: string;
      }>,
      bookTitle: string
    ) => {
      const bId = bookId as string;
      bookDownloadAbortRef.current.delete(bId);

      for (const file of audioFiles) {
        // Check if cancelled
        if (bookDownloadAbortRef.current.has(bId)) break;
        // Skip already downloaded — use ref for current state
        if (downloadsRef.current.has(file._id as string)) continue;

        await downloadFile(
          file._id,
          bookId,
          bookTitle,
          file.displayName,
          file.fileSize,
          file.format
        );
      }
    },
    [downloadFile]
  );

  // ---------------------------------------------------------------------------
  // Cancel an active download
  // ---------------------------------------------------------------------------

  const cancelDownload = useCallback((audioFileId: string) => {
    const resumable = resumablesRef.current.get(audioFileId);
    if (resumable) {
      resumable.pauseAsync();
      resumablesRef.current.delete(audioFileId);
    }

    setActiveDownloads((prev) => {
      const next = new Map(prev);
      next.delete(audioFileId);
      return next;
    });

    // Best effort: delete any partial file matching the id
    const cleanupPartial = async () => {
      try {
        const dirContents = await readDirectoryAsync(DOWNLOADS_DIR);
        for (const fileName of dirContents) {
          if (fileName.startsWith(`${audioFileId}.`)) {
            await deleteAsync(`${DOWNLOADS_DIR}${fileName}`, { idempotent: true });
          }
        }
      } catch {
        // Ignore
      }
    };
    cleanupPartial();
  }, []);

  // ---------------------------------------------------------------------------
  // Delete a downloaded file
  // ---------------------------------------------------------------------------

  const deleteDownload = useCallback(async (audioFileId: string) => {
    const record = downloadsRef.current.get(audioFileId);
    if (!record) return;

    try {
      await deleteAsync(record.localPath, { idempotent: true });
    } catch {
      // File may already be gone
    }

    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(audioFileId);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Delete all downloads for a book
  // ---------------------------------------------------------------------------

  const deleteDownloadsForBook = useCallback(async (bookId: string) => {
    // Cancel any active downloads for this book
    bookDownloadAbortRef.current.add(bookId);

    const toDelete: string[] = [];
    for (const [id, record] of downloadsRef.current) {
      if (record.bookId === bookId) {
        toDelete.push(id);
        try {
          await deleteAsync(record.localPath, { idempotent: true });
        } catch {
          // Ignore
        }
      }
    }

    if (toDelete.length > 0) {
      setDownloads((prev) => {
        const next = new Map(prev);
        for (const id of toDelete) {
          next.delete(id);
        }
        return next;
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Delete all downloads
  // ---------------------------------------------------------------------------

  const deleteAllDownloads = useCallback(async () => {
    // Cancel all active downloads
    for (const [id] of resumablesRef.current) {
      const resumable = resumablesRef.current.get(id);
      if (resumable) {
        resumable.pauseAsync();
      }
    }
    resumablesRef.current.clear();
    setActiveDownloads(new Map());

    // Delete all files
    for (const [, record] of downloadsRef.current) {
      try {
        await deleteAsync(record.localPath, { idempotent: true });
      } catch {
        // Ignore
      }
    }

    setDownloads(new Map());
  }, []);

  // ---------------------------------------------------------------------------
  // Query helpers
  // ---------------------------------------------------------------------------

  const getLocalPath = useCallback(
    (audioFileId: string): string | null => {
      const record = downloads.get(audioFileId);
      return record ? record.localPath : null;
    },
    [downloads]
  );

  const isDownloaded = useCallback(
    (audioFileId: string): boolean => {
      return downloads.has(audioFileId);
    },
    [downloads]
  );

  const getDownloadProgress = useCallback(
    (audioFileId: string): number | null => {
      const active = activeDownloads.get(audioFileId);
      return active ? active.progress : null;
    },
    [activeDownloads]
  );

  const getStorageUsed = useCallback((): number => {
    let total = 0;
    for (const [, record] of downloads) {
      total += record.fileSize;
    }
    return total;
  }, [downloads]);

  const getStorageUsedForBook = useCallback(
    (bookId: string): number => {
      let total = 0;
      for (const [, record] of downloads) {
        if (record.bookId === bookId) {
          total += record.fileSize;
        }
      }
      return total;
    },
    [downloads]
  );

  const getDownloadedBooks = useCallback((): DownloadedBookSummary[] => {
    const bookMap = new Map<string, DownloadedBookSummary>();

    for (const [, record] of downloads) {
      const existing = bookMap.get(record.bookId);
      if (existing) {
        existing.files.push(record);
        existing.totalSize += record.fileSize;
      } else {
        bookMap.set(record.bookId, {
          bookId: record.bookId,
          bookTitle: record.bookTitle,
          files: [record],
          totalSize: record.fileSize,
        });
      }
    }

    return Array.from(bookMap.values()).sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
  }, [downloads]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = useMemo(
    (): DownloadManagerContextValue => ({
      downloadFile,
      downloadAllForBook,
      cancelDownload,
      deleteDownload,
      deleteDownloadsForBook,
      deleteAllDownloads,
      getLocalPath,
      isDownloaded,
      getDownloadProgress,
      getStorageUsed,
      getStorageUsedForBook,
      getDownloadedBooks,
      downloads,
      activeDownloads,
    }),
    [
      downloadFile,
      downloadAllForBook,
      cancelDownload,
      deleteDownload,
      deleteDownloadsForBook,
      deleteAllDownloads,
      getLocalPath,
      isDownloaded,
      getDownloadProgress,
      getStorageUsed,
      getStorageUsedForBook,
      getDownloadedBooks,
      downloads,
      activeDownloads,
    ]
  );

  // Cancel active downloads on provider unmount
  useEffect(() => {
    return () => {
      for (const [, resumable] of resumablesRef.current) {
        resumable.pauseAsync();
      }
      resumablesRef.current.clear();
    };
  }, []);

  if (!isInitialized) return null;

  return (
    <DownloadManagerContext.Provider value={value}>{children}</DownloadManagerContext.Provider>
  );
}

export function useDownloadManager(): DownloadManagerContextValue {
  const context = useContext(DownloadManagerContext);
  if (!context) {
    throw new Error("useDownloadManager must be used within a DownloadManagerProvider");
  }
  return context;
}
