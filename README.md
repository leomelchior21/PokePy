# Pyxies · A Python Adventure in the Castanho Valley

An open-world creature-training RPG for the makers of Escola Lourenço Castanho. Pyxies are creatures
made of Python code. Students explore the Castanho Valley, catch and train pyxies, and battle with
coding challenges, then face six Lab Masters whose pyxies only fall to real Python code.

## What students do

- **Explore** 15 outdoor areas and 30+ interiors, from Vila Maker to the Lourenço Castanho Academy.
- **Battle**: every move is a mini-game built from the concepts they know: predict the output, trace a
  variable, build a line from pieces, true or false, find and fix the bug, order the lines, pick the
  if/else path, fill the gap. Every answer is computed by a Python tracer, never typed by hand.
- **Dodge** enemy attacks with quick True/False questions. Three right answers in a row land a combo.
- **Catch** wild pyxies: weaken them, then "compile" a Bytecube with one quick question.
- **Code duels**: Lab Masters, Dr. Segfault and the champion Leo Maker fight with the Final Bosses
  mechanic. Students write real Python in an editor, and every hidden test that passes breaks a shield.
- **Progress**: Trainer XP opens each Lab, badges open the Grand Hackathon, pyxies level up and evolve.

23 original pyxies across six concepts (PRINT, TEXT, VAR, MATH, LOGIC, BRANCH) on a type ring,
a rival (Brian), a villain (Dr. Segfault and the Bug Brigade), side quests, and Makerspace easter eggs.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # challenge generators, maps, a full robot playthrough, screens
npm run build
```

## Login and saves

Students log in with the PixPy roster (first name + last name, through `pixpy_login`). The save always
lives on the device, and syncs to Supabase at most every 30 seconds once the migration is applied:

```
supabase/migrations/202610300100_pyxies_saves.sql
```

It adds a separate `pyxies_save` column next to each PixPy student (PixPy progress is never touched)
and the `pyxies_load`, `pyxies_save` and `pyxies_hall_of_fame` functions. Until it is applied, the game
runs normally with device-only saves.

## Tuning

- Lab XP gates: `src/data/progression.ts` (the robot playthrough in `src/game/progression.test.ts`
  reports the estimated play time).
- Code duels: `src/data/duels.ts`. Maps, trainers and dialog: `src/world/maps.ts`. Story: `src/game/scripts.ts`.
