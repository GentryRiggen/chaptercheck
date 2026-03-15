import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Chapter Check
        </p>
        <nav className="flex gap-6">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
