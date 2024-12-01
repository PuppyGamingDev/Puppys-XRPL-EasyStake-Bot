// Slash Command for handing rewards view and claiming
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const userSchema = require('../schemas/userSchema');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');
const { claim, checkTrustline, isValidTransaction } = require('../utilities/Connections');

// Cooldown manager to mitigate spam claiming
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rewards')
        .setDescription('Manage your rewards in this server')
        .addSubcommand(subcommand => subcommand
            .setName('view')
            .setDescription('View your rewards in this server.'))
        .addSubcommand(subcommand => subcommand
            .setName('claim')
            .setDescription('Claim your rewards in this server.'))
        .setDMPermission(false),
    async execute(interaction) {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        // Connect to MongoDB and get user's data'
        await mongoConnect();
        const user = await userSchema.findOne({ _id: interaction.user.id });

        // If no user found, remind them to link their wallet
        if (!user || user === undefined || !user.wallet || user.wallet === undefined) {
            await interaction.editReply({ content: `You have not linked your wallet yet.` });
            return;
        }

        // Handle subcommands (View or Claim)
        switch (interaction.options.getSubcommand()) {
            
            // Handle view
            case 'view': {
                // Get current Server's information
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                var myRewards = 0;

                // If no guild found, no current rewards saved or no rewards for the current user set rewards to 0
                if (!guild || guild === undefined || !guild.rewards || guild.rewards === undefined || guild.rewards[interaction.user.id] === undefined) {
                    myRewards = 0;
                }
                // Else set rewards to the current user's rewards
                else {
                    myRewards = guild.rewards[interaction.user.id];
                }

                // Response Embed for the user containing their rewards information
                const currency = guild.currency.name !== undefined ? guild.currency.name : 'Undefined Currency';
                const embed = new EmbedBuilder()
                    .setTitle(`Your Rewards`)
                    .setColor(Colors.Gold)
                    .setDescription(`You have **${myRewards.toLocaleString()}** of *${currency}* to claim.\nYou can claim your rewards by using \`/rewards claim\` or continue to build your rewards.`)
                    .setFooter({ text: `Puppy's XRPL EasyStake Bot` })

                await interaction.editReply({ embeds: [embed] });
                return;

            }

            // Handle claim
            case 'claim': {
                // Get current Server's information
                const guild = await guildSchema.findOne({ _id: interaction.guild.id });
                var myRewards = 0;

                // If no guild found, no current rewards saved or no rewards for the current user set rewards to 0
                if (!guild || guild === undefined || !guild.rewards || guild.rewards === undefined || guild.rewards[interaction.user.id] === undefined) {
                    myRewards = 0;
                }
                // Else set rewards to the current user's rewards
                else {
                    myRewards = guild.rewards[interaction.user.id];
                }

                // Handle if no rewards to claim
                if (myRewards === 0) {
                    await interaction.editReply({ content: `You have no rewards to claim.` });
                    return;
                }

                // Handle if Server is yet to set their rewards currency
                if (!guild.currency.issuer || guild.currency.issuer === undefined || !guild.currency.code || guild.currency.code === undefined) {
                    await interaction.editReply({ content: `Sorry but the project hasn't set up their token details yet.` });
                    return;
                }

                // Check trustline
                const token = { hex: guild.currency.code }
                // const hasLine = await checkTrustline(myRewards, user.wallet, token);
                // if (!hasLine) return await interaction.editReply({ content: `Sorry but you dont seem to have a trustline set`});
                
                // Check if user is on cooldown to prevent spam claiming (2 minute cooldown)
                const timenow = Math.floor(Date.now() / 1000);
                var cooled = cooldowns.get(interaction.user.id);
                if (cooled !== undefined && cooled > timenow) {
                    await interaction.editReply({ content: `Sorry but you are still on Cooldown for claiming.\nClaim Again: <t:${cooled}:R>` });
                    return;
                }
                const cooldown = timenow + 120;

                // Add user to cooldown Map
                cooldowns.set(interaction.user.id, cooldown)

                // Attempt to claim rewards
                try {
                    // DO transaction from Connections.js
                    const txhash = await claim(user.wallet, myRewards, guild.currency);

                    // Handle if transaction failed
                    if (!txhash || txhash === undefined) {
                        await interaction.editReply({ content: `There was an error claiming your rewards. Make sure you have a Trustline set and if continues, please contact a member of the team` });
                        return;
                    }

                    const isValid = await isValidTransaction(txhash);
                    if (!isValid) {
                        await interaction.editReply({ content: `There was an error claiming your rewards. Make sure you have a Trustline set and if continues, please contact a member of the team` });
                        return;
                    }

                    // Update user's rewards to 0 after successful claim
                    guild.rewards[interaction.user.id] = 0;
                    const path = `rewards.${interaction.user.id}`
                    await guildSchema.findOneAndUpdate(
                        { _id: interaction.guild.id },
                        { [path]: 0 },
                        { upsert: true }
                    )

                    // Respond to user with successful claim
                    await interaction.editReply({ content: `You have successfully claimed your rewards.\nYou can view your transaction here: https://xrplexplorer.com/explorer/${txhash}` });
                } catch (error) {
                    // Uh Oh, something went wrong
                    console.log(error)
                    await interaction.editReply({ content: `There was an error claiming your rewards. Make sure you have a Trustline set and if continues, please contact a member of the team` });
                }

                // Remove user from cooldown Map after cooldown
                setTimeout(() => cooldowns.delete(interaction.user.id), 120000);
                return;
            }
        }
    },
};