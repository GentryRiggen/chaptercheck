import { X } from "lucide-react-native";
import { createContext, type ReactNode, useContext } from "react";

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@chaptercheck/tailwind-config/cn";

import { useThemeColors } from "@/hooks/useThemeColors";

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
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-background"
      >
        <View
          className={cn("flex-1", className)}
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <DialogClose className="absolute right-4 z-10" style={{ top: insets.top + 12 }} />
          <ScrollView
            contentContainerClassName="grow"
            keyboardShouldPersistTaps="handled"
            style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return <View className={cn("mb-4 gap-1.5 pr-8", className)}>{children}</View>;
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
  return <View className={cn("mt-6 flex-row justify-end gap-2", className)}>{children}</View>;
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
  style?: object;
}

function DialogClose({ className, style }: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={() => onOpenChange(false)}
      className={cn(
        "items-center justify-center rounded-sm opacity-70 active:opacity-100",
        className
      )}
      style={style}
      hitSlop={8}
      accessibilityLabel="Close dialog"
      accessibilityRole="button"
    >
      <X size={18} color={colors.mutedForeground} />
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
