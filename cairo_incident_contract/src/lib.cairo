use starknet::ContractAddress;

/// Interface for the Incident Manager contract.
/// This interface allows reporting incidents and retrieving incident data.
#[starknet::interface]
pub trait IIncidentManager<TContractState> {
    /// Report a new incident with description (requires 0.01 MED tokens).
    fn report_incident(ref self: TContractState, description: ByteArray);
    /// Retrieve incident data by ID.
    fn get_incident(self: @TContractState, id: felt252) -> (felt252, ByteArray, ContractAddress, u64);
    /// Get the current incident counter.
    fn get_incident_counter(self: @TContractState) -> felt252;
    /// Get MED token address
    fn get_user_tokens(self: @TContractState, user_address: ContractAddress) -> u256;
    /// Withdraw tokens from contract (owner only)
    fn withdraw_tokens(ref self: TContractState, amount: u256);
}

/// Contract for managing road transportation incidents.
#[starknet::contract]
mod IncidentManager {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};
    
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;

    const INCIDENT_COST: u256 = 10000000000000000; // 0.01 tokens with 18 decimals (0.01 * 10^18)

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy, event: ReentrancyGuardEvent);
    
    // Component implementations
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        incident_counter: felt252,
        incidents: Map<felt252, IncidentReported>,
        med_token_address: ContractAddress,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        reentrancy: ReentrancyGuardComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        IncidentReported: IncidentReported,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
    }

    #[derive(Drop, starknet::Event, Serde, starknet::Store)]
    pub struct IncidentReported {
        #[key]
        pub id: felt252,
        pub description: ByteArray,
        pub reported_by: ContractAddress,
        pub timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, med_token_address: ContractAddress, initial_owner: ContractAddress) {
        self.ownable.initializer(initial_owner);
        self.med_token_address.write(med_token_address);
    }

    #[abi(embed_v0)]
    impl IncidentManagerImpl of super::IIncidentManager<ContractState> {
        fn report_incident(ref self: ContractState, description: ByteArray) {
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();
              let contract_addr = get_contract_address();
    
            // Check if user has enough MED tokens
            let token_dispatcher = IERC20Dispatcher { contract_address: self.med_token_address.read() };
            let balance = token_dispatcher.balance_of(caller);
            assert(balance >= INCIDENT_COST, 'Insufficient MED tokens');
                // Check if contract has allowance to spend user's tokens
    let allowance = token_dispatcher.allowance(caller, contract_addr);
    assert(allowance >= INCIDENT_COST, 'Insufficient allowance');

            // Transfer 0.01 MED tokens from user to contract
            let contract_addr = get_contract_address();
            let success = token_dispatcher.transfer_from(caller, contract_addr, INCIDENT_COST);
            assert(success, 'MED_TOKEN_TRANSFER_FAILED');
            
            // Increment counter
            let new_id = self.incident_counter.read() + 1;
            self.incident_counter.write(new_id);

            // Create and store incident struct
            let incident = IncidentReported {
                id: new_id,
                description: description.clone(),
                reported_by: caller,
                timestamp,
            };
            self.incidents.write(new_id, incident);

            // Emit event
            self.emit(Event::IncidentReported(IncidentReported {
                id: new_id,
                description,
                reported_by: caller,
                timestamp,
            }));
        }

        fn get_incident(self: @ContractState, id: felt252) -> (felt252, ByteArray, ContractAddress, u64) {
            let incident = self.incidents.read(id);
            (incident.id, incident.description, incident.reported_by, incident.timestamp)
        }

        fn get_incident_counter(self: @ContractState) -> felt252 {
            self.incident_counter.read()
        }

        fn get_user_tokens(self: @ContractState, user_address: ContractAddress) -> u256 {
            let token_dispatcher = IERC20Dispatcher { contract_address: self.med_token_address.read() };
            token_dispatcher.balance_of(user_address)
        }

        fn withdraw_tokens(ref self: ContractState, amount: u256) {
            self.reentrancy.start();
            self.ownable.assert_only_owner();
            let owner_address = self.ownable.owner();
            let token_dispatcher = IERC20Dispatcher { contract_address: self.med_token_address.read() };
            
            // Check the contract's token balance
            let contract_balance = token_dispatcher.balance_of(get_contract_address());
            assert(contract_balance >= amount, 'Insufficient contract balance');
            
            // Transfer tokens from this contract to the owner
            let success = token_dispatcher.transfer(owner_address, amount);
            assert(success, 'MED_TOKEN_TRANSFER_FAILED');
            self.reentrancy.end();
        }
    }
}
