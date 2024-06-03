"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Addressable, ethers } from "ethers";
import { utils, ContractFactory, Contract } from "zksync-ethers";
import { useEthereum } from "../../../components/Context";
import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import SubscriptionPaymasterArtifact from "../../../../artifacts-zk/contracts/SubscriptionPaymaster.sol/SubscriptionPaymaster.json";
import { BackButton } from "../../../components/BackButton";
import { PlusCircle, Copy, ExternalLink, CreditCard, Info } from "lucide-react";
import { PlanCard } from "../../../components/PlanCard";
import { BeatLoader } from "react-spinners";
import { useRouter } from "next/navigation";
import { useToast } from "../../../context/ToastProvider";
import { Plan } from "../../../../interfaces/Plan";
import { Modal } from "../../../components/Modal";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

function SubscriptionManagerDetails() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const [subscriptionManager, setSubscriptionManager] =
    useState<Contract | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [owner, setOwner] = useState<string>("");
  const [managerName, setManagerName] = useState<string>("");
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
  const [noActiveSubscription, setNoActiveSubscription] = useState(false);
  const [totalSubscribers, setTotalSubscribers] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<string>("0");
  const [copyStatus, setCopyStatus] = useState<{ [key: string]: boolean }>({});
  const [userAddress, setUserAddress] = useState<string>("");
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<Plan | null>(
    null
  );
  const [showDeployPaymasterModal, setShowDeployPaymasterModal] =
    useState<boolean>(false);
  const [isDeployingPaymaster, setIsDeployingPaymaster] =
    useState<boolean>(false);
  const [isAttachingPaymaster, setIsAttachingPaymaster] =
    useState<boolean>(false);
  const [deployedPaymasterAddress, setDeployedPaymasterAddress] = useState<
    string | null
  >(null);
  const [refundDetails, setRefundDetails] = useState<{
    subscriberAddress: string;
    refundAmount: string;
  }>({ subscriberAddress: "", refundAmount: "" });
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [paymentHistory, setPaymentHistory] = useState<
    { planId: number; amount: string; timestamp: string }[]
  >([]);
  const [failedPayments, setFailedPayments] = useState<
    { planId: number; amount: string; timestamp: string }[]
  >([]);
  const [refundHistory, setRefundHistory] = useState<
    { planId: number; amount: string; timestamp: string }[]
  >([]);
  const [nextChargeTimestamp, setNextChargeTimestamp] = useState<number | null>(
    null
  );
  const [showWithdrawPaymasterModal, setShowWithdrawPaymasterModal] =
    useState<boolean>(false);
  const [paymasterWithdrawalAmount, setPaymasterWithdrawalAmount] =
    useState<string>("");

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

        const managerName = await subscriptionManager.name();
        setManagerName(managerName);

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

        const nextTimestamp = await subscriptionManager.nextChargeTimestamp();
        setNextChargeTimestamp(Number(nextTimestamp));

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

  const fetchPaymentHistory = async (
    subscriptionManager: Contract,
    subscriberAddress: string
  ) => {
    try {
      const filter =
        subscriptionManager.filters.SubscriptionFeePaid(subscriberAddress);
      const events = await subscriptionManager.queryFilter(filter);

      const history = events.map((event) => ({
        //@ts-ignore
        planId: Number(event.args?.planId),
        //@ts-ignore
        amount: ethers.formatEther(event.args?.amount),
        //@ts-ignore
        timestamp: dayjs(Number(event.args?.timestamp) * 1000)
          .local()
          .format("MMMM D, YYYY h:mm:ss A"),
      }));

      setPaymentHistory(history);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const fetchFailedPayments = async (
    subscriptionManager: Contract,
    subscriberAddress: string
  ) => {
    try {
      const filter =
        subscriptionManager.filters.PaymentFailed(subscriberAddress);
      const events = await subscriptionManager.queryFilter(filter);

      const failedPaymentsData = events.map((event) => ({
        //@ts-ignore
        planId: Number(event.args?.planId),
        //@ts-ignore
        amount: ethers.formatEther(event.args?.subscriptionFeeWei),
        //@ts-ignore
        timestamp: dayjs(Number(event.args?.timestamp) * 1000)
          .local()
          .format("MMMM D, YYYY h:mm:ss A"),
      }));

      setFailedPayments(failedPaymentsData);
    } catch (error) {
      console.error("Error fetching failed payments:", error);
    }
  };

  const fetchRefundHistory = async (
    subscriptionManager: Contract,
    subscriberAddress: string
  ) => {
    try {
      const filter =
        subscriptionManager.filters.SubscriberRefunded(subscriberAddress);
      const events = await subscriptionManager.queryFilter(filter);

      const history = events.map((event) => ({
        //@ts-ignore
        planId: Number(event.args?.planId),
        //@ts-ignore
        amount: ethers.formatEther(event.args?.amount),
        //@ts-ignore
        timestamp: dayjs(Number(event.args?.timestamp) * 1000)
          .local()
          .format("MMMM D, YYYY h:mm:ss A"),
      }));

      setRefundHistory(history);
    } catch (error) {
      console.error("Error fetching refund history:", error);
    }
  };

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

  const deployAndAttachPaymaster = async () => {
    try {
      setIsDeployingPaymaster(true);
      const signer = await getSigner();
      const factory = new ContractFactory(
        SubscriptionPaymasterArtifact.abi,
        SubscriptionPaymasterArtifact.bytecode,
        signer
      );

      const aaFactoryAddress = process.env.NEXT_PUBLIC_AA_FACTORY_ADDRESS;
      if (!aaFactoryAddress) {
        throw new Error("AA Factory address is not available.");
      }

      const deploymentTransaction = await factory.getDeployTransaction(
        address,
        aaFactoryAddress,
        {
          customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          },
        }
      );
      const provider = getProvider();
      const gasLimit = await signer!.estimateGas(deploymentTransaction);
      const gasPrice = await provider!.getGasPrice();

      const paymaster = await factory.deploy(address, aaFactoryAddress, {
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        },
        gasPrice,
        gasLimit,
      });

      await paymaster.waitForDeployment();

      const deployedPaymasterAddr = await paymaster.getAddress();
      setDeployedPaymasterAddress(deployedPaymasterAddr);

      setIsDeployingPaymaster(false);
      setIsAttachingPaymaster(true);

      const subscriptionManager = new Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.updatePaymaster(
        deployedPaymasterAddr
      );
      await tx.wait();

      setPaymaster(deployedPaymasterAddr);
      setShowDeployPaymasterModal(false);

      const paymasterBalance = await provider!.getBalance(
        deployedPaymasterAddr
      );
      setPaymasterBalance(ethers.formatEther(paymasterBalance));

      showToast({
        type: "success",
        message: "Paymaster deployed and attached successfully!",
      });
    } catch (error) {
      console.error("Error deploying and attaching paymaster:", error);
      showToast({
        type: "error",
        message: "Error deploying and attaching paymaster. Please try again.",
      });
    } finally {
      setIsDeployingPaymaster(false);
      setIsAttachingPaymaster(false);
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

  const fetchUserSubscriptionPlan = async (address: string) => {
    try {
      const subscriptionManager = new ethers.Contract(
        address,
        SubscriptionManagerArtifact.abi,
        await getSigner()
      );

      const subscription = await subscriptionManager.subscriptions(address);
      const planId = Number(subscription.planId);
      const plan = plans.find((plan) => Number(plan.planId) === planId);

      setUserSubscriptionPlan(plan || null);
    } catch (error) {
      console.error("Error fetching user subscription plan:", error);
      setUserSubscriptionPlan(null);
    }
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

  const refundSubscriber = async () => {
    try {
      const signer = await getSigner();
      const subscriptionManager = new ethers.Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const { subscriberAddress, refundAmount } = refundDetails;
      const tx = await subscriptionManager.refundSubscriber(
        subscriberAddress,
        ethers.parseEther(refundAmount)
      );

      showToast({
        type: "info",
        message: "Refunding subscriber...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Subscriber refunded successfully!",
        transactionHash: tx.hash,
      });

      setRefundDetails({ subscriberAddress: "", refundAmount: "" });
      setShowRefundModal(false);
    } catch (error) {
      console.error("Error refunding subscriber:", error);
      showToast({
        type: "error",
        message: "Error refunding subscriber. Please try again.",
      });
    }
  };

  const withdrawFromPaymaster = async () => {
    try {
      const signer = await getSigner();

      const paymasterContract = new ethers.Contract(
        paymaster,
        SubscriptionPaymasterArtifact.abi,
        signer
      );

      const tx = await paymasterContract.withdraw(owner);

      showToast({
        type: "info",
        message: "Withdrawing funds from paymaster...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      const provider = getProvider();
      const updatedPaymasterBalance = await provider!.getBalance(paymaster);
      setPaymasterBalance(ethers.formatEther(updatedPaymasterBalance));

      showToast({
        type: "success",
        message: "Funds withdrawn from paymaster successfully!",
        transactionHash: tx.hash,
      });

      setWithdrawalAmount("");
      setShowWithdrawPaymasterModal(false);
    } catch (error) {
      console.error("Error withdrawing funds from paymaster:", error);
      showToast({
        type: "error",
        message: "Error withdrawing funds from paymaster. Please try again.",
      });
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
          <div className="bg-white border border-black rounded-lg p-8 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Manager Address
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-600 break-all">{address}</div>
                    <button
                      className={`btn btn-ghost btn-xs shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
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
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Manager Name
                  </div>
                  <div className="text-gray-600">{managerName}</div>
                </div>
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Owner{" "}
                    {owner.toLowerCase() === signerAddress?.toLowerCase() && (
                      <span className="badge badge-success">
                        Current Connected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-gray-600 break-all">{owner}</div>
                    <button
                      className={`btn btn-ghost btn-xs shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
                        copyStatus[owner]
                          ? "bg-success text-success-content"
                          : ""
                      }`}
                      onClick={() => handleCopyAddress(owner)}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Paymaster Address
                  </div>
                  {paymaster !== ethers.ZeroAddress ? (
                    <div className="flex items-center space-x-2">
                      <div className="text-gray-600 break-all">{paymaster}</div>
                      <button
                        className={`btn btn-ghost btn-xs shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000] ${
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
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Paymaster Balance
                  </div>
                  <div className="text-gray-600">
                    {paymaster !== ethers.ZeroAddress
                      ? `${paymasterBalance} ETH`
                      : "N/A"}
                  </div>
                </div>
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Manager Balance
                  </div>
                  <div className="text-gray-600">{balance} ETH</div>
                </div>
                <div className="mb-6">
                  <div className="text-lg font-semibold text-gray-700 mb-2">
                    Next Charge Timestamp
                  </div>
                  <div className="text-gray-600">
                    {nextChargeTimestamp
                      ? dayjs
                          .unix(nextChargeTimestamp)
                          .local()
                          .format("MMMM D, YYYY h:mm:ss A")
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div>
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  Plan Count
                </div>
                <div className="text-gray-600">{Number(planCount)}</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  Total Subscribers
                </div>
                <div className="text-gray-600">{totalSubscribers}</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  Total Revenue
                </div>
                <div className="text-gray-600">${totalRevenue}</div>
              </div>
            </div>
            {owner.toLowerCase() === signerAddress?.toLowerCase() && (
              <>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button
                    className="btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                    onClick={() => setShowWithdrawModal(true)}
                  >
                    Withdraw
                  </button>
                  {subscriptionManager && (
                    <button
                      className="btn btn-accent shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                      onClick={copySubscriptionLink}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Share Subscription Link
                    </button>
                  )}
                  <button
                    className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                    onClick={() => {
                      router.push("/my-managers");
                    }}
                  >
                    View all Managers
                  </button>
                </div>
                {paymaster !== ethers.ZeroAddress ? (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">
                      Paymaster Actions
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <button
                        className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={openFundPaymasterModal}
                      >
                        <CreditCard className="w-4 h-4 mr-2" /> Fund Paymaster
                      </button>
                      <button
                        className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={() => setShowWithdrawPaymasterModal(true)}
                      >
                        Withdraw from Paymaster
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">
                      Paymaster Actions
                    </h3>
                    <button
                      className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                      onClick={() => setShowDeployPaymasterModal(true)}
                    >
                      Deploy and Attach Paymaster
                    </button>
                  </div>
                )}
              </>
            )}
            {paymaster !== ethers.ZeroAddress && (
              <div className="alert alert-info mt-8">
                <div className="flex items-center">
                  <Info className="w-6 h-6 mr-2" />
                  <span>
                    Keep the paymaster funded with at least 0.01 ETH to sponsor
                    gas fees for your users.
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="bg-base-100 border border-black rounded-lg p-6 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
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
          <div className="bg-white border border-black rounded-lg p-6 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <h2 className="text-2xl font-semibold mb-4">
              User Subscription Plan
            </h2>
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">User Smart Wallet Address</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="input input-bordered flex-grow"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  placeholder="Enter user smart wallet address"
                />
                <button
                  className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                  onClick={async () => {
                    const plan = await fetchUserSubscriptionPlan(userAddress);
                    setNoActiveSubscription(plan === null);
                    await fetchPaymentHistory(
                      subscriptionManager!,
                      userAddress
                    );
                    await fetchFailedPayments(
                      subscriptionManager!,
                      userAddress
                    );
                    await fetchRefundHistory(subscriptionManager!, userAddress);
                  }}
                >
                  Load Details
                </button>
              </div>
            </div>
            {noActiveSubscription && (
              <p>No active subscription plan found for the user.</p>
            )}
            {userSubscriptionPlan && (
              <div>
                <div className="mb-4">
                  <p>
                    <strong>Plan Name:</strong> {userSubscriptionPlan.name}
                  </p>
                  <p>
                    <strong>Plan Fee (USD):</strong>{" "}
                    {userSubscriptionPlan.feeUSD}
                  </p>
                  <p>
                    <strong>Plan Fee (ETH):</strong>{" "}
                    {userSubscriptionPlan.feeETH}
                  </p>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">
                    Payment History
                  </h3>
                  {paymentHistory.length > 0 ? (
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Plan ID</th>
                          <th>Amount (ETH)</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment, index) => (
                          <tr key={index}>
                            <td>{payment.planId}</td>
                            <td>{payment.amount}</td>
                            <td>{payment.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No payment history available.</p>
                  )}
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">
                    Failed Payments
                  </h3>
                  {failedPayments.length > 0 ? (
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Plan ID</th>
                          <th>Amount (ETH)</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedPayments.map((payment, index) => (
                          <tr key={index}>
                            <td>{payment.planId}</td>
                            <td>{payment.amount}</td>
                            <td>{payment.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No failed payments found.</p>
                  )}
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Refund History</h3>
                  {refundHistory.length > 0 ? (
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Plan ID</th>
                          <th>Amount (ETH)</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refundHistory.map((refund, index) => (
                          <tr key={index}>
                            <td>{refund.planId}</td>
                            <td>{refund.amount}</td>
                            <td>{refund.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No refund history available.</p>
                  )}
                </div>
                <button
                  className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                  onClick={() => {
                    setRefundDetails({
                      subscriberAddress: userAddress,
                      refundAmount: "",
                    });
                    setShowRefundModal(true);
                  }}
                >
                  Refund Subscriber
                </button>
              </div>
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
            <span className="label-text-alt text-red-500">
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
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Refund Subscriber"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Subscriber Address</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={refundDetails.subscriberAddress}
            onChange={(e) =>
              setRefundDetails({
                ...refundDetails,
                subscriberAddress: e.target.value,
              })
            }
            disabled={!!userSubscriptionPlan}
          />
        </div>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Refund Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={refundDetails.refundAmount}
            onChange={(e) =>
              setRefundDetails({
                ...refundDetails,
                refundAmount: e.target.value,
              })
            }
          />
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowRefundModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={refundSubscriber}
          >
            Refund
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
            <span className="label-text">
              Funding Amount (ETH) (should be at least 0.01 ETH in order to
              sponsor):
            </span>
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
          <div className="mb-4">
            <p>Transaction hash:</p>
            <div className="break-all">
              <a
                href={`https://explorer.zksync.io/tx/${fundingTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                {fundingTxHash}
              </a>
            </div>
          </div>
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

      <Modal
        isOpen={showDeployPaymasterModal}
        onClose={() => setShowDeployPaymasterModal(false)}
        title="Deploy and Attach Paymaster"
      >
        <p className="mb-4">
          Click the button below to deploy a new paymaster and attach it to the
          subscription manager.
        </p>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowDeployPaymasterModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={deployAndAttachPaymaster}
            disabled={isDeployingPaymaster || isAttachingPaymaster}
          >
            {isDeployingPaymaster || isAttachingPaymaster ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">
                  {isDeployingPaymaster
                    ? "Deploying Paymaster..."
                    : "Attaching Paymaster..."}
                </span>
              </div>
            ) : (
              "Deploy and Attach"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showWithdrawPaymasterModal}
        onClose={() => setShowWithdrawPaymasterModal(false)}
        title="Withdraw from Paymaster"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Withdrawal Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={paymasterWithdrawalAmount}
            onChange={(e) => setPaymasterWithdrawalAmount(e.target.value)}
            placeholder="Enter withdrawal amount"
          />
          <label className="label">
            <span className="label-text-alt text-red-500">
              Note: If you fail to maintain a minimum balance of 0.01 ETH for
              the paymaster, your users will have to pay for gas fees for all
              operations.
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2"
            onClick={() => setShowWithdrawPaymasterModal(false)}
          >
            Cancel
          </button>
          <button className="btn btn-secondary" onClick={withdrawFromPaymaster}>
            Withdraw
          </button>
        </div>
      </Modal>
    </div>
  );
}
export default SubscriptionManagerDetails;
