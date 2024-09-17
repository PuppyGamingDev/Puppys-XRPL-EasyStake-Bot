const mongoose = require('mongoose');
const { logger } = require('./logger');
mongoose.set('strictQuery', true);

require('dotenv/config');

let cached = global.mongoConnection;

const mongoConnect = async () => {
	if (cached) {
		return cached;
	}

	logger.info('Creating a new Mongo connection');

	let mongoConnResult = null;
	try {
		mongoConnResult = await new Promise((resolve) => {
			mongoose.connect(process.env.MONGOURI).then((mongooseconnection) => {
				cached = mongooseconnection;
				resolve(cached);
			});
		});

		logger.info('Mongo connection Created successfully.');
	}
	catch (error) {
		logger.error('Mongo connection Failed:');
		logger.error(error);
	}

	return mongoConnResult;
};

module.exports = mongoConnect;