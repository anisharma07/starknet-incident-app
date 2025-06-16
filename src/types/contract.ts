// Type definitions for Starknet contract interactions

export interface Incident {
  id: string;
  description: string;
  reporter: string;
  timestamp: number;
}

export interface ContractError {
  message: string;
  code?: string;
}

export interface TransactionResult {
  transaction_hash: string;
  status?: string;
}

export interface IncidentReportedEvent {
  id: string;
  description: string;
  reported_by: string;
  timestamp: number;
}

export type ContractAddress = string;
export type Felt252 = string;
export type U256 = string;
