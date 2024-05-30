"use client";

import { useEthereum } from "../components/Context";
import { NetworkSwitcher } from "../components/NetworkSwitcher";
import { Balance } from "../components/Balance";
import Link from "next/link";
import { Connect } from "../components/Connect";
import { Check, DollarSign, Sliders } from "lucide-react";

function Page() {
  const { account } = useEthereum();

  return (
    <main className="container mx-auto px-4 py-8" data-theme="cmyk">
      {account.isConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card bg-base-100 border border-base-300 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Network</h2>
              <p>
                Make sure to connect your wallet to zkSync Testnet for full
                functionality.
              </p>
              <div className="card-actions justify-end">
                <NetworkSwitcher />
              </div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Balance</h2>
              <Balance />
            </div>
          </div>
          <div className="card bg-cyan-600 text-cyan-content shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Subscription Owner</h2>
              <p>
                Create and manage your subscription plans and collect payments
                from user smart contracts automatically.
              </p>
              <div className="card-actions justify-end">
                <Link href="/create-manager" className="btn btn-secondary">
                  Create Subscription Manager + Paymaster
                </Link>
              </div>
            </div>
          </div>
          <div className="card bg-yellow-500 text-yellow-content shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Manage Subscriptions</h2>
              <p>View and manage your existing subscriptions.</p>
              <div className="card-actions justify-end">
                <Link href="/my-managers" className="btn btn-primary">
                  Manage Subscriptions
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-cyan-600">
              Welcome to Subis
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-base-content">
              Effortlessly manage your subscriptions in a decentralized manner
              with Subis
            </p>
            <div className="flex justify-center">
              <Connect />
            </div>
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-cyan-600">
                Features
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="card bg-base-200 shadow-xl">
                  <figure className="px-10 pt-10">
                    <Check className="w-12 h-12 text-cyan-600" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title text-cyan-600">Easy Setup</h3>
                    <p>
                      Set up your subscription plans effortlessly with our
                      user-friendly interface.
                    </p>
                  </div>
                </div>
                <div className="card bg-base-200 shadow-xl">
                  <figure className="px-10 pt-10">
                    <DollarSign className="w-12 h-12 text-cyan-600" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title text-cyan-600">
                      Automatic Payments
                    </h3>
                    <p>
                      Collect payments from user smart contracts automatically,
                      ensuring timely and reliable revenue.
                    </p>
                  </div>
                </div>
                <div className="card bg-base-200 shadow-xl">
                  <figure className="px-10 pt-10">
                    <Sliders className="w-12 h-12 text-cyan-600" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title text-cyan-600">
                      Subscription Management
                    </h3>
                    <p>
                      Manage your subscriptions easily, view analytics, and make
                      informed decisions to grow your business.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Page;

// "use client";

// import { useEthereum } from "../components/Context";

// import { Connect } from "../components/Connect";
// import { Account } from "../components/Account";
// import { NetworkSwitcher } from "../components/NetworkSwitcher";
// import { Balance } from "../components/Balance";
// import { BlockNumber } from "../components/BlockNumber";
// import { ReadContract } from "../components/ReadContract";
// import { SendTransaction } from "../components/SendTransaction";
// import { SendTransactionPrepared } from "../components/SendTransactionPrepared";
// import { SignMessage } from "../components/SignMessage";
// import { SignTypedData } from "../components/SignTypedData";
// import { Token } from "../components/Token";
// import { WatchContractEvents } from "../components/WatchContractEvents";
// import { WatchPendingTransactions } from "../components/WatchPendingTransactions";
// import { WriteContract } from "../components/WriteContract";
// import { WriteContractPrepared } from "../components/WriteContractPrepared";

// export default function Page() {
//   const { account } = useEthereum();

//   return (
//     <div>
//       <h1>zkSync + ethers + Next.js</h1>

//       <Connect />

//       {account.isConnected && (
//         <>
//           <hr />
//           <h2>Network</h2>
//           <p>
//             <strong>
//               Make sure to connect your wallet to zkSync Testnet for full
//               functionality
//             </strong>
//             <br />
//             or update to a different contract address
//           </p>
//           <NetworkSwitcher />
//           <br />
//           <hr />
//           <h2>Account</h2>
//           <Account />
//           <br />
//           <hr />
//           <h2>Balance</h2>
//           <Balance />
//           <br />
//           <hr />
//           <h2>Block Number</h2>
//           <BlockNumber />
//           <br />
//           <hr />
//           <h2>Read Contract</h2>
//           <ReadContract />
//           <br />
//           <hr />
//           <h2>Send Transaction</h2>
//           <SendTransaction />
//           <br />
//           <hr />
//           <h2>Send Transaction (Prepared)</h2>
//           <SendTransactionPrepared />
//           <br />
//           <hr />
//           <h2>Sign Message</h2>
//           <SignMessage />
//           <br />
//           <hr />
//           <h2>Sign Typed Data</h2>
//           <SignTypedData />
//           <br />
//           <hr />
//           <h2>Token</h2>
//           <Token />
//           <br />
//           <hr />
//           <h2>Watch Contract Events</h2>
//           <WatchContractEvents />
//           <br />
//           <hr />
//           <h2>Watch Pending Transactions</h2>
//           <WatchPendingTransactions />
//           <br />
//           <hr />
//           <h2>Write Contract</h2>
//           <WriteContract />
//           <br />
//           <hr />
//           <h2>Write Contract (Prepared)</h2>
//           <WriteContractPrepared />
//         </>
//       )}
//     </div>
//   );
// }
