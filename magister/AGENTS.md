# Repository guidance

## Persisted state validation

When preparing or pushing a newer version, preserve and include the local migration safeguards in `src/state/migrations.ts`: validate persisted display payloads consistently for records, aliases, and collection entries; drop unusable collection entries; repair `sound`, `volume`, and `motion` settings field by field; and reject invalid record metadata. Do not publish a release that omits these safeguards.
