# OpenManus Installation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Install OpenManus (FoundationAgents/OpenManus) into the current project root `~/workspaces2/projects/minegame/` with uv (recommended) and configure for OpenRouter/free models.

**Architecture:** Python 3.12 async agent framework (MetaGPT-based). Multi-agent: Manus (general), DataAnalysis (data viz), MCPAgent (MCP tools), Flow/Planning orchestration. Supports OpenAI, Anthropic, Azure, Ollama, Bedrock, OpenRouter via config.toml.

**Tech Stack:** Python 3.12, uv, pydantic, openai, tenacity, loguru, fastapi, browser-use, playwright, mcp, crawl4ai, docker, pytest.

---

## Project Structure (Target)

```
minegame/
├── .venv/                    # uv virtual env (created)
├── config/
│   ├── config.example.toml   # (copied from repo)
│   └── config.toml           # (user config - API keys)
├── app/                      # OpenManus source (cloned)
├── logs/                     # runtime logs
├── workspace/                # agent workspace
├── data/                     # agent data
├── main.py                   # entry: python main.py
├── run_flow.py               # multi-agent flow entry
├── run_mcp.py                # MCP agent entry
├── requirements.txt          # dependencies
├── Dockerfile                # Docker support
├── .gitignore
├── README.md
└── start-openmanus.sh        # convenience launch script
```
