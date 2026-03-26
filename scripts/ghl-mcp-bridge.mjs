import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const PIT_TOKEN = process.env.GHL_PIT_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!PIT_TOKEN || !LOCATION_ID) {
  console.error("Missing GHL_PIT_TOKEN or GHL_LOCATION_ID environment variables.");
  process.exit(1);
}

const GHL_MCP_URL = "https://services.leadconnectorhq.com/mcp/";

// Static tool definitions based on GHL MCP documentation
const GHL_TOOLS = [
  {
    name: "calendars_get-calendar-events",
    description: "Get calendar events using userId, groupId, or calendarId.",
  },
  {
    name: "calendars_get-appointment-notes",
    description: "Retrieve notes for a specific appointment.",
  },
  { name: "contacts_get-all-tasks", description: "Retrieve all tasks for a contact." },
  { name: "contacts_add-tags", description: "Add tags to a contact." },
  { name: "contacts_remove-tags", description: "Remove tags from a contact." },
  { name: "contacts_get-contact", description: "Fetch contact details." },
  { name: "contacts_update-contact", description: "Update a contact." },
  { name: "contacts_upsert-contact", description: "Update or create a contact." },
  { name: "contacts_create-contact", description: "Create a new contact." },
  { name: "contacts_get-contacts", description: "Fetch all contacts." },
  { name: "conversations_search-conversation", description: "Search/filter/sort conversations." },
  { name: "conversations_get-messages", description: "Retrieve messages by conversation ID." },
  {
    name: "conversations_send-a-new-message",
    description: "Send a message to a conversation thread.",
  },
  { name: "locations_get-location", description: "Get location details by ID." },
  {
    name: "locations_get-custom-fields",
    description: "Retrieve custom field definitions for a location.",
  },
  {
    name: "opportunities_search-opportunity",
    description: "Search for opportunities by criteria.",
  },
  { name: "opportunities_get-pipelines", description: "Fetch all opportunity pipelines." },
  { name: "opportunities_get-opportunity", description: "Fetch opportunity details by ID." },
  { name: "opportunities_update-opportunity", description: "Update opportunity details." },
  { name: "payments_get-order-by-id", description: "Retrieve payment order details." },
  { name: "payments_list-transactions", description: "Fetch paginated list of transactions." },
  {
    name: "blogs_check-url-slug-exists",
    description: "Check the blog slug which is needed before publishing any blog post.",
  },
  { name: "blogs_update-blog-post", description: "Update blog post for any given blog site" },
  { name: "blogs_create-blog-post", description: "create blog post for any given blog site" },
  {
    name: "blogs_get-all-blog-authors-by-location",
    description: "get blog authors for a given location ID",
  },
  {
    name: "blogs_get-all-categories-by-location",
    description: "get blog categories for a given location ID",
  },
  {
    name: "blogs_get-blog-post",
    description: "get blog posts for any given blog site using blog ID",
  },
  { name: "blogs_get-blogs", description: "get blogs using Location ID" },
  { name: "emails_create-template", description: "Create a new template" },
  { name: "emails_fetch-template", description: "Fetch email templates by location id" },
  { name: "socialmediaposting_get-account", description: "Get list of accounts and groups" },
  {
    name: "socialmediaposting_get-social-media-statistics",
    description: "Retrieve analytics data for multiple social media accounts",
  },
  {
    name: "socialmediaposting_create-post",
    description: "Create posts for all supported platforms",
  },
  { name: "socialmediaposting_get-post", description: "Get social media post" },
  { name: "socialmediaposting_get-posts", description: "Get social media posts" },
  { name: "socialmediaposting_edit-post", description: "Edit social media post" },
].map((tool) => ({
  ...tool,
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: true,
  },
}));

const server = new Server(
  {
    name: "gohighlevel-mcp-bridge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: GHL_TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const response = await fetch(GHL_MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PIT_TOKEN}`,
        locationId: LOCATION_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: name,
        input: args || {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `GHL API Error: ${response.status} ${response.statusText}\n${errorText}`,
          },
        ],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Bridge Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GHL MCP Bridge started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
