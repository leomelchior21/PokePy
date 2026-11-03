// Code duels: the Final Bosses mechanic. The student writes real Python, and every hidden test
// that passes breaks one of the enemy's shields. Prompts use highlights:
// [Welcome] is a message to print, {18 or more} is a rule, *write the else* is the task.

export interface DuelTest { inputs: string[]; expected: string }

export interface CodeDuel {
  id: string
  title: string
  prompt: string
  inputNames: string[]
  starter: string
  solution: string
  tests: DuelTest[]
  hints: string[]
  /** 'lines' counts each expected line as one shield, for programs with no input. */
  scoring?: 'tests' | 'lines'
}

const t = (inputs: string | string[], expected: string): DuelTest => ({ inputs: Array.isArray(inputs) ? inputs : [inputs], expected })

export const duels: Record<string, CodeDuel> = {
  // Arena 1 · Echo Harbor · PRINT
  'harbor-bell': {
    id: 'harbor-bell', title: 'The Harbor Bell', scoring: 'lines', inputNames: [],
    prompt: 'The ferry bell rings twice, then announces the ferry. *Print three lines*: [Ding!], [Ding!], [The ferry is here].',
    starter: '# Print three lines, one print() each.\n',
    solution: 'print("Ding!")\nprint("Ding!")\nprint("The ferry is here")',
    tests: [t([], 'Ding!\nDing!\nThe ferry is here')],
    hints: ['Each print() makes one line.', 'Text goes inside quotes: print("Ding!")', 'Three lines need three prints.'],
  },
  'lighthouse': {
    id: 'lighthouse', title: 'The Lighthouse Count', scoring: 'lines', inputNames: [],
    prompt: 'Print [Boats tonight:] on one line. On the next line, *let Python calculate 6 * 7* and print the result [42].',
    starter: '# Line 1: text. Line 2: a calculation, no quotes.\n',
    solution: 'print("Boats tonight:")\nprint(6 * 7)',
    tests: [t([], 'Boats tonight:\n42')],
    hints: ['The first print shows text, so it needs quotes.', 'Without quotes, Python calculates: print(6 * 7).'],
  },
  'echo-chamber': {
    id: 'echo-chamber', title: 'The Echo Chamber', inputNames: ['word'],
    prompt: 'A word arrives. The chamber shouts it back *two times*, each on its own line. If the word is {robot}, print [robot] and [robot].',
    starter: 'word = input()\n# Print word two times.\n',
    solution: 'word = input()\nprint(word)\nprint(word)',
    tests: [t('robot', 'robot\nrobot'), t('hi', 'hi\nhi'), t('Leo Maker', 'Leo Maker\nLeo Maker'), t('42', '42\n42'), t('Pyxies!', 'Pyxies!\nPyxies!')],
    hints: ['word is a variable: no quotes around it.', 'print(word) twice.'],
  },

  // Arena 2 · Boxford · VAR
  'two-boxes': {
    id: 'two-boxes', title: 'Two Boxes', inputNames: ['a', 'b'],
    prompt: 'Two whole numbers arrive in boxes a and b. *Replace 0 with a formula that adds them*, store it in result, then print it.',
    starter: 'a = int(input())\nb = int(input())\n\nresult = 0  # change this\nprint(result)',
    solution: 'a = int(input())\nb = int(input())\n\nresult = a + b\nprint(result)',
    tests: [t(['8', '4'], '12'), t(['2', '3'], '5'), t(['11', '7'], '18'), t(['0', '9'], '9'), t(['-3', '8'], '5')],
    hints: ['Use the box names, not numbers.', 'result = a + b'],
  },
  'double-box': {
    id: 'double-box', title: 'The Double Box', inputNames: ['number'],
    prompt: 'Make result *twice as large as number*. Keep the input and print lines where they are.',
    starter: 'number = int(input())\n\nresult = 0  # change this\nprint(result)',
    solution: 'number = int(input())\n\nresult = number * 2\nprint(result)',
    tests: [t('6', '12'), t('11', '22'), t('-4', '-8'), t('0', '0'), t('21', '42')],
    hints: ['Twice means times 2.', 'result = number * 2'],
  },
  'swap-boxes': {
    id: 'swap-boxes', title: 'Swap the Boxes', inputNames: ['first', 'second'],
    prompt: 'Otto mixed up the boxes. Two words arrive. *Print the second word first*, then the first word, each on its own line.',
    starter: 'first = input()\nsecond = input()\n# Print them in swapped order.\n',
    solution: 'first = input()\nsecond = input()\nprint(second)\nprint(first)',
    tests: [t(['A', 'B'], 'B\nA'), t(['cat', 'dog'], 'dog\ncat'), t(['Leo', 'Maker'], 'Maker\nLeo'), t(['1', '2'], '2\n1'), t(['up', 'down'], 'down\nup')],
    hints: ['The order of the prints is the order on screen.', 'print(second) comes first.'],
  },

  // Arena 3 · Stringhaven · TEXT
  'name-tag': {
    id: 'name-tag', title: 'The Name Tag', inputNames: ['name'],
    prompt: 'A name arrives. *Glue it into one greeting*: for {Bia} print [Hello, Bia!].',
    starter: 'name = input()\n# Glue the greeting with +\n',
    solution: 'name = input()\nprint("Hello, " + name + "!")',
    tests: [t('Bia', 'Hello, Bia!'), t('Theo', 'Hello, Theo!'), t('Leo Maker', 'Hello, Leo Maker!'), t('Kai', 'Hello, Kai!'), t('Brian', 'Hello, Brian!')],
    hints: ['Three pieces: "Hello, ", name and "!".', 'The space lives inside the quotes: "Hello, "'],
  },
  'full-name': {
    id: 'full-name', title: 'The Full Name', inputNames: ['first', 'last'],
    prompt: 'A first name and a last name arrive. *Print them glued with one space*: [Ana Lima].',
    starter: 'first = input()\nlast = input()\n',
    solution: 'first = input()\nlast = input()\nprint(first + " " + last)',
    tests: [t(['Ana', 'Lima'], 'Ana Lima'), t(['Leo', 'Maker'], 'Leo Maker'), t(['Bia', 'Souza'], 'Bia Souza'), t(['Theo', 'Castanho'], 'Theo Castanho'), t(['Kai', 'Ito'], 'Kai Ito')],
    hints: ['The space is its own piece: " "', 'first + " " + last'],
  },
  'age-card': {
    id: 'age-card', title: 'The Age Card', inputNames: ['name', 'age'],
    prompt: 'A name and an age arrive. Print one line: [Bia is 12 years old]. *age is a number: turn it into text with str()*.',
    starter: 'name = input()\nage = int(input())\n',
    solution: 'name = input()\nage = int(input())\nprint(name + " is " + str(age) + " years old")',
    tests: [t(['Bia', '12'], 'Bia is 12 years old'), t(['Theo', '9'], 'Theo is 9 years old'), t(['Leo', '40'], 'Leo is 40 years old'), t(['Kai', '13'], 'Kai is 13 years old'), t(['Lia', '11'], 'Lia is 11 years old')],
    hints: ['Text + number crashes. str(age) turns it into text.', 'name + " is " + str(age) + " years old"'],
  },

  // Arena 4 · Abacus City · MATH
  'pizza-party': {
    id: 'pizza-party', title: 'The Pizza Party', inputNames: ['pizzas', 'eaten'],
    prompt: 'Every pizza has 8 slices. *Store the slices left* in left: all the slices, minus the ones eaten.',
    starter: 'pizzas = int(input())\neaten = int(input())\n\nleft = 0  # change this\nprint(left)',
    solution: 'pizzas = int(input())\neaten = int(input())\n\nleft = pizzas * 8 - eaten\nprint(left)',
    tests: [t(['2', '5'], '11'), t(['1', '8'], '0'), t(['3', '10'], '14'), t(['4', '1'], '31'), t(['5', '0'], '40')],
    hints: ['All the slices: pizzas * 8.', 'left = pizzas * 8 - eaten'],
  },
  'taxi-fare': {
    id: 'taxi-fare', title: 'The Taxi Fare', inputNames: ['base', 'distance', 'rate'],
    prompt: 'Start with base, then *add distance multiplied by rate*. Store the full cost in fare.',
    starter: 'base = int(input())\ndistance = int(input())\nrate = int(input())\n\nfare = 0  # change this\nprint(fare)',
    solution: 'base = int(input())\ndistance = int(input())\nrate = int(input())\n\nfare = base + distance * rate\nprint(fare)',
    tests: [t(['4', '10', '2'], '24'), t(['5', '8', '3'], '29'), t(['3', '12', '2'], '27'), t(['10', '5', '4'], '30'), t(['7', '0', '9'], '7')],
    hints: ['Python multiplies before adding.', 'fare = base + distance * rate'],
  },
  'clock-tower': {
    id: 'clock-tower', title: 'The Clock Tower', inputNames: ['hours', 'minutes'],
    prompt: 'Hours arrive, then minutes. *Print the total in minutes*: {2} hours and {5} minutes gives [125].',
    starter: 'hours = int(input())\nminutes = int(input())\n\ntotal = 0  # change this\nprint(total)',
    solution: 'hours = int(input())\nminutes = int(input())\n\ntotal = hours * 60 + minutes\nprint(total)',
    tests: [t(['2', '5'], '125'), t(['1', '1'], '61'), t(['6', '0'], '360'), t(['0', '59'], '59'), t(['3', '5'], '185')],
    hints: ['An hour has 60 minutes.', 'total = hours * 60 + minutes'],
  },

  // Arena 5 · Veritas Peak · LOGIC
  'pass-check': {
    id: 'pass-check', title: 'The Pass Check', inputNames: ['score'],
    prompt: 'A score arrives. *Print the comparison* that answers: is the score {50 or more}? Print [True] or [False], not if/else.',
    starter: 'score = int(input())\n# Print a comparison.\n',
    solution: 'score = int(input())\nprint(score >= 50)',
    tests: [t('80', 'True'), t('50', 'True'), t('49', 'False'), t('0', 'False'), t('100', 'True')],
    hints: ['print() can show a comparison directly.', '50 itself passes: use >=.'],
  },
  'same-code': {
    id: 'same-code', title: 'The Twin Codes', inputNames: ['a', 'b'],
    prompt: 'Two secret codes arrive as text. *Print whether they are exactly the same*: [True] or [False].',
    starter: 'a = input()\nb = input()\n',
    solution: 'a = input()\nb = input()\nprint(a == b)',
    tests: [t(['4729', '4729'], 'True'), t(['4729', '4728'], 'False'), t(['cat', 'Cat'], 'False'), t(['LED', 'LED'], 'True'), t(['on', 'off'], 'False')],
    hints: ['== asks if two values are equal.', 'Capitals matter: cat is not Cat.'],
  },
  'perfect-ten': {
    id: 'perfect-ten', title: 'The Perfect Ten', inputNames: ['a', 'b'],
    prompt: 'Two numbers arrive. *Print whether they add up to exactly 10*: [True] or [False].',
    starter: 'a = int(input())\nb = int(input())\n',
    solution: 'a = int(input())\nb = int(input())\nprint(a + b == 10)',
    tests: [t(['4', '6'], 'True'), t(['5', '6'], 'False'), t(['10', '0'], 'True'), t(['9', '2'], 'False'), t(['7', '3'], 'True')],
    hints: ['Add first, then compare with ==.', 'print(a + b == 10)'],
  },

  // Arena 6 · Branchwood · BRANCH
  'coin-muncher': {
    id: 'coin-muncher', title: 'The Coin Muncher', inputNames: ['coins', 'price'],
    prompt: 'Your coins arrive, then the price. {Enough coins to pay}: print [Play!]. {Otherwise}: print [Not enough coins]. *Write the whole if/else.*',
    starter: 'coins = int(input())\nprice = int(input())\n\n',
    solution: 'coins = int(input())\nprice = int(input())\nif coins >= price:\n    print("Play!")\nelse:\n    print("Not enough coins")',
    tests: [t(['10', '4'], 'Play!'), t(['2', '3'], 'Not enough coins'), t(['3', '3'], 'Play!'), t(['5', '6'], 'Not enough coins'), t(['7', '7'], 'Play!')],
    hints: ['Compare two variables: coins >= price.', 'Exactly the price is enough.'],
  },
  'speed-wraith': {
    id: 'speed-wraith', title: 'The Speed Wraith', inputNames: ['speed'],
    prompt: '{More than 50}: print [Too fast!]. {Less than 20}: print [Too slow]. {Everything else}: print [Good speed]. *Use an if/else inside else.*',
    starter: 'speed = int(input())\n\n',
    solution: 'speed = int(input())\nif speed > 50:\n    print("Too fast!")\nelse:\n    if speed < 20:\n        print("Too slow")\n    else:\n        print("Good speed")',
    tests: [t('51', 'Too fast!'), t('50', 'Good speed'), t('35', 'Good speed'), t('20', 'Good speed'), t('19', 'Too slow')],
    hints: ['Three answers need two questions.', 'The inner if is indented 4 spaces, its prints 8.'],
  },
  'medal-dragon': {
    id: 'medal-dragon', title: 'The Medal Ceremony', inputNames: ['points'],
    prompt: '{100 points or more}: [Gold]. {50 or more}: [Silver]. {Anything else}: [Bronze]. *Use an if/else inside else.*',
    starter: 'points = int(input())\n\n',
    solution: 'points = int(input())\nif points >= 100:\n    print("Gold")\nelse:\n    if points >= 50:\n        print("Silver")\n    else:\n        print("Bronze")',
    tests: [t('120', 'Gold'), t('100', 'Gold'), t('99', 'Silver'), t('50', 'Silver'), t('49', 'Bronze')],
    hints: ['Ask about Gold first.', 'The inner else catches everything below 50.'],
  },

  // Dr. Segfault · bugged programs to repair
  'broken-greeter': {
    id: 'broken-greeter', title: 'The Broken Greeter', inputNames: ['name'],
    prompt: 'Dr. Segfault planted a bug! The greeter should print [Hi Bia] for {Bia}. *Find the bug and fix it.*',
    starter: 'name = input()\nprint("Hi " + Name)',
    solution: 'name = input()\nprint("Hi " + name)',
    tests: [t('Bia', 'Hi Bia'), t('Theo', 'Hi Theo'), t('Leo', 'Hi Leo'), t('Kai', 'Hi Kai'), t('Brian', 'Hi Brian')],
    hints: ['Python cares about capital letters.', 'The variable is name, not Name.'],
  },
  'broken-counter': {
    id: 'broken-counter', title: 'The Broken Counter', inputNames: ['coins'],
    prompt: 'The counter should *add 5 coins* and print the total: {7} gives [12]. A sneaky bug crashes it. *Fix it.*',
    starter: 'coins = int(input())\ncoins = coins + "5"\nprint(coins)',
    solution: 'coins = int(input())\ncoins = coins + 5\nprint(coins)',
    tests: [t('7', '12'), t('0', '5'), t('10', '15'), t('-5', '0'), t('95', '100')],
    hints: ['"5" with quotes is text.', 'Numbers add to numbers: coins + 5'],
  },
  'broken-gate': {
    id: 'broken-gate', title: 'The Broken Gate', inputNames: ['age'],
    prompt: 'The Academy gate: {13 or more}: [Welcome]. {Younger}: [Too young]. Dr. Segfault broke it in *three places*. *Fix them all.*',
    starter: 'age = int(input())\nif age = 13\n    print("Welcome")\nelse:\nprint("Too young")',
    solution: 'age = int(input())\nif age >= 13:\n    print("Welcome")\nelse:\n    print("Too young")',
    tests: [t('13', 'Welcome'), t('12', 'Too young'), t('20', 'Welcome'), t('5', 'Too young'), t('14', 'Welcome')],
    hints: ['13 or more means >=.', 'if lines end with a colon.', 'Lines inside else need 4 spaces.'],
  },

  // The secret basement · Arduinix
  'blink': {
    id: 'blink', title: 'Blink the LED', scoring: 'lines', inputNames: [],
    prompt: 'Arduinix speaks in blinks. *Print six lines*, alternating: [LED ON], [LED OFF], [LED ON], [LED OFF], [LED ON], [LED OFF].',
    starter: '# Blink three times.\n',
    solution: 'print("LED ON")\nprint("LED OFF")\nprint("LED ON")\nprint("LED OFF")\nprint("LED ON")\nprint("LED OFF")',
    tests: [t([], 'LED ON\nLED OFF\nLED ON\nLED OFF\nLED ON\nLED OFF')],
    hints: ['One print() per line.', 'Start with print("LED ON").'],
  },

  // The Grand Hackathon · Leo Maker
  'password-hydra': {
    id: 'password-hydra', title: 'The Password Door', inputNames: ['password'],
    prompt: 'The password is {maker}. Print [Access granted] only for {exactly maker}. {Anything else}: print [Access denied]. *Write the whole if/else.*',
    starter: 'password = input()\n\n',
    solution: 'password = input()\nif password == "maker":\n    print("Access granted")\nelse:\n    print("Access denied")',
    tests: [t('maker', 'Access granted'), t('cat', 'Access denied'), t('Maker', 'Access denied'), t('maker1', 'Access denied'), t('MAKER', 'Access denied')],
    hints: ['The password is text: no int().', 'Capitals matter: Maker is not maker.'],
  },
  'discount': {
    id: 'discount', title: 'The Maker Store', inputNames: ['total'],
    prompt: '{Orders of 50 or more} get 10 off. *Print the price to pay.* A total of 60 prints [50]. A total of 30 prints [30].',
    starter: 'total = int(input())\n\n',
    solution: 'total = int(input())\nif total >= 50:\n    print(total - 10)\nelse:\n    print(total)',
    tests: [t('60', '50'), t('30', '30'), t('50', '40'), t('49', '49'), t('51', '41')],
    hints: ['A branch can print a calculation.', '50 itself gets the discount.'],
  },
  'grade-judge': {
    id: 'grade-judge', title: 'The Grade Judge', inputNames: ['grade'],
    prompt: '{9 or more}: [Excellent]. {7 or more}: [Approved]. {5 or more}: [Recovery]. {Below 5}: [Failed]. Grades can have decimals. *Use if/else inside else, three times.*',
    starter: 'grade = float(input())\n\n',
    solution: 'grade = float(input())\nif grade >= 9:\n    print("Excellent")\nelse:\n    if grade >= 7:\n        print("Approved")\n    else:\n        if grade >= 5:\n            print("Recovery")\n        else:\n            print("Failed")',
    tests: [t('9', 'Excellent'), t('8.9', 'Approved'), t('7', 'Approved'), t('5', 'Recovery'), t('4.9', 'Failed')],
    hints: ['Four answers need three questions. Start at the top grade.', 'Each new question goes inside the else above it.'],
  },
  'celsius': {
    id: 'celsius', title: 'The Weather Station', inputNames: ['celsius'],
    prompt: 'Convert celsius to fahrenheit: *multiply by 9, divide by 5, then add 32*. {20} gives [68.0].',
    starter: 'celsius = int(input())\n\nfahrenheit = 0  # change this\nprint(fahrenheit)',
    solution: 'celsius = int(input())\n\nfahrenheit = celsius * 9 / 5 + 32\nprint(fahrenheit)',
    tests: [t('20', '68.0'), t('0', '32.0'), t('30', '86.0'), t('-10', '14.0'), t('100', '212.0')],
    hints: ['Follow the recipe in order.', 'celsius * 9 / 5 + 32'],
  },
}

export type PromptPart = { kind: 'text' | 'say' | 'rule' | 'task'; text: string }

/** Splits a prompt into plain text, [messages], {rules} and *the task*. */
export function promptParts(prompt: string): PromptPart[] {
  const kinds = { '[': 'say', '{': 'rule', '*': 'task' } as const
  return prompt.split(/(\[[^\]]+\]|\{[^}]+\}|\*[^*]+\*)/).filter(Boolean).map((piece) => {
    const kind = kinds[piece[0] as keyof typeof kinds]
    return kind ? { kind, text: piece.slice(1, -1) } : { kind: 'text', text: piece }
  })
}

/** Capitals, extra spaces and punctuation do not count: what matters is the right message. */
function looseText(text: string): string {
  return text.split('\n').map((line) => line.toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ').trim()).join('\n')
}

export function outputMatches(actual: string, expected: string): boolean {
  if (actual === expected) return true
  const b = Number(expected)
  if (expected.trim() !== '' && !expected.includes('\n') && Number.isFinite(b)) {
    const a = Number(actual)
    return actual.trim() !== '' && !actual.includes('\n') && Number.isFinite(a) && Math.abs(a - b) < 1e-9
  }
  return looseText(actual) === looseText(expected)
}

/** Removes text that input("...") prompts printed before the answer. */
export function cleanOutput(code: string, stdout: string): string {
  let output = stdout
  for (const match of code.matchAll(/input\(\s*(["'])(.*?)\1\s*\)/g)) {
    if (match[2] && output.includes(match[2])) output = output.replace(match[2], '')
  }
  return output.split('\n').map((line) => line.trimEnd()).join('\n').trim()
}

/** Shields broken by one run: tests passed, or matching lines for line-scored duels. */
export function shieldsFor(duel: CodeDuel): number {
  return duel.scoring === 'lines' ? duel.tests[0].expected.split('\n').length : duel.tests.length
}

export function lineHits(actual: string, expected: string): number {
  const got = actual.split('\n')
  return expected.split('\n').filter((line, index) => got[index] !== undefined && outputMatches(got[index], line)).length
}
