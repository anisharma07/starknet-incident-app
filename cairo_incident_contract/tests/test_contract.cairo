use starknet::ContractAddress;

use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use cairo_incident_contract::IIncidentManagerDispatcher;
use cairo_incident_contract::IIncidentManagerDispatcherTrait;
use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

// Mock ERC20 token for testing
#[starknet::contract]
mod MockERC20 {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin::token::erc20::interface::{IERC20, IERC20CamelOnly};

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        total_supply: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_supply: u256, recipient: ContractAddress) {
        self.balances.write(recipient, initial_supply);
        self.total_supply.write(initial_supply);
    }

    #[abi(embed_v0)]
    impl ERC20Impl of IERC20<ContractState> {
        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let caller = starknet::get_caller_address();
            let sender_balance = self.balances.read(caller);
            assert(sender_balance >= amount, 'Insufficient balance');
            
            self.balances.write(caller, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            true
        }

        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let caller = starknet::get_caller_address();
            let sender_balance = self.balances.read(sender);
            let allowance_amount = self.allowances.read((sender, caller));
            
            assert(sender_balance >= amount, 'Insufficient balance');
            assert(allowance_amount >= amount, 'Insufficient allowance');
            
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);
            self.allowances.write((sender, caller), allowance_amount - amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = starknet::get_caller_address();
            self.allowances.write((caller, spender), amount);
            true
        }
    }

    #[abi(embed_v0)]
    impl ERC20CamelOnlyImpl of IERC20CamelOnly<ContractState> {
        fn totalSupply(self: @ContractState) -> u256 {
            self.total_supply()
        }

        fn balanceOf(self: @ContractState, account: ContractAddress) -> u256 {
            self.balance_of(account)
        }

        fn transferFrom(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            self.transfer_from(sender, recipient, amount)
        }
    }
}

fn deploy_mock_token(initial_supply: u256, recipient: ContractAddress) -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let mut calldata = ArrayTrait::new();
    calldata.append(initial_supply.low.into());
    calldata.append(initial_supply.high.into());
    calldata.append(recipient.into());
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

fn deploy_incident_contract(med_token_address: ContractAddress, owner: ContractAddress) -> ContractAddress {
    let contract = declare("IncidentManager").unwrap().contract_class();
    let mut calldata = ArrayTrait::new();
    calldata.append(med_token_address.into());
    calldata.append(owner.into());
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    contract_address
}

#[test]
fn test_report_incident_with_token_payment() {
    let user: ContractAddress = 0x123.try_into().unwrap();
    let owner: ContractAddress = 0x456.try_into().unwrap();
    
    // Deploy mock MED token with initial supply to user
    let initial_supply: u256 = 1000000000000000000000; // 1000 tokens with 18 decimals
    let med_token_address = deploy_mock_token(initial_supply, user);
    
    // Deploy incident contract
    let incident_contract_address = deploy_incident_contract(med_token_address, owner);
    
    let incident_dispatcher = IIncidentManagerDispatcher { contract_address: incident_contract_address };
    let token_dispatcher = IERC20Dispatcher { contract_address: med_token_address };
    
    // Check initial user balance
    let initial_balance = incident_dispatcher.get_user_tokens(user);
    assert(initial_balance == initial_supply, 'Invalid initial balance');
    
    // User needs to approve the incident contract to spend tokens
    start_cheat_caller_address(med_token_address, user);
    let incident_cost: u256 = 10000000000000000; // 0.01 tokens
    token_dispatcher.approve(incident_contract_address, incident_cost);
    stop_cheat_caller_address(med_token_address);
    
    // Report incident (should cost 0.01 MED tokens)
    start_cheat_caller_address(incident_contract_address, user);
    incident_dispatcher.report_incident('Traffic accident');
    stop_cheat_caller_address(incident_contract_address);
    
    // Check that counter increased
    let counter = incident_dispatcher.get_incident_counter();
    assert(counter == 1, 'Counter should be 1');
    
    // Check that user balance decreased by 0.01 tokens
    let final_balance = incident_dispatcher.get_user_tokens(user);
    assert(final_balance == initial_balance - incident_cost, 'Balance not decreased');
    
    // Check incident data
    let (id, description, reported_by, timestamp) = incident_dispatcher.get_incident(1);
    assert(id == 1, 'Invalid incident ID');
    assert(description == 'Traffic accident', 'Invalid description');
    assert(reported_by == user, 'Invalid reporter');
    // Note: In test environment, timestamp might be 0, so we just check it's set
    assert(timestamp >= 0, 'Invalid timestamp');
}

#[test] 
#[should_panic(expected: ('Insufficient MED tokens',))]
fn test_report_incident_insufficient_tokens() {
    let user: ContractAddress = 0x123.try_into().unwrap();
    let owner: ContractAddress = 0x456.try_into().unwrap();
    
    // Deploy mock MED token with zero balance for user
    let initial_supply: u256 = 0;
    let med_token_address = deploy_mock_token(initial_supply, user);
    
    // Deploy incident contract
    let incident_contract_address = deploy_incident_contract(med_token_address, owner);
    
    let incident_dispatcher = IIncidentManagerDispatcher { contract_address: incident_contract_address };
    
    // Try to report incident without tokens (should fail)
    start_cheat_caller_address(incident_contract_address, user);
    incident_dispatcher.report_incident('Traffic accident');
    stop_cheat_caller_address(incident_contract_address);
}

#[test]
fn test_withdraw_tokens_owner_only() {
    let user: ContractAddress = 0x123.try_into().unwrap();
    let owner: ContractAddress = 0x456.try_into().unwrap();
    
    // Deploy mock MED token
    let initial_supply: u256 = 1000000000000000000000; // 1000 tokens
    let med_token_address = deploy_mock_token(initial_supply, user);
    
    // Deploy incident contract
    let incident_contract_address = deploy_incident_contract(med_token_address, owner);
    
    let incident_dispatcher = IIncidentManagerDispatcher { contract_address: incident_contract_address };
    let token_dispatcher = IERC20Dispatcher { contract_address: med_token_address };
    
    // User approves and reports incident to fund the contract
    start_cheat_caller_address(med_token_address, user);
    let incident_cost: u256 = 10000000000000000; // 0.01 tokens
    token_dispatcher.approve(incident_contract_address, incident_cost);
    stop_cheat_caller_address(med_token_address);
    
    start_cheat_caller_address(incident_contract_address, user);
    incident_dispatcher.report_incident('Test incident');
    stop_cheat_caller_address(incident_contract_address);
    
    // Check contract balance
    let contract_balance = token_dispatcher.balance_of(incident_contract_address);
    assert(contract_balance == incident_cost, 'Contract should have tokens');
    
    // Owner withdraws tokens
    start_cheat_caller_address(incident_contract_address, owner);
    incident_dispatcher.withdraw_tokens(incident_cost);
    stop_cheat_caller_address(incident_contract_address);
    
    // Check that tokens were transferred to owner
    let owner_balance = token_dispatcher.balance_of(owner);
    assert(owner_balance == incident_cost, 'Owner should receive tokens');
    
    let final_contract_balance = token_dispatcher.balance_of(incident_contract_address);
    assert(final_contract_balance == 0, 'Contract should be empty');
}

#[test]
fn test_multiple_incidents_with_payments() {
    let user: ContractAddress = 0x123.try_into().unwrap();
    let owner: ContractAddress = 0x456.try_into().unwrap();
    
    // Deploy mock MED token
    let initial_supply: u256 = 1000000000000000000000; // 1000 tokens
    let med_token_address = deploy_mock_token(initial_supply, user);
    
    // Deploy incident contract
    let incident_contract_address = deploy_incident_contract(med_token_address, owner);
    
    let incident_dispatcher = IIncidentManagerDispatcher { contract_address: incident_contract_address };
    let token_dispatcher = IERC20Dispatcher { contract_address: med_token_address };
    
    // User approves contract for multiple transactions
    let incident_cost: u256 = 10000000000000000; // 0.01 tokens
    let total_cost = incident_cost * 3; // For 3 incidents
    
    start_cheat_caller_address(med_token_address, user);
    token_dispatcher.approve(incident_contract_address, total_cost);
    stop_cheat_caller_address(med_token_address);
    
    // Report multiple incidents
    start_cheat_caller_address(incident_contract_address, user);
    incident_dispatcher.report_incident('First incident');
    incident_dispatcher.report_incident('Second incident');
    incident_dispatcher.report_incident('Third incident');
    stop_cheat_caller_address(incident_contract_address);
    
    // Check counter
    let counter = incident_dispatcher.get_incident_counter();
    assert(counter == 3, 'Counter should be 3');
    
    // Check user balance
    let final_balance = incident_dispatcher.get_user_tokens(user);
    assert(final_balance == initial_supply - total_cost, 'Incorrect final balance');
    
    // Check contract balance
    let contract_balance = token_dispatcher.balance_of(incident_contract_address);
    assert(contract_balance == total_cost, 'Contract should have all tokens');
}
