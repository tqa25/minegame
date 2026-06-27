# Minegame Iso

Mobile-first isometric voxel sandbox built with Three.js.

## Controls

- Drag the left joystick to move; pull it far from center to run.
- Tap `Attack` for a basic sword strike.
- Tap `Dash Slash` for the Warrior skill dash attack.
- Tap the world to select a block.
- Use `Build`, `Dig`, and block buttons to edit the terrain.
- Use `-` and `+` to zoom the isometric camera out or in.
- Desktop fallback: `WASD`, hold `Shift` to run, `F` to attack, `R` to use `Dash Slash`, `Q` to dig, `E` to build, `Space` to hop.

## Run locally

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

The Player is a `Warrior` with an `Iron Sword`. The current offline slice supports Enemy spawn, melee combat, basic progression (`Experience`, `Level`), and a starter Skill with animation. Terrain editing still works, and water cannot be dug in this version.

## Graphify

Graphify has been installed for this repo in project scope, so Codex can use it from [AGENTS.md](/home/ubuntu/workspaces2/projects/minegame/AGENTS.md) and [.codex/skills/graphify/SKILL.md](/home/ubuntu/workspaces2/projects/minegame/.codex/skills/graphify/SKILL.md).

Quick start for this game repo:

```bash
npm run graphify
```

That builds a code-only knowledge graph for `src/` and writes outputs to `src/graphify-out/`:

- `graph.json`: queryable graph data
- `graph.html`: interactive graph view
- `GRAPH_REPORT.md`: plain-language architecture summary

Useful commands:

```bash
npm run graphify:update
npm run graphify:watch
graphify query "How does player movement flow from input to renderer?" --graph src/graphify-out/graph.json
graphify query "Which files are involved in block selection and digging?" --graph src/graphify-out/graph.json
graphify explain "Player" --graph src/graphify-out/graph.json
```

Full-repo graph:

```bash
npm run graphify:full
```

The full repo includes Markdown docs, so Graphify will require an LLM API key for semantic extraction. Example:

```bash
export OPENAI_API_KEY=your_key_here
graphify . --backend openai
```

For this repo, the practical default is:

- use `npm run graphify` for code architecture inside `src/`
- use `npm run graphify:full` only when you want code + docs relationships
