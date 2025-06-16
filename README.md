# Starknet Incident Management DApp

A decentralized application for reporting and managing incidents on the Starknet blockchain.

Meditoken Contract: https://sepolia.voyager.online/contract/0x07e0b09cc6209d4211f150944e7fc0dab7338f0a3a6199ff96d4667bef0e68bc

Incident Contract:https://sepolia.voyager.online/contract/0x063bfab717bd20aa96734d7492d925a66945144a694c399e769765cc48d24754

Deployed App:

Video Demo:

## Features

- Report incidents with MED token payment (0.01 MED)
- View incident details by ID
- Check user MED token balances
- Owner-only token withdrawal functionality
- Modern, responsive UI built with React and Tailwind CSS

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Starknet wallet (like ArgentX or Braavos)

### Installation

1. **Clone and install dependencies:**

   ```bash
   cd starknet-Incident-webapp
   npm install
   ```

2. **Install Starknet dependencies:**

   ```bash
   npm install starknet @starknet-io/get-starknet
   ```

3. **Update contract addresses:**

   Edit `src/constants/contracts.ts` and update the following:

   ```typescript
   export const INCIDENT_CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
   export const MED_TOKEN_ADDRESS = "YOUR_MED_TOKEN_ADDRESS";
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── abis/
│   ├── IncidentManager.json    # Contract ABI (JSON)
│   └── IncidentManager.ts      # Contract ABI (TypeScript)
├── components/
│   └── IncidentManager.tsx     # Main UI component
├── constants/
│   └── contracts.ts            # Contract addresses and utilities
├── hooks/
│   ├── useReadContract.tsx     # Hook for reading contract data
│   ├── useWriteContract.tsx    # Hook for writing to contract
│   └── index.ts                # Combined hooks export
├── types/
│   └── contract.ts             # TypeScript type definitions
├── App.tsx                     # Main App component
└── main.tsx                    # App entry point
```

## Contract Interface

The incident contract supports the following functions:

### Read Functions

- `get_incident(id)` - Get incident details by ID
- `get_incident_counter()` - Get total number of incidents
- `get_med_token_address()` - Get MED token contract address
- `get_user_tokens(address)` - Get user's MED token balance

### Write Functions

- `report_incident(description)` - Report a new incident (costs 0.01 MED)
- `withdraw_tokens(amount)` - Withdraw tokens (owner only)

## Usage

### Connecting Wallet

1. Click "Connect Wallet" button
2. Select your Starknet wallet (ArgentX/Braavos)
3. Approve the connection

### Reporting an Incident

1. Ensure your wallet has at least 0.01 MED tokens
2. Enter incident description
3. Click "Report Incident"
4. Confirm the transaction in your wallet

### Viewing Incidents

1. Enter an incident ID in the search field
2. Click "Get Incident" to view details

### Checking Token Balance

1. Enter a wallet address
2. Click "Check Balance" to view MED token balance

## Development

### Adding New Features

1. **Contract Functions**: Add new contract calls to the appropriate hooks in `src/hooks/`
2. **UI Components**: Extend the `IncidentManager` component or create new ones
3. **Types**: Update TypeScript types in `src/types/contract.ts`

### Testing

The hooks include error handling and loading states. Test thoroughly with:

- Different wallet states (connected/disconnected)
- Various contract interactions
- Network error scenarios

## Deployment

### Building for Production

```bash
npm run build
```

### Deploying the Contract

1. Deploy your Cairo contract to Starknet
2. Update the contract addresses in `src/constants/contracts.ts`
3. Ensure the MED token contract is also deployed and funded

## Dependencies

### Core Dependencies

- `starknet` - Starknet JavaScript SDK
- `@starknet-io/get-starknet` - Wallet connection
- `react` - UI framework
- `tailwindcss` - Styling

### Development Dependencies

- `typescript` - Type checking
- `vite` - Build tool
- `eslint` - Code linting

## Troubleshooting

### Common Issues

1. **Wallet Connection Fails**

   - Ensure you have a Starknet wallet installed
   - Check that the wallet is connected to the correct network

2. **Contract Calls Fail**

   - Verify contract addresses are correct
   - Ensure wallet has sufficient funds for gas fees
   - Check that contract is deployed on the current network

3. **Token Transfer Fails**
   - Verify user has enough MED tokens
   - Check that contract has approval to spend tokens
   - Ensure MED token contract address is correct

### Network Configuration

The app is configured for Starknet Sepolia testnet by default. To change networks:

1. Update `RPC_URL` in `src/constants/contracts.ts`
2. Update `STARKNET_CHAIN_ID` for the target network
3. Ensure your wallet is connected to the same network

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
