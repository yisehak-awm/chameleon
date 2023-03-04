require('dotenv').config();
const { Telegraf } = require('telegraf');
const { BOT_ID, SERVER_URL, PORT } = process.env;
const URI = `/webhook/${BOT_ID}`;
const bot = new Telegraf(BOT_ID);
bot.launch({ webhook: { domain: SERVER_URL, port: PORT, hookPath: URI } });

/*
	[{ isAdmin: boolean, chat: cxt }]
*/
let players = [];
let choices;
let chameleon;
let answer;
let askingChoices = false;
let isGameStarted = false;

function reset() {
	chameleon = null;
	answer = null;
	askingChoices = false;
	isGameStarted = false;
}

bot.command('leave', async (ctx) => {
	let plyr = players.find((p) => ctx.from.id === p.chat.from.id);
	if (!plyr) {
		return await ctx.sendMessage('You are not in the game');
	}
	await ctx.sendMessage('Sad to see you go 😔, See you soon 👋');
	players = players.filter((p) => ctx.from.id !== p.chat.from.id);
	if (!players.length) return;
	players[0].isAdmin = true;
	players.map((p) =>
		p.chat.sendMessage(
			`${ctx.from.first_name} left the game 😔. There are now ${players.length} players. Game is restarting with ${players[0].chat.from.first_name} as admin`
		)
	);
	reset();
	setChoices(players[0].chat, choices.join(','));
});

bot.command('start', async (ctx) => {
	if (isGameStarted)
		return await ctx.sendMessage(
			'Game in progress 😕, try again when game is over '
		);
	if (players.length === 0) {
		await ctx.sendMessage(
			`Welcome ${ctx.from.first_name} 👋.You are the fist one here, You get to be the admin! 🥳 `
		);
		players.push({ isAdmin: true, chat: ctx });
		return showChoicesQuestion(ctx, true);
	}
	if (players.find((p) => ctx.from.id === p.chat.from.id)) {
		return await ctx.sendMessage('You are already in the game!');
	}
	await ctx.sendMessage(
		`Welcome ${ctx.from.first_name} 👋. ${
			players[0].chat.from.first_name
		} is the Admin. They will start the game when all the players are in.\n\nPlayers: ${players.map(
			(l) => l.chat.from.first_name
		)}, ${ctx.from.first_name}`
	);
	players.map((p) =>
		p.chat.sendMessage(
			`${ctx.from.first_name} joined the game 😬.\n\nPlayers: ${players
				.map((l) => l.chat.from.first_name)
				.join(',')}, ${ctx.from.first_name}`
		)
	);
	players.push({ isAdmin: false, chat: ctx });
});

bot.on('message', async (ctx) => {
	switch (ctx.message.text) {
		case 'Change choices  🎲':
			showChoicesQuestion(ctx);
			break;
		case 'Start game  🚀':
			startGame(ctx);
			break;
		case 'Reveal chameleon  🥁':
			revealChameleonAndEndGame(ctx);
			break;
		default:
			if (askingChoices) {
				setChoices(ctx, ctx.message.text);
			}
	}
});

async function startGame(ctx) {
	isGameStarted = true;
	const chameleonIndex = Math.round(Math.random() * (players.length - 1));
	chameleon = players[chameleonIndex];
	answer = choices[Math.round(Math.random() * (choices.length - 1))];

	const promises = [];
	players.map((p, i) => {
		promises.push(
			p.chat.sendMessage(
				`Game has started 👀. \n\nChoices are:\n${choices.join(
					' , '
				)}\n\nPlayers are:\n${players.map((p) => p.chat.from.first_name)} `
			)
		);
		promises.push(
			p.chat.sendMessage(
				i === chameleonIndex
					? 'You are the chameleon 😈. shhhh!'
					: `You are describing "${answer}"`
			)
		);
	});
	await Promise.allSettled(promises);
	await players
		.find((p) => p.isAdmin)
		.chat.sendMessage(`You can reveal chameleon when you're ready 😁`, {
			reply_markup: {
				keyboard: [[{ text: 'Reveal chameleon  🥁' }]],
			},
		});
	// Every player knows game has started. And they know if they are the chameleon or not
}

async function revealChameleonAndEndGame(ctx) {
	let promises = [
		new Promise((r, _) => {
			setTimeout(r, 3000);
		}),
	];
	players.map((p, i) => {
		promises.push(p.chat.sendMessage('The chameleon is ... drum roll 🥁🥁🥁 '));
	});
	await Promise.allSettled(promises);

	players.map((p, i) => {
		promises.push(p.chat.sendMessage(`${chameleon.chat.from.first_name} 🦎😂`));
	});
	await Promise.allSettled(promises);
	reset();
	await setChoices(ctx, choices.join(','));
}

async function showChoicesQuestion(ctx, first = false) {
	if (!first) {
		await ctx.sendMessage(`Current choices are:\n\n ${choices.join(',')}`, {
			reply_markup: {
				remove_keyboard: true,
			},
		});
	}
	askingChoices = true;
	await ctx.sendMessage(
		'Send me comma separated list of choices *Example:* Obama,Clinton,Trump',
		{ parse_mode: 'MarkdownV2' }
	);
}

async function setChoices(ctx, list) {
	choices = list.split(',');
	askingChoices = false;
	await ctx.sendMessage(
		`Choices are set 😁. Start the game whenever you're ready!`,
		{
			reply_markup: {
				keyboard: [
					[{ text: 'Start game  🚀' }],
					[{ text: 'Change choices  🎲' }],
				],
			},
		}
	);
}
