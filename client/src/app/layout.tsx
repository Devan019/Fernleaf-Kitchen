import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthContext";
import { QueryProvider } from "@/components/QueryProvider";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Fernleaf Kitchen",
  title: {
    default: "Fernleaf Kitchen | Kitchen Operations",
    template: "%s | Fernleaf Kitchen",
  },
  description:
    "Internal catering operations platform for managing companies, menus, orders, kitchen production, dispatch, deliveries, and billing.",
  keywords: [
    "Fernleaf Kitchen",
    "catering operations",
    "kitchen operations",
    "delivery dispatch",
    "catering orders",
  ],
  category: "business",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    shortcut: ["/favicon.ico"],
    apple: "/favicon.ico",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full">
        <Analytics />
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
