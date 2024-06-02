"use client";
import { useAsync } from "../hooks/useAsync";
import { chains, useEthereum } from "./Context";

export function NetworkSwitcher() {
  const { switchNetwork: switchToChainByID, network } = useEthereum();
  const {
    execute: switchNetwork,
    inProgress,
    error,
  } = useAsync(switchToChainByID);

  return (
    <div className="card bg-base-100 transition duration-300 ease-in-out">
      <div className="card-body">
        <h2 className="card-title">Network</h2>
        <p>
          Connected to {network?.name || network?.id}
          {network?.unsupported && (
            <span className="badge badge-error ml-2">Unsupported</span>
          )}
        </p>
        <div className="card-actions justify-end">
          {chains.map((item, index) => (
            <button
              key={index}
              className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={() => switchNetwork(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        {error && <div className="alert alert-error mt-4">{error.message}</div>}
      </div>
    </div>
  );
}
