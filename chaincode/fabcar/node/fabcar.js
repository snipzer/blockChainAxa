/*
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
*/

'use strict';
const shim = require('fabric-shim');
const util = require('util');

const Http = new XMLHttpRequest();
const url='http:localhost:3000/';

let Chaincode = class {

  // The Init method is called when the Smart Contract 'fabcar' is instantiated by the blockchain network
  // Best practice is to have any Ledger initialization in separate function -- see initLedger()
  async Init(stub) {
    console.info('=========== Instantiated fabcar chaincode ===========');
    return shim.success();
  }

  // The Invoke method is called as a result of an application request to run the Smart Contract
  // 'fabcar'. The calling application program has also specified the particular smart contract
  // function to be called, with arguments
  async Invoke(stub) {
    let ret = stub.getFunctionAndParameters();
    console.info(ret);

    let method = this[ret.fcn];
    if (!method) {
      console.error('no function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }
    try {
      let payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async queryAnnulation(stub, args) {
    if (args.length != 1) {
      throw new Error('Incorrect number of arguments. Expecting AnnulationNumber ex: ANN01');
    }
    let annulationNumber = args[0];

    let annulationAsBytes = await stub.getState(annulationNumber); //get the annulation from chaincode state
    if (!annulationAsBytes || annulationAsBytes.toString().length <= 0) {
      throw new Error(annulationNumber + ' does not exist: ');
    }
    console.log(annulationAsBytes.toString());
    return annulationAsBytes;
  }

  async initLedger(stub, args) {
    console.info('============= START : Initialize Ledger ===========');
    let annulations = [];
    annulations.push({
      flyNumber: '01',
      contracts: ["CON01", "CON02"]
    });
    annulations.push({
      flyNumber: '04',
      contracts: ["CON01", "CON02"]
    });

    for (let i = 0; i < annulations.length; i++) {
      annulations[i].docType = 'annulation';
      await stub.putState('ANN' + i, Buffer.from(JSON.stringify(annulations[i])));
      console.info('Added <--> ', annulations[i]);
    }
    console.info('============= END : Initialize Ledger ===========');
  }

  async createAnnulation(stub, args) {
    console.info('============= START : Create Annulation ===========');
    if (args.length != 3) {
      throw new Error('Incorrect number of arguments. Expecting 3');
    }

    var annulation = {
      docType: 'annulation',
      flyNumber: args[1],
      contracts: args[2]
    };

    await stub.putState(args[0], Buffer.from(JSON.stringify(annulation)));
    // send remboursement
    Http.open("POST", url, true);
    http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    Http.send({toto: "titi"});
    Http.onreadystatechange = (e) => {
      console.log(Http.responseText)
    }

    console.info('============= END : Create Annulation ===========');
  }

  async queryAllAnnulations(stub, args) {
    let startKey = 'ANN0';
    let endKey = 'ANN999';

    let iterator = await stub.getStateByRange(startKey, endKey);

    let allResults = [];
    while (true) {
      let res = await iterator.next();

      if (res.value && res.value.value.toString()) {
        let jsonRes = {};
        console.log(res.value.value.toString('utf8'));

        jsonRes.Key = res.value.key;
        try {
          jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
        } catch (err) {
          console.log(err);
          jsonRes.Record = res.value.value.toString('utf8');
        }
        allResults.push(jsonRes);
      }
      if (res.done) {
        console.log('end of data');
        await iterator.close();
        console.info(allResults);
        return Buffer.from(JSON.stringify(allResults));
      }
    }
  }

  async changeAnnulationOwner(stub, args) {
    console.info('============= START : changeAnnulationOwner ===========');
    if (args.length != 2) {
      throw new Error('Incorrect number of arguments. Expecting 2');
    }

    let annulationAsBytes = await stub.getState(args[0]);
    let annulation = JSON.parse(annulationAsBytes);
    annulation.owner = args[1];

    await stub.putState(args[0], Buffer.from(JSON.stringify(annulation)));
    console.info('============= END : changeAnnulationOwner ===========');
  }
};

shim.start(new Chaincode());
