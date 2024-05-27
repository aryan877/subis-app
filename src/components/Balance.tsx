"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAsync } from "../hooks/useAsync";
import { useEthereum } from "./Context";

export function Balance() {
  return (
    <div className="card bg-base-100">
      <div className="card-body">
        <h2 className="card-title">Balance</h2>
        <AccountBalance />
        <FindBalance />
      </div>
    </div>
  );
}

export function AccountBalance() {
  const { getProvider, account } = useEthereum();
  const {
    result: balance,
    execute: fetchBalance,
    error,
  } = useAsync((address) => getProvider()!.getBalance(address));

  useEffect(() => {
    if (account?.address) {
      fetchBalance(account.address);
    }
  }, [account]);

  return (
    <div>
      <p>
        Connected wallet balance: {balance ? ethers.formatEther(balance) : ""}
        <button
          className="btn btn-sm btn-primary ml-2"
          onClick={() => fetchBalance(account?.address)}
        >
          Refetch
        </button>
      </p>
      {error && <div className="alert alert-error mt-4">{error.message}</div>}
    </div>
  );
}

export function FindBalance() {
  const [address, setAddress] = useState("");
  const { getProvider } = useEthereum();
  const fetchBalanceFunc = async (address: string) => {
    const provider = getProvider();
    if (!provider) throw new Error("Provider not found");
    return provider.getBalance(address);
  };
  const {
    result: balance,
    execute: fetchBalance,
    inProgress,
    error,
  } = useAsync(fetchBalanceFunc);

  return (
    <div className="mt-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Find balance:</span>
        </label>
        <div className="input-group">
          <input
            type="text"
            placeholder="Wallet address"
            className="input input-bordered"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={() => fetchBalance(address)}
          >
            {inProgress ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </div>
      <p className="mt-2">{balance ? ethers.formatEther(balance) : ""}</p>
      {error && <div className="alert alert-error mt-4">{error.message}</div>}
    </div>
  );
}
