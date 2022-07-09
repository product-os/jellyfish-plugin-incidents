process.env.INTEGRATION_STATUSPAGE_PAGES = 'foo:bar,buz:baz';
import { environment } from '../../../lib/environment';

afterAll(() => {
	delete process.env.INTEGRATION_STATUSPAGE_PAGES;
});

test('Can override environment variable defaults', () => {
	expect(environment).toEqual({
		statuspage: {
			pages: {
				foo: 'bar',
				buz: 'baz',
			},
		},
	});
});
