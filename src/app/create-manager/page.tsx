"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useEthereum } from "../../components/Context";
import ManagerFactoryArtifact from "../../../artifacts-zk/contracts/ManagerFactory.sol/ManagerFactory.json";

function CreateManager() {
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const { getSigner, getProvider } = useEthereum();

  useEffect(() => {
    const listenForManagerDeployed = async () => {
      try {
        const provider = getProvider();
        const factoryAddress = process.env.NEXT_PUBLIC_MANAGER_FACTORY_ADDRESS!;
        const factoryContract = new ethers.Contract(
          factoryAddress,
          ManagerFactoryArtifact.abi,
          provider
        );

        factoryContract.on("ManagerDeployed", (owner, manager) => {
          console.log(
            `Manager deployed for owner ${owner} at address ${manager}`
          );
          setDeployedAddress(manager);
        });

        return () => {
          factoryContract.off("ManagerDeployed");
        };
      } catch (err) {
        console.error("Error setting up event listener:", err);
      }
    };

    listenForManagerDeployed();
  }, [getProvider]);

  const deploySubscriptionManager = async () => {
    try {
      setInProgress(true);
      setError(null);

      const signer = await getSigner();
      console.log("Signer address:", signer?.address);

      const factoryAddress = process.env.NEXT_PUBLIC_MANAGER_FACTORY_ADDRESS;
      const factoryContract = new ethers.Contract(
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
      setError(err as Error);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <div>
      <button onClick={deploySubscriptionManager} disabled={inProgress}>
        {inProgress ? "Deploying..." : "Deploy SubscriptionManager"}
      </button>
      {deployedAddress && <p>Deployed at: {deployedAddress}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}

export default CreateManager;

// "use client";
// import { useState } from "react";
// import { useEthereum } from "../../components/Context";
// import { ContractFactory, utils } from "zksync-ethers";
// import SubscriptionManagerArtifact from "../../../../artifacts-zk/contracts/SubscriptionManager.sol/SubscriptionManager.json";
// import { ethers } from "ethers";

// function CreateManager() {
//   const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
//   const [error, setError] = useState<Error | null>(null);
//   const [inProgress, setInProgress] = useState(false);
//   const { getSigner, getProvider } = useEthereum();

//   const deploySubscriptionManager = async () => {
//     try {
//       setInProgress(true);
//       setError(null);

//       const signer = await getSigner();
//       const provider = getProvider();
//       console.log("Signer address:", signer?.address);

//       const factory = new ContractFactory(
//         SubscriptionManagerArtifact.abi,
//         SubscriptionManagerArtifact.bytecode,
//         signer
//       );

//       const deploymentTransaction = await factory.getDeployTransaction(
//         process.env.NEXT_PUBLIC_PRICE_FEED_ADDRESS!,
//         {
//           customData: {
//             gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
//           },
//         }
//       );

//       // Estimate Gas Limit
//       const gasLimit = await signer!.estimateGas(deploymentTransaction);
//       const gasPrice = await provider!.getGasPrice();

//       const subscriptionManager = await factory.deploy(
//         process.env.NEXT_PUBLIC_PRICE_FEED_ADDRESS!,
//         {
//           customData: {
//             gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
//           },
//           gasPrice,
//           gasLimit,
//         }
//       );

//       await subscriptionManager.waitForDeployment();

//       const deployedAddr = await subscriptionManager.getAddress();
//       setDeployedAddress(deployedAddr);
//       console.log("SubscriptionManager deployed at:", deployedAddr);
//     } catch (err) {
//       console.error("Error deploying SubscriptionManager:", err);
//       setError(err as Error);
//     } finally {
//       setInProgress(false);
//     }
//   };

//   return (
//     <div>
//       <button onClick={deploySubscriptionManager} disabled={inProgress}>
//         {inProgress ? "Deploying..." : "Deploy SubscriptionManager"}
//       </button>
//       {deployedAddress && <p>Deployed at: {deployedAddress}</p>}
//       {error && <p>Error: {error.message}</p>}
//     </div>
//   );
// }

// export default CreateManager;
