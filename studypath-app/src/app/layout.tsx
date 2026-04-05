import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyPath AI - 受験学習プランナー',
  description: '志望校合格までの最短ルートをAIが自動生成。Todoを埋めていけば合格に近づく。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f0f12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen pb-20">
        {children}
      </body>
    </html>
  );
}
