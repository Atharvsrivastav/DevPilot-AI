import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeContext";
import { SidebarLayout } from "@/components/SidebarLayout";

export const metadata: Metadata = {
  title: "DevPilot AI - Automated Repository Intelligence Platform",
  description:
    "Enterprise-grade AI platform for GitHub repository code quality, security, architecture, and maintainability analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>
          <Suspense fallback={null}>
            <SidebarLayout>{children}</SidebarLayout>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
