"use strict";

class Transaction
{
    constructor (from, to, timestamp, amount) {
        this.amount = amount;
        this.from = from;
        this.to = to;
        this.timestamp = timestamp;
    }
}