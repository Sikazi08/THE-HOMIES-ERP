---
name: api-client-react composite reference
description: Why consumer typecheck fails after editing lib/api-client-react, and how to fix.
---

# Editing lib/api-client-react requires rebuilding its declarations

`lib/api-client-react` is a TS composite project (`composite: true`, `emitDeclarationOnly`, `outDir: dist`). Consumers (e.g. `artifacts/homies-erp`) typecheck with `tsc -p tsconfig.json --noEmit` and resolve the package through its **emitted `dist/*.d.ts`**, not `src`.

**Symptom:** after adding/changing an export in `lib/api-client-react/src`, the consumer typecheck reports `Module '"@workspace/api-client-react"' has no exported member 'X'` even though the export exists in source. The stale `dist/` + `tsconfig.tsbuildinfo` are being read.

**Fix:** rebuild the lib's declarations before re-typechecking the consumer:
`pnpm --filter @workspace/api-client-react exec tsc -p tsconfig.json`

**Why:** project references use declaration output, so source edits aren't visible until `dist` is regenerated. The runtime is unaffected (Vite reads `src` directly via package `exports`), so dev works while typecheck lies.
