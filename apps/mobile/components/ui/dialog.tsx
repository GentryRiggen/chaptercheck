import { X } from "lucide-react-native";
import { createContext, type ReactNode, useContext } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface DialogContextValue {
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog compound components must be used within a <Dialog /> parent.");
  }
  return context;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) {
    return null;
  }

  return <DialogContext.Provider value={{ onOpenChange }}>{children}</DialogContext.Provider>;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

function DialogContent({ children, className }: DialogContentProps) {
  const { onOpenChange } = useDialogContext();

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/80"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className={cn("w-full max-w-sm rounded-lg bg-card p-6", className)}
          onPress={(e) => e.stopPropagation()}
        >
          <DialogClose className="absolute right-4 top-4 z-10" />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return <View className={cn("mb-4 gap-1.5", className)}>{children}</View>;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return <View className={cn("mt-4 flex-row justify-end gap-2", className)}>{children}</View>;
}

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

function DialogTitle({ children, className }: DialogTitleProps) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)}>{children}</Text>;
}

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

function DialogDescription({ children, className }: DialogDescriptionProps) {
  return <Text className={cn("text-sm text-muted-foreground", className)}>{children}</Text>;
}

interface DialogCloseProps {
  className?: string;
}

function DialogClose({ className }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();

  return (
    <Pressable
      onPress={() => onOpenChange(false)}
      className={cn(
        "items-center justify-center rounded-sm opacity-70 active:opacity-100",
        className
      )}
      hitSlop={8}
      accessibilityLabel="Close dialog"
      accessibilityRole="button"
    >
      <X size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
