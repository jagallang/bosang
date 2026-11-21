import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SITE } from '../lib/site';

export const metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <meta name="theme-color" content="#1C2740" />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
