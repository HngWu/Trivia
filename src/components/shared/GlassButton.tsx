import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "glass-button transition-all duration-300 focus:ring-2 focus:ring-white/20 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed",
          fullWidth && "w-full",
          // Base styles are mostly handled by the .glass-button class in globals.css,
          // but we can add overrides here if needed.
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";
