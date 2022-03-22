# Jellyfish Incidents Plugin

Provides the tools to manage outage incidents from within Jellyfish.

# Usage

Below is an example how to use this library:

```typescript
import { channelsPlugin } from '@balena/jellyfish-plugin-channels';
import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { incidentsPlugin } from '@balena/jellyfish-plugin-incidents';
import { PluginManager } from '@balena/jellyfish-worker';

// Load cards from this plugin
const pluginManager = new PluginManager([
	defaultPlugin(),
	channelsPlugin(),
	incidentsPlugin(),
]);
const cards = pluginManager.getCards();
console.dir(cards);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-plugin-incidents/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-plugin-incidents/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-plugin-incidents

# Testing

Unit tests can be easily run with the command `npm test`.
