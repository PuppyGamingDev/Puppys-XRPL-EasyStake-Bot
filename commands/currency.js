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
		await interaction.deferReply({ ephemeral: true });

		switch (interaction.options.getSubcommand()) {
			case 'view': {
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

			case 'set': {
				const name = interaction.options.getString('name');
				const issuer = interaction.options.getString('issuer');
				const code = interaction.options.getString('code');
				const newCurrency = {
					name: name,
					issuer: issuer,
					code: code
				}
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