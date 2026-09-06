import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Churn Radar — Explainable Churn AI & Retention Copilot",
  description: "Production-grade ML platform predicting customer churn with local SHAP values, distribution drift monitoring, and automated retention workflows.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-indigo-600/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}