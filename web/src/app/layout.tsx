import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nest — Personal Finance",
  description: "Track your money, budgets, and net worth.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,300,0,0&display=swap"
        />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
