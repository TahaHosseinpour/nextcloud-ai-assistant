import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
    title: 'دستیار نکست‌کلاد',
    description: 'دستیار هوش مصنوعی برای جلسات، صورت‌جلسه‌ها و فایل‌های Nextcloud',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

// Open-source default (OFL). If the commercial IRANYekanX files exist in public/fonts,
// globals.css prefers them; otherwise the browser falls back to Vazirmatn.
const vazirmatn = Vazirmatn({
    subsets: ['arabic', 'latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    variable: '--font-vazirmatn',
    display: 'swap',
});

// Apply the saved theme before paint to avoid a flash.
const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body className="antialiased">{children}</body>
        </html>
    );
}
