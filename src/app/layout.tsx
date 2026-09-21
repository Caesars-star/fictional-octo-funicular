import type { Metadata } from "next";
import "./globals.css";
import { AppSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "TARA — Construction Transaction OS",
    template: "%s · TARA",
  },
  description:
    "TARA coordinates construction projects, procurement, contracts and payments across the Kenyan construction value chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppSessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AppSessionProvider>
      </body>
    </html>
  );
}
