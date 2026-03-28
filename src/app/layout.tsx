import type { Metadata, Viewport } from 'next';
import { Inter, Aref_Ruqaa } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { AppShell } from '@/components/AppShell';
import { NavigationLoader } from '@/components/ui/navigation-loader';
import { OfflineDetector } from '@/components/common/offline-detector';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const arefRuqaa = Aref_Ruqaa({ subsets: ['arabic'], weight: ['400', '700'], variable: '--font-aref-ruqaa' });

const APP_NAME = "Tesla";
const APP_DEFAULT_TITLE = "Tesla";
const APP_DESCRIPTION = "المنصة التعليمية الشاملة للأستاذ عمر مصطفي لتدريس مادة الفيزياء للمرحلة الثانوية. ابتكار في الشرح، اختبارات تفاعلية، ومتابعة دقيقة لكل تفاصيل المنهج.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: "%s",
  },
  description: APP_DESCRIPTION,
  keywords: ["Omar Mostafa", " عمر مصطفي فيزياء", "منصة تعليمية", "ثانوية عامة", "فيزياء ثانوية عامة", "مسائل فيزياء", "شرح فيزياء 3 ثانوي", "قوانين الفيزياء", "Tesla", "تسلا" ,"مستر عمر مصطفي", "عمر مصطفي" , "مراجعات فيزياء", "اسطوره الفيزياء"],
  authors: [{ name: 'Omar Mostafa' }],
  creator: 'Mohamed Suliman',
  manifest: '/manifest.webmanifest',
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    locale: 'ar_EG',
    url: 'https://omar-mostafa-physics.web.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/icons/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icons/favicon.ico',
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  verification: {
    google: "ZsdFCDuekEQ_wdqa88oZJn3QeXtpnKG0rzOBXLSIZ1A",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

const PWA_SCRIPT = `
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('PWA Service Worker registered');
    }).catch(function(err) {
      console.log('PWA Service Worker failed:', err);
    });
  });
}
`;

const ThemeLoaderScript = `
(function() {
  try {
    var color = localStorage.getItem('primary-color');
    if (color) {
      var parts = color.split(' ');
      if (parts.length >= 2) {
        document.documentElement.style.setProperty('--primary-h', parts[0]);
        document.documentElement.style.setProperty('--primary-s', parts[1]);
      }
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ThemeLoaderScript }} />
        <script dangerouslySetInnerHTML={{ __html: PWA_SCRIPT }} />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          inter.variable,
          arefRuqaa.variable
        )}
      >
        <FirebaseClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AppShell>
              <OfflineDetector>
                <NavigationLoader />
                {children}
                <Toaster />
              </OfflineDetector>
            </AppShell>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
