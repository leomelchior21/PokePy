"""PokePy: Aurora Archipelago - World, Player, NPCs, Camera"""

import pygame
import random
from src.settings import *
from src.data import MAP_LAYOUT, NPC_POSITIONS, GYM_POSITIONS, SIGN_TEXTS, PROFESSOR_POS


class Camera:
    """Camera that follows the player and handles world-to-screen transforms."""

    def __init__(self):
        self.x = 0
        self.y = 0

    def update(self, target_x, target_y):
        self.x = target_x - SCREEN_WIDTH // 2
        self.y = target_y - SCREEN_HEIGHT // 2
        # Clamp to map bounds
        max_x = MAP_COLS * TILE_SIZE - SCREEN_WIDTH
        max_y = MAP_ROWS * TILE_SIZE - SCREEN_HEIGHT
        self.x = max(0, min(self.x, max_x))
        self.y = max(0, min(self.y, max_y))

    def apply(self, world_x, world_y):
        return world_x - self.x, world_y - self.y


class TileMap:
    """Renders the tile-based map."""

    def __init__(self, sprites):
        self.sprites = sprites
        self.layout = MAP_LAYOUT
        self.water_frame = 0
        self.water_timer = 0

    def update(self):
        self.water_timer += 1
        if self.water_timer >= 30:
            self.water_timer = 0
            self.water_frame = (self.water_frame + 1) % 3

    def get_tile(self, tx, ty):
        if 0 <= ty < len(self.layout) and 0 <= tx < len(self.layout[ty]):
            return self.layout[ty][tx]
        return TILE_TREE

    def is_walkable(self, tx, ty):
        return self.get_tile(tx, ty) in WALKABLE

    def draw(self, surface, camera):
        # Only draw visible tiles
        start_col = max(0, int(camera.x // TILE_SIZE))
        end_col = min(MAP_COLS, int((camera.x + SCREEN_WIDTH) // TILE_SIZE) + 2)
        start_row = max(0, int(camera.y // TILE_SIZE))
        end_row = min(MAP_ROWS, int((camera.y + SCREEN_HEIGHT) // TILE_SIZE) + 2)

        for row in range(start_row, end_row):
            for col in range(start_col, end_col):
                tile_type = self.get_tile(col, row)
                sprite = self.sprites.get_tile(tile_type, self.water_frame)
                sx, sy = camera.apply(col * TILE_SIZE, row * TILE_SIZE)
                surface.blit(sprite, (sx, sy))


class Player:
    """Player entity with tile-based movement."""

    def __init__(self, start_x, start_y, sprites):
        self.tile_x = start_x
        self.tile_y = start_y
        self.pixel_x = float(start_x * TILE_SIZE)
        self.pixel_y = float(start_y * TILE_SIZE)
        self.target_x = self.pixel_x
        self.target_y = self.pixel_y
        self.direction = DIR_DOWN
        self.moving = False
        self.sprites = sprites
        self.walk_frame = 0
        self.walk_timer = 0
        self.speed = PLAYER_SPEED
        self.steps_in_grass = 0

    def try_move(self, dx, dy, tilemap):
        """Try to move by (dx, dy) tiles. Returns True if moved."""
        if self.moving:
            return False
        new_tx = self.tile_x + dx
        new_ty = self.tile_y + dy
        # Update direction regardless
        if dx < 0:
            self.direction = DIR_LEFT
        elif dx > 0:
            self.direction = DIR_RIGHT
        elif dy < 0:
            self.direction = DIR_UP
        elif dy > 0:
            self.direction = DIR_DOWN

        if tilemap.is_walkable(new_tx, new_ty):
            self.tile_x = new_tx
            self.tile_y = new_ty
            self.target_x = float(new_tx * TILE_SIZE)
            self.target_y = float(new_ty * TILE_SIZE)
            self.moving = True
            return True
        return False

    def update(self):
        if self.moving:
            dx = self.target_x - self.pixel_x
            dy = self.target_y - self.pixel_y
            dist = (dx * dx + dy * dy) ** 0.5
            if dist < self.speed:
                self.pixel_x = self.target_x
                self.pixel_y = self.target_y
                self.moving = False
                self.walk_frame = 0
            else:
                self.pixel_x += (dx / dist) * self.speed
                self.pixel_y += (dy / dist) * self.speed
                self.walk_timer += 1
                if self.walk_timer >= 8:
                    self.walk_timer = 0
                    self.walk_frame = (self.walk_frame + 1) % 2

    def draw(self, surface, camera):
        sprite = self.sprites.get_player(self.direction, self.moving, self.walk_frame)
        sx, sy = camera.apply(self.pixel_x, self.pixel_y)
        # Center sprite on tile
        offset_x = (TILE_SIZE - sprite.get_width()) // 2
        offset_y = TILE_SIZE - sprite.get_height()
        surface.blit(sprite, (sx + offset_x, sy + offset_y))

    def get_facing_tile(self):
        """Get the tile coordinates the player is facing."""
        dx = [0, 0, -1, 1][self.direction]
        dy = [1, -1, 0, 0][self.direction]
        return self.tile_x + dx, self.tile_y + dy


class NPC:
    """Non-player character."""

    def __init__(self, tile_x, tile_y, npc_id, dialogue_key, sprites, sprite_key='npc_generic'):
        self.tile_x = tile_x
        self.tile_y = tile_y
        self.npc_id = npc_id
        self.dialogue_key = dialogue_key
        self.sprite = sprites.get(sprite_key)
        self.direction = DIR_DOWN

    def draw(self, surface, camera):
        if self.sprite:
            sx, sy = camera.apply(self.tile_x * TILE_SIZE, self.tile_y * TILE_SIZE)
            offset_x = (TILE_SIZE - self.sprite.get_width()) // 2
            offset_y = TILE_SIZE - self.sprite.get_height()
            surface.blit(self.sprite, (sx + offset_x, sy + offset_y))


class PyMonFollower:
    """PyMon that follows the player in the overworld."""

    def __init__(self, sprites):
        self.sprites = sprites
        self.pixel_x = 0.0
        self.pixel_y = 0.0
        self.visible = False
        self.pymon_key = None
        self.evolved = False

    def set_pymon(self, key, evolved=False):
        self.pymon_key = key
        self.evolved = evolved
        self.visible = True

    def update(self, player_x, player_y):
        if not self.visible:
            return
        # Follow behind player with lerp
        target_x = player_x - TILE_SIZE
        target_y = player_y
        self.pixel_x += (target_x - self.pixel_x) * 0.1
        self.pixel_y += (target_y - self.pixel_y) * 0.1

    def draw(self, surface, camera):
        if not self.visible or not self.pymon_key:
            return
        sprite = self.sprites.get_pymon(self.pymon_key, self.evolved, small=True)
        if sprite:
            sx, sy = camera.apply(self.pixel_x, self.pixel_y)
            surface.blit(sprite, (sx + 4, sy + 4))


class ByteCompanion:
    """Byte - the coding companion that follows the player."""

    def __init__(self, sprites):
        self.sprites = sprites
        self.pixel_x = 0.0
        self.pixel_y = 0.0
        self.visible = True
        self.state = 'normal'  # normal, happy, confused
        self.bob_offset = 0
        self.bob_timer = 0

    def update(self, player_x, player_y):
        # Float beside the player
        target_x = player_x + TILE_SIZE
        target_y = player_y - 8
        self.pixel_x += (target_x - self.pixel_x) * 0.12
        self.pixel_y += (target_y - self.pixel_y) * 0.12
        # Bobbing animation
        self.bob_timer += 1
        import math
        self.bob_offset = math.sin(self.bob_timer * 0.08) * 3

    def draw(self, surface, camera):
        if not self.visible:
            return
        sprite = self.sprites.get(f'byte_{self.state}')
        if sprite:
            sx, sy = camera.apply(self.pixel_x, self.pixel_y + self.bob_offset)
            surface.blit(sprite, (sx, sy))


class World:
    """Manages the entire overworld: map, player, NPCs, encounters."""

    def __init__(self, sprites, player_data):
        self.sprites = sprites
        self.player_data = player_data
        self.camera = Camera()
        self.tilemap = TileMap(sprites)

        start = player_data.get('start_pos', (8, 19))
        self.player = Player(start[0], start[1], sprites)
        self.byte = ByteCompanion(sprites)
        self.follower = PyMonFollower(sprites)

        # Create NPCs
        self.npcs = []
        for tx, ty, npc_id, dlg_key in NPC_POSITIONS:
            self.npcs.append(NPC(tx, ty, npc_id, dlg_key, sprites))

        # Professor
        px, py = PROFESSOR_POS
        self.npcs.append(NPC(px, py, 'professor', 'professor_intro', sprites, 'professor'))

        # Gym leader NPCs (placed just below gym doors, on walkable ground)
        for tx, ty, gym_idx in GYM_POSITIONS:
            leader_key = f'gym_leader_{gym_idx}'
            # Place leader 1 tile south of door (on walkable tile)
            self.npcs.append(NPC(tx, ty + 1, f'gym_{gym_idx}', f'gym{gym_idx+1}_entrance',
                               sprites, leader_key))

        self.move_cooldown = 0

    def update(self):
        self.tilemap.update()
        self.player.update()
        self.byte.update(self.player.pixel_x, self.player.pixel_y)

        # Update follower if player has a pymon
        active = self.player_data.get('active_pymon')
        if active:
            if not self.follower.visible:
                self.follower.set_pymon(active.get('base_key', 'sparky'),
                                       active.get('evolved', False))
            self.follower.update(self.player.pixel_x, self.player.pixel_y)

        self.camera.update(self.player.pixel_x + TILE_SIZE // 2,
                          self.player.pixel_y + TILE_SIZE // 2)

        if self.move_cooldown > 0:
            self.move_cooldown -= 1

    def handle_movement(self, keys):
        """Handle player movement input. Returns tile type stepped on, or None."""
        if self.player.moving or self.move_cooldown > 0:
            return None

        dx, dy = 0, 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            dx = -1
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            dx = 1
        elif keys[pygame.K_UP] or keys[pygame.K_w]:
            dy = -1
        elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
            dy = 1

        if dx != 0 or dy != 0:
            if self.player.try_move(dx, dy, self.tilemap):
                self.move_cooldown = 2
                tile = self.tilemap.get_tile(self.player.tile_x, self.player.tile_y)
                return tile
        return None

    def check_interaction(self):
        """Check if player is facing an NPC or sign. Returns interaction data or None."""
        fx, fy = self.player.get_facing_tile()

        # Check NPCs
        for npc in self.npcs:
            if npc.tile_x == fx and npc.tile_y == fy:
                return {'type': 'npc', 'npc': npc}

        # Check signs
        if (fx, fy) in SIGN_TEXTS:
            return {'type': 'sign', 'text': SIGN_TEXTS[(fx, fy)]}

        # Check gym doors
        tile = self.tilemap.get_tile(fx, fy)
        if tile == TILE_DOOR:
            for gx, gy, gidx in GYM_POSITIONS:
                if abs(fx - gx) <= 2 and abs(fy - gy) <= 1:
                    return {'type': 'gym', 'gym_index': gidx}

        return None

    def check_grass_encounter(self):
        """Check if a random encounter should trigger. Returns True if encounter."""
        tile = self.tilemap.get_tile(self.player.tile_x, self.player.tile_y)
        if tile == TILE_TALL_GRASS:
            self.player.steps_in_grass += 1
            if self.player.steps_in_grass >= 3:  # minimum steps before encounter
                if random.random() < ENCOUNTER_CHANCE:
                    self.player.steps_in_grass = 0
                    return True
        else:
            self.player.steps_in_grass = 0
        return False

    def draw(self, surface):
        self.tilemap.draw(surface, self.camera)
        # Draw NPCs
        for npc in self.npcs:
            npc.draw(surface, self.camera)
        # Draw follower PyMon
        self.follower.draw(surface, self.camera)
        # Draw player
        self.player.draw(surface, self.camera)
        # Draw Byte
        self.byte.draw(surface, self.camera)
