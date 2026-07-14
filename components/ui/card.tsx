import React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white rounded-card shadow-card border border-line/60",
        className
      )}
      {...props}
    />
  );
}
