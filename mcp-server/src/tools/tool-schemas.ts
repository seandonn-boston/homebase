/**
 * JSON Schema definitions for all MCP tool inputs and outputs.
 */

export const TOOL_SCHEMAS: Record<
	string,
	{ input: Record<string, unknown>; output: Record<string, unknown> }
> = {
	// -------------------------------------------------------------------------
	// Brain tools (M-02a through M-02d)
	// -------------------------------------------------------------------------
	brain_query: {
		input: {
			type: "object",
			properties: {
				query: { type: "string", description: "Search query string" },
				filters: {
					type: "object",
					properties: {
						category: { type: "string" },
						scope: { type: "string" },
						since: {
							type: "number",
							description: "Unix timestamp lower bound",
						},
						until: {
							type: "number",
							description: "Unix timestamp upper bound",
						},
					},
				},
				limit: { type: "number", default: 20 },
			},
			required: ["query"],
		},
		output: {
			type: "object",
			properties: {
				results: { type: "array", items: { type: "object" } },
				total: { type: "number" },
			},
			required: ["results", "total"],
		},
	},

	brain_record: {
		input: {
			type: "object",
			properties: {
				category: { type: "string" },
				title: { type: "string" },
				content: { type: "string" },
				tags: { type: "array", items: { type: "string" } },
				scope: { type: "string" },
			},
			required: ["category", "title", "content"],
		},
		output: {
			type: "object",
			properties: {
				id: { type: "string" },
				path: { type: "string" },
			},
			required: ["id", "path"],
		},
	},

	brain_retrieve: {
		input: {
			type: "object",
			properties: {
				id: { type: "string" },
				traverseLinks: { type: "boolean", default: false },
				depth: { type: "number", default: 1 },
			},
			required: ["id"],
		},
		output: {
			type: "object",
			properties: {
				entry: { type: ["object", "null"] },
				linked: { type: "array", items: { type: "object" } },
			},
			required: ["entry"],
		},
	},

	brain_strengthen: {
		input: {
			type: "object",
			properties: {
				id: { type: "string" },
				agent: { type: "string" },
			},
			required: ["id", "agent"],
		},
		output: {
			type: "object",
			properties: {
				id: { type: "string" },
				newScore: { type: "number" },
			},
			required: ["id", "newScore"],
		},
	},

	brain_audit: {
		input: {
			type: "object",
			properties: {
				since: { type: "number" },
				until: { type: "number" },
				limit: { type: "number", default: 50 },
			},
		},
		output: {
			type: "object",
			properties: {
				trail: { type: "array", items: { type: "object" } },
			},
			required: ["trail"],
		},
	},

	brain_purge: {
		input: {
			type: "object",
			properties: {
				id: { type: "string" },
				reason: { type: "string" },
				confirm: { type: "boolean" },
			},
			required: ["id", "reason", "confirm"],
		},
		output: {
			type: "object",
			properties: {
				deleted: { type: "boolean" },
				auditRecord: { type: "string" },
			},
			required: ["deleted", "auditRecord"],
		},
	},

	// -------------------------------------------------------------------------
	// Fleet tools (M-03a through M-03c)
	// -------------------------------------------------------------------------
	fleet_status: {
		input: {
			type: "object",
			properties: {
				filter: {
					type: "object",
					properties: {
						role: { type: "string" },
						health: { type: "string" },
						taskState: { type: "string" },
					},
				},
			},
		},
		output: {
			type: "object",
			properties: {
				agents: { type: "array", items: { type: "object" } },
				summary: {
					type: "object",
					properties: {
						total: { type: "number" },
						active: { type: "number" },
						idle: { type: "number" },
						error: { type: "number" },
					},
					required: ["total", "active", "idle", "error"],
				},
			},
			required: ["agents", "summary"],
		},
	},

	agent_registry: {
		input: {
			type: "object",
			properties: {
				capabilities: { type: "array", items: { type: "string" } },
				role: { type: "string" },
				modelTier: { type: "string" },
			},
		},
		output: {
			type: "object",
			properties: {
				agents: { type: "array", items: { type: "object" } },
				total: { type: "number" },
			},
			required: ["agents", "total"],
		},
	},

	task_route: {
		input: {
			type: "object",
			properties: {
				taskType: { type: "string" },
				filePaths: { type: "array", items: { type: "string" } },
				requiredCapabilities: { type: "array", items: { type: "string" } },
			},
		},
		output: {
			type: "object",
			properties: {
				recommendation: {
					type: "object",
					properties: {
						agent: { type: "string" },
						strategy: { type: "string" },
						confidence: { type: "number" },
						fallback: { type: ["string", "null"] },
						reasoning: { type: "string" },
					},
					required: [
						"agent",
						"strategy",
						"confidence",
						"fallback",
						"reasoning",
					],
				},
			},
			required: ["recommendation"],
		},
	},

	// -------------------------------------------------------------------------
	// Governance tools (M-04a through M-04c)
	// -------------------------------------------------------------------------
	standing_order_status: {
		input: {
			type: "object",
			properties: {},
		},
		output: {
			type: "object",
			properties: {
				orders: { type: "array", items: { type: "object" } },
			},
			required: ["orders"],
		},
	},

	compliance_check: {
		input: {
			type: "object",
			properties: {
				action: { type: "string" },
				agent: { type: "string" },
				category: { type: "string" },
			},
			required: ["action", "agent"],
		},
		output: {
			type: "object",
			properties: {
				compliant: { type: "boolean" },
				violations: {
					type: "array",
					items: {
						type: "object",
						properties: {
							order: { type: "string" },
							reason: { type: "string" },
						},
						required: ["order", "reason"],
					},
				},
			},
			required: ["compliant", "violations"],
		},
	},

	escalation_file: {
		input: {
			type: "object",
			properties: {
				severity: {
					type: "string",
					enum: ["critical", "high", "medium", "low"],
				},
				subject: { type: "string" },
				description: { type: "string" },
				agent: { type: "string" },
			},
			required: ["severity", "subject", "description", "agent"],
		},
		output: {
			type: "object",
			properties: {
				id: { type: "string" },
				filed: { type: "boolean" },
				routedTo: { type: "string" },
			},
			required: ["id", "filed", "routedTo"],
		},
	},
};
