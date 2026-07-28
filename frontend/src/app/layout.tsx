import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeContext";
import { SidebarLayout } from "@/components/SidebarLayout";

export const metadata: Metadata = {
  title: "DevPilot AI - Automated Repository Intelligence Platform",
  description: "Enterprise-grade AI platform for GitHub repository code quality, security, architecture, and maintainability analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#030712] text-slate-50 min-h-screen">
        <ThemeProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
