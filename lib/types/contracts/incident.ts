import type {
	Contract,
	ContractDefinition,
} from '@balena/jellyfish-types/build/core';

export type IncidentData = IncidentDataGeneric & IncidentDataSpecific;

export interface IncidentDataGeneric {
	[k: string]: unknown;
}

export interface IncidentDataSpecific {
	title: string;
	description: string;
	status: string;
	mirrors: string[];
}

export interface IncidentContractDefinition
	extends ContractDefinition<IncidentData> {}

export interface IncidentContract extends Contract<IncidentData> {}
