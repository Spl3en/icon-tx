async function applicationMain ()
{
    let addressDb = new AddressDb();

    let url = 'static/json/database.json'
    console.log ("Fetching " + url + "...")
    let txData = await fetch (url, {cache: "no-cache"}).then (res => res.json());

    var downloadingElement = document.getElementById("downloading");
    downloadingElement.parentNode.removeChild(downloadingElement);

    let txDb = new TransactionDb (txData['tx'], addressDb);
    txDb.process (addressDb);

    let txGraph = new TransactionGraph();
    txGraph.run (txDb);
}
