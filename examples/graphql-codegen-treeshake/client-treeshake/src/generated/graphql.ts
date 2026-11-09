/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type CreateWizardInput = {
  academyId?: any;
  age: number;
  name: string;
  rank: WizardRank;
  specialisation?: SpellSchool | null | undefined;
};

export type PaginationInput = {
  after?: string | null | undefined;
  before?: string | null | undefined;
  first?: number | null | undefined;
  last?: number | null | undefined;
};

export enum SpellDifficulty {
  Advanced = 'ADVANCED',
  Cantrip = 'CANTRIP',
  Intermediate = 'INTERMEDIATE',
  Legendary = 'LEGENDARY',
  Novice = 'NOVICE'
}

export enum SpellSchool {
  Fire = 'FIRE',
  Healing = 'HEALING',
  Ice = 'ICE',
  Illusion = 'ILLUSION',
  Lightning = 'LIGHTNING',
  Shadow = 'SHADOW',
  Transmutation = 'TRANSMUTATION'
}

export type UpdateWizardInput = {
  id: any;
  name?: string | null | undefined;
  rank?: WizardRank | null | undefined;
  specialisation?: SpellSchool | null | undefined;
};

export enum WandCore {
  BasiliskFang = 'BASILISK_FANG',
  DragonHeartstring = 'DRAGON_HEARTSTRING',
  MermaidScale = 'MERMAID_SCALE',
  PhoenixFeather = 'PHOENIX_FEATHER',
  UnicornHair = 'UNICORN_HAIR'
}

export type WizardFilterInput = {
  academyId?: any;
  nameContains?: string | null | undefined;
  rank?: WizardRank | null | undefined;
  specialisation?: SpellSchool | null | undefined;
};

export enum WizardRank {
  Adept = 'ADEPT',
  Apprentice = 'APPRENTICE',
  Archmage = 'ARCHMAGE',
  Grandmaster = 'GRANDMASTER',
  Journeyman = 'JOURNEYMAN'
}

export type WandFieldsFragment = { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string };

export type SpellFieldsFragment = { id: any, name: string, incantation: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints: number | null, healingPoints: number | null };

export type WizardFieldsFragment = { id: any, name: string, rank: WizardRank, age: number, specialisation: SpellSchool | null, createdAt: any, updatedAt: any, wand: { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null };

export type GetWizardQueryVariables = Exact<{
  id: any;
}>;


export type GetWizardQuery = { wizard: { id: any, name: string, rank: WizardRank, age: number, specialisation: SpellSchool | null, createdAt: any, updatedAt: any, spells: Array<{ id: any, name: string, incantation: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints: number | null, healingPoints: number | null }>, familiars: Array<{ id: any, name: string, species: string, magicAffinity: SpellSchool | null, bonded: boolean }>, academy: { id: any, name: string, foundedYear: number } | null, wand: { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } | null };

export type ListWizardsQueryVariables = Exact<{
  filter?: WizardFilterInput | null | undefined;
  pagination?: PaginationInput | null | undefined;
}>;


export type ListWizardsQuery = { wizards: { totalCount: number, pageInfo: { hasNextPage: boolean, endCursor: string | null }, edges: Array<{ cursor: string, node: { id: any, name: string, rank: WizardRank, age: number, specialisation: SpellSchool | null, createdAt: any, updatedAt: any, wand: { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } }> } };

export type GetSpellsQueryVariables = Exact<{
  school?: SpellSchool | null | undefined;
  difficulty?: SpellDifficulty | null | undefined;
}>;


export type GetSpellsQuery = { spells: { totalCount: number, edges: Array<{ node: { id: any, name: string, incantation: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints: number | null, healingPoints: number | null, discoveredBy: { id: any, name: string, rank: WizardRank } | null } }> } };

export type CreateWizardMutationVariables = Exact<{
  input: CreateWizardInput;
}>;


export type CreateWizardMutation = { createWizard: { id: any, name: string, rank: WizardRank, age: number, specialisation: SpellSchool | null, createdAt: any, updatedAt: any, wand: { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } };

export type UpdateWizardMutationVariables = Exact<{
  input: UpdateWizardInput;
}>;


export type UpdateWizardMutation = { updateWizard: { id: any, name: string, rank: WizardRank, age: number, specialisation: SpellSchool | null, createdAt: any, updatedAt: any, wand: { id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } };

export const SpellFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<SpellFieldsFragment, unknown>;
export const WandFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}}]} as unknown as DocumentNode<WandFieldsFragment, unknown>;
export const WizardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}}]} as unknown as DocumentNode<WizardFieldsFragment, unknown>;
export const GetWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}},{"kind":"Field","name":{"kind":"Name","value":"spells"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familiars"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"species"}},{"kind":"Field","name":{"kind":"Name","value":"magicAffinity"}},{"kind":"Field","name":{"kind":"Name","value":"bonded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"academy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"foundedYear"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<GetWizardQuery, GetWizardQueryVariables>;
export const ListWizardsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWizards"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WizardFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PaginationInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wizards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ListWizardsQuery, ListWizardsQueryVariables>;
export const GetSpellsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSpells"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"school"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellSchool"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"difficulty"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellDifficulty"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spells"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"school"},"value":{"kind":"Variable","name":{"kind":"Name","value":"school"}}},{"kind":"Argument","name":{"kind":"Name","value":"difficulty"},"value":{"kind":"Variable","name":{"kind":"Name","value":"difficulty"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellFields"}},{"kind":"Field","name":{"kind":"Name","value":"discoveredBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<GetSpellsQuery, GetSpellsQueryVariables>;
export const CreateWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWizardInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateWizardMutation, CreateWizardMutationVariables>;
export const UpdateWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWizardInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateWizardMutation, UpdateWizardMutationVariables>;