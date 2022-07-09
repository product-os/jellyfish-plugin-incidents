import { environment } from '../../../lib/environment';

test('Default environment variable values are set', () => {
	expect(environment).toEqual({
		statuspage: {
			pages: {
				foobar: 'buzbaz',
			},
		},
	});
});
