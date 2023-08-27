const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const userSchema = require('../schemas/userSchema');
const guildSchema = require('../schemas/guildSchema');
const mongoConnect = require('../utilities/mongo-connect');
const { claim } = require('../utilities/Connections');

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
		await interaction.deferReply({ ephemeral: true });

		await mongoConnect();
		const user = await userSchema.findOne({ _id: interaction.user.id });
		if (!user || user === undefined || !user.wallet || user.wallet === undefined) {
			await interaction.editReply({ content: `You have not linked your wallet yet.` });
			return;
		}
		switch (interaction.options.getSubcommand()) {
			case 'view': {
				const guild = await guildSchema.findOne({ _id: interaction.guild.id });
				var myRewards = 0;
				if (!guild || guild === undefined || !guild.rewards || guild.rewards === undefined || guild.rewards[interaction.user.id] === undefined) {
					myRewards = 0;
				}
				else {
					myRewards = guild.rewards[interaction.user.id];
				}
				const currency = guild.currency.name !== undefined ? guild.currency.name : 'Undefined Currency';
				const embed = new EmbedBuilder()
					.setTitle(`Your Rewards`)
					.setColor(Colors.Gold)
					.setDescription(`You have **${myRewards.toLocaleString()}** of *${currency}* to claim.\nYou can claim your rewards by using \`/rewards claim\` or continue to build your rewards.`)
					.setFooter({ text: `Puppy's XRPL EasyStake Bot` })

				await interaction.editReply({ embeds: [embed] });
				return;

			}

			case 'claim': {
				const guild = await guildSchema.findOne({ _id: interaction.guild.id });
				var myRewards = 0;
				if (!guild || guild === undefined || !guild.rewards || guild.rewards === undefined || guild.rewards[interaction.user.id] === undefined) {
					myRewards = 0;
				}
				else {
					myRewards = guild.rewards[interaction.user.id];
				}
				if (myRewards === 0) {
					await interaction.editReply({ content: `You have no rewards to claim.` });
					return;
				}
				if (!guild.currency.issuer || guild.currency.issuer === undefined || !guild.currency.hex || guild.currency.hex === undefined) {
					await interaction.editReply({ content: `Sorry but the project hasn't set up their token details yet.` });
					return;
				}
				try {
					const txhash = await claim(user.wallet, myRewards, guild.currency);
					if (!txhash || txhash === undefined) {
						await interaction.editReply({ content: `There was an error claiming your rewards. Make sure you have a Trustline set and if continues, please contact a member of the team` });
						return;
					}
					guild.rewards[interaction.user.id] = 0;
					await guild.save();
					await interaction.editReply({ content: `You have successfully claimed your rewards. You can view your transaction here: https://xrpscan.com/tx/${txhash}` });
					return;
				} catch (error) {
					await interaction.editReply({ content: `There was an error claiming your rewards. Make sure you have a Trustline set and if continues, please contact a member of the team` });
					return;
				}
			}
		}
	},
};