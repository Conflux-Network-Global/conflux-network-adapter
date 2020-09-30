const web3 = require("web3");
const { Conflux } = require("js-conflux-sdk");
const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();

const provider = new Conflux({
  url: process.env.URL,
  // logger: console, //JSON RPC call logging
});
const privateKey = process.env.PRIVATE_KEY;
const wallet = provider.Account({privateKey});
console.log("Fulfillment address: ", wallet.address);

const sendFulfillment = async (
  address,
  dataPrefix,
  functionSelector,
  value
) => {
  const dataPrefixBz = web3.utils.hexToBytes(dataPrefix);
  const functionSelectorBz = web3.utils.hexToBytes(functionSelector);
  const valueBz = web3.utils.hexToBytes(web3.utils.padLeft(web3.utils.numberToHex(value), 64));
  const data = functionSelectorBz.concat(dataPrefixBz, valueBz);

  const tx = {
    to: address,
    from: wallet.address,
    data: web3.utils.bytesToHex(data),
    storageLimit: 128,
    gas: 500000
  };

  return await wallet.sendTransaction(tx).executed();
};

const customParams = {
  // Use two sets of possible keys in case the node operator
  // is using a non-EI initiator where the primary keys are reserved.
  address: ["address", "cfxAddress"],
  dataPrefix: ["dataPrefix", "cfxDataPrefix"],
  functionSelector: ["functionSelector", "cfxFunctionSelector"],
  value: ["result", "value"]
};

const createRequest = (input, callback) => {
  // console.log(input);
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;
  const address = validator.validated.data.address;
  const dataPrefix = validator.validated.data.dataPrefix;
  const functionSelector = validator.validated.data.functionSelector;
  const value = validator.validated.data.value;

  const _handleResponse = tx => {
    // console.log(tx);
    const response = {
      data: { result: tx.transactionHash },
      result: tx.transactionHash,
      status: 200
    };
    callback(response.status, Requester.success(jobRunID, response));
  };

  const _handleError = err => {
    callback(500, Requester.errored(jobRunID, err));
  };

  sendFulfillment(address, dataPrefix, functionSelector, value)
    .then(_handleResponse)
    .catch(_handleError);
};

module.exports = { createRequest: createRequest };
