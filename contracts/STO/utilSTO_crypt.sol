// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//import "hardhat/console.sol";

/**
    CONTRACT util STO
    Utility to take track of expenses
 */
contract utilSTO_crypt is ERC20{
    uint256 public totalReceived;
    mapping(address => uint256) public spent;

    event receivedEvent(uint256 amount,uint256 totalSent);
    event recalculatePaid(address account1, address account2, uint256 amount1, uint256 amount2);
    event withdrawEvent(address account, uint256 amount);

    constructor(string memory name_, string memory symbol_, uint256 initialSupply) 
    ERC20(name_,symbol_){
         _mint(msg.sender, initialSupply);
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
        if(amount1>0)  payable(from).transfer(amount1);
        if(amount2>0)  payable(to).transfer(amount2);

        return super.transferFrom(from,to,amount);
    }


    function transfer(address to, uint256 amount) public override returns (bool){
        require(balanceOf(msg.sender) >= amount,"Amount exceeds balance");
        uint256 fromBalance=balanceOf(msg.sender) - amount; 
        uint256 toBalance=balanceOf(to) + amount;

        (uint256 amount1, uint256 amount2) = _recalculateTransfer(msg.sender, to, fromBalance, toBalance);
        if(amount1>0)  payable(msg.sender).transfer(amount1);
        if(amount2>0)  payable(to).transfer(amount2);
      

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
        totalReceived += msg.value;
        emit receivedEvent(msg.value,totalReceived);
    }

     function _calculatePaid(address account) internal view returns(uint256) {
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
}