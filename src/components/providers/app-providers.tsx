"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans border border-white/10 bg-zinc-900",
          },
        }}
      />
    </SessionProvider>
  );
}
