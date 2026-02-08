import { Check, ChevronDown } from "lucide-react-native";
import { type ReactNode, useCallback, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  disabled = false,
  icon,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedOption = options.find((option) => option.value === value);
  const displayText = selectedOption?.label ?? placeholder;
  const hasValue = selectedOption !== undefined;

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onValueChange(optionValue);
      setIsOpen(false);
    },
    [onValueChange]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const renderOption = useCallback(
    ({ item }: { item: SelectOption }) => {
      const isSelected = item.value === value;

      return (
        <Pressable
          onPress={() => handleSelect(item.value)}
          className={cn(
            "flex-row items-center justify-between px-6 py-3.5 active:bg-accent",
            isSelected && "bg-accent/50"
          )}
        >
          <Text className={cn("text-base text-foreground", isSelected && "font-semibold")}>
            {item.label}
          </Text>
          {isSelected && <Check size={18} className="text-primary" />}
        </Pressable>
      );
    },
    [value, handleSelect]
  );

  const keyExtractor = useCallback((item: SelectOption) => item.value, []);

  const itemSeparator = useCallback(() => <View className="h-px bg-border" />, []);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        className={cn(
          "h-10 flex-row items-center justify-between rounded-md border border-input bg-transparent px-3",
          disabled && "opacity-50",
          className
        )}
      >
        <Text
          className={cn("flex-1 text-sm", hasValue ? "text-foreground" : "text-muted-foreground")}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        {icon ?? <ChevronDown size={16} className="ml-2 text-muted-foreground" />}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable className="flex-1 bg-black/50" onPress={handleClose}>
          <View className="flex-1" />

          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="rounded-t-xl bg-card" style={{ paddingBottom: insets.bottom }}>
              <View className="items-center pb-2 pt-3">
                <View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </View>

              <FlatList
                data={options}
                renderItem={renderOption}
                keyExtractor={keyExtractor}
                ItemSeparatorComponent={itemSeparator}
                className="max-h-80"
                bounces={false}
              />

              <View className="border-t border-border px-6 pb-2 pt-2">
                <Pressable
                  onPress={handleClose}
                  className="items-center rounded-lg bg-secondary py-3 active:opacity-80"
                >
                  <Text className="text-base font-semibold text-secondary-foreground">Cancel</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export { Select, type SelectOption, type SelectProps };
