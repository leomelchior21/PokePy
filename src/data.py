"""PokePy: Aurora Archipelago - Game Data (PyMons, Challenges, Map, Dialogue)"""

from src.settings import *

# ─── PYMON DEFINITIONS ───────────────────────────────────

PYMON_DATA = {
    'sparky': {
        'name': 'Sparky',
        'type': 'electric',
        'base_hp': 30,
        'base_energy': 20,
        'base_attack': 8,
        'base_defense': 5,
        'description': 'A small electric creature that crackles with energy.',
        'evolution': 'sparky_evo',
        'evo_name': 'Voltflare',
        'sprite_key': 'sparky',
    },
    'sparky_evo': {
        'name': 'Voltflare',
        'type': 'electric',
        'base_hp': 50,
        'base_energy': 35,
        'base_attack': 14,
        'base_defense': 9,
        'description': 'Sparky evolved! Its lightning bolts can power a whole city.',
        'evolution': None,
        'evo_name': None,
        'sprite_key': 'sparky_evo',
    },
    'leaflet': {
        'name': 'Leaflet',
        'type': 'nature',
        'base_hp': 35,
        'base_energy': 18,
        'base_attack': 6,
        'base_defense': 8,
        'description': 'A gentle plant creature that draws power from sunlight.',
        'evolution': 'leaflet_evo',
        'evo_name': 'Bloomthorn',
        'sprite_key': 'leaflet',
    },
    'leaflet_evo': {
        'name': 'Bloomthorn',
        'type': 'nature',
        'base_hp': 55,
        'base_energy': 30,
        'base_attack': 11,
        'base_defense': 13,
        'description': 'Leaflet evolved! Its thorns protect the forest.',
        'evolution': None,
        'evo_name': None,
        'sprite_key': 'leaflet_evo',
    },
}

# Wild PyMons that can be encountered in grass
WILD_PYMONS = ['sparky', 'leaflet']

# ─── BATTLE CHALLENGES (Syntax Bug encounters) ──────────

SYNTAX_CHALLENGES = {
    DIFF_EASY: [
        {
            'prompt': 'Fix the print statement!',
            'broken_code': 'prnt("Hello, World!")',
            'correct_code': 'print("Hello, World!")',
            'hint': 'Check the function name carefully.',
            'concept': 'print function',
        },
        {
            'prompt': 'Fix the missing parenthesis!',
            'broken_code': 'print("Welcome to PokePy"',
            'correct_code': 'print("Welcome to PokePy")',
            'hint': 'Every opening ( needs a closing ).',
            'concept': 'parentheses',
        },
        {
            'prompt': 'Fix the string!',
            'broken_code': 'print("Hello World)',
            'correct_code': 'print("Hello World")',
            'hint': 'Strings need matching quotes on both sides.',
            'concept': 'strings',
        },
        {
            'prompt': 'Fix the print statement!',
            'broken_code': 'Print("PokePy!")',
            'correct_code': 'print("PokePy!")',
            'hint': 'Python is case-sensitive. Functions are lowercase.',
            'concept': 'case sensitivity',
        },
        {
            'prompt': 'Fix this code!',
            'broken_code': 'primt("Catch them all!")',
            'correct_code': 'print("Catch them all!")',
            'hint': 'Look at the function name letter by letter.',
            'concept': 'spelling',
        },
    ],
    DIFF_MEDIUM: [
        {
            'prompt': 'Fix the variable assignment!',
            'broken_code': 'health = 100\nprint(helth)',
            'correct_code': 'health = 100\nprint(health)',
            'hint': 'Variable names must match exactly.',
            'concept': 'variables',
        },
        {
            'prompt': 'Fix the code to show the PyMon name!',
            'broken_code': 'name = "Sparky"\nprint("My PyMon is " + Name)',
            'correct_code': 'name = "Sparky"\nprint("My PyMon is " + name)',
            'hint': 'Python is case-sensitive for variable names too!',
            'concept': 'variables',
        },
        {
            'prompt': 'Fix the math!',
            'broken_code': 'hp = 50\ndamage = 10\nprint(hp - damge)',
            'correct_code': 'hp = 50\ndamage = 10\nprint(hp - damage)',
            'hint': 'Check each variable name for typos.',
            'concept': 'variables',
        },
        {
            'prompt': 'Fix the string concatenation!',
            'broken_code': 'move = "Thunder"\nprint("Used " + move + !)',
            'correct_code': 'move = "Thunder"\nprint("Used " + move + "!")',
            'hint': 'All text that isn\'t a variable needs quotes.',
            'concept': 'strings',
        },
    ],
    DIFF_HARD: [
        {
            'prompt': 'Fix all the errors!',
            'broken_code': 'pymon = "Sparky\nhp = 100\nprint(pymon + " has " + str(hp) + " HP"',
            'correct_code': 'pymon = "Sparky"\nhp = 100\nprint(pymon + " has " + str(hp) + " HP")',
            'hint': 'Check for missing quotes and parentheses.',
            'concept': 'multiple fixes',
        },
        {
            'prompt': 'Fix the type error!',
            'broken_code': 'level = 5\nprint("Level: " + level)',
            'correct_code': 'level = 5\nprint("Level: " + str(level))',
            'hint': 'You can\'t add a string and a number directly. Convert it!',
            'concept': 'type conversion',
        },
        {
            'prompt': 'Fix the calculation and print!',
            'broken_code': 'attack = 15\ndefense = 8\ndamage = attack - defense\nprint("Damage: " + damage)',
            'correct_code': 'attack = 15\ndefense = 8\ndamage = attack - defense\nprint("Damage: " + str(damage))',
            'hint': 'Remember: str() converts numbers to strings.',
            'concept': 'type conversion',
        },
    ],
}

# ─── GYM CHALLENGES ──────────────────────────────────────

GYM_DATA = [
    {
        'name': 'Variables Gym',
        'leader': 'Blaze',
        'theme': 'Energy Control',
        'description': 'Master the power of variables!',
        'xp_required': XP_GYM1_UNLOCK,
        'challenges': [
            {
                'prompt': 'Create a variable called "energy" and set it to 100.',
                'correct_code': 'energy = 100',
                'hint': 'Use the = sign to assign a value to a variable name.',
                'difficulty': DIFF_EASY,
                'check_type': 'exact',
            },
            {
                'prompt': 'Set "power" to 50, then print it.',
                'correct_code': 'power = 50\nprint(power)',
                'hint': 'First assign, then print the variable name.',
                'difficulty': DIFF_EASY,
                'check_type': 'output',
                'expected_output': '50',
            },
            {
                'prompt': 'Set hp to 100, damage to 25, then print hp - damage.',
                'correct_code': 'hp = 100\ndamage = 25\nprint(hp - damage)',
                'hint': 'Create both variables, then print the subtraction.',
                'difficulty': DIFF_MEDIUM,
                'check_type': 'output',
                'expected_output': '75',
            },
        ],
    },
    {
        'name': 'Strings Gym',
        'leader': 'Marina',
        'theme': 'Communication Systems',
        'description': 'Learn the art of string manipulation!',
        'xp_required': XP_GYM2_UNLOCK,
        'challenges': [
            {
                'prompt': 'Print the message: Hello, Aurora!',
                'correct_code': 'print("Hello, Aurora!")',
                'hint': 'Use print() with a string in quotes.',
                'difficulty': DIFF_EASY,
                'check_type': 'output',
                'expected_output': 'Hello, Aurora!',
            },
            {
                'prompt': 'Create name = "Marina" and print "Hello, " + name',
                'correct_code': 'name = "Marina"\nprint("Hello, " + name)',
                'hint': 'You can join strings together with the + sign.',
                'difficulty': DIFF_MEDIUM,
                'check_type': 'output',
                'expected_output': 'Hello, Marina',
            },
            {
                'prompt': 'Create a greeting that says "Welcome to [city]!" where city = "Solares"',
                'correct_code': 'city = "Solares"\nprint("Welcome to " + city + "!")',
                'hint': 'Build the string piece by piece with + signs.',
                'difficulty': DIFF_MEDIUM,
                'check_type': 'output',
                'expected_output': 'Welcome to Solares!',
            },
        ],
    },
    {
        'name': 'Logic Gym',
        'leader': 'Sage',
        'theme': 'Decision Systems',
        'description': 'Learn the basics of if statements!',
        'xp_required': XP_GYM3_UNLOCK,
        'challenges': [
            {
                'prompt': 'Check if hp > 0 and print "Still standing!"',
                'correct_code': 'hp = 50\nif hp > 0:\n    print("Still standing!")',
                'hint': 'Use if with a condition, colon, and indented print.',
                'difficulty': DIFF_MEDIUM,
                'check_type': 'output',
                'expected_output': 'Still standing!',
            },
            {
                'prompt': 'If level >= 5, print "Ready to evolve!" Otherwise print "Keep training!"',
                'correct_code': 'level = 5\nif level >= 5:\n    print("Ready to evolve!")\nelse:\n    print("Keep training!")',
                'hint': 'Use if/else with proper indentation.',
                'difficulty': DIFF_MEDIUM,
                'check_type': 'output',
                'expected_output': 'Ready to evolve!',
            },
            {
                'prompt': 'Set caught to True, then print "Got it!" if caught is True.',
                'correct_code': 'caught = True\nif caught:\n    print("Got it!")',
                'hint': 'Booleans can be used directly in if statements.',
                'difficulty': DIFF_HARD,
                'check_type': 'output',
                'expected_output': 'Got it!',
            },
        ],
    },
]

# ─── NPC DIALOGUE ────────────────────────────────────────

NPC_DIALOGUES = {
    'welcome_npc': [
        "Welcome to Solares, the capital of Aurora!",
        "Walk into the tall grass to find wild PyMons and Syntax Bugs.",
        "Be careful - bugs will challenge you to fix broken code!",
    ],
    'tip_npc': [
        "Tip: Use the Smart Code Completion bar to help you write code faster!",
        "Each suggestion can be clicked to insert it into your code.",
    ],
    'gym_hint_npc': [
        "There are 3 gyms in Solares.",
        "You need enough XP to challenge each one.",
        "Fight bugs and catch PyMons to earn XP!",
    ],
    'explorer_npc': [
        "I've been exploring the grass zones around town.",
        "I found a Sparky yesterday! They're full of energy.",
        "Leaflets are harder to find but very loyal.",
    ],
    'professor_intro': [
        "Welcome! I'm Professor Pine.",
        "Here in Aurora, we study creatures called PyMons.",
        "PyMons and coding are deeply connected.",
        "This is Byte - your coding companion!",
        "Byte will help you understand code as you write it.",
        "Now, choose your first PyMon partner!",
    ],
    'byte_intro': [
        "Beep boop! I'm Byte!",
        "I'll walk through your code line by line.",
        "When you write code, I'll show you what each line does!",
        "Let's go on an adventure!",
    ],
    'gym1_entrance': [
        "Welcome to the Variables Gym!",
        "I'm Blaze, the Gym Leader.",
        "Variables are like containers that store energy.",
        "Show me you can harness their power!",
    ],
    'gym2_entrance': [
        "This is the Strings Gym!",
        "I'm Marina. Communication is everything.",
        "Strings let us send messages and connect.",
        "Can you master the art of words?",
    ],
    'gym3_entrance': [
        "Welcome to the Logic Gym!",
        "I'm Sage. Logic guides all decisions.",
        "If statements are the foundation of thinking in code.",
        "Show me your reasoning!",
    ],
}

# ─── MAP LAYOUT (50x40) ─────────────────────────────────
# Generated programmatically to guarantee exact dimensions

def _generate_map():
    """Build the Solares map programmatically on a 50x40 grid."""
    W, H = 50, 40
    m = [[TILE_GROUND] * W for _ in range(H)]

    def fill_rect(x1, y1, x2, y2, t):
        for yy in range(max(0, y1), min(H, y2 + 1)):
            for xx in range(max(0, x1), min(W, x2 + 1)):
                m[yy][xx] = t

    def set_tile(x, y, t):
        if 0 <= x < W and 0 <= y < H:
            m[y][x] = t

    def hline(x1, x2, y, t):
        for xx in range(max(0, x1), min(W, x2 + 1)):
            m[y][xx] = t

    def vline(x, y1, y2, t):
        for yy in range(max(0, y1), min(H, y2 + 1)):
            m[yy][x] = t

    def building(x, y, w, t_roof, t_wall, t_door):
        """Place a building: roof row, wall rows, door row."""
        hline(x, x + w - 1, y, t_roof)       # roof
        hline(x, x + w - 1, y + 1, t_wall)   # wall
        hline(x, x + w - 1, y + 2, t_wall)   # wall
        door_x = x + w // 2
        set_tile(door_x, y + 2, t_door)       # door

    # ── Borders ──
    fill_rect(0, 0, W - 1, 0, TILE_TREE)       # top
    fill_rect(0, H - 1, W - 1, H - 1, TILE_TREE)  # bottom
    vline(0, 0, H - 1, TILE_TREE)              # left
    vline(W - 1, 0, H - 1, TILE_TREE)          # right

    # Scattered border trees
    for x in [14, 15, 28, 29]:
        for y in [1, 2, 3, 4]:
            set_tile(x, y, TILE_TREE)
    for x in [44, 45, 46, 47]:
        fill_rect(x, 5, x, 9, TILE_TREE)

    # ── Tall grass zones ──
    fill_rect(4, 1, 9, 4, TILE_TALL_GRASS)    # NW grass
    fill_rect(30, 1, 35, 4, TILE_TALL_GRASS)  # NE grass
    fill_rect(1, 11, 4, 14, TILE_TALL_GRASS)  # W grass
    fill_rect(6, 11, 9, 14, TILE_TALL_GRASS)  # W grass2
    fill_rect(34, 11, 37, 14, TILE_TALL_GRASS) # E grass
    fill_rect(39, 11, 42, 14, TILE_TALL_GRASS) # E grass2
    fill_rect(1, 21, 4, 24, TILE_TALL_GRASS)  # SW grass
    fill_rect(6, 21, 9, 24, TILE_TALL_GRASS)  # SW grass2
    fill_rect(34, 21, 37, 24, TILE_TALL_GRASS) # SE grass
    fill_rect(39, 21, 42, 24, TILE_TALL_GRASS) # SE grass2
    fill_rect(1, 32, 8, 35, TILE_TALL_GRASS)  # S grass
    fill_rect(30, 33, 33, 35, TILE_TALL_GRASS) # S grass2
    fill_rect(35, 33, 42, 35, TILE_TALL_GRASS) # S grass3

    # ── Main paths ──
    # East-west main road
    hline(3, 44, 19, TILE_PATH)
    # North-south paths
    vline(11, 5, 35, TILE_PATH)
    vline(22, 5, 30, TILE_PATH)
    vline(33, 5, 35, TILE_PATH)
    # Cross paths
    hline(11, 33, 5, TILE_PATH)
    hline(11, 33, 10, TILE_PATH)
    hline(11, 33, 24, TILE_PATH)

    # Town center area paths
    fill_rect(14, 12, 20, 12, TILE_PATH)
    fill_rect(24, 12, 30, 12, TILE_PATH)
    fill_rect(14, 15, 30, 15, TILE_PATH)
    vline(14, 12, 15, TILE_PATH)
    vline(30, 12, 15, TILE_PATH)

    # ── Fountain area ──
    set_tile(19, 13, TILE_FOUNTAIN)
    set_tile(25, 13, TILE_FOUNTAIN)
    # Flowers around fountain
    for fx, fy in [(16, 12), (18, 12), (26, 12), (28, 12),
                   (16, 15), (18, 15), (26, 15), (28, 15)]:
        set_tile(fx, fy, TILE_FLOWER)

    # ── Professor's Lab (west side) ──
    building(3, 16, 6, TILE_ROOF, TILE_WALL, TILE_DOOR)
    set_tile(3, 19, TILE_SIGN)   # lab sign

    # ── Gym 1: Variables Gym (west) ──
    building(3, 6, 6, TILE_ROOF, TILE_WALL, TILE_DOOR)
    set_tile(4, 9, TILE_SIGN)    # gym 1 sign

    # ── Gym 2: Strings Gym (east) ──
    building(36, 6, 6, TILE_ROOF, TILE_WALL, TILE_DOOR)
    set_tile(40, 9, TILE_SIGN)   # gym 2 sign

    # ── Gym 3: Logic Gym (south) ──
    building(17, 27, 6, TILE_ROOF, TILE_WALL, TILE_DOOR)
    set_tile(17, 30, TILE_SIGN)  # gym 3 sign

    # ── Water feature (southeast) ──
    fill_rect(40, 27, 43, 32, TILE_WATER)

    # ── Flowers ──
    for fx, fy in [(15, 36), (18, 36), (25, 36), (28, 36)]:
        set_tile(fx, fy, TILE_FLOWER)

    return m

MAP_LAYOUT = _generate_map()

# ─── NPC POSITIONS (tile_x, tile_y, npc_id, dialogue_key) ─

NPC_POSITIONS = [
    (16, 12, 'welcome', 'welcome_npc'),
    (24, 15, 'tip', 'tip_npc'),
    (12, 20, 'gym_hint', 'gym_hint_npc'),
    (30, 22, 'explorer', 'explorer_npc'),
]

# Professor is special - placed in front of lab door on path
PROFESSOR_POS = (6, 19)

# ─── GYM POSITIONS (tile_x, tile_y, gym_index) ──────────
# These correspond to the door tiles in the map

GYM_POSITIONS = [
    (6, 8, 0),    # Gym 1 - Variables (west, door at col 6, row 8)
    (39, 8, 1),   # Gym 2 - Strings (east, door at col 39, row 8)
    (20, 29, 2),  # Gym 3 - Logic (south, door at col 20, row 29)
]

# ─── SIGN TEXTS ──────────────────────────────────────────

SIGN_TEXTS = {
    (4, 9): "Variables Gym\nLeader: Blaze\n'Control your energy!'",
    (40, 9): "Strings Gym\nLeader: Marina\n'Connect through words!'",
    (17, 30): "Logic Gym\nLeader: Sage\n'Think before you act!'",
    (3, 19): "Professor Pine's Lab\n'Where every adventure begins!'",
}

# Player start position (near professor's lab)
PLAYER_START = (8, 19)

# Smart code completion suggestions per context
CODE_COMPLETIONS = {
    'default': ['print(', '= ', '"', "'", 'str(', '+', ')', '\n'],
    'battle': ['print(', '"', "'", ')', '(', 'str('],
    'variables': ['= ', 'print(', 'str(', '+', '-', '*', ')'],
    'strings': ['print(', '"', "'", '+ ', 'str(', ')'],
    'logic': ['if ', 'else:', 'True', 'False', '> ', '< ', '== ', '>= ', 'print(', ':', '\n    '],
}
