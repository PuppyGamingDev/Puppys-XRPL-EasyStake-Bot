# Puppys-XRPL-EasyStake-Bot

## Introduction & Information
This is a Discord Bot that allows you to easily distribute rewards to users for holding your XRPL NFTs. It uses the XUMM SignIn process to allow users to register their wallet address with the bot and every midnight the bot will use the [xrpl.services](https://api.xrpldata.com/docs/static/index.html) API to get the current Holders. It will iterate over the holders and each time it finds a Holder address that is linked to a Discord User it will add a reward to the user value in the database based on the reward set for that collection. 

This supports the ability for multiple collections and each one can have it's own Reward Per NFT so one collection could grant more than another. You can also set the currency used for rewards. You can use XRP or an XRPL Token.

User rewards are stored in the database and can be redeemed by users at any time. This avoids the bot having to send out multiple transactions every time it does a daily snapshot reducing transaction costs and unnecessary network traffic. Rewards are also stored against a user's Discord ID and not their Wallet Address so they are able to link a different wallet and still keep their old rewards count.

## Setup
`npm install` or `npm i discord.js mongoose dotenv axios xumm-sdk xrpl`

Make a file called `.env` and fill in the following values

```js
TOKEN=
CLIENTID=
MONGOURI
XUMMKEY=
XUMMSECRET=
NETWORK=
SEED=
```

- `TOKEN` and `CLIENTID` are your Bot Token and Client ID from Discord Application > [GUIDE HERE](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
- `MONGOURI` is a MongoDB Connection String > [GUIDE HERE](https://www.mongodb.com/docs/guides/atlas/connection-string/)
- `XUMMKEY` and `XUMMSECRET` require you to create an application with XUMM and get the values > [GUIDE HERE](https://xumm.readme.io/docs/register-your-app)
- `NETWORK` is the XRPL Network. You can use a public one such as `wss://s1.ripple.com/` but I advise a private one, You can get one free from [QuickNode](https://www.quicknode.com?tap_a=67226-09396e&tap_s=3536451-d11bb1&utm_source=affiliate&utm_campaign=generic&utm_content=affiliate_landing_page&utm_medium=generic)
- `SEED` is the Family Seed of the wallet you are using to distribute rewards. (Recommend to only keep the tokens in this wallet for rewards and a small amount of XRP for transactions)

Once you have all your values, in the console run `node deploy-commands.js` and it will register the Bot's commands globally so any server the bot is in will be able to use them.


On the Discord Developer Dashboard for your application, navigate to `OAUTH2 > URL Generator` and tick the boxes for `bot` & `application.commands` and copy the URL that is generated below it and paste into your browser to invite the bot to your server. (The bot shouldn't need any extra permissions as all interactions are based on replying to interactions and not actual posting)

Once your bot is in, in the console run `node stakebot.js` and you should see that it's running when it outputs `Puppy's EasyStake Bot is running!`

## Commands

### /link
This command should be used by a user once to register their wallet address with the Bot using the XUMM SignIn process. The wallet address used to sign is then stored against the users Discord ID as a reference for granting rewards for holding tips.

### /rewards
Users can use this command in a server to view their current rewards for that project and also to claim their rewards.

### /collections (Admin only default)
Projects use this to add / remove & view their set collections.

### /currency (Admin only default)
Projects use this to set their token of choice to use for staking rewards. *(When setting an XRPL Token, if your Token has a HEX Currency Code, make sure to use this as the Currency Code or it will fail to send transactions.)*

### /supply (Admin only default)
Projects use this to view, set and add to their total staking supply so they can cap tota rewards available via staking

## Finishing 
Anyone is free to use and modify this code as they wish, no credits required but are appreciated.

If you have any questions, my DMs are always open on

- Twitter > @iamshiffed
- New Tag Discord > shiffed
- Old Tag Discord > Shiffed#2071
- Email > shiffed@puppy.tools

Tips are always welcome and help continue development

XRPL: `rm2AEVUcxeYh6ZJUTkWUqVRPurWdn4E9W`

 
