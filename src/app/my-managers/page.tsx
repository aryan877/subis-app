"use client";
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useEthereum } from "../../components/Context";
import ManagerFactoryArtifact from "../../../artifacts-zk/contracts/ManagerFactory.sol/ManagerFactory.json";
import SubscriptionManagerArtifact from "../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import { BackButton } from "../../components/BackButton";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, CreditCard } from "lucide-react";
import { BeatLoader } from "react-spinners";
import { useToast } from "../../context/ToastProvider";

function MyManagers() {
  const [managers, setManagers] = useState<string[]>([]);
  const [planCounts, setPlanCounts] = useState<{ [key: string]: number }>({});
  const [paymasterAddresses, setPaymasterAddresses] = useState<{
    [key: string]: string;
  }>({});
  const [paymasterBalances, setPaymasterBalances] = useState<{
    [key: string]: string;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState("");
  const [fundingInProgress, setFundingInProgress] = useState(false);
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const { getSigner, getProvider } = useEthereum();
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchManagers = async () => {
      setIsLoading(true);
      try {
        const signer = await getSigner();
        if (!signer) {
          throw new Error("Signer not found");
        }
        const factoryAddress = process.env.NEXT_PUBLIC_MANAGER_FACTORY_ADDRESS!;
        const factoryContract = new ethers.Contract(
          factoryAddress,
          ManagerFactoryArtifact.abi,
          signer
        );
        const ownerAddress = await signer.getAddress();
        const managerAddresses = await factoryContract.getManagersByOwner(
          ownerAddress
        );
        setManagers(managerAddresses);

        const planCountsObj: { [key: string]: number } = {};
        const paymasterAddressesObj: { [key: string]: string } = {};
        const paymasterBalancesObj: { [key: string]: string } = {};

        for (const managerAddress of managerAddresses) {
          const subscriptionManager = new ethers.Contract(
            managerAddress,
            SubscriptionManagerArtifact.abi,
            signer
          );
          const planCount = await subscriptionManager.planCount();
          planCountsObj[managerAddress] = planCount;

          const paymasterAddress = await subscriptionManager.paymaster();
          paymasterAddressesObj[managerAddress] = paymasterAddress;

          if (paymasterAddress !== ethers.ZeroAddress) {
            const provider = getProvider();
            const paymasterBalance = await provider!.getBalance(
              paymasterAddress
            );
            paymasterBalancesObj[managerAddress] =
              ethers.formatEther(paymasterBalance);
          } else {
            paymasterBalancesObj[managerAddress] = "0";
          }
        }

        setPlanCounts(planCountsObj);
        setPaymasterAddresses(paymasterAddressesObj);
        setPaymasterBalances(paymasterBalancesObj);
      } catch (err) {
        console.error("Error fetching managers:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchManagers();
  }, [getSigner, getProvider]);

  const openFundingModal = (managerAddress: string) => {
    setSelectedManager(managerAddress);
    setFundingAmount("");
    setFundingTxHash(null);
  };

  const closeFundingModal = () => {
    setSelectedManager(null);
  };

  const handleFundPaymaster = async () => {
    if (!selectedManager) return;

    try {
      setFundingInProgress(true);
      const signer = await getSigner();
      const subscriptionManager = new ethers.Contract(
        selectedManager,
        SubscriptionManagerArtifact.abi,
        signer
      );
      const paymasterAddress = await subscriptionManager.paymaster();
      const amount = ethers.parseEther(fundingAmount);
      const tx = await signer!.sendTransaction({
        to: paymasterAddress,
        value: amount,
      });
      setFundingTxHash(tx.hash);
      await tx.wait();
      console.log("Paymaster funded successfully");

      // Update paymaster balance immediately
      const provider = getProvider();
      const paymasterBalance = await provider!.getBalance(paymasterAddress);
      setPaymasterBalances((prevState) => ({
        ...prevState,
        [selectedManager]: ethers.formatEther(paymasterBalance),
      }));

      closeFundingModal();
    } catch (err) {
      console.error("Error funding paymaster:", err);
    } finally {
      setFundingInProgress(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopyStatus((prevStatus) => ({
      ...prevStatus,
      [address]: true,
    }));
    showToast({
      type: "success",
      message: "Address copied successfully!",
    });
    setTimeout(() => {
      setCopyStatus((prevStatus) => ({
        ...prevStatus,
        [address]: false,
      }));
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center w-full mb-6">
        <BackButton />
        <h1 className="text-3xl font-bold">My Subscription Managers</h1>
        <div className="w-12"></div>
      </div>

      {isLoading ? (
        <div>
          <span className="loading loading-dots loading-md"></span>
          <p>Loading subscription managers...</p>
        </div>
      ) : managers.length > 0 ? (
        <div className="w-full">
          <div className="flex justify-end mb-6">
            <button
              onClick={() => router.push("/create-manager")}
              className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            >
              Create New Manager
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managers.map((manager, index) => (
              <div
                key={index}
                className="card bg-base-100 border border-black rounded-lg shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              >
                <div className="card-body">
                  <h2 className="card-title">
                    Manager {index + 1}
                    <div className="badge badge-secondary ml-2">
                      {Number(planCounts[manager]) || 0} Plans
                    </div>
                  </h2>
                  <p className="mb-2 flex items-center">
                    <span className="font-semibold mr-2">Address:</span>
                    {manager.slice(0, 6)}...{manager.slice(-4)}
                    <button
                      className={`btn btn-ghost btn-xs ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                        copyStatus[manager]
                          ? "bg-success text-success-content"
                          : ""
                      }`}
                      onClick={() => handleCopyAddress(manager)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </p>
                  <p className="mb-2 flex items-center">
                    <span className="font-semibold mr-2">Paymaster:</span>
                    {paymasterAddresses[manager] !== ethers.ZeroAddress
                      ? `${paymasterAddresses[manager].slice(
                          0,
                          6
                        )}...${paymasterAddresses[manager].slice(-4)}`
                      : "No paymaster attached"}
                    {paymasterAddresses[manager] !== ethers.ZeroAddress && (
                      <button
                        className={`btn btn-ghost btn-xs ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                          copyStatus[paymasterAddresses[manager]]
                            ? "bg-success text-success-content"
                            : ""
                        }`}
                        onClick={() =>
                          handleCopyAddress(paymasterAddresses[manager])
                        }
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </p>
                  <p className="mb-4 flex items-center">
                    <span className="font-semibold mr-2">
                      Paymaster Balance:
                    </span>
                    {paymasterBalances[manager]
                      ? `${paymasterBalances[manager]} ETH`
                      : "N/A"}
                  </p>
                  <div className="card-actions justify-end">
                    <button
                      className="btn btn-primary btn-sm shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                      onClick={() => openFundingModal(manager)}
                      disabled={
                        paymasterAddresses[manager] === ethers.ZeroAddress
                      }
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Fund Paymaster
                    </button>
                    <button
                      className="btn btn-secondary btn-sm shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                      onClick={() => router.push(`/managers/${manager}`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="mb-4">No Subscription Managers found.</p>
          <button
            onClick={() => router.push("/create-manager")}
            className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
          >
            Create New Manager
          </button>
        </div>
      )}

      {/* Funding Modal */}
      {selectedManager && (
        <div className="modal modal-open">
          <div className="modal-box shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <h3 className="font-bold text-lg">Fund Paymaster</h3>
            <p className="py-4">
              {" "}
              Funding Amount (ETH), (it should be at least 0.01 ETH):
            </p>
            <input
              type="number"
              placeholder="Funding amount in ETH"
              className="input input-bordered w-full mb-4"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
            />
            {fundingTxHash && (
              <p className="mb-4">
                Transaction hash:{" "}
                <a
                  href={`https://explorer.zksync.io/tx/${fundingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  {fundingTxHash}
                </a>
              </p>
            )}
            <div className="modal-action">
              <button
                className="btn shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                onClick={closeFundingModal}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
                onClick={handleFundPaymaster}
                disabled={fundingInProgress}
              >
                {fundingInProgress ? (
                  <BeatLoader color="#ffffff" size={8} margin={2} />
                ) : (
                  "Fund"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyManagers;
