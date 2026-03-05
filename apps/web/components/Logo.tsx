import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <Image
      src="/app-icon.png"
      alt="Chapter Check"
      width={size}
      height={size}
      className={cn("flex-shrink-0 rounded-lg", className)}
    />
  );
}
