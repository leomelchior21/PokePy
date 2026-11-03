# Pyxies · A Python Adventure in the Castanho Valley

An open-world creature-training RPG for the makers of Escola Lourenço Castanho. Pyxies are creatures
made of Python code. Students explore the Castanho Valley, catch and train pyxies, and battle with
coding challenges, then face six Arena Masters whose pyxies only fall to real Python code.

## What students do

- **Explore** 15 outdoor areas and 30+ interiors, from Vila Maker to the Lourenço Castanho Academy. They
  move freely in any direction with the keyboard (arrows or WASD, diagonals included) or a floating
  analog joystick on touch screens. The valley is alive: trees sway, birds peck and scatter when you get
  close, flocks cross the sky, butterflies, fireflies, falling leaves, chimney smoke, fish ripples, cloud
  shadows and sun rays. The ground answers every step: tall grass parts and shakes, dust and sand kick
  up, footprints fade behind you, and each surface has its own footstep sound.
- **Battle**: every move is a challenge built from the concepts they know. Quizzes (predict the output,
  trace a variable, build a line, true or false, find and fix, order the lines, pick the path, fill the
  gap) and six arcade mini-games, all about Python:
  - **Output Catcher**: values rain down; catch the one the code prints.
  - **Print Slingshot**: launch your pyxie at the tower that shows the real output.
  - **Trace Flight**: each gate is one line of code; fly through the variable's new value. The code
    panel fills in like a trace table.
  - **True Jump**: bounce up on the conditions that are True; False ones crumble.
  - **Value Crush**: match-3 where tiles are expressions and matches are equal values.
  - **Code Builder**: snap blocks into slots (indentation included) and pass every test, with a
    line-by-line run.
  Every answer is computed by a Python tracer, never typed by hand. A mini-game played well adds up to
  30% damage.
- **Look closer**: the Pyxie Inspector shows any pyxie big on a spotlit stage, breathing and blinking,
  with a pixel grid, zoom, stats, its evolution line, its moves and the pyxie written as Python
  variables. It opens when choosing a starter, from the team and the Codex, when switching in battle and
  after every catch.
- **Dodge** enemy attacks with quick True/False questions. Three right answers in a row land a combo.
- **Catch** wild pyxies: weaken them, then "compile" a Bytecube with one quick question.
- **Code duels**: Arena Masters, Dr. Segfault and the champion Leo Maker fight with the Final Bosses
  mechanic. Students write real Python in an editor, and every hidden test that passes breaks a shield.
- **Progress**: Trainer XP opens each Arena, badges open the Grand Hackathon, pyxies level up and evolve.

- **Build**: three paths need building, and each build is checked and paid for in Python at the Maker
  Bench, where the bag becomes variables (`print(wood >= 6)`, `wood = wood - 6`):
  - **Route 1 bridge** (3 wood + 2 fiber): the storm broke the way to Echo Harbor.
  - **Route 2 climbing tower** (6 wood + 3 fiber): a rock wall splits the route and a rockslide took the
    stairs to Boxford. Bench finale: `levels = wood / 2` prints `3.0`.
  - **Hackathon Road catapult** (4 wood + 4 stone): the Bug Brigade locked the Academy gate. The catapult
    throws stones into the gate's counterweight basket. Bench finale: `print(stones * 5 >= 20)`.
  Every build plays an animation: planks drop in one by one, the tower rises level by level, the catapult
  assembles, throws four stones and the gate goes up. Logs, reeds and rock piles grow back.

Visual aid comes first: whenever the story gives something new (the Codex, Bytecubes, Patches) or
names a new place, it is shown big on screen. Items get a spotlit card; places get an aerial view of the
whole map plus the illustrated valley map with an arrow on it. Arrows also mark every path out of a map.
Math stays inside + - * / and the comparisons == != > >= < <= (no // or %).

It is built for school iPads: no text under 12 px, labels that never wrap mid-phrase, mini-games that
zoom in on big screens, and battle scenes that give the mini-game the whole screen when held upright.

23 original pyxies across six concepts (PRINT, TEXT, VAR, MATH, LOGIC, BRANCH) on a type ring,
a rival (Brian), a villain (Dr. Segfault and the Bug Brigade), side quests, and Makerspace easter eggs.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # challenge generators, maps, a full robot playthrough, screens
npm run build
```

## Art

Everything is drawn in code, so the game ships with no image files:

- Pyxies, trees, bushes and rocks are vector designs (`src/engine/creatures.ts`, `src/engine/props.ts`)
  that `src/engine/raster.ts` turns into pixel art at any size, with cel shading, dithering and
  selective outlines.
- The outdoor ground (`src/engine/terrain.ts`) samples smooth fields per pixel, so paths, sand and
  shores are round and organic; cliffs, ledges and piers are autotiled on top. Tall rock walls (`M`) are
  painted per pixel too: fractured slabs lit from above, strata, moss, hanging vines and a grassy lip.
- Ambient life lives in `src/engine/ambient.ts`; people are 16×24 chibi sprites in `src/engine/art.ts`.
- Rooms (`src/engine/interior.ts`) get wallpaper and wainscoting, curtained windows with sunbeams, plank
  and tile floors, rugs, a doorway full of daylight, and furniture per room type (home, charging
  station, mart, arena, hackathon hall).
- Battle scenes (`src/battle/BattleBackdrop.tsx`) are layered and animated for every area: meadows,
  forest god rays, the sea, a crystal cave, a lab, mountains and the hackathon stage.
- The title screen (`src/ui/TitleScene.tsx`) is the valley at golden hour with parallax layers and
  wandering pyxies; the logo is pixel art drawn in `src/engine/logo.ts`.

## Music

`src/engine/audio.ts` is a small chip synth: a pulse-wave lead with vibrato and echo, an arpeggio that
spells each chord, a triangle bass and a noise drum kit. Songs are note names, one bar per 8 steps. The
theme opens with a rising G C E G "hello" that returns in Vila Maker and in the victory
jingle.

In development, `?gallery` shows every pyxie and person, `?mini=flappy&concept=var&tier=2` opens one
mini-game, and `?chapter=route1` (any chapter id from `src/game/chapters.ts`) skips the login.

## Login and saves

Students log in with the PixPy roster (first name + last name, through `pixpy_login`). The save always
lives on the device, and syncs to Supabase at most every 30 seconds once the migration is applied:

```
supabase/migrations/202610300100_pyxies_saves.sql
```

It adds a separate `pyxies_save` column next to each PixPy student (PixPy progress is never touched)
and the `pyxies_load`, `pyxies_save` and `pyxies_hall_of_fame` functions. Until it is applied, the game
runs normally with device-only saves.

## Extending the game

Notes for the next round of changes, so nobody has to rediscover them.

**Names.** Players see "Arena" for the six badge gyms (Arena Master, Arena Coder). In code they are
still `lab`: map ids like `harbor-lab`, `area: 'lab'`, the `lab()` helper in `src/world/interiors.ts`.
Keep the ids, because saves store map ids.

**Teaching rules.** Any Python shown to students uses only `+ - * /` and `== != > >= < <=` (no `//`,
no `%`), and `/` always prints a decimal (`6 / 2` is `3.0`). New items and places are shown big with
`ctx.ui.show(...)` the first time they appear. Check new UI at 1180×820 and 820×1180 (iPad).

**Adding a build site** (the pattern used by the bridge, tower and catapult):
1. Tiles: `b` bridge, `h` tower (cut into an `M` rock wall), `g` gate plus `Q` catapult spot. Their walk
   rules are in `walkable()` in `src/world/world.ts`; everything is gated by `builtFlag(mapId)`, so a
   map has at most one build site.
2. Recipe in `src/data/recipes.ts` (two materials, optional `finale` question) and the map's entry in
   `siteRecipe`.
3. Lines in `buildLines` and a builder NPC script in `src/game/scripts.ts`. The `build-site` script
   runs the bench, takes the materials, calls `ui.build()` (the animation), then sets the flag.
4. Art in `src/engine/builds.ts`, drawn with a `progress` from 0 to 1. Ground-level builds (bridge,
   tower) go into the cached ground in `src/engine/terrain.ts` once built and are animated in
   `drawBuildGround`. Standing builds (gate, catapult) are y-sorted drawables (`catapultDrawables` in
   `src/game/runtime.ts`). Timings live in `BUILD_MS`.
5. Gathering spots: `gatherSpot(map, id, 'log' | 'reeds' | 'rocks', x, y)` in `src/world/maps.ts`. The
   id prefix picks the item (`reed` = fiber, `rock` = stone, anything else = wood). Put enough on
   both sides of the site so nobody gets stuck.
6. Old saves: add the map to the migration in `GameScreen.tsx` ("Saves from before the builds") and to
   `builtFor()` in `src/game/chapters.ts`, so later chapters start with it built.

**Redrawing a map.** Big outdoor maps are generated by small scripts in `tools/maps/`
(`python tools/maps/route2.py --show` prints the grid with coordinates); paste the output into the
map's `rows`. When a map changes size, fix the `offset` of the edges on both sides (leaving at row `y`
lands on row `y + offset`). The maps test checks that every edge lands on open ground and that every map
can be reached on foot. Players saved inside a wall are moved to the nearest open tile (`unstick()`).

**Seeing it.** `npm run dev`, then `?chapter=<id>`. In development `window.__pyxies` has `place(map,
x, y)`, `script(id)`, `wild(species, level)` and `trainer(npcId)` for automated screenshots; the
teacher tools (DEV button) can fill the bag.

**Touch movement.** The joystick walks at most `STICK_WALK` px/s and eases in (`STICK_ACCEL`); the B
button runs at `STICK_RUN`. The keyboard uses `WALK` and `RUN` (`src/game/runtime.ts`).

## Tuning

- Arena XP gates: `src/data/progression.ts` (the robot playthrough in `src/game/progression.test.ts`
  reports the estimated play time).
- Code duels: `src/data/duels.ts`. Maps, trainers and dialog: `src/world/maps.ts`. Story: `src/game/scripts.ts`.
