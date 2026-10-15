import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Restaurant POS", description: "Calm control room for restaurant service" };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
