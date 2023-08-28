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
            .addIntegerOption(option => option
                .setName('taxon')
                .setDescription('The taxon of the collection.')
                .setRequired(true))
            .addIntegerOption(option => option
                .setName('reward')
                .setDescription('The reward per NFT per day of the collection.')
                .setRequired(true)))
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
        await interaction.deferReply({ ephemeral: true });

        switch (interaction.options.getSubcommand()) {
            case 'add': {
                const name = interaction.options.getString('name');
                const issuer = interaction.options.getString('issuer');
                const taxon = interaction.options.getInteger('taxon');
                const reward = interaction.options.getInteger('reward');

                const newCollection = {
                    name: name,
                    issuer: issuer,
                    taxon: taxon,
                    pernft: reward
                }
                await mongoConnect();
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { $push: { collections: newCollection } },
                    { upsert: true }
                );
                await interaction.editReply({ content: `Added collection ${name} to your Project.` });
                return;

            }

            case 'remove': {
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                for (i = 0; i < guild.collections.length; i++) {
                    if (guild.collections[i].name === interaction.options.getString('cname')) {
                        guild.collections.splice(i, 1);
                        await guild.save();
                        await interaction.editReply({ content: `Removed collection **${interaction.options.getString('cname')}** from your Project.` });
                        return;
                    }
                }
                await interaction.editReply({ content: `Collection **${interaction.options.getString('cname')}** not found.` });

            }

            case 'view': {
                await mongoConnect();
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                var description = ``;
                for (const collection of guild.collections) {
                    description += (`**${collection.name}**\nIssuer: ${collection.issuer}\nTaxon: ${collection.taxon}\nReward: ${collection.pernft} *per NFT per Day*\n------------------\n`);
                }
                if (description === ``) {
                    await interaction.editReply({ content: `You have no collections.` });
                    return;
                }
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