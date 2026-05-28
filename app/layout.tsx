import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThreeSource",
  description: "Task management and time tracking for focused daily work.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
