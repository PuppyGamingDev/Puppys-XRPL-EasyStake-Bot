const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const guildSchema = require('../schemas/guildSchema');

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

	},
};