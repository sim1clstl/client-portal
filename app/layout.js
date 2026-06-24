import './globals.css';

export const metadata = {
  title: 'Project Portal — Multi-Merchant Payment Platform',
  description: 'Timeline, documents, questions, and chat for the Payment Platform V1 build.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
