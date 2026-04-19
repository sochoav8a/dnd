# Manual del Jugador

Este directorio guarda el bundle seedable de subclases del PHB extraído desde el PDF local.

Archivos relevantes:
- `manifest.json`: define la fuente oficial.
- `subclasses.json`: bundle listo para seed.

Flujo recomendado:
1. Regenerar el bundle con `npm run books:phb:build`.
2. Validar el JSON generado.
3. Ejecutar `pnpm db:seed` para cargarlo en la base.

Notas:
- El extractor vive en `scripts/build-phb-subclasses.mjs`.
- Para evitar duplicados visuales con el SRD, la API deduplica por `slug` cuando no se pide una `sourceId` concreta.
- En esa deduplicación se conserva el SRD como preferencia para las subclases que ya existían allí, porque trae datos estructurados más limpios para algunas listas de conjuros.
