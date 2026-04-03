"""PokePy: Aurora Archipelago - Programmatic Pixel Art Sprites"""

import pygame
from src.settings import *

# Pixel art encoded as strings: each char maps to a color via palette
# '.' = transparent, letters = palette colors

def _build_surface(pixel_data, palette, scale=2):
    """Build a pygame Surface from pixel art string data."""
    h = len(pixel_data)
    w = len(pixel_data[0]) if h > 0 else 0
    surf = pygame.Surface((w * scale, h * scale), pygame.SRCALPHA)
    for y, row in enumerate(pixel_data):
        for x, ch in enumerate(row):
            if ch == '.' or ch not in palette:
                continue
            color = palette[ch]
            pygame.draw.rect(surf, color, (x * scale, y * scale, scale, scale))
    return surf


# ─── PALETTES ────────────────────────────────────────────

PLAYER_PALETTE = {
    'H': HAIR_BROWN,
    'S': SKIN_LIGHT,
    's': SKIN_DARK,
    'G': SHIRT_GREEN,
    'g': (40, 130, 60),
    'B': PANTS_BLUE,
    'b': (40, 60, 110),
    'K': SHOE_DARK,
    'E': (30, 30, 30),  # eyes
    'W': WHITE,
}

BYTE_PALETTE = {
    'B': BYTE_BODY,
    'b': BYTE_DARK,
    'S': BYTE_SCREEN,
    's': (40, 180, 120),
    'E': (20, 20, 30),
    'W': WHITE,
    'A': (80, 170, 200),
    'D': (50, 120, 140),
}

SPARKY_PALETTE = {
    'Y': SPARKY_YELLOW,
    'y': (220, 190, 40),
    'O': SPARKY_ORANGE,
    'E': (30, 30, 30),
    'W': WHITE,
    'R': (200, 60, 40),
    'B': (60, 60, 60),
    'T': (255, 240, 100),
}

SPARKY_EVO_PALETTE = {
    'Y': (255, 230, 80),
    'y': (230, 200, 50),
    'O': (255, 180, 50),
    'o': (230, 140, 30),
    'E': (30, 30, 30),
    'W': WHITE,
    'R': (220, 70, 50),
    'B': (50, 50, 50),
    'T': (255, 250, 120),
    'L': (255, 200, 60),
}

LEAFLET_PALETTE = {
    'G': LEAFLET_GREEN,
    'g': LEAFLET_DARK,
    'L': LIGHT_GREEN,
    'l': (100, 160, 80),
    'E': (30, 30, 30),
    'W': WHITE,
    'B': WOOD_BROWN,
    'b': DARK_BROWN,
    'P': PINK,
    'R': (180, 60, 60),
}

LEAFLET_EVO_PALETTE = {
    'G': (60, 200, 60),
    'g': (30, 140, 30),
    'L': (130, 220, 110),
    'l': (90, 170, 70),
    'E': (30, 30, 30),
    'W': WHITE,
    'B': WOOD_BROWN,
    'b': DARK_BROWN,
    'P': (240, 140, 180),
    'R': (200, 50, 50),
    'F': (255, 200, 60),
}

BUG_PALETTE = {
    'P': BUG_PURPLE,
    'p': BUG_DARK,
    'R': BUG_RED,
    'r': (150, 30, 30),
    'E': (30, 30, 30),
    'W': WHITE,
    'Y': SOLAR_YELLOW,
    'G': (60, 200, 60),
}

NPC_PALETTE = {
    'H': (60, 40, 20),
    'S': SKIN_LIGHT,
    's': SKIN_DARK,
    'T': (80, 80, 180),  # shirt
    't': (60, 60, 140),
    'P': (80, 80, 80),  # pants
    'K': SHOE_DARK,
    'E': (30, 30, 30),
    'W': WHITE,
}

PROF_PALETTE = {
    'H': (180, 180, 190),  # gray hair
    'S': SKIN_LIGHT,
    's': SKIN_DARK,
    'C': WHITE,  # lab coat
    'c': (200, 200, 210),
    'T': (60, 120, 160),
    'K': (60, 50, 40),
    'E': (30, 30, 30),
    'W': WHITE,
    'G': (100, 100, 110),
}

GYM_LEADER_PALETTES = [
    {  # Gym 1 - Variables (energy/fire theme)
        'H': (200, 60, 30),
        'S': SKIN_LIGHT, 's': SKIN_DARK,
        'T': ENERGY_ORANGE, 't': (180, 110, 30),
        'P': (60, 50, 40), 'K': (40, 30, 20),
        'E': (30, 30, 30), 'W': WHITE,
        'A': SOLAR_YELLOW,
    },
    {  # Gym 2 - Strings (communication/blue theme)
        'H': (40, 40, 120),
        'S': SKIN_LIGHT, 's': SKIN_DARK,
        'T': (60, 100, 180), 't': (40, 70, 140),
        'P': (50, 50, 60), 'K': (30, 30, 40),
        'E': (30, 30, 30), 'W': WHITE,
        'A': LIGHT_BLUE,
    },
    {  # Gym 3 - Logic (green/nature theme)
        'H': (30, 80, 30),
        'S': SKIN_LIGHT, 's': SKIN_DARK,
        'T': (40, 140, 60), 't': (30, 100, 40),
        'P': (50, 60, 40), 'K': (30, 30, 20),
        'E': (30, 30, 30), 'W': WHITE,
        'A': LIGHT_GREEN,
    },
]


# ─── PLAYER SPRITES (16x16 pixel art) ───────────────────

PLAYER_DOWN = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSEEH...",
    "...SSSSSS...",
    "...sSSSSs...",
    "....SSSS....",
    "...GGGGGG...",
    "..GGGgGGGG..",
    "..GGGgGGGG..",
    "...GGGGGG...",
    "...BBBBBB...",
    "...BB..BB...",
    "...BB..BB...",
    "...KK..KK...",
]

PLAYER_UP = [
    "....HHHH....",
    "...HHHHHH...",
    "...HHHHHH...",
    "...HHHHHH...",
    "...sHHHHs...",
    "....SSSS....",
    "...GGGGGG...",
    "..GGGgGGGG..",
    "..GGGgGGGG..",
    "...GGGGGG...",
    "...BBBBBB...",
    "...BB..BB...",
    "...BB..BB...",
    "...KK..KK...",
]

PLAYER_LEFT = [
    "...HHHH.....",
    "..HHHHHH....",
    "..HESSHH....",
    "..SSSSSS....",
    "..sSSSSs....",
    "...SSSS.....",
    "..GGGGGG....",
    "..GGGgGG....",
    ".GGGgGGG....",
    "..GGGGGG....",
    "..BBBBBB....",
    "..BB..BB....",
    "..BB..BB....",
    "..KK..KK....",
]

PLAYER_RIGHT = [
    ".....HHHH...",
    "....HHHHHH..",
    "....HHSSHE..",
    "....SSSSSS..",
    "....sSSSSs..",
    ".....SSSS...",
    "....GGGGGG..",
    "....GGgGGG..",
    "....GGGgGGG.",
    "....GGGGGG..",
    "....BBBBBB..",
    "....BB..BB..",
    "....BB..BB..",
    "....KK..KK..",
]

PLAYER_WALK_DOWN = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSEEH...",
    "...SSSSSS...",
    "...sSSSSs...",
    "....SSSS....",
    "...GGGGGG...",
    "..GGGgGGGG..",
    "..GGGgGGGG..",
    "...GGGGGG...",
    "...BBBBBB...",
    "..BB....BB..",
    "..BB....BB..",
    "..KK....KK..",
]

# ─── BYTE SPRITE (12x12) ────────────────────────────────

BYTE_SPRITE = [
    "....BBBB....",
    "...BBBBBB...",
    "..BBBBBBBB..",
    "..BSSSSSSB..",
    "..BSsEESsB..",
    "..BSSSSSSB..",
    "..BSssssEB..",
    "..BBBBBBBB..",
    "...bAAAAb...",
    "...BABBAB...",
    "....ABBA....",
    "...DD..DD...",
]

BYTE_HAPPY = [
    "....BBBB....",
    "...BBBBBB...",
    "..BBBBBBBB..",
    "..BSSSSSSB..",
    "..BSsWWSsB..",
    "..BSSSSSSB..",
    "..BSSssSSB..",
    "..BBBBBBBB..",
    "...bAAAAb...",
    "...BABBAB...",
    "....ABBA....",
    "...DD..DD...",
]

BYTE_CONFUSED = [
    "....BBBB....",
    "...BBBBBB...",
    "..BBBBBBBB..",
    "..BSSSSSSB..",
    "..BSsEESsB..",
    "..BSSSSSSB..",
    "..BSSssSEB..",
    "..BBBBBBBB..",
    "...bAAAAb...",
    "...BABBAB...",
    "....ABBA....",
    "...DD..DD...",
]

# ─── PYMON SPRITES ───────────────────────────────────────

SPARKY_SPRITE = [
    "......TT....",
    ".....TYT....",
    "....TYYT....",
    "...TYYYT....",
    "...YYYYY....",
    "..YYWWYY....",
    "..YEYEYY....",
    "..YYYYYY....",
    "...YYYY.....",
    "..OOYOOY....",
    "..OOOOOO....",
    "...OOOO.....",
    "..BB..BB....",
]

SPARKY_EVO_SPRITE = [
    "..TT....TT..",
    "..TYT..TYT..",
    "...TYYYTY...",
    "..LYYYYYL...",
    "..YYYYYYY...",
    ".YYYWWYYYY..",
    ".YYEYEYYY...",
    ".YYYYYYYYY..",
    "..YYYYYYY...",
    ".oOOYOOYO...",
    ".oOOOOOOO...",
    "..oOOOOO....",
    "..BB..BB....",
    "..BB..BB....",
]

LEAFLET_SPRITE = [
    "....LLL.....",
    "...LLLLL....",
    "..LLgLLLL...",
    "...GGGGG....",
    "..GGWWGG....",
    "..GEGEGGG...",
    "..GGGGGGG...",
    "...GGGGG....",
    "...BgggB....",
    "....BBB.....",
    "...bb.bb....",
]

LEAFLET_EVO_SPRITE = [
    "..FFPFF.....",
    "..LLLLL.....",
    ".LLLlLLLL...",
    ".LLLgLLLL...",
    "..GGGGGGG...",
    ".GGGWWGGG...",
    ".GGEGEGGG...",
    ".GGGGGGGGG..",
    "..GGGGGGG...",
    "..GgggggG...",
    "...BBBBB....",
    "..bb...bb...",
    "..bb...bb...",
]

BUG_SPRITE = [
    "..YY....YY..",
    "..PP....PP..",
    ".PPPPPPPP...",
    ".PRWWWWRP...",
    ".PPEPEPPP...",
    ".PPPPPPPP...",
    "..PPPPPP....",
    "..pRppRp....",
    "..pppppp....",
    "...pppp.....",
    "..pp..pp....",
]

# ─── NPC SPRITES ─────────────────────────────────────────

NPC_DOWN = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSEEH...",
    "...SSSSSS...",
    "...sSSSSs...",
    "....SSSS....",
    "...TTTTTT...",
    "..TTTtTTTT..",
    "..TTTtTTTT..",
    "...TTTTTT...",
    "...PPPPPP...",
    "...PP..PP...",
    "...KK..KK...",
]

PROF_SPRITE = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSEEH...",
    "...SSSSSS...",
    "...sSSSSs...",
    "....SSSS....",
    "...CCCCCC...",
    "..CCCcCCCC..",
    "..CTTcTTCC..",
    "...CCCCCC...",
    "...GGGGGG...",
    "...GG..GG...",
    "...KK..KK...",
]

GYM_LEADER_SPRITE = [
    "....HHHH....",
    "...HHHHHH...",
    "..HHSSEEHH..",
    "...SSSSSS...",
    "..AsSSSSsA..",
    "....SSSS....",
    "...TTTTTT...",
    "..TTTtTTTT..",
    "..TTTtTTTT..",
    "...TTTTTT...",
    "...PPPPPP...",
    "...PP..PP...",
    "...KK..KK...",
]


# ─── TILE SPRITES ────────────────────────────────────────

def make_ground_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(GRASS_GREEN)
    # subtle texture
    for i in range(4):
        x = (i * 11 + 3) % TILE_SIZE
        y = (i * 7 + 5) % TILE_SIZE
        pygame.draw.rect(s, LIGHT_GREEN, (x, y, 2, 2))
    return s

def make_tall_grass_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(TALL_GRASS)
    for i in range(6):
        x = (i * 7 + 2) % (TILE_SIZE - 4)
        y = (i * 5 + 1) % (TILE_SIZE - 8)
        pygame.draw.line(s, DARK_GREEN, (x + 2, y + 8), (x, y), 2)
        pygame.draw.line(s, LEAF_GREEN, (x + 4, y + 8), (x + 6, y + 1), 2)
    return s

def make_path_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(PATH_COLOR)
    for i in range(3):
        x = (i * 13 + 5) % TILE_SIZE
        y = (i * 9 + 7) % TILE_SIZE
        pygame.draw.rect(s, SAND, (x, y, 3, 2))
    return s

def make_water_tile(frame=0):
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(WATER_BLUE)
    off = frame * 4
    for i in range(3):
        x = ((i * 12 + off) % TILE_SIZE)
        y = (i * 10 + 5) % TILE_SIZE
        pygame.draw.arc(s, LIGHT_BLUE, (x - 4, y, 12, 6), 0, 3.14, 2)
    return s

def make_tree_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(GRASS_GREEN)
    # trunk
    pygame.draw.rect(s, WOOD_BROWN, (13, 20, 6, 12))
    # canopy
    pygame.draw.circle(s, DARK_GREEN, (16, 14), 12)
    pygame.draw.circle(s, LEAF_GREEN, (14, 12), 8)
    pygame.draw.circle(s, LIGHT_GREEN, (12, 10), 4)
    return s

def make_wall_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(SAND)
    # brick pattern
    for row in range(4):
        y = row * 8
        offset = 8 if row % 2 else 0
        for col in range(-1, 5):
            x = col * 16 + offset
            pygame.draw.rect(s, (180, 160, 120), (x, y, 15, 7))
            pygame.draw.rect(s, DARK_BROWN, (x, y, 15, 7), 1)
    return s

def make_door_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(SAND)
    pygame.draw.rect(s, WOOD_BROWN, (6, 2, 20, 28))
    pygame.draw.rect(s, DARK_BROWN, (6, 2, 20, 28), 2)
    pygame.draw.circle(s, SOLAR_YELLOW, (22, 16), 3)
    # welcome mat
    pygame.draw.rect(s, CORAL, (4, 28, 24, 4))
    return s

def make_roof_tile(color=ROOF_RED):
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(color)
    for i in range(4):
        y = i * 8
        pygame.draw.line(s, (min(color[0]+30, 255), min(color[1]+20, 255), min(color[2]+20, 255)),
                        (0, y), (TILE_SIZE, y), 1)
    pygame.draw.rect(s, DARK_BROWN, (0, 0, TILE_SIZE, TILE_SIZE), 1)
    return s

def make_flower_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(GRASS_GREEN)
    flowers = [(6, 8, SOLAR_YELLOW), (20, 6, PINK), (12, 22, CORAL),
               (26, 18, LIGHT_BLUE), (8, 28, SOLAR_YELLOW)]
    for fx, fy, fc in flowers:
        pygame.draw.circle(s, fc, (fx, fy), 3)
        pygame.draw.circle(s, WHITE, (fx, fy), 1)
    return s

def make_fence_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(GRASS_GREEN)
    pygame.draw.rect(s, SAND, (0, 10, TILE_SIZE, 4))
    pygame.draw.rect(s, SAND, (0, 20, TILE_SIZE, 4))
    for x in [4, 16, 28]:
        pygame.draw.rect(s, WOOD_BROWN, (x, 6, 4, 22))
    return s

def make_sign_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(GRASS_GREEN)
    pygame.draw.rect(s, WOOD_BROWN, (14, 16, 4, 14))
    pygame.draw.rect(s, SAND, (4, 6, 24, 14))
    pygame.draw.rect(s, DARK_BROWN, (4, 6, 24, 14), 2)
    # text lines
    pygame.draw.line(s, DARK_BROWN, (8, 11), (24, 11), 1)
    pygame.draw.line(s, DARK_BROWN, (8, 15), (20, 15), 1)
    return s

def make_fountain_tile():
    s = pygame.Surface((TILE_SIZE, TILE_SIZE))
    s.fill(PATH_COLOR)
    pygame.draw.circle(s, (80, 80, 90), (16, 16), 14)
    pygame.draw.circle(s, WATER_BLUE, (16, 16), 11)
    pygame.draw.circle(s, LIGHT_BLUE, (16, 14), 4)
    pygame.draw.circle(s, (80, 80, 90), (16, 16), 5, 2)
    return s


# ─── GYM BADGE SPRITES ──────────────────────────────────

def make_badge(index):
    """Create a badge sprite for gym index 0-2."""
    s = pygame.Surface((24, 24), pygame.SRCALPHA)
    colors = [
        (ENERGY_ORANGE, SOLAR_YELLOW),
        (WATER_BLUE, LIGHT_BLUE),
        (LEAF_GREEN, LIGHT_GREEN),
    ]
    c1, c2 = colors[index % 3]
    pygame.draw.polygon(s, c1, [(12, 0), (24, 8), (20, 22), (4, 22), (0, 8)])
    pygame.draw.polygon(s, c2, [(12, 4), (20, 10), (17, 19), (7, 19), (4, 10)])
    pygame.draw.circle(s, WHITE, (12, 13), 3)
    return s


# ─── SPRITE CACHE ────────────────────────────────────────

class SpriteCache:
    """Generates and caches all game sprites."""

    def __init__(self):
        self._cache = {}
        self._build_tiles()
        self._build_characters()
        self._build_pymons()
        self._build_enemies()
        self._build_ui()

    def _build_tiles(self):
        self._cache['tile_ground'] = make_ground_tile()
        self._cache['tile_tall_grass'] = make_tall_grass_tile()
        self._cache['tile_path'] = make_path_tile()
        self._cache['tile_water_0'] = make_water_tile(0)
        self._cache['tile_water_1'] = make_water_tile(1)
        self._cache['tile_water_2'] = make_water_tile(2)
        self._cache['tile_tree'] = make_tree_tile()
        self._cache['tile_wall'] = make_wall_tile()
        self._cache['tile_door'] = make_door_tile()
        self._cache['tile_roof'] = make_roof_tile(ROOF_RED)
        self._cache['tile_roof_orange'] = make_roof_tile(ROOF_ORANGE)
        self._cache['tile_flower'] = make_flower_tile()
        self._cache['tile_fence'] = make_fence_tile()
        self._cache['tile_sign'] = make_sign_tile()
        self._cache['tile_fountain'] = make_fountain_tile()

    def _build_characters(self):
        self._cache['player_down'] = _build_surface(PLAYER_DOWN, PLAYER_PALETTE)
        self._cache['player_up'] = _build_surface(PLAYER_UP, PLAYER_PALETTE)
        self._cache['player_left'] = _build_surface(PLAYER_LEFT, PLAYER_PALETTE)
        self._cache['player_right'] = _build_surface(PLAYER_RIGHT, PLAYER_PALETTE)
        self._cache['player_walk_down'] = _build_surface(PLAYER_WALK_DOWN, PLAYER_PALETTE)

        self._cache['byte_normal'] = _build_surface(BYTE_SPRITE, BYTE_PALETTE)
        self._cache['byte_happy'] = _build_surface(BYTE_HAPPY, BYTE_PALETTE)
        self._cache['byte_confused'] = _build_surface(BYTE_CONFUSED, BYTE_PALETTE)

        self._cache['npc_generic'] = _build_surface(NPC_DOWN, NPC_PALETTE)
        self._cache['professor'] = _build_surface(PROF_SPRITE, PROF_PALETTE)

        for i, palette in enumerate(GYM_LEADER_PALETTES):
            self._cache[f'gym_leader_{i}'] = _build_surface(GYM_LEADER_SPRITE, palette)

    def _build_pymons(self):
        self._cache['sparky'] = _build_surface(SPARKY_SPRITE, SPARKY_PALETTE, 3)
        self._cache['sparky_evo'] = _build_surface(SPARKY_EVO_SPRITE, SPARKY_EVO_PALETTE, 3)
        self._cache['leaflet'] = _build_surface(LEAFLET_SPRITE, LEAFLET_PALETTE, 3)
        self._cache['leaflet_evo'] = _build_surface(LEAFLET_EVO_SPRITE, LEAFLET_EVO_PALETTE, 3)

        # Small versions for overworld (following player)
        self._cache['sparky_small'] = _build_surface(SPARKY_SPRITE, SPARKY_PALETTE, 2)
        self._cache['leaflet_small'] = _build_surface(LEAFLET_SPRITE, LEAFLET_PALETTE, 2)
        self._cache['sparky_evo_small'] = _build_surface(SPARKY_EVO_SPRITE, SPARKY_EVO_PALETTE, 2)
        self._cache['leaflet_evo_small'] = _build_surface(LEAFLET_EVO_SPRITE, LEAFLET_EVO_PALETTE, 2)

    def _build_enemies(self):
        self._cache['syntax_bug'] = _build_surface(BUG_SPRITE, BUG_PALETTE, 3)

    def _build_ui(self):
        self._cache['badge_0'] = make_badge(0)
        self._cache['badge_1'] = make_badge(1)
        self._cache['badge_2'] = make_badge(2)

    def get(self, name):
        return self._cache.get(name)

    def get_tile(self, tile_type, frame=0):
        mapping = {
            TILE_GROUND: 'tile_ground',
            TILE_TALL_GRASS: 'tile_tall_grass',
            TILE_PATH: 'tile_path',
            TILE_WATER: f'tile_water_{frame % 3}',
            TILE_TREE: 'tile_tree',
            TILE_WALL: 'tile_wall',
            TILE_DOOR: 'tile_door',
            TILE_ROOF: 'tile_roof',
            TILE_FLOWER: 'tile_flower',
            TILE_FENCE: 'tile_fence',
            TILE_SIGN: 'tile_sign',
            TILE_FOUNTAIN: 'tile_fountain',
        }
        key = mapping.get(tile_type, 'tile_ground')
        return self._cache.get(key, self._cache['tile_ground'])

    def get_player(self, direction, walking=False, frame=0):
        if walking and direction == DIR_DOWN and frame % 2 == 1:
            return self._cache['player_walk_down']
        dir_names = {DIR_DOWN: 'down', DIR_UP: 'up', DIR_LEFT: 'left', DIR_RIGHT: 'right'}
        return self._cache[f'player_{dir_names[direction]}']

    def get_pymon(self, name, evolved=False, small=False):
        key = name
        if evolved:
            key += '_evo'
        if small:
            key += '_small'
        return self._cache.get(key)
