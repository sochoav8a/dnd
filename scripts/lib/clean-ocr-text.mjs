/**
 * Spanish OCR repair for PDF-extracted text.
 *
 * Fixes the most common fragmentation patterns we saw in book exports:
 * - Single letters split from words ("c riatura" → "criatura")
 * - Two-letter prefixes split ("pa rtir" → "partir")
 * - Specific known broken phrases
 *
 * Conservative by design: only merges when left token is a short fragment
 * NOT matching any real Spanish short word. Preserves sentence casing.
 */

// Common short Spanish words that are legitimate on their own.
// DO NOT add broken fragments here — add them to FIXES below instead.
const STOPWORDS = new Set([
  // 1 char
  "a", "e", "o", "y", "u",
  // 2 char
  "al", "el", "la", "lo", "le", "un", "de", "en", "es", "se", "me", "te",
  "su", "tu", "no", "ni", "ya", "si", "sí", "os", "mi", "ti", "yo", "va",
  "ve", "da", "dé", "di", "he", "ha", "hz", "ir", "oh", "uh",
  // 3 char
  "las", "los", "les", "sus", "tus", "por", "con", "sin", "del", "más",
  "muy", "que", "son", "era", "ser", "qué", "dos", "fue", "ver", "día",
  "hoy", "así", "aún", "aun", "tan", "mas", "nos", "han", "hay", "sea",
  "sal", "ven", "fin", "mar", "mía", "mío", "rey", "ley", "pie", "uno",
  "una", "voz", "vez", "tal", "par", "seg", "tre", "tro", // Common
  "cuá", "qui", "cad", "ora", "tus", "sus", "nos", "vos",
  // Game-specific
  "dm", "pj", "pc", "xp", "hp", "ac", "px", "pg",
]);

/**
 * Single-character Spanish letters that are typically WORD SUFFIXES, not
 * prefixes. Never merge these to the FOLLOWING token (would over-merge).
 * `l` and `r` are OK to merge ("l os" → "los", "r ato" → "rato") because they
 * rarely appear as legitimate word-final orphans in our corpus.
 */
const NEVER_MERGE_SINGLE = new Set(["n", "s"]);

function isStopword(tok) {
  return STOPWORDS.has(tok.toLowerCase());
}

// Specific broken-phrase fixes. Case-sensitive lookups are tried first
// (preserves intended capitalisation), then lowercase.
// Keep the key literal (exact whitespace as seen in input).
const FIXES = {
  // Common Spanish words
  "pa ra": "para",
  "Pa ra": "Para",
  "c riatura": "criatura",
  "C riatura": "Criatura",
  "c riaturas": "criaturas",
  "C riaturas": "Criaturas",
  "cua ndo": "cuando",
  "Cua ndo": "Cuando",
  "c uando": "cuando",
  "C uando": "Cuando",
  "ua ndo": "uando",
  "par tir": "partir",
  "pa rtir": "partir",
  "Pa rtir": "Partir",
  "pa r tir": "partir",
  "mome nto": "momento",
  "Mome nto": "Momento",
  "c ualquie r": "cualquier",
  "c ualqu iera": "cualquiera",
  "cua lqu ier": "cualquier",
  "cua lqu iera": "cualquiera",
  "bon ificador": "bonificador",
  "compe te ncia": "competencia",
  "Cons titució n": "Constitución",
  "cons titució n": "constitución",
  "lis tas": "listas",
  "Sigi lo": "Sigilo",
  "sigi lo": "sigilo",
  "ga nas": "ganas",
  "ga na": "gana",
  "ga nar": "ganar",
  "ga ndo": "gando",
  "q ue": "que",
  "Q ue": "Que",
  "q uieres": "quieres",
  "s iguientes": "siguientes",
  "ad icional": "adicional",
  "ad icionales": "adicionales",
  "cr iatura": "criatura",
  "cr iaturas": "criaturas",
  "cr íticos": "críticos",
  "cr ítico": "crítico",
  "pod rás": "podrás",
  "pod rían": "podrían",
  "pod ría": "podría",
  "pod er": "poder",
  "s in": "sin",
  "S in": "Sin",
  "a rma": "arma",
  "A rma": "Arma",
  "a rmas": "armas",
  "A rmas": "Armas",
  "a rmadura": "armadura",
  "Mejora d o": "Mejorado",
  "mejora d o": "mejorado",
  "mejora d a": "mejorada",
  "utiliza d o": "utilizado",
  "emplea d o": "empleado",
  "situa d o": "situado",
  "aislad o": "aislado",
  "i a": "a",
  "mie ntras": "mientras",
  "Mie ntras": "Mientras",
  "fa lla": "falla",
  "fa llar": "fallar",
  "fa llas": "fallas",
  "sa lvación": "salvación",
  "sa lvacion": "salvación",
  "ne rgía": "energía",
  "obj eto": "objeto",
  "fo rma": "forma",
  "Fo rma": "Forma",
  "tie ne": "tiene",
  "Tie ne": "Tiene",
  "tie nen": "tienen",
  "tie mpo": "tiempo",
  "Tie mpo": "Tiempo",
  "destre za": "destreza",
  "Destre za": "Destreza",
  "fue rza": "fuerza",
  "Fue rza": "Fuerza",
  "c orren": "corren",
  "c orrer": "correr",
  "c ausa": "causa",
  "c ausar": "causar",
  "c ausando": "causando",
  "c ausa n": "causan",
  "Cr íti Co": "Crítico",
  "crí ti co": "crítico",
  "Crí ti co": "Crítico",
  "críti co": "crítico",
  "a taque": "ataque",
  "A taque": "Ataque",
  "a taques": "ataques",
  "A taques": "Ataques",
  "n ivel": "nivel",
  "N ivel": "Nivel",
  "n iveles": "niveles",
  "N iveles": "Niveles",
  "re alización": "realización",
  "re alizar": "realizar",
  "re aliza": "realiza",
  "re alizas": "realizas",
  "real iza": "realiza",
  "real ización": "realización",
  "colegio d e": "colegio de",
  "egio n de": "colegio de",
  "egio n d e": "colegio de",
  "Colegio d e": "Colegio de",
  "imbue s": "imbues",
  "dev olver": "devolver",
  "aña d e": "añade",
  "añad ir": "añadir",
  "añad e": "añade",
  "añ adir": "añadir",
  "dev uelve": "devuelve",
  "v elocidad": "velocidad",
  "V elocidad": "Velocidad",
  "t urno": "turno",
  "T urno": "Turno",
  "t urnos": "turnos",
  "ma gia": "magia",
  "Ma gia": "Magia",
  "bri llante": "brillante",
  "t enue": "tenue",
  "T enue": "Tenue",
  "pu eblo": "pueblo",
  "pu erta": "puerta",
  "pu e de": "puede",
  "pu e den": "pueden",
  "aco mpaña": "acompaña",
  "mo do": "modo",
  "Mo do": "Modo",
  "po si ción": "posición",
  "Po si ción": "Posición",
  "re gión": "región",
  "Re gión": "Región",
  "te ner": "tener",
  "te nía": "tenía",
  "Te ner": "Tener",
  "pri mera": "primera",
  "Pri mera": "Primera",
  "pri mero": "primero",
  "pri mer": "primer",
  "ele gir": "elegir",
  "Ele gir": "Elegir",
  "ele giste": "elegiste",
  "ele ges": "eliges",
  "a na dir": "añadir",
  "lanzamie nto": "lanzamiento",
  "Lanzamie nto": "Lanzamiento",
  "lanza r": "lanzar",
  "Lanza r": "Lanzar",
  "lanza s": "lanzas",
  "conjur o": "conjuro",
  "Conjur o": "Conjuro",
  "conjur os": "conjuros",
  "Conjur os": "Conjuros",
  "cre ado": "creado",
  "cre ar": "crear",
  "cre as": "creas",
  "cre ación": "creación",
  "creació n": "creación",
  "a lcance": "alcance",
  "A lcance": "Alcance",
  "a taca": "ataca",
  "a tacar": "atacar",
  "a tacas": "atacas",
  "a tacante": "atacante",
  "enemig o": "enemigo",
  "enemig os": "enemigos",
  "De Atleta": "De Atleta", // leave
  "Atleta S Obresal Iente": "Atleta Sobresaliente",
  "atleta s obresal iente": "atleta sobresaliente",
  "atleta sobresal iente": "atleta sobresaliente",
  "d ad": "dad", // velocidad artifact, but might not be recoverable
  "T enue": "Tenue",
  "a d icional": "adicional",
  "A d icional": "Adicional",
  "velocida d": "velocidad",
  "Velocida d": "Velocidad",
  "posibili dad": "posibilidad",
  "posibili dades": "posibilidades",
  "pu ntuación": "puntuación",
  "Pu ntuación": "Puntuación",
  "pu ntuaciones": "puntuaciones",
  "Canali zar": "Canalizar",
  "canali zar": "canalizar",
  "di vi nidad": "divinidad",
  "Di vi nidad": "Divinidad",
  "di vino": "divino",
  "Di vino": "Divino",
  "di vina": "divina",
  "Di vina": "Divina",
  "hechi zo": "hechizo",
  "Hechi zo": "Hechizo",
  "hechi zos": "hechizos",
  "Hechi zos": "Hechizos",
  "E n": "En",
  "D e": "De",
  "L a": "La",
  "E l": "El",
  "Y a": "Ya",
  "A l": "Al",
  "U n": "Un",
  "S u": "Su",
  "T u": "Tu",
  "S i": "Si",
  "pu ede": "puede",
  "Pu ede": "Puede",
  "pu edes": "puedes",
  "Pu edes": "Puedes",
  "pu eden": "pueden",
  "Pu eden": "Pueden",

  // Stopword + broken-next: split of "en el", "en la", etc.
  "e n ": "en ",
  "E n ": "En ",
  "a l ": "al ",
  "d e ": "de ",
  "D e ": "De ",
  "d el ": "del ",
  "D el ": "Del ",
  "q ue": "que",
  "Q ue": "Que",
  "s i ": "si ",
  "S i ": "Si ",
  "s u ": "su ",
  "S u ": "Su ",
  "t u ": "tu ",
  "T u ": "Tu ",
  "t e ": "te ",
  "T e ": "Te ",

  // Accented verb endings (split suffix n/s/r/l)
  "á n ": "án ",
  "á s ": "ás ",
  "é n ": "én ",
  "é s ": "és ",
  "í n ": "ín ",
  "í s ": "ís ",
  "ó n ": "ón ",
  "ó s ": "ós ",
  "ú n ": "ún ",
  "ú s ": "ús ",
  "á n.": "án.",
  "á n,": "án,",
  "á s.": "ás.",
  "á s,": "ás,",
  "ó n.": "ón.",
  "ó n,": "ón,",
  "causará n": "causarán",
  "serán": "serán",
  "podrá n": "podrán",
  "tendrá n": "tendrán",
  "ganará n": "ganarán",
  "estará n": "estarán",
  "harán": "harán",
  "irá n": "irán",
  "tendrá s": "tendrás",
  "podrá s": "podrás",
  "ganará s": "ganarás",
  "harás": "harás",
  "irá s": "irás",

  // Trailing single-consonant fragments after accented vowels
  "á ncríticos": "án críticos",
  "á ncrítico": "án crítico",

  // Common "of the X" fragments (de + el/la ...)
  "lanzarla s": "lanzarlas",
  "lanzarlo s": "lanzarlos",
  "desactivarla": "desactivarla",
  "herra mientas": "herramientas",
  "Herra mientas": "Herramientas",
  "herramie ntas": "herramientas",
  "ate nción": "atención",
  "Ate nción": "Atención",
  "inte ncion": "intención",
  "inte nción": "intención",
  "Inte nción": "Intención",
  "intenció n": "intención",
  "i ntención": "intención",

  // Specific chains we saw in PHB output
  "doesteapartir": "de este a partir",
  "doestea": "de este a",
  "nintegrity": "nintegrity",
  "perma nente": "permanente",
  "Perma nente": "Permanente",
  "perma nentes": "permanentes",
  "i nvocar": "invocar",
  "I nvocar": "Invocar",
  "i nvoca": "invoca",
  "a parece": "aparece",
  "A parece": "Aparece",
  "a parecen": "aparecen",
  "A parecen": "Aparecen",
  "dura nte": "durante",
  "Dura nte": "Durante",
  "susten tar": "sustentar",
  "suste ntar": "sustentar",
  "suste nto": "sustento",
  "ma ntener": "mantener",
  "Ma ntener": "Mantener",
  "ma ntienes": "mantienes",
  "ma ntiene": "mantiene",
  "ma ntén": "mantén",

  // "qviste" is from "que viste" with OCR losing "ue"
  "qviste": "que viste",
  "Uuego de Manos": "Juego de Manos",
  "cció n": "cción",
  " cción": " cción",

  // "dad" orphan → we can't always recover "velocidad", but common cases:
  "mitad de tu dad": "mitad de tu velocidad",
  "mitad de su dad": "mitad de su velocidad",

  // More common broken words
  "bene ficie": "beneficie",
  "bene ficio": "beneficio",
  "bene ficiar": "beneficiar",
  "bene ficios": "beneficios",
  "el ijas": "elijas",
  "El ijas": "Elijas",
  "el ige": "elige",
  "El ige": "Elige",
  "el iges": "eliges",
  "El iges": "Eliges",
  "u tus": "o tus",
  "Cons titución": "Constitución",
  "cons titución": "constitución",
  "o rzar": "forzar",
  "tra mpa": "trampa",
  "tra mpas": "trampas",
  "ce rradura": "cerradura",
  "ce rraduras": "cerraduras",
  "desa rmar": "desarmar",
  "Desa rmar": "Desarmar",
  "desa fortunado": "desafortunado",
  "c oste": "coste",
  "c ostes": "costes",
  "acció n": "acción",
  "Acció n": "Acción",
  "accio nes": "acciones",
  "reacció n": "reacción",
  "Reacció n": "Reacción",
  "reaccio nes": "reacciones",
  "re acción": "reacción",
  "Re acción": "Reacción",
  "a ccion": "acción",
  "a cción": "acción",
  "a cciones": "acciones",
  "benefic ie": "beneficie",
  "benefic io": "beneficio",

  // Common broken titles we saw
  "Críti Co Mejorado": "Crítico Mejorado",
  "crí ti co": "crítico",
  "críti co": "crítico",
  "N Competencias Adicionales": "Competencias Adicionales",
  "atleta S obresaliente": "Atleta Sobresaliente",
  "Atleta S obresaliente": "Atleta Sobresaliente",
  "Atleta s obresaliente": "Atleta Sobresaliente",
};

/** Apply specific fixes. Longest keys first to prevent partial overlap. */
function applyFixes(text) {
  let out = text;
  const keys = Object.keys(FIXES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (out.includes(k)) {
      out = out.split(k).join(FIXES[k]);
    }
  }
  return out;
}

/**
 * Conservative heuristic merge: join short fragments (1-2 chars) to
 * the following token when the fragment is NOT a real Spanish short word.
 */
function heuristicMerge(text) {
  if (!text) return text;

  // Tokenize preserving whitespace and punctuation.
  // Pattern: word chars + accented | single whitespace run | punct
  const tokens = text.match(/[A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]+|\s+|[^\sA-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]/g);
  if (!tokens) return text;

  const out = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // If it's a word
    if (/^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+$/.test(tok)) {
      // Look ahead: space + next word
      if (
        i + 2 < tokens.length
        && /^\s+$/.test(tokens[i + 1])
        && /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+$/.test(tokens[i + 2])
      ) {
        const next = tokens[i + 2];
        const tokLower = tok.toLowerCase();
        const isFragment =
          tok.length <= 2
          && !isStopword(tokLower)
          // Single-char suffix letters (n/s/r/l) look like word endings, not
          // prefixes — merging them with the next word creates fake words
          // like "nel" (from "n" + "el") or "san" (from "s" + "an").
          && !(tok.length === 1 && NEVER_MERGE_SINGLE.has(tokLower))
          // Don't merge uppercase "M." type initials at sentence start
          && !/^[A-Z]\.$/.test(tok);
        // Only merge if next starts with lowercase (otherwise it's a sentence boundary)
        const nextStartsLower = /^[a-záéíóúñü]/.test(next);
        if (isFragment && nextStartsLower) {
          out.push(tok + next);
          i += 3;
          continue;
        }
      }
    }

    out.push(tok);
    i++;
  }

  return out.join("");
}

// Unicode-aware word boundary: require surrounding whitespace or end-of-string.
// (Plain \b treats accented chars as non-word in ASCII mode, which corrupted
//  legitimate words like "Mágicos".)
const WB_LEFT = "(?:^|(?<=[\\s(«¡¿\"]))";
const WB_RIGHT = "(?=[\\s.,;:!?)»\"]|$)";

function reBoundary(source, flags = "g") {
  return new RegExp(WB_LEFT + source + WB_RIGHT, flags);
}

/**
 * Mid-word capital-letter split.
 * OCR often inserts spaces around a capital letter that was part of an
 * uppercase title (e.g. "Mejora D o" from "MEJORADO"). We detect:
 *   word(lowercase) + SPACE + single-capital + SPACE + word(lowercase)
 * and rejoin the capital as lowercase in the middle.
 */
function repairMidWordCapitalSplits(text) {
  return text.replace(
    /([a-záéíóúñü]+)\s+([A-ZÁÉÍÓÚÑÜ])\s+([a-záéíóúñü]+)/g,
    (_m, a, cap, b) => a + cap.toLowerCase() + b,
  );
}

/**
 * Name-style triple split where every fragment starts with a capital:
 *   "Cr íti Co" → "Crítico"
 *   "Mejora D o" handled above; this catches "Xx xx Xx" shapes.
 * Only triggers when the middle fragment is short (≤3 chars), to avoid
 * gluing legitimate multi-word phrases.
 */
function repairTripleCapitalFragments(text) {
  return text.replace(
    reBoundary(
      "([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{0,3})\\s+([a-záéíóúñü]{1,3})\\s+([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{0,3})",
    ),
    (match, a, mid, c) => {
      if (STOPWORDS.has(mid.toLowerCase())) return match;
      return a + mid + c.toLowerCase();
    },
  );
}

/**
 * Long-word + short-suffix-word pair where both start with a capital.
 *   "Críti Co" → "Crítico"
 *   "Mejora Do" → "Mejorado"
 * Only triggers when the suffix is ≤3 chars and NOT a legitimate particle.
 * Uses whitespace-based boundaries (not `\b`) so accented words aren't split
 * mid-character.
 */
function repairTitleCaseSuffix(text) {
  return text.replace(
    reBoundary(
      "([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{2,})\\s+([A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]{0,2})",
    ),
    (match, base, suffix) => {
      const s = suffix.toLowerCase();
      if (STOPWORDS.has(s)) return match;
      if (["de", "la", "el", "al", "en", "di", "do", "re", "mi", "fa", "sol"].includes(s))
        return match;
      return base + s;
    },
  );
}

/** Normalise whitespace and apply all cleanups. */
export function cleanOcrText(text) {
  if (typeof text !== "string" || text.length === 0) return text;
  let out = text.replace(/\s+/g, " ").trim();
  // Multiple passes: fixes can expose new matches after merging.
  for (let pass = 0; pass < 4; pass++) {
    const before = out;
    out = applyFixes(out);
    out = repairMidWordCapitalSplits(out);
    out = repairTripleCapitalFragments(out);
    out = repairTitleCaseSuffix(out);
    out = heuristicMerge(out);
    if (out === before) break;
  }
  return out;
}

/** Apply cleanOcrText recursively to all strings in a value. */
export function cleanOcrDeep(value) {
  if (typeof value === "string") return cleanOcrText(value);
  if (Array.isArray(value)) return value.map(cleanOcrDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = cleanOcrDeep(v);
    return out;
  }
  return value;
}
