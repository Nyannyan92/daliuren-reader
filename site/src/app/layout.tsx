import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '大六壬解读 · 课盘对话',
  description: '基于判断思路的大六壬课盘解读对话工具',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
