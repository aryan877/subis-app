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
          <div className="card bg-base-100 border border-black shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
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
          <div className="card bg-base-100 border border-black shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="card-body">
              <h2 className="card-title">Balance</h2>
              <Balance />
            </div>
          </div>
          <div className="card bg-base-100 border border-black shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="card-body">
              <h2 className="card-title">Subscription Owner</h2>
              <p>
                Create and manage your subscription plans and collect payments
                from user smart contracts automatically.
              </p>
              <div className="card-actions justify-end">
                <Link
                  href="/create-manager"
                  className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                >
                  Create Subscription Manager + Paymaster
                </Link>
              </div>
            </div>
          </div>
          <div className="card bg-base-100 border border-black shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="card-body">
              <h2 className="card-title">Manage Subscriptions</h2>
              <p>View and manage your existing subscriptions.</p>
              <div className="card-actions justify-end">
                <Link
                  href="/my-managers"
                  className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                >
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
            <p className="text-xl md:text-2xl mb-8 text-base-content">
              Effortlessly manage your subscriptions in a decentralized manner
              with Subis
            </p>
            <div className="flex justify-center">
              <Connect />
            </div>
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="card bg-base-200 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
                  <figure className="px-10 pt-10">
                    <Check className="w-12 h-12" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title">Easy Setup</h3>
                    <p>
                      Set up your subscription plans effortlessly with our
                      user-friendly interface.
                    </p>
                  </div>
                </div>
                <div className="card bg-base-200 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
                  <figure className="px-10 pt-10">
                    <DollarSign className="w-12 h-12" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title">Automatic Payments</h3>
                    <p>
                      Collect payments from user smart contracts automatically,
                      ensuring timely and reliable revenue.
                    </p>
                  </div>
                </div>
                <div className="card bg-base-200 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
                  <figure className="px-10 pt-10">
                    <Sliders className="w-12 h-12" />
                  </figure>
                  <div className="card-body items-center text-center">
                    <h3 className="card-title">Subscription Management</h3>
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
