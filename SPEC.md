# Claptrapedia workshop specification

Claptrapedia Workshop is a local app for building and maintaining the [Claptrapedia](https://claptrapedia.com) Borderlands catalogue. It turns game extracts and reference material into reviewed catalogue changes, then exports a PostgreSQL migration for the public site.

The first release covers Borderlands 1. Start with weapon families and the enemies, locations and loot sources needed to describe their acquisition. Add other record types and games as their data and site models are ready.

## Repositories and ownership

| Repository | Owns |
| --- | --- |
| [`claptrapedia/extractions`](https://github.com/claptrapedia/extractions) | Raw game extractions used as workshop inputs |
| [`claptrapedia/workshop`](https://github.com/claptrapedia/workshop) | Import, research, review, local drafts, SQL generation and testing |
| [`claptrapedia/database`](https://github.com/claptrapedia/database) | PostgreSQL DDL, catalogue migrations, generated schema snapshot and database deployment |
| [`claptrapedia/site`](https://github.com/claptrapedia/site) | Public website, SQL queries via Postgres.js (`postgres`) and website deployment |

Use the database repo’s `db/migrations/` as the source of truth for schema and catalogue changes. Its generated `db/schema.sql` describes the current schema for review and AI context. Take table names, column names, data types, constraints and conflict keys from the migrated local database. If the schema cannot represent a catalogue fact, flag it for review and add the required DDL migration before publishing that data.

Prisma Postgres hosts staging and production. The database repo uses dbmate to apply SQL migrations. The site runs SQL queries through Postgres.js.

Git stores the catalogue’s migration history. PostgreSQL holds its current published state. The workshop can store structured drafts and evidence locally without maintaining a separate JSON catalogue or a shared Zod package.

## Local database checkout

Clone `claptrapedia/database` alongside the workshop or anywhere else on your machine. Set the absolute path in the workshop’s local environment configuration.

```dotenv
CLAPTRAPEDIA_DATABASE_DIR=/absolute/path/to/claptrapedia/database
```

The workshop’s Node backend uses this path to read `db/schema.sql` and `db/migrations/`, and to write new migration files after testing. The checkout supplies the schema directly. Read the generated `db/schema.sql` when preparing AI context, and query local PostgreSQL for existing catalogue records and IDs.

Show the resolved checkout and migration destination before export. If the path, schema snapshot or migrations directory is missing, explain what needs fixing and show the expected location.

## Operator workflow

1. **Import game data.** Choose a local capture produced by the BL1 Enhanced extractor. The workshop lists candidate weapon families and shows the original game records behind each one.
2. **Research an entry.** Start from the extracted data and find relevant references from Lootlemon and the Borderlands Wiki. Review the matches, add a URL or note manually, and reuse previously saved evidence.
3. **Review the draft.** Compare the proposed entry with the game data, supporting sources and current local catalogue values. Edit it, then approve the revision you want to publish.
4. **Queue changes.** Add approved revisions to the migration queue. Inspect the per-item SQL preview and select the entries to include.
5. **Build and test.** Assemble one timestamped dbmate migration from the selected changes. Apply it with dbmate to a disposable local PostgreSQL database built from the database repo’s existing migrations. Inspect the result before exporting.
6. **Export.** Write the exact tested SQL file under `db/migrations/` in the local database checkout. Commit it in the database repo for review and deployment. Its CI applies it to staging, then production.

The original [Borderlens extractor app](https://github.com/thekeogh/borderlands1e-mods/tree/main/borderlens-extractor/app) is the reference for capture import, saved evidence and per-item review. Reuse those parts where practical. The workshop’s export is a migration containing the selected changes.

## Import and identity

- Support the existing extractor capture format first. Retain the original capture or a local reference to it so an editor can inspect the underlying game records.
- Preserve extracted record IDs and paths. Where multiple raw records describe variants of one family, show the grouping and let the editor correct it.
- Use a stable catalogue identity scoped to the game and record type, resolved through the database schema. Treat names and URL slugs as editable fields. Check for an existing match before proposing a new row.
- Re-importing the same capture must preserve approved work and manual corrections. Flag any newly conflicting identity or evidence for review.
- Keep game, release and DLC distinct. A BL1 Enhanced capture supports claims about that release. Apply a fact to other releases only when the evidence supports it. Keep an item’s DLC of origin separate from the DLC of a location where it drops.

## Research and review

- Show the raw game data and external evidence beside the editable draft. Save source URLs and the supporting facts or notes locally. Cache sources by URL and allow a manual refresh.
- Use AI to find candidate sources and propose catalogue values. Treat fetched page text as evidence. The editor decides whether a source refers to the right item and whether its claims apply.
- Surface conflicting figures, uncertain matches and unknown values. Keep facts unsupported by the evidence unset where the site allows it, or flag them if they are required. For drop rates, preserve conditions such as release and source when known.
- Preserve manual corrections when research runs again. New proposals can be reviewed without silently replacing an approved revision.
- Keep an edit to a published entry separate from the current published values. Show the proposed change before approval.
- Support manual editing even when AI or a source is unavailable. Save progress so a restart or research failure leaves the draft available.

## SQL generation and batching

AI uses the DDL as reference when proposing catalogue values. The workshop generates SQL in TypeScript from reviewed values, using explicit mappings for each supported record type. dbmate and PostgreSQL verify the candidate by applying it to the migrated local test database.

- Generate `INSERT ... ON CONFLICT ... DO UPDATE` against the database’s actual unique keys. Use fixed table and column mappings and a reliable PostgreSQL literal encoder for values in the exported file.
- Use the same generator for per-item previews and the final migration. Per-item previews represent that entry’s contribution to the batch. The generator orders statements across entries so referenced rows exist before dependent rows and relationship inserts.
- Emit deterministic SQL for the same selected revisions and schema. Group related statements and label them by record identity so an editor can review the file in Git.
- Emit the batch in a single `-- migrate:up` section and use dbmate’s default transaction. If a write fails, the batch rolls back. Show the database error with the relevant item or statement when available. Correct a published catalogue change with a follow-up migration.
- Only change fields and relationships included in the approved revision. Removing a drop source requires an explicit relationship removal. Retiring or deleting a record requires an explicit operation supported by the database schema. An absent entry in a capture or batch carries no deletion intent.
- Detect conflicting edits to the same record in a batch. Report a missing reference before export if the target is absent from both the existing catalogue and the batch.

## Local testing and delivery

- Keep the workshop local and bind it to loopback. Use a dedicated disposable database for the **Test migration** action. Use dbmate to update the normal site development database from the database checkout after export.
- Run dbmate against the database checkout’s current migration history plus the candidate file in a temporary migrations directory. Use the same PostgreSQL major version as the hosted database where practical. Test the actual SQL bytes that will be exported and show the affected rows or a summary of changes.
- Tie the successful test to the SQL file and migration history used for the test. If the selected drafts, generated SQL or migration history change, require a fresh test before export.
- Export a new file, for example `db/migrations/20261119143000_catalog_bl1_weapon_drops.sql`. Preserve the tested file contents. Check for version and path collisions and keep existing migrations intact.
- After export, record which draft revisions went into the file and clear those revisions from the queue. Show their state as exported. The database repo’s CI runs `dbmate --no-dump-schema migrate` against staging and then production, using each environment’s direct connection URL. Refresh the committed `db/schema.sql` from a migrated local database when DDL changes.

## Implementation starting point

- Use a TypeScript local web app with React and a Node backend. Keep filesystem access, the AI provider and database operations on the backend.
- Reuse the extractor’s SQLite draft store if adapting its code. Otherwise use SQLite for drafts, source evidence, corrections and export history. PostgreSQL is the catalogue database.
- Configure the Docker PostgreSQL target and one AI provider alongside `CLAPTRAPEDIA_DATABASE_DIR`. Store credentials in local environment configuration. Keep direct staging and production database URLs in the database repo’s release jobs. The site uses its own pooled runtime URL.
- Build the end-to-end path with one weapon and one related record before adding batch research. Get manual editing, SQL generation, local testing and export working first. Then wire in capture import and AI research against those same entry screens.

## First release acceptance criteria

- Configure a database checkout outside the workshop repo, load its schema and export to its migrations directory. A missing or invalid path gives a clear configuration error.
- Import a real BL1 capture, find a weapon family and inspect its raw records. Re-importing the capture preserves local corrections.
- Research an item, review its sources, edit the draft and approve it. The draft survives restarting the workshop and can be edited when a source is unavailable.
- Preview an individual entry’s SQL and build a batch with a weapon and a newly added related record. The migration applies successfully to local PostgreSQL.
- Edit an existing weapon without creating a duplicate. Remove an approved drop relationship without affecting unrelated drops. A failed statement leaves the catalogue unchanged.
- Changing the selected revisions or migration history after a successful test requires a retest. Export creates a new migration containing the exact tested SQL.
- The database repo can apply the exported file through dbmate, and the site can read the updated catalogue through its normal Postgres.js queries.
