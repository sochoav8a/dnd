# Paquetes De Libros Locales

Este directorio permite cargar contenido oficial u homebrew adicional al SRD sin tocar el seed base.

Estructura mínima por libro:

```text
data/books/<slug-del-libro>/
  manifest.json
  subclasses.json
  spells.json
  items.json
  ...
```

`manifest.json`:

```json
{
  "name": "Nombre visible de la fuente",
  "type": "official"
}
```

Notas:

- El seed busca automáticamente subdirectorios con `manifest.json`.
- Solo se cargan archivos con nombres exactos como `subclasses.json`, `spells.json`, `items.json`, `feats.json`, etc.
- Los borradores `.draft.json` no se cargan.
- Cada item se valida con los schemas de `@dnd/content` antes de insertarse o actualizarse.

## Pipeline completo para libros escaneados

Cuando el PDF tiene fuentes embebidas que `pdftotext` no decodifica bien
(glifos corruptos tipo `<`, `\`, palabras "revueltas"), re-OCR-izar desde
imagen resuelve el problema. Luego un LLM local repara los restos.

### 0 · Instalar herramientas (una vez)

```bash
# Arch Linux (ocrmypdf vive en AUR u ofrece pipx)
sudo pacman -S tesseract tesseract-data-spa ghostscript unpaper python-pipx
pipx install ocrmypdf
# Alternativa si usas yay/paru:  yay -S ocrmypdf

# Debian / Ubuntu
sudo apt install ocrmypdf tesseract-ocr-spa ghostscript unpaper

# Mac
brew install ocrmypdf tesseract-lang

# LLM local (Ollama — usa tu GPU automáticamente)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:14b-instruct   # ~9 GB; mejor ratio calidad/VRAM en una 4060
# Alternativa ligera:
# ollama pull llama3.1:8b          # ~4 GB; algo menos preciso
```

### 1 · Re-OCR de los PDFs

```bash
pnpm books:reocr                   # todos
pnpm books:reocr --book phb        # solo uno
pnpm books:reocr --force           # forzar aunque exista output
```

Esto produce `homebrew/<slug>-clean.pdf` re-OCR-izado con tesseract español.

### 2 · Reconstruir los JSON a partir del PDF limpio

```bash
pnpm books:rebuild                 # todos los libros + kinds
pnpm books:rebuild --book phb      # un libro
pnpm books:rebuild --only feats    # un tipo
pnpm books:rebuild --src original  # usar el PDF original (saltar re-OCR)
```

Los build scripts aplican OCR cleanup regex automáticamente.

### 3 · Reparar residuos con LLM local

```bash
pnpm books:repair --book phb
pnpm books:repair --dry-run                 # preview qué entradas repararía
pnpm books:repair --threshold 0.1            # bajar umbral (repara más)
pnpm books:repair --force                    # repara TODAS las entradas
pnpm books:repair --model llama3.1:8b        # usar otro modelo
```

El LLM solo se llama para entradas con alta puntuación de "roto". Guarda
backup `.pre-llm.json` antes de modificar. Valida que el resultado conserve
±30% de longitud (evita alucinaciones).

### 4 · Seedear a la DB

```bash
pnpm db:seed
```

### Chequeo de calidad

```bash
pnpm books:quality                 # ratio de pares rotos por libro
pnpm books:clean-ocr               # re-aplica cleaner regex (post-proceso)
```

Variables de entorno:

- `OLLAMA_BASE_URL` — por defecto `http://localhost:11434`
- `OLLAMA_MODEL` — por defecto `qwen2.5:14b-instruct`
- `OLLAMA_TIMEOUT_MS` — por defecto `90000`
