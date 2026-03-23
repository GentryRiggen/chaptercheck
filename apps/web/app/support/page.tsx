"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import {
  type SupportRequestFormValues,
  supportRequestSchema,
} from "@chaptercheck/shared/validations/support";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useAction } from "convex/react";
import { CheckCircle2, ChevronDown, HelpCircle, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "How do I upload audiobooks?",
    answer:
      'Navigate to a book\'s detail page and click "Upload Audio". Supports MP3 and M4A formats. Multi-part books are supported — files are automatically ordered by part number.',
  },
  {
    question: "What audio formats are supported?",
    answer: "MP3 and M4A (AAC). We recommend M4A for better quality at smaller file sizes.",
  },
  {
    question: "Can I listen on multiple devices?",
    answer:
      "Yes! Your listening progress, playback speed, and bookmarks sync in real-time across all your devices via your account.",
  },
  {
    question: "How do I organize my library?",
    answer:
      "Create custom bookshelves to organize books however you like. You can also browse by author, series, or genre. Use the search bar to quickly find any book.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your audio files and library are completely private by default. You control what's visible on your profile, including reviews and reading activity.",
  },
  {
    question: "How do I use the iOS app?",
    answer:
      "Download ChapterCheck from the App Store. Sign in with the same account and your full library syncs automatically, including offline playback for downloaded books.",
  },
  {
    question: "How do I report a bug or request a feature?",
    answer:
      'Use the contact form below! Select "Bug Report" or "Feature Request" as the category and describe the issue or idea in detail.',
  },
];

const CATEGORY_OPTIONS = [
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "general_question", label: "General Question" },
  { value: "account_issue", label: "Account Issue" },
] as const;

export default function SupportPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const submitRequest = useAction(api.supportRequests.actions.submit);

  const form = useForm<SupportRequestFormValues>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      category: "general_question",
      message: "",
    },
  });

  const handleSubmit = async (values: SupportRequestFormValues) => {
    if (!turnstileToken) {
      toast.error("Please complete the verification check.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Read honeypot value from the hidden field
      const honeypotEl = document.getElementById("website") as HTMLInputElement | null;
      await submitRequest({
        ...values,
        turnstileToken,
        website: honeypotEl?.value || undefined,
      });
      setIsSubmitted(true);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } catch {
      toast.error("Failed to submit your request. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Support</h1>
        <p className="mb-10 text-muted-foreground">
          Find answers to common questions or get in touch with our team.
        </p>

        {/* FAQ Section */}
        <section className="mb-12">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y rounded-lg border">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 text-sm font-medium transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="px-4 pb-4 text-sm text-muted-foreground">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Contact Form Section */}
        <section>
          <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Contact Us</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Can&apos;t find what you&apos;re looking for? Send us a message.
              </p>
            </div>

            <div className="px-4 py-6 sm:px-6">
              {isSubmitted ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
                  <h3 className="text-lg font-semibold">Message Sent!</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Thank you for reaching out. We&apos;ll review your message and get back to you
                    as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      form.reset();
                      setIsSubmitted(false);
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger
                                className={cn(!field.value && "text-muted-foreground")}
                              >
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your question or issue in detail..."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Honeypot — hidden from real users, bots auto-fill it */}
                    <div className="absolute -left-[9999px]" aria-hidden="true">
                      <label htmlFor="website">Website</label>
                      <input
                        type="text"
                        id="website"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                        onSuccess={setTurnstileToken}
                        onExpire={() => setTurnstileToken(null)}
                        options={{ theme: "auto" }}
                      />
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting || !turnstileToken}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </section>

        {/* Footer links */}
        <div className="mt-12 flex gap-6 border-t pt-6">
          <Link
            href="/privacy"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
