import { JSONScalar, DateTimeScalar } from "./scalars.js";
import { authResolvers } from "./auth.js";
import { userResolvers } from "./users.js";
import { contentResolvers } from "./content.js";
import { characterResolvers } from "./characters.js";
import { campaignResolvers } from "./campaigns.js";
import { encounterResolvers } from "./encounters.js";
import { homebrewResolvers } from "./homebrew.js";

export const resolvers = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,
  Query: {
    ...userResolvers.Query,
    ...contentResolvers.Query,
    ...characterResolvers.Query,
    ...campaignResolvers.Query,
    ...encounterResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...characterResolvers.Mutation,
    ...campaignResolvers.Mutation,
    ...encounterResolvers.Mutation,
    ...homebrewResolvers.Mutation,
  },
  Character: characterResolvers.Character,
  ContentItem: contentResolvers.ContentItem,
  Campaign: campaignResolvers.Campaign,
  Encounter: encounterResolvers.Encounter,
  EncounterParticipant: encounterResolvers.EncounterParticipant,
};
