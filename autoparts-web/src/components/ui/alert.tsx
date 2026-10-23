import * as React from "react";
import { cn } from "../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-xl border p-4 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50/70 text-red-900"
          : "border-zinc-200 bg-white text-zinc-900",
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";
