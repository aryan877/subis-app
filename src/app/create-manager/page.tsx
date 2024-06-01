"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useEthereum } from "../../components/Context";
import ManagerFactoryArtifact from "../../../artifacts-zk/contracts/ManagerFactory.sol/ManagerFactory.json";
import SubscriptionManagerArtifact from "../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
import SubscriptionPaymasterArtifact from "../../../artifacts-zk/contracts/SubscriptionPaymaster.sol/SubscriptionPaymaster.json";
import { useRouter } from "next/navigation";
import { utils, ContractFactory, Contract } from "zksync-ethers";
import { BeatLoader } from "react-spinners";
import { Check, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { BackButton } from "../../components/BackButton";

function CreateManager() {
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [deployedPaymasterAddress, setDeployedPaymasterAddress] = useState<
    string | null
  >(null);
  const [inProgress, setInProgress] = useState(false);
  const [paymasterInProgress, setPaymasterInProgress] = useState(false);
  const [paymasterDeployed, setPaymasterDeployed] = useState(false);
  const [updatingPaymaster, setUpdatingPaymaster] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { getSigner, getProvider } = useEthereum();

  useEffect(() => {
    const listenForManagerDeployed = async () => {
      try {
        const provider = getProvider();
        if (!provider) return;

        const factoryAddress = process.env.NEXT_PUBLIC_MANAGER_FACTORY_ADDRESS;
        const factoryContract = new ethers.Contract(
          factoryAddress!,
          ManagerFactoryArtifact.abi,
          provider
        );

        const handleManagerDeployed = (owner: string, manager: string) => {
          console.log(
            `Manager deployed for owner ${owner} at address ${manager}`
          );
          setDeployedAddress(manager);
          setMessage("Subscription Manager deployed successfully!");
        };

        factoryContract.on("ManagerDeployed", handleManagerDeployed);

        return () => {
          factoryContract.off("ManagerDeployed", handleManagerDeployed);
        };
      } catch (err) {
        console.error("Error setting up event listener:", err);
        setError("Error setting up event listener. Please try again.");
      }
    };

    listenForManagerDeployed();
  }, [getProvider]);

  const deploySubscriptionManager = async () => {
    try {
      setInProgress(true);
      setError(null);
      setMessage(null);
      const signer = await getSigner();
      console.log("Signer address:", signer?.address);
      const factoryAddress = process.env.NEXT_PUBLIC_MANAGER_FACTORY_ADDRESS;
      const factoryContract = new Contract(
        factoryAddress!,
        ManagerFactoryArtifact.abi,
        signer
      );
      const salt = ethers.randomBytes(32);
      const priceFeedAddress = process.env.NEXT_PUBLIC_PRICE_FEED_ADDRESS!;
      const ownerAddress = await signer!.getAddress();
      const tx = await factoryContract.deployManager(
        salt,
        ownerAddress,
        priceFeedAddress
      );
      await tx.wait();
      console.log("Transaction completed, waiting for event...");
    } catch (err) {
      console.error("Error deploying SubscriptionManager:", err);
      setError("Failed to deploy Subscription Manager. Please try again.");
    } finally {
      setInProgress(false);
    }
  };

  const deployPaymaster = async () => {
    try {
      setPaymasterInProgress(true);
      setError(null);
      setMessage(null);

      if (!deployedAddress) {
        throw new Error("Subscription Manager address is not available.");
      }

      const signer = await getSigner();
      const provider = getProvider();

      console.log("Signer address:", signer?.address);

      const factory = new ContractFactory(
        SubscriptionPaymasterArtifact.abi,
        SubscriptionPaymasterArtifact.bytecode,
        signer
      );

      const checksummedAddress = ethers.getAddress(deployedAddress);

      const deploymentTransaction = await factory.getDeployTransaction(
        checksummedAddress,
        {
          customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          },
        }
      );

      const gasLimit = await signer!.estimateGas(deploymentTransaction);
      const gasPrice = await provider!.getGasPrice();

      const paymaster = await factory.deploy(checksummedAddress, {
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        },
        gasPrice,
        gasLimit,
      });

      await paymaster.waitForDeployment();

      const deployedPaymasterAddr = await paymaster.getAddress();
      setDeployedPaymasterAddress(deployedPaymasterAddr);
      console.log("Paymaster deployed at:", deployedPaymasterAddr);
      setPaymasterDeployed(true);
      setMessage("Paymaster deployed successfully!");
    } catch (err) {
      console.error("Error deploying Paymaster:", err);
      setError("Failed to deploy Paymaster. Please try again.");
    } finally {
      setPaymasterInProgress(false);
    }
  };

  const updatePaymaster = async () => {
    try {
      setUpdatingPaymaster(true);
      setError(null);
      setMessage(null);

      if (!deployedAddress || !deployedPaymasterAddress) {
        throw new Error(
          "Subscription Manager or Paymaster address is not available."
        );
      }

      const signer = await getSigner();
      const subscriptionManager = new Contract(
        deployedAddress,
        SubscriptionManagerArtifact.abi,
        signer
      );

      const tx = await subscriptionManager.updatePaymaster(
        deployedPaymasterAddress
      );
      await tx.wait();

      console.log("Paymaster updated successfully");
      setMessage("Paymaster updated successfully!");
    } catch (err) {
      console.error("Error updating Paymaster:", err);
      setError("Failed to update Paymaster. Please try again.");
    } finally {
      setUpdatingPaymaster(false);
    }
  };

  const isAllStepsCompleted =
    deployedAddress && deployedPaymasterAddress && message?.includes("updated");

  return (
    <div className="flex flex-col items-center p-8 space-y-8">
      <BackButton />
      <h1 className="text-4xl font-bold mb-6 text-center text-primary">
        Deploy Subscription Manager
      </h1>
      <div className="w-full max-w-xl bg-base-100 border border-base-300 rounded-lg p-6 shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]">
        <div className="mb-8">
          <p className="text-lg mb-2 text-primary flex items-center">
            <span className="mr-2">
              Step 1: Deploy Subscription Manager Contract
            </span>
            {deployedAddress && (
              <Check className="stroke-current text-success" size={24} />
            )}
          </p>
          <p className="text-base-content mb-4">
            The Subscription Manager contract handles the management of
            subscriptions, plans, and payments. Deploy this contract to get
            started.
          </p>
          <button
            className="btn btn-primary w-full shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            onClick={deploySubscriptionManager}
            disabled={inProgress}
          >
            {inProgress ? (
              <div className="flex items-center justify-center">
                <BeatLoader size={8} color="#FFFFFF" />
                <span className="ml-2">Deploying...</span>
              </div>
            ) : (
              "Deploy Subscription Manager"
            )}
          </button>
        </div>

        {deployedAddress && (
          <div className="mb-8">
            <p className="text-lg font-semibold mb-2 text-primary">
              Subscription Manager Deployed
            </p>
            <div className="bg-base-200 p-4 mb-4">
              <pre>
                <code>{deployedAddress}</code>
              </pre>
            </div>
            <div className="divider"></div>
            <p className="text-lg mb-2 text-primary flex items-center">
              <span className="mr-2">Step 2: Deploy Paymaster Contract</span>
              {deployedPaymasterAddress && (
                <Check className="stroke-current text-success" size={24} />
              )}
            </p>
            <p className="text-base-content mb-4">
              The Paymaster contract acts as a sponsor for user transactions,
              paying the gas fees on behalf of the users. Deploy this contract
              to enhance the user experience.
            </p>
            <button
              className="btn btn-accent w-full shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
              onClick={deployPaymaster}
              disabled={paymasterInProgress || paymasterDeployed}
            >
              {paymasterInProgress ? (
                <div className="flex items-center justify-center">
                  <BeatLoader size={8} color="#FFFFFF" />
                  <span className="ml-2">Deploying Paymaster...</span>
                </div>
              ) : paymasterDeployed ? (
                "Paymaster Deployed"
              ) : (
                "Deploy Paymaster"
              )}
            </button>
            {deployedPaymasterAddress && (
              <div className="mt-6">
                <p className="text-lg font-semibold mb-2 text-primary">
                  Paymaster Deployed
                </p>
                <div className="bg-base-200 p-4 mb-4">
                  <pre>
                    <code>{deployedPaymasterAddress}</code>
                  </pre>
                </div>
                <div className="divider"></div>
                <p className="text-lg mb-2 text-primary flex items-center">
                  <span className="mr-2">
                    Step 3: Update Subscription Manager with Paymaster Address
                  </span>
                  {message?.includes("updated") && (
                    <Check className="stroke-current text-success" size={24} />
                  )}
                </p>
                <p className="text-base-content mb-4">
                  To enable the Paymaster to sponsor transactions, update the
                  Subscription Manager contract with the deployed Paymaster
                  address.
                </p>
                <button
                  className="btn btn-secondary w-full shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
                  onClick={updatePaymaster}
                  disabled={updatingPaymaster}
                >
                  {updatingPaymaster ? (
                    <div className="flex items-center justify-center">
                      <BeatLoader size={8} color="#FFFFFF" />
                      <span className="ml-2">Updating...</span>
                    </div>
                  ) : (
                    "Update Paymaster"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
        {isAllStepsCompleted && (
          <div className="mt-8">
            <Link
              href="/my-managers"
              className="btn btn-primary w-full shadow-[6px_6px_0_0_#000] transition duration-300 ease-in-out hover:shadow-[8px_8px_0_0_#000]"
            >
              View Managers
            </Link>
          </div>
        )}
        {message && (
          <div className="alert alert-success shadow-lg mt-4">
            <div className="flex gap-4">
              <Check className="stroke-current flex-shrink-0 h-6 w-6" />
              <span>{message}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="alert alert-error shadow-lg mt-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="stroke-current flex-shrink-0 h-6 w-6" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateManager;
