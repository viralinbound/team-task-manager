import type { Metadata, Viewport } from "next";
// Fonts are bundled with the app (no build-time download from Google).
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/fraunces/latin-600.css";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { RegisterSW } from "@/components/RegisterSW";

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
      <body className="antialiased">
        <StoreProvider>{children}</StoreProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
