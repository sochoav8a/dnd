#!/usr/bin/env node

import path from "node:path";
import { buildSubclassBundle } from "./lib/build-subclass-bundle.mjs";

const PROJECT_ROOT = "/home/santiago/dnd";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "data", "books", "tasha");

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
  { classSlug: "artificer", aliases: ["ARTÍFICES", "ARTIFICES"] },
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
    slug: "alchemist",
    name: "Alquimista",
    parentClass: "artificer",
    aliases: ["ALQUIMISTA"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Conjuros del Alquimista",
              "Siempre tienes ciertos conjuros preparados y cuentan como conjuros de artificiero para ti.",
            ),
            feature(
              "Elixir Experimental",
              "Tras un descanso largo creas un elixir mágico aleatorio, y también puedes fabricar elixires adicionales gastando espacios de conjuro.",
            ),
          ],
          "5": [
            feature(
              "Erudición Alquímica",
              "Añades tu modificador por Inteligencia a una tirada de curación o de daño ácido, de fuego, necrótico o de veneno de algunos de tus conjuros de artificiero.",
            ),
          ],
          "9": [
            feature(
              "Reactivos Restauradores",
              "Tus conjuros de curación restauran puntos de golpe adicionales y puedes lanzar restauración menor varias veces sin gastar espacios de conjuro.",
            ),
          ],
          "15": [
            feature(
              "Maestría Química",
              "Obtienes resistencia al daño ácido y de veneno, inmunidad a la condición envenenado y puedes lanzar curación mayor y nube aniquiladora una vez cada una sin gastar espacios de conjuro.",
            ),
          ],
        },
      },
    },
  },
  { slug: "armorer", name: "Armero", parentClass: "artificer", aliases: ["ARMERO"] },
  { slug: "artillerist", name: "Artillero", parentClass: "artificer", aliases: ["ARTILLERO"] },
  {
    slug: "battle-smith",
    name: "Herrero de batalla",
    parentClass: "artificer",
    aliases: ["HERRERO DE BATALLA"],
  },
  {
    slug: "beast",
    name: "Senda de la Bestia",
    parentClass: "barbarian",
    aliases: ["SENDA DE LA BESTIA"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Forma de la Bestia",
              "Cuando entras en furia, manifiestas una mordedura, garras o una cola bestial, cada una con propiedades ofensivas distintas.",
            ),
          ],
          "6": [
            feature(
              "Alma Bestial",
              "Tus armas naturales pasan a contar como mágicas y, tras cada descanso, eliges una adaptación bestial que mejora tu movimiento o movilidad.",
            ),
          ],
          "10": [
            feature(
              "Furia Infecciosa",
              "Cuando impactas con tus armas naturales durante la furia, puedes forzar al objetivo a dañar a otra criatura o a recibir daño psíquico adicional.",
            ),
          ],
          "14": [
            feature(
              "Llamada a la Caza",
              "Al entrar en furia, puedes otorgarte a ti y a varios aliados puntos de golpe temporales y un aumento de daño una vez por turno mientras dure la furia.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "wild-magic-barbarian",
    name: "Senda de la Magia Salvaje",
    parentClass: "barbarian",
    aliases: ["SENDA DE LA MAGIA SALVAJE"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Consciencia Mágica",
              "Como acción, puedes percibir la presencia de conjuros y objetos mágicos cercanos varias veces por descanso largo.",
            ),
            feature(
              "Oleada Salvaje",
              "Cuando entras en furia, tiras en la tabla de magia salvaje para determinar un efecto mágico aleatorio que te acompaña mientras dure.",
            ),
          ],
          "6": [
            feature(
              "Magia Fortalecedora",
              "Como acción, puedes reforzar a una criatura con energía mágica para mejorar sus tiradas o restaurar un espacio de conjuro de bajo nivel.",
            ),
          ],
          "10": [
            feature(
              "Reacción Inestable",
              "Cuando recibes daño o fallas una salvación mientras estás en furia, puedes volver a tirar en la tabla de Oleada Salvaje y reemplazar el efecto actual por uno nuevo.",
            ),
          ],
          "14": [
            feature(
              "Oleada Controlada",
              "Cuando tiras en la tabla de Oleada Salvaje, puedes lanzar dos dados y elegir cuál de los dos efectos obtienes.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "creation",
    name: "Colegio de la Creación",
    parentClass: "bard",
    aliases: ["COLEGIO DE LA CREACIÓN", "COLEGIO DE LA CREACION"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Nota de Potencial",
              "Tu Inspiración Bárdica gana efectos adicionales según el uso que se le dé: daño extra, bonificadores de curación o protección al recibir un ataque.",
            ),
            feature(
              "Actuación de la Creación",
              "Como acción, puedes crear temporalmente un objeto no mágico de tamaño medio o menor en un espacio desocupado cercano.",
            ),
          ],
          "6": [
            feature(
              "Animar Objeto",
              "Como acción, puedes animar un objeto grande o menor para que te siga y luche a tu lado como un compañero danzante.",
            ),
          ],
          "14": [
            feature(
              "Crescendo Creativo",
              "Puedes crear más de un objeto a la vez con Actuación de la Creación y ya no estás limitado por el valor en oro de los objetos creados.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "eloquence",
    name: "Colegio de la Elocuencia",
    parentClass: "bard",
    aliases: ["COLEGIO DE LA ELOCUENCIA"],
  },
  {
    slug: "genie",
    name: "El Genio",
    parentClass: "warlock",
    aliases: ["EL GENIO"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Lista de Conjuros Ampliada",
              "El Genio añade conjuros temáticos a tu lista de conjuros de brujo.",
            ),
            feature(
              "Vasija del Genio",
              "Obtienes una pequeña vasija mágica asociada a tu patrón que te sirve como foco y te concede daño adicional una vez por turno.",
            ),
          ],
          "6": [
            feature(
              "Don Elemental",
              "Ganas resistencia a un tipo de daño relacionado con tu patrón y puedes obtener una velocidad volando temporal varias veces por descanso largo.",
            ),
          ],
          "10": [
            feature(
              "Refugio de la Vasija",
              "Puedes refugiarte dentro de tu vasija y permitir que varios aliados descansen brevemente en su interior, donde recuperan puntos de golpe adicionales.",
            ),
          ],
          "14": [
            feature(
              "Deseo Limitado",
              "Pides a tu patrón un pequeño milagro y reproduces el efecto de un conjuro de nivel 6 o inferior con una acción, dentro de ciertos límites.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "fathomless",
    name: "El Insondable",
    parentClass: "warlock",
    aliases: ["EL INSONDABLE"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Lista de Conjuros Ampliada",
              "El Insondable añade conjuros temáticos a tu lista de conjuros de brujo.",
            ),
            feature(
              "Tentáculo de las Profundidades",
              "Como acción adicional, invocas un tentáculo espectral que golpea a tus enemigos, reduce su velocidad y puede volver a atacar al moverse.",
            ),
            feature(
              "Don de los Mares",
              "Obtienes velocidad nadando y puedes respirar bajo el agua.",
            ),
          ],
          "6": [
            feature(
              "Alma Oceánica",
              "Obtienes resistencia al daño de frío y puedes comunicarte bajo el agua con otras criaturas sumergidas.",
            ),
            feature(
              "Bucle Guardián",
              "Tu tentáculo puede interponerse y reducir el daño que recibes tú u otra criatura cercana.",
            ),
          ],
          "10": [
            feature(
              "Tentáculos Aferradores",
              "Aprendes invocar tentáculos negros de Evard, puedes lanzarlo una vez sin gastar espacio de conjuro y recibes beneficios mientras mantienes la concentración sobre él.",
            ),
          ],
          "14": [
            feature(
              "Zambullida Insondable",
              "Puedes teletransportarte junto con varios aliados a otra masa de agua que conozcas, recorriendo grandes distancias en un instante.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "peace-domain",
    name: "Dominio de la Paz",
    parentClass: "cleric",
    aliases: ["DOMINIO DE LA PAZ"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Implemento de la Paz",
              "Ganas competencia en Perspicacia, Interpretación o Persuasión, y cualquier habilidad elegida por este rasgo recibe tu bonificador por competencia doble.",
            ),
            feature(
              "Vínculo Enaltecedor",
              "Como acción, unes a varias criaturas durante 10 minutos para que puedan sumar 1d4 a una tirada por turno mientras permanezcan cerca unas de otras.",
            ),
          ],
          "2": [
            feature(
              "Canalizar Divinidad: Bálsamo de Paz",
              "Te desplazas sin provocar ataques de oportunidad y restauras puntos de golpe a las criaturas a las que te acerques durante ese movimiento.",
            ),
          ],
          "6": [
            feature(
              "Vínculo Protector",
              "Las criaturas unidas por tu Vínculo Enaltecedor pueden teletransportarse para protegerse mutuamente y repartir el daño recibido.",
            ),
          ],
          "8": [
            feature(
              "Lanzamiento Potente",
              "Añades tu modificador por Sabiduría al daño que causas con cualquier truco de clérigo.",
            ),
          ],
          "17": [
            feature(
              "Vínculo Expansivo",
              "El alcance y la potencia de tus vínculos aumentan, permitiendo proteger a más aliados a mayor distancia.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "twilight-domain",
    name: "Dominio del Crepúsculo",
    parentClass: "cleric",
    aliases: [
      "DOMINIO DEL CREPÚSCULO",
      "DOMINIO DEL CREPUSCULO",
      "O DEL CREPÚSCULO",
      "O DEL CREPUSCULO",
    ],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Ojos de la Noche",
              "Compartes una visión en la oscuridad extraordinaria contigo y con tus aliados.",
            ),
            feature(
              "Bendición Vigilante",
              "Como acción, otorgas ventaja a una criatura en su siguiente tirada de iniciativa.",
            ),
          ],
          "2": [
            feature(
              "Canalizar Divinidad: Santuario del Crepúsculo",
              "Creas una esfera de penumbra protectora que al final de cada turno otorga puntos de golpe temporales o acaba con los estados hechizado o asustado.",
            ),
          ],
          "6": [
            feature(
              "Pasos de la Noche",
              "Mientras estés en penumbra u oscuridad, obtienes una velocidad volando durante 1 minuto.",
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
              "Sudario del Crepúsculo",
              "Las criaturas que elijas y terminen su turno en tu Santuario del Crepúsculo obtienen media cobertura.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "order-domain",
    name: "Dominio del Orden",
    parentClass: "cleric",
    aliases: ["DOMINIO DEL ORDEN", "DOMINIO DEL ÜRDEN", "DOMINIO DEL URDEN"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Competencias Adicionales",
              "Ganas competencia con armaduras pesadas o con una habilidad de Intimidación o Persuasión si ya la tienes.",
            ),
            feature(
              "Voz de Autoridad",
              "Cuando lanzas un conjuro de nivel 1 o superior sobre un aliado, puedes permitirle usar su reacción para hacer un ataque con arma.",
            ),
          ],
          "2": [
            feature(
              "Canalizar Divinidad: Exigir Orden",
              "Presentas tu símbolo sagrado y obligas a varias criaturas cercanas a soltar lo que sostienen o a quedar hechizadas por el orden divino.",
            ),
          ],
          "6": [
            feature(
              "Encarnación de la Ley",
              "Cuando lanzas un conjuro de encantamiento con una acción, puedes cambiar su tiempo de lanzamiento a una acción adicional un número limitado de veces.",
            ),
          ],
          "8": [
            feature(
              "Golpe Divino",
              "Una vez por turno, cuando impactas con un ataque con arma, puedes causar 1d8 de daño psíquico adicional. El daño aumenta a 2d8 al llegar a nivel 14.",
            ),
          ],
          "17": [
            feature(
              "Ira del Orden",
              "Si un aliado bajo uno de tus conjuros impacta a un objetivo, ese objetivo recibe daño psíquico adicional la primera vez cada turno que sufra ese efecto.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "spores",
    name: "Círculo de las Esporas",
    parentClass: "druid",
    aliases: ["CÍRCULO DE LAS ESPORAS", "CIRCULO DE LAS ESPORAS"],
    override: {
      data: {
        features_by_level: {
          "2": [
            feature(
              "Conjuros del Círculo",
              "Siempre tienes ciertos conjuros relacionados con hongos, descomposición y necromancia preparados.",
            ),
            feature(
              "Halo de Esporas",
              "Como reacción, puedes dañar con esporas necrosantes a una criatura que empiece o termine su turno cerca de ti.",
            ),
            feature(
              "Entidad Simbiótica",
              "Puedes gastar un uso de Forma Salvaje para cubrirte de esporas, obtener puntos de golpe temporales y potenciar tu Halo de Esporas y tus ataques cuerpo a cuerpo.",
            ),
          ],
          "6": [
            feature(
              "Infestación Fúngica",
              "Puedes animar temporalmente el cadáver de una criatura pequeña o mediana como zombi con tus esporas.",
            ),
          ],
          "10": [
            feature(
              "Esporas Propagadas",
              "Mientras tu Entidad Simbiótica esté activa, puedes proyectar una nube móvil de esporas que mantiene el efecto de tu Halo de Esporas a distancia.",
            ),
          ],
          "14": [
            feature(
              "Cuerpo Fúngico",
              "Tus esporas se fusionan contigo y te otorgan inmunidades y resistencia crítica a golpes devastadores.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "stars",
    name: "Círculo de las Estrellas",
    parentClass: "druid",
    aliases: ["CÍRCULO DE LAS ESTRELLAS", "CIRCULO DE LAS ESTRELLAS"],
  },
  {
    slug: "wildfire",
    name: "Círculo del Fuego Salvaje",
    parentClass: "druid",
    aliases: [
      "CÍRCULO DEL FUEGO SALVAJE",
      "CIRCULO DEL FUEGO SALVAJE",
      "CÍRCULO DEL FUEGO SAL",
      "CIRCULO DEL FUEGO SAL",
    ],
    override: {
      data: {
        features_by_level: {
          "2": [
            feature(
              "Conjuros del Círculo",
              "Siempre tienes preparados conjuros vinculados al fuego y a la renovación de la vida.",
            ),
            feature(
              "Invocar Espíritu de Fuego Salvaje",
              "Puedes gastar un uso de Forma Salvaje para invocar un espíritu ígneo que combate junto a ti y puede teletransportar aliados.",
            ),
          ],
          "6": [
            feature(
              "Vínculo Mejorado",
              "Tus conjuros curativos y de fuego se potencian cuando lanzas a través de tu espíritu de fuego salvaje.",
            ),
          ],
          "10": [
            feature(
              "Llamas Cauterizadoras",
              "Cuando criaturas mueren o son teletransportadas por tu espíritu, puedes crear llamas curativas o dañinas en el campo de batalla.",
            ),
          ],
          "14": [
            feature(
              "Renacimiento Abrasador",
              "Si caes a 0 puntos de golpe, tu espíritu puede sacrificarse para devolverte la vida y dañar a los enemigos cercanos.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "fey-wanderer",
    name: "Errante Feérico",
    parentClass: "ranger",
    aliases: ["ERRANTE FEÉRICO", "ERRANTE FEERICO"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Magia del Errante Feérico",
              "Siempre tienes preparados ciertos conjuros de temática feérica.",
            ),
            feature(
              "Golpes Temibles",
              "Una vez por turno, cuando impactas a una criatura, puedes infligir daño psíquico adicional.",
            ),
            feature(
              "Glamour Sobrenatural",
              "Añades tu Sabiduría a las pruebas de Carisma y obtienes competencia en una habilidad social.",
            ),
          ],
          "7": [
            feature(
              "Torsión Embelesadora",
              "Puedes redirigir o castigar efectos de hechizado o asustado contra otras criaturas cercanas.",
            ),
          ],
          "11": [
            feature(
              "Refuerzos Feéricos",
              "Aprendes invocar ser feérico y puedes lanzarlo sin componentes materiales, además de hacerlo sin concentración a niveles superiores.",
            ),
          ],
          "15": [
            feature(
              "Errante de la Bruma",
              "Puedes teletransportarte y arrastrar contigo o intercambiar la posición de otra criatura cercana.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "swarmkeeper",
    name: "Guardaenjambres",
    parentClass: "ranger",
    aliases: ["GUARDAENJAMBRES"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Magia del Guardaenjambres",
              "Siempre tienes preparados ciertos conjuros relacionados con el movimiento, la naturaleza y el enjambre que te acompaña.",
            ),
            feature(
              "Enjambre Reunido",
              "Una vez por turno, tras impactar a un enemigo, tu enjambre puede mover al objetivo, moverte a ti o infligir daño adicional.",
            ),
          ],
          "7": [
            feature(
              "Marea Enjambre",
              "Tu enjambre te ayuda a volar o a obtener media cobertura temporal mientras se arremolina a tu alrededor.",
            ),
          ],
          "11": [
            feature(
              "Enjambre Poderoso",
              "Tu enjambre mejora sus opciones ofensivas y de movimiento, empujando, derribando o ayudándote a desplazarte con más eficacia.",
            ),
          ],
          "15": [
            feature(
              "Dispersión del Enjambre",
              "Cuando recibes daño, puedes dispersarte en tu enjambre para teletransportarte y reducir el daño recibido.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "rune-knight",
    name: "Caballero Rúnico",
    parentClass: "fighter",
    aliases: ["CABALLERO RÚNICO", "CABALLERO RUNICO", "LLERO RÚNICO", "LLERO RUNICO"],
  },
  {
    slug: "psi-warrior",
    name: "Guerrero Psiónico",
    parentClass: "fighter",
    aliases: [
      "GUERRERO PSIÓNICO",
      "GUERRERO PSIONICO",
      "ERRERO PSIÓNICO",
      "ERRERO PSIONICO",
    ],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Poder Psiónico",
              "Obtienes dados de energía psiónica y aprendes varias formas de usarlos para proteger, mover o dañar con tu mente.",
            ),
          ],
          "7": [
            feature(
              "Adepto Telequinético",
              "Ganas nuevas técnicas psiónicas que te permiten impulsarte por el aire y empujar a tus enemigos con más fuerza.",
            ),
          ],
          "10": [
            feature(
              "Mente Protegida",
              "Obtienes resistencia al daño psíquico y protección frente a efectos que intenten hechizarte o asustarte.",
            ),
          ],
          "15": [
            feature(
              "Baluarte de la Fuerza",
              "Puedes crear una cobertura telequinética que protege a varios aliados a la vez.",
            ),
          ],
          "18": [
            feature(
              "Maestro Telequinético",
              "Aprendes telequinesis y puedes usar tus poderes mentales para lanzar, golpear o mover objetivos con gran libertad.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "clockwork-soul",
    name: "Alma Mecánica",
    parentClass: "sorcerer",
    aliases: ["ALMA MECÁNICA", "ALMA MECANICA"],
    override: {
      data: {
        features_by_level: {
          "1": [
            feature(
              "Magia Mecánica",
              "Aprendes conjuros adicionales ligados al orden y puedes sustituirlos por otros de abjuración o transmutación de varias listas.",
            ),
            feature(
              "Restablecer Equilibrio",
              "Como reacción, puedes cancelar la ventaja o desventaja de una tirada que haga una criatura que veas.",
            ),
          ],
          "6": [
            feature(
              "Bastión de la Ley",
              "Gastas puntos de hechicería para envolver a una criatura en una barrera ordenada que reduce el daño recibido.",
            ),
          ],
          "14": [
            feature(
              "Trance de Orden",
              "Durante 1 minuto, estabilizas tu magia: los ataques contra ti no pueden tener ventaja y tus tiradas bajas en el d20 pasan a contar como 10.",
            ),
          ],
          "18": [
            feature(
              "Cabalgata Mecánica",
              "Invocas espíritus del orden para curar, reparar y disipar magia en una gran zona a tu alrededor.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "aberrant-mind",
    name: "Mente Aberrante",
    parentClass: "sorcerer",
    aliases: ["MENTE ABERRANTE"],
  },
  {
    slug: "bladesinging",
    name: "Canto de la Hoja",
    parentClass: "wizard",
    aliases: ["CANTO DE LA HOJA"],
  },
  {
    slug: "scribes",
    name: "Orden de los Escribas",
    parentClass: "wizard",
    aliases: ["ORDEN DE LOS ESCRIBAS", "ÜRDEN DE LOS ESCRIBAS", "URDEN DE LOS ESCRIBAS"],
  },
  {
    slug: "mercy",
    name: "Camino de la Misericordia",
    parentClass: "monk",
    aliases: ["CAMINO DE LA MISERICORDIA"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Herramientas de Misericordia",
              "Obtienes competencias médicas y un atuendo ritual que representa tu tradición.",
            ),
            feature(
              "Mano de la Curación",
              "Puedes gastar ki para restaurar puntos de golpe con un toque, incluso como parte de Ráfaga de Golpes.",
            ),
            feature(
              "Mano del Daño",
              "Cuando impactas con un ataque sin armas, puedes gastar ki para infligir daño necrótico adicional.",
            ),
          ],
          "6": [
            feature(
              "Toque del Médico",
              "Tu Mano de la Curación puede eliminar enfermedades y estados alterados, y tu Mano del Daño puede envenenar a un enemigo.",
            ),
          ],
          "11": [
            feature(
              "Ráfaga de Curación y Daño",
              "Cuando usas Ráfaga de Golpes, puedes sustituir algunos impactos por usos gratuitos de Mano de la Curación sin dejar de repartir daño.",
            ),
          ],
          "17": [
            feature(
              "Mano de la Misericordia Suprema",
              "Puedes devolver a la vida a una criatura recién muerta con un toque, a cambio de una gran cantidad de puntos de ki.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "astral-self",
    name: "Camino del Yo Astral",
    parentClass: "monk",
    aliases: ["CAMINO DEL YO ASTRAL", "EL YO ASTRAL"],
  },
  {
    slug: "glory",
    name: "Juramento de Gloria",
    parentClass: "paladin",
    aliases: ["JURAMENTO DE GLORIA"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Canalizar Divinidad: Atleta Sin Igual",
              "Mejoras temporalmente tus capacidades físicas y atléticas con un estallido de gloria divina.",
            ),
            feature(
              "Canalizar Divinidad: Golpe Inspirador",
              "Cuando infliges Castigo Divino, puedes repartir puntos de golpe temporales entre tus aliados.",
            ),
          ],
          "7": [
            feature(
              "Aura de Presteza",
              "Tú y tus aliados cercanos aumentáis vuestra velocidad al iniciar el turno cerca de ti.",
            ),
          ],
          "15": [
            feature(
              "Defensa Gloriosa",
              "Cuando una criatura que puedas ver impacte a otra, puedes usar tu reacción para aumentar su CA y contraatacar si el ataque falla.",
            ),
          ],
          "20": [
            feature(
              "Leyenda Viviente",
              "Durante 1 minuto, tus dotes heroicas alcanzan su apogeo y puedes repetir fallos, convertir tus ataques en aciertos casi seguros y forzar salvaciones a tus enemigos.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "watchers",
    name: "Juramento de los Vigilantes",
    parentClass: "paladin",
    aliases: ["JURAMENTO DE LOS VIGILANTES"],
  },
  {
    slug: "phantom",
    name: "Fantasma",
    parentClass: "rogue",
    aliases: ["FANTASMA"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Susurros de los Muertos",
              "Tras cada descanso, un eco de los difuntos te concede una competencia temporal en una habilidad o herramienta.",
            ),
            feature(
              "Lamentos de la Tumba",
              "Cuando aplicas tu Ataque Furtivo, puedes infligir parte de ese daño a una segunda criatura cercana como energía necrosa.",
            ),
          ],
          "9": [
            feature(
              "Recuerdos de los Difuntos",
              "Las almas de los muertos te dejan símbolos sobrenaturales que fortalecen tus rasgos fantasmales y pueden alimentar tus usos de Lamentos de la Tumba.",
            ),
          ],
          "13": [
            feature(
              "Paseo Fantasmal",
              "Te vuelves parcialmente incorpóreo durante unos minutos, puedes flotar y atravesar criaturas y objetos, aunque ello conlleva un coste.",
            ),
          ],
          "17": [
            feature(
              "Amigo de la Muerte",
              "Tus vínculos con la muerte se profundizan, mejorando tus Lamentos de la Tumba y los símbolos que obtienes de los difuntos.",
            ),
          ],
        },
      },
    },
  },
  {
    slug: "soulknife",
    name: "Rebanaalmas",
    parentClass: "rogue",
    aliases: ["REBANAALMAS"],
    override: {
      data: {
        features_by_level: {
          "3": [
            feature(
              "Cuchillas Psíquicas",
              "Cuando atacas, puedes manifestar cuchillas de energía psíquica que infligen daño mental y desaparecen tras el golpe.",
            ),
            feature(
              "Poder Psiónico",
              "Obtienes dados de energía psiónica que puedes usar para reforzar tus habilidades, comunicarte telepáticamente y alimentar otros rasgos del Rebanaalmas.",
            ),
          ],
          "9": [
            feature(
              "Cuchillas del Alma",
              "Tus cuchillas psíquicas mejoran y puedes usar tu energía mental para fallar menos y teletransportarte.",
            ),
          ],
          "13": [
            feature(
              "Velo Psíquico",
              "Puedes envolverte en energía psíquica para volverte invisible durante un tiempo.",
            ),
          ],
          "17": [
            feature(
              "Desgarrar la Mente",
              "Tus cuchillas pueden sobrecargar la mente de un objetivo y aturdirlo temporalmente.",
            ),
          ],
        },
      },
    },
  },
];

buildSubclassBundle({
  projectRoot: PROJECT_ROOT,
  outputDir: OUTPUT_DIR,
  sourcePdf: path.join(PROJECT_ROOT, "homebrew", "Caldero de Tasha para Todo.pdf"),
  extractor: "scripts/build-tasha-subclasses.mjs",
  columnCut: 64,
  classHeaders: CLASS_HEADERS,
  subclasses: SUBCLASSES,
}).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
