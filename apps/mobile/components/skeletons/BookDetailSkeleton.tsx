import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

export function BookDetailSkeleton() {
  return (
    <View className="flex-1 bg-background">
      {/* Hero section */}
      <View className="flex-row px-5 pt-5" style={{ gap: 16 }}>
        {/* Cover placeholder */}
        <Skeleton className="h-44 w-32 rounded-lg" />

        {/* Text lines */}
        <View className="min-w-0 flex-1 justify-center" style={{ gap: 10 }}>
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-5 w-full rounded" />
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
          <View className="flex-row" style={{ gap: 6 }}>
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </View>
          <Skeleton className="h-3 w-24 rounded" />
        </View>
      </View>

      {/* Read status placeholder */}
      <View className="px-5 pt-4">
        <Skeleton className="h-10 w-36 rounded-md" />
      </View>

      {/* Tabs placeholder */}
      <View className="px-5 pt-6" style={{ gap: 12 }}>
        <View className="flex-row" style={{ gap: 8 }}>
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </View>
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </View>
    </View>
  );
}
