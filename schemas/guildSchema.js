// Database Schema for the Discord Server's settings
const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    collections: {
        type: Array,
    },
    token: {
        type: mongoose.Schema.Types.Mixed,
    },
    rewards: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        default: {},
    },
    currency: {
        type: mongoose.Schema.Types.Mixed,
    },
    modifiers: {
        type: mongoose.Schema.Types.Mixed,
    },
    totalsupply: {
        type: Number,
        required: true,
        default: 0,
    },
    currentsupply: {
        type: Number,
        required: true,
        default: 0,
    }

});
const name = 'guild';
module.exports = mongoose.models[name] || mongoose.model(name, guildSchema);

// Collection Object
// {
// 	name: collectionname,
// 	issuer: collectionissuer,
// 	taxon: collectiontaxon,
// 	pernft: rewardpernft
// }