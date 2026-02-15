import { X } from "lucide-react-native";
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import { Animated, Dimensions, Modal, Pressable, Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

import { useThemeColors } from "@/hooks/useThemeColors";

interface SheetContextValue {
  onOpenChange: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext(): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet compound components must be used within a <Sheet /> parent.");
  }
  return context;
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) {
    return null;
  }

  return <SheetContext.Provider value={{ onOpenChange }}>{children}</SheetContext.Provider>;
}

type SheetSide = "bottom" | "right";

interface SheetContentProps {
  children: ReactNode;
  className?: string;
  side?: SheetSide;
}

const ANIMATION_DURATION = 300;

function SheetContent({ children, className, side = "bottom" }: SheetContentProps) {
  const { onOpenChange } = useSheetContext();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onOpenChange(false);
    });
  };

  const isBottom = side === "bottom";

  const translateStyle = isBottom
    ? {
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, screenHeight],
            }),
          },
        ],
      }
    : {
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, screenWidth],
            }),
          },
        ],
      };

  const contentPositionClassName = isBottom
    ? "absolute bottom-0 left-0 right-0"
    : "absolute bottom-0 right-0 top-0";

  const contentShapeClassName = isBottom ? "rounded-t-xl" : "w-3/4";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View className="flex-1">
        <Animated.View className="absolute inset-0 bg-black/50" style={{ opacity: overlayAnim }}>
          <Pressable className="flex-1" onPress={handleClose} />
        </Animated.View>

        <Animated.View
          className={cn(contentPositionClassName, contentShapeClassName, "bg-card p-6", className)}
          style={translateStyle}
        >
          <SheetClose className="absolute right-4 top-4 z-10" />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SheetHeaderProps {
  children: ReactNode;
  className?: string;
}

function SheetHeader({ children, className }: SheetHeaderProps) {
  return <View className={cn("mb-4 gap-1.5", className)}>{children}</View>;
}

interface SheetFooterProps {
  children: ReactNode;
  className?: string;
}

function SheetFooter({ children, className }: SheetFooterProps) {
  return <View className={cn("mt-4 flex-row justify-end gap-2", className)}>{children}</View>;
}

interface SheetTitleProps {
  children: ReactNode;
  className?: string;
}

function SheetTitle({ children, className }: SheetTitleProps) {
  return <Text className={cn("text-lg font-semibold text-foreground", className)}>{children}</Text>;
}

interface SheetDescriptionProps {
  children: ReactNode;
  className?: string;
}

function SheetDescription({ children, className }: SheetDescriptionProps) {
  return <Text className={cn("text-sm text-muted-foreground", className)}>{children}</Text>;
}

interface SheetCloseProps {
  className?: string;
}

function SheetClose({ className }: SheetCloseProps) {
  const { onOpenChange } = useSheetContext();
  const colors = useThemeColors();

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Pressable
      onPress={handleClose}
      className={cn(
        "items-center justify-center rounded-sm opacity-70 active:opacity-100",
        className
      )}
      hitSlop={8}
      accessibilityLabel="Close sheet"
      accessibilityRole="button"
    >
      <X size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle };
