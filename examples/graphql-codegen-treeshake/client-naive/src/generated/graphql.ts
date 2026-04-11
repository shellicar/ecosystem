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
  JSON: { input: any; output: any; }
  UUID: { input: any; output: any; }
};

export type AddPairingInput = {
  category: PairingCategory;
  cheeseId: Scalars['UUID']['input'];
  description: Scalars['String']['input'];
  harmonyScore: Scalars['Int']['input'];
  name: Scalars['String']['input'];
};

export type AgeingReport = {
  __typename?: 'AgeingReport';
  cave: AgingCave;
  cheese: Cheese;
  currentMouldCoverage: Scalars['Float']['output'];
  projectedReadyDate: Scalars['DateTime']['output'];
  recommendedAction: Scalars['String']['output'];
  startDate: Scalars['DateTime']['output'];
};

export type AgingCave = Node & Timestamped & {
  __typename?: 'AgingCave';
  capacityWheels: Scalars['Int']['output'];
  cheeses: CheeseConnection;
  climate: CaveClimate;
  createdAt: Scalars['DateTime']['output'];
  currentOccupancy: Scalars['Int']['output'];
  humidityPercent: Scalars['Float']['output'];
  id: Scalars['UUID']['output'];
  knownHaunted: Scalars['Boolean']['output'];
  location: Scalars['String']['output'];
  name: Scalars['String']['output'];
  temperatureCelsius: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export enum AgingStage {
  Aged = 'AGED',
  Ancient = 'ANCIENT',
  ExtraAged = 'EXTRA_AGED',
  Fresh = 'FRESH',
  PossiblySentient = 'POSSIBLY_SENTIENT',
  Young = 'YOUNG'
}

export type Alien = Node & Timestamped & {
  __typename?: 'Alien';
  createdAt: Scalars['DateTime']['output'];
  currentStation?: Maybe<SpaceStation>;
  disposition: AlienDisposition;
  homeworld: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  languages: Array<Scalars['String']['output']>;
  missions: Array<Mission>;
  name: Scalars['String']['output'];
  numberOfLimbs: Scalars['Int']['output'];
  speaksCommon: Scalars['Boolean']['output'];
  species: AlienSpecies;
  updatedAt: Scalars['DateTime']['output'];
};

export type AlienConnection = {
  __typename?: 'AlienConnection';
  edges: Array<AlienEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export enum AlienDisposition {
  Friendly = 'FRIENDLY',
  Hostile = 'HOSTILE',
  Neutral = 'NEUTRAL',
  PhilosophicallyConfused = 'PHILOSOPHICALLY_CONFUSED',
  TradeHungry = 'TRADE_HUNGRY'
}

export type AlienEdge = {
  __typename?: 'AlienEdge';
  cursor: Scalars['String']['output'];
  node: Alien;
};

export type AlienFilterInput = {
  disposition?: InputMaybe<AlienDisposition>;
  speaksCommon?: InputMaybe<Scalars['Boolean']['input']>;
  species?: InputMaybe<AlienSpecies>;
  stationId?: InputMaybe<Scalars['UUID']['input']>;
};

export enum AlienSpecies {
  Crystalline = 'CRYSTALLINE',
  Glorp = 'GLORP',
  HiveMind = 'HIVE_MIND',
  SiliconBeing = 'SILICON_BEING',
  TentacledElder = 'TENTACLED_ELDER',
  VoidSpawn = 'VOID_SPAWN',
  Zorblaxian = 'ZORBLAXIAN'
}

export type Audited = {
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type BrewPotionInput = {
  brewerId: Scalars['UUID']['input'];
  effect: PotionEffect;
  ingredients: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type BrewingLog = {
  __typename?: 'BrewingLog';
  brewer: Wizard;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['UUID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  potion: Potion;
  startedAt: Scalars['DateTime']['output'];
};

export type CastSpellInput = {
  powerLevel?: InputMaybe<Scalars['Int']['input']>;
  spellId: Scalars['UUID']['input'];
  targetId?: InputMaybe<Scalars['UUID']['input']>;
  wizardId: Scalars['UUID']['input'];
};

export enum CaveClimate {
  Cold = 'COLD',
  Dry = 'DRY',
  Humid = 'HUMID',
  Mysterious = 'MYSTERIOUS',
  Temperate = 'TEMPERATE'
}

export type Cheese = Node & Timestamped & {
  __typename?: 'Cheese';
  agingMonths: Scalars['Int']['output'];
  agingStage: AgingStage;
  awards: Array<CheeseAward>;
  cave?: Maybe<AgingCave>;
  createdAt: Scalars['DateTime']['output'];
  flavourProfile: Array<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  isSentient: Scalars['Boolean']['output'];
  isVegetarian: Scalars['Boolean']['output'];
  maker?: Maybe<Cheesemaker>;
  milkSource: MilkSource;
  name: Scalars['String']['output'];
  originCountry: Scalars['String']['output'];
  pairings: Array<Pairing>;
  smellRating: Scalars['Int']['output'];
  type: CheeseType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CheeseAward = Node & {
  __typename?: 'CheeseAward';
  awardedTo?: Maybe<Cheese>;
  awardedToMaker?: Maybe<Cheesemaker>;
  category: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  prestige: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type CheeseCompetition = {
  __typename?: 'CheeseCompetition';
  awards: Array<CheeseAward>;
  entries: Array<Cheese>;
  id: Scalars['UUID']['output'];
  judges: Array<Cheesemaker>;
  location: Scalars['String']['output'];
  name: Scalars['String']['output'];
  year: Scalars['Int']['output'];
};

export type CheeseConnection = {
  __typename?: 'CheeseConnection';
  edges: Array<CheeseEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CheeseEdge = {
  __typename?: 'CheeseEdge';
  cursor: Scalars['String']['output'];
  node: Cheese;
};

export type CheeseEdge2 = {
  __typename?: 'CheeseEdge2';
  cursor: Scalars['String']['output'];
  node: Cheesemaker;
};

export type CheeseEdgeConnection = {
  __typename?: 'CheeseEdgeConnection';
  edges: Array<CheeseEdge2>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CheeseFilterInput = {
  agingStage?: InputMaybe<AgingStage>;
  isSentient?: InputMaybe<Scalars['Boolean']['input']>;
  maxSmellRating?: InputMaybe<Scalars['Int']['input']>;
  milkSource?: InputMaybe<MilkSource>;
  originCountry?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<CheeseType>;
};

export enum CheeseType {
  Blue = 'BLUE',
  Fresh = 'FRESH',
  Hard = 'HARD',
  Processed = 'PROCESSED',
  SemiHard = 'SEMI_HARD',
  SemiSoft = 'SEMI_SOFT',
  Smoked = 'SMOKED',
  Soft = 'SOFT'
}

export type Cheesemaker = Audited & Node & {
  __typename?: 'Cheesemaker';
  awards: Array<CheeseAward>;
  believesCheeseIsSentient: Scalars['Boolean']['output'];
  cheeses: CheeseConnection;
  country: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  motto?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  speciality: CheeseType;
  updatedAt: Scalars['DateTime']['output'];
  yearsOfExperience: Scalars['Int']['output'];
};

export type CreateAlienInput = {
  disposition: AlienDisposition;
  homeworld: Scalars['String']['input'];
  languages?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
  numberOfLimbs: Scalars['Int']['input'];
  speaksCommon: Scalars['Boolean']['input'];
  species: AlienSpecies;
};

export type CreateCheeseInput = {
  agingMonths: Scalars['Int']['input'];
  caveId?: InputMaybe<Scalars['UUID']['input']>;
  flavourProfile: Array<Scalars['String']['input']>;
  isVegetarian: Scalars['Boolean']['input'];
  makerId?: InputMaybe<Scalars['UUID']['input']>;
  milkSource: MilkSource;
  name: Scalars['String']['input'];
  originCountry: Scalars['String']['input'];
  type: CheeseType;
};

export type CreateWizardInput = {
  academyId?: InputMaybe<Scalars['UUID']['input']>;
  age: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  rank: WizardRank;
  specialisation?: InputMaybe<SpellSchool>;
};

export type DiplomacyReport = {
  __typename?: 'DiplomacyReport';
  contactedSpecies: AlienSpecies;
  incidentsReported: Scalars['Int']['output'];
  mission: Mission;
  outcome: Scalars['String']['output'];
  treatyProposed: Scalars['Boolean']['output'];
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

export enum FuelType {
  Antimatter = 'ANTIMATTER',
  DarkEnergy = 'DARK_ENERGY',
  HopeAndDreams = 'HOPE_AND_DREAMS',
  RecycledWishes = 'RECYCLED_WISHES'
}

export type LaunchMissionInput = {
  crewIds: Array<Scalars['UUID']['input']>;
  description: Scalars['String']['input'];
  destination: Scalars['String']['input'];
  estimatedDurationDays: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  shipId: Scalars['UUID']['input'];
  type: MissionType;
};

export enum MilkSource {
  AlienCow = 'ALIEN_COW',
  Buffalo = 'BUFFALO',
  Cow = 'COW',
  Goat = 'GOAT',
  Sheep = 'SHEEP',
  Yeti = 'YETI'
}

export type Mission = Node & Timestamped & {
  __typename?: 'Mission';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  crew: Array<Alien>;
  description: Scalars['String']['output'];
  destination: Scalars['String']['output'];
  estimatedDurationDays: Scalars['Int']['output'];
  id: Scalars['UUID']['output'];
  launchedAt?: Maybe<Scalars['DateTime']['output']>;
  missionLog: Array<MissionLogEntry>;
  name: Scalars['String']['output'];
  ship?: Maybe<Spaceship>;
  status: MissionStatus;
  successProbability?: Maybe<Scalars['Float']['output']>;
  type: MissionType;
  updatedAt: Scalars['DateTime']['output'];
};

export type MissionLogEntry = {
  __typename?: 'MissionLogEntry';
  message: Scalars['String']['output'];
  reportedBy?: Maybe<Alien>;
  severity: Scalars['String']['output'];
  timestamp: Scalars['DateTime']['output'];
};

export enum MissionStatus {
  CatastrophicallyFailed = 'CATASTROPHICALLY_FAILED',
  Completed = 'COMPLETED',
  InProgress = 'IN_PROGRESS',
  Launched = 'LAUNCHED',
  Planned = 'PLANNED',
  ProbablyFine = 'PROBABLY_FINE'
}

export enum MissionType {
  Cargo = 'CARGO',
  CheeseDelivery = 'CHEESE_DELIVERY',
  Diplomacy = 'DIPLOMACY',
  Exploration = 'EXPLORATION',
  Rescue = 'RESCUE',
  Surveillance = 'SURVEILLANCE'
}

export type Mutation = {
  __typename?: 'Mutation';
  addPairing: Pairing;
  brewPotion: Potion;
  castSpell: SpellCastResult;
  createAlien: Alien;
  createCheese: Cheese;
  createWizard: Wizard;
  launchMission: Mission;
  updateAging: Cheese;
  updateMissionStatus: Mission;
  updateWizard: Wizard;
};


export type MutationAddPairingArgs = {
  input: AddPairingInput;
};


export type MutationBrewPotionArgs = {
  input: BrewPotionInput;
};


export type MutationCastSpellArgs = {
  input: CastSpellInput;
};


export type MutationCreateAlienArgs = {
  input: CreateAlienInput;
};


export type MutationCreateCheeseArgs = {
  input: CreateCheeseInput;
};


export type MutationCreateWizardArgs = {
  input: CreateWizardInput;
};


export type MutationLaunchMissionArgs = {
  input: LaunchMissionInput;
};


export type MutationUpdateAgingArgs = {
  input: UpdateAgingInput;
};


export type MutationUpdateMissionStatusArgs = {
  input: UpdateMissionStatusInput;
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

export type Pairing = Node & {
  __typename?: 'Pairing';
  category: PairingCategory;
  cheese: Cheese;
  description: Scalars['String']['output'];
  harmonyScore: Scalars['Int']['output'];
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export enum PairingCategory {
  Beer = 'BEER',
  Bread = 'BREAD',
  ExistentialDespair = 'EXISTENTIAL_DESPAIR',
  Fruit = 'FRUIT',
  Honey = 'HONEY',
  Whisky = 'WHISKY',
  Wine = 'WINE'
}

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
  agingCave?: Maybe<AgingCave>;
  agingCaves: Array<AgingCave>;
  alien?: Maybe<Alien>;
  aliens: AlienConnection;
  cheese?: Maybe<Cheese>;
  cheesemaker?: Maybe<Cheesemaker>;
  cheesemakers: Array<Cheesemaker>;
  cheeses: CheeseConnection;
  mission?: Maybe<Mission>;
  missions: Array<Mission>;
  pairing?: Maybe<Pairing>;
  potion?: Maybe<Potion>;
  search: SearchResultConnection;
  spaceStation?: Maybe<SpaceStation>;
  spaceship?: Maybe<Spaceship>;
  spaceships: SpaceshipConnection;
  spell?: Maybe<Spell>;
  spells: SpellConnection;
  wand?: Maybe<Wand>;
  wizard?: Maybe<Wizard>;
  wizardAcademies: WizardAcademyConnection;
  wizardAcademy?: Maybe<WizardAcademy>;
  wizards: WizardConnection;
};


export type QueryAgingCaveArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryAgingCavesArgs = {
  climate?: InputMaybe<CaveClimate>;
};


export type QueryAlienArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryAliensArgs = {
  filter?: InputMaybe<AlienFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryCheeseArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCheesemakerArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryCheesemakersArgs = {
  country?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryCheesesArgs = {
  filter?: InputMaybe<CheeseFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryMissionArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryMissionsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  status?: InputMaybe<MissionStatus>;
  type?: InputMaybe<MissionType>;
};


export type QueryPairingArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryPotionArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerySearchArgs = {
  query: Scalars['String']['input'];
  types?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type QuerySpaceStationArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerySpaceshipArgs = {
  id: Scalars['UUID']['input'];
};


export type QuerySpaceshipsArgs = {
  class?: InputMaybe<SpaceshipClass>;
  pagination?: InputMaybe<PaginationInput>;
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


export type QueryWizardAcademiesArgs = {
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryWizardAcademyArgs = {
  id: Scalars['UUID']['input'];
};


export type QueryWizardsArgs = {
  filter?: InputMaybe<WizardFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
};

export type SearchResult = Alien | Cheese | Cheesemaker | SpaceStation | Spaceship | Wizard | WizardAcademy;

export type SearchResultConnection = {
  __typename?: 'SearchResultConnection';
  edges: Array<SearchResultEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SearchResultEdge = {
  __typename?: 'SearchResultEdge';
  cursor: Scalars['String']['output'];
  node: SearchResult;
};

export type SpaceStation = Audited & Node & {
  __typename?: 'SpaceStation';
  activeMissions: Array<Mission>;
  amenities: Array<Scalars['String']['output']>;
  coordinates: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  dockedShips: SpaceshipConnection;
  id: Scalars['UUID']['output'];
  isOperational: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  population: Scalars['Int']['output'];
  residents: AlienConnection;
  sector: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Spaceship = Audited & Node & {
  __typename?: 'Spaceship';
  class: SpaceshipClass;
  createdAt: Scalars['DateTime']['output'];
  createdBy: Scalars['String']['output'];
  crew: AlienConnection;
  crewCapacity: Scalars['Int']['output'];
  currentMission?: Maybe<Mission>;
  dockingStation?: Maybe<SpaceStation>;
  fuelType: FuelType;
  id: Scalars['UUID']['output'];
  isOperational: Scalars['Boolean']['output'];
  maxWarpFactor: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  registrationCode: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  weapons: Array<Scalars['String']['output']>;
};

export enum SpaceshipClass {
  Cruiser = 'CRUISER',
  DiplomaticVessel = 'DIPLOMATIC_VESSEL',
  Dreadnought = 'DREADNOUGHT',
  Fighter = 'FIGHTER',
  FoodTruck = 'FOOD_TRUCK',
  Freighter = 'FREIGHTER'
}

export type SpaceshipConnection = {
  __typename?: 'SpaceshipConnection';
  edges: Array<SpaceshipEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SpaceshipEdge = {
  __typename?: 'SpaceshipEdge';
  cursor: Scalars['String']['output'];
  node: Spaceship;
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

export type SpellCastResult = {
  __typename?: 'SpellCastResult';
  caster: Wizard;
  damageDealt?: Maybe<Scalars['Int']['output']>;
  healingDone?: Maybe<Scalars['Int']['output']>;
  spell: Spell;
  statusEffects: Array<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
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
  alienArrived: Alien;
  cheeseAchievedSentience: Cheese;
  cheeseReadyForHarvest: Cheese;
  missionStatusChanged: Mission;
  spellCast: SpellCastResult;
  wizardRankChanged: Wizard;
};


export type SubscriptionAlienArrivedArgs = {
  stationId: Scalars['UUID']['input'];
};


export type SubscriptionCheeseReadyForHarvestArgs = {
  caveId: Scalars['UUID']['input'];
};


export type SubscriptionMissionStatusChangedArgs = {
  missionId?: InputMaybe<Scalars['UUID']['input']>;
};


export type SubscriptionSpellCastArgs = {
  academyId?: InputMaybe<Scalars['UUID']['input']>;
};


export type SubscriptionWizardRankChangedArgs = {
  wizardId: Scalars['UUID']['input'];
};

export type Timestamped = {
  createdAt: Scalars['DateTime']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UpdateAgingInput = {
  additionalMonths: Scalars['Int']['input'];
  caveId: Scalars['UUID']['input'];
  cheeseId: Scalars['UUID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMissionStatusInput = {
  logMessage?: InputMaybe<Scalars['String']['input']>;
  missionId: Scalars['UUID']['input'];
  status: MissionStatus;
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

export type WarpCalculation = {
  __typename?: 'WarpCalculation';
  destination: Scalars['String']['output'];
  estimatedTravelTime: Scalars['String']['output'];
  fuelRequired: Scalars['Float']['output'];
  origin: Scalars['String']['output'];
  warpFactor: Scalars['Float']['output'];
};

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

export type WizardAcademyConnection = {
  __typename?: 'WizardAcademyConnection';
  edges: Array<WizardAcademyEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WizardAcademyEdge = {
  __typename?: 'WizardAcademyEdge';
  cursor: Scalars['String']['output'];
  node: WizardAcademy;
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