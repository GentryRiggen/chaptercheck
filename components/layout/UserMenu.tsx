"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { useConfetti } from "@/hooks/useConfetti";
import { useTripleClick } from "@/hooks/useTripleClick";

import { VersionInfo } from "./VersionInfo";

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { fireConfetti } = useConfetti();
  const convexUser = useQuery(api.users.queries.getCurrentUserWithPermissions);
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
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
