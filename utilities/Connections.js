// Normal imports
require('dotenv/config');

// XUMM & XRPL
const { XummSdk } = require("xumm-sdk");
const xrpl = require('xrpl');
const xumm = new XummSdk(process.env.XUMMKEY, process.env.XUMMSECRET);

const getXUMM = () => {
	return xumm;
};

const getXRPClient = async () => {
	const XRPLclient = new xrpl.Client(process.env.NETWORK);
	await XRPLclient.connect();
	return XRPLclient;
};

const claim = async (address, amount, currency) => {
    const xrplclient = await getXRPClient()
    wallet = xrpl.Wallet.fromSeed(process.env.SEED)
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
    prepared["Amount"] = currency.name === "XRP" ?
        xrpl.xrpToDrops(winnings.toFixed(6)) :
        {
            "currency": currency.hex,
            "value": winnings.toFixed(6).toString(),
            "issuer": currency.issuer
        }
    const signed = wallet.sign(prepared)
    const tx = await xrplclient.submitAndWait(signed.tx_blob)
    await xrplclient.disconnect()
    return signed.hash
}

module.exports = { getXUMM, getXRPClient, claim };