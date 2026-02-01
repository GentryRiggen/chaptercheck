"use client";

import { useAuth } from "@clerk/nextjs";
import { BookOpen, Home, Menu, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();

  // Don't show navigation on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  // Only show protected routes to authenticated users
  const navLinks = isSignedIn
    ? [
        { href: "/", label: "Home", icon: Home },
        { href: "/books", label: "Books", icon: BookOpen },
        { href: "/authors", label: "Authors", icon: Users },
      ]
    : [{ href: "/", label: "Home", icon: Home }];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center sm:h-16">
          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Logo size={24} />
                    ChapterCheck
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive(link.href)
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-lg font-bold sm:text-xl">ChapterCheck</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="ml-8 hidden items-center gap-1 sm:flex">
            {navLinks.slice(1).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <UserMenu />
            ) : (
              <Link href="/sign-in">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
