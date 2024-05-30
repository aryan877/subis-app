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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-8 h-8 text-primary"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-2xl font-bold text-primary">
                        Subis
                      </span>
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
