import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fillPrompt,
  getPrompt,
  promptUrl,
  publicBaseUrl,
  searchPrompts,
} from "@/lib/mcp/catalog";

export const CUEBOX_WIDGET_URI = "ui://cuebox/prompt-card-v1.html";

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

function widgetHtml() {
  const scriptUrl = `${publicBaseUrl()}/cuebox-prompt-card-v1.js`;
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark"></head>',
    '<body><div id="root"></div>',
    `<script src="${scriptUrl}"></script>`,
    "</body></html>",
  ].join("");
}

function errorResult(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function createCueboxMcpServer() {
  const server = new McpServer(
    { name: "cuebox", version: "0.1.0" },
    {
      instructions:
        "Cuebox provides a public prompt catalog. Use search to discover templates, fetch to inspect one template, and render_prompt only after choosing a prompt and collecting useful variable values. The private user library is not exposed.",
    },
  );

  server.registerResource(
    "cuebox-prompt-card",
    CUEBOX_WIDGET_URI,
    {},
    async () => ({
      contents: [
        {
          uri: CUEBOX_WIDGET_URI,
          mimeType: "text/html;profile=mcp-app",
          text: widgetHtml(),
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [publicBaseUrl()],
              },
            },
            "openai/widgetDescription":
              "Interactive Cuebox card showing a selected prompt, its variables, and the filled prompt text.",
          },
        },
      ],
    }),
  );

  server.registerTool(
    "search",
    {
      title: "Search Cuebox prompts",
      description:
        "Use this when the user wants to discover public Cuebox prompt templates by topic, task, category, or tag.",
      inputSchema: {
        query: z.string().min(1).max(300),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ query }) => {
      const results = searchPrompts(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a Cuebox prompt",
      description:
        "Use this when the user or a previous search result identifies one Cuebox prompt and its complete template is needed.",
      inputSchema: {
        id: z.string().min(1).max(200),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ id }) => {
      const prompt = getPrompt(id);
      if (!prompt) return errorResult(`Cuebox prompt not found: ${id}`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: prompt.id,
              title: prompt.title,
              text: prompt.body,
              url: promptUrl(prompt.id),
              metadata: {
                description: prompt.description,
                category: prompt.category,
                tags: prompt.tags,
                models: prompt.models,
                variables: prompt.variableDefs ?? [],
              },
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "render_prompt",
    {
      title: "Render a Cuebox prompt",
      description:
        "Use this after fetch when the user has selected a Cuebox prompt. Pass known variable values to show one final interactive prompt card.",
      inputSchema: {
        id: z.string().min(1).max(200),
        values: z
          .record(z.string().min(1).max(64), z.string().max(8000))
          .optional(),
      },
      outputSchema: {
        id: z.string(),
        title: z.string(),
        category: z.string(),
        tags: z.array(z.string()),
        models: z.array(z.string()),
        variables: z.array(
          z.object({
            key: z.string(),
            label: z.string().optional(),
            type: z.enum(["text", "dropdown", "toggle", "date"]),
            options: z.array(z.string()).optional(),
            defaultValue: z.string().optional(),
          }),
        ),
        values: z.record(z.string(), z.string()),
        filledPrompt: z.string(),
        unresolved: z.array(z.string()),
        url: z.string(),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: CUEBOX_WIDGET_URI },
        "openai/outputTemplate": CUEBOX_WIDGET_URI,
        "openai/toolInvocation/invoking": "Preparing prompt…",
        "openai/toolInvocation/invoked": "Prompt ready",
      },
    },
    async ({ id, values = {} }) => {
      if (Object.keys(values).length > 50) {
        return errorResult("Cuebox accepts at most 50 prompt variables.");
      }

      const result = fillPrompt(id, values);
      if (!result) return errorResult(`Cuebox prompt not found: ${id}`);

      return {
        structuredContent: result,
        content: [
          {
            type: "text",
            text: result.unresolved.length
              ? `Prepared “${result.title}”. Missing values: ${result.unresolved.join(", ")}.`
              : `Prepared “${result.title}” and filled all prompt variables.`,
          },
        ],
      };
    },
  );

  return server;
}
