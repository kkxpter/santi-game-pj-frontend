import type { Metadata } from "next";
import { Chakra_Petch } from "next/font/google"; // ใช้ Font จาก Google ง่ายๆ แบบนี้
import "./globals.css";
import MatrixBackground from "@/components/MatrixBackground";

const chakra = Chakra_Petch({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'] 
});

export const metadata: Metadata = {
  title: "Cyber Stakes - Final Edition",
  description: "Cybersecurity Awareness Game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${chakra.className} text-green-400 bg-black overflow-hidden h-screen w-screen relative`}>
        <MatrixBackground />
        <main className="relative z-10 w-full h-full flex flex-col pointer-events-auto">
          {children}
        </main>
      </body>
    </html>
  );
}