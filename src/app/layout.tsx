import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pinterest Template Editor",
  description: "Professional template editor for Pinterest bulk image generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts for Font Library */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Cookie&family=Cormorant+Garamond:wght@400;600&family=Crimson+Text:wght@400;600&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Inter:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Libre+Baskerville:wght@400;700&family=Lobster&family=Lora:wght@400;600&family=Merriweather:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Nunito:wght@300;400;600;700&family=Open+Sans:wght@300;400;600;700&family=Oswald:wght@400;500;600;700&family=PT+Serif:wght@400;700&family=Pacifico&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@300;400;500;600;700&family=Righteous&family=Roboto:wght@300;400;500;700&family=Russo+One&family=Sacramento&family=Satisfy&family=Source+Sans+Pro:wght@300;400;600;700&family=Teko:wght@400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

