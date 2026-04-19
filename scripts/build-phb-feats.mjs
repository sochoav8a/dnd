#!/usr/bin/env node
/**
 * Builds data/books/phb/feats.json from Manual del Jugador PDF text.
 *
 * Usage (use -raw so 2-column feat headings land on their own line):
 *   pdftotext -raw homebrew/phb-clean.pdf - | node scripts/build-phb-feats.mjs
 *
 * The PHB has a dozen+ feats with half-ASI or full-ASI components. Those are
 * declared in the `override.data` blocks below so the rules engine applies
 * them automatically; text descriptions are extracted from the PDF.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFeatBundle } from "./lib/build-feat-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Feat list with Spanish headings (PHB traducción oficial).
// Each entry's `aliases` list is matched against the PDF heading line.
// `override.data` injects structured stats that text parsing can't infer.
const FEATS = [
  // ── Fixed-ASI half-feats ────────────────────────────────────────────
  {
    slug: "actor",
    name: "Actor",
    aliases: ["ACTOR"],
    override: {
      data: {
        ability_score_improvement: { CHA: 1 },
        modifiers: [
          {
            target: "skill.deception",
            type: "advantage",
            value: 1,
            source: "feat:actor",
            priority: 10,
          },
          {
            target: "skill.performance",
            type: "advantage",
            value: 1,
            source: "feat:actor",
            priority: 10,
          },
        ],
      },
    },
  },
  {
    slug: "durable",
    name: "Resistente",
    aliases: ["RESISTENTE"],
    override: {
      data: {
        ability_score_improvement: { CON: 1 },
        modifiers: [],
      },
    },
  },
  {
    slug: "heavy-armor-master",
    name: "Maestro en Armaduras Pesadas",
    aliases: ["MAESTRO EN ARMADURAS PESADAS", "MAESTRO DE LA ARMADURA PESADA"],
    override: {
      data: {
        ability_score_improvement: { STR: 1 },
        prerequisites: { proficiency: "armor.heavy" },
        modifiers: [],
      },
    },
  },
  {
    slug: "keen-mind",
    name: "Mente Aguda",
    aliases: ["MENTE AGUDA"],
    override: {
      data: {
        ability_score_improvement: { INT: 1 },
        modifiers: [],
      },
    },
  },
  {
    slug: "linguist",
    name: "Lingüista",
    aliases: ["LINGÜISTA", "LINGUISTA", "LINGÚUISTA", "LINGUUISTA"],
    override: {
      data: {
        ability_score_improvement: { INT: 1 },
        modifiers: [],
      },
    },
  },
  {
    slug: "lightly-armored",
    name: "Ligeramente Acorazado",
    aliases: ["LIGERAMENTE ACORAZADO", "LIGERAMENTE ARMADO"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        modifiers: [prof("armor.light", "light", "lightly-armored")],
      },
    },
  },
  {
    slug: "moderately-armored",
    name: "Moderadamente Acorazado",
    aliases: ["MODERADAMENTE ACORAZADO", "MODERADAMENTE ARMADO"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        prerequisites: { proficiency: "armor.light" },
        modifiers: [
          prof("armor.medium", "medium", "moderately-armored"),
          prof("armor.shield", "shields", "moderately-armored"),
        ],
      },
    },
  },
  {
    slug: "heavily-armored",
    name: "Muy Acorazado",
    aliases: ["MUY ACORAZADO", "PESADAMENTE ARMADO"],
    override: {
      data: {
        ability_score_improvement: { STR: 1 },
        prerequisites: { proficiency: "armor.medium" },
        modifiers: [prof("armor.heavy", "heavy", "heavily-armored")],
      },
    },
  },

  // ── Choice-based half-feats ─────────────────────────────────────────
  {
    slug: "athlete",
    name: "Atleta",
    aliases: ["ATLETA"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "observant",
    name: "Observador",
    aliases: ["OBSERVADOR"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["INT", "WIS"] },
        modifiers: [
          {
            target: "passive_perception",
            type: "bonus",
            value: 5,
            source: "feat:observant",
            priority: 10,
          },
        ],
      },
    },
  },
  {
    slug: "resilient",
    name: "Resiliente",
    aliases: ["RESILIENTE", "TEMPLADO"],
    override: {
      data: {
        ability_score_choice: {
          amount: 1,
          from: ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
        },
        modifiers: [],
      },
    },
  },
  {
    slug: "weapon-master",
    name: "Versado en las Armas",
    aliases: ["VERSADO EN LAS ARMAS", "MAESTRO DE ARMAS"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "DEX"] },
        modifiers: [],
      },
    },
  },
  {
    slug: "tavern-brawler",
    name: "Camorrista",
    aliases: ["CAMORRISTA"],
    override: {
      data: {
        ability_score_choice: { amount: 1, from: ["STR", "CON"] },
        modifiers: [],
      },
    },
  },

  // ── Combat / non-ASI feats ──────────────────────────────────────────
  {
    slug: "alert",
    name: "Alerta",
    aliases: ["ALERTA"],
    override: {
      data: {
        modifiers: [
          {
            target: "initiative",
            type: "bonus",
            value: 5,
            source: "feat:alert",
            priority: 10,
          },
        ],
      },
    },
  },
  { slug: "charger", name: "Atacante a la Carga", aliases: ["ATACANTE A LA CARGA", "ARREMETEDOR"] },
  {
    slug: "crossbow-expert",
    name: "Experto en Ballestas",
    aliases: ["EXPERTO EN BALLESTAS", "EXPERTO EN BALLESTA"],
  },
  {
    slug: "defensive-duelist",
    name: "Duelista Defensivo",
    aliases: ["DUELISTA DEFENSIVO"],
    override: {
      data: {
        prerequisites: { ability_scores: { DEX: 13 } },
        modifiers: [],
      },
    },
  },
  {
    slug: "dual-wielder",
    name: "Combatiente con Dos Armas",
    aliases: ["COMBATIENTE CON DOS ARMAS", "AMBIDIESTRO"],
    override: {
      data: {
        modifiers: [
          {
            target: "ac",
            type: "bonus",
            value: 1,
            source: "feat:dual-wielder",
            priority: 10,
            condition: { wielding: "dual" },
          },
        ],
      },
    },
  },
  {
    slug: "dungeon-delver",
    name: "Explorador de Mazmorras",
    aliases: ["EXPLORADOR DE MAZMORRAS", "BUSCADOR DE MAZMORRAS"],
    override: {
      data: {
        modifiers: [
          {
            target: "skill.perception",
            type: "advantage",
            value: 1,
            source: "feat:dungeon-delver",
            priority: 10,
          },
          {
            target: "skill.investigation",
            type: "advantage",
            value: 1,
            source: "feat:dungeon-delver",
            priority: 10,
          },
        ],
      },
    },
  },
  { slug: "elemental-adept", name: "Versado en un Elemento", aliases: ["VERSADO EN UN ELEMENTO", "ADEPTO ELEMENTAL"] },
  { slug: "grappler", name: "Apresador", aliases: ["APRESADOR", "LUCHADOR"] },
  {
    slug: "great-weapon-master",
    name: "Maestro en Armas Pesadas",
    aliases: ["MAESTRO EN ARMAS PESADAS", "MAESTRO DE ARMAS A DOS MANOS"],
  },
  { slug: "healer", name: "Sanador", aliases: ["SANADOR"] },
  { slug: "inspiring-leader", name: "Líder Inspirador", aliases: ["LÍDER INSPIRADOR"] },
  { slug: "lucky", name: "Afortunado", aliases: ["AFORTUNADO"] },
  { slug: "mage-slayer", name: "Azote de Magos", aliases: ["AZOTE DE MAGOS", "CAZADOR DE MAGOS"] },
  { slug: "magic-initiate", name: "Iniciado en la Magia", aliases: ["INICIADO EN LA MAGIA"] },
  { slug: "martial-adept", name: "Adepto Marcial", aliases: ["ADEPTO MARCIAL"] },
  { slug: "medium-armor-master", name: "Maestro en Armaduras Medias", aliases: ["MAESTRO EN ARMADURAS MEDIAS", "MAESTRO DE LA ARMADURA MEDIA"] },
  {
    slug: "mobile",
    name: "Móvil",
    aliases: ["MÓVIL", "MOVIL"],
    override: {
      data: {
        modifiers: [
          {
            target: "speed",
            type: "bonus",
            value: 10,
            source: "feat:mobile",
            priority: 10,
          },
        ],
      },
    },
  },
  { slug: "mounted-combatant", name: "Combatiente Montado", aliases: ["COMBATIENTE MONTADO"] },
  { slug: "polearm-master", name: "Maestro en Armas de Asta", aliases: ["MAESTRO EN ARMAS DE ASTA", "MAESTRO DEL ARMA DE ASTA"] },
  { slug: "ritual-caster", name: "Lanzador Ritual", aliases: ["LANZADOR RITUAL", "LANZADOR DE RITUALES"] },
  { slug: "savage-attacker", name: "Atacante Salvaje", aliases: ["ATACANTE SALVAJE"] },
  { slug: "sentinel", name: "Centinela", aliases: ["CENTINELA"] },
  { slug: "sharpshooter", name: "Tirador de Primera", aliases: ["TIRADOR DE PRIMERA", "TIRADOR CERTERO"] },
  { slug: "shield-master", name: "Maestro en Escudos", aliases: ["MAESTRO EN ESCUDOS", "MAESTRO DEL ESCUDO"] },
  { slug: "skilled", name: "Habilidoso", aliases: ["HABILIDOSO"] },
  { slug: "skulker", name: "Acechador", aliases: ["ACECHADOR"] },
  { slug: "spell-sniper", name: "Lanzador Preciso", aliases: ["LANZADOR PRECISO", "FRANCOTIRADOR ARCANO"] },
  { slug: "tough", name: "Duro", aliases: ["DURO"] },
  { slug: "war-caster", name: "Lanzador en Combate", aliases: ["LANZADOR EN COMBATE", "LANZADOR BÉLICO"] },
];

function prof(target, value, sourceSuffix) {
  return {
    target,
    type: "proficiency",
    value,
    source: `feat:${sourceSuffix}`,
    priority: 10,
  };
}

await buildFeatBundle({
  sourceName: "Manual del Jugador",
  bookSlug: "phb",
  outputDir: resolve(__dirname, "../data/books/phb"),
  outputFile: "feats.json",
  sourcePdf: "Manual del Jugador.pdf",
  extractor: "pdftotext -raw",
  feats: FEATS,
});
