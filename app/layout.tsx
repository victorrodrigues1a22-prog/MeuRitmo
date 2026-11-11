import type { Metadata } from "next";
import { ThemeSync } from "./components/ThemeSync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meu Ritmo — rotina e planejamento",
  description: "Seu espaço pessoal para organizar rotina, estudos e planos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
