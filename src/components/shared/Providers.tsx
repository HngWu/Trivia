'use client';

import { Toast } from "@heroui/react";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Toast.Provider />
      {children}
    </ThemeProvider>
  );
}
