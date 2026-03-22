"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { Flag, MoreHorizontal, ShieldOff } from "lucide-react";
import { useState } from "react";

import { BlockUserDialog } from "@/components/social/BlockUserDialog";
import { ReportUserDialog } from "@/components/social/ReportUserDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserActionMenuProps {
  userId: Id<"users">;
  userName: string;
  /** Optional custom trigger element. Defaults to a ghost MoreHorizontal button. */
  trigger?: React.ReactNode;
}

export function UserActionMenu({ userId, userName, trigger }: UserActionMenuProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsReportOpen(true)}>
            <Flag className="h-4 w-4" />
            Report User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsBlockOpen(true)}>
            <ShieldOff className="h-4 w-4" />
            Block User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserDialog
        userId={userId}
        userName={userName}
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
      />

      <BlockUserDialog
        userId={userId}
        userName={userName}
        open={isBlockOpen}
        onOpenChange={setIsBlockOpen}
      />
    </>
  );
}
