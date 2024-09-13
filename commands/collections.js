// Slash Command for managing a Project's collections
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('collections')
        .setDescription('Manage your Projects collections.')
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a collection to your Project.')
            .addStringOption(option => option
                .setName('name')
                .setDescription('The name of the collection.')
                .setRequired(true))
            .addStringOption(option => option
                .setName('issuer')
                .setDescription('The issuer of the collection.')
                .setRequired(true))
            .addNumberOption(option => option
                .setName('reward')
                .setDescription('The reward per NFT per day of the collection.')
                .setRequired(true))
            .addIntegerOption(option => option
                .setName('taxon')
                .setDescription('The taxon of the collection. (If multiple taxons, dont include e.g. Sologenic collections)')
                .setRequired(false)))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a collection from your Project.')
            .addStringOption(option => option
                .setName('cname')
                .setDescription('The name of the collection to remove.')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View your Projects collections.'))
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
                const issuer = interaction.options.getString('issuer');
                var taxon = interaction.options.getInteger('taxon');
                const reward = interaction.options.getNumber('reward');

                if (taxon === null || typeof taxon === 'undefined') taxon = "none";

                // Create the collection object
                const newCollection = {
                    name: name,
                    issuer: issuer,
                    taxon: taxon,
                    pernft: reward
                }

                // Connect to MongoDB and add the collection to the Project
                await mongoConnect();
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { $push: { collections: newCollection } },
                    { upsert: true }
                );
                await interaction.editReply({ content: `Added collection ${name} to your Project.` });
                return;

            }

            // Handle remove
            case 'remove': {
                // Connect to MongoDB and remove the collection from the Project
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });

                // Iteracte
                for (i = 0; i < guild.collections.length; i++) {
                    if (guild.collections[i].name === interaction.options.getString('cname')) {
                        // Remove the collection from the array is name matches then update the DB
                        guild.collections.splice(i, 1);
                        await guildSchema.findOneAndUpdate(
                            { _id: interaction.guild.id },
                            { collections: guild.collections },
                            { upsert: true }
                        );
                        await interaction.editReply({ content: `Removed collection **${interaction.options.getString('cname')}** from your Project.` });
                        return;
                    }
                }
                await interaction.editReply({ content: `Collection **${interaction.options.getString('cname')}** not found.` });
                return;

            }

            // Handle view
            case 'view': {
                // Connect to MongoDB and get the Project's collections
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                var description = ``;

                // Iterate over the collections and add them to the description with details
                for (const collection of guild.collections) {
                    description += (`**${collection.name}**\nIssuer: ${collection.issuer}\nTaxon: ${collection.taxon}\nReward: ${collection.pernft} *per NFT per Day*\n------------------\n`);
                }
                // If no collections found
                if (description === ``) {
                    await interaction.editReply({ content: `You have no collections.` });
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