import React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  className,
  active,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "px-4 py-1.5 rounded-pill text-sm font-medium transition-colors border",
        active
          ? "bg-accent text-white border-accent"
          : "bg-white text-ink-muted border-line hover:border-accent/40",
        className
      )}
      {...props}
    />
  );
}
