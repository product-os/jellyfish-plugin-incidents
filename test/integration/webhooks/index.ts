export default {
	'major-outage': {
		expected: require('./major-outage/expected.json'),
		steps: [require('./major-outage/01.json')],
	},
	'major-outage-then-resolved': {
		expected: require('./major-outage-then-resolved/expected.json'),
		steps: [
			require('./major-outage-then-resolved/01.json'),
			require('./major-outage-then-resolved/02.json'),
		],
	},
};
