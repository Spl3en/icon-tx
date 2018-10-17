"use strict";

const DEFAULT_TX_PER_TICK = 10;
var txGraph = null;

const sleep = (milliseconds) => {
  return new Promise (resolve => setTimeout (resolve, milliseconds))
}

function togglePause () {
    txGraph.togglePause();
}

function clickBackward () {
    txGraph.clickBackward();
}

function clickForward () {
    txGraph.clickForward();
}

function progressBarOnClick (width, position)
{
    var percent = (position / width * 100.0).toFixed(2);
    txGraph.goalPercent = percent;
}

function showNodeTransactions (nodeId)
{
    txGraph.showNodeTransactions (nodeId);
}

function hideNodeTransactions (nodeId)
{
    txGraph.hideNodeTransactions (nodeId);
}

function updateInformationNode (node)
{
    txGraph.updateInformationNode (node);
}

function updateShowTxLinkUi (node)
{
    txGraph.updateShowTxLinkUi (node);
}

function searchDo (button)
{
    txGraph.searchDo (document.getElementById('searchbar').value);
}

class TransactionGraph
{
    constructor()
    {
        this.logic = new TransactionGraphLogicProcessor();
        this.graphic = new TransactionGraphGraphicProcessor();
        this.goalPercent = 0;
        this.txPerTick = DEFAULT_TX_PER_TICK;
        txGraph = this;
    }

    searchDo (address)
    {
        var node = this.txDb.addressDb.getByAddress (address);
        
        if (node) {
            this.graphic.highlightNode (node);
        }
    }

    updateInformationNode (node, tick)
    {
        this.nodeDisplayed = node;

        var information = 
            'Balance : ' + node.balance + ' ICX'
        +   '<br>'
        +   'Transactions Count : ' + node.txCount
        +   '<br>';

        // console.log('Single click on node: ' + node.id);

        document.getElementById ('nodeinfo').innerHTML = information;
    }

    updateShowTxLinkUi (node)
    {
        document.getElementById ('nodeTracker').innerHTML = '<a href="http://tracker.icon.foundation/address/' + node.address + '">' + node.address + '</a>';

        if (!node.networkDisplayed) {
            document.getElementById ('showtxlinks').innerHTML = '<a id="toggleTxLinksShow" onclick="showNodeTransactions(' + node.id + ')">Show Transactions</a>';
        } else {
            document.getElementById ('showtxlinks').innerHTML = '<a id="toggleTxLinksShow" onclick="hideNodeTransactions(' + node.id + ')">Hide Transactions</a>';
        }
    }

    showNodeTransactions (nodeId)
    {
        var node = this.txDb.addressDb.getById (nodeId);
        node.networkDisplayed = true;

        for (let [key, tx] of Object.entries(node.networkOut)) {
            this.graphic.displayLink (tx, false, 0xff000080);
        }

        for (let [key, tx] of Object.entries(node.networkIn)) {
            this.graphic.displayLink (tx, false, 0x00aa0080);
        }

        this.updateShowTxLinkUi (node);
    }

    hideNodeTransactions (nodeId)
    {
        var node = this.txDb.addressDb.getById (nodeId);
        node.networkDisplayed = false;

        for (let [key, tx] of Object.entries(node.networkOut)) {
            this.graphic.removeLink (tx, true);
        }
        for (let [key, tx] of Object.entries(node.networkIn)) {
            this.graphic.removeLink (tx, true);
        }

        this.updateShowTxLinkUi (node);
    }

    togglePause ()
    {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pauseButton').innerHTML = '<i class="fa fa-play"></i>';
        } else {
            document.getElementById('pauseButton').innerHTML = '<i class="fa fa-pause"></i>';
        }
    }

    clickForward ()
    {
        this.txPerTick *= 2;

        if (this.txPerTick >= 40) {
            this.txPerTick = 40;
        }
    }

    clickBackward ()
    {
        if (this.txPerTick <= 1) {
            this.txPerTick = 1;
            return;
        }

        this.txPerTick = Math.round (this.txPerTick / 2);
    }

    updateUI (tx, percent, totalTx)
    {
        if (tx.timestamp) {
            document.getElementById ('timestamp').innerHTML = tx.timestamp.replace("T", " ").substring(0, tx.timestamp.indexOf('.'));
        }

        document.getElementById ('progress').innerHTML = percent + " %";
        document.getElementById ('progressBar').style.width = percent + '%';
        document.getElementById ('totalTx').innerHTML = totalTx;
        document.getElementById ('txPerTick').innerHTML = this.txPerTick + ' tx/tick';

        // Update node displayed
        if (this.nodeDisplayed 
            &&  ((tx.from && tx.from.id == this.nodeDisplayed.id)
              || (tx.to   && tx.to.id == this.nodeDisplayed.id))
        ) {
            this.updateInformationNode (this.nodeDisplayed);
        }
    }

    async run (txDb)
    {
        var diffSum = 0;
        this.txDb = txDb;

        for (var id = 0; id < txDb.length; id++)
        {
            var isFastForwarding = (parseFloat(percent) < parseFloat(txGraph.goalPercent));

            while (this.isPaused) {
                await sleep (1);
            }

            var percent = (id / txDb.length * 100.0).toFixed(2);

            {
                // Process next tx
                var tx = txDb.getTxId (id);
                this.process (tx, isFastForwarding);
                this.updateUI (tx, percent, id);
            }

            var nextTx = txDb.getTxId (id + 1);

            // TODO Sync timestamp with sleep time
            // diffSum += Date.parse(nextTx.timestamp) - Date.parse(tx.timestamp);
            if ((id % this.txPerTick) == 0)
            {
                // Don't sleep if we're fastforwarding
                if (!isFastForwarding) {
                    await sleep (15); // 60 tps ideally
                }
            }
        }
    }

    process (tx, isFastForwarding)
    {
        this.logic.process (tx);
        this.graphic.process (tx, isFastForwarding);
    }
}
