import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.CUEBOX_MCP_TEST_URL ?? "http://127.0.0.1:3000/mcp";
const client = new Client({ name: "cuebox-smoke", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  for (const expected of ["search", "fetch", "render_prompt"]) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Missing MCP tool: ${expected}`);
    }
  }

  const search = await client.callTool({
    name: "search",
    arguments: { query: "code review" },
  });
  const searchPayload = JSON.parse(search.content[0].text);
  const first = searchPayload.results?.[0];
  if (!first) throw new Error("Cuebox search returned no results");

  const fetched = await client.callTool({
    name: "fetch",
    arguments: { id: first.id },
  });
  const prompt = JSON.parse(fetched.content[0].text);
  if (prompt.id !== first.id || !prompt.text) {
    throw new Error("Cuebox fetch returned an invalid prompt");
  }

  const rendered = await client.callTool({
    name: "render_prompt",
    arguments: {
      id: first.id,
      values: {
        stack: "TypeScript",
        focus: "security",
        code: "const ok = true;",
      },
    },
  });
  if (rendered.isError || !rendered.structuredContent?.filledPrompt) {
    throw new Error("Cuebox render_prompt did not return structured content");
  }

  console.log(
    JSON.stringify(
      {
        endpoint,
        tools: toolNames,
        searchResult: first.title,
        fetchedId: prompt.id,
        renderedTitle: rendered.structuredContent.title,
        unresolved: rendered.structuredContent.unresolved,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
