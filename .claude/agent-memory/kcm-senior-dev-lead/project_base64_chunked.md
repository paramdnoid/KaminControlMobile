---
name: project_base64_chunked
description: TASK-03 — chunked fromCharCode pattern for large ZIP base64 in genesisBundle.ts
metadata:
  type: project
---

`readAssetBase64` in `src/import/genesisBundle.ts` was fixed to process bytes in 64 KiB chunks instead of one character at a time.

**Before (O(n²)):**
```ts
for (let index = 0; index < bytes.length; index += 1) {
  binary += String.fromCharCode(bytes[index]);
}
```

**After (O(n)):**
```ts
const CHUNK = 65536;
for (let offset = 0; offset < bytes.length; offset += CHUNK) {
  binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
}
```

**Why:** Character-by-character string concatenation is O(n²) in some V8/JSC configurations. For a 50–200 MB Genesis ZIP this caused 30–120 second hangs and potential heap exhaustion. The chunk size 65 536 is a safe upper bound for `Function.prototype.apply` argument lists on all tested JS engines. The web path (uses File API `arrayBuffer()`) applies this fix; the native path (uses `FileSystem.readAsStringAsync` with Base64 encoding) is unchanged and doesn't need it.

**How to apply:** Any time a `Uint8Array` buffer needs to be converted to a base64 string in a browser/RN context, use the chunked spread-into-fromCharCode pattern.

Related: [[project_quality_audit_2026_06]]
