import React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark active:scale-[0.98]",
  secondary: "bg-subtle text-ink hover:bg-line active:scale-[0.98]",
  ghost: "bg-transparent text-accent hover:bg-accent-light active:scale-[0.98]",
  outline: "bg-white text-ink border border-line hover:bg-subtle active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-full",
  md: "px-4 py-2.5 text-sm rounded-full",
  lg: "px-6 py-3.5 text-base rounded-full",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center justify-center gap-1.5",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
