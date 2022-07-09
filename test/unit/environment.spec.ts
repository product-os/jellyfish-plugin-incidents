import { environment } from '../../lib/environment';

describe('Environment variables', () => {
	test('Default values are set', () => {
		expect(environment).toEqual({
			statuspage: {
				pages: {
					foobar: 'buzbaz',
				},
			},
		});
	});
});
