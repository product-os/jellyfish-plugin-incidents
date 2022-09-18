# Jellyfish Incidents Plugin

Provides the tools to manage outage incidents from within Jellyfish.

# Usage

Below is an example how to use this library:

```typescript
import { incidentsPlugin } from '@balena/jellyfish-plugin-incidents';
import { PluginManager } from '@balena/jellyfish-worker';

// Load contracts from this plugin
const pluginManager = new PluginManager([
	incidentsPlugin(),
]);
const contracts = pluginManager.getCards();
console.dir(contracts);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-plugin-incidents/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-plugin-incidents/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-plugin-incidents

# Testing

Unit tests can be easily run with the command `npm test`.

You can run integration tests locally against Postgres and Redis instances running in `docker-compose`:
```bash
npm run compose
REDIS_HOST=localhost POSTGRES_HOST=localhost npm run test:integration
```

You can also access these Postgres and Redis instances:
```bash
PGPASSWORD=docker psql -hlocalhost -Udocker
redis-cli -h localhost
```
