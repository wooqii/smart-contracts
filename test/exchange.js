var async = require('async');
var assert = require('assert');
var BigNumber = require('bignumber.js');


contract('Exchange', (accounts) => {

  // CONSTANTS
  const INITIAL_OFFER_ID = 0;
  const OWNER = accounts[0];
  const NOT_OWNER = accounts[1];
  const NUM_OFFERS = 2;
  const PREMINED_NAME = "Bitcoin Token";
  const PREMINED_SYMBOL = "BTT";
  const PREMINED_PRECISION = 8;
  const PREMINED_AMOUNT = new BigNumber(Math.pow(10,28));
  const ALLOWANCE_AMOUNT = PREMINED_AMOUNT / 10;

  // GLOBALS
  let contract;
  let contractAddress;
  let etherTokenContract;
  let etherTokenAddress;
  let preminedTokenContract;
  let preminedTokenAddress;
  let testCases;
  const ETHER = new BigNumber(Math.pow(10,18));
  let lastOfferId = 0;


  before('Check accounts', (done) => {
    assert.equal(accounts.length, 10);
    done();
  });

  it('Deploy smart contract', (done) => {
    Exchange.new().then((result) => {
      contract = result;
      contractAddress = contract.address;
      return contract.lastOfferId();
    }).then((result) => {
      assert.equal(result.toNumber(), INITIAL_OFFER_ID)
      return EtherToken.new();
    }).then((result) => {
      etherTokenContract = result;
      etherTokenAddress = etherTokenContract.address;
      return PreminedToken.new(
        PREMINED_NAME, PREMINED_SYMBOL,
        PREMINED_PRECISION, PREMINED_AMOUNT, { from: OWNER }
      );
    }).then((result) => {
      preminedTokenContract = result;
      preminedTokenAddress = preminedTokenContract.address;
      return preminedTokenContract.totalSupply({ from: OWNER });
    }).then((result) => {
      assert.equal(result.toNumber(), PREMINED_AMOUNT.toNumber());
      return preminedTokenContract.balanceOf(OWNER);
    }).then((result) => {
      assert.equal(result.toNumber(), PREMINED_AMOUNT.toNumber());
      done();
    });
  });

  it('Set up test cases', (done) => {
    testCases = [];
    for (let i = 0; i < NUM_OFFERS; i++) {
      testCases.push(
        {
          sell_how_much: i + 1,
          sell_which_token: preminedTokenAddress,
          buy_how_much: 2*i + 1,
          buy_which_token: etherTokenAddress,
        }
      );
    }
    done();
  });

  it('OWNER approves exchange to hold funds of preminedTokenContract', (done) => {
    preminedTokenContract.approve(contractAddress, ALLOWANCE_AMOUNT, { from: OWNER }
    ).then((result) => {
      return preminedTokenContract.allowance(OWNER, contractAddress);
    }).then((result) => {
      assert.equal(result, ALLOWANCE_AMOUNT);
      done();
    });
  });

  it('Create one side of the orderbook', (done) => {
    async.mapSeries(
      testCases,
      (testCase, callbackMap) => {
        console.log(testCase)
        contract.offer(
          testCase.sell_how_much,
          testCase.sell_which_token,
          testCase.buy_how_much,
          testCase.buy_which_token,
          { from: OWNER }
        ).then((result) => {
          testCase.txHash = result;
          callbackMap(null, testCase);
        });
      }
      , function(err, results) {
        testCases = results;
        done();
      }
    );
  });

  it('Cancel one side of the orderbook', (done) => {
    async.mapSeries(
      testCases,
      (testCase, callbackMap) => {
        contract.offer(
          testCase.sell_how_much,
          testCase.sell_which_token,
          testCase.buy_how_much,
          testCase.buy_which_token,
          { from: OWNER }
        ).then((result) => {
          testCase.txHash = result;
          callbackMap(null, testCase);
        });
      }
      , (err, results) => {
        testCases = results;
        done();
      }
    );
  });

});