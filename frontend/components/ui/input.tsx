import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-mute",
          "border-hairline",
          "focus:border-link focus:outline-none focus:ring-1 focus:ring-link",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-150",
          error && "border-error focus:border-error focus:ring-error",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
