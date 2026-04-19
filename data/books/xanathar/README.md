# Guía del Xanathar para Todo

Este directorio guarda el paquete seedable del primer libro integrado y los artefactos que se usaron para revisar la extracción.

Archivos relevantes:
- `manifest.json`: define la fuente de contenido.
- `subclasses.json`: bundle final listo para seed.
- `subclasses.draft.json`: borrador viejo, útil solo para comparar heurísticas.
- `sections/*.txt`: recortes de trabajo para revisar OCR cuando haga falta.

Flujo recomendado:
1. Si quieres revisar cómo salió el OCR por subclase, corre `npm run books:xanathar:split`.
2. Si quieres un borrador exploratorio, corre `npm run books:xanathar:extract`.
3. Para regenerar el bundle usable, corre `npm run books:xanathar:build`.
4. Ejecuta `pnpm db:seed` para cargar el libro en la base.

Notas:
- `subclasses.json` se genera desde `scripts/build-xanathar-subclasses.mjs` usando `pdftotext -layout` y reconstrucción por columnas.
- El seed ignora `*.draft.json` a propósito.
- La extracción quedó suficientemente limpia para integrar las 31 subclases de Xanathar, aunque algunos textos siguen siendo heurísticos por la calidad del PDF.
