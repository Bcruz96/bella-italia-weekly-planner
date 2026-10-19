# Bella Italia Weekly Planner

A weekly checklist for BI Wellington Street with a clean UK English interface.

- Open on the current day and navigate between days or weeks.
- Add tasks to a day and category, mark them complete and delete manual tasks.
- View task groups in a single ordered column on desktop and mobile.
- Save tasks and completion states in Supabase, with automatic refresh and visible sync errors.
- Follow midnight when viewing today, while keeping other selected dates unchanged.

Saved tasks remain in Supabase. The assistant, chat, imports and model API endpoint have been removed. No OpenAI credit or team access code is required. Previously remembered assistant credentials and drafts are cleared when the updated app loads.

## Development and tests

Use Node 24.15+, then run npm ci and npm test. Serve the project with a static web server. Tests cover dates, navigation, task persistence, failed writes, safe rendering and database pagination without production writes.

Deploy on Vercel with Framework Preset **Other**. The existing Supabase connection is configured in script.js. Remove unused OPENAI_API_KEY, AI_ACCESS_CODE and OPENAI_MODEL variables from Vercel if still configured.

The optional tests/live-check.cjs --live performs a separate Supabase check and creates temporary records. Restricted delete policies may require administrator cleanup. It is not included in npm test.
