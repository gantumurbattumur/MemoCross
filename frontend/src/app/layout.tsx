import "./globals.css";
import Navbar from "@/components/Navbar";
import Script from "next/script";
import React from "react";

export const metadata = {
  title: "EaseeVocab",
  description: "AI Flashcards powered with memory - Learn vocabulary with ease",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
        <Navbar />
        <main className="pt-16 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
