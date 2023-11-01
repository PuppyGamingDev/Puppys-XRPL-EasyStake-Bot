// Slash Command for managing a Project's collections
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modifiers')
        .setDescription('Manage your Projects Modifiers.')
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a new NFT Modifier.')
            .addStringOption(option => option
                .setName('name')
                .setDescription('The name for the NFT.')
                .setRequired(true))
            .addStringOption(option => option
                .setName('id')
                .setDescription('The NFT ID.')
                .setRequired(true))
            .addStringOption(option => option
                .setName('modifier')
                .setDescription('The modifier to give e.g "1.5" for an extra 50%')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a modifier')
            .addStringOption(option => option
                .setName('rid')
                .setDescription('The NFT ID')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View your Projects Modifiers'))
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    async execute(interaction) {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        // Handle subcommands (Add, Remove, View)
        switch (interaction.options.getSubcommand()) {

            // Handle add
            case 'add': {
                // Get the collection details from the interaction options
                const name = interaction.options.getString('name');
                const id = interaction.options.getString('id');
                var modifier = interaction.options.getString('modifier');

                try {
                    modifier = parseFloat(modifier);
                } catch (err) {
                    await interaction.editReply({ content: `Sorry but there was an issue parsing the modifier you entered, please use only numbers like "1.5" or "2"` });
                    return;
                }
                // Connect to MongoDB and to get current Modifiers list
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                if (!guild) {
                    await interaction.editReply({ content: `Sorry but there was an issue finding your servers data` });
                    return;
                }

                // Update or create modifiers object
                var modifiers = guild.modifiers ? guild.modifiers : {};
                modifiers[id] = { name: name, modifier: modifier };
                // Save modifiers object
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { modifiers: modifiers },
                    { upsert: true }
                );
                await interaction.editReply({ content: `Added modifier for ${name}` });
                return;
            }

            // Handle remove
            case 'remove': {
                // Connect to MongoDB and remove the collection from the Project
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                if (!guild) {
                    await interaction.editReply({ content: `Sorry but there was an issue finding your servers data` });
                }
                // Get the ID from the interaction options
                const rid = interaction.options.getString('rid');
                // Remove the ID from the modifiers object
                var modifiers = guild.modifiers;
                delete modifiers[rid];
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { modifiers: modifiers },
                    { upsert: true }
                );
                await interaction.editReply({ content: `Modifier removed` });
                return;
            }

            // Handle view
            case 'view': {
                // Connect to MongoDB and get the Project's collections
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                if (!guild) {
                    await interaction.editReply({ content: `Sorry but there was an issue finding your servers data` });
                    return;
                }
                if (Object.keys(guild.modifiers).length === 0) {
                    await interaction.editReply({ content: `You do not currently have any modifiers` });
                    return;
                }
                // Iterate over the collections and add them to the description with details
                var description = "";
                for (const [id, values] of Object.entries(guild.modifiers)) {
                    description += (`**${values.name}**\nID: ${id}\nModifier: ${values.modifier}x\n------------------\n`);
                }
                // If no collections found
                if (description === ``) {
                    await interaction.editReply({ content: `You have no modifiers.` });
                    return;
                }

                // Create the Embed and send it to the user
                const embed = new EmbedBuilder()
                    .setTitle(`Your Project's Collections`)
                    .setDescription(description)
                    .setColor(Colors.Green)
                    .setFooter({ text: `Puppy's XRPL EasyStake Bot` });

                await interaction.editReply({ embeds: [embed] });
                return;

            }
        }
    },
};