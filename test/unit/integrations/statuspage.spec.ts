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

	test('should return false if not incident update webhook', async () => {
		const rawEvent = JSON.stringify({
			meta: {
				foo: 'bar',
			},
			page: {
				id: '123',
				status_description: 'Major System Outage',
				buz: 'baz',
			},
			component_update: {
				new_status: 'operational',
				old_status: 'major_outage',
				id: '456',
				buz: 'baz',
			},
			component: {
				status: 'operational',
				id: '456',
				name: 'Some Component',
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
