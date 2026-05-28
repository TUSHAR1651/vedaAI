import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DashboardShell } from '@/components/layout/DashboardShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'VedaAI — AI Assessment Creator',
  description:
    'Generate structured, exam-ready question papers with AI. Real-time generation, validated output, PDF export.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
