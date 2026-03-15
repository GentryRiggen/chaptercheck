import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Chapter Check",
  description: "Terms of Service for Chapter Check",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: March 15, 2026</p>

        <div className="max-w-none space-y-8 text-foreground/90">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Chapter Check (&quot;the Service&quot;), including our website
              and iOS application, you agree to be bound by these Terms of Service. If you do not
              agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Chapter Check is a personal audiobook library management application that allows you
              to organize your audiobook collection, track listening progress, create bookshelves,
              write reviews, and listen to your uploaded audio files. The Service is available via
              web browser and as a native iOS application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You must create an account to use the Service. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities that occur under
              your account. You agree to provide accurate and complete information when creating
              your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. User Content</h2>
            <p>
              You retain ownership of all content you upload to the Service, including audiobook
              files, cover images, reviews, and notes. By uploading content, you represent that you
              have the right to do so and that your content does not infringe on any third
              party&apos;s rights.
            </p>
            <p>
              You are solely responsible for ensuring that any audiobook files you upload are
              legally obtained and that you have the right to store and play them through the
              Service. Chapter Check does not distribute, share, or make your audio files available
              to other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="ml-4 list-disc space-y-1 text-foreground/90">
              <li>Upload content that you do not have the legal right to possess or distribute</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its related systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Share your account credentials with others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Storage &amp; Data</h2>
            <p>
              Audio files and other content you upload are stored securely in cloud storage
              associated with your account. Storage limits may apply and can vary by account type.
              We reserve the right to set reasonable limits on storage usage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time if you violate
              these Terms. You may delete your account at any time through your account settings.
              Upon termination, your uploaded content may be deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied. We do not guarantee that the
              Service will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Chapter Check shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              data, use, or profits, arising out of or in connection with your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on the Service. Your continued use of the Service after
              changes are posted constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
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
            href="/privacy"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
