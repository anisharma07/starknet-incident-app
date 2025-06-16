// Contract addresses and configuration
export const MED_TOKEN_ADDRESS =
  "0x07e0b09cc6209d4211f150944e7fc0dab7338f0a3a6199ff96d4667bef0e68bc";
export const INCIDENT_MANAGER_ADDRESS =
  "0x063bfab717bd20aa96734d7492d925a66945144a694c399e769765cc48d24754";

// Network configuration
export const STARKNET_CHAIN_ID = "0x534e5f5345504f4c4941"; // Sepolia testnet
export const RPC_URL = "https://starknet-sepolia.public.blastapi.io";

// Transaction constants
export const INCIDENT_COST = "10000000000000000"; // 0.01 tokens with 18 decimals

// Felt252 conversion helpers
export const stringToFelt252 = (str: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let felt = 0n;
  for (let i = 0; i < Math.min(bytes.length, 31); i++) {
    felt = felt * 256n + BigInt(bytes[i]);
  }
  return "0x" + felt.toString(16);
};

export const felt252ToString = (felt: string): string => {
  try {
    const num = BigInt(felt);
    let result = "";
    let temp = num;
    while (temp > 0) {
      result = String.fromCharCode(Number(temp % 256n)) + result;
      temp = temp / 256n;
    }
    return result;
  } catch {
    return felt;
  }
};
