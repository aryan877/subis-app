"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ethers } from "ethers";
import { useEthereum } from "../../../components/Context";
import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import { BackButton } from "../../../components/BackButton";
import { PlusCircle, Edit, Trash } from "lucide-react";
import { Contract } from "zksync-ethers";

interface Plan {
  id: number;
  name: string;
  feeUSD: string;
  exists: boolean;
}

function SubscriptionManagerDetails() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const [subscriptionManager, setSubscriptionManager] =
    useState<Contract | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [showCreatePlanModal, setShowCreatePlanModal] =
    useState<boolean>(false);
  const [newPlanName, setNewPlanName] = useState<string>("");
  const [newPlanFeeUSD, setNewPlanFeeUSD] = useState<string>("");
  const { getSigner, getProvider } = useEthereum();

  useEffect(() => {
    const fetchSubscriptionManagerDetails = async () => {
      try {
        const signer = await getSigner();
        const provider = getProvider();
        const subscriptionManager = new Contract(
          address,
          SubscriptionManagerArtifact.abi,
          signer
        );

        setSubscriptionManager(subscriptionManager);

        const planCount = await subscriptionManager.planCount();
        const plans: Plan[] = [];
        for (let i = 0; i < planCount; i++) {
          const plan = await subscriptionManager.plans(i);
          plans.push({
            id: i,
            name: plan.name,
            feeUSD: ethers.formatUnits(plan.feeUSD, 8),
            exists: plan.exists,
          });
        }
        setPlans(plans);

        const balance = await provider!.getBalance(address);
        setBalance(ethers.formatEther(balance));
      } catch (error) {
        console.error("Error fetching subscription manager details:", error);
      }
    };

    fetchSubscriptionManagerDetails();
  }, [address, getSigner, getProvider]);

  const createPlan = async () => {
    try {
      const signer = await getSigner();
      const subscriptionManager = new Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const feeUSD = ethers.parseUnits(newPlanFeeUSD, 8);
      const tx = await subscriptionManager.createPlan(newPlanName, feeUSD);
      await tx.wait();

      setNewPlanName("");
      setNewPlanFeeUSD("");
      setShowCreatePlanModal(false);

      // Refresh plans after creating a new one
      const planCount = await subscriptionManager.planCount();
      const updatedPlans: Plan[] = [];
      for (let i = 0; i < planCount; i++) {
        const plan = await subscriptionManager.plans(i);
        updatedPlans.push({
          id: i,
          name: plan.name,
          feeUSD: ethers.formatUnits(plan.feeUSD, 8),
          exists: plan.exists,
        });
      }
      setPlans(updatedPlans);
    } catch (error) {
      console.error("Error creating plan:", error);
    }
  };

  const updatePlan = async (
    planId: number,
    newName: string,
    newFeeUSD: string
  ) => {
    try {
      const signer = await getSigner();
      const subscriptionManager = new Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const feeUSD = ethers.parseUnits(newFeeUSD, 8);
      const tx = await subscriptionManager.updatePlan(planId, newName, feeUSD);
      await tx.wait();

      // Refresh plans after updating
      const planCount = await subscriptionManager.planCount();
      const updatedPlans: Plan[] = [];
      for (let i = 0; i < planCount; i++) {
        const plan = await subscriptionManager.plans(i);
        updatedPlans.push({
          id: i,
          name: plan.name,
          feeUSD: ethers.formatUnits(plan.feeUSD, 8),
          exists: plan.exists,
        });
      }
      setPlans(updatedPlans);
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  const deletePlan = async (planId: number) => {
    try {
      const signer = await getSigner();
      const subscriptionManager = new Contract(
        address,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.updatePlan(planId, "", 0);
      await tx.wait();

      const planCount = await subscriptionManager.planCount();
      const updatedPlans: Plan[] = [];
      for (let i = 0; i < planCount; i++) {
        const plan = await subscriptionManager.plans(i);
        updatedPlans.push({
          id: i,
          name: plan.name,
          feeUSD: ethers.formatUnits(plan.feeUSD, 8),
          exists: plan.exists,
        });
      }
      setPlans(updatedPlans);
    } catch (error) {
      console.error("Error deleting plan:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <BackButton />
      <h1 className="text-3xl font-bold mb-6">Subscription Manager Details</h1>
      {subscriptionManager ? (
        <div className="w-full max-w-4xl">
          <div className="bg-base-100 border border-base-300 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Manager Address: {address}
            </h2>
            <p className="mb-2">
              <span className="font-semibold">Balance:</span> {balance} ETH
            </p>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Subscription Plans</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreatePlanModal(true)}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Plan
              </button>
            </div>
            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-base-200 border border-base-300 rounded-lg p-4"
                  >
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <p className="mb-2">
                      <span className="font-semibold">Fee:</span> ${plan.feeUSD}
                    </p>
                    <p className="mb-4">
                      <span className="font-semibold">Status:</span>{" "}
                      {plan.exists ? (
                        <span className="text-success">Active</span>
                      ) : (
                        <span className="text-error">Inactive</span>
                      )}
                    </p>
                    <div className="flex justify-end">
                      <button
                        className="btn btn-ghost btn-sm mr-2"
                        onClick={() =>
                          updatePlan(plan.id, plan.name, plan.feeUSD)
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No subscription plans found.</p>
            )}
          </div>
        </div>
      ) : (
        <p>Loading subscription manager details...</p>
      )}

      {showCreatePlanModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create Subscription Plan</h3>
            <div className="form-control mt-6">
              <label className="label">
                <span className="label-text">Plan Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter plan name"
                className="input input-bordered"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
              />
            </div>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Plan Fee (USD)</span>
              </label>
              <input
                type="number"
                placeholder="Enter plan fee in USD"
                className="input input-bordered"
                value={newPlanFeeUSD}
                onChange={(e) => setNewPlanFeeUSD(e.target.value)}
              />
            </div>
            <div className="modal-action">
              <button
                className="btn btn-primary"
                onClick={createPlan}
                disabled={!newPlanName || !newPlanFeeUSD}
              >
                Create Plan
              </button>
              <button
                className="btn"
                onClick={() => setShowCreatePlanModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionManagerDetails;
