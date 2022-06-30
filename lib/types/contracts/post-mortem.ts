import type {
	Contract,
	ContractDefinition,
} from '@balena/jellyfish-types/build/core';

export type PostMortemData = PostMortemDataGeneric & PostMortemDataSpecific;

export interface PostMortemDataGeneric {
	[k: string]: unknown;
}

export interface PostMortemDataSpecific {
	title: string;
	description: string;
	status: string;
	mirrors: string[];
}

export interface PostMortemContractDefinition
	extends ContractDefinition<PostMortemData> {}

export interface PostMortemContract extends Contract<PostMortemData> {}
