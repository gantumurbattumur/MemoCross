import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "MemoCross",
  description: "AI Flashcards powered with memory",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <Navbar />

        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
