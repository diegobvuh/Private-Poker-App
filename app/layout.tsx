import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "House Rules", template: "%s · House Rules" },
  description: "A private, no-rake home game companion for invited adults.",
  applicationName: "House Rules",
};

export const viewport: Viewport = { themeColor: "#8fe2ff", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
