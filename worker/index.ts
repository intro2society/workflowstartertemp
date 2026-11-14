// Export the Workflow and Durable Object classes
export { MyWorkflow } from "./workflow";
export { WorkflowStatusDO } from "./durable-object";

// Enforce same-origin writes and per-IP request limits for public workflow endpoints.
async function protectRequest(
	request: Request,
	env: Env,
	url: URL,
	scope: "api" | "websocket",
): Promise<Response | null> {
	const origin = request.headers.get("Origin");
	if (origin && origin !== url.origin) {
		return Response.json(
			{ error: "Cross-origin requests are not allowed" },
			{ status: 403 },
		);
	}

	const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
	try {
		const id = env.WORKFLOW_STATUS.idFromName(
			"rate-limit:" + scope + ":" + clientIp,
		);
		const limiter = env.WORKFLOW_STATUS.get(id);
		const allowed = await limiter.consumeRateLimit(
			scope === "api" ? 20 : 30,
			60_000,
		);
		if (!allowed) {
			return Response.json(
				{ error: "Rate limit exceeded. Please try again shortly." },
				{ status: 429 },
			);
		}
	} catch {
		return Response.json(
			{ error: "Request protection is temporarily unavailable." },
			{ status: 503 },
		);
	}
	return null;
}

/**
 * Main Worker fetch handler
 *
 * Handles API routes and WebSocket upgrade requests for workflow management:
 * - POST /api/workflow/start - Create new workflow instance
 * - GET /api/workflow/status/:id - Get workflow status
 * - POST /api/workflow/event/:id - Send events to workflow
 * - GET /ws - WebSocket connection for real-time updates
 */
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const isWorkflowWrite =
			request.method === "POST" &&
			(url.pathname === "/api/workflow/start" ||
				url.pathname.startsWith("/api/workflow/event/"));
		if (isWorkflowWrite) {
			const blocked = await protectRequest(request, env, url, "api");
			if (blocked) return blocked;
		}

		// API: Start a new workflow instance
		if (url.pathname === "/api/workflow/start" && request.method === "POST") {
			try {
				const instance = await env.MY_WORKFLOW.create({
					params: {
						timestamp: Date.now(),
					},
				});

				return Response.json({
					instanceId: instance.id,
					message: "Workflow started successfully",
				});
			} catch {
				return Response.json(
					{ error: "Failed to start workflow" },
					{ status: 500 },
				);
			}
		}

		// API: Get workflow status
		if (url.pathname.startsWith("/api/workflow/status/")) {
			if (request.method !== "GET") {
				return Response.json({ error: "Method not allowed" }, { status: 405 });
			}
			const instanceId = url.pathname.split("/").pop();
			if (!instanceId) {
				return Response.json(
					{ error: "Instance ID required" },
					{ status: 400 },
				);
			}

			try {
				const instance = await env.MY_WORKFLOW.get(instanceId);
				const status = await instance.status();
				return Response.json(status);
			} catch {
				return Response.json(
					{ error: "Failed to get workflow status" },
					{ status: 500 },
				);
			}
		}

		// API: Send event to workflow instance
		if (
			url.pathname.startsWith("/api/workflow/event/") &&
			request.method === "POST"
		) {
			const instanceId = url.pathname.split("/").pop();
			if (!instanceId) {
				return Response.json(
					{ error: "Instance ID required" },
					{ status: 400 },
				);
			}

			const contentType = request.headers.get("Content-Type") ?? "";
			if (!contentType.toLowerCase().startsWith("application/json")) {
				return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
			}
			const contentLength = Number(request.headers.get("Content-Length") ?? "0");
			if (Number.isFinite(contentLength) && contentLength > 4096) {
				return Response.json({ error: "Request body is too large" }, { status: 413 });
			}

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return Response.json({ error: "Invalid JSON body" }, { status: 400 });
			}
			if (!body || typeof body !== "object" || Array.isArray(body)) {
				return Response.json({ error: "Invalid approval payload" }, { status: 400 });
			}
			const payload = body as Record<string, unknown>;
			if (
				typeof payload.approved !== "boolean" ||
				(payload.comment !== undefined && typeof payload.comment !== "string") ||
				(typeof payload.comment === "string" && payload.comment.length > 2000)
			) {
				return Response.json({ error: "Invalid approval payload" }, { status: 400 });
			}
			const eventPayload = {
				approved: payload.approved,
				...(typeof payload.comment === "string" ? { comment: payload.comment } : {}),
			};

			try {
				const instance = await env.MY_WORKFLOW.get(instanceId);

				await instance.sendEvent({
					type: "user-approval",
					payload: eventPayload,
				});

				return Response.json({
					success: true,
					message: "Event sent successfully",
				});
			} catch {
				return Response.json(
					{ error: "Failed to send event" },
					{ status: 500 },
				);
			}
		}

		// WebSocket: Connect to workflow status updates
		if (url.pathname === "/ws") {
			const blocked = await protectRequest(request, env, url, "websocket");
			if (blocked) return blocked;
			const instanceId = url.searchParams.get("instanceId");
			if (!instanceId) {
				return new Response("instanceId query parameter required", {
					status: 400,
				});
			}

			const upgradeHeader = request.headers.get("Upgrade");
			if (upgradeHeader !== "websocket") {
				return new Response("Expected Upgrade: websocket", { status: 426 });
			}

			try {
				const doId = env.WORKFLOW_STATUS.idFromName(instanceId);
				const stub = env.WORKFLOW_STATUS.get(doId);
				return stub.fetch(request);
			} catch {
				return new Response("Failed to establish WebSocket connection", {
					status: 500,
				});
			}
		}

		return Response.json({ error: "Not Found" }, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
