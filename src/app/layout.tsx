import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real-Time Video Rating",
  description: "Real-time video rating and control platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/xfk5kyc.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
