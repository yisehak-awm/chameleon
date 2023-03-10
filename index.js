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
		return await ctx.sendMessage('You already left π');
	}
	await ctx.sendMessage('Be back ππ');
	players = players.filter((p) => ctx.from.id !== p.chat.from.id);
	if (!players.length) return;
	players[0].isAdmin = true;
	players.map((p) =>
		p.chat.sendMessage(
			`${ctx.from.first_name} left πΆββοΈ, Game is restarting with ${players.length} players, ${players[0].chat.from.first_name} is admin`
		)
	);
	reset();
	setChoices(players[0].chat, choices.join(','));
});

bot.command('start', async (ctx) => {
	if (isGameStarted)
		return await ctx.sendMessage('Game in progress π, try again later');
	if (players.length === 0) {
		await ctx.sendMessage(
			`Welcome ${ctx.from.first_name} π, You are the first one here, You get to be the admin! π₯³ `
		);
		players.push({ isAdmin: true, chat: ctx });
		return showChoicesQuestion(ctx, true);
	}
	if (players.find((p) => ctx.from.id === p.chat.from.id)) {
		return await ctx.sendMessage('You are already in the game!');
	}
	await ctx.sendMessage(
		`Welcome ${ctx.from.first_name} π, ${
			players[0].chat.from.first_name
		} is admin, Game starts soon\n\n\π€  ${players.map(
			(l) => l.chat.from.first_name
		)}, ${ctx.from.first_name}`
	);
	players.map((p) =>
		p.chat.sendMessage(
			`${ctx.from.first_name} joined π₯³\n\nπ€ ${players
				.map((l) => l.chat.from.first_name)
				.join(' ,')}, ${ctx.from.first_name}`
		)
	);
	players.push({ isAdmin: false, chat: ctx });
});

bot.on('message', async (ctx) => {
	switch (ctx.message.text) {
		case 'Change choices  π²':
			showChoicesQuestion(ctx);
			break;
		case 'Start game  π':
			startGame(ctx);
			break;
		case 'Reveal chameleon  π₯':
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
				`Game started π\n\nπ² ${choices.join(' , ')}\n\nπ€ ${players
					.map((p) => p.chat.from.first_name)
					.join(' , ')} `
			)
		);
		promises.push(
			p.chat.sendMessage(
				i === chameleonIndex
					? 'You are the chameleon π¦π€«'
					: `π² Describing *"${answer}"*`,
				{ parse_mode: 'MarkdownV2' }
			)
		);
	});
	await Promise.allSettled(promises);
	await players
		.find((p) => p.isAdmin)
		.chat.sendMessage(`Reveal the chameleon when ready π`, {
			reply_markup: {
				keyboard: [[{ text: 'Reveal chameleon  π₯' }]],
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
		promises.push(p.chat.sendMessage('The chameleon is π₯π₯π₯ ...'));
	});
	await Promise.allSettled(promises);

	players.map((p, i) => {
		promises.push(p.chat.sendMessage(`${chameleon.chat.from.first_name} π¦π`));
	});
	await Promise.allSettled(promises);
	reset();
	await setChoices(ctx, choices.join(','));
}

async function showChoicesQuestion(ctx, first = false) {
	if (!first) {
		await ctx.sendMessage(`Current choices:\n\n${choices.join(',')}`, {
			reply_markup: {
				remove_keyboard: true,
			},
		});
	}
	askingChoices = true;
	await ctx.sendMessage(
		'Send me comma separated list of choices *Example:* Obama,Trump, α€α²',
		{ parse_mode: 'MarkdownV2' }
	);
}

async function setChoices(ctx, list) {
	choices = list.split(',');
	askingChoices = false;
	await ctx.sendMessage(`Choices set. Start when ready π!`, {
		reply_markup: {
			keyboard: [
				[{ text: 'Start game  π' }],
				[{ text: 'Change choices  π²' }],
			],
		},
	});
}
