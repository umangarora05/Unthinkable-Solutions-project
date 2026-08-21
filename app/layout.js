import "./globals.css";

export const metadata = { title: "Morrow | Meeting Summarizer", description: "Turn meetings into momentum with calm, structured notes." };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}