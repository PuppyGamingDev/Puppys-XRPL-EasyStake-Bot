// Normal imports
require('dotenv/config');

// XUMM & XRPL
const { XummSdk } = require("xumm-sdk");
const xrpl = require('xrpl');
const xumm = new XummSdk(process.env.XUMMKEY, process.env.XUMMSECRET);

// Accee XUMM from other files if needed
const getXUMM = () => {
    return xumm;
};

// Access XRPL Client from other files if needed
const getXRPClient = async () => {
    const XRPLclient = new xrpl.Client(process.env.NETWORK);
    await XRPLclient.connect();
    return XRPLclient;
};

// Handle transaction for user claiming rewards
const claim = async (address, amount, currency) => {
    // Connect with XRPL Client & get rewards wallet from Seed
    const xrplclient = await getXRPClient()
    wallet = xrpl.Wallet.fromSeed(process.env.SEED)

    // Create the transaction data
    const prepared = await xrplclient.autofill({
        "TransactionType": "Payment",
        "Account": wallet.address,
        "Destination": address,
        "Memos": [
            {
                "Memo": {
                    "MemoData": Buffer.from(`Staking Rewards Claim using Puppy's XRPL EasyStake Discord Bot`).toString('hex')
                }
            }
        ]
    })
    // Add amount field based on currency type (XRP or XRPL Token)
    prepared["Amount"] = currency.name === "XRP" ?
        xrpl.xrpToDrops(amount) :
        {
            "currency": currency.code,
            "value": amount.toPrecision(15),
            "issuer": currency.issuer
        }
    // Sign & submit the transaction
    const signed = wallet.sign(prepared)
    const tx = await xrplclient.submitAndWait(signed.tx_blob)
    // Disconnect from XRPL Client and return the transaction hash
    await xrplclient.disconnect()
    if (tx.response.meta?.TransactionResult === "tesSUCCESS") return signed.hash
    return null;
}

const checkTrustline = async (amount, wallet, token) => {
    const client = await getXRPClient();
    var request = {
        command: "account_lines",
        account: wallet,
        limit: 100
    }
    var response = await client.request(request);
    if (response.status !== "success") return false
    if (response.result.lines.length < 1) return false
    var allLines = [...response.result.lines];
    var marker = response.result.marker;

    while (marker) {
        request.marker = marker;
        response = await client.request(request);
        allLines = [...allLines, ...response.result.lines];
        marker = response.result.marker;
    }
    client.disconnect();
    for (const line of allLines) {
        if (line.currency === token.hex) return true
    }
    return false
}

const isValidTransaction = async (tx) => {
    const client = await getXRPClient();
    const response = await client.request({
        id: 1,
        command: "tx",
        transaction: tx,
        binary: false,
        ledger_index:'current'
    });
    await client.disconnect();
    if (response.result?.meta?.TransactionResult === "tesSUCCESS") return true;
    else return null;
};

module.exports = { getXUMM, getXRPClient, claim, checkTrustline, isValidTransaction };