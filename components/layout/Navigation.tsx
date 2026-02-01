"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, BookOpen, Users, Home } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "@/components/Logo";

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Don't show navigation on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/books", label: "Books", icon: BookOpen },
    { href: "/authors", label: "Authors", icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 sm:h-16">
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
                  <SheetTitle className="text-left flex items-center gap-2">
                    <Logo size={24} />
                    ChapterCheck
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive(link.href)
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
            <span className="text-lg sm:text-xl font-bold">ChapterCheck</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:flex items-center ml-8 gap-1">
            {navLinks.slice(1).map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(link.href)
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
