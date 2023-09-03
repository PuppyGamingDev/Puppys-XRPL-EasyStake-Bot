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
        xrpl.xrpToDrops(amount.toFixed(6)) :
        {
            "currency": currency.hex,
            "value": amount.toFixed(6).toString(),
            "issuer": currency.issuer
        }
    // Sign & submit the transaction
    const signed = wallet.sign(prepared)
    const tx = await xrplclient.submitAndWait(signed.tx_blob)
    // Disconnect from XRPL Client and return the transaction hash
    await xrplclient.disconnect()
    return signed.hash
}

module.exports = { getXUMM, getXRPClient, claim };