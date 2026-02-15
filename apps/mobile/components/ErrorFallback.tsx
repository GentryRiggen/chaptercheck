import { AlertTriangle } from "lucide-react-native";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({ message = "Something went wrong.", onRetry }: ErrorFallbackProps) {
  return (
    <View className="items-center justify-center px-6 py-12">
      <AlertTriangle size={32} className="text-destructive" />
      <Text className="mt-3 text-center text-sm text-muted-foreground">{message}</Text>
      {onRetry && (
        <View className="mt-4">
          <Button variant="outline" size="sm" onPress={onRetry}>
            Retry
          </Button>
        </View>
      )}
    </View>
  );
}
