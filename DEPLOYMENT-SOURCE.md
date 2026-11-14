# Production Worker source status

Checked on 2026-11-14.

## Current state

- Cloudflare Worker: `workflowstartertemp`
- Custom domain: `biz.theintro2society.org`
- Deployment method: direct Cloudflare API upload
- Production module: a single uploaded `index.js` module
- Bound resources: `DEEPSEEK_API_KEY` (secret), `MY_WORKFLOW`, and `WORKFLOW_STATUS` (Durable Object namespace)
- The deployed application exposes a code-review endpoint at `/api/review`, workflow start/status/event endpoints, and a WebSocket status endpoint.

The tracked files in this repository currently describe a separate React/Vite Cloudflare Workflows starter demo. They do not reproduce the live production Worker bundle. The live application therefore does not yet have a reliable source-controlled build/deploy path.

## Live security changes

The production Worker was updated directly in Cloudflare on 2026-11-14 to:

- enforce same-origin checks for write APIs and WebSocket connections when an Origin header is present
- rate-limit code reviews to 10 requests per minute per IP, workflow writes to 20 per minute per IP, and WebSocket connections to 30 per minute per IP using the existing Durable Object namespace
- validate JSON content types, payload shapes, and request sizes
- cap code-review input at 30,000 characters
- avoid returning internal upstream error details to browsers
- validate the approval-event payload before sending it to a Workflow

These controls are present in the live Cloudflare Worker but are not represented by the template source in this repository.

## Required source-control follow-up

Before changing or redeploying the live `workflowstartertemp` Worker from this repository, port the deployed code-review/workflow implementation into maintainable source files, add tests for its API protections, regenerate Worker types, and confirm the resulting build reproduces the current production behavior. Until then, treat this repository as a starter-template copy and do not use its deploy command against the production Worker.
