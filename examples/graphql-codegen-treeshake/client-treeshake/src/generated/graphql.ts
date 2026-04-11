/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  UUID: { input: any; output: any; }
};

export type Audited = {
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CreateWizardInput = {
  academyId?: InputMaybe<Scalars['UUID']['input']>;
  age: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  rank: WizardRank;
  specialisation?: InputMaybe<SpellSchool>;
};

export type Familiar = Node & {
  __typename?: 'Familiar';
  bonded: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  magicAffinity?: Maybe<SpellSchool>;
  name: Scalars['String']['output'];
  species: Scalars['String']['output'];
  wizard?: Maybe<Wizard>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createWizard: Wizard;
  updateWizard: Wizard;
};


export type MutationCreateWizardArgs = {
  input: CreateWizardInput;
};


export type MutationUpdateWizardArgs = {
  input: UpdateWizardInput;
};

export type Node = {
  id: Scalars['UUID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PaginationInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export type Potion = Node & {
  __typename?: 'Potion';
  brewTimeHours: Scalars['Int']['output'];
  brewer?: Maybe<Wizard>;
  effect: PotionEffect;
  id: Scalars['UUID']['output'];
  ingredients: Array<Scalars['String']['output']>;
  isLegal: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export enum PotionEffect {
  CurseRemoval = 'CURSE_REMOVAL',
  Flying = 'FLYING',
  Healing = 'HEALING',
  Invisibility = 'INVISIBILITY',
  LovePotion = 'LOVE_POTION',
  Strength = 'STRENGTH',
  TruthSerum = 'TRUTH_SERUM'
}

export type Query = {
  __typename?: 'Query';
  potion?: Maybe<Potion>;
  spell?: Maybe<Spell>;
  spells: SpellConnection;
  wand?: Maybe<Wand>;
  wizard?: Maybe<Wizard>;
  wizardAcademy?: Maybe<WizardAcademy>;
  wizards: WizardConnection;
};


export type QueryPotionArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerySpellArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerySpellsArgs = {
  difficulty?: InputMaybe<SpellDifficulty>;
  pagination?: InputMaybe<PaginationInput>;
  school?: InputMaybe<SpellSchool>;
};


export type QueryWandArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryWizardArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryWizardAcademyArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryWizardsArgs = {
  filter?: InputMaybe<WizardFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
};

export type Spell = Node & Timestamped & {
  __typename?: 'Spell';
  createdAt: Scalars['DateTime']['output'];
  damagePoints?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  difficulty: SpellDifficulty;
  discoveredBy?: Maybe<Wizard>;
  healingPoints?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  incantation?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  school: SpellSchool;
  updatedAt: Scalars['DateTime']['output'];
};

export type SpellConnection = {
  __typename?: 'SpellConnection';
  edges: Array<SpellEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum SpellDifficulty {
  Advanced = 'ADVANCED',
  Cantrip = 'CANTRIP',
  Intermediate = 'INTERMEDIATE',
  Legendary = 'LEGENDARY',
  Novice = 'NOVICE'
}

export type SpellEdge = {
  __typename?: 'SpellEdge';
  cursor: Scalars['String']['output'];
  node: Spell;
};

export enum SpellSchool {
  Fire = 'FIRE',
  Healing = 'HEALING',
  Ice = 'ICE',
  Illusion = 'ILLUSION',
  Lightning = 'LIGHTNING',
  Shadow = 'SHADOW',
  Transmutation = 'TRANSMUTATION'
}

export type Subscription = {
  __typename?: 'Subscription';
  wizardRankChanged: Wizard;
};


export type SubscriptionWizardRankChangedArgs = {
  wizardId: Scalars['UUID']['input'];
};

export type Timestamped = {
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UpdateWizardInput = {
  id: Scalars['UUID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  rank?: InputMaybe<WizardRank>;
  specialisation?: InputMaybe<SpellSchool>;
};

export type Wand = Node & {
  __typename?: 'Wand';
  core: WandCore;
  flexibility: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  lengthInches: Scalars['Float']['output'];
  owner?: Maybe<Wizard>;
  wood: Scalars['String']['output'];
};

export enum WandCore {
  BasiliskFang = 'BASILISK_FANG',
  DragonHeartstring = 'DRAGON_HEARTSTRING',
  MermaidScale = 'MERMAID_SCALE',
  PhoenixFeather = 'PHOENIX_FEATHER',
  UnicornHair = 'UNICORN_HAIR'
}

export type Wizard = Node & Timestamped & {
  __typename?: 'Wizard';
  academy?: Maybe<WizardAcademy>;
  age: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  familiars: Array<Familiar>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  potions: Array<Potion>;
  rank: WizardRank;
  specialisation?: Maybe<SpellSchool>;
  spells: Array<Spell>;
  updatedAt: Scalars['DateTime']['output'];
  wand?: Maybe<Wand>;
};

export type WizardAcademy = Audited & Node & {
  __typename?: 'WizardAcademy';
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  faculty: Array<Wizard>;
  foundedYear: Scalars['Int']['output'];
  headmaster?: Maybe<Wizard>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  spellLibrary: SpellConnection;
  students: WizardConnection;
  updatedAt: Scalars['DateTime']['output'];
};

export type WizardConnection = {
  __typename?: 'WizardConnection';
  edges: Array<WizardEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WizardEdge = {
  __typename?: 'WizardEdge';
  cursor: Scalars['String']['output'];
  node: Wizard;
};

export type WizardFilterInput = {
  academyId?: InputMaybe<Scalars['UUID']['input']>;
  nameContains?: InputMaybe<Scalars['String']['input']>;
  rank?: InputMaybe<WizardRank>;
  specialisation?: InputMaybe<SpellSchool>;
};

export enum WizardRank {
  Adept = 'ADEPT',
  Apprentice = 'APPRENTICE',
  Archmage = 'ARCHMAGE',
  Grandmaster = 'GRANDMASTER',
  Journeyman = 'JOURNEYMAN'
}

export type WandFieldsFragment = { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string };

export type SpellFieldsFragment = { __typename?: 'Spell', id: any, name: string, incantation?: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints?: number | null, healingPoints?: number | null };

export type WizardFieldsFragment = { __typename?: 'Wizard', id: any, name: string, rank: WizardRank, age: number, specialisation?: SpellSchool | null, createdAt: any, updatedAt: any, wand?: { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null };

export type GetWizardQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetWizardQuery = { __typename?: 'Query', wizard?: { __typename?: 'Wizard', id: any, name: string, rank: WizardRank, age: number, specialisation?: SpellSchool | null, createdAt: any, updatedAt: any, spells: Array<{ __typename?: 'Spell', id: any, name: string, incantation?: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints?: number | null, healingPoints?: number | null }>, familiars: Array<{ __typename?: 'Familiar', id: any, name: string, species: string, magicAffinity?: SpellSchool | null, bonded: boolean }>, academy?: { __typename?: 'WizardAcademy', id: any, name: string, foundedYear: number } | null, wand?: { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } | null };

export type ListWizardsQueryVariables = Exact<{
  filter?: InputMaybe<WizardFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
}>;


export type ListWizardsQuery = { __typename?: 'Query', wizards: { __typename?: 'WizardConnection', totalCount: number, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, edges: Array<{ __typename?: 'WizardEdge', cursor: string, node: { __typename?: 'Wizard', id: any, name: string, rank: WizardRank, age: number, specialisation?: SpellSchool | null, createdAt: any, updatedAt: any, wand?: { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } }> } };

export type GetSpellsQueryVariables = Exact<{
  school?: InputMaybe<SpellSchool>;
  difficulty?: InputMaybe<SpellDifficulty>;
}>;


export type GetSpellsQuery = { __typename?: 'Query', spells: { __typename?: 'SpellConnection', totalCount: number, edges: Array<{ __typename?: 'SpellEdge', node: { __typename?: 'Spell', id: any, name: string, incantation?: string | null, school: SpellSchool, difficulty: SpellDifficulty, description: string, damagePoints?: number | null, healingPoints?: number | null, discoveredBy?: { __typename?: 'Wizard', id: any, name: string, rank: WizardRank } | null } }> } };

export type CreateWizardMutationVariables = Exact<{
  input: CreateWizardInput;
}>;


export type CreateWizardMutation = { __typename?: 'Mutation', createWizard: { __typename?: 'Wizard', id: any, name: string, rank: WizardRank, age: number, specialisation?: SpellSchool | null, createdAt: any, updatedAt: any, wand?: { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } };

export type UpdateWizardMutationVariables = Exact<{
  input: UpdateWizardInput;
}>;


export type UpdateWizardMutation = { __typename?: 'Mutation', updateWizard: { __typename?: 'Wizard', id: any, name: string, rank: WizardRank, age: number, specialisation?: SpellSchool | null, createdAt: any, updatedAt: any, wand?: { __typename?: 'Wand', id: any, wood: string, core: WandCore, lengthInches: number, flexibility: string } | null } };

export const SpellFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<SpellFieldsFragment, unknown>;
export const WandFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}}]} as unknown as DocumentNode<WandFieldsFragment, unknown>;
export const WizardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}}]} as unknown as DocumentNode<WizardFieldsFragment, unknown>;
export const GetWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}},{"kind":"Field","name":{"kind":"Name","value":"spells"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"familiars"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"species"}},{"kind":"Field","name":{"kind":"Name","value":"magicAffinity"}},{"kind":"Field","name":{"kind":"Name","value":"bonded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"academy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"foundedYear"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<GetWizardQuery, GetWizardQueryVariables>;
export const ListWizardsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListWizards"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"WizardFilterInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PaginationInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"wizards"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cursor"}},{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ListWizardsQuery, ListWizardsQueryVariables>;
export const GetSpellsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSpells"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"school"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellSchool"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"difficulty"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SpellDifficulty"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"spells"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"school"},"value":{"kind":"Variable","name":{"kind":"Name","value":"school"}}},{"kind":"Argument","name":{"kind":"Name","value":"difficulty"},"value":{"kind":"Variable","name":{"kind":"Name","value":"difficulty"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SpellFields"}},{"kind":"Field","name":{"kind":"Name","value":"discoveredBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SpellFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Spell"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"incantation"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"difficulty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"damagePoints"}},{"kind":"Field","name":{"kind":"Name","value":"healingPoints"}}]}}]} as unknown as DocumentNode<GetSpellsQuery, GetSpellsQueryVariables>;
export const CreateWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWizardInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createWizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateWizardMutation, CreateWizardMutationVariables>;
export const UpdateWizardDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateWizard"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateWizardInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateWizard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WizardFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WandFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wand"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"wood"}},{"kind":"Field","name":{"kind":"Name","value":"core"}},{"kind":"Field","name":{"kind":"Name","value":"lengthInches"}},{"kind":"Field","name":{"kind":"Name","value":"flexibility"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"WizardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Wizard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"age"}},{"kind":"Field","name":{"kind":"Name","value":"specialisation"}},{"kind":"Field","name":{"kind":"Name","value":"wand"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"WandFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateWizardMutation, UpdateWizardMutationVariables>;