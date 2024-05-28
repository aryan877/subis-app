"use client";

import { useEthereum } from "./Context";

export function Connect() {
  const { account, connect, disconnect } = useEthereum();

  return (
    <div className="flex justify-center items-center mt-4">
      {account.isConnected ? (
        <button onClick={disconnect} className="btn btn-error">
          Disconnect Wallet
        </button>
      ) : (
        <button onClick={connect} className="btn btn-primary">
          Connect Wallet
        </button>
      )}
    </div>
  );
}
