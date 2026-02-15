"use client";

import { type OtpFormValues, otpSchema } from "@chaptercheck/shared/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface OtpVerificationFormProps {
  email: string;
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error?: string;
}

export function OtpVerificationForm({
  email,
  onSubmit,
  onBack,
  isLoading,
  error,
}: OtpVerificationFormProps) {
  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSubmit = async (data: OtpFormValues) => {
    await onSubmit(data.code);
  };

  const handleCodeChange = (value: string, onChange: (v: string) => void) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    if (digits.length === 6) {
      form.handleSubmit(handleSubmit)();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        We sent a verification code to <span className="font-medium text-foreground">{email}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={isLoading}
                    {...field}
                    onChange={(e) => handleCodeChange(e.target.value, field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
              disabled={isLoading}
            >
              Use a different email
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
