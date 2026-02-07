"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ShelfShareButtonProps {
  shelfId: string;
}

export function ShelfShareButton({ shelfId }: ShelfShareButtonProps) {
  const handleCopy = async () => {
    const url = `${window.location.origin}/shelves/${shelfId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <Link2 className="mr-2 h-4 w-4" />
      Share
    </Button>
  );
}
