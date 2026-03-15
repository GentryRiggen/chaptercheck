import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Chapter Check",
  description: "Privacy Policy for Chapter Check",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: March 15, 2026</p>

        <div className="max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              Chapter Check (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy.
              This Privacy Policy explains how we collect, use, and protect your information when
              you use our website and iOS application (collectively, &quot;the Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>

            <h3 className="mt-4 text-lg font-medium text-foreground">Account Information</h3>
            <p>
              When you create an account, we collect your name, email address, and profile
              information provided through our authentication provider (Clerk). This information is
              used to identify you and provide the Service.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">Content You Upload</h3>
            <p>
              We store audiobook files, cover images, book metadata, reviews, notes, and other
              content you upload. This content is stored in your personal library and is not shared
              with other users unless you choose to make certain information (such as reviews or
              your profile) visible through the Service&apos;s social features.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">Usage Data</h3>
            <p>
              We collect listening progress, playback position, and library activity to provide
              features like &quot;Continue Listening&quot; and reading statistics. This data is
              associated with your account and is used to improve your experience.
            </p>

            <h3 className="mt-4 text-lg font-medium text-foreground">Device Information</h3>
            <p>
              We may collect basic device information (device type, operating system version, app
              version) for the purpose of providing a compatible experience and diagnosing issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="ml-4 list-disc space-y-1 text-foreground/90">
              <li>Provide, maintain, and improve the Service</li>
              <li>Sync your library, listening progress, and preferences across devices</li>
              <li>Enable social features such as profiles, followers, and reviews</li>
              <li>Provide offline playback functionality on the iOS app</li>
              <li>Send important service-related communications</li>
              <li>Diagnose technical issues and monitor service health</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              4. Data Storage &amp; Security
            </h2>
            <p>
              Your data is stored using industry-standard cloud services. Audio files are stored in
              secure cloud storage (Cloudflare R2) with access restricted to your account through
              signed URLs. Your account data is stored in our database provider (Convex) with
              authentication enforced on every request.
            </p>
            <p>
              We use encryption in transit (TLS/HTTPS) for all communications between your device
              and our servers. While we take reasonable measures to protect your information, no
              method of transmission or storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Data Sharing</h2>
            <p>
              We do not sell your personal information. We share data only with the following
              service providers that are necessary to operate the Service:
            </p>
            <ul className="ml-4 list-disc space-y-1 text-foreground/90">
              <li>
                <strong>Clerk</strong> — authentication and account management
              </li>
              <li>
                <strong>Convex</strong> — real-time database and backend services
              </li>
              <li>
                <strong>Cloudflare</strong> — content delivery, hosting, and file storage
              </li>
              <li>
                <strong>Sentry</strong> — error monitoring and crash reporting
              </li>
            </ul>
            <p className="mt-2">
              These providers process data on our behalf and are bound by their own privacy
              policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Audio Files</h2>
            <p>
              Audio files you upload are stored privately in your account. They are not accessible
              to other users, not indexed by search engines, and not used for any purpose other than
              providing playback to you. You can delete your audio files at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="ml-4 list-disc space-y-1 text-foreground/90">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate information in your account</li>
              <li>Delete your account and associated data</li>
              <li>Export your library data</li>
            </ul>
            <p className="mt-2">
              You can manage your data through your account settings or by contacting us directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from
              a child under 13, please contact us so we can delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. When you delete your
              account, we will delete your personal information and uploaded content within a
              reasonable timeframe. Some data may be retained in backups for a limited period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on the Service. Your continued use after changes
              are posted constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, please contact us at{" "}
              <a
                href="mailto:support@chaptercheck.app"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                support@chaptercheck.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
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
