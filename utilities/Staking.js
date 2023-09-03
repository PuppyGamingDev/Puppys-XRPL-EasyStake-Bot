// Staking script respoinsible for taking a snapshot of holders and rewarding them based on their holdings
const guildSchema = require('../schemas/guildSchema.js');
const userSchema = require('../schemas/userSchema.js');
const mongoConnect = require('./mongo-connect.js');
const schedule = require('node-schedule');
const axios = require('axios');

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
        var rewards = guild.rewards;
        const collections = guild.collections;
        if (!collections || collections.length < 1) continue;
        for (const collection of collections) {
            // Axios request to xrpl.services API for holder snapshot
            const response = await axios.get(`https://api.xrpldata.com/api/v1/xls20-nfts/issuer/${collection.issuer}/taxon/${collection.taxon}`)
            if (!response.data.data || response.data.data.nfts.length < 1) continue;
            const nfts = response.data.data.nfts;
            // Iterate over NFTs returned and reward holder (if user has linked) with the amount set per NFT for that collection
            for (const nft of nfts) {
                const user = Users.get(nft.Owner);
                if (user === undefined) continue;
                if (!rewards[user]) rewards[user] = collection.pernft;
                else rewards[user] += collection.pernft;
            }
        }
        // Save guild with updated rewards
        await guildSchema.findOneAndUpdate(
            { _id: guild._id },
            { rewards: rewards },
            { upsert: true }
        )
    }
    return;
};