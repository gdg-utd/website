import { connection } from "next/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VercelAnalytics } from "@/components/vercel-analytics";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: [{ url: "/brand/gdg-favicon.png", type: "image/png" }],
    shortcut: "/brand/gdg-favicon.png",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        {children}
        <VercelAnalytics />
      </body>
    </html>
  );
}
