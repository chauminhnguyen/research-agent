import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-primary text-on-primary hover:bg-gray-800 active:bg-gray-900",
      secondary: "bg-canvas text-ink border border-hairline hover:bg-canvas-soft-2 active:bg-hairline",
      ghost: "bg-transparent text-ink hover:bg-canvas-soft-2 active:bg-hairline",
      outline: "bg-transparent text-ink border border-hairline hover:border-hairline-strong",
    };
    
    const sizes = {
      sm: "h-8 px-3 text-sm rounded-sm",
      md: "h-10 px-4 text-sm rounded-sm",
      lg: "h-12 px-6 text-base rounded-pill",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
