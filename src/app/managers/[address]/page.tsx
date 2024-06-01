"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { useEthereum } from "../../../components/Context";
import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import { BackButton } from "../../../components/BackButton";
import { PlusCircle, Copy, ExternalLink, CreditCard } from "lucide-react";
import { Contract } from "zksync-ethers";
import { PlanCard } from "../../../components/PlanCard";
import { BeatLoader } from "react-spinners";
import { useToast } from "../../../context/ToastProvider";
import { Plan } from "../../../../interfaces/Plan";
import { Modal } from "../../../components/Modal";

function SubscriptionManagerDetails() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const [subscriptionManager, setSubscriptionManager] =
    useState<Contract | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [owner, setOwner] = useState<string>("");
  const [paymaster, setPaymaster] = useState<string>("");
  const [paymasterBalance, setPaymasterBalance] = useState<string>("0");
  const [planCount, setPlanCount] = useState<number>(0);
  const [showCreatePlanModal, setShowCreatePlanModal] =
    useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showFundPaymasterModal, setShowFundPaymasterModal] =
    useState<boolean>(false);
  const [newPlanName, setNewPlanName] = useState<string>("");
  const [newPlanFeeUSD, setNewPlanFeeUSD] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingPlan, setIsCreatingPlan] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isFundingPaymaster, setIsFundingPaymaster] = useState<boolean>(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [fundingTxHash, setFundingTxHash] = useState<string | null>(null);
  const { getSigner, getProvider } = useEthereum();
  const { showToast } = useToast();
  const [signerAddress, setSignerAddress] = useState<string | undefined>(
    undefined
  );
  const [totalSubscribers, setTotalSubscribers] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<string>("0");
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchSubscriptionManagerDetails = async () => {
      try {
        const signer = await getSigner();
        const signerAddress = await signer!.getAddress();
        setSignerAddress(signerAddress);

        const provider = getProvider();
        const subscriptionManager = new ethers.Contract(
          address,
          SubscriptionManagerArtifact.abi,
          signer
        );

        setSubscriptionManager(subscriptionManager);

        const owner = await subscriptionManager.owner();
        setOwner(owner);

        const paymaster = await subscriptionManager.paymaster();
        setPaymaster(paymaster);

        if (paymaster !== ethers.ZeroAddress) {
          const paymasterBalance = await provider!.getBalance(paymaster);
          setPaymasterBalance(ethers.formatEther(paymasterBalance));
        }

        const planCount = await subscriptionManager.planCount();
        setPlanCount(planCount);

        const balance = await provider!.getBalance(address);
        setBalance(ethers.formatEther(balance));

        await fetchPlans(subscriptionManager);
        await fetchAdditionalDetails(subscriptionManager);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching subscription manager details:", error);
        setIsLoading(false);
      }
    };

    fetchSubscriptionManagerDetails();
  }, [address, getSigner, getProvider]);

  const fetchPlans = async (subscriptionManager: Contract) => {
    try {
      const allPlans: Plan[] = await subscriptionManager.getAllPlans();
      const updatedPlans: Plan[] = await Promise.all(
        allPlans.map(async (plan) => ({
          planId: plan.planId,
          name: plan.name,
          feeUSD: ethers.formatUnits(plan.feeUSD, 8),
          feeETH: parseFloat(
            ethers.formatUnits(
              await subscriptionManager.convertUSDtoETH(plan.feeUSD),
              18
            )
          ).toFixed(6),
          exists: plan.exists,
          isLive: plan.isLive,
          subscriberCount: Number(
            await subscriptionManager.getSubscriberCount(plan.planId)
          ),
        }))
      );
      setPlans(updatedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchAdditionalDetails = async (subscriptionManager: Contract) => {
    try {
      const totalSubscribers = await subscriptionManager.getTotalSubscribers();
      const totalRevenue = await subscriptionManager.getTotalRevenue();

      setTotalSubscribers(Number(totalSubscribers));
      setTotalRevenue(ethers.formatUnits(totalRevenue, 8));
    } catch (error) {
      console.error("Error fetching additional details:", error);
    }
  };

  const createPlan = async () => {
    try {
      setIsCreatingPlan(true);

      const signer = await getSigner();
      const subscriptionManager = new ethers.Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const feeUSD = ethers.parseUnits(newPlanFeeUSD, 8);
      const tx = await subscriptionManager.createPlan(newPlanName, feeUSD);

      showToast({
        type: "info",
        message: "Creating plan...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      setNewPlanName("");
      setNewPlanFeeUSD("");
      setShowCreatePlanModal(false);

      await fetchPlans(subscriptionManager);
      await fetchAdditionalDetails(subscriptionManager);

      const updatedPlanCount = await subscriptionManager.planCount();
      setPlanCount(updatedPlanCount);

      showToast({
        type: "success",
        message: "Plan created successfully!",
        transactionHash: tx.hash,
      });
    } catch (error) {
      console.error("Error creating plan:", error);
      showToast({
        type: "error",
        message: "Error creating plan. Please try again.",
      });
    } finally {
      setIsCreatingPlan(false);
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

  const openFundPaymasterModal = () => {
    setShowFundPaymasterModal(true);
    setFundingAmount("");
    setFundingTxHash(null);
  };

  const closeFundPaymasterModal = () => {
    setShowFundPaymasterModal(false);
  };

  const handleFundPaymaster = async () => {
    try {
      setIsFundingPaymaster(true);
      const signer = await getSigner();
      const amount = ethers.parseEther(fundingAmount);
      const tx = await signer!.sendTransaction({
        to: paymaster,
        value: amount,
      });
      setFundingTxHash(tx.hash);
      await tx.wait();
      console.log("Paymaster funded successfully");

      // Update paymaster balance immediately
      const provider = getProvider();
      const updatedPaymasterBalance = await provider!.getBalance(paymaster);
      setPaymasterBalance(ethers.formatEther(updatedPaymasterBalance));

      closeFundPaymasterModal();
    } catch (err) {
      console.error("Error funding paymaster:", err);
    } finally {
      setIsFundingPaymaster(false);
    }
  };

  const withdraw = async () => {
    try {
      setIsWithdrawing(true);

      const signer = await getSigner();
      const subscriptionManager = new ethers.Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.withdraw(
        ethers.parseEther(withdrawalAmount)
      );

      showToast({
        type: "info",
        message: "Withdrawing funds...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      const provider = getProvider();
      const updatedBalance = await provider!.getBalance(address);
      setBalance(ethers.formatEther(updatedBalance));

      showToast({
        type: "success",
        message: "Funds withdrawn successfully!",
        transactionHash: tx.hash,
      });

      setWithdrawalAmount("");
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      showToast({
        type: "error",
        message: "Error withdrawing funds. Please try again.",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const copySubscriptionLink = () => {
    const subscriptionLink = `${window.location.origin}/subscription/${address}`;
    navigator.clipboard.writeText(subscriptionLink);
    showToast({
      type: "success",
      message: "Subscription link copied successfully!",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-8">
        Subscription Manager Dashboard
      </h1>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <BeatLoader size={12} color="#4B5563" />
        </div>
      ) : subscriptionManager ? (
        <div className="w-full max-w-7xl px-4">
          <BackButton />
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Manager Address
                </div>
                <div className="text-gray-600 break-all flex items-center">
                  {address}
                  <button
                    className={`btn btn-ghost btn-xs ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                      copyStatus[address]
                        ? "bg-success text-success-content"
                        : ""
                    }`}
                    onClick={() => handleCopyAddress(address)}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Owner{" "}
                  {owner.toLowerCase() === signerAddress?.toLowerCase() && (
                    <span className="badge badge-success">
                      Current Connected
                    </span>
                  )}
                </div>
                <div className="text-gray-600 break-all flex items-center">
                  {owner}
                  <button
                    className={`btn btn-ghost btn-xs ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                      copyStatus[owner] ? "bg-success text-success-content" : ""
                    }`}
                    onClick={() => handleCopyAddress(owner)}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Paymaster Address
                </div>
                {paymaster !== ethers.ZeroAddress ? (
                  <div className="text-gray-600 break-all flex items-center">
                    {paymaster}
                    <button
                      className={`btn btn-ghost btn-xs ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                        copyStatus[paymaster]
                          ? "bg-success text-success-content"
                          : ""
                      }`}
                      onClick={() => handleCopyAddress(paymaster)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-600">No paymaster attached</div>
                )}
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Paymaster Balance
                </div>
                <div className="text-gray-600">
                  {paymaster !== ethers.ZeroAddress
                    ? `${paymasterBalance} ETH`
                    : "N/A"}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Manager Balance
                </div>
                <div className="text-gray-600">{balance} ETH</div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Plan Count
                </div>
                <div className="text-gray-600">{Number(planCount)}</div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Total Subscribers
                </div>
                <div className="text-gray-600">{totalSubscribers}</div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-lg font-semibold text-gray-700">
                  Total Revenue
                </div>
                <div className="text-gray-600">${totalRevenue}</div>
              </div>
            </div>
            <div className="mt-6 flex space-x-4">
              {owner.toLowerCase() === signerAddress?.toLowerCase() && (
                <>
                  <button
                    className="btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                    onClick={() => setShowWithdrawModal(true)}
                  >
                    Withdraw
                  </button>
                  {paymaster !== ethers.ZeroAddress && (
                    <button
                      className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                      onClick={openFundPaymasterModal}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Fund Paymaster
                    </button>
                  )}
                  {subscriptionManager && (
                    <div>
                      <button
                        className="btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={copySubscriptionLink}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Subscription Link
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="bg-base-100 border border-base-300 rounded-lg p-6 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold">All Subscription Plans</h2>
              {owner.toLowerCase() === signerAddress?.toLowerCase() && (
                <button
                  className="btn btn-primary btn-sm shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                  onClick={() => setShowCreatePlanModal(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Plan
                </button>
              )}
            </div>
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.planId}
                    plan={plan}
                    subscriptionManagerAddress={address}
                    onPlanUpdated={fetchPlans}
                  />
                ))}
              </div>
            ) : (
              <p>No plans available.</p>
            )}
          </div>
        </div>
      ) : (
        <p>Subscription Manager not found.</p>
      )}
      <Modal
        isOpen={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        title="Create New Plan"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Plan Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
        </div>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Plan Fee (USD)</span>
          </label>
          <input
            type="number"
            step="0.00000001"
            className="input input-bordered"
            value={newPlanFeeUSD}
            onChange={(e) => setNewPlanFeeUSD(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowCreatePlanModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={createPlan}
            disabled={isCreatingPlan}
          >
            {isCreatingPlan ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Creating Plan...</span>
              </div>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        title="Withdraw Funds"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Withdrawal Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
            placeholder="Enter withdrawal amount"
          />
          <label className="label">
            <span className="label-text-alt text-warning">
              Please ensure to leave some funds for gas to charge wallets.
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowWithdrawModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={withdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Withdrawing...</span>
              </div>
            ) : (
              "Withdraw"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showFundPaymasterModal}
        onClose={closeFundPaymasterModal}
        title="Fund Paymaster"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Funding Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={fundingAmount}
            onChange={(e) => setFundingAmount(e.target.value)}
            placeholder="Enter funding amount"
          />
        </div>
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
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={closeFundPaymasterModal}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={handleFundPaymaster}
            disabled={isFundingPaymaster}
          >
            {isFundingPaymaster ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Funding...</span>
              </div>
            ) : (
              "Fund"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
export default SubscriptionManagerDetails;
