// Staking script respoinsible for taking a snapshot of holders and rewarding them based on their holdings
const guildSchema = require('../schemas/guildSchema.js');
const userSchema = require('../schemas/userSchema.js');
const mongoConnect = require('./mongo-connect.js');
const schedule = require('node-schedule');
const axios = require('axios');
const wait = require('node:timers/promises').setTimeout

const Users = new Map();

// Set to run job every Midnight of server time
const stakejob = schedule.scheduleJob('00 00 * * *', function() {
    console.log(`Running Stake Snapshot`)
    runStake();
});

// Overall functions caller
const runStake = async () => {
    await mongoConnect();
    await updateUsers();
    await snapshots();
    console.log(`Stake Snapshot Complete`);
}

// Update Users Map for referencing wallet addresses to reward users
const updateUsers = async () => {
    const users = await userSchema.find();
    if (!users || users.length < 1) return;
    for (const user of users) {
        Users.set(user.wallet, user._id);
    }
    return;
};

// Get holder snapshot and reward users
const snapshots = async () => {
    const guilds = await guildSchema.find();
    if (!guilds || guilds.length < 1) return;
    for (const guild of guilds) {
        const modifiers = guild.modifiers ? guild.modifiers : {};
        if (guild.currentsupply === 0) continue;
        var rewardsleft = guild.currentsupply;
        var rewards = guild.rewards;
        const collections = guild.collections;
        if (!collections || collections.length < 1) continue;
        for (const collection of collections) {
            // Axios request to xrpl.services API for holder snapshot
            var url = "";
            var offerURL = ""
            if (collection.taxon === "none") {
                url = `https://api.xrpldata.com/api/v1/xls20-nfts/issuer/${collection.issuer}`;
                offerURL = `https://api.xrpldata.com/api/v1/xls20-nfts/offers/issuer/${collection.issuer}`
            } else {
                url = `https://api.xrpldata.com/api/v1/xls20-nfts/issuer/${collection.issuer}/taxon/${collection.taxon}`
                offerURL = `https://api.xrpldata.com/api/v1/xls20-nfts/offers/issuer/${collection.issuer}/taxon/${collection.taxon}`
            }
            const response = await axios.get(url);

            if (!response.data.data || response.data.data.nfts.length < 1) continue;
            const nfts = response.data.data.nfts;
            const offerResponse = await axios.get(offerURL);
            var selling = [];
            const offers = offerResponse.data.data.offers;
            for (const offer of offers) {
                owner = offer.NFTokenOwner;
                for (const sell of offer.sell) {
                    if (sell.Owner === owner) {
                        selling.push(sell.NFTokenID);
                        break;
                    }
                }
            }
            // Iterate over NFTs returned and reward holder (if user has linked) with the amount set per NFT for that collection
            for (const nft of nfts) {
                if (selling.includes(nft.NFTokenID)) continue;
                const user = Users.get(nft.Owner);
                if (user === undefined) continue;
                // Check modifier for NFT and if none then use standard amount
                const thisreward = modifiers[nft.NFTokenID] ? modifiers[nft.NFTokenID].modifier * collection.pernft : collection.pernft;
                if (rewardsleft < thisreward) {
                    if (!rewards[user]) rewards[user] = rewardsleft;
                    else rewards[user] += rewardsleft;
                    rewardsleft = 0;
                    break;
                }
                if (!rewards[user]) rewards[user] = thisreward;
                else rewards[user] += thisreward;
                rewardsleft -= thisreward;
            }
            await wait(15000);
        }
        // Save guild with updated rewards
        await guildSchema.findOneAndUpdate(
            { _id: guild._id },
            { rewards: rewards, currentsupply: rewardsleft },
            { upsert: true }
        )
    }
    return;
};