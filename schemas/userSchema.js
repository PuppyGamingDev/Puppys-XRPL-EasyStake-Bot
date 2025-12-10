// Database Schema for the Discord User's ID/Address reference
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	_id: {
		type: String,
		required: true,
	},
	wallet: {
		type: String,
	},

});
const name = 'user';
module.exports = mongoose.models[name] || mongoose.model(name, userSchema);