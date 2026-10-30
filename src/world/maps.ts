// The Castanho Valley: from Vila Maker to the Lourenço Castanho Grand Hackathon.
import { labGates } from '../data/progression'
import { house, lab, labGate, mart, station } from './interiors'
import { kid, looks } from './looks'
import type { GameMap, NpcDef, TrainerDef } from './types'

const tr = (id: string, title: string, team: TrainerDef['team'], bits: number, intro: string, lose: string, after: string, extra: Partial<TrainerDef> = {}): TrainerDef => ({
  id, title, kind: 'trainer', team, bits, sight: 4, intro, lose, after, ...extra,
})

const person = (id: string, name: string, n: number, x: number, y: number, facing: NpcDef['facing'], talk: string[], move: NpcDef['move'] = 'still'): NpcDef => ({ id, name, look: kid(n), x, y, facing, talk, move })

const trainer = (id: string, name: string, n: number, x: number, y: number, facing: NpcDef['facing'], t: TrainerDef): NpcDef => ({ id, name, look: kid(n), x, y, facing, trainer: t })

// ---------------------------------------------------------------- VILA MAKER

const vila: GameMap = {
  id: 'vila', name: 'Vila Maker', area: 'town', music: 'vila', outside: 'tree',
  rows: [
    'TTTTTTTTTTT::TTTTTTTTTTT',
    'Tf.........::.........fT',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T....:::::::::::::.....T',
    'T....:.....::....:.....T',
    'Tf...:.....::....:....fT',
    'T....:.....::....:.....T',
    'T....:...........:.....T',
    'T....:...........:.....T',
    'T....:...........:.....T',
    'T....:...........:.....T',
    'T....:...........:.....T',
    'T....:::::::::::::.....T',
    'T~~~~...f...........f..T',
    'T~~~~~.......FFFFF.....T',
    'T~~~~....f.......f.....T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 3, y: 2, w: 5, h: 4, kind: 'house', roof: '#d9473f', to: 'home', tx: 5, ty: 6 },
    { x: 15, y: 2, w: 5, h: 4, kind: 'house', roof: '#3d6fd0', to: 'brian-house', tx: 5, ty: 6 },
    { x: 8, y: 10, w: 8, h: 5, kind: 'makerspace', roof: '#f28c28', label: 'MAKERSPACE', to: 'makerspace', tx: 7, ty: 9 },
  ],
  edges: [{ side: 'up', to: 'route1', offset: -2 }],
  npcs: [
    person('vila-kid', 'Kid', 4, 6, 17, 'left', ['The fish in this pond are just reflections of clouds.', 'I checked with a print().']),
    person('vila-gardener', 'Gardener', 9, 20, 12, 'down', ['Leo Maker says every great project starts as cardboard.', 'Then it becomes MORE cardboard. Then a robot.'], 'wander'),
  ],
  signs: [
    { x: 10, y: 8, text: ['VILA MAKER', 'Where ideas get built.'] },
    { x: 19, y: 7, text: ['MAKERSPACE ▼', 'Leo Maker\'s lab. Safety goggles required!'] },
  ],
  items: [{ id: 'vila-patch', x: 22, y: 18, item: 'patch', count: 1, hidden: true }],
  triggers: [{ x: 11, y: 1, w: 2, script: 'leo-stop', unlessFlag: 'got_starter' }],
}

const home = house('home', 'Your House', { map: 'vila', x: 5, y: 6 }, [
  { id: 'mom', name: 'Mom', look: looks.mom, x: 3, y: 5, facing: 'right', script: 'mom' },
], [{ x: 5, y: 1, script: 'tv' }, { x: 1, y: 1, script: 'home-shelf' }])

const brianHouse = house('brian-house', 'Brian\'s House', { map: 'vila', x: 17, y: 6 }, [
  person('brian-sis', 'Brian\'s Sister', 22, 7, 5, 'left', ['Brian left at dawn with his goggles on his head.', 'He says he will be the best maker in the valley.', 'He also says that about his sandwiches.']),
], [{ x: 1, y: 1, script: 'brian-shelf' }, { x: 2, y: 1, script: 'brian-shelf' }, { x: 5, y: 1, script: 'brian-tv' }])

const makerspace: GameMap = {
  id: 'makerspace', name: 'Makerspace', area: 'lab', music: 'makerspace', outside: 'void', battleBg: 'lab',
  rows: [
    'WWWWWWWWWWWWWWWW',
    'W3_3_3__VV_KKKKW',
    'W______________W',
    'W______________W',
    'W____DDDDD_____W',
    'W______________W',
    'WAA__RRRRRR__llW',
    'WAA__RRRRRR__llW',
    'W______________W',
    'WG____________GW',
    'W______mm______W',
    'WWWWWWWWWWWWWWWW',
  ],
  warps: [
    { x: 7, y: 10, to: 'vila', tx: 12, ty: 15, facing: 'down' },
    { x: 8, y: 10, to: 'vila', tx: 12, ty: 15, facing: 'down' },
  ],
  npcs: [
    { id: 'leo-lab', name: 'Leo Maker', look: looks.leoMaker, x: 7, y: 3, facing: 'down', script: 'leo-lab' },
    { id: 'brian-lab', name: 'Brian', look: looks.brian, x: 11, y: 5, facing: 'left', script: 'brian-lab', hideIf: 'got_starter' },
  ],
  things: [
    { x: 5, y: 4, script: 'pod:sparkit', sprite: 'pod:sparkit', hideIf: 'got_starter' },
    { x: 7, y: 4, script: 'pod:boxlet', sprite: 'pod:boxlet', hideIf: 'got_starter' },
    { x: 9, y: 4, script: 'pod:plusling', sprite: 'pod:plusling', hideIf: 'got_starter' },
    { x: 1, y: 1, script: 'printer' }, { x: 3, y: 1, script: 'printer' }, { x: 5, y: 1, script: 'printer' },
    { x: 1, y: 6, script: 'arduino-bench' }, { x: 13, y: 6, script: 'laser-cutter' },
    { x: 8, y: 1, script: 'lab-screen' }, { x: 11, y: 1, script: 'lab-shelf' },
    { x: 14, y: 8, script: 'basement', sprite: 'hatch', showIf: 'champion' },
  ],
  triggers: [{ x: 7, y: 9, w: 2, script: 'lab-intro', unlessFlag: 'lab_intro' }],
}

const basement: GameMap = {
  id: 'basement', name: 'Secret Basement', area: 'cave', music: 'legend', outside: 'void', battleBg: 'cave', dark: true,
  rows: [
    'WWWWWWWWWW',
    'WAA____AAW',
    'W________W',
    'W________W',
    'W________W',
    'W___mm___W',
    'WWWWWWWWWW',
  ],
  warps: [{ x: 4, y: 5, to: 'makerspace', tx: 13, ty: 8, facing: 'down' }, { x: 5, y: 5, to: 'makerspace', tx: 13, ty: 8, facing: 'down' }],
  npcs: [{ id: 'arduinix', name: 'Arduinix', look: looks.leoMaker, pyxie: 'arduinix', x: 4, y: 2, facing: 'down', script: 'arduinix', hideIf: 'arduinix_done' }],
  things: [{ x: 1, y: 1, script: 'basement-note' }],
}

// ---------------------------------------------------------------- ROUTE 1

const route1: GameMap = {
  id: 'route1', name: 'Route 1 · Print Path', area: 'route', music: 'route', outside: 'tree',
  rows: [
    'TTTTTTTTT::TTTTTTTTT',
    'TT.......::.......TT',
    'T,,,,....::....,,,,T',
    'T,,,,,...::...,,,,,T',
    'T,,,,....::....,,,,T',
    'T........::........T',
    'TLLLLLL..::..LLLLLLT',
    'T........::........T',
    'T..f.....::.....f..T',
    'TTTT.....::.....TTTT',
    'T,,,,,,..::..,,,,,,T',
    'T,,,,,,..::..,,,,,,T',
    'T,,,,,,..::..,,,,,,T',
    'T........::........T',
    'T..TT....::....TT..T',
    'T..TT....::....TT..T',
    'T........::........T',
    'T~~~~....::....,,,,T',
    'T~~~~~...::...,,,,,T',
    'T~~~~....::....,,,,T',
    'T........::........T',
    'TLLLLLLL.::.LLLLLLLT',
    'T........::........T',
    'T,,,,,...::...,,,,,T',
    'T,,,,,...::...,,,,,T',
    'T..f.....::.....f..T',
    'TT.......::.......TT',
    'TTTTTTTTT::TTTTTTTTT',
  ],
  edges: [{ side: 'down', to: 'vila', offset: 2 }, { side: 'up', to: 'harbor', offset: 2 }],
  encounters: { rate: 0.12, table: [{ species: 'echobat', min: 2, max: 4, weight: 50 }, { species: 'quotie', min: 2, max: 4, weight: 35 }, { species: 'memoth', min: 3, max: 5, weight: 15 }] },
  npcs: [
    trainer('r1-tom', 'Maker Kid Tom', 1, 6, 13, 'right', tr('r1-tom', 'Maker Kid', [['echobat', 4]], 60, 'Hey! You have a pyxie too? Let\'s test our code!', 'Whoa, your code compiled faster than mine.', 'Tip: tall grass is where wild pyxies hide.')),
    trainer('r1-bia', 'Coder Bia', 2, 13, 20, 'left', tr('r1-bia', 'Coder', [['quotie', 4], ['echobat', 3]], 80, 'I just learned print()! Battle me!', 'OK, OK. Quotes matter. I get it.', 'Text inside quotes is printed exactly as written.')),
    person('r1-guide', 'Guide', 7, 11, 25, 'left', ['Wild pyxies hide in tall grass.', 'Pick a move, solve its challenge, and your pyxie attacks!', 'When a wild pyxie is weak, throw a Bytecube to catch it.']),
  ],
  items: [
    { id: 'r1-patch', x: 2, y: 8, item: 'patch', count: 2 },
    { id: 'r1-cube', x: 17, y: 1, item: 'bytecube', count: 2 },
    { id: 'r1-hidden', x: 1, y: 13, item: 'patch', count: 1, hidden: true },
  ],
  signs: [{ x: 8, y: 26, text: ['ROUTE 1 · PRINT PATH', 'North: Echo Harbor.'] }],
}

// ---------------------------------------------------------------- ECHO HARBOR

const harbor: GameMap = {
  id: 'harbor', name: 'Echo Harbor', area: 'town', music: 'town', outside: 'water',
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~PP~~~~~~~~',
    '~~~~~~~~~~~~~~PP~~~~~~~~',
    'TsssssssssssssPPsssssssT',
    'TssssssssssssssssssssssT',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T=======================',
    'T=======================',
    'T.........==...........T',
    'T.........==...........T',
    'T.........==...........T',
    'T.........==...........T',
    'T.........==...........T',
    'T.f.......==.........f.T',
    'T.........==...........T',
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  buildings: [
    { x: 2, y: 5, w: 6, h: 4, kind: 'lab', roof: '#ffd23f', label: 'LAB', to: 'harbor-lab', tx: 6, ty: 11, requires: labGate(labGates.echo, 'Marina Echo') },
    { x: 14, y: 5, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'harbor-station', tx: 5, ty: 6 },
    { x: 14, y: 12, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'harbor-mart', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 5, h: 4, kind: 'house', roof: '#2fb8b8', to: 'harbor-house', tx: 5, ty: 6 },
    { x: 19, y: 12, w: 4, h: 4, kind: 'house', roof: '#9b59d0', to: 'harbor-house2', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'down', to: 'route1', offset: -2 }, { side: 'right', to: 'route2', offset: 0 }],
  npcs: [
    person('harbor-fisher', 'Fisher', 11, 15, 2, 'up', ['I fish for bugs.', 'In code, I mean. The real fish are too fast.']),
    person('harbor-sailor', 'Sailor', 5, 8, 4, 'down', ['Marina Echo runs the Lab here.', 'Her pyxies repeat EVERYTHING. Even typos.', 'Beat her and the Echo Badge is yours.'], 'wander'),
    person('harbor-kid', 'Kid', 13, 20, 16, 'left', ['print("Hello") shows Hello.', 'print(Hello) without quotes? Python panics. Hehe.']),
  ],
  signs: [{ x: 9, y: 11, text: ['ECHO HARBOR', 'Where every word comes back.'] }],
}

const harborLab = lab({
  id: 'harbor-lab', name: 'Echo Harbor Lab', exit: { map: 'harbor', x: 5, y: 9 }, floor: '#fff4c2',
  master: { name: 'Marina Echo', look: looks.marina, trainer: { id: 'marina', title: 'Lab Master', kind: 'master', team: [['echobat', 9], ['quotie', 9], ['echobat', 10]], duels: ['harbor-bell', 'lighthouse', 'echo-chamber'], bits: 600, sight: 0, badge: 'echo', reward: { hintlens: 3 },
    intro: 'Welcome to my Lab! My pyxies only respect REAL code. Write it, and their shields will break.', lose: 'Your prints rang true! Take the Echo Badge.', after: 'Every print() is a promise: what you write is what appears.' } },
  trainers: [
    { name: 'Lab Coder Rui', n: 14, trainer: tr('harbor-t1', 'Lab Coder', [['echobat', 7], ['echobat', 7]], 120, 'Marina taught me to print anything!', 'You print better than me.', 'Marina\'s pyxies use code duels. Real Python!', { sight: 3 }) },
    { name: 'Lab Coder Jade', n: 15, trainer: tr('harbor-t2', 'Lab Coder', [['quotie', 8]], 120, 'Quotes! Quotes everywhere!', 'Out of quotes...', 'Each print() makes a new line.', { sight: 3 }) },
  ],
  helper: ['This Lab is about print().', 'In a code duel, you write real Python.', 'Each hidden test that passes breaks one shield!'],
})

// ---------------------------------------------------------------- ROUTE 2

const route2: GameMap = {
  id: 'route2', name: 'Route 2 · Variable Valley', area: 'route', music: 'route', outside: 'tree',
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..,,,,,......TT......,,,,,,...T',
    'T..,,,,,......TT......,,,,,,...T',
    'T....f.......,,,,.......f......T',
    'T..TT........,,,,........TT....T',
    'T..TT..,,,,............,,,,....T',
    'T.............~~~~.............T',
    'T.....,,,,...~~~~~~...,,,,.....T',
    'T.....,,,,....~~~~....,,,,.....T',
    '::::::::::::::::::::::::::::::::',
    '::::::::::::::::::::::::::::::::',
    'T......,,,,,,.......,,,,,,.....T',
    'T..f...,,,,,,..TT...,,,,,,..f..T',
    'T......,,,,,,..TT...,,,,,,.....T',
    'T..............................T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  edges: [{ side: 'left', to: 'harbor', offset: 0 }, { side: 'right', to: 'boxford', offset: 0 }],
  encounters: { rate: 0.12, table: [{ species: 'memoth', min: 6, max: 9, weight: 40 }, { species: 'echobat', min: 6, max: 9, weight: 25 }, { species: 'quotie', min: 6, max: 9, weight: 25 }, { species: 'modmole', min: 7, max: 9, weight: 10 }] },
  npcs: [
    trainer('r2-ana', 'Coder Ana', 3, 8, 4, 'down', tr('r2-ana', 'Coder', [['memoth', 8], ['quotie', 7]], 140, 'My Memoth never forgets a value!', 'It forgot how to win...', 'b = a copies the value, not the box!')),
    trainer('r2-max', 'Maker Max', 16, 20, 14, 'up', tr('r2-max', 'Maker', [['echobat', 8], ['memoth', 9]], 150, 'I built a robot out of a cereal box. Fight it!', 'The cereal box lost.', 'Cardboard is the best prototype material.')),
    trainer('r2-sam', 'Coder Sam', 17, 27, 6, 'down', tr('r2-sam', 'Coder', [['quotie', 9], ['echobat', 9], ['memoth', 8]], 180, 'Three pyxies, three variables!', 'Reassigned to defeat.', 'A variable keeps only its newest value.', { sight: 3 })),
  ],
  items: [
    { id: 'r2-cubes', x: 30, y: 1, item: 'bytecube', count: 3 },
    { id: 'r2-patch', x: 16, y: 14, item: 'patch', count: 2 },
    { id: 'r2-hidden', x: 1, y: 14, item: 'supercube', count: 1, hidden: true },
  ],
  signs: [{ x: 2, y: 8, text: ['ROUTE 2 · VARIABLE VALLEY', 'Memoths never forget.'] }],
}

// ---------------------------------------------------------------- BOXFORD

const boxford: GameMap = {
  id: 'boxford', name: 'Boxford', area: 'town', music: 'town', outside: 'tree',
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'T..........==..........T',
    'T.f........==........f.T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    '=======================T',
    '=======================T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T..f................f..T',
    'T......................T',
    'T......................T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 2, y: 3, w: 6, h: 4, kind: 'lab', roof: '#4fa3ff', label: 'LAB', to: 'boxford-lab', tx: 6, ty: 11, requires: labGate(labGates.box, 'Otto Box') },
    { x: 15, y: 3, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'boxford-station', tx: 5, ty: 6 },
    { x: 15, y: 12, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'boxford-mart', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 5, h: 4, kind: 'house', roof: '#c98b5e', to: 'boxford-house', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'left', to: 'route2', offset: 0 }, { side: 'up', to: 'route3', offset: -1 }],
  npcs: [
    { id: 'brian-boxford', name: 'Brian', look: looks.brian, x: 11, y: 14, facing: 'down', script: 'brian-arduino', hideIf: 'arduino_returned' },
    person('boxford-old', 'Old Maker', 20, 20, 17, 'left', ['In my day, we stored variables on punch cards.', 'Now kids keep them in Memoths. Progress!']),
  ],
  signs: [
    { x: 9, y: 9, text: ['BOXFORD', 'Everything has a label here.'] },
    { x: 10, y: 15, kind: 'statue', text: ['A cardboard castle built in a Makerspace class.', 'Structural integrity: tape.'] },
  ],
}

// ---------------------------------------------------------------- ROUTE 3

const route3: GameMap = {
  id: 'route3', name: 'Route 3 · Quote Coast', area: 'beach', music: 'beach', outside: 'water',
  rows: [
    'TTTTTTTTTT::TTTTTTTTTT',
    '~~~~sss...::...,,,,,TT',
    '~~~~sss...::...,,,,,TT',
    '~~~~~ss...::....,,,,TT',
    '~~~~~sss..::......TTTT',
    '~~~~~sss..::.........T',
    '~~~~~ss,,,::,,,......T',
    '~~~~~ss,,,::,,,..f...T',
    '~~~~~ss,,,::,,,......T',
    '~~~~ss....::.....TTTTT',
    '~~~~ss....::.........T',
    '~~~PPPPss.::...,,,,,,T',
    '~~~~ss....::...,,,,,,T',
    '~~~~ss....::...,,,,,,T',
    '~~~~~ss...::.........T',
    '~~~~~ssLLL::LLLLLLLLLT',
    '~~~~~ss...::.........T',
    '~~~~~ss,,,::,,,,.....T',
    '~~~~~ss,,,::,,,,..f..T',
    '~~~~~ss,,,::,,,,.....T',
    '~~~~sss...::.........T',
    '~~~~sss...::...TT....T',
    '~~~~sss...::...TT....T',
    '~~~~~ss...::.........T',
    '~~~~~ss,,,::,,,......T',
    '~~~~~ss,,,::,,,......T',
    '~~~~~ss...::.....f...T',
    '~~~~sss...::.........T',
    'TTTTTTT...::.........T',
    'TTTTTTTTTT::TTTTTTTTTT',
  ],
  edges: [{ side: 'down', to: 'boxford', offset: 1 }, { side: 'up', to: 'stringhaven', offset: 1 }],
  encounters: { rate: 0.13, table: [{ species: 'quotie', min: 11, max: 14, weight: 40 }, { species: 'memoth', min: 11, max: 14, weight: 25 }, { species: 'echobat', min: 12, max: 15, weight: 20 }, { species: 'modmole', min: 12, max: 14, weight: 10 }, { species: 'stringra', min: 15, max: 16, weight: 5 }] },
  npcs: [
    trainer('r3-luna', 'Beach Coder Luna', 5, 8, 10, 'right', tr('r3-luna', 'Beach Coder', [['quotie', 13], ['quotie', 14]], 220, 'Two Quoties make a string!', 'My string snapped.', 'Glue texts with +. Spaces go inside the quotes.', { sight: 3 })),
    trainer('r3-dante', 'Maker Dante', 18, 17, 16, 'left', tr('r3-dante', 'Maker', [['memoth', 14], ['echobat', 14]], 230, 'I solder on the beach. The sea breeze cools it.', 'Cold solder joint. Classic.', 'Never touch the hot end of a soldering iron!')),
    trainer('r3-iris', 'Coder Iris', 19, 8, 24, 'right', tr('r3-iris', 'Coder', [['modmole', 14], ['quotie', 15]], 240, 'My Modmole digs remainders!', 'Nothing left over for me...', '% gives what is left after dividing.')),
    { id: 'brian-r3', name: 'Brian', look: looks.brian, x: 12, y: 3, facing: 'left', script: 'rival2', hideIf: 'rival2' },
  ],
  triggers: [{ x: 10, y: 4, w: 2, script: 'rival2', unlessFlag: 'rival2' }],
  items: [
    { id: 'r3-lost-arduino', x: 19, y: 7, item: 'lostarduino', count: 1, hidden: true },
    { id: 'r3-patch', x: 20, y: 10, item: 'patch', count: 2 },
    { id: 'r3-cubes', x: 6, y: 13, item: 'bytecube', count: 3 },
  ],
  signs: [{ x: 12, y: 28, text: ['ROUTE 3 · QUOTE COAST', 'Quoties travel in pairs.'] }],
}

// ---------------------------------------------------------------- STRINGHAVEN

const stringhaven: GameMap = {
  id: 'stringhaven', name: 'Stringhaven', area: 'town', music: 'town', outside: 'tree',
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T.f..................f.T',
    'T..........==..........T',
    'T..........==..........T',
    '=======================T',
    '=======================T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..f.......==.......f..T',
    'T..........==..........T',
    'T..........==..........T',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  buildings: [
    { x: 9, y: 2, w: 6, h: 4, kind: 'lab', roof: '#ff6fae', label: 'LAB', to: 'stringhaven-lab', tx: 6, ty: 11, requires: labGate(labGates.quote, 'Lia Quote') },
    { x: 2, y: 2, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'stringhaven-station', tx: 5, ty: 6 },
    { x: 17, y: 2, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'stringhaven-mart', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 5, h: 4, kind: 'house', roof: '#ec6aa8', to: 'stringhaven-house', tx: 5, ty: 6 },
    { x: 16, y: 12, w: 5, h: 4, kind: 'house', roof: '#36b26b', to: 'stringhaven-house2', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'down', to: 'route3', offset: -1 }, { side: 'left', to: 'route4', offset: 0 }],
  npcs: [
    person('sh-poet', 'Poet', 21, 8, 13, 'right', ['"Hello" + "World" is HelloWorld.', 'No space. No mercy. Such is the way of +.']),
    person('sh-kid', 'Kid', 23, 15, 7, 'down', ['West of town is Sum Canyon.', 'A cardboard wall blocks the cave!', 'Lia Quote has a Box Cutter. Just saying.'], 'wander'),
  ],
  signs: [{ x: 13, y: 8, text: ['STRINGHAVEN', 'Glued together with care.'] }],
}

// ---------------------------------------------------------------- ROUTE 4 + LASER CUTTER CAVE

const route4: GameMap = {
  id: 'route4', name: 'Route 4 · Sum Canyon', area: 'mountain', music: 'route', outside: 'rock',
  rows: [
    '##################################',
    '#...,,,,,.......##.......,,,,,...#',
    '#...,,,,,.......##.......,,,,,...#',
    '#...............##...............#',
    '#..rr...,,,,....##..C.,,,,...rr..#',
    '#.......,,,,....##....,,,,.......#',
    '#...............##...............#',
    '#...............##...............#',
    '#..f............##............f..#',
    ':::::::::::::::.##.:::::::::::::::',
    ':::::::::::::::.##.:::::::::::::::',
    '#...............##...............#',
    '#..rr...,,,,,...##...,,,,,...rr..#',
    '#.......,,,,,...##...,,,,,.......#',
    '#.......,,,,,...##...,,,,,.......#',
    '#...............##...............#',
    '#...f...........##...........f...#',
    '##################################',
  ],
  buildings: [
    { x: 19, y: 1, w: 3, h: 3, kind: 'cave', roof: '#8a6a4a', to: 'lasercave', tx: 20, ty: 10 },
    { x: 12, y: 12, w: 3, h: 3, kind: 'cave', roof: '#8a6a4a', to: 'lasercave', tx: 3, ty: 10 },
  ],
  edges: [{ side: 'right', to: 'stringhaven', offset: 0 }, { side: 'left', to: 'abacus', offset: 0 }],
  encounters: { rate: 0.12, table: [{ species: 'modmole', min: 17, max: 21, weight: 40 }, { species: 'echobat', min: 17, max: 20, weight: 20 }, { species: 'memoth', min: 17, max: 20, weight: 15 }, { species: 'quotie', min: 17, max: 20, weight: 15 }, { species: 'booly', min: 18, max: 20, weight: 10 }] },
  npcs: [
    trainer('r4-hiker', 'Hiker Bento', 6, 24, 7, 'left', tr('r4-hiker', 'Hiker', [['modmole', 19], ['modmole', 20]], 300, 'These canyons were divided evenly. By Modmoles.', 'Rock bottom.', 'Use // to divide without decimals.')),
    trainer('r4-zoe', 'Coder Zoe', 24, 26, 14, 'up', tr('r4-zoe', 'Coder', [['quotie', 19], ['memoth', 20]], 300, 'Order of operations! Fight me!', 'You multiplied before I could add.', 'Python does * before +.', { sight: 3 })),
    trainer('r4-caio', 'Maker Caio', 8, 6, 7, 'right', tr('r4-caio', 'Maker', [['booly', 20], ['modmole', 21]], 320, 'I made it through the laser cave!', 'I should have stayed in there.', 'Booly answers only True or False.')),
  ],
  items: [
    { id: 'r4-cubes', x: 32, y: 1, item: 'supercube', count: 2 },
    { id: 'r4-patch', x: 1, y: 16, item: 'patch', count: 3 },
    { id: 'r4-hidden', x: 31, y: 16, item: 'bigpatch', count: 1, hidden: true },
  ],
  signs: [{ x: 31, y: 8, text: ['ROUTE 4 · SUM CANYON', 'The only way west is through the Laser Cutter Cave.'] }],
}

const lasercave: GameMap = {
  id: 'lasercave', name: 'Laser Cutter Cave', area: 'cave', music: 'cave', outside: 'rock', dark: true,
  rows: [
    '########################',
    '##cccccccccccccccccccc##',
    '##ccccccc######ccccccc##',
    '##cc#llll######llll#cc##',
    '##ccccccc######ccccccc##',
    '##cc#cccc######cccc#cc##',
    '##cc################cc##',
    '##cc################cc##',
    '##cc################cc##',
    '##cc################cc##',
    '#ccc################ccc#',
    '#cmm################mmc#',
    '########################',
  ],
  warps: [
    { x: 2, y: 11, to: 'route4', tx: 13, ty: 15, facing: 'down' }, { x: 3, y: 11, to: 'route4', tx: 13, ty: 15, facing: 'down' },
    { x: 20, y: 11, to: 'route4', tx: 20, ty: 4, facing: 'down' }, { x: 21, y: 11, to: 'route4', tx: 20, ty: 4, facing: 'down' },
  ],
  encounters: { rate: 0.08, table: [{ species: 'shoutbat', min: 19, max: 22, weight: 40 }, { species: 'modmole', min: 19, max: 22, weight: 40 }, { species: 'divimole', min: 22, max: 23, weight: 20 }] },
  npcs: [
    { id: 'cave-grunt1', name: 'Bug Brigade Grunt', look: looks.grunt, x: 20, y: 6, facing: 'down', trainer: tr('cave-grunt1', 'Bug Brigade', [['shoutbat', 20], ['modmole', 20]], 280, 'The Bug Brigade owns this cave! Every program here will crash!', 'You... debugged me?', 'Dr. Segfault is waiting ahead. Hehehe.', { kind: 'villain', sight: 3 }) },
    { id: 'cave-grunt2', name: 'Bug Brigade Grunt', look: looks.grunt, x: 3, y: 6, facing: 'up', trainer: tr('cave-grunt2', 'Bug Brigade', [['stringra', 21]], 280, 'Hey! How did you get past the doctor?!', 'Error 404: victory not found.', 'The Grand Hackathon will crash. You\'ll see!', { kind: 'villain', sight: 3 }) },
    { id: 'segfault-cave', name: 'Dr. Segfault', look: looks.segfault, x: 11, y: 1, facing: 'right', hideIf: 'segfault1',
      trainer: { id: 'segfault1', title: 'Bug Brigade Boss', kind: 'villain', team: [['shoutbat', 22], ['stringra', 22]], duels: ['broken-greeter', 'broken-counter'], bits: 900, sight: 0, setFlag: 'segfault1',
        intro: 'Ah, a little coder. I am Dr. Segfault! I plant bugs in programs. My pyxies run on BROKEN code. Fix it, if you can!', lose: 'Impossible! You found my bugs... This isn\'t over. The Grand Hackathon will CRASH!', after: '' } },
    { id: 'nullwing-cave', name: 'Nullwing', look: looks.segfault, pyxie: 'nullwing', x: 11, y: 1, facing: 'down', script: 'nullwing', showIf: 'champion', hideIf: 'nullwing_done' },
  ],
  items: [
    { id: 'cave-duck', x: 6, y: 4, item: 'debugduck', count: 1 },
    { id: 'cave-bigpatch', x: 17, y: 5, item: 'bigpatch', count: 2 },
  ],
  signs: [
    { x: 4, y: 3, kind: 'board', text: ['MAKERSPACE RULE #1', 'MEASURE TWICE, CUT ONCE.'] },
    { x: 19, y: 3, kind: 'board', text: ['SAFETY NOTICE', 'Laser cutters cut wood, acrylic and cardboard.', 'NEVER cut PVC: it releases toxic gas!'] },
  ],
}

// ---------------------------------------------------------------- ABACUS CITY

const abacus: GameMap = {
  id: 'abacus', name: 'Abacus City', area: 'town', music: 'town', outside: 'tree',
  rows: [
    'TTTTTTTTTTT==TTTTTTTTTTT',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T.f........==........f.T',
    'T=======================',
    'T=======================',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T.f..................f.T',
    'T......................T',
    'T......................T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 15, y: 3, w: 6, h: 4, kind: 'lab', roof: '#ff8b3d', label: 'LAB', to: 'abacus-lab', tx: 6, ty: 11, requires: labGate(labGates.sum, 'Rafa Sum') },
    { x: 2, y: 3, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'abacus-station', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'abacus-mart', tx: 5, ty: 6 },
    { x: 15, y: 12, w: 5, h: 4, kind: 'house', roof: '#f2a93b', to: 'abacus-house', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'right', to: 'route4', offset: 0 }, { side: 'up', to: 'route5', offset: -1 }],
  npcs: [
    person('abacus-math', 'Mathlete', 25, 8, 13, 'right', ['7 / 2 is 3.5. But 7 // 2 is 3.', 'And 7 % 2 is 1. Three answers, one division!'], 'wander'),
  ],
  signs: [
    { x: 9, y: 11, text: ['ABACUS CITY', 'Count on us.'] },
    { x: 11, y: 15, kind: 'statue', text: ['A giant abacus.', 'Someone wrote 0.1 + 0.2 on it and ran away.'] },
  ],
}

// ---------------------------------------------------------------- ROUTE 5

const route5: GameMap = {
  id: 'route5', name: 'Route 5 · Truth Fields', area: 'route', music: 'route', outside: 'tree',
  rows: [
    'TTTTTTTTTT::TTTTTTTTTT',
    'T.........::.........T',
    'T,,,,,,...::...,,,,,,T',
    'T,,,,,,...::...,,,,,,T',
    'T.f.......::.......f.T',
    'TTT.......::.......TTT',
    'T,,,,,,,,.::.,,,,,,,,T',
    'T,,,,,,,,.::.,,,,,,,,T',
    'T.........::.........T',
    'TLLLLLLLL.::.LLLLLLLLT',
    'T....f....::....f....T',
    'T,,,,.....::.....,,,,T',
    'T,,,,..TT.::.TT..,,,,T',
    'T,,,,..TT.::.TT..,,,,T',
    'T.........::.........T',
    'T.ff......::......ff.T',
    'T,,,,,,,..::..,,,,,,,T',
    'T,,,,,,,..::..,,,,,,,T',
    'T.........::.........T',
    'TTTT......::......TTTT',
    'T.........::.........T',
    'T,,,,,,...::...,,,,,,T',
    'T,,,,,,...::...,,,,,,T',
    'T.........::.........T',
    'TLLLLLLLL.::.LLLLLLLLT',
    'T.........::.........T',
    'T..f......::......f..T',
    'T.........::.........T',
    'TT........::........TT',
    'TTTTTTTTTT::TTTTTTTTTT',
  ],
  edges: [{ side: 'down', to: 'abacus', offset: 1 }, { side: 'up', to: 'veritas', offset: 1 }],
  encounters: { rate: 0.12, table: [{ species: 'booly', min: 22, max: 26, weight: 40 }, { species: 'modmole', min: 22, max: 25, weight: 18 }, { species: 'memoth', min: 22, max: 25, weight: 15 }, { species: 'forkit', min: 23, max: 25, weight: 15 }, { species: 'memammoth', min: 25, max: 26, weight: 7 }, { species: 'truthowl', min: 27, max: 28, weight: 5 }] },
  npcs: [
    trainer('r5-ze', 'Coder Zé', 26, 4, 8, 'right', tr('r5-ze', 'Coder', [['booly', 25], ['booly', 25]], 380, 'True or False: you will win?', 'False. Definitely False.', '>= includes the number. > does not.')),
    trainer('r5-lara', 'Maker Lara', 27, 17, 14, 'left', tr('r5-lara', 'Maker', [['memoth', 25], ['modmole', 26]], 380, 'I 3D print phone stands. Want one? First, battle!', 'OK, here\'s your phone stand. Just kidding.', '3D printers build objects one layer at a time.')),
    trainer('r5-gui', 'Coder Gui', 28, 5, 20, 'right', tr('r5-gui', 'Coder', [['forkit', 25], ['booly', 26]], 400, 'if you battle me: you lose. else: you lose anyway!', 'My else branch failed.', 'else catches everything the if rejects.')),
    { id: 'brian-r5', name: 'Brian', look: looks.brian, x: 12, y: 2, facing: 'left', script: 'rival3', hideIf: 'rival3' },
  ],
  triggers: [{ x: 10, y: 3, w: 2, script: 'rival3', unlessFlag: 'rival3' }],
  items: [
    { id: 'r5-bigpatch', x: 20, y: 1, item: 'bigpatch', count: 2 },
    { id: 'r5-cubes', x: 1, y: 20, item: 'supercube', count: 3 },
    { id: 'r5-hidden', x: 20, y: 25, item: 'revivechip', count: 1, hidden: true },
  ],
  signs: [{ x: 9, y: 28, text: ['ROUTE 5 · TRUTH FIELDS', 'Every flower here is either True or False.'] }],
}

// ---------------------------------------------------------------- VERITAS PEAK

const veritas: GameMap = {
  id: 'veritas', name: 'Veritas Peak', area: 'town', music: 'town', outside: 'rock',
  rows: [
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#..f................f..#',
    '#..........==..........#',
    '#..........==..........#',
    '#=======================',
    '#=======================',
    '#..........==..........#',
    '#..........==..........#',
    '#..........==..........#',
    '#..........==..........#',
    '#..........==..........#',
    '#..f.......==.......f..#',
    '#..........==..........#',
    '#..........==..........#',
    '###########==###########',
  ],
  buildings: [
    { x: 9, y: 2, w: 6, h: 4, kind: 'lab', roof: '#5fd17a', label: 'LAB', to: 'veritas-lab', tx: 6, ty: 11, requires: labGate(labGates.truth, 'Bruna Bool') },
    { x: 2, y: 2, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'veritas-station', tx: 5, ty: 6 },
    { x: 17, y: 2, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'veritas-mart', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 5, h: 4, kind: 'house', roof: '#2fb8b8', to: 'veritas-house', tx: 5, ty: 6 },
    { x: 17, y: 12, w: 5, h: 4, kind: 'house', roof: '#9b59d0', to: 'veritas-house2', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'down', to: 'route5', offset: -1 }, { side: 'right', to: 'route6', offset: 0 }],
  npcs: [
    person('veritas-sage', 'Sage', 29, 8, 14, 'right', ['Truthowls never lie.', 'They also never say anything except True or False.', 'Dinner conversations are short.']),
  ],
  signs: [{ x: 13, y: 8, text: ['VERITAS PEAK', 'The truth is up here.'] }],
}

// ---------------------------------------------------------------- ROUTE 6

const route6: GameMap = {
  id: 'route6', name: 'Route 6 · Forking Path', area: 'forest', music: 'forest', outside: 'tree',
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,TT......TT......TT,,,,,,T',
    'T,,,,,,TT..::..TT..::..TT,,,,,,T',
    'T......TT..::..TT..::..TT......T',
    'T..::::::::::..TT..::::::::::..T',
    'T..::..TT...,,,,,,,,...TT..::..T',
    'T..::..TT...,,,,,,,,...TT..::..T',
    'T..::..........................T',
    'T..::....TT.........TT.......::T',
    '::::::::::::::::::::::::::::::::',
    '::::::::::::::::::::::::::::::::',
    'T......,,,,,,TT,,,,,,..........T',
    'T..f...,,,,,,TT,,,,,,.....f....T',
    'T......,,,,,,TT,,,,,,..........T',
    'T..............................T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  edges: [{ side: 'left', to: 'veritas', offset: 0 }, { side: 'right', to: 'branchwood', offset: 0 }],
  encounters: { rate: 0.13, table: [{ species: 'forkit', min: 27, max: 31, weight: 40 }, { species: 'booly', min: 27, max: 30, weight: 20 }, { species: 'stringra', min: 28, max: 31, weight: 15 }, { species: 'shoutbat', min: 28, max: 31, weight: 15 }, { species: 'divimole', min: 28, max: 30, weight: 10 }] },
  npcs: [
    { id: 'r6-grunt', name: 'Bug Brigade Grunt', look: looks.grunt, x: 16, y: 7, facing: 'down', trainer: tr('r6-grunt', 'Bug Brigade', [['stringra', 30], ['shoutbat', 30]], 450, 'The doctor is preparing something BIG for the Hackathon!', 'Ugh. Debugged again.', 'Nullwing... the infinite pyxie... it will crash everything!', { kind: 'villain', sight: 2 }) },
    trainer('r6-nico', 'Coder Nico', 30, 5, 12, 'right', tr('r6-nico', 'Coder', [['forkit', 30], ['booly', 31]], 460, 'Which path will you take? Either way, you face me!', 'I took the wrong branch.', 'An if inside an else is asked only when the first if is False.')),
    trainer('r6-ines', 'Maker Inês', 31, 27, 3, 'down', tr('r6-ines', 'Maker', [['divimole', 31], ['forkit', 31]], 480, 'My robot follows lines on the floor. With if/else!', 'It turned left. It should have turned right.', 'Line-following robots read a sensor and decide with if/else.')),
  ],
  items: [
    { id: 'r6-cubes', x: 1, y: 1, item: 'supercube', count: 3 },
    { id: 'r6-bigpatch', x: 30, y: 1, item: 'bigpatch', count: 2 },
    { id: 'r6-hidden', x: 12, y: 14, item: 'makercube', count: 1, hidden: true },
  ],
  signs: [{ x: 2, y: 8, text: ['ROUTE 6 · FORKING PATH', 'Choose wisely. Or just choose.'] }],
}

// ---------------------------------------------------------------- BRANCHWOOD

const branchwood: GameMap = {
  id: 'branchwood', name: 'Branchwood', area: 'town', music: 'forest', outside: 'tree',
  rows: [
    'TTTTTTTTTTT::TTTTTTTTTTT',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T..........::..........T',
    'T.f........::........f.T',
    'T..........::..........T',
    '=======================T',
    '=======================T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T..f................f..T',
    'T......................T',
    'T......................T',
    'TTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  buildings: [
    { x: 15, y: 2, w: 6, h: 4, kind: 'lab', roof: '#a57bff', label: 'LAB', to: 'branchwood-lab', tx: 6, ty: 11, requires: labGate(labGates.fork, 'Igor Fork') },
    { x: 2, y: 2, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'branchwood-station', tx: 5, ty: 6 },
    { x: 2, y: 12, w: 4, h: 3, kind: 'mart', roof: '#3d7be0', to: 'branchwood-mart', tx: 5, ty: 6 },
    { x: 15, y: 12, w: 5, h: 4, kind: 'house', roof: '#36b26b', to: 'branchwood-house', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'left', to: 'route6', offset: 0 }, { side: 'up', to: 'hackroad', offset: -1 }],
  npcs: [
    { id: 'steward', name: 'Hackathon Steward', look: looks.steward, x: 13, y: 1, facing: 'left', talk: ['The road north leads to the Lourenço Castanho Grand Hackathon.', 'Only makers with all six Lab Badges may enter.'] },
    person('bw-kid', 'Kid', 32, 8, 14, 'right', ['Igor Fork can write an if inside an else inside an else!', 'I can only write one if. But it\'s a really good if.'], 'wander'),
  ],
  triggers: [{ x: 11, y: 1, w: 2, script: 'steward', unlessFlag: 'badge-fork' }],
  signs: [{ x: 9, y: 8, text: ['BRANCHWOOD', 'Every path splits here.'] }],
}

// ---------------------------------------------------------------- HACKATHON ROAD

const hackroad: GameMap = {
  id: 'hackroad', name: 'Hackathon Road', area: 'mountain', music: 'victory', outside: 'rock',
  rows: [
    '##########::##########',
    '#........#::#........#',
    '#.,,,,,,.#::#.,,,,,,.#',
    '#.,,,,,,.#::#.,,,,,,.#',
    '#........#::#........#',
    '#####....#::#....#####',
    '#.........::.........#',
    '#.,,,,,,,.::.,,,,,,,.#',
    '#.,,,,,,,.::.,,,,,,,.#',
    '#.........::.........#',
    '#LLLLLLLL.::.LLLLLLLL#',
    '#.........::.........#',
    '#..rr.....::.....rr..#',
    '#.........::.........#',
    '#,,,,,,,,.::.,,,,,,,,#',
    '#,,,,,,,,.::.,,,,,,,,#',
    '#.........::.........#',
    '####......::......####',
    '#.........::.........#',
    '#.,,,,,,,.::.,,,,,,,.#',
    '#.,,,,,,,.::.,,,,,,,.#',
    '#.........::.........#',
    '#..rr.....::.....rr..#',
    '#.........::.........#',
    '#LLLLLLLL.::.LLLLLLLL#',
    '#.........::.........#',
    '#.,,,,,,,.::.,,,,,,,.#',
    '#.........::.........#',
    '##........::........##',
    '##########::##########',
  ],
  edges: [{ side: 'down', to: 'branchwood', offset: 1 }, { side: 'up', to: 'academy', offset: 1 }],
  encounters: { rate: 0.12, table: [{ species: 'shoutbat', min: 33, max: 37, weight: 16 }, { species: 'stringra', min: 33, max: 37, weight: 16 }, { species: 'memammoth', min: 33, max: 37, weight: 16 }, { species: 'divimole', min: 33, max: 37, weight: 16 }, { species: 'truthowl', min: 33, max: 37, weight: 16 }, { species: 'splitroot', min: 34, max: 38, weight: 12 }, { species: 'forkit', min: 33, max: 35, weight: 8 }] },
  npcs: [
    trainer('hr-ace1', 'Ace Coder Duda', 33, 5, 6, 'right', tr('hr-ace1', 'Ace Coder', [['truthowl', 36], ['splitroot', 36]], 700, 'Only the best reach the Hackathon. Prove it!', 'You ARE one of the best.', 'Good luck at Lourenço Castanho!')),
    trainer('hr-ace2', 'Ace Maker Teo', 34, 16, 13, 'left', tr('hr-ace2', 'Ace Maker', [['memammoth', 37], ['divimole', 37]], 720, 'My robot arm is ready for the Hackathon. Are you?', 'My robot arm waved goodbye.', 'Servo motors turn to an exact angle. Like a robot elbow!')),
    trainer('hr-ace3', 'Ace Coder Malu', 35, 4, 21, 'right', tr('hr-ace3', 'Ace Coder', [['stringra', 37], ['shoutbat', 37], ['splitroot', 38]], 760, 'Three pyxies. Three concepts. Zero bugs.', 'One bug. Mine.', 'Test the edge cases: the exact limit is where bugs hide.')),
    { id: 'hr-grunt', name: 'Bug Brigade Grunt', look: looks.grunt, x: 12, y: 18, facing: 'left', trainer: tr('hr-grunt', 'Bug Brigade', [['divimole', 35], ['stringra', 35]], 600, 'The doctor is already inside the Academy! You\'re too late!', 'Too late for me, at least.', 'Hurry... Dr. Segfault is about to release Nullwing!', { kind: 'villain', sight: 2 }) },
  ],
  items: [
    { id: 'hr-makercube', x: 1, y: 1, item: 'makercube', count: 1 },
    { id: 'hr-bigpatch', x: 20, y: 1, item: 'bigpatch', count: 3 },
    { id: 'hr-revive', x: 1, y: 27, item: 'revivechip', count: 2 },
  ],
}

// ---------------------------------------------------------------- LOURENÇO CASTANHO

const academy: GameMap = {
  id: 'academy', name: 'Lourenço Castanho', area: 'academy', music: 'academy', outside: 'tree',
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTTTT',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T......................T',
    'T.f........==........f.T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..f.......==.......f..T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'T..........==..........T',
    'TTTTTTTTTTT==TTTTTTTTTTT',
  ],
  buildings: [
    { x: 5, y: 1, w: 14, h: 7, kind: 'academy', roof: '#6a2fb8', label: 'LOURENÇO CASTANHO', to: 'hall', tx: 7, ty: 13, requires: { badges: 6, message: 'The Grand Hackathon is for makers with all six Lab Badges.' } },
    { x: 1, y: 10, w: 5, h: 4, kind: 'station', roof: '#e8483f', to: 'academy-station', tx: 5, ty: 6 },
  ],
  edges: [{ side: 'down', to: 'hackroad', offset: -1 }],
  npcs: [
    person('ac-student1', 'Student', 36, 16, 11, 'left', ['Welcome to Lourenço Castanho!', 'Our colors are purple and yellow. Go team!']),
    person('ac-student2', 'Student', 37, 19, 16, 'up', ['The Makerspace here has laser cutters, 3D printers AND a robot named Kevin.', 'Kevin does not do homework. We asked.'], 'wander'),
    person('ac-student3', 'Student', 38, 7, 16, 'right', ['The Grand Hackathon finals are inside!', 'They say the champion is a maker named Leo.']),
  ],
  signs: [{ x: 9, y: 9, text: ['ESCOLA LOURENÇO CASTANHO', 'Grand Hackathon this week! Purple and yellow forever.'] }],
}

const hall: GameMap = {
  id: 'hall', name: 'Grand Hackathon Hall', area: 'academy', music: 'hall', outside: 'void', battleBg: 'academy', tint: '#ece0ff',
  rows: [
    'WWWWWWWWWWWWWWWW',
    'WVV____VV____VVW',
    'W--------------W',
    'W--------------W',
    'WG---DDDDDD---GW',
    'W--------------W',
    'W--------------W',
    'W---DD----DD---W',
    'W--------------W',
    'W--------------W',
    'WG------------GW',
    'W---RRRRRRRR---W',
    'W---RRRRRRRR---W',
    'W--------------W',
    'W------mm------W',
    'WWWWWWWWWWWWWWWW',
  ],
  warps: [{ x: 7, y: 14, to: 'academy', tx: 12, ty: 8, facing: 'down' }, { x: 8, y: 14, to: 'academy', tx: 12, ty: 8, facing: 'down' }],
  npcs: [
    { id: 'segfault-hall', name: 'Dr. Segfault', look: looks.segfault, x: 7, y: 11, facing: 'down', hideIf: 'segfault2',
      trainer: { id: 'segfault2', title: 'Bug Brigade Boss', kind: 'villain', team: [['stringra', 36], ['divimole', 36], ['splitroot', 37]], duels: ['broken-gate', 'broken-greeter', 'broken-counter'], bits: 2000, sight: 2, setFlag: 'segfault2',
        intro: 'YOU again! I broke the Hackathon gate program. Nobody gets in, nobody gets out! Unless... you can fix THREE bugs at once?', lose: 'NO! My beautiful bugs! ...Fine. Nullwing escaped anyway. Enjoy your Hackathon.', after: '' } },
    { id: 'brian-hall', name: 'Brian', look: looks.brian, x: 7, y: 7, facing: 'down',
      trainer: { id: 'rival4', title: 'Rival', kind: 'rival', team: [['vaultron', 40], ['truthowl', 39], ['splitroot', 39], ['calcudrake', 40]], bits: 2500, sight: 3, setFlag: 'rival4',
        intro: 'So we meet at the finals! Since the Makerspace, I wanted this battle. No more holding back. All my code, all my pyxies!', lose: '...You won. Fair and square. Leo Maker is waiting. Make the valley proud, OK?', after: 'Go! Leo Maker is up there!' } },
    { id: 'leo-hall', name: 'Leo Maker', look: looks.leoMaker, x: 7, y: 2, facing: 'down', script: 'champion' },
  ],
}

// ---------------------------------------------------------------- INTERIORS

const visitor = (id: string, n: number, talk: string[]): NpcDef => person(id, 'Visitor', n, 9, 5, 'left', talk, 'wander')

const towns: Array<{ id: string; name: string; station: [number, number]; mart?: [number, number]; tier: number; houses: Array<{ id: string; at: [number, number]; npcs: NpcDef[] }> }> = [
  { id: 'harbor', name: 'Echo Harbor', station: [16, 9], mart: [16, 15], tier: 1, houses: [
    { id: 'harbor-house', at: [4, 16], npcs: [person('hh-1', 'Grandma', 40, 3, 5, 'right', ['My grandson asked me what a variable is.', 'I said: it\'s a box with a name. He said: like your cookie jar?', 'Exactly like my cookie jar.'])] },
    { id: 'harbor-house2', at: [21, 16], npcs: [person('hh-2', 'Maker Mom', 41, 7, 5, 'left', ['We built a cardboard boat for the harbor race.', 'It floated for eleven seconds. A family record!'])] },
  ] },
  { id: 'boxford', name: 'Boxford', station: [17, 7], mart: [17, 15], tier: 2, houses: [
    { id: 'boxford-house', at: [4, 16], npcs: [person('bh-1', 'Collector', 42, 3, 5, 'right', ['I keep every value in labelled boxes.', 'The label is the variable name. The thing inside is the value!'])] },
  ] },
  { id: 'stringhaven', name: 'Stringhaven', station: [4, 6], mart: [19, 5], tier: 2, houses: [
    { id: 'stringhaven-house', at: [4, 16], npcs: [person('sh-1', 'Writer', 43, 3, 5, 'right', ['print("I am " + 12) crashes.', 'print("I am " + str(12)) works. str() saved my novel.'])] },
    { id: 'stringhaven-house2', at: [18, 16], npcs: [person('sh-2', 'Kid', 44, 7, 5, 'left', ['I named my Quotie "Hello World".', 'It\'s the first thing every coder names something.'])] },
  ] },
  { id: 'abacus', name: 'Abacus City', station: [4, 7], mart: [4, 15], tier: 3, houses: [
    { id: 'abacus-house', at: [17, 16], npcs: [person('ah-1', 'Accountant', 45, 3, 5, 'right', ['I split the bill: 100 // 3 is 33 each.', 'And 100 % 3 is 1 coin left over. I keep that one.'])] },
  ] },
  { id: 'veritas', name: 'Veritas Peak', station: [4, 6], mart: [19, 5], tier: 4, houses: [
    { id: 'veritas-house', at: [4, 16], npcs: [person('vh-1', 'Judge', 46, 3, 5, 'right', ['"cat" == "Cat" is False.', 'In this house, capital letters are taken VERY seriously.'])] },
    { id: 'veritas-house2', at: [19, 16], npcs: [person('vh-2', 'Climber', 47, 7, 5, 'left', ['From the peak you can see the Lourenço Castanho Academy.', 'Its roof is purple and yellow. You can\'t miss it.'])] },
  ] },
  { id: 'branchwood', name: 'Branchwood', station: [4, 6], mart: [4, 15], tier: 4, houses: [
    { id: 'branchwood-house', at: [17, 16], npcs: [person('bwh-1', 'Robot Builder', 48, 3, 5, 'right', ['My robot uses: if distance < 10: turn. else: go forward.', 'It has only crashed into the fridge twice this week.'])] },
  ] },
]

const interiors: GameMap[] = towns.flatMap((town) => [
  station(`${town.id}-station`, town.name, { map: town.id, x: town.station[0], y: town.station[1] }, visitor(`${town.id}-sv`, 50 + town.tier, ['Tech Tina heals your whole team for free.', 'The PC over there stores extra pyxies in the Cloud Box.'])),
  ...(town.mart ? [mart(`${town.id}-mart`, town.name, { map: town.id, x: town.mart[0], y: town.mart[1] }, town.tier)] : []),
  ...town.houses.map((h) => house(h.id, `${town.name} House`, { map: town.id, x: h.at[0], y: h.at[1] }, h.npcs)),
])

const academyStation = station('academy-station', 'Lourenço Castanho', { map: 'academy', x: 3, y: 14 }, visitor('acs-v', 60, ['Even champions need a recharge.', 'Especially champions, actually.']))

const labs: GameMap[] = [
  harborLab,
  lab({
    id: 'boxford-lab', name: 'Boxford Lab', exit: { map: 'boxford', x: 5, y: 7 }, floor: '#d8ebff',
    master: { name: 'Otto Box', look: looks.otto, trainer: { id: 'otto', title: 'Lab Master', kind: 'master', team: [['memoth', 15], ['boxlet', 15], ['memoth', 16]], duels: ['two-boxes', 'double-box', 'swap-boxes'], bits: 1000, sight: 0, badge: 'box', reward: { supercube: 3 },
      intro: 'Hmm. A challenger. Every value in my Lab has a box and a label. Let\'s see if yours do too.', lose: 'Your boxes were perfectly labelled. The Box Badge is yours.', after: 'Name your boxes well, and your code explains itself.' } },
    trainers: [
      { name: 'Lab Coder Gabi', n: 52, trainer: tr('boxford-t1', 'Lab Coder', [['memoth', 13], ['echobat', 13]], 200, 'My variables are always ready!', 'Reassigned!', 'Otto\'s duels: replace the 0 with the right formula.', { sight: 3 }) },
      { name: 'Lab Coder Enzo', n: 53, trainer: tr('boxford-t2', 'Lab Coder', [['memoth', 14]], 200, 'Box battle!', 'My box is empty.', 'Use the variable names, not the numbers.', { sight: 3 }) },
    ],
    helper: ['Otto Box loves variables.', 'His duels give you a program with a box set to 0.', 'Change the formula so every test passes!'],
  }),
  lab({
    id: 'stringhaven-lab', name: 'Stringhaven Lab', exit: { map: 'stringhaven', x: 12, y: 6 }, floor: '#ffe0ef',
    master: { name: 'Lia Quote', look: looks.lia, trainer: { id: 'lia', title: 'Lab Master', kind: 'master', team: [['quotie', 20], ['stringra', 21], ['quotie', 21]], duels: ['name-tag', 'full-name', 'age-card'], bits: 1400, sight: 0, badge: 'quote', reward: { boxcutter: 1, bigpatch: 2 },
      intro: 'Darling, words are everything. Glue them right, and my pyxies will listen.', lose: 'Beautifully glued! The Quote Badge, and my Box Cutter. You\'ll need it in Sum Canyon.', after: 'Remember: + glues text, and str() turns numbers into text.' } },
    trainers: [
      { name: 'Lab Coder Nina', n: 54, trainer: tr('sh-t1', 'Lab Coder', [['quotie', 18], ['quotie', 18]], 300, 'Hello + World!', 'HelloWorld... no space...', 'Lia\'s duels are all about gluing text with +.', { sight: 3 }) },
      { name: 'Lab Coder Beto', n: 55, trainer: tr('sh-t2', 'Lab Coder', [['stringra', 19]], 300, 'My Stringra hates numbers!', 'It got a TypeError.', 'Text + number crashes. Use str()!', { sight: 3 }) },
    ],
    helper: ['Lia Quote is the queen of text.', 'Glue pieces with +, and don\'t forget the spaces inside quotes.', 'A number must become text with str() first.'],
  }),
  lab({
    id: 'abacus-lab', name: 'Abacus City Lab', exit: { map: 'abacus', x: 18, y: 7 }, floor: '#ffe3cc',
    master: { name: 'Rafa Sum', look: looks.rafa, trainer: { id: 'rafa', title: 'Lab Master', kind: 'master', team: [['modmole', 25], ['plusling', 25], ['divimole', 26]], duels: ['remainder', 'taxi-fare', 'seconds'], bits: 1800, sight: 0, badge: 'sum', reward: { revivechip: 2 },
      intro: 'Numbers don\'t lie! But they DO divide, multiply and leave remainders. Let\'s calculate!', lose: 'Your math is flawless! Take the Sum Badge.', after: '// gives whole parts, % gives what\'s left. Never forget.' } },
    trainers: [
      { name: 'Lab Coder Duda', n: 56, trainer: tr('ab-t1', 'Lab Coder', [['modmole', 23], ['modmole', 23]], 380, 'Double Modmole, double remainders!', 'Divided and conquered.', 'Rafa\'s duels use // and %.', { sight: 3 }) },
      { name: 'Lab Coder Leo', n: 57, trainer: tr('ab-t2', 'Lab Coder', [['divimole', 24]], 380, 'My name is Leo too! But I\'m not THE Leo.', 'Definitely not the Leo.', 'Python multiplies before it adds.', { sight: 3 }) },
    ],
    helper: ['Rafa Sum is a calculator with legs.', 'His duels need formulas: + - * / // %.', 'Read the recipe in the prompt carefully.'],
  }),
  lab({
    id: 'veritas-lab', name: 'Veritas Peak Lab', exit: { map: 'veritas', x: 12, y: 6 }, floor: '#d9f7df',
    master: { name: 'Bruna Bool', look: looks.bruna, trainer: { id: 'bruna', title: 'Lab Master', kind: 'master', team: [['booly', 30], ['truthowl', 31], ['booly', 31]], duels: ['pass-check', 'same-code', 'even-check'], bits: 2200, sight: 0, badge: 'truth', reward: { makercube: 1 },
      intro: 'Statement: you will win. True or False? Let\'s find out with code.', lose: 'True! You won. The Truth Badge is yours.', after: 'A comparison is a question. Python always answers True or False.' } },
    trainers: [
      { name: 'Lab Coder Clara', n: 58, trainer: tr('ve-t1', 'Lab Coder', [['booly', 28], ['booly', 28]], 450, 'True! I mean, battle!', 'False. I mean, I lost.', 'Bruna\'s duels print comparisons directly: print(x >= 50).', { sight: 3 }) },
      { name: 'Lab Coder Rafael', n: 59, trainer: tr('ve-t2', 'Lab Coder', [['truthowl', 29]], 450, 'My Truthowl never lies!', 'It said I would lose. It was right.', '== compares. Capitals matter in text!', { sight: 3 }) },
    ],
    helper: ['Bruna Bool speaks only True and False.', 'Her duels: print a comparison, no if/else needed.', 'Even numbers: number % 2 == 0.'],
  }),
  lab({
    id: 'branchwood-lab', name: 'Branchwood Lab', exit: { map: 'branchwood', x: 18, y: 6 }, floor: '#e6dcff',
    master: { name: 'Igor Fork', look: looks.igor, trainer: { id: 'igor', title: 'Lab Master', kind: 'master', team: [['forkit', 35], ['splitroot', 36], ['splitroot', 36]], duels: ['coin-muncher', 'speed-wraith', 'medal-dragon'], bits: 2800, sight: 0, badge: 'fork', reward: { debugduck: 2 },
      intro: 'At every fork, one path. if this, else that. Let\'s see which path YOUR code takes.', lose: 'Every branch, perfectly placed. The Fork Badge! The Grand Hackathon awaits.', after: 'An if inside an else is asked only when the first condition was False.' } },
    trainers: [
      { name: 'Lab Coder Lucas', n: 61, trainer: tr('bw-t1', 'Lab Coder', [['forkit', 33], ['booly', 33]], 520, 'Left or right? Win or lose? Battle!', 'I took the losing branch.', 'Igor\'s duels need if/else. Even nested!', { sight: 3 }) },
      { name: 'Lab Coder Sofia', n: 62, trainer: tr('bw-t2', 'Lab Coder', [['splitroot', 34]], 520, 'My Splitroot has branches inside branches!', 'Pruned!', 'Indent the inner if 4 spaces, its prints 8.', { sight: 3 }) },
    ],
    helper: ['Igor Fork is the master of decisions.', 'His duels: full if/else, sometimes an if inside the else.', 'Check the exact limits: > or >=?'],
  }),
]

export const maps: GameMap[] = [
  vila, home, brianHouse, makerspace, basement, route1, harbor, route2, boxford, route3, stringhaven, route4, lasercave,
  abacus, route5, veritas, route6, branchwood, hackroad, academy, hall, academyStation, ...interiors, ...labs,
]

export const mapById: Record<string, GameMap> = Object.fromEntries(maps.map((map) => [map.id, map]))

export function getMap(id: string): GameMap {
  const map = mapById[id]
  if (!map) throw new Error(`Unknown map ${id}`)
  return map
}

export const START = { map: 'home', x: 8, y: 3, facing: 'down' as const }
