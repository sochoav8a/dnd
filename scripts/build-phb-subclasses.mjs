#!/usr/bin/env node

import path from "node:path";
import { buildSubclassBundle } from "./lib/build-subclass-bundle.mjs";

const PROJECT_ROOT = "/home/santiago/dnd";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "books", "phb");

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function feature(name, description) {
  return {
    name,
    description: cleanText(description),
  };
}

const CLASS_HEADERS = [
  { classSlug: "barbarian", aliases: ["BÁRBARO", "BARBARO"] },
  { classSlug: "bard", aliases: ["BARDO"] },
  { classSlug: "warlock", aliases: ["BRUJO"] },
  { classSlug: "cleric", aliases: ["CLÉRIGO", "CLERIGO"] },
  { classSlug: "druid", aliases: ["DRUIDA"] },
  { classSlug: "ranger", aliases: ["EXPLORADOR"] },
  { classSlug: "fighter", aliases: ["GUERRERO"] },
  { classSlug: "sorcerer", aliases: ["HECHICERO"] },
  { classSlug: "wizard", aliases: ["MAGO"] },
  { classSlug: "monk", aliases: ["MONJE"] },
  { classSlug: "paladin", aliases: ["PALADÍN", "PALADIN"] },
  { classSlug: "rogue", aliases: ["PÍCARO", "PICARO"] },
];

const SUBCLASSES = [
  {
    slug: "berserker",
    name: "Senda del Berserker",
    parentClass: "barbarian",
    aliases: ["SENDA DEL BERSERKER"],
  },
  {
    slug: "totem-warrior",
    name: "Senda del Guerrero Totémico",
    parentClass: "barbarian",
    aliases: ["SENDA DEL GUERRERO TOTÉMICO", "SENDA DEL GUERRERO TOTEMICO"],
  },
  {
    slug: "lore",
    name: "Colegio del Conocimiento",
    parentClass: "bard",
    aliases: ["COLEGIO DEL CONOCIMIENTO"],
  },
  {
    slug: "valor",
    name: "Colegio del Valor",
    parentClass: "bard",
    aliases: ["COLEGIO DEL VALOR"],
  },
  {
    slug: "life-domain",
    name: "Dominio de la Vida",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA VIDA"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature("Competencia Adicional", "Ganas competencia con armaduras pesadas."),
            feature(
              "Discípulo de la Vida",
              "Tus conjuros de nivel 1 o superior que restauran puntos de golpe curan 2 + el nivel del conjuro puntos de golpe adicionales.",
            ),
          ],
          "2": [
            feature(
              "Canalizar Divinidad: Preservar Vida",
              "Como acción, puedes repartir una reserva de curación igual a cinco veces tu nivel de clérigo entre criaturas a 30 pies o menos de ti, sin que ninguna supere la mitad de sus puntos de golpe máximos.",
            ),
          ],
          "6": [
            feature(
              "Sanador Bendito",
              "Cuando lanzas un conjuro de curación sobre otra criatura, también recuperas 2 + el nivel del conjuro puntos de golpe.",
            ),
          ],
          "8": [
            feature(
              "Golpe Divino",
              "Una vez por turno, cuando impactas con un ataque con arma, puedes causar 1d8 de daño radiante adicional. El daño aumenta a 2d8 al llegar a nivel 14.",
            ),
          ],
          "17": [
            feature(
              "Sanación Suprema",
              "Cuando un conjuro tuyo restaura puntos de golpe, usas el valor máximo posible de cada dado en lugar de tirarlo.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "knowledge-domain",
    name: "Dominio del Conocimiento",
    parentClass: "cleric",
    aliases: ["DOMINIO DEL CONOCIMIENTO"],
  },
  {
    slug: "trickery-domain",
    name: "Dominio del Engaño",
    parentClass: "cleric",
    aliases: ["DOMINIO DEL ENGAÑO"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Bendición del Embaucador",
              "Como acción, puedes tocar a una criatura voluntaria distinta de ti y otorgarle ventaja en las pruebas de Destreza (Sigilo) durante 1 hora o hasta que uses este rasgo de nuevo.",
            ),
          ],
          "2": [
            feature(
              "Canalizar Divinidad: Invocar Duplicidad",
              "Como acción, creas un duplicado ilusorio de ti mismo durante 1 minuto. Puedes moverlo con una acción adicional y lanzar conjuros como si estuvieras en su espacio.",
            ),
          ],
          "6": [
            feature(
              "Canalizar Divinidad: Capa de Sombras",
              "Como acción, te vuelves invisible hasta el final de tu siguiente turno o hasta que ataques o lances un conjuro.",
            ),
          ],
          "8": [
            feature(
              "Golpe Divino",
              "Una vez por turno, cuando impactas con un ataque con arma, puedes causar 1d8 de daño de veneno adicional. El daño aumenta a 2d8 al llegar a nivel 14.",
            ),
          ],
          "17": [
            feature(
              "Duplicidad Mejorada",
              "Cuando usas Invocar Duplicidad, puedes crear hasta cuatro duplicados en vez de uno y mover cualquiera de ellos con tu acción adicional.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "war-domain",
    name: "Dominio de la Guerra",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA GUERRA"],
  },
  {
    slug: "light-domain",
    name: "Dominio de la Luz",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA LUZ"],
  },
  {
    slug: "nature-domain",
    name: "Dominio de la Naturaleza",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA NATURALEZA"],
  },
  {
    slug: "tempest-domain",
    name: "Dominio de la Tempestad",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA TEMPESTAD"],
  },
  {
    slug: "land",
    name: "Círculo de la Tierra",
    parentClass: "druid",
    aliases: ["CÍRCULO DE LA TIERRA", "CIRCULO DE LA TIERRA"],
  },
  {
    slug: "moon",
    name: "Círculo de la Luna",
    parentClass: "druid",
    aliases: ["CÍRCULO DE LA LUNA", "CIRCULO DE LA LUNA"],
  },
  {
    slug: "champion",
    name: "Campeón",
    parentClass: "fighter",
    aliases: ["CAMPEÓN", "CAMPEON", "C AMPEÓN", "C AMPEON"],
  },
  {
    slug: "battle-master",
    name: "Maestro del Combate",
    parentClass: "fighter",
    aliases: ["MAESTRO DEL COMBATE"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Supremacía en Combate",
              "Aprendes maniobras alimentadas por dados de supremacía. Empiezas con cuatro dados d8, conoces tres maniobras y aprendes más a niveles superiores.",
            ),
            feature(
              "Estudioso de la Guerra",
              "Ganas competencia con un tipo de herramientas de artesano de tu elección.",
            ),
          ],
          "7": [
            feature(
              "Conoce a Tu Enemigo",
              "Si observas o interactúas con otra criatura durante al menos 1 minuto fuera del combate, puedes comparar algunas de sus aptitudes con las tuyas.",
            ),
          ],
          "10": [
            feature(
              "Supremacía en Combate Mejorada",
              "Tus dados de supremacía se convierten en d10.",
            ),
          ],
          "15": [
            feature(
              "Incansable",
              "Si tiras iniciativa sin dados de supremacía restantes, recuperas uno.",
            ),
          ],
          "18": [
            feature(
              "Supremacía en Combate Mejorada",
              "Tus dados de supremacía se convierten en d12.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "eldritch-knight",
    name: "Caballero Arcano",
    parentClass: "fighter",
    aliases: ["CABALLERO ARCANO"],
    override: {
      data: {
        // Third-caster (PHB table). Abilidad INT. Los slots se derivan de
        // classData level/3 automáticamente en el rules engine.
        spell_casting: {
          ability: "INT",
          type: "third",
          cantrips_known: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          spells_known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
        },
      },
    },
  },
  {
    slug: "open-hand",
    name: "Camino de la Mano Abierta",
    parentClass: "monk",
    aliases: ["CAMINO DE LA MANO ABIERTA"],
  },
  {
    slug: "shadow",
    name: "Camino de la Sombra",
    parentClass: "monk",
    aliases: ["CAMINO DE LA SOMBRA"],
  },
  {
    slug: "four-elements",
    name: "Camino de los Cuatro Elementos",
    parentClass: "monk",
    aliases: ["CAMINO DE LOS CUATRO ELEMENTOS"],
    override: {
      description: cleanText(
        "Sigues una tradición monástica que te enseña a dominar los elementos. Al concentrar tu ki, puedes alinearte con las fuerzas de la creación y doblegar el aire, la tierra, el fuego y el agua a tu voluntad.",
      ),
      data: {
        features_by_level: {
          "3": [
            feature(
              "Discípulo de los Elementos",
              "Aprendes la disciplina Armonía con los Elementos y otra disciplina elemental de tu elección. Algunas disciplinas te permiten lanzar conjuros gastando puntos de ki.",
            ),
          ],
          "6": [
            feature(
              "Disciplina Elemental Adicional",
              "Aprendes una disciplina elemental adicional y puedes sustituir una disciplina que ya conozcas por otra distinta.",
            ),
          ],
          "11": [
            feature(
              "Disciplina Elemental Adicional",
              "Aprendes una disciplina elemental adicional y puedes sustituir una disciplina que ya conozcas por otra distinta.",
            ),
          ],
          "17": [
            feature(
              "Disciplina Elemental Adicional",
              "Aprendes una disciplina elemental adicional y puedes sustituir una disciplina que ya conozcas por otra distinta.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "devotion",
    name: "Juramento de Entrega",
    parentClass: "paladin",
    aliases: ["JURAMENTO DE ENTREGA", "JURAMENTO DE DEVOCIÓN", "JURAMENTO DE DEVOCION"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Canalizar Divinidad: Arma Sagrada",
              "Como acción, imbues un arma con energía sagrada durante 1 minuto, añades tu modificador por Carisma a las tiradas de ataque con ella y el arma emite luz brillante.",
            ),
            feature(
              "Canalizar Divinidad: Expulsar a los Impíos",
              "Como acción, presentas tu símbolo sagrado y expulsas a infernales y muertos vivientes cercanos que fallen una tirada de salvación de Sabiduría.",
            ),
          ],
          "7": [
            feature(
              "Aura de Devoción",
              "Tú y las criaturas amistosas a 10 pies o menos de ti no podéis ser hechizados mientras estés consciente. El alcance aumenta a 30 pies al nivel 18.",
            ),
          ],
          "15": [
            feature(
              "Pureza de Espíritu",
              "Estás siempre bajo los efectos de protección contra el bien y el mal.",
            ),
          ],
          "20": [
            feature(
              "Nimbo Sagrado",
              "Como acción, emanas un aura de luz solar durante 1 minuto que daña a los enemigos y te concede ventaja en las tiradas de salvación contra conjuros lanzados por infernales y muertos vivientes.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "ancients",
    name: "Juramento de los Antiguos",
    parentClass: "paladin",
    aliases: ["JURAMENTO DE LOS ANTIGUOS", "JURAMENTO DE LOS ANCIANOS"],
  },
  {
    slug: "vengeance",
    name: "Juramento de Venganza",
    parentClass: "paladin",
    aliases: ["JURAMENTO DE VENGANZA"],
  },
  { slug: "hunter", name: "Cazador", parentClass: "ranger", aliases: ["CAZADOR"] },
  {
    slug: "beast-master",
    name: "Señor de las Bestias",
    parentClass: "ranger",
    aliases: ["SEÑOR DE LAS BESTIAS", "SENOR DE LAS BESTIAS"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Compañero del Explorador",
              "Obtienes un compañero animal entrenado para luchar junto a ti. Mejora con tu bonificador por competencia y actúa según tus órdenes.",
            ),
          ],
          "7": [
            feature(
              "Entrenamiento Excepcional",
              "Cuando tu compañero no ataque, puedes usar una acción adicional para ordenarle que Ayude, Corra, se Destrabe o Esquive.",
            ),
          ],
          "11": [
            feature(
              "Furia Bestial",
              "Cuando ordenas a tu compañero usar la acción de Atacar, este puede realizar dos ataques o usar una acción especial apropiada de su perfil.",
            ),
          ],
          "15": [
            feature(
              "Compartir Conjuros",
              "Cuando lanzas un conjuro que te tenga a ti como objetivo y tu bestia esté a 30 pies o menos, también puedes hacer que el conjuro la afecte.",
            ),
          ],
        },
      },
    },
  },
  { slug: "thief", name: "Ladrón", parentClass: "rogue", aliases: ["LADRÓN", "LADRON"] },
  {
    slug: "assassin",
    name: "Asesino",
    parentClass: "rogue",
    aliases: ["ASESINO"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Competencias Adicionales",
              "Ganas competencia con los útiles para disfrazarte y los útiles de envenenador.",
            ),
            feature(
              "Asesinar",
              "Tienes ventaja contra criaturas que todavía no hayan actuado en el combate y todo impacto contra una criatura sorprendida es un golpe crítico.",
            ),
          ],
          "9": [
            feature(
              "Pericia en Infiltrarse",
              "Puedes crear identidades falsas creíbles, con historia, profesión y afiliaciones, tras dedicar tiempo y dinero a prepararlas.",
            ),
          ],
          "13": [
            feature(
              "Impostor",
              "Tras estudiar durante varias horas la voz, la caligrafía y los gestos de otra persona, puedes imitarlos con gran precisión.",
            ),
          ],
          "17": [
            feature(
              "Golpe Mortal",
              "Cuando impactas a una criatura sorprendida, debe superar una tirada de salvación de Constitución o el daño de tu ataque se duplica.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "arcane-trickster",
    name: "Embaucador Arcano",
    parentClass: "rogue",
    aliases: ["EMBAUCADOR ARCANO"],
    override: {
      data: {
        // Third-caster (PHB table). Abilidad INT.
        spell_casting: {
          ability: "INT",
          type: "third",
          cantrips_known: [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          spells_known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
        },
      },
    },
  },
  {
    slug: "draconic",
    name: "Linaje Dracónico",
    parentClass: "sorcerer",
    aliases: ["LINAJE DRACÓNICO", "LINAJE DRACONICO"],
  },
  {
    slug: "wild-magic",
    name: "Magia Salvaje",
    parentClass: "sorcerer",
    aliases: ["MAGIA SALVAJE"],
  },
  { slug: "fiend", name: "El Infernal", parentClass: "warlock", aliases: ["EL INFERNAL"] },
  {
    slug: "great-old-one",
    name: "El Primigenio",
    parentClass: "warlock",
    aliases: ["EL PRIMIGENIO", "EL GRAN PRIMIGENIO"],
    override: {
      description: cleanText(
        "Tu patrón es una entidad misteriosa y ajena al tejido de la realidad. Sus motivos son incomprensibles para los mortales, pero los secretos que has descubierto te permiten extraer poder mágico de ese conocimiento prohibido.",
      ),
      data: {
        features_by_level: {
          "1": [
            feature(
              "Mente Iluminada",
              "Puedes comunicarte telepáticamente con una criatura que puedas ver a 30 pies o menos de ti, siempre que entienda al menos un idioma.",
            ),
          ],
          "6": [
            feature(
              "Salvaguarda Entrópica",
              "Cuando una criatura te ataque, puedes usar tu reacción para imponer desventaja a esa tirada. Si falla, tu siguiente ataque contra esa criatura tiene ventaja.",
            ),
          ],
          "10": [
            feature(
              "Escudo Mental",
              "Tus pensamientos no pueden ser leídos sin tu permiso, obtienes resistencia al daño psíquico y devuelves a tus agresores el daño psíquico que te causen.",
            ),
          ],
          "14": [
            feature(
              "Crear Siervo",
              "Puedes tocar a un humanoide incapacitado para hechizarlo hasta que el efecto termine o uses este rasgo de nuevo, y puedes comunicarte telepáticamente con él mientras permanezcáis en el mismo plano.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "archfey",
    name: "El Señor Feérico",
    parentClass: "warlock",
    aliases: ["EL SEÑOR FEÉRICO", "EL SEÑOR FEERICO"],
    override: {
      description: cleanText(
        "Tu patrón es un señor o señora feérico, una criatura de leyenda que atesora secretos antiquísimos y cuyos planes suelen resultar caprichosos e incognoscibles para los mortales.",
      ),
      data: {
        features_by_level: {
          "1": [
            feature(
              "Presencia Feérica",
              "Como acción, puedes obligar a las criaturas cercanas a intentar resistir tu presencia sobrenatural o quedar hechizadas o asustadas por ti hasta el final de tu siguiente turno.",
            ),
          ],
          "6": [
            feature(
              "Escape Brumoso",
              "Cuando recibes daño, puedes usar tu reacción para volverte invisible y teletransportarte hasta 60 pies a un espacio desocupado que puedas ver.",
            ),
          ],
          "10": [
            feature(
              "Defensas Seductoras",
              "No puedes ser hechizado y, cuando otra criatura intente hechizarte, puedes intentar volver ese efecto contra ella.",
            ),
          ],
          "14": [
            feature(
              "Delirio Oscuro",
              "Como acción, puedes sumergir a una criatura en un reino ilusorio brumoso que la hechiza o la asusta mientras mantengas la concentración, hasta un máximo de 1 minuto.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "abjuration",
    name: "Escuela de Abjuración",
    parentClass: "wizard",
    aliases: ["ESCUELA DE ABJURACIÓN", "ESCUELA DE ABJURACION"],
  },
  {
    slug: "divination",
    name: "Escuela de Adivinación",
    parentClass: "wizard",
    aliases: ["ESCUELA DE ADIVINACIÓN", "ESCUELA DE ADIVINACION"],
  },
  {
    slug: "conjuration",
    name: "Escuela de Conjuración",
    parentClass: "wizard",
    aliases: ["ESCUELA DE CONJURACIÓN", "ESCUELA DE CONJURACION"],
  },
  {
    slug: "enchantment",
    name: "Escuela de Encantamiento",
    parentClass: "wizard",
    aliases: ["ESCUELA DE ENCANTAMIENTO"],
  },
  {
    slug: "evocation",
    name: "Escuela de Evocación",
    parentClass: "wizard",
    aliases: ["ESCUELA DE EVOCACIÓN", "ESCUELA DE EVOCACION"],
    override: {
      data: {
        features_by_level: {
          "2": [
            feature(
              "Experto en Evocación",
              "Copiar conjuros de evocación en tu libro de conjuros te cuesta la mitad de tiempo y dinero.",
            ),
            feature(
              "Esculpir Conjuros",
              "Cuando lanzas un conjuro de evocación que afecta a otras criaturas que puedas ver, puedes proteger a algunas de ellas para que superen automáticamente la salvación y no sufran daño si normalmente recibirían la mitad.",
            ),
          ],
          "6": [
            feature(
              "Truco Potente",
              "Tus trucos de evocación siguen dañando incluso a las criaturas que superan la tirada de salvación contra ellos.",
            ),
          ],
          "10": [
            feature(
              "Evocación Potenciada",
              "Añades tu modificador por Inteligencia a una tirada de daño de cualquier conjuro de evocación de mago que lances.",
            ),
          ],
          "14": [
            feature(
              "Sobrecanalizar",
              "Cuando lanzas un conjuro de mago de nivel 1 a 5 que causa daño, puedes hacer que cause el daño máximo posible, aunque usar este rasgo repetidamente antes de un descanso largo te daña.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "illusion",
    name: "Escuela de Ilusionismo",
    parentClass: "wizard",
    aliases: ["ESCUELA DE ILUSIONISMO"],
  },
  {
    slug: "necromancy",
    name: "Escuela de Nigromancia",
    parentClass: "wizard",
    aliases: ["ESCUELA DE NIGROMANCIA"],
  },
  {
    slug: "transmutation",
    name: "Escuela de Transmutación",
    parentClass: "wizard",
    aliases: ["ESCUELA DE TRANSMUTACIÓN", "ESCUELA DE TRANSMUTACION"],
  },
];

buildSubclassBundle({
  projectRoot: PROJECT_ROOT,
  outputDir: OUTPUT_DIR,
  sourcePdf: path.join(PROJECT_ROOT, "homebrew", "Manual del Jugador.pdf"),
  extractor: "scripts/build-phb-subclasses.mjs",
  columnCut: 64,
  classHeaders: CLASS_HEADERS,
  subclasses: SUBCLASSES,
}).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
