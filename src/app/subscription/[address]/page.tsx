"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { Contract, types, EIP712Signer, utils } from "zksync-ethers";
import { useEthereum } from "../../../components/Context";
import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import AAFactoryArtifact from "../../../../artifacts-zk/contracts/AAFactory.sol/AAFactory.json";
import SubscriptionAccountArtifact from "../../../../artifacts-zk/contracts/SubscriptionAccount.sol/SubscriptionAccount.json";
import { BackButton } from "../../../components/BackButton";
import { BeatLoader } from "react-spinners";
import { useToast } from "../../../context/ToastProvider";
import { Plan } from "../../../../interfaces/Plan";
import { Modal } from "../../../components/Modal";
import { Copy } from "lucide-react";

function SubscriptionPage() {
  const params = useParams<{ address: string }>();
  const managerAddress = params.address;
  const [subscriptionManager, setSubscriptionManager] =
    useState<Contract | null>(null);
  const [subscriptionAccount, setSubscriptionAccount] =
    useState<Contract | null>(null);
  const [subscriptionAccountAddress, setSubscriptionAccountAddress] = useState<
    string | null
  >(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState<boolean>(false);
  const [isStartingSubscription, setIsStartingSubscription] =
    useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isSettingSpendingLimit, setIsSettingSpendingLimit] =
    useState<boolean>(false);
  const [isUpdatingSpendingLimit, setIsUpdatingSpendingLimit] =
    useState<boolean>(false);
  const [spendingLimitAmount, setSpendingLimitAmount] = useState<string>("");
  const [signerAddress, setSignerAddress] = useState<string>("");
  const [isPaymasterEnabled, setIsPaymasterEnabled] = useState<boolean>(false);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showSpendingLimitModal, setShowSpendingLimitModal] =
    useState<boolean>(false);
  const [showUpdateSpendingLimitModal, setShowUpdateSpendingLimitModal] =
    useState<boolean>(false);
  const [subscriptionAccountBalance, setSubscriptionAccountBalance] =
    useState<string>("0");
  const [paymasterAddress, setPaymasterAddress] = useState<string>("");
  const { getSigner, getProvider } = useEthereum();
  const { showToast } = useToast();

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

        const paymaster = await subscriptionManager.paymaster();
        setIsPaymasterEnabled(paymaster !== ethers.ZeroAddress);
        setPaymasterAddress(paymaster);
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
          const balance = await provider!.getBalance(address);
          setSubscriptionAccountBalance(ethers.formatEther(balance));
        }

        await fetchPlans(subscriptionManager);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [managerAddress, getSigner]);

  const fetchPlans = async (subscriptionManager: Contract) => {
    try {
      const livePlans: Plan[] = await subscriptionManager.getLivePlans();
      const updatedPlans: Plan[] = await Promise.all(
        livePlans.map(async (plan, index) => ({
          id: index,
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
            await subscriptionManager.getSubscriberCount(index)
          ),
        }))
      );
      setPlans(updatedPlans);
      await checkSubscriptionStatus(subscriptionManager);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const checkSubscriptionStatus = async (subscriptionManager: Contract) => {
    try {
      const isSubscribed = await subscriptionManager.isSubscriptionActive(
        signerAddress
      );
      if (isSubscribed) {
        const planId = await subscriptionManager.getSubscriberPlan(
          signerAddress
        );
        const plan = plans.find((plan) => plan.id === planId);
        if (plan) {
          setSelectedPlan(plan);
        }
      }
    } catch (error) {
      console.error("Error checking subscription status:", error);
    }
  };

  const deploySubscriptionAccount = async () => {
    try {
      setIsDeploying(true);
      const signer = await getSigner();
      const aaFactory = new Contract(
        process.env.NEXT_PUBLIC_AA_FACTORY_ADDRESS!,
        AAFactoryArtifact.abi,
        signer!
      );

      const salt = ethers.id(signerAddress);
      const tx = await aaFactory.deployAccount(
        salt,
        signerAddress,
        managerAddress
      );

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
        signer!
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

  const fundWallet = async () => {
    try {
      setIsFunding(true);
      const signer = await getSigner();
      const tx = await signer!.sendTransaction({
        to: subscriptionAccountAddress!,
        value: ethers.parseEther("1"),
      });

      showToast({
        type: "info",
        message: "Funding wallet...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Wallet funded successfully!",
        transactionHash: tx.hash,
      });
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

  const subscribe = async () => {
    try {
      setIsSubscribing(true);
      const signer = await getSigner();
      const provider = getProvider();
      const subscriptionAccountAddress =
        await subscriptionAccount!.getAddress();

      let subscribeTx =
        await subscriptionManager!.subscribe.populateTransaction(
          selectedPlan!.id
        );

      const paymasterParams = isPaymasterEnabled
        ? utils.getPaymasterParams(await subscriptionManager!.paymaster(), {
            type: "General",
            innerInput: new Uint8Array(),
          })
        : undefined;

      subscribeTx = {
        ...subscribeTx,
        from: subscriptionAccountAddress,
        chainId: (await provider!.getNetwork()).chainId,
        nonce: await provider!.getTransactionCount(subscriptionAccountAddress),
        type: utils.EIP712_TX_TYPE,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          ...(paymasterParams && { paymasterParams }),
        } as types.Eip712Meta,
        value: ethers.getBigInt(0),
      };

      subscribeTx.gasPrice = await provider!.getGasPrice();
      subscribeTx.gasLimit = await provider!.estimateGas(subscribeTx);

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(subscribeTx.chainId)
      );
      const signedTx = await eip712Signer.sign(subscribeTx);

      subscribeTx.customData = {
        ...subscribeTx.customData,
        customSignature: signedTx,
      };

      showToast({
        type: "info",
        message: "Subscribing to plan...",
      });

      const sentTx = await provider!.broadcastTransaction(
        utils.serializeEip712(subscribeTx)
      );

      await sentTx?.wait();

      showToast({
        type: "success",
        message: "Subscribed to plan successfully!",
        transactionHash: sentTx!.hash,
      });

      await fetchPlans(subscriptionManager!);
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      showToast({
        type: "error",
        message: "Error subscribing to plan. Please try again.",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setIsUnsubscribing(true);
      const signer = await getSigner();
      const provider = getProvider()!;

      let unsubscribeTx =
        await subscriptionManager!.unsubscribe.populateTransaction();

      const paymasterParams = isPaymasterEnabled
        ? utils.getPaymasterParams(await subscriptionManager!.paymaster(), {
            type: "General",
            innerInput: new Uint8Array(),
          })
        : undefined;

      unsubscribeTx = {
        ...unsubscribeTx,
        from: subscriptionAccountAddress!,
        chainId: (await provider.getNetwork()).chainId,
        nonce: await provider.getTransactionCount(subscriptionAccountAddress!),
        type: utils.EIP712_TX_TYPE,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          ...(paymasterParams && { paymasterParams }),
        } as types.Eip712Meta,
        value: ethers.getBigInt(0),
      };

      unsubscribeTx.gasPrice = await provider.getGasPrice();
      unsubscribeTx.gasLimit = await provider.estimateGas(unsubscribeTx);

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(unsubscribeTx.chainId)
      );
      const signedTx = await eip712Signer.sign(unsubscribeTx);

      unsubscribeTx.customData = {
        ...unsubscribeTx.customData,
        customSignature: signedTx,
      };

      showToast({
        type: "info",
        message: "Unsubscribing from plan...",
      });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(unsubscribeTx)
      );

      await sentTx.wait();

      showToast({
        type: "success",
        message: "Unsubscribed from plan successfully!",
        transactionHash: sentTx.hash,
      });

      await fetchPlans(subscriptionManager!);
    } catch (error) {
      console.error("Error unsubscribing from plan:", error);
      showToast({
        type: "error",
        message: "Error unsubscribing from plan. Please try again.",
      });
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const startSubscription = async () => {
    try {
      setIsStartingSubscription(true);
      const signer = await getSigner();
      const provider = getProvider()!;

      let startSubscriptionTx =
        await subscriptionManager!.startSubscription.populateTransaction(
          selectedPlan!.id
        );

      const paymasterParams = isPaymasterEnabled
        ? utils.getPaymasterParams(await subscriptionManager!.paymaster(), {
            type: "General",
            innerInput: new Uint8Array(),
          })
        : undefined;

      startSubscriptionTx = {
        ...startSubscriptionTx,
        from: subscriptionAccountAddress!,
        chainId: (await provider.getNetwork()).chainId,
        nonce: await provider.getTransactionCount(subscriptionAccountAddress!),
        type: utils.EIP712_TX_TYPE,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          ...(paymasterParams && { paymasterParams }),
        } as types.Eip712Meta,
        value: ethers.getBigInt(0),
      };

      startSubscriptionTx.gasPrice = await provider.getGasPrice();
      startSubscriptionTx.gasLimit = await provider.estimateGas(
        startSubscriptionTx
      );

      const eip712Signer = new EIP712Signer(
        signer!,
        Number(startSubscriptionTx.chainId)
      );
      const signedTx = await eip712Signer.sign(startSubscriptionTx);

      startSubscriptionTx.customData = {
        ...startSubscriptionTx.customData,
        customSignature: signedTx,
      };

      showToast({
        type: "info",
        message: "Starting subscription...",
      });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(startSubscriptionTx)
      );

      await sentTx.wait();

      showToast({
        type: "success",
        message: "Subscription started successfully!",
        transactionHash: sentTx.hash,
      });

      await fetchPlans(subscriptionManager!);
    } catch (error) {
      console.error("Error starting subscription:", error);
      showToast({
        type: "error",
        message: "Error starting subscription. Please try again.",
      });
    } finally {
      setIsStartingSubscription(false);
    }
  };

  const setSpendingLimit = async () => {
    try {
      setIsSettingSpendingLimit(true);
      const signer = await getSigner();
      const tx = await subscriptionAccount!.setSpendingLimit(
        ethers.ZeroAddress,
        ethers.parseEther(spendingLimitAmount),
        signer
      );
      showToast({
        type: "info",
        message: "Setting spending limit...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Spending limit set successfully!",
        transactionHash: tx.hash,
      });

      setSpendingLimitAmount("");
      setShowSpendingLimitModal(false);
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

  const updateSpendingLimit = async () => {
    try {
      setIsUpdatingSpendingLimit(true);
      const signer = await getSigner();
      const tx = await subscriptionAccount!.setSpendingLimit(
        ethers.ZeroAddress,
        ethers.parseEther(spendingLimitAmount),
        signer
      );
      showToast({
        type: "info",
        message: "Updating spending limit...",
        transactionHash: tx.hash,
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Spending limit updated successfully!",
        transactionHash: tx.hash,
      });

      setSpendingLimitAmount("");
      setShowUpdateSpendingLimitModal(false);
    } catch (error) {
      console.error("Error updating spending limit:", error);
      showToast({
        type: "error",
        message: "Error updating spending limit. Please try again.",
      });
    } finally {
      setIsUpdatingSpendingLimit(false);
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
      <BackButton />
      <h1 className="text-4xl font-bold mb-8">Subscription Page</h1>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <BeatLoader size={12} color="#4B5563" />
        </div>
      ) : (
        <div className="w-full max-w-6xl px-4">
          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Smart Wallet</h2>
            {subscriptionAccount ? (
              <div>
                <p className="mb-2">
                  <span className="font-semibold">Subscription Account:</span>{" "}
                  {subscriptionAccountAddress
                    ? `${subscriptionAccountAddress.slice(
                        0,
                        6
                      )}...${subscriptionAccountAddress.slice(-4)}`
                    : "N/A"}
                  <button
                    className="btn btn-ghost btn-xs ml-2"
                    onClick={() =>
                      handleCopyAddress(subscriptionAccountAddress || "")
                    }
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </p>
                <p className="mb-2">
                  <span className="font-semibold">Account Balance:</span>{" "}
                  {subscriptionAccountBalance} ETH
                </p>
                <p className="mb-2">
                  <span className="font-semibold">Paymaster Address:</span>{" "}
                  {paymasterAddress
                    ? `${paymasterAddress.slice(
                        0,
                        6
                      )}...${paymasterAddress.slice(-4)}`
                    : "N/A"}
                  <button
                    className="btn btn-ghost btn-xs ml-2"
                    onClick={() => handleCopyAddress(paymasterAddress)}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </p>
                {isPaymasterEnabled ? (
                  <p className="text-green-800 bg-green-200 border border-green-600 p-4 rounded-md shadow-sm">
                    <strong>Notice:</strong> The paymaster covers gas fees{" "}
                    <strong>only</strong> for transactions interacting with the
                    Subscription Manager contract. Users must cover fees for all
                    other transactions, including subscription costs.
                  </p>
                ) : (
                  <p className="text-red-800 bg-red-200 border border-red-600 p-4 rounded-md shadow-sm">
                    <strong>Alert:</strong> No paymaster attached. Please fund
                    the subscription smart wallet account to perform
                    transactions.
                  </p>
                )}
                <div className="flex flex-col space-y-4 mt-4">
                  <button
                    className={`btn btn-primary`}
                    onClick={fundWallet}
                    disabled={isFunding}
                  >
                    Fund Wallet
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowSpendingLimitModal(true)}
                  >
                    Set Spending Limit
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowUpdateSpendingLimitModal(true)}
                  >
                    Update Spending Limit
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-4">
                  No subscription account found. Please deploy a new
                  subscription account.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowDeployModal(true)}
                >
                  Deploy Subscription Account
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Live Plans</h2>
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`card bg-base-100 border border-base-300 rounded-lg ${
                      selectedPlan?.id === plan.id
                        ? "border-primary"
                        : "cursor-pointer hover:border-primary"
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="card-body">
                      <h3 className="card-title text-primary">{plan.name}</h3>
                      <div className="flex flex-col space-y-4 mt-4">
                        <div className="flex-1">
                          <div className="text-gray-700">
                            <div className="text-sm font-medium">Fee (USD)</div>
                            <div className="text-lg font-semibold">
                              ${plan.feeUSD} per month
                            </div>
                            <div className="text-sm text-gray-500">
                              {plan.feeETH} ETH (converted using Chainlink price
                              feeds)
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-700">
                            <div className="text-sm font-medium">
                              Subscribers
                            </div>
                            <div className="text-lg font-semibold">
                              {plan.subscriberCount}{" "}
                              {plan.subscriberCount === 1
                                ? "subscriber"
                                : "subscribers"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No live plans available.</p>
            )}
          </div>

          {selectedPlan && subscriptionAccount && (
            <div className="bg-base-100 border border-base-300 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                Selected Plan: {selectedPlan.name}
              </h2>

              <div className="flex flex-col space-y-4">
                <button
                  className={`btn btn-primary`}
                  onClick={subscribe}
                  disabled={isSubscribing || !selectedPlan}
                >
                  Subscribe
                </button>
                <button
                  className={`btn btn-primary`}
                  onClick={unsubscribe}
                  disabled={isUnsubscribing}
                >
                  Unsubscribe
                </button>
                <button
                  className={`btn btn-primary`}
                  onClick={startSubscription}
                  disabled={isStartingSubscription}
                >
                  Start Subscription
                </button>
              </div>
            </div>
          )}
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
            className="btn mr-2"
            onClick={() => setShowDeployModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary`}
            onClick={deploySubscriptionAccount}
            disabled={isDeploying}
          >
            Deploy
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
            className="btn mr-2"
            onClick={() => setShowSpendingLimitModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary`}
            onClick={setSpendingLimit}
            disabled={isSettingSpendingLimit}
          >
            Set Limit
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showUpdateSpendingLimitModal}
        onClose={() => setShowUpdateSpendingLimitModal(false)}
        title="Update Spending Limit"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">New Spending Limit Amount (ETH)</span>
          </label>
          <input
            type="number"
            step="0.0001"
            className="input input-bordered"
            value={spendingLimitAmount}
            onChange={(e) => setSpendingLimitAmount(e.target.value)}
            placeholder="Enter new spending limit amount"
          />
        </div>
        <div className="flex justify-end">
          <button
            className="btn mr-2"
            onClick={() => setShowUpdateSpendingLimitModal(false)}
          >
            Cancel
          </button>
          <button
            className={`btn btn-primary`}
            onClick={updateSpendingLimit}
            disabled={isUpdatingSpendingLimit}
          >
            Update Limit
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default SubscriptionPage;
