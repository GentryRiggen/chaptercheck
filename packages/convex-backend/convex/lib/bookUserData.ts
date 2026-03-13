export const BOOK_STATUS_VALUES = ["want_to_read", "reading", "finished", "paused", "dnf"] as const;

export type BookStatus = (typeof BOOK_STATUS_VALUES)[number];

type BookUserDataLike = {
  status?: string;
  isRead?: boolean;
  finishedAt?: number;
  readAt?: number;
  createdAt: number;
};

export function isFinishedStatus(status?: string): status is "finished" {
  return status === "finished";
}

export function isBookFinished(data: BookUserDataLike): boolean {
  if (data.status) {
    return isFinishedStatus(data.status);
  }
  return data.isRead === true;
}

export function getFinishedAt(data: BookUserDataLike): number {
  return data.finishedAt ?? data.readAt ?? data.createdAt;
}

export function getLegacyIsRead(status?: string): boolean {
  return status === "finished";
}
