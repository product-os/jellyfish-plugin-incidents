/**
 * This module uses the following environment variables:
 * - INTEGRATION_STATUSPAGE_PAGES
 *   - List of page ID and API token pairs
 *   - INTEGRATION_STATUSPAGE_PAGES="foo:bar,buz:baz"
 */
interface Environment {
	statuspage: {
		pages: {
			[key: string]: string;
		};
	};
}

const pages = {};
for (const page of (
	process.env['INTEGRATION_STATUSPAGE_PAGES'] || 'foobar:buzbaz'
).split(',')) {
	const [pageId, token] = page.split(':');
	pages[pageId] = token;
}

export const environment: Environment = {
	statuspage: {
		pages,
	},
};
