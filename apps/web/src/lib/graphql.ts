import { GraphQLClient } from "graphql-request";

const GRAPHQL_URL = process.env["NEXT_PUBLIC_GRAPHQL_URL"] ?? "http://localhost:4000/graphql";

/** Origin of the API (used for REST endpoints like file uploads and static /uploads). */
export const API_ORIGIN = GRAPHQL_URL.replace(/\/graphql\/?$/, "");

/** Resolve a relative /uploads/... URL stored in the DB to the full API origin. */
export function absoluteUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

export function getGqlClient(token?: string): GraphQLClient {
  return new GraphQLClient(GRAPHQL_URL, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

// ── Queries ────────────────────────────────────────────────────────────────

export const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id email username role createdAt
    }
  }
`;

export const CHARACTERS_QUERY = /* GraphQL */ `
  query Characters {
    characters {
      id name level experience portraitUrl
      race { id name slug }
      class { id name slug }
      background { id name }
      state computed createdAt updatedAt
    }
  }
`;

export const CHARACTER_QUERY = /* GraphQL */ `
  query Character($id: ID!) {
    character(id: $id) {
      id name level experience portraitUrl
      race { id name slug data }
      subrace { id name slug data }
      class { id name slug data }
      subclass { id name slug data }
      background { id name slug data }
      state
      computed
      inventory {
        id name quantity equipped attunement customData notes sortOrder
        contentItem { id name slug data }
      }
      campaign { id name }
      createdAt updatedAt
    }
  }
`;

export const CONTENT_ITEMS_QUERY = /* GraphQL */ `
  query ContentItems($type: ContentType) {
    contentItems(type: $type) {
      id name slug description data contentType
    }
  }
`;

export const CAMPAIGNS_QUERY = /* GraphQL */ `
  query Campaigns {
    campaigns {
      id name inviteCode settings createdAt
      dm { id username }
      members { user { id username } role joinedAt }
      characters { id name level race { name } class { name } computed }
    }
  }
`;

// ── Mutations ──────────────────────────────────────────────────────────────

export const REGISTER_MUTATION = /* GraphQL */ `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user { id email username role }
    }
  }
`;

export const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user { id email username role }
    }
  }
`;

export const CREATE_CHARACTER_MUTATION = /* GraphQL */ `
  mutation CreateCharacter($input: CreateCharacterInput!) {
    createCharacter(input: $input) {
      id name level state computed
      race { name } class { name } background { name }
    }
  }
`;

export const UPDATE_CHARACTER_STATE_MUTATION = /* GraphQL */ `
  mutation UpdateCharacterState($input: UpdateCharacterStateInput!) {
    updateCharacterState(input: $input) {
      id state computed updatedAt
    }
  }
`;

export const LEVEL_UP_MUTATION = /* GraphQL */ `
  mutation LevelUp($input: LevelUpInput!) {
    levelUp(input: $input) {
      id level state computed
      subclass { id name slug data }
    }
  }
`;

export const SPELLS_FOR_CLASS_QUERY = /* GraphQL */ `
  query Spells {
    contentItems(type: spell) {
      id name slug description data
    }
  }
`;

export const ADD_INVENTORY_ITEM_MUTATION = /* GraphQL */ `
  mutation AddInventoryItem($input: AddInventoryItemInput!) {
    addInventoryItem(input: $input) {
      id name quantity equipped
    }
  }
`;

export const REMOVE_INVENTORY_ITEM_MUTATION = /* GraphQL */ `
  mutation RemoveInventoryItem($id: ID!) {
    removeInventoryItem(id: $id)
  }
`;

export const SHORT_REST_MUTATION = /* GraphQL */ `
  mutation ShortRest($input: ShortRestInput!) {
    shortRest(input: $input) {
      id state computed
    }
  }
`;

export const LONG_REST_MUTATION = /* GraphQL */ `
  mutation LongRest($characterId: ID!) {
    longRest(characterId: $characterId) {
      id state computed
    }
  }
`;

export const DELETE_CHARACTER_MUTATION = /* GraphQL */ `
  mutation DeleteCharacter($id: ID!) {
    deleteCharacter(id: $id)
  }
`;

export const DELETE_CAMPAIGN_MUTATION = /* GraphQL */ `
  mutation DeleteCampaign($id: ID!) {
    deleteCampaign(id: $id)
  }
`;

export const UPDATE_PARTICIPANT_CONCENTRATION_MUTATION = /* GraphQL */ `
  mutation UpdateParticipantConcentration($input: UpdateConcentrationInput!) {
    updateParticipantConcentration(input: $input) {
      id concentratingOn
    }
  }
`;

export const MONSTER_DETAIL_QUERY = /* GraphQL */ `
  query MonsterDetail($id: ID!) {
    contentItem(id: $id) {
      id name slug description data contentType
    }
  }
`;

export const EQUIP_ITEM_MUTATION = /* GraphQL */ `
  mutation EquipItem($id: ID!, $equipped: Boolean!) {
    equipItem(id: $id, equipped: $equipped) {
      id equipped
    }
  }
`;

export const CREATE_CAMPAIGN_MUTATION = /* GraphQL */ `
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      id name inviteCode
    }
  }
`;

export const JOIN_CAMPAIGN_MUTATION = /* GraphQL */ `
  mutation JoinCampaign($inviteCode: String!) {
    joinCampaign(inviteCode: $inviteCode) {
      id name inviteCode
    }
  }
`;

export const CAMPAIGN_CHARACTERS_QUERY = /* GraphQL */ `
  query CampaignCharacters($id: ID!) {
    campaign(id: $id) {
      characters {
        id name level
        race { name }
        class { name }
        computed
      }
    }
  }
`;

export const CAMPAIGN_DETAIL_QUERY = /* GraphQL */ `
  query CampaignDetail($id: ID!) {
    campaign(id: $id) {
      id name inviteCode createdAt
      dm { id username email }
      members {
        user { id username email }
        role joinedAt
      }
      characters {
        id name level portraitUrl
        race { id name slug }
        class { id name slug }
        background { id name }
        computed
      }
    }
    encounters(campaignId: $id) {
      id name status round createdAt
      participants { id }
    }
  }
`;

export const LEAVE_CAMPAIGN_MUTATION = /* GraphQL */ `
  mutation LeaveCampaign($campaignId: ID!) {
    leaveCampaign(campaignId: $campaignId)
  }
`;

export const ADD_PLAYER_BY_EMAIL_MUTATION = /* GraphQL */ `
  mutation AddPlayerByEmail($input: AddPlayerByEmailInput!) {
    addPlayerByEmail(input: $input) { id }
  }
`;

export const CREATE_PLAYER_AND_ADD_MUTATION = /* GraphQL */ `
  mutation CreatePlayerAndAddToCampaign($input: CreatePlayerAndAddInput!) {
    createPlayerAndAddToCampaign(input: $input) { id }
  }
`;

export const REMOVE_PLAYER_FROM_CAMPAIGN_MUTATION = /* GraphQL */ `
  mutation RemovePlayerFromCampaign($input: RemovePlayerInput!) {
    removePlayerFromCampaign(input: $input)
  }
`;

export const QUICK_CREATE_CAMPAIGN_CHARACTER_MUTATION = /* GraphQL */ `
  mutation QuickCreateCampaignCharacter($input: QuickCreateCampaignCharacterInput!) {
    quickCreateCampaignCharacter(input: $input) {
      id name level
    }
  }
`;

export const ENCOUNTERS_QUERY = /* GraphQL */ `
  query Encounters($campaignId: ID!) {
    encounters(campaignId: $campaignId) {
      id name status round notes createdAt
      participants {
        id name initiative hpCurrent hpMax isPlayer conditions sortOrder
        character { id name }
      }
    }
  }
`;

export const ENCOUNTER_QUERY = /* GraphQL */ `
  query Encounter($id: ID!) {
    encounter(id: $id) {
      id name status round notes createdAt
      campaign { id name }
      participants {
        id name initiative hpCurrent hpMax isPlayer conditions concentratingOn notes sortOrder
        character {
          id name level portraitUrl computed state
          race { slug name }
          class { slug name }
        }
      }
    }
  }
`;

export const CREATE_ENCOUNTER_MUTATION = /* GraphQL */ `
  mutation CreateEncounter($input: CreateEncounterInput!) {
    createEncounter(input: $input) { id name status }
  }
`;

export const START_ENCOUNTER_MUTATION = /* GraphQL */ `
  mutation StartEncounter($id: ID!) { startEncounter(id: $id) { id status round } }
`;

export const END_ENCOUNTER_MUTATION = /* GraphQL */ `
  mutation EndEncounter($id: ID!) { endEncounter(id: $id) { id status } }
`;

export const NEXT_ROUND_MUTATION = /* GraphQL */ `
  mutation NextRound($id: ID!) { nextRound(id: $id) { id round } }
`;

export const ADD_PARTICIPANT_MUTATION = /* GraphQL */ `
  mutation AddParticipant($input: AddParticipantInput!) {
    addParticipant(input: $input) {
      id name initiative hpCurrent hpMax isPlayer conditions sortOrder
    }
  }
`;

export const REMOVE_PARTICIPANT_MUTATION = /* GraphQL */ `
  mutation RemoveParticipant($id: ID!) { removeParticipant(id: $id) }
`;

export const UPDATE_INITIATIVE_MUTATION = /* GraphQL */ `
  mutation UpdateInitiative($input: UpdateInitiativeInput!) {
    updateInitiative(input: $input) { id initiative sortOrder }
  }
`;

export const APPLY_DAMAGE_MUTATION = /* GraphQL */ `
  mutation ApplyDamage($input: ApplyDamageInput!) {
    applyDamage(input: $input) { id hpCurrent hpMax }
  }
`;

export const APPLY_CONDITION_MUTATION = /* GraphQL */ `
  mutation ApplyCondition($input: ApplyConditionInput!) {
    applyCondition(input: $input) { id conditions }
  }
`;
