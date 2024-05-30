"use client";
import React, { useState, useEffect } from "react";
import { Edit, Trash2, CheckCircle, Info } from "lucide-react";
import { Contract } from "zksync-ethers";
import SubscriptionManagerArtifact from "../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import { useEthereum } from "./Context";
import { BeatLoader } from "react-spinners";
import { ethers } from "ethers";
import { Plan } from "../../interfaces/Plan";
import { useToast } from "../context/ToastProvider";
import { Modal } from "./Modal";
import { Tooltip } from "./Tooltip";

interface PlanCardProps {
  plan: Plan;
  subscriptionManagerAddress: string;
  onPlanUpdated: (subscriptionManager: Contract) => Promise<void>;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  subscriptionManagerAddress,
  onPlanUpdated,
}) => {
  const [showUpdatePlanModal, setShowUpdatePlanModal] =
    useState<boolean>(false);
  const [showDeletePlanModal, setShowDeletePlanModal] =
    useState<boolean>(false);
  const [showMakePlanLiveModal, setShowMakePlanLiveModal] =
    useState<boolean>(false);
  const [updatedPlanName, setUpdatedPlanName] = useState<string>(plan.name);
  const [updatedPlanFeeUSD, setUpdatedPlanFeeUSD] = useState<string>(
    plan.feeUSD
  );
  const [transactionInProgress, setTransactionInProgress] =
    useState<boolean>(false);
  const { getSigner } = useEthereum();
  const { showToast } = useToast();
  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  useEffect(() => {
    const fetchSubscriberCount = async () => {
      const signer = await getSigner();
      const subscriptionManager = new Contract(
        subscriptionManagerAddress,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const count = await subscriptionManager.getSubscriberCount(plan.id);
      setSubscriberCount(Number(count));
    };

    fetchSubscriberCount();
  }, [getSigner, subscriptionManagerAddress, plan.id]);

  const updatePlan = async () => {
    try {
      setTransactionInProgress(true);

      const signer = await getSigner();
      const subscriptionManager = new Contract(
        subscriptionManagerAddress,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const feeUSD = ethers.parseUnits(updatedPlanFeeUSD, 8);
      const tx = await subscriptionManager.updatePlan(
        plan.id,
        updatedPlanName,
        feeUSD
      );

      showToast({
        type: "info",
        message: "Updating plan...",
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Plan updated successfully!",
        transactionHash: tx.hash,
      });

      setShowUpdatePlanModal(false);

      // Refresh plans after updating
      await onPlanUpdated(subscriptionManager);
    } catch (error) {
      console.error("Error updating plan:", error);
      showToast({
        type: "error",
        message: "Failed to update plan. Please try again.",
      });
    } finally {
      setTransactionInProgress(false);
    }
  };

  const deletePlan = async () => {
    try {
      setTransactionInProgress(true);

      const signer = await getSigner();
      const subscriptionManager = new Contract(
        subscriptionManagerAddress,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.deletePlan(plan.id);

      showToast({
        type: "info",
        message: "Deleting plan...",
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Plan deleted successfully!",
        transactionHash: tx.hash,
      });

      setShowDeletePlanModal(false);

      // Refresh plans after deleting
      await onPlanUpdated(subscriptionManager);
    } catch (error) {
      console.error("Error deleting plan:", error);
      showToast({
        type: "error",
        message: "Failed to delete plan. Please try again.",
      });
    } finally {
      setTransactionInProgress(false);
    }
  };

  const makePlanLive = async () => {
    try {
      setTransactionInProgress(true);

      const signer = await getSigner();
      const subscriptionManager = new Contract(
        subscriptionManagerAddress,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.makePlanLive(plan.id);

      showToast({
        type: "info",
        message: "Making plan live...",
      });

      await tx.wait();

      showToast({
        type: "success",
        message: "Plan is now live!",
        transactionHash: tx.hash,
      });

      setShowMakePlanLiveModal(false);

      // Refresh plans after making live
      await onPlanUpdated(subscriptionManager);
    } catch (error) {
      console.error("Error making plan live:", error);
      showToast({
        type: "error",
        message: "Failed to make plan live. Please try again.",
      });
    } finally {
      setTransactionInProgress(false);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 rounded-lg">
      <div className="card-body">
        <h3 className="card-title text-primary">{plan.name}</h3>
        <div className="flex items-center space-x-2">
          {plan.isLive ? (
            <span className="badge badge-success">Live</span>
          ) : (
            <>
              <span className="badge badge-error">Not Live</span>
              <Tooltip
                content="Non-live plans cannot collect payments. Once a plan goes live, it cannot be edited or deleted."
                position="right"
              >
                <Info className="text-gray-500 ml-1 cursor-pointer" size={16} />
              </Tooltip>
            </>
          )}
        </div>
        {!plan.isLive && (
          <button
            className="btn btn-sm btn-success mt-2"
            onClick={() => setShowMakePlanLiveModal(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Make Live
          </button>
        )}
        <div className="flex flex-col space-y-4 mt-4">
          <div className="flex-1">
            <div className="text-gray-700">
              <div className="text-sm font-medium">Fee (USD)</div>
              <div className="text-lg font-semibold">
                ${plan.feeUSD} per month
              </div>
              <div className="text-sm text-gray-500">
                {plan.feeETH} ETH (converted using Chainlink price feeds)
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-gray-700">
              <div className="text-sm font-medium">Subscribers</div>
              <div className="text-lg font-semibold">
                {Number(subscriberCount)}{" "}
                {subscriberCount === 1 ? "subscriber" : "subscribers"}
              </div>
            </div>
          </div>
        </div>
        {!plan.isLive && (
          <div className="card-actions justify-end mt-6 space-x-2">
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowUpdatePlanModal(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              className="btn btn-sm btn-error"
              onClick={() => setShowDeletePlanModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showUpdatePlanModal}
        onClose={() => setShowUpdatePlanModal(false)}
        title="Update Plan"
      >
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Plan Name</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={updatedPlanName}
            onChange={(e) => setUpdatedPlanName(e.target.value)}
          />
        </div>
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Plan Fee (USD)</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            value={updatedPlanFeeUSD}
            onChange={(e) => setUpdatedPlanFeeUSD(e.target.value)}
          />
        </div>
        <div className="modal-action">
          <button className="btn" onClick={() => setShowUpdatePlanModal(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={updatePlan}
            disabled={transactionInProgress}
          >
            {transactionInProgress ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Updating Plan...</span>
              </div>
            ) : (
              "Update"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showDeletePlanModal}
        onClose={() => setShowDeletePlanModal(false)}
        title="Delete Plan"
      >
        <p className="text-base-content mb-4">
          Are you sure you want to delete the plan "{plan.name}"?
        </p>
        <div className="modal-action">
          <button className="btn" onClick={() => setShowDeletePlanModal(false)}>
            Cancel
          </button>
          <button
            className="btn btn-error"
            onClick={deletePlan}
            disabled={transactionInProgress}
          >
            {transactionInProgress ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Deleting Plan...</span>
              </div>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={showMakePlanLiveModal}
        onClose={() => setShowMakePlanLiveModal(false)}
        title="Make Plan Live"
      >
        <p className="text-base-content mb-4">
          Are you sure you want to make the plan "{plan.name}" live?
        </p>
        <p className="text-warning bg-yellow-100 border border-yellow-500 p-3 rounded mb-4">
          Warning: Once a plan is made live, it cannot be edited or deleted.
        </p>
        <div className="modal-action">
          <button
            className="btn"
            onClick={() => setShowMakePlanLiveModal(false)}
          >
            Cancel
          </button>
          <button
            className="btn btn-success"
            onClick={makePlanLive}
            disabled={transactionInProgress}
          >
            {transactionInProgress ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Making Plan Live...</span>
              </div>
            ) : (
              "Make Live"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};
