import { View } from "react-native";

import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
  return (
    <View className="px-4" style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} className="flex-row items-center rounded-lg" style={{ gap: 12 }}>
          {/* Cover / avatar placeholder */}
          <Skeleton className="h-14 w-10 rounded-lg" />

          {/* Text lines */}
          <View className="flex-1" style={{ gap: 6 }}>
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </View>
        </View>
      ))}
    </View>
  );
}
