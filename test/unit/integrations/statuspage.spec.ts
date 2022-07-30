import { v4 as uuidv4 } from 'uuid';
import { statuspageIntegrationDefinition } from '../../../lib/integrations/statuspage';

const logContext = {
	id: `test-${uuidv4()}`,
};

describe('isEventValid()', () => {
	test('should return true for incident update webhooks', async () => {
		const rawEvent = JSON.stringify({
			meta: {
				foo: 'bar',
			},
			page: {
				id: '123',
				status_description: 'Major System Outage',
				buz: 'baz',
			},
			incident: {
				status: 'monitoring',
				id: '456',
				buz: 'baz',
			},
		});

		const result = statuspageIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
			},
			rawEvent,
			{},
		);
		expect(result).toBe(true);
	});

	test('should return true for component update webhooks', async () => {
		const rawEvent = JSON.stringify({
			meta: {
				foo: 'bar',
			},
			page: {
				id: '123',
				status_description: 'Major System Outage',
				buz: 'baz',
			},
			component: {
				status: 'monitoring',
				id: '456',
				name: 'baz',
			},
		});

		const result = statuspageIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
			},
			rawEvent,
			{},
		);
		expect(result).toBe(true);
	});

	test('should return false if not an incident or component update webhook', async () => {
		const rawEvent = JSON.stringify({
			foo: {
				buz: 'baz',
			},
		});

		const result = statuspageIntegrationDefinition.isEventValid(
			logContext,
			{
				api: 'xxxxx',
			},
			rawEvent,
			{},
		);
		expect(result).toBe(false);
	});
});
