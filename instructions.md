MCP + MindsDB + Supabase + React/Netlify: Step-by-Step Build Guide (on top of existing Streamlit repo)

You already have a repo with a Streamlit UI and a single ClickHouse connector. These steps layer the new architecture without breaking the current app, then progressively cut over.

Phase 0 — Prepare the repo (non-destructive)

Create a new feature branch for the migration work.

Keep your existing Streamlit app where it is.

Add a new top-level web folder for the React/TypeScript frontend.

Add a new top-level netlify/functions folder for serverless APIs.

Add a scripts folder for one-off DB/admin tasks and docs.

Add a root README.md that explains that both UIs will coexist during the transition.

Done when: Streamlit still runs as before; the new folders exist alongside it.

Phase 1 — Supabase project and metadata schema

Create a Supabase project.

Record the project URL and keys for later:

Public/browser: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

Server-only: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

Apply the previously provided SQL schema for:

Users/profiles, datasources, tables, columns, column semantics versions, user queries, query results, dashboards, dashboard widgets.

Enable Row Level Security and add policies so users only see their own data; ensure datasources/tables/columns are visible only to the owner unless you choose to share.

Seed a minimal datasource row (logical handle for your MindsDB ClickHouse connection).

Done when: Tables exist; RLS is active; basic seed data is present.

Phase 2 — MindsDB and MCP in front of ClickHouse

Run a MindsDB instance (self-hosted).

Inside MindsDB, add a connection to your existing ClickHouse database.

Verify that MindsDB can list ClickHouse tables and execute simple queries.

Ensure the MindsDB MCP server endpoint is enabled and reachable from your serverless environment (lock it down via network or token).

Done when: MindsDB can enumerate and query ClickHouse; MCP endpoint is reachable.

Phase 3 — Netlify site and serverless runtime

Create a Netlify site and connect it to your GitHub repo.

Configure build settings so the web app builds and the netlify/functions directory is recognized for functions.

Add server-only environment variables in Netlify:

SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

MINDSDB_MCP_URL and any MindsDB auth values if required.

LLM_API_KEY for semantics generation.

GCP_SA_KEY_B64 (base64 of your existing Google service account JSON) and GCP_PROJECT_ID for STT.

A default GCP_STT_LANGUAGE if desired.

Add browser environment variables (prefixed with VITE_) in Netlify:

VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

Done when: A deploy builds successfully; functions can run locally via Netlify dev and in cloud.

Phase 4 — React/TypeScript app shell (coexists with Streamlit)

Initialize a React/TypeScript app inside the web folder.

Set up a single Supabase client module that reads the VITE_ env vars.

Create placeholder pages:

Login (Supabase Auth).

Schema (for column semantics editing).

Ask (NL→SQL console).

Dashboard (widgets and charts).

Verify authentication flow and a basic read/write to a test table with RLS enforced.

Done when: React app runs locally and can authenticate against Supabase.

Phase 5 — Schema sync via MCP (port your extractor logic)

Create a schema-sync Netlify Function that:

Iterates over datasources from Supabase.

Calls MindsDB MCP to list schemas/tables and describe tables.

Upserts tables and columns in Supabase.

For any newly discovered column missing semantics:

Generate an initial semantic name/description/quality using your LLM.

Insert a new row in the column semantics versions table with an “LLM” source.

Update the current semantic fields on the columns table and link to the version.

Schedule periodic sync (if needed) using Netlify scheduled invocations.

Done when: Running the sync populates tables/columns and seeds semantics for new columns.

Phase 6 — Column semantics editing (UI + functions)

Create a semantic-update function that:

Receives an edit request.

Writes a new version row with a “user” source.

Updates the current semantic fields on the columns table and pointers.

Create a semantic-history function that fetches version history for a column.

Create a semantic-revert function that promotes a previous version to current.

Implement the Schema page:

Display datasource → schema → table → columns hierarchy.

Allow inline editing for semantic fields.

Provide buttons for Save, History, Revert, and optional Regenerate.

Done when: Users can edit meanings, view history, and revert; changes persist and are auditable.

Phase 7 — Agent function and Ask page

Create an agent function that:

Accepts the natural-language query and the target datasource.

Fetches the latest semantics for relevant columns.

Builds a dictionary context for planning.

Plans SQL using your chosen LLM or rules, guided by semantics.

Executes the SQL via MindsDB MCP.

Stores the query record with status, row count, and duration.

Stores a preview of results for display and dashboards.

Implement the Ask page:

Provide a text box for the query.

Provide a run button that calls the agent function.

Display the SQL plan (optional), result preview, row count, and timing.

Provide a button to add the result to a dashboard as a widget.

Done when: Natural-language queries return a preview and persist to history; results can be pinned to dashboards.

Phase 8 — Dashboard and widgets

Implement a Dashboard page that:

Lists dashboards for the user.

Renders a grid of widgets.

For each widget, fetches the associated query preview and shows the configured visualization.

Implement basic visualization configuration and persistence for each widget.

Enable add/remove/reorder of widgets.

Done when: Users can create dashboards, add visualizations from query history, and persist layouts.

Phase 9 — Voice capture using your existing Google STT

Create an stt Netlify Function that:

Accepts short audio clips from the browser.

Uses your existing Google service account credentials (from Netlify env) to call Google Cloud Speech-to-Text.

Returns the transcript and a confidence score.

In the Ask page:

Add a mic button that records short clips and sends them to the stt function.

Insert the transcript into the query box on success.

Keep clip durations short for the synchronous API path; consider long-running transcription later if you need longer dictation.

Done when: Speech input reliably produces a text query; manual typing remains the fallback.

Phase 10 — Security and governance checks

Confirm that all browser calls to Supabase are RLS-guarded and scoped to the authenticated user.

Confirm that serverless functions use the Supabase service role key and never expose it to the browser.

Ensure the MindsDB MCP endpoint is not accessible from the browser and is network-restricted for serverless backends.

Limit stored result previews to small sizes and safe content.

Consider adding a “sensitive column” flag and denylist where appropriate.

Done when: Cross-tenant access is blocked; secrets are confined to serverless; data exposure is minimized.

Phase 11 — Performance, caching, and resilience

Impose limits and pagination on all table/column and result listings.

Use small result previews and streaming when appropriate.

Add timeouts and retries for MCP calls.

Add a lightweight cache for column semantics dictionaries in the agent function.

Monitor cold start behavior and keep functions lean.

Done when: Typical queries are responsive; large tables don’t degrade UX; failures degrade gracefully.

Phase 12 — Observability and error handling

Standardize function responses and error formats.

Log correlation IDs, user IDs, datasource IDs, and hashed SQL for troubleshooting.

Track counters for query volume, failures, and latency.

Verify that logs are available in Netlify and that Supabase query logs can be correlated.

Done when: Failures are diagnosable with minimal effort; you have basic health indicators.

Phase 13 — CI/CD and environment promotion

Keep the React app and Functions in the same repo for atomic deploys.

Configure preview builds and, if needed, a separate Supabase project or schema for QA.

Maintain a clear .env.example and document all environment variables and their scopes.

Done when: Pushes trigger builds; previews run against safe environments; variables are documented.

Phase 14 — Documentation and runbooks

Update the repo README to cover:

Local dev with Netlify dev.

Supabase schema and RLS overview.

MindsDB deployment and connector setup.

Function endpoints and how the frontend calls them.

Create a runbook that explains:

Rotating keys for Supabase, MindsDB, and LLM/STT.

Recovering from schema-sync or MCP failures.

Adding a new datasource in MindsDB and exposing it in the UI.

Done when: A new engineer can bootstrap the stack using the docs alone.

Phase 15 — Cutover and deprecate Streamlit (optional)

Validate feature parity between Streamlit and the new React/Netlify app.

Migrate any remaining workflows or utilities from Streamlit if needed.

Decide whether to retire Streamlit or keep it as an internal tool.

Update the README to reflect the primary UI.

Done when: The React/Netlify UI is the primary interface and Streamlit’s status is clearly documented.

Notes and Nuances

Keep both UIs during the build to avoid blocking current workflows.

The schema sync step is the bridge from your original extractor to the federated MindsDB path; once validated, you can stop generating the old metadata JSON.

The semantics editing loop (versioned, user-editable, and referenced in planning) is central to quality; ensure it’s easy to use and audit.

Supabase RLS is your main security perimeter for browser traffic; verify policies with multiple test accounts.

No separate backend domain is required: Netlify Functions and Supabase project endpoints are sufficient.

This checklist is purposefully action-oriented and code-free so Cursor can execute it as a build plan on top of your existing repo.