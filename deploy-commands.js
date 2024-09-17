// Script used to register Slash Commands to the Discord API
const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const { logger } = require('./utilities/logger');
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
require('dotenv/config')

// Creates a list of all Slash Commands to register
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Submits the Slash Commands in the list to the Discord API to be registered to the server set in './config.json'
rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: commands })
    .then(data => logger.info(`Successfully registered ${data.length} application commands.`))
    .catch(error => logger.error(error));