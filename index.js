const Discord = require(`eris`);
const fs = require(`fs`);

var config, birthdays, bot, guildData = {};

var commands = [
	// {name: 'example', return: 'function/string', options: {}}
	{
		name: 'Ping',
		return: 'Pong!',
		options: {
			aliases: ['Ping!'],
			description: 'Return "Pong!"',
			fullDescription: 'It literally just sends a message in the same channel which says "Pong!"',
		},
	},
	{
		name: 'SetPrefix',
		return: (msg, args) => {
			if (args.length === 1) {
				if (guildData[msg.guild.id] === undefined) guildData[msg.guild.id] = {};
				let bkup = guildData[msg.guild.id];
				try {
					guildData[msg.guild.id].prefix = args[0].toLowerCase();
					fs.writeFileSync('./guildData.json', JSON.stringify(guildData));
					return `Set Guild Prefix to "${args[0].toLowerCase()}" Succesfully`;
				} catch (e) {
					guildData[msg.guild.id] = bkup;
					return `[ERROR] Issue Saving guildData\n\`${e}\``;
				}
			} else {
				return 'Incorrect syntax, please use the command followed by a single phrase or character.';
			}
		},
		options: {
			aliases: ['Prefix', 'ChangePrefix', 'RegisterPrefix'],
			usage: '<prefixChar | prefixString>',
			argsRequired: true,
			guildOnly: true,
			description: 'Set the command prefix',
			fullDescription: 'Set the prefix which is put before a command, for this guild. Must have the "Administrator" permission.',
			requirements: {
				permissions: {
					administrator: true,
				},
			},
		},
	},
	{
		name: 'Birthday',
		return: (msg, args) => {
			let users = [],
				today = new Date();
			today = `${today.getDate}${today.getMonth}`;
			for (var id in birthdays) {
				if (birthdays.hasOwnProperty(id)) {
					let bday = new Date(birthdays[id]);
					bday = `${bday.getDate}${bday.getMonth}`;
					if (bday === today) {
						users.push(`@${bot.users.get(id).username}#${bot.users.get(id).discriminator}`);
					}
				}
			}
			if (users.length > 0) {
				let toSend = '~ Todays Birthdays ~';
				for (let i = 0; i < users.length; i++) {
					toSend += `\n${users[i]}`;
				}
				return toSend;
			} else {
				return 'There are no birthdays today';
			}
		},
		options: {
			aliases: ['BD', 'BDay', 'B-Day', 'Birthdays', 'BDays', 'B-Days'],
			description: 'Returns a list of todays birthdays',
			fullDescription: 'Returns a list of everyone who has a birthday today',
		},
		subCommands: [
			{
				name: 'Add',
				return: (msg, args) => {
					// Add a birthday
					let date = args[0].replace(/[_,.-/\\]/, '/'),
						name = args[1],
						user = msg.mentions[1],
						reg = /([0-3]\d)\/([01]\d)\/(\d\d\d\d)/;
					if (name && user && date.match(reg)) {
						if (birthdays[user.id]) {
							return 'This users birthday has already been saved';
						}
						let bkup = birthdays;
						try {
							birthdays[user.id] = new Date(date) / 1000;
							fs.writeFileSync('./birthdays.json', JSON.stringify(birthdays));
							return `Succesfully added birthday`;
						} catch (e) {
							birthdays = bkup;
							return `[ERROR] Issue Saving birthdays\n\`${e}\``;
						}
					} else {
						return 'Please eneter a valid name and birthday date';
					}
				},
				options: {
					aliases: ['New', '+', 'Create'],
					usage: '<Date> <User>',
					argsRequired: true,
					description: 'Add a new birthday',
					fullDescription: 'Adds a new birthday to the birthday database.\nUse the format DD/MM/YYYY e.g., 18/12/1998 because this and ISO are superior in every way to the dumb American format.\nLike, seriously America, between this, using Farenheit and refusing to adopt metric units, c\'mon',
					requirements: {
						permissions: {
							administrator: true,
						},
					},
				},
			},
			{
				name: 'Remove',
				return: (msg, args) => {
					// Remove a birthday
					let name = args[0],
						user = msg.mentions[1];
					if (name && user) {
						if (!birthdays[user.id]) {
							return 'This users birthday has not been added yet';
						}
						let bkup = birthdays;
						try {
							delete birthdays[user.id];
							fs.writeFileSync('./birthdays.json', JSON.stringify(birthdays));
							return `Succesfully removed birthday`;
						} catch (e) {
							birthdays = bkup;
							return `[ERROR] Issue Saving birthdays\n\`${e}\``;
						}
					} else {
						return 'Please eneter a valid name';
					}
				},
				options: {
					aliases: ['Delete', '-', 'Del'],
					usage: '<User>',
					argsRequired: true,
					description: 'Remove a birthday',
					fullDescription: 'Removes a birthday from the birthday database',
					requirements: {
						permissions: {
							administrator: true,
						},
					},
				},
			},
			{
				name: 'Search',
				return: (msg, args) => {
					// Search a birthday
					let name = args[0],
						user = msg.mentions[1];
					if (name && user) {
						let date = new Date(birthdays[user.id] * 1000);
						return `${user.mention}'s birthday is ${`00${date.getDate()}`.substr(-2, 2)}/${`00${date.getMonth() + 1}`.substr(-2, 2)}/${`0000${date.getFullYear()}`.substr(-4, 4)}'`;
					} else {
						return 'Please eneter a valid name';
					}
				},
				options: {
					aliases: ['Find', '?', 'When', 'Get'],
					usage: '<User>',
					argsRequired: true,
					description: 'Find out when a users birthday is',
					fullDescription: 'Returns the date of a users birthday',
				},
			},
		],
	},
];

function initialise() {
	// Do things to set up the bot

	console.log(`[INFO] Starting Bot ...`);
	fs.readdir(`./`, (err, files) => {
		if (err) {
			return console.log(`[ERR]  Issue reading base folder: ${err}`);
		}
		if (files === undefined || files.length < 2) {
			return console.log(`[ERR]  No files are available including this one. (This error shouldn't appear but if it does you've done something very wrong)`);
		}
		let conf = false,
			guild = false,
			bdays = false;
		for (let i = 0; i < files.length; i++) {
			let stats = fs.statSync(files[i]);
			if (files[i] === `config.js` && stats.isFile()) {
				conf = true;
			}
			if (files[i] === `guildData.json` && stats.isFile()) {
				guild = true;
			}
			if (files[i] === `birthdays.json` && stats.isFile()) {
				bdays = true;
			}
		}
		if (!conf) {
			console.log(`[WARN] Config file not found, creating one now.`);
			fs.writeFileSync(`./config.js`, fs.readFileSync(`./example_config.js`));
		}
		if (!guild) {
			console.log(`[WARN] Guild file not found, creating one now.`);
			fs.writeFileSync(`./guildData.json`, '{}');
		} else {
			guildData = JSON.parse(fs.readFileSync('./guildData.json'));
		}
		if (!bdays) {
			console.log(`[WARN] Birthdays file not found, creating one now.`);
			fs.writeFileSync(`./birthdays.json`, '{}');
		} else {
			birthdays = JSON.parse(fs.readFileSync('./birthdays.json'));
		}
		console.log(`[INFO] Loading config file ...`);
		config = require(`./config.js`);
		console.log(`[INFO] Logging in ...`);
		bot = new Discord.CommandClient(
			config.botToken,
			{
				// Bot Options
			},
			{
				// Command Options
				description: 'A bot to check if you\'ve been pwned',
				owner: '@Heroj04',
				defaultCommandOptions: {
					caseInsensitive: true,
					cooldownMessage: 'You\'re using this command faster than I can cool down.',
					permissionMessage: 'You don\'t have permissions for that command.',
					errorMessage: '[ERROR]\n`Something went wrong processing that command, try again later and if errors persist contact your administrator.`',
				},
			}
		);

		bot
			.on('error', error => {
				console.log(`[ERR]  Bot Error: ${error}`);
			})
			.on('ready', () => {
				console.log(`[INFO] Bot Connected and Ready`);
			});
		console.log(`[INFO] Registering Commands ...`, 20);
		for (let i = 0; i < commands.length; i++) {
			let cmd = bot.registerCommand(
				commands[i].name,
				commands[i].return,
				commands[i].options
			);

			if (commands[i].subCommands) {
				for (let j = 0; j < commands[i].subCommands.length; j++) {
					cmd.registerSubCommand(
						commands[i].subCommands[j].name,
						commands[i].subCommands[j].return,
						commands[i].subCommands[j].options
					);
				}
			}
		}
		console.log(`[INFO] Setting Guild Prefixes ...`);
		for (var guildID in guildData) {
			if (guildData.hasOwnProperty(guildID)) {
				if (guildData[guildID].prefix !== undefined || guildData[guildID].prefix !== '') {
					bot.refisterGuildPrefix(guildID, guildData[guildID].prefix);
				}
			}
		}
		bot.connect();
	});
}

initialise();
