// Tool registry - the primary way to access tools and their descriptions
export { getToolRegistry, getTools, buildCompactToolDescriptions } from '@/plugins/tools/registry.js';
export type { RegisteredTool } from '@/plugins/tools/registry.js';

// Individual tool exports (for backward compatibility and direct access)
export { createGetFinancials } from '@/plugins/tools/finance/index.js';
export { tavilySearch } from '@/plugins/tools/search/index.js';

// Tool descriptions
export {
  GET_FINANCIALS_DESCRIPTION,
} from '@/plugins/tools/finance/get-financials.js';
export {
  WEB_SEARCH_DESCRIPTION,
} from '@/plugins/tools/search/index.js';
