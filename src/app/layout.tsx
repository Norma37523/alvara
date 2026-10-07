import type { Metadata } from "next";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";

const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", weight: ["400", "500", "700"] });
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["600", "700", "800"],
});

// Aplica o tema salvo antes da primeira pintura (evita piscar).
const THEME_SCRIPT = `try{var t=localStorage.getItem("norma-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export const metadata: Metadata = {
  title: "Norma Contábil – Gestão de alvarás",
  description: "Controle de alvarás e licenças das empresas clientes da Norma Contábil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${dm.variable} ${poppins.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
