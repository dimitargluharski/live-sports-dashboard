import type { Metadata } from "next";
import "./index.css";

export const metadata: Metadata = {
  title: "LiveSports Pulse",
  description: "LiveSports Pulse – Real-time sports streams and events dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
