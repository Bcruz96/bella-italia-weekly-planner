# Bella Italia Weekly Planner

## AI task planning

Click **Add with AI**, enter the team's access code, and write the tasks in UK English. The interface, generated tasks and AI warnings use UK English (en-GB); text entered in another language is translated without changing the facts. Use explicit dates (DD/MM/YYYY) wherever possible. Bare weekdays refer to the reference week shown in the window; today and tomorrow refer to the current date in London.

Simple group notes also work, for example:

> 25/10/26 grpo sales 25 px at 19:30 Fish Chips - Brownie

This creates one **Group sales** task for **25/10/2026**, **19:30**, **25 people**, with **Menu: Fish Chips - Brownie**. `grpo`/`grp` are recognised as `group`, and `px`/`pax` mean people. Two-digit years mean 2000-2099. This explicit group-note format is parsed and validated locally on the server without a model call (a valid team access code is still required). Impossible dates, times or people counts are rejected. The shorter note `22/10/26 30 px at 22 fish chips - brownie` is also supported: it creates a Booking at 22:00. Multiple notes can be entered on separate lines. Free-form messages still use OpenAI.

Free-form example:

> 23/10/2026 at 19:00, 25 people: prepare the group tables and tell the kitchen. Saturday: check drinks stock.

The assistant creates an **editable preview**. Check the dates, optional time, people count, category and description, then choose **Add reviewed tasks**. Dates the assistant cannot resolve are left empty and must be filled in. Past dates need acknowledgement. The assistant never marks tasks complete, edits existing tasks or invents extra preparation tasks.

Time, people and description are included in the saved task text so the existing Supabase schema and other users of the checklist remain compatible. No database migration is needed.

### Activate on Vercel

1. In the project's **Settings → Environment Variables**, create:
   - `OPENAI_API_KEY`: your OpenAI API key, kept server-side only.
   - `AI_ACCESS_CODE`: a separate, random team access code of at least 12 characters. Share this with the team, never the API key.
   - `OPENAI_MODEL` (optional): defaults to `gpt-4.1-mini`; use a model supporting Responses and Structured Outputs.
2. Apply these variables to the intended deployment environment and redeploy the project.
3. Keep Framework Preset **Other** for this static website. The root `api/plan-tasks.js` runs as a Vercel Node function. Do not add a rewrite routing `/api/*` to `index.html`.
4. Ensure the OpenAI API project has access to the selected model and a configured usage budget. AI API usage is billed separately from this website.
5. Open the deployed website, choose **Add with AI**, and enter `AI_ACCESS_CODE`.

Do not commit `.env` files or put the OpenAI key in HTML, browser JavaScript, or the access-code field. `.env.example` lists variable names only. The endpoint requires the team access code for every request, and the OpenAI key for free-form planning, checks the team code before calling OpenAI, bounds message/output size, uses a 25-second upstream timeout, and does not return the secret or raw upstream errors.

For free-form conversations, the message, the last 12 conversation turns, current unsaved draft and a bounded snapshot of relevant checklist tasks are sent to OpenAI. The snapshot covers the selected week, the next seven days, and dated manual tasks within the last/next 30 days, capped at 200 tasks with an explicit truncation notice. Task content is treated as data, never instructions. Requests use `store: false`. The team code is held in memory by default. If you tick **Remember on this device**, a successfully accepted code is stored in this browser's local storage and reused on later visits. Choose **Forget code** to remove it; a rejected code is automatically removed so you can enter a replacement. The OpenAI API key is never stored in the browser. The text and draft are preserved in session storage in the same browser tab, and removed after a confirmed save or discard.

### Avoiding duplicate saves

The app persists stable task UUIDs and the reviewed data before inserting anything. If the response is lost or the tab reloads, reopen **Add with AI** and choose **Retry saving this batch**. The app checks the database before retrying. Editing and regenerating are locked while a batch has an uncertain outcome. Duplicate full task text on the same date is skipped, including duplicates inside a message. Matching against existing tasks is exact; differently worded tasks are not assumed to be duplicates. This does not enforce global uniqueness across separate users' simultaneous imports.

### Tests and local development

Use Node 24.15+, then `npm ci` and `npm test`. The automated suite uses the actual HTML and a simulated DOM/database to test preview editing, ambiguous dates, dates in the past, duplicate batches, uncertain saves, restored drafts, safe rendering, server authentication and invalid AI output. No real model calls or production writes are made by `npm test`.

A static file server alone cannot run the AI endpoint. Use the Vercel development server with the environment variables configured to test the whole feature locally.

The optional `tests/live-check.cjs --live` is a separate, explicit Supabase check; it requires `jsdom` and `@supabase/supabase-js`, creates temporary records, and attempts cleanup. It is not included in `npm test`. A restricted delete policy may require administrator cleanup of fixed completions.

Official references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [production practices](https://developers.openai.com/api/docs/guides/production-best-practices).

## Contextual conversation and live overview

The assistant supports follow-up messages such as "make it 20 people" using the current unsaved draft, and can answer questions using the supplied planner context. Asking a question preserves the draft. Saved-task edits, deletion and completion stay in the existing checklist controls; the assistant cannot perform those actions or claim to have saved a proposal. The conversation is stored in session storage in this browser tab; **New chat** clears it and the unsaved draft, without changing saved tasks. Confirmed saves are recorded as actual outcomes in the conversation.

The live overview recalculates after sync and at date rollover while the page is open: unfinished tasks today, overdue dated manual tasks, and possible shared start times. Historical recurring fixed tasks are not treated as overdue omissions. Opening a different day does not overwrite the selected date at midnight. **Today's priorities** and **Review this week** produce read-only factual summaries without a GPT call, so they remain available during API quota problems. Free-form reasoning still requires working OpenAI API credit. There are no autonomous GPT calls when the app is closed and no background cloud scheduler in this version.

Daily and weekly repeats use explicit start/end dates. The review form includes **Repeat** and **Repeat until (inclusive)**. Occurrences are materialised as ordinary dated checklist tasks on save, with at most 30 per batch and stable IDs for retries. There is no indefinite schedule: shortening or changing the template after saving does not edit previously saved occurrences. Repeat requests without an end date require clarification.

Database loading is paginated so records beyond the first response page are included. Timing clashes are hints only: the planner does not know durations, table capacity or staff availability. No database schema changes or new environment variables are required for this update.

Routine GPT replies now reserve up to 2,400 output tokens. The model snapshot is further bounded to 12,000 task characters, prioritising the selected week, and marks any omission as truncated. Provider errors log only whitelisted diagnostic fields (status, recognised error code, request ID, rate-limit header values) under `openai_request_failed`; prompts, keys and raw upstream error text are not logged. Unknown HTTP 429 responses are not labelled temporary. For persistent failures, inspect this entry in Vercel Logs and the OpenAI project Usage, Limits and Billing pages. No automatic retry loops are used.
