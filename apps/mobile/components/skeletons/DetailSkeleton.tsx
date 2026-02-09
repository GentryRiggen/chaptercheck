import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <View className="flex-1 bg-background px-4 pt-6" style={{ gap: 16 }}>
      <View className="flex-row items-center" style={{ gap: 16 }}>
        <Skeleton className="h-24 w-24 rounded-full" />
        <View className="flex-1" style={{ gap: 8 }}>
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </View>
      </View>
      <Skeleton className="mt-2 h-3 w-full rounded" />
      <Skeleton className="h-3 w-5/6 rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
      <View className="mt-4" style={{ gap: 10 }}>
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </View>
    </View>
  );
}
