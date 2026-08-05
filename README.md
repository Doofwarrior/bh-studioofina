# BH Studio v1.0

AI-assisted creative workspace. Projects are the center. Software manages organization. LLMs provide intelligence.

## Philosophy

- AI-assisted, not AI-autonomous
- Projects are the center
- Software manages organization
- LLMs provide intelligence
- No autonomous agents
- Simple, modular, easy to maintain
- Workspace is user data
- Skills are packages, not frameworks
- Don't build for future possibilities

## Architecture

Three layers:
1. **Application** — UI, Project Manager, AI Bridge, Prompt Library, Export System
2. **AI Skills** — Core Skills + Islamic Skills (extensible)
3. **Workspace** — User projects outside the Git repository

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm
- [Ollama](https://ollama.com/) running locally
- A downloaded Ollama model (e.g., `llama3.1`, `mistral`, `qwen2.5`)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Make sure Ollama is running
ollama serve

# 3. Pull a model (if you haven't already)
ollama pull llama3.1

# 4. Run the app
npm run dev

# 5. Open http://localhost:5173 in your browser
```

## First-Time Setup

1. **Select Workspace Folder** — On first launch, BH Studio will ask you to pick a folder on your computer. This is where all your projects live.
2. **Configure Ollama** — Go to Settings and verify the Ollama base URL (default: `http://localhost:11434`) and select your model.
3. **Create a Project** — Click "New Project" on the Dashboard.

## Workspace

The workspace lives outside this repository. Default: `~/BH-Studio-Workspace/` (or whatever folder you select).
Configure the path in Settings on first launch.

## AI Provider

BH Studio uses **Ollama** for 100% local, free AI inference. No API keys. No cloud costs. No data leaves your machine.

Supported models:
- `llama3.1` (recommended, good at JSON)
- `mistral`
- `qwen2.5`
- Any Ollama model that supports JSON output

## Documentation

See `docs/` for full architecture, manifesto, and coding guidelines.

## License

MIT
