import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** "boxed" (default) is the standard bordered field. "underline" is the
   * label-above, bottom-border-only style used on the auth screens' white
   * cards over the brand-gradient background. */
  variant?: "boxed" | "underline";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "boxed", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full bg-transparent text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          variant === "boxed" &&
            "rounded-md border-2 border-input bg-background px-3 py-2 ring-offset-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
          variant === "underline" &&
            "border-0 border-b-2 border-input px-0 pb-2 focus-visible:border-ring",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
