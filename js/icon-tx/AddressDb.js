"use strict";

class AddressDb
{
    constructor() {
        this.db = new Set()
        this.dbId = new Set()
        this.id = 0;
    }

    exists (address) {
        return (address in this.db);
    }

    create (address) {
        // console.log("Address " + address + " created.");
        var objAddress = new Address (this.id, address);
        this.db[address] = objAddress;
        this.dbId[this.id] = objAddress;
        this.id += 1;
    }

    withdraw (from, address, amount) {
        // console.log("Address " + address + " withdraw " + amount + " ICX.");
        this.db[address].withdraw(from, amount);
    }
    
    deposit (from, address, amount) {
        // console.log("Address " + address + " deposit " + amount + " ICX.");
        this.db[address].deposit(from, amount);
    }

    getByAddress (address) {
        return this.db[address];
    }

    getById (id) {
        return this.dbId[id];
    }
}