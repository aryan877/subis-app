import React, { useState } from "react";
import { Contract } from "zksync-ethers";
import { Plan } from "../../../../../interfaces/Plan";
import { useToast } from "../../../../context/ToastProvider";
import { types, EIP712Signer, utils } from "zksync-ethers";
import { useEthereum } from "../../../../components/Context";
import { ethers } from "ethers";
import dayjs from "dayjs";

interface PlanCardProps {
  plan: Plan;
  subscriptionManager: Contract;
  subscriptionAccount: Contract | null;
  onPlanUpdated: () => Promise<void>;
}

const UserFacingPlanCard: React.FC<PlanCardProps> = ({
  plan,
  subscriptionManager,
  subscriptionAccount,
  onPlanUpdated,
}) => {
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState<boolean>(false);
  const { getSigner, getProvider } = useEthereum();
  const { showToast } = useToast();

  const isSubscriptionActive = plan.isSubscribed && plan.isActive;
  const isSubscriptionCancelled =
    plan.isSubscribed &&
    !plan.isActive &&
    dayjs().isBefore(plan.nextPaymentTimestamp);
  const isSubscriptionExpired =
    plan.isSubscribed &&
    !plan.isActive &&
    dayjs().isAfter(plan.nextPaymentTimestamp);

  const subscribe = async () => {
    try {
      setIsSubscribing(true);
      const signer = await getSigner();
      const provider = getProvider();
      const subscriptionAccountAddress =
        await subscriptionAccount!.getAddress();

      let subscribeTx =
        await subscriptionManager!.subscribe.populateTransaction(plan.planId);
      const paymaster = await subscriptionManager!.paymaster();

      if (paymaster !== ethers.ZeroAddress) {
        const paymasterParams = utils.getPaymasterParams(paymaster, {
          type: "General",
          innerInput: new Uint8Array(),
        });

        subscribeTx = {
          ...subscribeTx,
          customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams,
          } as types.Eip712Meta,
        };
      }

      subscribeTx = {
        ...subscribeTx,
        from: subscriptionAccountAddress,
        chainId: (await provider!.getNetwork()).chainId,
        nonce: await provider!.getTransactionCount(subscriptionAccountAddress),
        type: utils.EIP712_TX_TYPE,
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

      showToast({ type: "info", message: "Subscribing to plan..." });

      const sentTx = await provider!.broadcastTransaction(
        utils.serializeEip712(subscribeTx)
      );
      await sentTx?.wait();

      showToast({
        type: "success",
        message: "Subscribed to plan successfully!",
        transactionHash: sentTx!.hash,
      });

      await onPlanUpdated();
    } catch (error) {
      console.error("Error subscribing to plan:", error);
      showToast({
        type: "error",
        message:
          "Error subscribing to plan. Ensure you have sufficient funds for the subscription amount.",
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
      const paymaster = await subscriptionManager!.paymaster();

      if (paymaster !== ethers.ZeroAddress) {
        const paymasterParams = utils.getPaymasterParams(paymaster, {
          type: "General",
          innerInput: new Uint8Array(),
        });

        unsubscribeTx = {
          ...unsubscribeTx,
          customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams,
          } as types.Eip712Meta,
        };
      }

      unsubscribeTx = {
        ...unsubscribeTx,
        from: await subscriptionAccount?.getAddress(),
        chainId: (await provider.getNetwork()).chainId,
        nonce: await provider.getTransactionCount(
          await subscriptionAccount!.getAddress()
        ),
        type: utils.EIP712_TX_TYPE,
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

      showToast({ type: "info", message: "Unsubscribing from plan..." });

      const sentTx = await provider.broadcastTransaction(
        utils.serializeEip712(unsubscribeTx)
      );
      await sentTx.wait();

      showToast({
        type: "success",
        message: "Unsubscribed from plan successfully!",
        transactionHash: sentTx.hash,
      });

      await onPlanUpdated();
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

  return (
    <div className="card bg-base-100 border border-base-300 rounded-lg shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
      <div className="card-body">
        <h3 className="card-title text-primary text-xl mb-4">{plan.name}</h3>
        <div className="flex flex-col space-y-4">
          <div>
            <p className="text-gray-700 font-semibold mb-1">Subscription Fee</p>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">${plan.feeUSD}</span>
              <span className="text-gray-500 text-sm">per month</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {plan.feeETH} ETH (converted using Chainlink price feeds)
            </p>
          </div>
          {isSubscriptionActive && (
            <div>
              <p className="text-gray-700 font-semibold mb-1">Next Payment</p>
              <p className="text-lg font-bold">{plan.nextPaymentTimestamp}</p>
            </div>
          )}
          {isSubscriptionCancelled && (
            <div>
              <p className="text-gray-700 font-semibold mb-1">
                Subscription Cancelled
              </p>
              <p className="text-lg font-bold">
                Ends on: {plan.nextPaymentTimestamp}
              </p>
            </div>
          )}
        </div>
        <div className="card-actions justify-end mt-6">
          {isSubscriptionActive && (
            <button
              className="btn btn-error shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={unsubscribe}
              disabled={isUnsubscribing}
            >
              {isUnsubscribing ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          )}
          {isSubscriptionCancelled && (
            <button
              className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={subscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? "Resuming..." : "Resume Subscription"}
            </button>
          )}
          {isSubscriptionExpired && (
            <button
              className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={subscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? "Subscribing..." : "Subscribe"}
            </button>
          )}
          {!plan.isSubscribed && (
            <button
              className="btn btn-primary shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={subscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? "Subscribing..." : "Subscribe"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFacingPlanCard;
