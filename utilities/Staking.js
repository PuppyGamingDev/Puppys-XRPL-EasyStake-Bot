const guildSchema = require('../schemas/guildSchema.js');
const userSchema = require('../schemas/userSchema.js');
const mongoConnect = require('./mongo-connect.js');
const schedule = require('node-schedule');
const axios = require('axios');
const wait = require('node:timers/promises').setTimeout;
const { createStakingLogger } = require('./logger');

const Users = new Map();
let stakingLogger;

// Set to run job every Midnight of server time
const stakejob = schedule.scheduleJob('06 17 * * *', function() {
    const date = new Date().toISOString().split('T')[0];
    stakingLogger = createStakingLogger(date);
    stakingLogger.info(`Running Stake Snapshot`);
    runStake(stakingLogger);
});

// Overall functions caller
const runStake = async (stakingLogger) => {
    await mongoConnect();
    await updateUsers();
    await snapshots();
    stakingLogger.info(`Stake Snapshot Complete`);
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
        stakingLogger.info(`Processing guild: ${guild._id}`);
        const modifiers = guild.modifiers ? guild.modifiers : {};
        if (guild.currentsupply === 0) {
            stakingLogger.info(`Guild ${guild._id} has no supply left. Skipping.`);
            continue;
        }
        var rewardsleft = guild.currentsupply;
        var rewards = guild.rewards;
        const collections = guild.collections;
        if (!collections || collections.length < 1) {
            stakingLogger.info(`Guild ${guild._id} has no collections. Skipping.`);
            continue;
        }
        for (const collection of collections) {
            stakingLogger.info(`Processing collection: ${collection.name}`);
            stakingLogger.info(`Collection details: Issuer: ${collection.issuer}, Taxon: ${collection.taxon}, Reward per NFT: ${collection.pernft}`);
            
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

            if (!response.data.data || response.data.data.nfts.length < 1) {
                stakingLogger.info(`No NFTs found for collection ${collection.name}. Skipping.`);
                continue;
            }
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
            let userHoldings = {};
            for (const nft of nfts) {
                if (selling.includes(nft.NFTokenID)) continue;
                const user = Users.get(nft.Owner);
                if (user === undefined) continue;
                
                if (!userHoldings[user]) {
                    userHoldings[user] = { count: 0, expectedReward: 0 };
                }
                userHoldings[user].count++;
                
                // Check modifier for NFT and if none then use standard amount
                const thisreward = modifiers[nft.NFTokenID] ? modifiers[nft.NFTokenID].modifier * collection.pernft : collection.pernft;
                userHoldings[user].expectedReward += thisreward;
            }
            
            // Process rewards for each user
            for (const [user, data] of Object.entries(userHoldings)) {
                const actualReward = Math.min(data.expectedReward, rewardsleft);
                if (!rewards[user]) rewards[user] = 0;
                rewards[user] += actualReward;
                rewardsleft -= actualReward;
                
                stakingLogger.info(`User ${user} - Collection ${collection.name}:`);
                stakingLogger.info(`  Holdings: ${data.count} NFTs`);
                stakingLogger.info(`  Expected Reward: ${data.expectedReward}`);
                stakingLogger.info(`  Actual Reward: ${actualReward}`);
                stakingLogger.info(`  Total Rewards: ${rewards[user]}`);
                
                if (rewardsleft <= 0) break;
            }
            
            stakingLogger.info(`Rewards left after processing collection ${collection.name}: ${rewardsleft}`);
            await wait(15000);
        }
        // Save guild with updated rewards
        await guildSchema.findOneAndUpdate(
            { _id: guild._id },
            { rewards: rewards, currentsupply: rewardsleft },
            { upsert: true }
        )
        stakingLogger.info(`Guild ${guild._id} updated. New current supply: ${rewardsleft}`);
    }
    return;
};