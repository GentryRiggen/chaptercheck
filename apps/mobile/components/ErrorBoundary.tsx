import { AlertTriangle } from "lucide-react-native";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
          <AlertTriangle size={48} className="text-destructive" />
          <Text className="mt-4 text-center text-lg font-bold text-foreground">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
          <View className="mt-6">
            <Button onPress={this.handleRetry}>Try Again</Button>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
