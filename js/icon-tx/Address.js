"use strict";

class Address
{
    constructor (id, address) {
        this.balance = 0;
        this.txCount = 0;
        this.id = id;
        this.address = address;
        this.networkIn = []
        this.networkOut = []
    }

    withdraw (source, tx) {
        this.balance -= tx.amount;
        this.txCount += 1;
        if (source) {
            this.networkOut [source.address] = tx;
        }
    }

    deposit (source, tx) {
        this.balance += tx.amount;
        this.txCount += 1;
        if (source) {
            this.networkIn [source.address] = tx;
        }
    }
}