import './globals.css'
import '../styles/premium.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Islamic Prayer Times Visualization",
  description: "Beautiful visualization of Islamic prayer times with accurate twilight periods and day/night cycle",
  keywords: "prayer times, salah, fajr, dhuhr, asr, maghrib, isha, twilight, islamic prayer, muslim prayer, visualization",
  authors: [{ name: "Prayer Times Visualization" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
