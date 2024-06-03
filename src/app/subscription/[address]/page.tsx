"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { Contract, EIP712Signer, Wallet, types, utils } from "zksync-ethers";
import { useEthereum } from "../../../components/Context";
import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import AAFactoryArtifact from "../../../../artifacts-zk/contracts/AAFactory.sol/AAFactory.json";
import SubscriptionAccountArtifact from "../../../../artifacts-zk/contracts/SubscriptionAccount.sol/SubscriptionAccount.json";
import { BackButton } from "../../../components/BackButton";
import { BeatLoader } from "react-spinners";
import { useToast } from "../../../context/ToastProvider";
import { Plan } from "../../../../interfaces/Plan";
import { Modal } from "../../../components/Modal";
import { AlertCircle, Copy, CreditCard, XCircle } from "lucide-react";
import UserFacingPlanCard from "./component/UserFacingPlanCard";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { isPaymasterBalanceSufficient } from "../../../utils/helpers";

dayjs.extend(utc);
dayjs.extend(timezone);

function SubscriptionPage() {
  const params = useParams();
  const managerAddress: string = params.address;
  const [managerName, setManagerName] = useState<string>("");
  const [subscriptionManager, setSubscriptionManager] =
    useState<Contract | null>(null);
  const [subscriptionAccount, setSubscriptionAccount] =
    useState<Contract | null>(null);
  const [subscriptionAccountAddress, setSubscriptionAccountAddress] = useState<
    string | null
  >(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isSettingSpendingLimit, setIsSettingSpendingLimit] =
    useState<boolean>(false);
  const [isRemovingSpendingLimit, setIsRemovingSpendingLimit] =
    useState<boolean>(false);
  //form value
  const [spendingLimitAmount, setSpendingLimitAmount] = useState<string>("");
  //on chain value
  const [spendingLimitUSD, setSpendingLimitUSD] = useState<string>("0");
  const [signerAddress, setSignerAddress] = useState<string>("");
  const [isPaymasterEnabled, setIsPaymasterEnabled] = useState<boolean>(false);
  const [showFundingModal, setShowFundingModal] = useState<boolean>(false);
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showSpendingLimitModal, setShowSpendingLimitModal] =
    useState<boolean>(false);
  const [subscriptionAccountBalance, setSubscriptionAccountBalance] =
    useState<string>("0");
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const { getSigner, getProvider } = useEthereum();
  const [subscriptionAccountBalanceUSD, setSubscriptionAccountBalanceUSD] =
    useState<string>("0");
  const [paymentHistory, setPaymentHistory] = useState<
    { planId: number; amount: string; timestamp: string }[]
  >([]);
  const [paymasterBalance, setPaymasterBalance] = useState<string>("0");
  const [failedPayments, setFailedPayments] = useState<
    { planId: number; amount: string; timestamp: string }[]
  >([]);

  const { showToast } = useToast();
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const signer = await getSigner();
        const signerAddress = await signer!.getAddress();
        setSignerAddress(signerAddress);

        const subscriptionManager = new Contract(
          managerAddress,
          SubscriptionManagerArtifact.abi,
          signer!
        );
        setSubscriptionManager(subscriptionManager);
        const managerName = await subscriptionManager.name();
        setManagerName(managerName);

        const paymaster = await subscriptionManager.paymaster();
        setIsPaymasterEnabled(paymaster !== ethers.ZeroAddress);
        setPaymasterAddress(paymaster);
        if (paymaster !== ethers.ZeroAddress) {
          const provider = getProvider();
          const balance = await provider!.getBalance(paymaster);
          setPaymasterBalance(ethers.formatEther(balance));
        }

        const aaFactory = new Contract(
          process.env.NEXT_PUBLIC_AA_FACTORY_ADDRESS!,
          AAFactoryArtifact.abi,
          signer!
        );
        const subscriptionAccountAddress =
          await aaFactory.getAccountByOwnerAndManager(
            signerAddress,
            managerAddress
          );
        if (subscriptionManager && subscriptionAccountAddress) {
          await fetchPlans(subscriptionManager, subscriptionAccountAddress);
          await fetchPaymentHistory(
            subscriptionManager,
            subscriptionAccountAddress
          );
          await fetchFailedPayments(
            subscriptionManager,
            subscriptionAccountAddress
          );
        }
        if (subscriptionAccountAddress !== ethers.ZeroAddress) {
          const subscriptionAccount = new Contract(
            subscriptionAccountAddress,
            SubscriptionAccountArtifact.abi,
            signer!
          );
          setSubscriptionAccount(subscriptionAccount);

          const address = await subscriptionAccount.getAddress();
          setSubscriptionAccountAddress(address);

          const provider = getProvider();
          const balance = await fetchSubscriptionAccountBalance(
            provider!,
            address
          );
          setSubscriptionAccountBalance(balance);

          const limit = await subscriptionAccount.limits(
            utils.L2_ETH_TOKEN_ADDRESS
          );

          setSpendingLimitUSD(ethers.formatUnits(limit[0], 8));
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [managerAddress, getSigner]);

  const fetchPaymentHistory = async (
    subscriptionManager: Contract,
    subscriptionAccountAddress: string | null
  ) => {
    try {
      const filter = subscriptionManager.filters.SubscriptionFeePaid(
        subscriptionAccountAddress
      );
      const events = await subscriptionManager.queryFilter(filter);

      const history = events.map((event) => ({
        //@ts-ignore
        planId: Number(event.args.planId),
        //@ts-ignore
        amount: ethers.formatEther(event.args.amount),
        //@ts-ignore
        timestamp: dayjs(Number(event.args.timestamp) * 1000)
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
    subscriptionAccountAddress: string | null
  ) => {
    try {
      const filter = subscriptionManager.filters.PaymentFailed(
        subscriptionAccountAddress
      );
      const events = await subscriptionManager.queryFilter(filter);

      const failedPaymentsData = events.map((event) => ({
        //@ts-ignore
        planId: Number(event.args.planId),
        //@ts-ignore
        amount: ethers.formatEther(event.args.subscriptionFeeWei),
        //@ts-ignore
        timestamp: dayjs(Number(event.args.timestamp) * 1000)
          .local()
          .format("MMMM D, YYYY h:mm:ss A"),
      }));

      setFailedPayments(failedPaymentsData);
    } catch (error) {
      console.error("Error fetching failed payments:", error);
    }
  };

  const fetchPlans = async (
    subscriptionManager: Contract,
    subscriptionAccountAddress: string | null
  ) => {
    try {
      const livePlans: Plan[] = await subscriptionManager.getLivePlans();
      const updatedPlans: Plan[] = await Promise.all(
        livePlans.map(async (plan) => {
          const subscriptionDetails = subscriptionAccountAddress
            ? await subscriptionManager.subscriptions(
                subscriptionAccountAddress
              )
            : null;

          const isSubscribed = subscriptionDetails
            ? subscriptionDetails.planId === plan.planId
            : false;

          const isActive = subscriptionDetails
            ? subscriptionDetails.isActive
            : false;

          const nextPaymentTimestamp = subscriptionDetails
            ? dayjs(Number(subscriptionDetails.nextPaymentTimestamp) * 1000)
                .local()
                .format("MMMM D, YYYY h:mm:ss A")
            : "";

          const updatedPlan: Plan = {
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
            isSubscribed,
            isActive,
            nextPaymentTimestamp,
          };

          if (isSubscribed && isActive) {
            setCurrentPlan(updatedPlan);
          }

          return updatedPlan;
        })
      );
      setPlans(updatedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const deploySubscriptionAccount = async () => {
    try {
      setIsDeploying(true);
      const signer = await getSigner();
      const signerAddress = await signer!.getAddress();

      let wallet;
      let deploymentOptions: any = undefined;

      if (
        paymasterAddress !== ethers.ZeroAddress &&
        isPaymasterBalanceSufficient(paymasterBalance)
      ) {
        wallet = new Wallet(
          ethers.Wallet.createRandom().privateKey,
          //@ts-ignore
          getProvider()
        );

        const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
          type: "General",
          innerInput: new Uint8Array(),
        });

        deploymentOptions = {
          customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams: paymasterParams,
          },
        };
      } else {
        wallet = signer;
      }

      const priceFeedAddress = process.env.NEXT_PUBLIC_PRICE_FEED_ADDRESS!;
      const aaFactory = new Contract(
        process.env.NEXT_PUBLIC_AA_FACTORY_ADDRESS!,
        AAFactoryArtifact.abi,
        wallet
      );
      const salt = ethers.id(signerAddress);

      let tx;
      if (deploymentOptions) {
        tx = await aaFactory.deployAccount(
          salt,
          signerAddress,
          managerAddress,
          priceFeedAddress,
          deploymentOptions
        );
      } else {
        tx = await aaFactory.deployAccount(
          salt,
          signerAddress,
          managerAddress,
          priceFeedAddress
        );
      }

      showToast({
        type: "info",
        message: "Deploying subscription account...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      const subscriptionAccountAddress =
        await aaFactory.getAccountByOwnerAndManager(
          signerAddress,
          managerAddress
        );
      const subscriptionAccount = new Contract(
        subscriptionAccountAddress,
        SubscriptionAccountArtifact.abi,
        signer
      );
      setSubscriptionAccount(subscriptionAccount);

      const address = await subscriptionAccount.getAddress();
      setSubscriptionAccountAddress(address);

      showToast({
        type: "success",
        message: "Subscription account deployed successfully!",
        transactionHash: tx.hash,
      });
      setShowDeployModal(false);
    } catch (error) {
      console.error("Error deploying subscription account:", error);
      showToast({
        type: "error",
        message: "Error deploying subscription account. Please try again.",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const fetchSubscriptionAccountBalance = async (
    provider: ethers.Provider,
    subscriptionAccountAddress: string
  ) => {
    const balance = await provider.getBalance(subscriptionAccountAddress);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  };

  const handleFundWallet = async () => {
    try {
      setIsFunding(true);
      const signer = await getSigner();
      const tx = await signer!.sendTransaction({
        to: subscriptionAccountAddress!,
        value: ethers.parseEther(fundingAmount),
      });

      showToast({
        type: "info",
        message: "Funding wallet...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      const provider = getProvider();
      const balance = await fetchSubscriptionAccountBalance(
        provider!,
        subscriptionAccountAddress!
      );
      setSubscriptionAccountBalance(balance);
      showToast({
        type: "success",
        message: "Wallet funded successfully!",
        transactionHash: tx.hash,
      });

      setFundingAmount("");
      setShowFundingModal(false);
    } catch (error) {
      console.error("Error funding wallet:", error);
      showToast({
        type: "error",
        message: "Error funding wallet. Please try again.",
      });
    } finally {
      setIsFunding(false);
    }
  };

  const withdraw = async () => {
    try {
      const signer = await getSigner();
      const provider = getProvider()!;

      if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
        throw new Error("Invalid withdrawal amount");
      }

      let withdrawTx = await subscriptionAccount!.withdraw.populateTransaction(
        ethers.parseEther(withdrawAmount)
      );

      const subscriptionAccountAddress =
        await subscriptionAccount?.getAddress();

      // const paymaster = await subscriptionManager!.paymaster();

      withdrawTx = {
        ...withdrawTx,
        from: subscriptionAccountAddress,
        chainId: (await provider!.getNetwork()).chainId,
        nonce: await provider!.getTransactionCount(subscriptionAccountAddress!),
        type: utils.EIP712_TX_TYPE,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          // ...(paymaster !== ethers.ZeroAddress &&
          //   isPaymasterBalanceSufficient(paymasterBalance) && {
          //     paymasterParams: utils.getPaymasterParams(paymaster, {
          //       type: "General",
          //       innerInput: new Uint8Array(),
          //     }),
          //   }),
        } as types.Eip712Meta,
      };

      withdrawTx.gasPrice = await provider.getGasPrice();
      withdrawTx.gasLimit = await provider.estimateGas(withdrawTx);

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(withdrawTx.chainId)
      );
      const signedTx = await eip712Signer.sign(withdrawTx);

      withdrawTx.customData = {
        ...withdrawTx.customData,
        customSignature: signedTx,
      };

      showToast({ type: "info", message: "Withdrawing funds..." });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(withdrawTx)
      );
      await sentTx.wait();

      showToast({
        type: "success",
        message: "Funds withdrawn successfully!",
        transactionHash: sentTx.hash,
      });

      setWithdrawAmount("");
      setShowWithdrawModal(false);

      const balance = await fetchSubscriptionAccountBalance(
        provider!,
        subscriptionAccountAddress!
      );
      setSubscriptionAccountBalance(balance);
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      showToast({
        type: "error",
        message: "Error withdrawing funds. Please try again.",
      });
    }
  };

  useEffect(() => {
    const updateSubscriptionAccountBalanceUSD = async () => {
      if (subscriptionManager) {
        try {
          const balanceWei = ethers.parseEther(subscriptionAccountBalance);
          const balanceUSD = await subscriptionManager.convertETHtoUSD(
            balanceWei
          );
          setSubscriptionAccountBalanceUSD(ethers.formatUnits(balanceUSD, 8));
        } catch (error) {
          console.error("Error converting balance to USD:", error);
        }
      }
    };

    updateSubscriptionAccountBalanceUSD();
  }, [subscriptionAccountBalance, subscriptionManager]);

  const setSpendingLimit = async () => {
    try {
      setIsSettingSpendingLimit(true);
      const signer = await getSigner();
      const provider = getProvider()!;

      if (!spendingLimitAmount || isNaN(Number(spendingLimitAmount))) {
        throw new Error("Invalid spending limit amount");
      }

      let setLimitTx =
        await subscriptionAccount!.setSpendingLimit.populateTransaction(
          utils.L2_ETH_TOKEN_ADDRESS,
          ethers.parseUnits(spendingLimitAmount, 8)
        );

      // const paymaster = await subscriptionManager!.paymaster();

      const subscriptionAccountAddress =
        await subscriptionAccount?.getAddress();

      setLimitTx = {
        ...setLimitTx,
        from: subscriptionAccountAddress,
        chainId: (await provider!.getNetwork()).chainId,
        nonce: await provider!.getTransactionCount(subscriptionAccountAddress!),
        type: utils.EIP712_TX_TYPE,
        value: ethers.getBigInt(0),
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          // ...(paymaster !== ethers.ZeroAddress &&
          //   isPaymasterBalanceSufficient(paymasterBalance) && {
          //     paymasterParams: utils.getPaymasterParams(paymaster, {
          //       type: "General",
          //       innerInput: new Uint8Array(),
          //     }),
          //   }),
        } as types.Eip712Meta,
      };

      setLimitTx.gasPrice = await provider.getGasPrice();
      setLimitTx.gasLimit = await provider.estimateGas(setLimitTx);

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(setLimitTx.chainId)
      );
      const signedTx = await eip712Signer.sign(setLimitTx);

      setLimitTx.customData = {
        ...setLimitTx.customData,
        customSignature: signedTx,
      };

      showToast({ type: "info", message: "Setting spending limit..." });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(setLimitTx)
      );
      await sentTx.wait();

      showToast({
        type: "success",
        message: "Spending limit set successfully!",
        transactionHash: sentTx.hash,
      });

      setSpendingLimitAmount("");
      setShowSpendingLimitModal(false);
      const limit = await subscriptionAccount!.limits(
        utils.L2_ETH_TOKEN_ADDRESS
      );

      setSpendingLimitUSD(ethers.formatUnits(limit[0], 8));
    } catch (error) {
      console.error("Error setting spending limit:", error);
      showToast({
        type: "error",
        message: "Error setting spending limit. Please try again.",
      });
    } finally {
      setIsSettingSpendingLimit(false);
    }
  };

  const removeSpendingLimit = async () => {
    try {
      setIsRemovingSpendingLimit(true);
      const signer = await getSigner();
      const provider = getProvider()!;

      let removeLimitTx =
        await subscriptionAccount!.removeSpendingLimit.populateTransaction(
          utils.L2_ETH_TOKEN_ADDRESS
        );
      const paymaster = await subscriptionManager!.paymaster();

      const subscriptionAccountAddress =
        await subscriptionAccount?.getAddress();

      removeLimitTx = {
        ...removeLimitTx,
        from: subscriptionAccountAddress,
        chainId: (await provider!.getNetwork()).chainId,
        nonce: await provider!.getTransactionCount(subscriptionAccountAddress!),
        type: utils.EIP712_TX_TYPE,
        value: ethers.getBigInt(0),
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          // ...(paymaster !== ethers.ZeroAddress &&
          //   isPaymasterBalanceSufficient(paymasterBalance) && {
          //     paymasterParams: utils.getPaymasterParams(paymaster, {
          //       type: "General",
          //       innerInput: new Uint8Array(),
          //     }),
          //   }),
        } as types.Eip712Meta,
      };

      removeLimitTx.gasPrice = await provider.getGasPrice();
      removeLimitTx.gasLimit = await provider.estimateGas(removeLimitTx);

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(removeLimitTx.chainId)
      );
      const signedTx = await eip712Signer.sign(removeLimitTx);

      removeLimitTx.customData = {
        ...removeLimitTx.customData,
        customSignature: signedTx,
      };

      showToast({ type: "info", message: "Removing spending limit..." });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(removeLimitTx)
      );
      await sentTx.wait();

      showToast({
        type: "success",
        message: "Spending limit removed successfully!",
        transactionHash: sentTx.hash,
      });

      setSpendingLimitUSD("0");
    } catch (error) {
      console.error("Error removing spending limit:", error);
      showToast({
        type: "error",
        message: "Error removing spending limit. Please try again.",
      });
    } finally {
      setIsRemovingSpendingLimit(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    showToast({
      type: "success",
      message: "Address copied to clipboard!",
    });
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-8">Subscription Page</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <BeatLoader size={12} color="#4B5563" />
        </div>
      ) : (
        <div className="w-full max-w-7xl px-4">
          <BackButton />
          <div className="bg-white border border-black rounded-lg p-8 mb-8 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
            <div className="mb-6">
              <div className="text-lg font-semibold text-gray-700 mb-2">
                Manager Name
              </div>
              <div className="text-gray-600">{managerName}</div>
            </div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <CreditCard className="w-6 h-6 mr-2" />
              Smart Wallet
            </h2>

            {subscriptionAccount ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="stats stats-vertical">
                    <div className="stat">
                      <div className="stat-title">Subscription Account</div>
                      <div className="stat-value truncate">
                        {subscriptionAccountAddress || "N/A"}
                      </div>
                      <div className="stat-actions">
                        <button
                          className="btn btn-sm btn-ghost shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                          onClick={() =>
                            handleCopyAddress(subscriptionAccountAddress || "")
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Account Balance</div>
                      <div className="stat-value">
                        {subscriptionAccountBalance} ETH
                        <span className="text-gray-500 text-sm ml-2">
                          (${subscriptionAccountBalanceUSD} USD)
                        </span>
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Paymaster Address</div>
                      <div className="stat-value truncate">
                        {paymasterAddress || "N/A"}
                      </div>

                      <div className="stat-actions">
                        <button
                          className="btn btn-sm btn-ghost shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                          onClick={() => handleCopyAddress(paymasterAddress)}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    {currentPlan && (
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold mb-2">
                          Current Subscription
                        </h3>
                        <div className="flex flex-col space-y-1">
                          <p>
                            <span className="font-semibold">Plan:</span>{" "}
                            {currentPlan.name}
                          </p>
                          <p>
                            <span className="font-semibold">Fee:</span> $
                            {currentPlan.feeUSD} per month
                            <span className="text-gray-500">
                              {" "}
                              (Equivalent to {currentPlan.feeETH} ETH using
                              Chainlink price feeds)
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold">Next Payment:</span>{" "}
                            {currentPlan.nextPaymentTimestamp}
                          </p>
                          <p className="flex items-center">
                            <span className="font-semibold">
                              Manager Address:
                            </span>{" "}
                            <span className="ml-1">{managerAddress}</span>
                            <button
                              className="btn btn-sm btn-ghost ml-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                              onClick={() => handleCopyAddress(managerAddress)}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </p>
                        </div>
                      </div>
                    )}
                    {isPaymasterEnabled ? (
                      paymasterBalance !== "0" &&
                      isPaymasterBalanceSufficient(paymasterBalance) ? (
                        <div className="alert alert-success">
                          <div className="flex items-start">
                            <span>
                              <strong>Notice:</strong> The paymaster covers gas
                              fees <strong>only</strong> for transactions
                              directly interacting with the Subscription Manager
                              contract, such as subscribing, unsubscribing, and
                              resuming subscriptions etc. However, users are
                              responsible for paying gas fees for all other
                              transactions, including setting spending limits
                              and funding the wallet with subscription fees.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-warning">
                          <div className="flex items-start">
                            <AlertCircle className="w-6 h-6 mr-2" />
                            <span>
                              <strong>Notice:</strong> The paymaster balance is
                              low. Please inform the subscription owner to fund
                              the paymaster. In the meantime, you will need to
                              pay for your own transactions.
                            </span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="alert alert-error">
                        <div className="flex items-start">
                          <XCircle className="w-6 h-6 mr-2" />
                          <span>
                            <strong>Alert:</strong> The subscription owner does
                            not sponsor transactions. Please fund the
                            subscription smart wallet account to perform
                            transactions.
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={() => setShowFundingModal(true)}
                      >
                        Fund Wallet
                      </button>
                      <button
                        className="btn btn-accent mt-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={() => setShowWithdrawModal(true)}
                      >
                        Withdraw Funds
                      </button>
                      <button
                        className="btn btn-secondary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={() => setShowSpendingLimitModal(true)}
                      >
                        Set Daily Spending Limit
                      </button>
                      <button
                        className="btn btn-accent mt-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                        onClick={removeSpendingLimit}
                        disabled={isRemovingSpendingLimit}
                      >
                        {isRemovingSpendingLimit ? (
                          <div className="flex items-center justify-center">
                            <BeatLoader size={8} color="#FFFFFF" />
                            <span className="ml-2">Removing Limit...</span>
                          </div>
                        ) : (
                          "Remove Spending Limit"
                        )}
                      </button>
                    </div>
                    {subscriptionAccount && spendingLimitUSD !== "0" && (
                      <div className="mt-8 mb-4">
                        <h3 className="text-xl font-semibold mb-2">
                          Spending Limit
                        </h3>
                        <p>
                          <span className="font-semibold">Limit:</span> $
                          {spendingLimitUSD} per day
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div
                  className={`alert ${
                    isPaymasterEnabled &&
                    paymasterBalance !== "0" &&
                    isPaymasterBalanceSufficient(paymasterBalance)
                      ? "alert-info"
                      : "alert-error"
                  } mb-4`}
                >
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    <div>
                      <p className="font-bold">No Subscription Account Found</p>
                      <p>Please deploy a new subscription account.</p>
                      <p>
                        Your smart account will automatically be charged at the
                        end of each month.
                      </p>
                      <p>
                        You will be charged each month based on your subscribed
                        plan.
                      </p>
                      {isPaymasterEnabled ? (
                        paymasterBalance !== "0" &&
                        isPaymasterBalanceSufficient(paymasterBalance) ? (
                          <p>
                            <strong>Note:</strong> The subscription owner
                            sponsors the deployment of your subscription smart
                            account. You can deploy your account gaslessly.
                          </p>
                        ) : (
                          <p>
                            <strong>Note:</strong> The paymaster balance is low.
                            Please inform the subscription owner to fund the
                            paymaster. You will need to pay for the deployment
                            of your subscription smart account.
                          </p>
                        )
                      ) : (
                        <p>
                          <strong>Note:</strong> The subscription owner does not
                          sponsor transactions. You will need to pay for the
                          deployment of your subscription smart account.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                  onClick={() => setShowDeployModal(true)}
                >
                  Deploy Subscription Smart Wallet
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-black rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Live Plans</h2>
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <UserFacingPlanCard
                    key={plan.planId}
                    plan={plan}
                    paymasterBalance={paymasterBalance}
                    subscriptionManager={subscriptionManager!}
                    subscriptionAccount={subscriptionAccount}
                    onPlanUpdated={async () => {
                      await fetchPlans(
                        subscriptionManager!,
                        subscriptionAccountAddress
                      );
                      await fetchPaymentHistory(
                        subscriptionManager!,
                        subscriptionAccountAddress
                      );
                      await fetchFailedPayments(
                        subscriptionManager!,
                        subscriptionAccountAddress
                      );
                      const provider = getProvider();
                      const balance = await fetchSubscriptionAccountBalance(
                        provider!,
                        subscriptionAccountAddress!
                      );
                      setSubscriptionAccountBalance(balance);
                    }}
                  />
                ))}
              </div>
            ) : (
              <p>No live plans available.</p>
            )}
          </div>

          <div className="bg-white border border-black rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Payment History</h2>
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

          <div className="bg-white border border-black rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Failed Payments</h2>
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
        </div>
      )}

      <Modal
        isOpen={showDeployModal}
        onClose={() => setShowDeployModal(false)}
        title="Deploy Subscription Account"
      >
        <p className="mb-4">
          Click the button below to deploy a new subscription account.
        </p>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowDeployModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={deploySubscriptionAccount}
            disabled={isDeploying}
          >
            {isDeploying ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Deploying...</span>
              </div>
            ) : (
              "Deploy Smart Wallet"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showSpendingLimitModal}
        onClose={() => setShowSpendingLimitModal(false)}
        title="Set Spending Limit"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Spending Limit Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={spendingLimitAmount}
            onChange={(e) => setSpendingLimitAmount(e.target.value)}
            placeholder="Enter spending limit amount"
          />
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowSpendingLimitModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={setSpendingLimit}
            disabled={isSettingSpendingLimit}
          >
            {isSettingSpendingLimit ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Setting Limit...</span>
              </div>
            ) : (
              "Set Limit"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showFundingModal}
        onClose={() => setShowFundingModal(false)}
        title="Fund Wallet"
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
          <label className="label">
            <span className="label-text-alt text-red-500">
              Note: The funding amount is in ETH, not USD.
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowFundingModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={handleFundWallet}
            disabled={isFunding}
          >
            {isFunding ? (
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
        isOpen={showSpendingLimitModal}
        onClose={() => setShowSpendingLimitModal(false)}
        title="Set Spending Limit"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Spending Limit Amount (USD)</span>
          </label>
          <input
            type="number"
            step="0.01"
            className="input input-bordered"
            value={spendingLimitAmount}
            onChange={(e) => setSpendingLimitAmount(e.target.value)}
            placeholder="Enter spending limit amount"
          />
          <label className="label">
            <span className="label-text-alt text-red-500">
              Note: The spending limit cannot be updated for 24 hours after
              setting it. Make sure to set a higher value than your subscription
              to avoid payment failures.
            </span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowSpendingLimitModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]`}
            onClick={setSpendingLimit}
            disabled={isSettingSpendingLimit}
          >
            {isSettingSpendingLimit ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Setting Limit...</span>
              </div>
            ) : (
              "Set Limit"
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
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter withdrawal amount"
          />
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={() => setShowWithdrawModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={withdraw}
          >
            Withdraw
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default SubscriptionPage;
