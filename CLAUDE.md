# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

Prerequisites: .NET SDK 8+, Node.js, npm. Fable is installed as a dotnet local tool (`.config/dotnet-tools.json`).

```bash
dotnet tool restore          # Install Fable 4.28.0
npm install                  # Install Vite + virtual-dom

npm start                    # Dev server at http://localhost:8080 (Fable watch + Vite)
npm run build                # Compile F# to ES modules in dist/ (for npm package)
npm run rebuild              # Clean dist/ and rebuild
npm run standalone           # Bundle standalone IIFE to docs/releases/
npm test                     # Compile F# then run Vitest tests (test/*.test.js)

npm run release              # Full release (runs the three steps below)
npm run release:version      # Bump version in package.json, create git commit + tag (via np)
npm run release:standalone   # Build standalone bundle and commit to git
npm run release:publish      # Rebuild dist/ and npm publish (prompts for 2FA)
```

Tests use Vitest against the Fable-compiled JS output. F# must be compiled before tests run (`npm test` handles this). Test files go in `test/`. Use `c.foldDom(f, acc, node)` to traverse `DomNode` trees in tests — the callback receives `(acc, tag, attrs)` where `attrs` is a plain JS object of string attribute values. CI runs `npm test` on pushes and PRs to `master` via GitHub Actions (`.github/workflows/test.yml`).

## Architecture

Compost.js is a composable data visualization library. The core is written in **F#** and compiled to **JavaScript** via **Fable 4**. The runtime dependency is `virtual-dom` for efficient DOM updates in interactive charts.

### F# Source (`src/compost/`)

Three files, compiled in this order (defined in `compost.fsproj`):

1. **`html.fs`** — `Compost.Html` module. Low-level JS interop layer:
   - `Common` module: `[<Emit>]`-based helpers for JS operations (property access, typeof, date formatting)
   - `Virtualdom` module: `[<Import>]` bindings to `virtual-dom` (h, diff, patch, createElement)
   - `DomNode`/`DomAttribute` types and HTML/SVG rendering
   - `foldDom`: generic fold over `DomNode` trees (used in tests to inspect rendered SVG)
   - `createVirtualDomApp`: stateful interactive app loop using virtual-dom diffing

2. **`core.fs`** — `Compost` namespace. The visualization engine (~800 lines):
   - **Domain types**: `Value<'u>` (continuous `COV` or categorical `CAR`), `Scale<'v>`, `Shape<'vx,'vy>`, `Style`, `EventHandler`
   - **Shape** is a discriminated union (Line, Bubble, Shape, Text, Image, Layered, Interactive, Axes, NestX/Y, Padding, etc.) — this is the core composable DSL
   - Uses F# units of measure (`[<Measure>]`) for type-safe coordinate spaces
   - `Scales` module: axis generation, range calculation
   - `Projections` module: coordinate transformation (data space → pixel space)
   - `Drawing` module: converts shapes → SVG elements
   - `Events` module: routes mouse/touch events to interactive handlers
   - `Derived` module: higher-level combinators (FillColor, StrokeColor, Column, Bar, Area)

3. **`compost.fs`** — `main` module. The JavaScript API surface:
   - Exposes `scale` (JsScale) and `compost` (JsCompost) objects
   - Handles JS↔F# value conversion via `parseValue`/`formatValue` (numbers become `COV`, `[string, number]` arrays become `CAR`)
   - All ~20 API methods (`render`, `interactive`, `overlay`, `axes`, `on`, etc.) are defined here

### JavaScript Entry Points (`src/project/`)

- **`standalone.js`** — Imports `scale`/`compost` from F# and assigns to `window.s`/`window.c`
- **`demos.js`** — Interactive demo examples used by the dev server (`index.html`)
- **`data.js`** — Demo datasets (elections, exchange rates, iris)

### Build Outputs

- **`dist/`** — ES modules for npm (`compost.js` is the entry point, `"main"` in package.json)
- **`docs/releases/`** — Standalone IIFE bundles for `<script>` tag usage

### How Fable Compilation Works

`dotnet fable` compiles `.fs` files to `.fs.js` files. During `npm start` (watch mode), these appear next to the source files (`src/compost/*.fs.js`). During `npm run build`, they go to `dist/` via the `-o` flag. Fable library dependencies go into `fable_modules/`. Vite (or any bundler) then treats the `.js` output as standard ES modules.

## Key Patterns

- The JS API uses `obj` and `box`/`unbox` heavily for dynamic typing at the JS boundary. The F# internals are fully typed with units of measure.
- `[<Emit("...")>]` is used for inline JS expressions (property access, typeof, Date operations).
- `[<Import("name","module")>]` is used for virtual-dom imports.
- `JsInterop.createObj` creates plain JS objects from F# key-value sequences.
- Interactive charts use a virtual-dom update cycle: event → update function → render function → diff/patch.
