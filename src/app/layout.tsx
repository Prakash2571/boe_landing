import type { Metadata, Viewport } from 'next';
import './globals.css';
import './components.css';
import { site } from '../content/site';
import { AuthProvider } from '../components/AuthProvider';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata: Metadata = {
  title: `${site.name} - ${site.descriptor}`,
  description: site.longDescriptor,
  openGraph: {
    title: `${site.name} - Financial education made clear`,
    description: site.longDescriptor,
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#fbfaf6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
