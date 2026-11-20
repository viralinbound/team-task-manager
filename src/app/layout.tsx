import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { RegisterSW } from "@/components/RegisterSW";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Workboard",
  description: "Assign work, see who owns what, keep clients in the loop.",
  appleWebApp: { capable: true, title: "Workboard", statusBarStyle: "default" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#1f6f5c" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${fraunces.variable} antialiased`}>
        <StoreProvider>{children}</StoreProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
