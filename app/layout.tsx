import { Chakra_Petch } from 'next/font/google';
import './globals.css';
import MatrixBg from '@/components/MatrixBg';
import React from 'react'; // import React เพื่อใช้ Type

const chakra = Chakra_Petch({ 
  subsets: ['latin', 'thai'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-chakra'
});

export const metadata = {
  title: 'Cyber Stakes - Final Edition',
  description: 'Anti-Scam Simulation Game',
};

// ✅ สร้าง Interface สำหรับ Props
interface RootLayoutProps {
  children: React.ReactNode;
}

// ✅ นำ Interface มาใช้ตรงนี้
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th">
      <body className={`${chakra.variable} font-sans bg-black h-screen w-screen overflow-hidden`}>
        <MatrixBg />
        <main className="relative z-10 w-full h-full flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}