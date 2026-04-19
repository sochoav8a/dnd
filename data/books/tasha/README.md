# Caldero de Tasha para Todo

Este directorio guarda el bundle seedable de subclases extraído desde el PDF local.

Archivos relevantes:
- `manifest.json`: define la fuente oficial.
- `subclasses.json`: bundle listo para seed.

Flujo recomendado:
1. Regenerar el bundle con `npm run books:tasha:build`.
2. Validar el JSON generado.
3. Ejecutar `pnpm db:seed` para cargarlo en la base.

Notas:
- El extractor vive en `scripts/build-tasha-subclasses.mjs`.
- El builder usa reconstrucción por columnas y corta cada subclase por encabezado de clase para evitar mezclar rasgos entre clases distintas.
- El bundle incluye también las especializaciones de artífice, aunque seguirán ocultas en la UI hasta que exista la clase `artificer` en la app.
