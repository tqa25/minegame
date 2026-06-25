# Minegame

An isometric voxel sandbox built with Three.js. The player moves a block-style character through a procedurally generated terrain, placing and removing blocks with touch or keyboard controls.

## Language

**Block**:
A single voxel with a type (grass, dirt, stone, wood, water) and a position (x, y, z).
_Avoid_: Cube, tile, cell

**World**:
The collection of all Blocks, plus terrain generation logic (procedural height, island shaping) and operations to add, remove, or query Blocks.
_Avoid_: Map, level, scene

**Player**:
The block-style character the user controls. Owns physics state (gravity, jumping, grounding), animation (limb swing, bob), and an overlay state machine with base states (idle, walking, running, jumping, falling) and overlay states (attacking, hit, dead).
_Avoid_: Character, avatar, hero

**Camera**:
The orthographic isometric viewport. Manages zoom, follows the Player, and handles resize.
_Avoid_: View, perspective

**Input**:
Aggregation of all user input sources — joystick (touch), keyboard (WASD, arrows), pointer (tap, click). Produces a unified movement vector and action triggers consumed each frame.
_Avoid_: Controls, events, handler

**Game Loop**:
The per-frame orchestration. Reads Input, updates Player physics and animation, updates Camera, renders through Renderer, and checks Block selection.
_Avoid_: Main loop, tick, update cycle

**Renderer**:
The Three.js rendering infrastructure — scene, WebGLRenderer, lights (hemisphere, directional sun), fog, shadow map. Draws the World and Player each frame.
_Avoid_: Engine, graphics, viewport

## Example dialogue

**Dev**: The Player is walking toward a cliff. When the Player walks off the edge, the Input still says "move forward" but the World has no Block beneath. What happens?

**Domain expert**: The Player's state machine transitions from walking to falling. The Player falls until the World reports a Block at the Player's new (x, z) with a matching height. Then the Player transitions back to idle (or walking, if Input still says move).

**Dev**: And if the Player presses jump while falling?

**Domain expert**: Nothing. Jump is only valid during idle or walking — the Player must be grounded. The state machine enforces that.
