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
                          SUBIS
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          version="1.1"
                          id="Layer_1"
                          x="0px"
                          y="0px"
                          width="48px"
                          height="48px"
                          viewBox="0 0 592 592"
                          enable-background="new 0 0 592 592"
                        >
                          <path
                            fill="#000000"
                            opacity="1.000000"
                            stroke="none"
                            d="M434.483215,365.975342 C429.545288,366.069275 425.050781,366.069275 420.556274,366.069275 C427.604706,369.127319 434.891602,370.571106 442.503906,370.866791 C450.150269,371.163849 457.297943,369.566132 463.963867,366.207397 C465.361542,367.764038 464.321503,368.755249 463.781311,369.640930 C448.277252,395.059875 427.195862,411.332611 395.916687,410.255402 C375.651520,409.557434 358.352631,402.090332 345.018738,386.438385 C342.171753,383.096466 339.052948,380.210114 335.133148,378.168365 C330.773834,375.897705 326.666656,374.953705 322.957916,380.360199 C317.069336,372.152710 315.028351,363.508270 316.092377,354.191315 C318.135956,336.297211 328.742401,323.464905 341.661102,312.122711 C355.032379,300.383179 370.844055,292.311890 385.765259,282.903595 C411.716949,266.540253 437.300293,249.667511 459.729797,228.525055 C466.284790,222.346191 472.358215,215.733536 477.039856,207.934860 C479.266083,204.226395 480.240631,200.088837 481.339783,196.164658 C482.789917,196.012985 483.123077,196.849442 483.516022,197.559448 C494.505188,217.417343 499.765991,238.344452 494.392059,260.923920 C489.680603,280.719727 476.731720,294.504517 460.347046,305.475769 C451.459961,311.426636 441.932648,316.184204 431.894775,319.913940 C429.456360,320.819977 427.100647,321.948669 424.843719,323.334045 C447.122131,319.718597 469.697479,317.152740 488.881104,303.501556 C486.757324,324.776520 466.255981,362.064911 434.483215,365.975342 z"
                          />
                          <path
                            fill="#000000"
                            opacity="1.000000"
                            stroke="none"
                            d="M161.712646,242.276276 C186.845367,261.946045 213.717590,278.339417 240.612396,294.730042 C255.362350,303.719208 268.876221,314.348297 278.088318,329.347717 C286.366394,342.826355 289.235748,357.052643 282.236053,372.109924 C281.480713,373.734741 280.966980,375.579102 279.178802,376.494629 C273.270813,372.348572 270.597595,372.332611 264.487305,376.439789 C261.990509,378.118134 259.625885,379.964050 257.754669,382.353546 C234.186935,412.448853 180.162872,419.561462 148.064331,380.626709 C144.560806,376.376984 141.283783,371.969696 138.513916,367.204041 C137.945282,366.225708 137.558624,365.141663 137.349777,363.398926 C143.976471,366.117615 150.549377,368.193085 157.748184,367.860718 C164.779907,367.536011 171.613937,366.656860 179.309479,363.926605 C137.298172,362.350098 122.555534,333.673462 112.184830,300.521271 C135.275116,312.863403 148.349518,316.966705 177.472717,320.256989 C169.254868,316.570557 161.817459,313.587524 154.702713,309.969940 C139.362900,302.170166 125.590027,292.285706 116.172752,277.505127 C102.312950,255.751907 103.039406,232.791199 111.385300,209.426743 C113.475876,203.574142 115.842896,197.784317 119.906960,192.432846 C126.808266,215.364227 145.023361,227.947647 161.712646,242.276276 z"
                          />
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
