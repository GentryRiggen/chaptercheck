"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { LogOut, Monitor, Moon, Palette, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useConfetti } from "@/hooks/useConfetti";
import { useTripleClick } from "@/hooks/useTripleClick";
import { ACCENT_COLORS, type AccentColorName } from "@/lib/accent-colors";

import { VersionInfo } from "./VersionInfo";

const QUICK_COLORS: AccentColorName[] = [
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "green",
  "teal",
  "graphite",
];

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { fireConfetti } = useConfetti();
  const convexUser = useQuery(api.users.queries.getCurrentUserWithPermissions);
  const { accentColor, updatePreferences } = useUserPreferences();
  const { isSignedIn } = useAuth();
  const { theme, setTheme } = useTheme();
  const { ref: versionRef, clickProps: versionClickProps } =
    useTripleClick<HTMLButtonElement>(fireConfetti);

  if (!isLoaded) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return null;
  }

  const handleSignOut = () => {
    signOut({ redirectUrl: "/sign-in" });
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    if (isSignedIn) {
      updatePreferences({ colorSchemeMode: newTheme });
    }
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <UserAvatar name={[user.firstName, user.lastName].filter(Boolean).join(" ")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {convexUser && (
          <DropdownMenuItem asChild>
            <Link href={`/users/${convexUser._id}`} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ThemeIcon className="mr-2 h-4 w-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleThemeChange("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <div className="px-2 py-1.5">
          <div className="mb-1.5 flex items-center text-xs font-medium text-muted-foreground">
            <Palette className="mr-1.5 h-3.5 w-3.5" />
            Accent Color
          </div>
          <div className="flex items-center gap-1">
            {QUICK_COLORS.map((name) => {
              const color = ACCENT_COLORS[name];
              const isSelected = name === accentColor;
              return (
                <button
                  key={name}
                  onClick={() => updatePreferences({ accentColor: name })}
                  className="group relative flex items-center justify-center"
                  title={color.displayName}
                  aria-label={color.displayName}
                >
                  <span
                    className={`block h-5 w-5 rounded-full transition-transform group-hover:scale-110 ${isSelected ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                    style={{ backgroundColor: color.swatch }}
                  />
                </button>
              );
            })}
            <Link
              href="/account?tab=appearance"
              className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
            >
              All
            </Link>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <VersionInfo ref={versionRef} onClick={versionClickProps.onClick} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
