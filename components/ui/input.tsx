import React from "react";
import { cn } from "@/lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full bg-subtle rounded-xl px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint outline-none border border-transparent focus:border-accent focus:bg-white transition-colors",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
