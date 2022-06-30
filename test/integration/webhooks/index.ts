export default {
	down: {
		expected: require('./down/expected.json'),
		steps: [require('./down/01.json')],
	},
	'down-then-up': {
		expected: require('./down-then-up/expected.json'),
		steps: [
			require('./down-then-up/01.json'),
			require('./down-then-up/02.json'),
		],
	},
};
