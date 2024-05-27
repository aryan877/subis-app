"use client";

import { useEthereum } from "../components/Context";
import { NetworkSwitcher } from "../components/NetworkSwitcher";
import { Balance } from "../components/Balance";
import Link from "next/link";
import { Connect } from "../components/Connect";

function Page() {
  const { account } = useEthereum();

  return (
    <main className="container mx-auto px-4 py-8">
      {account.isConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card bg-base-100 shadow-xl">
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
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Balance</h2>
              <Balance />
            </div>
          </div>
          <div className="card bg-primary text-primary-content">
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
          <div className="card bg-secondary text-secondary-content">
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to Subis
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Effortlessly manage your subscriptions in a decentralized manner
              with Subis
            </p>
            <div className="flex justify-center">
              <Connect />
            </div>
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-base-200 p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-primary"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Easy Setup</h3>
                  <p>
                    Set up your subscription plans effortlessly with our
                    user-friendly interface.
                  </p>
                </div>
                <div className="bg-base-200 p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-primary"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Automatic Payments</h3>
                  <p>
                    Collect payments from user smart contracts automatically,
                    ensuring timely and reliable revenue.
                  </p>
                </div>
                <div className="bg-base-200 p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-primary"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
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
