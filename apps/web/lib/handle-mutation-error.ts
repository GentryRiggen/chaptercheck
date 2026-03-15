import { toast } from "sonner";

export function handleMutationError(err: unknown, fallbackMessage: string) {
  console.error(err);
  const message = err instanceof Error ? err.message : fallbackMessage;
  const userMessage =
    message.includes("not configured") || message.includes("CONVEX") ? fallbackMessage : message;
  toast.error(userMessage);
}
