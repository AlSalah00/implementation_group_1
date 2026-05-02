import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata = { title: "Archival Verification System" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto p-8 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  );
}