
Plan de mejoras para seguir iterando
Prioridad Alta (siguiente sprint)
A. Multiclass UI
Formulario de creación extendido para elegir múltiples clases y niveles por clase
El character_state almacena los multiclass_entries como JSONB
El resolver createCharacter y levelUp deben leer eso y pasarlo al engine
B. Hoja de personaje completa

Mostrar spell slots, hechizos preparados/conocidos con filtros por nivel
Sección de features/rasgos expandibles con descripción completa
Edición inline de HP (no solo via state update)
Tracker de dados de vida por clase (especialmente para multiclass)
C. Encuentros — mejoras

Turno actual resaltado con botón "Pasar turno" (avanza al siguiente por iniciativa)
Historial de daño por ronda
Agregar personajes de jugadores directamente (autocomplete desde la campaña)
NPCs/monstruos con stats básicas (AC, saves)
Prioridad Media
D. SRD 5.1 — contenido faltante

Subclases (todas las subclases del SRD — Evocador, Campeón, Ladrón, etc.)
~300 hechizos completos del SRD (actualmente hay 33 de muestra)
Monstruos del SRD 5.1 para encounters (stat blocks)
Feats integrados al flujo de level-up (actualmente los feats existen en DB pero no se asignan)
E. Level-up flow

Wizard de nivel-up: elegir feat o ASI, elegir proficiencias de clase, elegir subclase al nivel apropiado
Para multiclass: elegir qué clase sube de nivel
Distribución de dados de vida (tirar o promedio)
F. Contenido homebrew

UI para crear razas/clases/hechizos/items personalizados
Sistema de entitlements: el DM comparte homebrew con su campaña
Validación con los schemas Zod existentes
Prioridad Baja / Largo Plazo
G. Real-time (WebSockets)

Subscripciones GraphQL para que los jugadores vean el HP en tiempo real durante el encuentro
El DM aplica daño y todos ven la actualización al instante
Chat de dado integrado (roll history visible para todos en la campaña)
H. Lanzamiento de dados


J. Testing

Tests de integración para el rules engine con multiclass (los unit tests base ya existen)
Tests E2E con Playwright para flujos críticos (login → crear personaje → unirse campaña)
Tests del seed para validar datos SRD contra los schemas Zod
K. Performance

DataLoader para N+1 en resolvers GraphQL (especialmente en participants → character)
Índice en contentItems por type+slug
Cache de computed stats en Redis (invalida al actualizar state)


###ESTO TODAVIA NO
Motor de expresiones de dados (2d6+4, d20+STR, etc.)
Historial de tiradas en el encuentro
Tiradas secretas para el DM
I. Gestión de campaña

Notas de sesión por campaña
Timeline de eventos
Compartir mapas (imagen upload)