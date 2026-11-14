# Cloudflare Workflows Starter Template

> **Production source warning:** The live Cloudflare Worker named `workflowstartertemp` (currently serving `biz.theintro2society.org`) is not currently built from this repository. The deployed Worker is a separately uploaded custom code-review/workflow application. The React/Vite files in this repository are a starter-template copy. Do not deploy this repository to the production Worker until the live implementation has been reconciled with the tracked source.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/workflows-starter-template)

A real-time, interactive demonstration of [Cloudflare Workflows](https://developers.cloudflare.com/workflows) with live updates via WebSockets and Durable Objects. This template showcases durable multi-step workflows with time-based delays, event-driven pauses, and real-time status visualization.

## Getting Started

### Installation

```bash
npm ci
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the interactive demo.

### Deployment

```bash
npm run deploy
```

**Important:** This deploy command targets the starter-template source, not the currently deployed `biz.theintro2society.org` application.

## Learn More

- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects)
- [Workers Documentation](https://developers.cloudflare.com/workers)

See [DEPLOYMENT-SOURCE.md](./DEPLOYMENT-SOURCE.md) for the current production/source mismatch and the live Worker security controls.
