// Slash Command to handle setting the server's Supply Totals details
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('supply')
        .setDescription('Set, add to or view your Staking Supply')
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View your Staking Supply details'))
        .addSubcommand(subcommand => subcommand
            .setName('set')
            .setDescription('Set your Total Staking Supply (This can be done once, then use /supply add)')
            .addIntegerOption(option => option
                .setName('total')
                .setDescription('The total supply to set for Staking rewards')
                .setRequired(true)))
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add to your Total Staking Supply if you have already set an initial total')
            .addIntegerOption(option => option
                .setName('amount')
                .setDescription('The supply to add for Staking rewards')
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
                if (!guild || guild === undefined) return await interaction.editReply({ content: `You haven't set up any values yet` });

                // Get amount currently awaiting to be claimed
                var claimable = 0;
                for (const [key, value] of Object.entries(guild.rewards)) {
                    claimable += value;
                }
                // Get amount that has been claimed
                var claimed = guild.totalsupply - guild.currentsupply - claimable;
                const embed = new EmbedBuilder()
                    .setTitle('Staking Supply Details')
                    .addFields(
                        { name: `Total Supply`, value: guild.totalsupply.toLocaleString() },
                        { name: `Currently Supply`, value: guild.currentsupply.toLocaleString() },
                        { name: `Awaiting Claim`, value: claimable.toLocaleString() },
                        { name: `Claimed`, value: claimed.toLocaleString() }
                    )
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Handle set
            case 'set': {
                await mongoConnect();

                // Get the Servers preferences
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });

                // Check if a total has already been set and suggest the add command
                if (guild.totalsupply > 0) return await interaction.editReply({ content: `Sorry but you have already set an initial total supply, please use \`/supply add\` to add to it.` });

                // Get the Currency details from the interaction options
                const supply = interaction.options.getInteger('total');

                // Connect to MongoDB and update the Server's total supply for staking
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { totalsupply: supply },
                    { upsert: true }
                )
                await interaction.editReply({ content: `Your total Staking Supply has been set to **${supply.toLocaleString()}**\nTo increase reward supply, please use \`/supply add\`` });
                return;
            }

            case 'add': {
                await mongoConnect();

                // Get the Servers preferences
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });

                // Check if a total has already been set and suggest the add command
                if (guild.totalsupply === 0) return await interaction.editReply({ content: `Sorry but you havn't set an initial total supply before, please use \`/supply set\` to set the initial amount.` });

                // Get the Currency details from the interaction options
                const amount = interaction.options.getInteger('amount');

                // Connect to MongoDB and update the Server's total supply for staking
                await guildSchema.findOneAndUpdate(
                    { _id: interaction.guild.id },
                    { $inc: { totalsupply: amount, currentsupply: amount } },
                    { upsert: true }
                )

                const newAmount = guild.totalsupply + amount;
                await interaction.editReply({ content: `Your new total Staking Supply has been set to **${newAmount.toLocaleString()}**\n` });
                return;
            }

        }
    },
};