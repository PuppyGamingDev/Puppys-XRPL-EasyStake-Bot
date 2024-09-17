// Main file for running the Discord Bot
const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
require("dotenv/config");
const mongoConnect = require("./utilities/mongo-connect");
require('./utilities/Staking.js');
const { logger } = require('./utilities/logger');

// Declare needed Intents
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// Declare and Map commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Runs when bot logs in
client.once(Events.ClientReady, async () => {
    // Initiate MongoDB connection first
    await mongoConnect();
    logger.info(`Puppy's EasyStake Bot is running`);
});

// Slash Command Handling
client.on(Events.InteractionCreate, async (interaction) => {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            logger.error(error);
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
        }
    }
    // Handle Autocomplete in Commands
    else if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.autocomplete(interaction, client);
        } catch (error) {
            logger.error(error);
            await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
        }
    }
});

// Log the bot in
client.login(process.env.TOKEN);
