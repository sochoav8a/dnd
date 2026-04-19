export const typeDefs = /* GraphQL */ `
  scalar JSON
  scalar DateTime

  enum UserRole {
    player
    dm
    admin
  }

  enum ContentType {
    race
    subrace
    class
    subclass
    background
    feat
    spell
    item
    monster
    condition
    rule
  }

  enum ContentSourceType {
    official
    homebrew
  }

  type User {
    id: ID!
    email: String!
    username: String!
    role: UserRole!
    createdAt: DateTime!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type ContentSource {
    id: ID!
    name: String!
    type: ContentSourceType!
    createdBy: ID
    createdAt: DateTime!
  }

  type ContentItem {
    id: ID!
    source: ContentSource!
    contentType: ContentType!
    name: String!
    slug: String!
    description: String
    data: JSON!
    metadata: JSON
    version: Int!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Campaign {
    id: ID!
    name: String!
    dm: User!
    inviteCode: String
    settings: JSON!
    members: [CampaignMember!]!
    characters: [Character!]!
    createdAt: DateTime!
  }

  type CampaignMember {
    user: User!
    role: String!
    joinedAt: DateTime!
  }

  type Character {
    id: ID!
    user: User!
    campaign: Campaign
    name: String!
    level: Int!
    experience: Int!
    race: ContentItem!
    subrace: ContentItem
    class: ContentItem!
    subclass: ContentItem
    background: ContentItem!
    portraitUrl: String
    state: JSON!
    computed: JSON!
    inventory: [InventoryItem!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type InventoryItem {
    id: ID!
    contentItem: ContentItem
    name: String!
    quantity: Int!
    equipped: Boolean!
    attunement: Boolean!
    customData: JSON
    notes: String
    sortOrder: Int!
  }

  enum EncounterStatus {
    prep
    active
    completed
  }

  type EncounterParticipant {
    id: ID!
    character: Character
    name: String!
    initiative: Int
    hpCurrent: Int!
    hpMax: Int!
    isPlayer: Boolean!
    conditions: [String!]!
    concentratingOn: String
    notes: String
    sortOrder: Int!
  }

  type Encounter {
    id: ID!
    campaign: Campaign!
    name: String!
    status: EncounterStatus!
    round: Int!
    notes: String
    participants: [EncounterParticipant!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # ── Queries ────────────────────────────────────────────────────────────────

  type Query {
    me: User
    user(id: ID!): User

    character(id: ID!): Character
    characters: [Character!]!

    campaign(id: ID!): Campaign
    campaigns: [Campaign!]!

    encounter(id: ID!): Encounter
    encounters(campaignId: ID!): [Encounter!]!

    contentItem(id: ID!): ContentItem
    contentItems(type: ContentType, sourceId: ID): [ContentItem!]!
    contentSources: [ContentSource!]!
  }

  # ── Mutations ──────────────────────────────────────────────────────────────

  input RegisterInput {
    email: String!
    username: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateCharacterInput {
    name: String!
    raceId: ID!
    subraceId: ID
    classId: ID!
    subclassId: ID
    backgroundId: ID!
    abilityScores: JSON!
    campaignId: ID
    startingEquipmentIds: [ID!]
    knownSpellSlugs: [String!]
    preparedSpellSlugs: [String!]
  }

  input UpdateCharacterStateInput {
    characterId: ID!
    state: JSON!
  }

  input AbilityScoreImprovementInput {
    STR: Int
    DEX: Int
    CON: Int
    INT: Int
    WIS: Int
    CHA: Int
  }

  input LevelUpInput {
    characterId: ID!
    newLevel: Int!
    hitPointRoll: Int
    subclassId: ID
    abilityScoreImprovements: AbilityScoreImprovementInput
    featId: ID
    """
    When a feat requires choosing an ability score (half-feats like Resilient, Athlete),
    pass the chosen ability code here (STR/DEX/CON/INT/WIS/CHA).
    """
    featAbilityChoice: String
    knownSpellSlugs: [String!]
    preparedSpellSlugs: [String!]
  }

  input HitDiceSpentEntry {
    die: Int!
    roll: Int!
  }

  input ShortRestInput {
    characterId: ID!
    diceSpent: [HitDiceSpentEntry!]
  }

  input AddInventoryItemInput {
    characterId: ID!
    contentItemId: ID
    name: String!
    quantity: Int
    notes: String
  }

  input CreateCampaignInput {
    name: String!
    settings: JSON
  }

  input AddPlayerByEmailInput {
    campaignId: ID!
    email: String!
  }

  input CreatePlayerAndAddInput {
    campaignId: ID!
    email: String!
    username: String!
    password: String!
  }

  input RemovePlayerInput {
    campaignId: ID!
    userId: ID!
  }

  input QuickCreateCampaignCharacterInput {
    campaignId: ID!
    ownerId: ID!
    name: String!
    raceId: ID!
    classId: ID!
    backgroundId: ID!
    subraceId: ID
  }

  input CreateContentSourceInput {
    name: String!
    type: ContentSourceType
  }

  input GrantEntitlementInput {
    sourceId: ID!
    userId: ID!
  }

  input CreateContentItemInput {
    sourceId: ID!
    contentType: ContentType!
    slug: String
    name: String!
    description: String
    data: JSON!
    metadata: JSON
  }

  input UpdateContentItemInput {
    id: ID!
    name: String
    description: String
    data: JSON
    metadata: JSON
    isActive: Boolean
  }

  input CreateEncounterInput {
    campaignId: ID!
    name: String!
    notes: String
  }

  input AddParticipantInput {
    encounterId: ID!
    characterId: ID
    name: String!
    hpMax: Int!
    hpCurrent: Int
    isPlayer: Boolean
  }

  input UpdateInitiativeInput {
    participantId: ID!
    initiative: Int!
  }

  input ApplyDamageInput {
    participantId: ID!
    amount: Int!
    heal: Boolean
  }

  input ApplyConditionInput {
    participantId: ID!
    condition: String!
    remove: Boolean
  }

  input UpdateConcentrationInput {
    participantId: ID!
    concentratingOn: String
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    createCharacter(input: CreateCharacterInput!): Character!
    updateCharacterState(input: UpdateCharacterStateInput!): Character!
    levelUp(input: LevelUpInput!): Character!
    shortRest(input: ShortRestInput!): Character!
    longRest(characterId: ID!): Character!
    deleteCharacter(id: ID!): Boolean!

    addInventoryItem(input: AddInventoryItemInput!): InventoryItem!
    removeInventoryItem(id: ID!): Boolean!
    equipItem(id: ID!, equipped: Boolean!): InventoryItem!

    createCampaign(input: CreateCampaignInput!): Campaign!
    joinCampaign(inviteCode: String!): Campaign!
    leaveCampaign(campaignId: ID!): Boolean!
    deleteCampaign(id: ID!): Boolean!
    addPlayerByEmail(input: AddPlayerByEmailInput!): Campaign!
    createPlayerAndAddToCampaign(input: CreatePlayerAndAddInput!): Campaign!
    removePlayerFromCampaign(input: RemovePlayerInput!): Boolean!
    quickCreateCampaignCharacter(input: QuickCreateCampaignCharacterInput!): Character!

    createEncounter(input: CreateEncounterInput!): Encounter!
    startEncounter(id: ID!): Encounter!
    endEncounter(id: ID!): Encounter!
    nextRound(id: ID!): Encounter!
    deleteEncounter(id: ID!): Boolean!

    addParticipant(input: AddParticipantInput!): EncounterParticipant!
    removeParticipant(id: ID!): Boolean!
    updateInitiative(input: UpdateInitiativeInput!): EncounterParticipant!
    applyDamage(input: ApplyDamageInput!): EncounterParticipant!
    applyCondition(input: ApplyConditionInput!): EncounterParticipant!
    updateParticipantConcentration(input: UpdateConcentrationInput!): EncounterParticipant!

    createContentSource(input: CreateContentSourceInput!): ContentSource!
    deleteContentSource(id: ID!): Boolean!
    grantEntitlement(input: GrantEntitlementInput!): Boolean!
    createContentItem(input: CreateContentItemInput!): ContentItem!
    updateContentItem(input: UpdateContentItemInput!): ContentItem!
    deleteContentItem(id: ID!): Boolean!
  }
`;
