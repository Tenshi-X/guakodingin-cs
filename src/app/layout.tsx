import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guakodingin Inbox",
  description: "Satu tempat untuk membalas WhatsApp dan Instagram bersama tim.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
