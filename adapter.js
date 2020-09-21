const web3 = require("web3");
const { Conflux } = require("js-conflux-sdk");
const { Requester, Validator } = require("@chainlink/external-adapter");
require("dotenv").config();

const provider = new Conflux({
  url: process.env.URL
});
const privateKey = process.env.PRIVATE_KEY;
const wallet = provider.Account({privateKey});

const sendFulfillment = async (
  address,
  dataPrefix,
  functionSelector,
  value
) => {
  const dataPrefixBz = web3.utils.hexToBytes(dataPrefix);
  const functionSelectorBz = web3.utils.hexToBytes(functionSelector);
  const valueBz = web3.utils.hexToBytes(value);
  const data = functionSelectorBz.concat(dataPrefixBz, valueBz);

  const tx = {
    to: address,
    data: web3.utils.bytesToHex(data)
  };

  return await wallet.sendTransaction(tx).confirmed();
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
  const validator = new Validator(callback, input, customParams);
  const jobRunID = validator.validated.id;
  const address = validator.validated.data.address;
  const dataPrefix = validator.validated.data.dataPrefix;
  const functionSelector = validator.validated.data.functionSelector;
  const value = validator.validated.data.value;

  const _handleResponse = tx => {
    const response = {
      data: { result: tx.hash },
      result: tx.hash,
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
