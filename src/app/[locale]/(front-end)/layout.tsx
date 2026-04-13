import { Cairo, Playfair_Display } from "next/font/google";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["700"],
  style: ["italic"],
});

export default function FrontEndLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${cairo.variable} ${playfair.variable} font-[family-name:var(--font-cairo)]`}
    >
      {children}
    </div>
  );
}