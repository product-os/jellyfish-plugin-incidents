import { getStatus } from '../../../lib/actions/action-integration-statuspage-import-incident';

describe('getStatus()', () => {
	test('should return "open" on unmatched external status', async () => {
		const externalStatus = 'foobar';
		const result = getStatus(externalStatus);
		expect(result).toEqual('open');
	});

	test('should return matched external status', async () => {
		const externalStatus = 'resolved';
		const result = getStatus(externalStatus);
		expect(result).toEqual('resolved');
	});
});
