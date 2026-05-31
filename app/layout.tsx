import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThreeSource",
  description:
    "A full-stack task and time tracking app with daily productivity summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
