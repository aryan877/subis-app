import { EthereumProvider } from "../components/Context";
import { Connect } from "../components/Connect";
import Link from "next/link";
import "../global.css";
import { ToastProvider } from "../context/ToastProvider";

export const metadata = {
  title: "Subis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <EthereumProvider>
        <body>
          <div className="min-h-screen flex flex-col">
            <header className="bg-base-200 py-4">
              <nav className="container mx-auto">
                <div className="navbar">
                  <div className="flex-1">
                    <Link href="/" className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-primary">
                          Subis
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 ml-2 text-primary"
                        >
                          <path d="M12.232 6.232a2.5 2.5 0 013.536 0l2.45 2.45a2.5 2.5 0 010 3.536l-2.45 2.45a2.5 2.5 0 01-3.536 0l-2.45-2.45a2.5 2.5 0 010-3.536l2.45-2.45zM6.232 12.232a2.5 2.5 0 013.536 0l2.45 2.45a2.5 2.5 0 010 3.536l-2.45 2.45a2.5 2.5 0 01-3.536 0l-2.45-2.45a2.5 2.5 0 010-3.536l2.45-2.45z" />
                        </svg>
                      </div>
                    </Link>
                  </div>
                  <div className="flex-none">
                    <Connect />
                  </div>
                </div>
              </nav>
            </header>
            <ToastProvider>
              <main className="flex-1 container mx-auto py-8 px-4">
                {children}
              </main>
            </ToastProvider>
            <footer className="bg-base-200 py-4">
              <div className="container mx-auto text-center">
                <p>&copy; 2023 Subis. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </body>
      </EthereumProvider>
    </html>
  );
}
