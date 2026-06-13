import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  applicationName: "GuruFinance",
  title: {
    default: "GuruFinance - Smart Loan & Interest Management",
    template: "%s | GuruFinance",
  },
  description: "Smart Loan & Interest Management",
  manifest: "/manifest.json",
  openGraph: {
    title: "GuruFinance",
    description: "Smart Loan & Interest Management",
    siteName: "GuruFinance",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "GuruFinance",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
