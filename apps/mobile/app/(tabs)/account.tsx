import { useAuth, useUser } from "@clerk/clerk-expo";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">Account</Text>
        {user && (
          <Text className="mt-4 text-muted-foreground">
            Signed in as {user.primaryEmailAddress?.emailAddress}
          </Text>
        )}
        <Pressable onPress={() => signOut()} className="mt-6 rounded-lg bg-destructive px-4 py-3">
          <Text className="text-center font-semibold text-destructive-foreground">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
