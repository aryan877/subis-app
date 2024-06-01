"use client";

import { useEthereum } from "./Context";

export function Connect() {
  const { account, connect, disconnect } = useEthereum();

  return (
    <div className="flex justify-center items-center mt-4">
      {account.isConnected ? (
        <button
          onClick={disconnect}
          className="btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
        >
          Disconnect Wallet
        </button>
      ) : (
        <button
          onClick={connect}
          className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}
