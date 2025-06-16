import {
  useReadContract as useStarknetReadContract,
  useAccount,
} from "@starknet-react/core";
import { useCallback } from "react";
import { type Abi, byteArray } from "starknet";
import {
  INCIDENT_MANAGER_ADDRESS as INCIDENT_CONTRACT_ADDRESS,
  MED_TOKEN_ADDRESS,
} from "../constants/contracts";
import { INCIDENT_MANAGER_ABI } from "../abis/IncidentManager";

// Types
interface Incident {
  id: string;
  description: string;
  reporter: string;
  timestamp: number;
}

// Get incident counter hook
export function useGetIncidentCounter() {
  const {
    data: counterData,
    refetch: counterRefetch,
    isError: counterIsError,
    isLoading: counterIsLoading,
    error: counterError,
  } = useStarknetReadContract({
    functionName: "get_incident_counter",
    args: [],
    abi: INCIDENT_MANAGER_ABI as Abi,
    address: INCIDENT_CONTRACT_ADDRESS as `0x${string}`,
    watch: true,
    refetchInterval: 1000,
    enabled: true,
    retry: 3,
    retryDelay: 1000,
  });

  return {
    incidentCounter: counterData?.toString() || null,
    refetchCounter: counterRefetch,
    isError: counterIsError,
    isLoading: counterIsLoading,
    error: counterError,
  };
}

// Get MED token address hook
export function useGetMedTokenAddress() {
  const {
    data: tokenAddressData,
    refetch: tokenAddressRefetch,
    isError: tokenAddressIsError,
    isLoading: tokenAddressIsLoading,
    error: tokenAddressError,
  } = useStarknetReadContract({
    functionName: "get_med_token_address",
    args: [],
    abi: INCIDENT_MANAGER_ABI as Abi,
    address: INCIDENT_CONTRACT_ADDRESS as `0x${string}`,
    watch: false,
    enabled: true,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 0,
  });

  return {
    medTokenAddress: tokenAddressData || null,
    refetchTokenAddress: tokenAddressRefetch,
    isError: tokenAddressIsError,
    isLoading: tokenAddressIsLoading,
    error: tokenAddressError,
  };
}

// Get specific incident hook
interface UseGetIncidentProps {
  incidentId: string | undefined;
}

export function useGetIncident({ incidentId }: UseGetIncidentProps) {
  const {
    data: incidentData,
    refetch: incidentRefetch,
    isError: incidentIsError,
    isLoading: incidentIsLoading,
    error: incidentError,
  } = useStarknetReadContract({
    functionName: "get_incident",
    args: incidentId ? [incidentId] : [],
    abi: INCIDENT_MANAGER_ABI as Abi,
    address: INCIDENT_CONTRACT_ADDRESS as `0x${string}`,
    watch: false,
    enabled: !!incidentId,
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 0,
  });

  // Helper function to parse ByteArray to string
  function parseByteArrayToString(byteArrayData: unknown): string {
    try {
      // If it's already a string, return it
      if (typeof byteArrayData === "string") {
        return byteArrayData;
      }

      // If it's a ByteArray object with the expected structure
      if (byteArrayData && typeof byteArrayData === "object") {
        // Try using the byteArray utility from starknet.js
        return byteArray.stringFromByteArray(
          byteArrayData as {
            data: bigint[];
            pending_word: bigint;
            pending_word_len: number;
          }
        );
      }

      // Fallback: convert to string
      return String(byteArrayData) || "";
    } catch (error) {
      console.error("Error parsing ByteArray:", error);
      return "Error parsing description";
    }
  }

  // Helper function to format contract address
  function formatContractAddress(address: unknown): string {
    if (!address) return "Unknown";

    const addressStr = address.toString();

    // If it's already formatted with 0x, return as is
    if (addressStr.startsWith("0x")) {
      return addressStr;
    }

    // If it's a numeric string, add 0x prefix
    if (/^\d+$/.test(addressStr)) {
      return "0x" + BigInt(addressStr).toString(16).padStart(64, "0");
    }

    return addressStr;
  }

  const incident: Incident | null = incidentData
    ? {
        id: incidentData[0].toString(),
        description: parseByteArrayToString(incidentData[1]),
        reporter: formatContractAddress(incidentData[2]),
        timestamp: Number(incidentData[3]),
      }
    : null;

  // Debug logging
  if (incidentData) {
    console.log("Raw incident data:", incidentData);
    console.log("Parsed incident:", incident);
  }

  return {
    incident,
    refetchIncident: incidentRefetch,
    isError: incidentIsError,
    isLoading: incidentIsLoading,
    error: incidentError,
  };
}

// Get user tokens hook
interface UseGetUserTokensProps {
  accountAddress: `0x${string}` | undefined;
}

export function useGetUserTokens({ accountAddress }: UseGetUserTokensProps) {
  const {
    data: tokensData,
    refetch: tokensRefetch,
    isError: tokensIsError,
    isLoading: tokensIsLoading,
    error: tokensError,
  } = useStarknetReadContract({
    functionName: "get_user_tokens",
    args: accountAddress ? [accountAddress] : [],
    abi: INCIDENT_MANAGER_ABI as Abi,
    address: INCIDENT_CONTRACT_ADDRESS as `0x${string}`,
    watch: true,
    refetchInterval: 1000,
    enabled: !!accountAddress,
    retry: 3,
    retryDelay: 1000,
  });

  return {
    userTokens: tokensData?.toString() || null,
    refetchTokens: tokensRefetch,
    isError: tokensIsError,
    isLoading: tokensIsLoading,
    error: tokensError,
  };
}

// Get user MED token balance hook
export function useGetUserMedBalance() {
  const { address } = useAccount();

  const { data, refetch, isError, isLoading, error } = useStarknetReadContract({
    functionName: "balance_of",
    args: address ? [address] : [],
    abi: [
      {
        type: "function",
        name: "balance_of",
        inputs: [{ name: "account", type: "felt" }],
        outputs: [{ type: "u256" }],
        state_mutability: "view",
      },
    ] as Abi,
    address: MED_TOKEN_ADDRESS as `0x${string}`,
    watch: true,
    enabled: !!address,
  });

  // Convert balance from wei to MED tokens (assuming 18 decimals)
  const formatBalance = (balance: string | number | bigint) => {
    if (!balance) return "0.00";
    try {
      const balanceStr = balance.toString();
      const balanceNum = BigInt(balanceStr);
      const decimals = 18;
      const divisor = BigInt(10 ** decimals);
      const wholePart = balanceNum / divisor;
      const fractionalPart = balanceNum % divisor;
      const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
      const trimmedFractional =
        fractionalStr.substring(0, 4).replace(/0+$/, "") || "0";
      return `${wholePart}.${trimmedFractional}`;
    } catch (error) {
      console.error("Error formatting balance:", error);
      return "0.00";
    }
  };

  return {
    balance: data ? formatBalance(data) : "0.00",
    rawBalance: data,
    refetch,
    isError,
    isLoading,
    error,
    hasBalance: address && data && BigInt(data.toString()) > 0n,
  };
}

// Legacy hook for backward compatibility (deprecated)
export const useLegacyReadContract = () => {
  const counterHook = useGetIncidentCounter();
  const tokenAddressHook = useGetMedTokenAddress();

  const getIncident = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_id: string): Promise<Incident | null> => {
      // This function is now deprecated, use useGetIncident hook instead
      console.warn(
        "getIncident function is deprecated, use useGetIncident hook instead"
      );
      return null;
    },
    []
  );

  const getUserTokens = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_userAddress: string): Promise<string | null> => {
      // This function is now deprecated, use useGetUserTokens hook instead
      console.warn(
        "getUserTokens function is deprecated, use useGetUserTokens hook instead"
      );
      return null;
    },
    []
  );

  const refreshData = useCallback(async () => {
    counterHook.refetchCounter();
    tokenAddressHook.refetchTokenAddress();
  }, [counterHook, tokenAddressHook]);

  return {
    loading: counterHook.isLoading || tokenAddressHook.isLoading,
    error:
      counterHook.error?.message || tokenAddressHook.error?.message || null,
    incidentCounter: counterHook.incidentCounter,
    medTokenAddress: tokenAddressHook.medTokenAddress,
    getIncident,
    getUserTokens,
    refreshData,
  };
};
