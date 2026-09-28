import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "GDG UTDallas",
    template: "%s | GDG UTDallas",
  },
  icons: {
    icon: [{ url: "/brand/gdg-favicon.png", type: "image/png" }],
    shortcut: "/brand/gdg-favicon.png",
  },
  description:
    "Workshops, project programs, meetups, and upcoming developer events from GDG on Campus UTD.",
  openGraph: {
    title: "GDG UTDallas",
    description:
      "Workshops, project programs, meetups, and upcoming developer events from GDG on Campus UTD.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
