"use strict";

class TransactionDb
{
    constructor(txData, addressDb) {
        this.dbIndex = []
        this.dbHash = []
        this.raw = txData;
        this.id = 0;
        this.addressDb = addressDb;
    }

    process (addressDb)
    {
        for (let txid in this.raw)
        {
            let tx = this.raw[txid]
            let fromAddr = tx["fromAddr"];
            let toAddr = tx["toAddr"];
            let amount = parseFloat(tx["amount"]);
            let txHash = tx["txHash"];
            let timestamp = tx["createDate"];

            // Withdraw from "from"
            if (fromAddr != null)
            {
                if (!addressDb.exists(fromAddr)) {
                    // throw "Cannot withdraw from unknown address : " + fromAddr;
                    console.log("Cannot withdraw from unknown address : " + fromAddr);
                }
                // addressDb.withdraw(fromAddr, amount)
            }

            // Deposit to "to"
            if (toAddr != null)
            {
                if (!addressDb.exists(toAddr)) {
                    addressDb.create(toAddr);
                }
                // addressDb.deposit(toAddr, amount);
            }

            // Successfull tx
            this.createTx (txHash, addressDb.getByAddress(fromAddr), addressDb.getByAddress(toAddr), timestamp, amount);
        }
    }

    createTx (txHash, from, to, timestamp, amount) {
        var tx = new Transaction (from, to, timestamp, amount);
        this.dbHash[txHash] = tx;
        this.dbIndex[this.id] = tx;
        this.id += 1;
    }

    getTxId (id) {
        return this.dbIndex[id];
    }

    getTxHash (hash) {
        return this.dbHash[hash];
    }

    get length () {
        return this.dbIndex.length;
    }
}
