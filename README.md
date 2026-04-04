# Sentinel AI

**Autonomous financial intelligence platform for deep market research.**

Sentinel AI is a CLI-based agent that conducts real-time financial research using live market data, SEC filings, web intelligence, and multi-provider LLM reasoning. Ask a question, and Sentinel autonomously gathers data, analyzes fundamentals, and delivers concise, data-backed answers.

## Features

- **Multi-Provider LLM Support** — OpenAI, Anthropic, Google Gemini, xAI (Grok), OpenRouter, Ollama (local), Moonshot, DeepSeek
- **Financial Data Engine** — Real-time prices, historical data, financial metrics, SEC filings (10-K, 10-Q, 8-K), insider trades, institutional holdings
- **Intelligent Web Research** — Exa, Perplexity, and Tavily search integration with full-page reading via Playwright
- **Persistent Memory** — Semantic search over past conversations; remembers your preferences and research context
- **Extensible Skills** — SKILL.md-based workflows for complex analyses (e.g., DCF valuation models)
- **WhatsApp Gateway** — Connect Sentinel to WhatsApp for mobile financial research
- **Scheduled Monitoring** — Heartbeat system for periodic market checks and alerts
- **Rich Terminal UI** — Interactive CLI with formatted tables, syntax highlighting, and real-time streaming

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- At least one LLM API key (OpenAI recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/sentinel-ai.git
cd sentinel-ai

# Install dependencies
bun install

# Configure environment
cp env.example .env
# Edit .env with your API keys

# Launch Sentinel
bun run start
```

### Usage

```bash
# Start interactive session
bun run start

# Development mode (auto-reload)
bun run dev

# WhatsApp gateway
bun run gateway
```

## Commands

| Command | Description |
|---------|-------------|
| `/model` | Switch LLM provider and model |
| `/rules` | View your custom research rules |
| `/memory` | Show what Sentinel remembers |
| `/history` | View recent conversation summaries |
| `/heartbeat` | Configure market monitoring |
| `/clear` | Clear the conversation |
| `/help` | Show keyboard shortcuts |

## Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

- **LLM Keys**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, etc.
- **Financial Data**: `FINANCIAL_DATASETS_API_KEY`
- **Web Search**: `EXASEARCH_API_KEY`, `PERPLEXITY_API_KEY`, or `TAVILY_API_KEY`
- **Tracing**: `LANGSMITH_API_KEY` for LangSmith observability

### Settings

Persistent settings are stored in `.sentinel/settings.json` (auto-created). Use `/model` to switch providers interactively.

## Architecture

```
src/
├── agent/          # Core reasoning loop, system prompts, context management
├── tools/          # Financial search, web research, browser, filesystem
├── components/     # Terminal UI widgets (Ink/pi-tui)
├── commands/       # Slash command definitions
├── memory/         # Persistent semantic memory system
├── skills/         # Extensible SKILL.md workflows
├── gateway/        # WhatsApp messaging integration
├── cron/           # Scheduled job execution
├── model/          # Multi-provider LLM abstraction
└── utils/          # Configuration, caching, token management
```

## Development

```bash
# Type-check
bun run typecheck

# Run tests
bun test

# Watch mode
bun run dev
```

## License

MIT — Copyright (c) 2026 Rajkaran Yadav
