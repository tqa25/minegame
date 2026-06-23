# Minegame Iso

Mobile-first isometric voxel sandbox built with Three.js.

## Controls

- Drag the left joystick to move; pull it far from center to run.
- Tap the world to select a block.
- Use `Build`, `Dig`, and block buttons to edit the terrain.
- Use `-` and `+` to zoom the isometric camera out or in.
- Desktop fallback: `WASD`, hold `Shift` to run, `Q` to dig, `E` to build, `Space` to hop.

## Run locally

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

The player is built from separate block parts for head, torso, arms, and legs. Movement drives walk/run animation, while dig/build triggers an attack swing. Water cannot be dug in this version.
