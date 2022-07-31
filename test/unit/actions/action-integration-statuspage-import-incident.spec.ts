import { testUtils } from 'autumndb';
import nock from 'nock';
import {
	getStatus,
	STATUSPAGE_ENDPOINT,
	validateComponentUpdate,
	validateIncidentUpdate,
} from '../../../lib/actions/action-integration-statuspage-import-incident';

const mock = {
	page: {
		id: 'foobar',
		name: 'ProductOS',
		subdomain: 'productos',
		domain: 'status.jel.ly.fish',
		status_description: 'buzbaz',
	},
	incident: {
		id: testUtils.generateRandomId().split('-')[0],
		status: 'major_outage',
		impact: 'major',
		name: 'ProductOS outage',
	},
	component: {
		id: testUtils.generateRandomId().split('-')[0],
		status: 'degraded_performance',
		name: 'Upstream Hosting Provider - Heroku',
	},
};

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

describe('validateComponentUpdate()', () => {
	test('should throw on invalid incident webhook', async () => {
		// Nock page and incident details
		nock.cleanAll();
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${mock.page.id}`)
			.reply(200, mock.page)
			.get(`/pages/${mock.page.id}/components/${mock.component.id}`)
			.reply(200, mock.component);

		await expect(
			validateComponentUpdate({
				page: {
					id: mock.page.id,
					status_description: mock.page.status_description,
				},
				component: {
					id: mock.incident.id,
					status: 'foobar',
					name: mock.incident.name,
				},
			}),
		).rejects.toThrow();

		nock.cleanAll();
	});
});

describe('validateIncidentUpdate()', () => {
	test('should throw on invalid incident webhook', async () => {
		// Nock page and incident details
		nock.cleanAll();
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${mock.page.id}`)
			.reply(200, mock.page)
			.get(`/pages/${mock.page.id}/incidents/${mock.incident.id}`)
			.reply(200, mock.incident);

		await expect(
			validateIncidentUpdate({
				page: {
					id: mock.page.id,
					status_description: mock.page.status_description,
				},
				incident: {
					id: mock.incident.id,
					status: 'foobar',
					impact: mock.incident.impact,
					name: mock.incident.name,
				},
			}),
		).rejects.toThrow();

		nock.cleanAll();
	});
});
