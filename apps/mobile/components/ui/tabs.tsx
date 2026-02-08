import { createContext, type ReactNode, useContext } from "react";
import { Pressable, type PressableProps, ScrollView, Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs compound components must be used within a <Tabs> parent");
  }
  return context;
}

// --- Tabs Root ---

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View className={cn(className)}>{children}</View>
    </TabsContext.Provider>
  );
}

// --- TabsList ---

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row"
    >
      <View className={cn("flex-row rounded-lg bg-muted p-1", className)}>{children}</View>
    </ScrollView>
  );
}

// --- TabsTrigger ---

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

// NativeWind bug: conditional shadow-* classes cause a "Couldn't find a navigation
// context" error with Expo Router. Use inline styles for the shadow instead.
// https://github.com/nativewind/nativewind/issues/1557
const ACTIVE_SHADOW: PressableProps["style"] = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
};

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <Pressable
      onPress={() => onValueChange(value)}
      className={cn(
        "items-center justify-center rounded-md px-3 py-1.5",
        isActive ? "bg-card" : "bg-transparent",
        className
      )}
      style={isActive ? ACTIVE_SHADOW : undefined}
    >
      <Text
        className={cn(
          "text-sm font-medium",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}

// --- TabsContent ---

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();

  if (activeValue !== value) {
    return null;
  }

  return <View className={cn("mt-2", className)}>{children}</View>;
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
};
