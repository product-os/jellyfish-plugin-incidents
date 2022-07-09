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

function getPages(): Environment['statuspage']['pages'] | undefined {
	const raw = process.env['INTEGRATION_STATUSPAGE_PAGES'];
	if (!raw || !raw.includes(':')) {
		return undefined;
	}

	const pages = {};
	for (const page of raw.split(',')) {
		const [pageId, token] = page.split(':');
		pages[pageId] = token;
	}
	return pages;
}

export const defaults: Environment = {
	statuspage: {
		pages: {
			foobar: 'buzbaz',
		},
	},
};

export const environment: Environment = {
	statuspage: {
		pages: getPages() || defaults.statuspage.pages,
	},
};
