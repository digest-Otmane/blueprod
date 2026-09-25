import React from "react";
import "./globals.css";

export const metadata = {
  title: "La Varenne CRM",
  description: "CRM interne Alea Food — La Varenne & La Varenne Touch",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
