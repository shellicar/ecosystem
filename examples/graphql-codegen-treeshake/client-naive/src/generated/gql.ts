/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "fragment WandFields on Wand {\n  id\n  wood\n  core\n  lengthInches\n  flexibility\n}\n\nfragment SpellFields on Spell {\n  id\n  name\n  incantation\n  school\n  difficulty\n  description\n  damagePoints\n  healingPoints\n}\n\nfragment WizardFields on Wizard {\n  id\n  name\n  rank\n  age\n  specialisation\n  wand {\n    ...WandFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetWizard($id: UUID!) {\n  wizard(id: $id) {\n    ...WizardFields\n    spells {\n      ...SpellFields\n    }\n    familiars {\n      id\n      name\n      species\n      magicAffinity\n      bonded\n    }\n    academy {\n      id\n      name\n      foundedYear\n    }\n  }\n}\n\nquery ListWizards($filter: WizardFilterInput, $pagination: PaginationInput) {\n  wizards(filter: $filter, pagination: $pagination) {\n    totalCount\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        ...WizardFields\n      }\n    }\n  }\n}\n\nquery GetSpells($school: SpellSchool, $difficulty: SpellDifficulty) {\n  spells(school: $school, difficulty: $difficulty) {\n    totalCount\n    edges {\n      node {\n        ...SpellFields\n        discoveredBy {\n          id\n          name\n          rank\n        }\n      }\n    }\n  }\n}\n\nmutation CreateWizard($input: CreateWizardInput!) {\n  createWizard(input: $input) {\n    ...WizardFields\n  }\n}\n\nmutation UpdateWizard($input: UpdateWizardInput!) {\n  updateWizard(input: $input) {\n    ...WizardFields\n  }\n}": typeof types.WandFieldsFragmentDoc,
};
const documents: Documents = {
    "fragment WandFields on Wand {\n  id\n  wood\n  core\n  lengthInches\n  flexibility\n}\n\nfragment SpellFields on Spell {\n  id\n  name\n  incantation\n  school\n  difficulty\n  description\n  damagePoints\n  healingPoints\n}\n\nfragment WizardFields on Wizard {\n  id\n  name\n  rank\n  age\n  specialisation\n  wand {\n    ...WandFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetWizard($id: UUID!) {\n  wizard(id: $id) {\n    ...WizardFields\n    spells {\n      ...SpellFields\n    }\n    familiars {\n      id\n      name\n      species\n      magicAffinity\n      bonded\n    }\n    academy {\n      id\n      name\n      foundedYear\n    }\n  }\n}\n\nquery ListWizards($filter: WizardFilterInput, $pagination: PaginationInput) {\n  wizards(filter: $filter, pagination: $pagination) {\n    totalCount\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        ...WizardFields\n      }\n    }\n  }\n}\n\nquery GetSpells($school: SpellSchool, $difficulty: SpellDifficulty) {\n  spells(school: $school, difficulty: $difficulty) {\n    totalCount\n    edges {\n      node {\n        ...SpellFields\n        discoveredBy {\n          id\n          name\n          rank\n        }\n      }\n    }\n  }\n}\n\nmutation CreateWizard($input: CreateWizardInput!) {\n  createWizard(input: $input) {\n    ...WizardFields\n  }\n}\n\nmutation UpdateWizard($input: UpdateWizardInput!) {\n  updateWizard(input: $input) {\n    ...WizardFields\n  }\n}": types.WandFieldsFragmentDoc,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "fragment WandFields on Wand {\n  id\n  wood\n  core\n  lengthInches\n  flexibility\n}\n\nfragment SpellFields on Spell {\n  id\n  name\n  incantation\n  school\n  difficulty\n  description\n  damagePoints\n  healingPoints\n}\n\nfragment WizardFields on Wizard {\n  id\n  name\n  rank\n  age\n  specialisation\n  wand {\n    ...WandFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetWizard($id: UUID!) {\n  wizard(id: $id) {\n    ...WizardFields\n    spells {\n      ...SpellFields\n    }\n    familiars {\n      id\n      name\n      species\n      magicAffinity\n      bonded\n    }\n    academy {\n      id\n      name\n      foundedYear\n    }\n  }\n}\n\nquery ListWizards($filter: WizardFilterInput, $pagination: PaginationInput) {\n  wizards(filter: $filter, pagination: $pagination) {\n    totalCount\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        ...WizardFields\n      }\n    }\n  }\n}\n\nquery GetSpells($school: SpellSchool, $difficulty: SpellDifficulty) {\n  spells(school: $school, difficulty: $difficulty) {\n    totalCount\n    edges {\n      node {\n        ...SpellFields\n        discoveredBy {\n          id\n          name\n          rank\n        }\n      }\n    }\n  }\n}\n\nmutation CreateWizard($input: CreateWizardInput!) {\n  createWizard(input: $input) {\n    ...WizardFields\n  }\n}\n\nmutation UpdateWizard($input: UpdateWizardInput!) {\n  updateWizard(input: $input) {\n    ...WizardFields\n  }\n}"): (typeof documents)["fragment WandFields on Wand {\n  id\n  wood\n  core\n  lengthInches\n  flexibility\n}\n\nfragment SpellFields on Spell {\n  id\n  name\n  incantation\n  school\n  difficulty\n  description\n  damagePoints\n  healingPoints\n}\n\nfragment WizardFields on Wizard {\n  id\n  name\n  rank\n  age\n  specialisation\n  wand {\n    ...WandFields\n  }\n  createdAt\n  updatedAt\n}\n\nquery GetWizard($id: UUID!) {\n  wizard(id: $id) {\n    ...WizardFields\n    spells {\n      ...SpellFields\n    }\n    familiars {\n      id\n      name\n      species\n      magicAffinity\n      bonded\n    }\n    academy {\n      id\n      name\n      foundedYear\n    }\n  }\n}\n\nquery ListWizards($filter: WizardFilterInput, $pagination: PaginationInput) {\n  wizards(filter: $filter, pagination: $pagination) {\n    totalCount\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    edges {\n      cursor\n      node {\n        ...WizardFields\n      }\n    }\n  }\n}\n\nquery GetSpells($school: SpellSchool, $difficulty: SpellDifficulty) {\n  spells(school: $school, difficulty: $difficulty) {\n    totalCount\n    edges {\n      node {\n        ...SpellFields\n        discoveredBy {\n          id\n          name\n          rank\n        }\n      }\n    }\n  }\n}\n\nmutation CreateWizard($input: CreateWizardInput!) {\n  createWizard(input: $input) {\n    ...WizardFields\n  }\n}\n\nmutation UpdateWizard($input: UpdateWizardInput!) {\n  updateWizard(input: $input) {\n    ...WizardFields\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;