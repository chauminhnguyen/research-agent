import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-sm border bg-canvas px-3 py-2 text-sm text-ink placeholder:text-mute",
          "border-hairline",
          "focus:border-link focus:outline-none focus:ring-1 focus:ring-link",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none transition-colors duration-150",
          error && "border-error focus:border-error focus:ring-error",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
