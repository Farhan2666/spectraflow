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
  title: "SpectraFlow - Visualize Music, Not Just Listen",
  description:
    "Transform any YouTube link or audio file into stunning real-time visualizations. No install, no watermark — just pure audio artistry.",
  keywords: [
    "audio visualizer",
    "music visualization",
    "YouTube visualizer",
    "real-time audio",
    "spectrum analyzer",
  ],
  openGraph: {
    title: "SpectraFlow - Visualize Music, Not Just Listen",
    description:
      "Transform any YouTube link or audio file into stunning real-time visualizations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-[#0F0F12] text-[#E0E0E0] min-h-screen">
        {children}
      </body>
    </html>
  );
}
