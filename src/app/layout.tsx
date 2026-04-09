import type { Metadata } from "next";
import "./index.css";
import "swiper/css";
import "swiper/css/pagination";

export const metadata: Metadata = {
  title: "Live Football Streams",
  description: "Live stream access for football channels and matches.",
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
