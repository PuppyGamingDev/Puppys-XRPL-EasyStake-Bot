// Database Schema for the Discord Server's settings
const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    _id: {
        type: mongoose.SchemaTypes.String,
        required: true,
    },
    collections: {
        type: mongoose.SchemaTypes.Array,
    },
    token: {
        type: mongoose.SchemaTypes.Mixed,
    },
    rewards: {
        type: mongoose.SchemaTypes.Mixed,
        required: true,
        default: {},
    },
    currency: {
        type: mongoose.SchemaTypes.Mixed,
    },
    totalsupply: {
        type: mongoose.SchemaTypes.Number,
        required: true,
        default: 0,
    },
    currentsupply: {
        type: mongoose.SchemaTypes.Number,
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