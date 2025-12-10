const mongoose = require('mongoose');
const { logger } = require('./logger');

require('dotenv/config');

let cached = global.mongoConnection;

const mongoConnect = async () => {
	if (cached) {
		return cached;
	}

	logger.info('Creating a new Mongo connection');

	// Set up connection event listeners for debugging
	mongoose.connection.on('error', (err) => {
		logger.error('Mongoose connection error:', err);
	});

	mongoose.connection.on('disconnected', () => {
		logger.warn('Mongoose disconnected');
		cached = null; // Clear cache on disconnect
	});

	let mongoConnResult = null;
	try {
		// Verify connection string is set
		if (!process.env.MONGOURI) {
			throw new Error('MONGOURI environment variable is not set');
		}

		// Log connection string (masked for security)
		const uri = process.env.MONGOURI;
		const maskedUri = uri.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/, '$1****:****@');
		logger.info(`Attempting to connect to: ${maskedUri}`);

		// Mongoose 9 with MongoDB driver v7 - connection options optimized for MongoDB Atlas
		// Note: Some options should be in connection string, not here, to avoid conflicts
		const connectionOptions = {
			serverSelectionTimeoutMS: 30000, // Increased timeout for Atlas
			socketTimeoutMS: 45000,
			connectTimeoutMS: 30000, // Increased for initial connection
			// Don't set retryWrites or w here if they're already in the connection string
			// These are better set in the connection string itself
		};
		
		// Ensure connection string has required parameters for Atlas
		let connectionUri = uri;
		if (connectionUri.includes('mongodb+srv://')) {
			// Ensure retryWrites and w=majority are in the connection string
			if (!connectionUri.includes('retryWrites')) {
				const separator = connectionUri.includes('?') ? '&' : '?';
				connectionUri += `${separator}retryWrites=true&w=majority`;
			}
		}
		
		mongoConnResult = await mongoose.connect(connectionUri, connectionOptions);
		cached = mongoConnResult;
		logger.info('Mongo connection Created successfully.');
		logger.info(`Connected to MongoDB: ${mongoose.connection.host}`);
		logger.info(`Database: ${mongoose.connection.name}`);
	}
	catch (error) {
		logger.error('Mongo connection Failed:');
		logger.error(error.message);
		
		// Provide helpful debugging information
		if (error.message.includes('authentication') || error.name === 'MongoServerError') {
			logger.error('Authentication failed. Please check:');
			logger.error('1. Username and password in connection string are correct');
			logger.error('2. Special characters in passwords are URL-encoded (e.g., @ becomes %40)');
			logger.error('3. Database user exists and has proper permissions');
		} else if (error.message.includes('ECONNRESET') || error.message.includes('ServerSelectionError') || error.name === 'MongooseServerSelectionError') {
			logger.error('Network/Server Selection Error. Please verify:');
			logger.error('1. IP Whitelist: Check MongoDB Atlas > Network Access');
			logger.error('   - Ensure 0.0.0.0/0 is added (or your specific IP)');
			logger.error('   - Wait 1-2 minutes after adding IP for changes to propagate');
			logger.error('2. Connection String Format:');
			logger.error('   Should be: mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
			logger.error('3. Cluster Status: Verify cluster is running in Atlas dashboard');
			logger.error('4. Firewall/VPN: Temporarily disable to test if blocking connection');
			logger.error('5. Try connecting from MongoDB Compass to verify connection string works');
		} else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
			logger.error('DNS resolution error. Please check:');
			logger.error('1. Connection string hostname is correct');
			logger.error('2. Internet connection is working');
			logger.error('3. DNS servers are resolving correctly');
		}
		
		// Log full error for debugging (but mask sensitive info)
		if (error.stack) {
			const maskedStack = error.stack.replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/g, '$1****:****@');
			logger.error('Full error details:', maskedStack);
		}
		
		// Re-throw error so calling code can handle it
		throw error;
	}

	return mongoConnResult;
};

module.exports = mongoConnect;