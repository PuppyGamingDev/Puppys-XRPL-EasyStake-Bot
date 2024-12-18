// Slash command to link a users wallet to their Discord ID using XUMM SignIn
const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const userSchema = require('../schemas/userSchema');
const { getXUMM } = require('../utilities/Connections');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Register your wallet for Staking to track you and generate rewards.'),
	async execute(interaction) {
		// Defer reply to prevent timeout
		await interaction.deferReply({ ephemeral: true });
		const xumm = getXUMM();

		try {
			// Create XUMM SignIn transaction
			const request = {
				"TransactionType": "SignIn",
				"Memos": [
					{
						"Memo": {
							"MemoData": Buffer.from(`Link Discord User to Puppy's EasyStake database.`).toString('hex'),
						},
					},
				],
			};
			// Subscribe to the XUMM SignIn transaction result
			const subscription = await xumm.payload.createAndSubscribe(request, async event => {
				if (event.data.signed === true) {
					return event.data;
				}
				if (event.data.signed === false) {
					return false;
				}
			});
			// Create Embed and display to user with Transaction Link and QR Code
			const transactEmbed = new EmbedBuilder()
				.setTitle(`Link your wallet`)
				.setDescription(`Scan or visit the transaction link to continue.`)
				.setColor(Colors.Aqua)
				.setFields(
					{ name: `Transaction Link`, value: `[Click Here](${subscription.created.next.always})` },
				)
				.setImage(subscription.created.refs.qr_png);
			await interaction.editReply({ embeds: [transactEmbed], ephemeral: true });

			// Await for response
			const resolveData = await subscription.resolved;
			if (resolveData === false) {
				await interaction.editReply({ content: `The transaction signing was rejected or failed`, embeds: [], ephemeral: true });
				return;
			}

			// Get signer wallet address
			const result = await xumm.payload.get(resolveData.payload_uuidv4);
			const sender = result.response.account;

			// Confirm with user and update Database with wallet address
			await interaction.editReply({ content: `Linked with wallet **${sender}**`, embeds: [], ephemeral: true });
			await userSchema.findOneAndUpdate({ _id: interaction.user.id }, { wallet: sender }, { upsert: true });
			return;
		}
		catch (err) {
			// Oh no, something went wrong
			console.log(err);
			await interaction.editReply({ content: `Ahhh... I seem to have hit an error`, embeds: [], ephemeral: true });
			return;
		}
	},
};