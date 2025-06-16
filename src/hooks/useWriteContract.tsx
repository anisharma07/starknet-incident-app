import { useState } from "react";
import { useAccount, useContract } from "@starknet-react/core";
import { type Abi, byteArray } from "starknet";
import {
  INCIDENT_MANAGER_ADDRESS as INCIDENT_CONTRACT_ADDRESS,
  MED_TOKEN_ADDRESS,
  INCIDENT_COST,
} from "../constants/contracts";
import { INCIDENT_MANAGER_ABI } from "../abis/IncidentManager";

// Contract instance hook
export function useContractInstance() {
  const { contract } = useContract({
    abi: INCIDENT_MANAGER_ABI as Abi,
    address: INCIDENT_CONTRACT_ADDRESS as `0x${string}`,
  });

  return contract;
}

// MED Token contract instance hook
export function useMedTokenInstance() {
  const { contract } = useContract({
    abi: [
      {
        type: "function",
        name: "approve",
        inputs: [
          { name: "spender", type: "felt" },
          { name: "amount", type: "u256" },
        ],
        outputs: [{ type: "bool" }],
        state_mutability: "external",
      },
      {
        type: "function",
        name: "allowance",
        inputs: [
          { name: "owner", type: "felt" },
          { name: "spender", type: "felt" },
        ],
        outputs: [{ type: "u256" }],
        state_mutability: "view",
      },
    ] as Abi,
    address: MED_TOKEN_ADDRESS as `0x${string}`,
  });

  return contract;
}

// Approve MED tokens hook
export function useApproveMedTokens() {
  const medTokenContract = useMedTokenInstance();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{ transactionHash: string } | null>(null);

  const approveMedTokens = async (amount: string = INCIDENT_COST) => {
    if (!medTokenContract) return;
    if (!account) {
      throw new Error("Wallet account not connected");
    }

    setIsPending(true);
    setError(null);

    try {
      const calldata = [
        INCIDENT_CONTRACT_ADDRESS, // spender
        amount, // amount (low)
        "0", // amount (high) - for u256, we need low and high parts
      ];

      console.log("Sending approve MED tokens calldata:", calldata);

      // Send transaction
      const response = await account.execute({
        contractAddress: medTokenContract.address,
        entrypoint: "approve",
        calldata,
      });

      console.log("Approve MED tokens response:", response);

      setData({ transactionHash: response.transaction_hash });
      return response;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        throw err;
      }
      console.error("Unexpected error:", err);
      throw new Error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return {
    approveMedTokens,
    data,
    isPending,
    isError: !!error,
    error,
  };
}

// Report incident hook
export function useReportIncident() {
  const contract = useContractInstance();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{ transactionHash: string } | null>(null);

  const reportIncident = async (description: string) => {
    if (!contract) return;
    if (!account) {
      throw new Error("Wallet account not connected");
    }

    setIsPending(true);
    setError(null);

    try {
      // Convert description to ByteArray properly
      const descriptionByteArray = byteArray.byteArrayFromString(description);

      // Serialize ByteArray to calldata format
      const serializedByteArray = [
        descriptionByteArray.data.length.toString(),
        ...descriptionByteArray.data.map((item) => item.toString()),
        descriptionByteArray.pending_word.toString(),
        descriptionByteArray.pending_word_len.toString(),
      ];

      console.log(
        "Sending report incident with serialized ByteArray:",
        serializedByteArray
      );

      // Send transaction
      const response = await account.execute({
        contractAddress: contract.address,
        entrypoint: "report_incident",
        calldata: serializedByteArray,
      });

      console.log("Report incident response:", response);

      setData({ transactionHash: response.transaction_hash });
      return response;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        throw err;
      }
      console.error("Unexpected error:", err);
      throw new Error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return {
    reportIncident,
    data,
    isPending,
    isError: !!error,
    error,
  };
}

// Withdraw tokens hook
export function useWithdrawTokens() {
  const contract = useContractInstance();
  const { account } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{ transactionHash: string } | null>(null);

  const withdrawTokens = async (amount: string) => {
    if (!contract) return;
    if (!account) {
      throw new Error("Wallet account not connected");
    }

    setIsPending(true);
    setError(null);

    try {
      const calldata = [amount];

      console.log("Sending withdraw tokens calldata:", calldata);

      // Send transaction
      const response = await account.execute({
        contractAddress: contract.address,
        entrypoint: "withdraw_tokens",
        calldata,
      });

      console.log("Withdraw tokens response:", response);

      setData({ transactionHash: response.transaction_hash });
      return response;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        throw err;
      }
      console.error("Unexpected error:", err);
      throw new Error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return {
    withdrawTokens,
    data,
    isPending,
    isError: !!error,
    error,
  };
}

// Legacy hook for backward compatibility (deprecated)
export const useWriteContract = () => {
  const { account, isConnected } = useAccount();
  const reportIncidentHook = useReportIncident();
  const withdrawTokensHook = useWithdrawTokens();

  return {
    loading: reportIncidentHook.isPending || withdrawTokensHook.isPending,
    error:
      reportIncidentHook.error?.message ||
      withdrawTokensHook.error?.message ||
      null,
    isConnected,
    account,
    connectWallet: async () => true, // Handle via StarknetProvider
    disconnectWallet: async () => {}, // Handle via StarknetProvider
    reportIncident: reportIncidentHook.reportIncident,
    withdrawTokens: withdrawTokensHook.withdrawTokens,
  };
};
