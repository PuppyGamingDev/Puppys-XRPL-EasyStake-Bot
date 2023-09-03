// Slash Command to handle setting the server's Reward Currency details
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('currency')
        .setDescription('Set your Token details for the server.')
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View your Token details.'))
        .addSubcommand(subcommand => subcommand
            .setName('set')
            .setDescription('Set your Token details.')
            .addStringOption(option => option
                .setName('name')
                .setDescription('The name or short code for your Token (How to display it next to values).')
                .setRequired(true))
            .addStringOption(option => option
                .setName('issuer')
                .setDescription('The issuer of the Token.')
                .setRequired(true))
            .addStringOption(option => option
                .setName('code')
                .setDescription('The Currency Code for the Token (Use HEX Code if available or it wont work)')
                .setRequired(true)))
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    async execute(interaction) {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        // Handle subcommands (View or Set)
        switch (interaction.options.getSubcommand()) {

            // Handle view
            case 'view': {
                // Connect to MongoDB and get Server's data
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                if (!guild || guild === undefined || !guild.currency || guild.currency === undefined) {
                    await interaction.editReply({ content: `You have not set your Token details yet.` });
                    return;
                }
                const details = `**Name:** ${guild.currency.name}\n**Issuer:** ${guild.currency.issuer}\n**Code:** ${guild.currency.code}`;

                await interaction.editReply({ content: `Your Token details are:\n\n${details}` });
                return;
            }

            // Handle set
            case 'set': {

                // Get the Currency details from the interaction options
                const name = interaction.options.getString('name');
                const issuer = interaction.options.getString('issuer');
                const code = interaction.options.getString('code');

                // Set values in an Object
                const newCurrency = {
                    name: name,
                    issuer: issuer,
                    code: code
                }

                // Connect to MongoDB and update the Server's value for currency
                await mongoConnect();
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { currency: newCurrency },
                    { upsert: true }
                )
                await interaction.editReply({ content: `Set your Token details to:\n\n**Name:** ${name}\n**Issuer:** ${issuer}\n**Code:** ${code}` });
                return;
            }

        }
    },
};