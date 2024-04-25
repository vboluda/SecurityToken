// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "hardhat/console.sol";

/**
    CONTRACT util STO
    Utility to take track of earnings
 */
contract ST_crypt is Ownable, ERC20{
    uint256 public totalReceived;
    address public defaultRecipient;
    mapping(address => uint256) public spent; // holder address => currently spent
    mapping(address => bool) public exclusions; //Pool contract address => boolean

    event receivedEvent(uint256 amount,uint256 totalSent);
    event recalculatePaid(address account1, address account2, uint256 amount1, uint256 amount2);
    event withdrawEvent(address account, uint256 amount);

    error alreadyExcluded(address excluded);
    error alreadyNotExcluded(address notExcluded);
    error notAllowedExlussion(address excluded);
    error addressHasBalance(address account);
    error addressNotContract(address account);
    error cannotTransferFromExcluded(address account);
    
    constructor(string memory name_, string memory symbol_, uint256 initialSupply, address _defaultRecipient) 
    ERC20(name_,symbol_) Ownable(msg.sender){
         _mint(msg.sender, initialSupply);
         defaultRecipient = _defaultRecipient;
    }

    function updateExclusion(address _excludedAddress, bool _isExcluded) external onlyOwner{
        if(_isExcluded && exclusions[_excludedAddress]){
            revert alreadyExcluded(_excludedAddress);
        } else if(!_isExcluded && !exclusions[_excludedAddress]){
            revert alreadyNotExcluded(_excludedAddress);
        }else{
            if(_excludedAddress == address(this) || _excludedAddress == owner() || _excludedAddress == address(0)){
                revert notAllowedExlussion(_excludedAddress);
            }
            // A contract with balance cannot be excluded. 
            // This is to avoid a situation where a contract is excluded and the balance is lost
            if(_isExcluded && balanceOf(_excludedAddress)>0){
                revert addressHasBalance(_excludedAddress);
            }
            // This mechanism is intended for Pool contracts, so we need to check if the address is a contract
            if(!_isContract(_excludedAddress)){
                revert addressNotContract(_excludedAddress);
            }
            exclusions[_excludedAddress] = _isExcluded;
        }
    }

    function isExcluded(address account) public view returns(bool){
        return exclusions[account];
    }

    function changeDefaultRecipient(address _defaultRecipient) external onlyOwner{
        defaultRecipient = _defaultRecipient;
    }


    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool){
        require(balanceOf(from) >= amount,"Amount exceeds balance");

        uint256 fromBalance=balanceOf(from) - amount; 
        uint256 toBalance=balanceOf(to) + amount;

        (uint256 amount1, uint256 amount2) = _recalculateTransfer(from, to, fromBalance, toBalance);

        address _from = from;
        if(isExcluded(_from)){
            _from = defaultRecipient;
        }

        address _to = to;
        if(isExcluded(_to)){
            _to = defaultRecipient;
        }

        _transferFunds(_from, amount1, _to, amount2);

        return super.transferFrom(from,to,amount);
    }


    function transfer(address to, uint256 amount) public override returns (bool){
        require(balanceOf(msg.sender) >= amount,"Amount exceeds balance");
        uint256 fromBalance=balanceOf(msg.sender) - amount; 
        uint256 toBalance=balanceOf(to) + amount;

        (uint256 amount1, uint256 amount2) = _recalculateTransfer(msg.sender, to, fromBalance, toBalance);

        address _from = msg.sender;
        if(isExcluded(_from)){
            _from = defaultRecipient;
        }

        address _to = to;
        if(isExcluded(_to)){
            _to = defaultRecipient;
        }

        _transferFunds(_from, amount1, _to, amount2);
      
        return super.transfer(to,amount);
    }

    function withdraw() external{
        uint256 amountToPay=_calculatePaid(msg.sender);
        spent[msg.sender] = balanceOf(msg.sender) * totalReceived / totalSupply();
        
        if(amountToPay>0){
            payable(msg.sender).transfer(amountToPay);
        }        

        emit withdrawEvent(msg.sender, amountToPay);
    } 

    receive() external payable { 
        //console.log("received: %i",msg.value);
        //console.log("BALANCE: %i",address(this).balance);
        totalReceived += msg.value;
        emit receivedEvent(msg.value,totalReceived);
    }

    function _calculatePaid(address account) internal view returns(uint256) {
        // Excluded accounts do not receive payments
        if(exclusions[account]){
            return 0;
        }
        uint256 amountToPay=balanceOf(account) * totalReceived / totalSupply();

        amountToPay -= spent[account];

        return amountToPay;
    }

     function _recalculateTransfer(
        address account1, 
        address account2,
        uint256 newAmount1,
        uint256 newAmount2
        ) internal 
    returns(uint256 amount1,uint256 amount2){
        amount1 = _calculatePaid(account1);
        amount2 = _calculatePaid(account2);

        spent[account1] = newAmount1 * totalReceived / totalSupply();
        spent[account2] = newAmount2 * totalReceived / totalSupply();

        emit recalculatePaid(account1,account2, amount1, amount2);

        return (amount1,amount2);
    }

    function _isContract(address account) internal view returns(bool){
        uint32 size;
        assembly{
            size := extcodesize(account)
        }
        return size > 0;
    }

    function _transferFunds (
        address account1, 
        uint256 amount1, 
        address account2, 
        uint256 amount2
    ) internal {
        if(amount1>0) payable(account1).transfer(amount1);
        if(amount2>0) payable(account2).transfer(amount2);
    }
}