import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        strategy: "email_code",
      });
      if (result.status === "needs_first_factor") {
        setPendingVerification(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (codeOverride?: string) => {
    if (!isLoaded) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: codeOverride ?? code,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid verification code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-6"
      >
        <Text className="mb-2 text-3xl font-bold text-foreground">ChapterCheck</Text>
        <Text className="mb-8 text-muted-foreground">Sign in to your audiobook library</Text>

        {error ? (
          <View className="mb-4 rounded-lg bg-destructive/10 p-3">
            <Text className="text-sm text-destructive">{error}</Text>
          </View>
        ) : null}

        {!pendingVerification ? (
          <>
            <TextInput
              className="mb-4 rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Email address"
              placeholderTextColor="hsl(220, 9%, 46%)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={handleSendCode}
            />
            <Pressable
              onPress={handleSendCode}
              disabled={loading || !email}
              className="rounded-lg bg-primary px-4 py-3 disabled:opacity-50"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center font-semibold text-primary-foreground">
                  Continue with Email
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-4 text-sm text-muted-foreground">We sent a code to {email}</Text>
            <TextInput
              className="mb-4 rounded-lg border border-input bg-card px-4 py-3 text-center text-2xl tracking-widest text-foreground"
              placeholder="000000"
              placeholderTextColor="hsl(220, 9%, 46%)"
              value={code}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                if (digits.length === 6) {
                  handleVerifyCode(digits);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={() => handleVerifyCode()}
            />
            <Pressable
              onPress={() => handleVerifyCode()}
              disabled={loading || code.length !== 6}
              className="rounded-lg bg-primary px-4 py-3 disabled:opacity-50"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-center font-semibold text-primary-foreground">
                  Verify Code
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setPendingVerification(false);
                setCode("");
                setError("");
              }}
              className="mt-4"
            >
              <Text className="text-center text-sm text-muted-foreground">
                Use a different email
              </Text>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
