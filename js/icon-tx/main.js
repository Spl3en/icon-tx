async function applicationMain ()
{
    let addressDb = new AddressDb();

    let txData = await fetch ('/static/json/txdata.json').then(res => res.json())

    let txDb = new TransactionDb (txData, addressDb);
    txDb.process (addressDb);

    let txGraph = new TransactionGraph();
    txGraph.run (txDb);
}