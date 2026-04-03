"""PokePy: Aurora Archipelago - Main Game (State Machine, Screens, Loop)"""

import asyncio
import sys
import pygame
import random
import math
from src.settings import *
from src.sprites import SpriteCache
from src.data import (PYMON_DATA, NPC_DIALOGUES, GYM_DATA, GYM_POSITIONS,
                      WILD_PYMONS, PLAYER_START)
from src.ui import TextBox, Menu, HUD, InputField, get_font
from src.world import World
from src.battle import Battle
from src.gym import GymBattle
from src.touch import CombinedInput, TouchControls


class PlayerData:
    """Persistent player data (XP, PyMons, badges, etc.)."""

    def __init__(self):
        self.name = "Player"
        self.xp = 0
        self.badges = []
        self.pymons = []  # list of pymon dicts
        self.active_pymon_index = 0
        self.start_pos = PLAYER_START

    def as_dict(self):
        d = {
            'name': self.name,
            'xp': self.xp,
            'badges': list(self.badges),
            'start_pos': self.start_pos,
        }
        if self.pymons:
            d['active_pymon'] = self.pymons[self.active_pymon_index]
        return d

    def add_xp(self, amount):
        self.xp += amount
        # Check for PyMon evolution
        for p in self.pymons:
            if not p.get('evolved') and p['xp'] >= XP_EVOLUTION_THRESHOLD:
                return p  # return pymon that's ready to evolve
        return None

    def add_pymon_xp(self, amount):
        if self.pymons:
            p = self.pymons[self.active_pymon_index]
            p['xp'] += amount

    def get_active_pymon(self):
        if self.pymons:
            return self.pymons[self.active_pymon_index]
        return None

    def add_pymon(self, key):
        data = PYMON_DATA[key]
        pymon = {
            'base_key': key,
            'name': data['name'],
            'type': data['type'],
            'level': 1,
            'xp': 0,
            'hp': data['base_hp'],
            'max_hp': data['base_hp'],
            'energy': data['base_energy'],
            'attack': data['base_attack'],
            'defense': data['base_defense'],
            'evolved': False,
        }
        self.pymons.append(pymon)

    def evolve_pymon(self, pymon):
        """Evolve a PyMon. Returns new data dict."""
        old_key = pymon['base_key']
        evo_key = PYMON_DATA[old_key].get('evolution')
        if not evo_key:
            return None
        evo_data = PYMON_DATA[evo_key]
        pymon['base_key'] = evo_key
        pymon['name'] = evo_data['name']
        pymon['max_hp'] = evo_data['base_hp']
        pymon['hp'] = evo_data['base_hp']
        pymon['energy'] = evo_data['base_energy']
        pymon['attack'] = evo_data['base_attack']
        pymon['defense'] = evo_data['base_defense']
        pymon['level'] += 1
        pymon['evolved'] = True
        return pymon

    def heal_active(self):
        if self.pymons:
            p = self.pymons[self.active_pymon_index]
            p['hp'] = p['max_hp']

    def can_challenge_gym(self, gym_index):
        if gym_index in self.badges:
            return False  # already beaten
        required = GYM_DATA[gym_index]['xp_required']
        return self.xp >= required


class Game:
    """Main game class with state machine."""

    def __init__(self):
        pygame.init()
        flags = pygame.RESIZABLE
        if hasattr(pygame, 'SCALED'):
            flags |= pygame.SCALED
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags)
        pygame.display.set_caption(TITLE)
        self.clock = pygame.time.Clock()
        self.running = True
        self.text_input_enabled = False
        self.touch_controls = TouchControls()
        self._configure_browser_canvas()

        # Sprites
        self.sprites = SpriteCache()

        # Player data
        self.player_data = PlayerData()

        # State
        self.state = STATE_TITLE

        # UI components
        self.textbox = TextBox(SCREEN_WIDTH, SCREEN_HEIGHT)
        self.hud = HUD()
        self.menu = None

        # Fonts
        self.font_title = get_font(FONT_SIZE_TITLE)
        self.font_large = get_font(FONT_SIZE_LARGE)
        self.font = get_font(FONT_SIZE_NORMAL)
        self.font_small = get_font(FONT_SIZE_SMALL)

        # Screen-specific state
        self.title_timer = 0
        self.name_input = None
        self.setup_phase = 0  # 0=name, 1=professor intro, 2=choose starter
        self.world = None
        self.battle = None
        self.gym_battle = None

        # Evolution animation
        self.evolution_pymon = None
        self.evolution_timer = 0

        # Pending dialogue callback
        self.dialogue_callback = None

        # Transition effect
        self.transition_alpha = 0
        self.transitioning = False
        self.transition_target = None
        self.transition_callback = None

    def _configure_browser_canvas(self):
        if sys.platform != 'emscripten':
            return
        try:
            from platform import window

            canvas = window.canvas
            canvas.style.width = "100vw"
            canvas.style.height = "100vh"
            canvas.style.maxWidth = "100vw"
            canvas.style.maxHeight = "100vh"
            canvas.style.objectFit = "contain"
            canvas.style.imageRendering = "pixelated"
            canvas.style.touchAction = "none"
            window.document.body.style.margin = "0"
            window.document.body.style.background = "#141923"
            window.document.body.style.overflow = "hidden"
        except Exception:
            pass

    async def run(self):
        while self.running:
            self.clock.tick(FPS)
            self._handle_events()
            self._update()
            self._draw()
            pygame.display.flip()
            await asyncio.sleep(0)
        if self.text_input_enabled:
            pygame.key.stop_text_input()
        pygame.quit()

    def _handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
                return

            # Global: handle transitions
            if self.transitioning:
                continue

            if self.touch_controls.handle_event(event):
                continue

            # Textbox takes priority when active
            if self.textbox.active:
                if (event.type == pygame.KEYDOWN and event.key in (pygame.K_z, pygame.K_RETURN, pygame.K_SPACE)) or event.type == pygame.MOUSEBUTTONDOWN:
                    still_active = self.textbox.advance()
                    if not still_active and self.dialogue_callback:
                        cb = self.dialogue_callback
                        self.dialogue_callback = None
                        cb()
                continue

            # Menu takes priority when active
            if self.menu:
                if event.type == pygame.KEYDOWN:
                    result = self.menu.handle_input(event.key)
                    if result is not None:
                        self._handle_menu_select(result)
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    result = self.menu.handle_mouse(event.pos, clicked=True)
                    if result is not None:
                        self._handle_menu_select(result)
                elif event.type == pygame.MOUSEMOTION:
                    self.menu.handle_mouse(event.pos)
                continue

            # State-specific event handling
            if self.state == STATE_TITLE:
                self._handle_title_event(event)
            elif self.state == STATE_SETUP:
                self._handle_setup_event(event)
            elif self.state == STATE_OVERWORLD:
                self._handle_overworld_event(event)
            elif self.state == STATE_BATTLE:
                self._handle_battle_event(event)
            elif self.state == STATE_GYM:
                self._handle_gym_event(event)
            elif self.state == STATE_EVOLUTION:
                self._handle_evolution_event(event)

    def _update(self):
        self.touch_controls.set_enabled(
            self.state == STATE_OVERWORLD and self.world is not None and
            not self.textbox.active and not self.menu and not self.transitioning
        )
        self._sync_text_input()

        # Transition
        if self.transitioning:
            self.transition_alpha += 8
            if self.transition_alpha >= 255:
                self.transition_alpha = 255
                if self.transition_callback:
                    self.transition_callback()
                    self.transition_callback = None
                self.transitioning = False
                # Fade back in handled separately
            return

        # Textbox animation
        if self.textbox.active:
            self.textbox.update()

        if self.state == STATE_TITLE:
            self.title_timer += 1
        elif self.state == STATE_OVERWORLD:
            if self.world:
                self.world.update()
        elif self.state == STATE_BATTLE:
            if self.battle:
                self.battle.update()
        elif self.state == STATE_GYM:
            if self.gym_battle:
                self.gym_battle.update()
        elif self.state == STATE_EVOLUTION:
            self.evolution_timer += 1

        # Fade in from transition
        if self.transition_alpha > 0 and not self.transitioning:
            self.transition_alpha = max(0, self.transition_alpha - 6)

    def _draw(self):
        if self.state == STATE_TITLE:
            self._draw_title()
        elif self.state == STATE_SETUP:
            self._draw_setup()
        elif self.state == STATE_OVERWORLD:
            self._draw_overworld()
        elif self.state == STATE_BATTLE:
            self._draw_battle()
        elif self.state == STATE_GYM:
            self._draw_gym()
        elif self.state == STATE_EVOLUTION:
            self._draw_evolution()

        # Textbox overlay
        self.textbox.draw(self.screen)

        # Menu overlay
        if self.menu:
            self.menu.draw(self.screen)

        self.touch_controls.draw(self.screen)

        # Transition overlay
        if self.transition_alpha > 0:
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            overlay.fill(BLACK)
            overlay.set_alpha(self.transition_alpha)
            self.screen.blit(overlay, (0, 0))

    # ─── TITLE SCREEN ────────────────────────────────────

    def _handle_title_event(self, event):
        if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
            if self.title_timer > 30:
                self._transition_to(STATE_SETUP, self._init_setup)

    def _draw_title(self):
        self.screen.fill(UI_BG)

        # Animated background pattern
        t = self.title_timer * 0.02
        for i in range(20):
            x = int((math.sin(t + i * 0.5) + 1) * SCREEN_WIDTH / 2)
            y = int((math.cos(t + i * 0.3) + 1) * SCREEN_HEIGHT / 2)
            radius = int(20 + 10 * math.sin(t + i))
            alpha = 30
            color = (DARK_GREEN[0], DARK_GREEN[1], DARK_GREEN[2])
            pygame.draw.circle(self.screen, color, (x, y), radius)

        # Logo text
        title1 = self.font_title.render("PokePy", True, SOLAR_YELLOW)
        title2 = self.font_large.render("Aurora Archipelago", True, UI_ACCENT)
        self.screen.blit(title1, ((SCREEN_WIDTH - title1.get_width()) // 2, 160))
        self.screen.blit(title2, ((SCREEN_WIDTH - title2.get_width()) // 2, 230))

        # Subtitle
        sub = self.font.render("Learn Python Through Adventure", True, MID_GRAY)
        self.screen.blit(sub, ((SCREEN_WIDTH - sub.get_width()) // 2, 280))

        # Blink prompt
        if (self.title_timer // 30) % 2 == 0:
            prompt = self.font.render("Press any key to start", True, UI_TEXT)
            self.screen.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 420))

        # Version
        ver = self.font_small.render("MVP v0.1", True, MID_GRAY)
        self.screen.blit(ver, (SCREEN_WIDTH - ver.get_width() - 10, SCREEN_HEIGHT - 25))

        # Byte sprite
        byte_sprite = self.sprites.get('byte_happy')
        if byte_sprite:
            scaled = pygame.transform.scale(byte_sprite,
                (byte_sprite.get_width() * 3, byte_sprite.get_height() * 3))
            bx = (SCREEN_WIDTH - scaled.get_width()) // 2
            by = 330 + int(math.sin(self.title_timer * 0.05) * 5)
            self.screen.blit(scaled, (bx, by))

    # ─── CHARACTER SETUP ─────────────────────────────────

    def _init_setup(self):
        self.setup_phase = 0
        self.name_input = InputField(
            SCREEN_WIDTH // 2 - 150, 300, 300, 50,
            placeholder="Enter your name..."
        )

    def _handle_setup_event(self, event):
        if self.setup_phase == 0:
            # Name input
            if event.type == pygame.MOUSEBUTTONDOWN:
                self.name_input.handle_mouse(event.pos, clicked=True)
            elif event.type == pygame.TEXTINPUT:
                self.name_input.handle_text(event.text)
            elif event.type == pygame.KEYDOWN:
                result = self.name_input.handle_key(event)
                if result:
                    self.player_data.name = result
                    self.setup_phase = 1
                    self.textbox.show(
                        NPC_DIALOGUES['professor_intro'],
                        speaker="Professor Pine"
                    )
                    self.dialogue_callback = self._show_byte_intro

        elif self.setup_phase == 2:
            # Choosing starter - handled by menu
            pass

    def _show_byte_intro(self):
        self.textbox.show(NPC_DIALOGUES['byte_intro'], speaker="Byte")
        self.dialogue_callback = self._show_starter_choice

    def _show_starter_choice(self):
        self.setup_phase = 2
        self.menu = Menu(
            SCREEN_WIDTH // 2 - 100, 350,
            ["Sparky (Electric)", "Leaflet (Nature)"],
            FONT_SIZE_LARGE
        )

    def _handle_menu_select(self, index):
        if self.state == STATE_SETUP and self.setup_phase == 2:
            # Starter PyMon choice
            key = ['sparky', 'leaflet'][index]
            self.player_data.add_pymon(key)
            self.menu = None
            name = PYMON_DATA[key]['name']
            self.textbox.show(
                [f"You chose {name}!",
                 f"{name} looks excited to be your partner!",
                 "Now go explore Solares and become the best coder!"],
                speaker="Professor Pine"
            )
            self.dialogue_callback = self._enter_overworld
        elif self.state == STATE_OVERWORLD and self.menu:
            # Pause menu or gym access menu
            self._handle_overworld_menu(index)

    def _enter_overworld(self):
        self._transition_to(STATE_OVERWORLD, self._init_overworld)

    def _init_overworld(self):
        self.world = World(self.sprites, self.player_data.as_dict())
        self.player_data.heal_active()

    def _draw_setup(self):
        self.screen.fill(UI_BG)

        if self.setup_phase == 0:
            # Name entry
            title = self.font_large.render("What's your name, trainer?", True, UI_TEXT)
            self.screen.blit(title, ((SCREEN_WIDTH - title.get_width()) // 2, 200))
            self.name_input.draw(self.screen)

            # Professor sprite
            prof = self.sprites.get('professor')
            if prof:
                scaled = pygame.transform.scale(prof, (prof.get_width() * 3, prof.get_height() * 3))
                self.screen.blit(scaled, ((SCREEN_WIDTH - scaled.get_width()) // 2, 60))

        elif self.setup_phase == 1:
            # Professor intro (textbox handles it)
            self.screen.fill(UI_BG)
            # Draw professor and byte
            prof = self.sprites.get('professor')
            if prof:
                scaled = pygame.transform.scale(prof, (prof.get_width() * 3, prof.get_height() * 3))
                self.screen.blit(scaled, (200, 100))
            byte_s = self.sprites.get('byte_happy')
            if byte_s:
                scaled = pygame.transform.scale(byte_s, (byte_s.get_width() * 3, byte_s.get_height() * 3))
                self.screen.blit(scaled, (450, 120))

            greet = self.font_large.render(f"Welcome, {self.player_data.name}!", True, UI_ACCENT)
            self.screen.blit(greet, ((SCREEN_WIDTH - greet.get_width()) // 2, 30))

        elif self.setup_phase == 2:
            # Starter choice
            self.screen.fill(UI_BG)
            title = self.font_large.render("Choose your starter PyMon!", True, SOLAR_YELLOW)
            self.screen.blit(title, ((SCREEN_WIDTH - title.get_width()) // 2, 30))

            # Draw PyMon sprites
            sparky = self.sprites.get_pymon('sparky')
            leaflet = self.sprites.get_pymon('leaflet')
            if sparky:
                self.screen.blit(sparky, (150, 100))
                s_name = self.font.render("Sparky", True, SPARKY_YELLOW)
                s_desc = self.font_small.render("Electric type - High attack!", True, UI_TEXT)
                self.screen.blit(s_name, (150, 240))
                self.screen.blit(s_desc, (120, 265))
            if leaflet:
                self.screen.blit(leaflet, (500, 100))
                l_name = self.font.render("Leaflet", True, LEAFLET_GREEN)
                l_desc = self.font_small.render("Nature type - High defense!", True, UI_TEXT)
                self.screen.blit(l_name, (500, 240))
                self.screen.blit(l_desc, (470, 265))

    # ─── OVERWORLD ───────────────────────────────────────

    def _handle_overworld_event(self, event):
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                # Pause menu
                self.menu = Menu(SCREEN_WIDTH - 180, 40,
                               ["Resume", "PyMon Status", "Quit Game"])
                return

            if event.key in (pygame.K_z, pygame.K_RETURN):
                # Interaction
                interaction = self.world.check_interaction()
                if interaction:
                    self._handle_interaction(interaction)

    def _handle_overworld_menu(self, index):
        if self.menu:
            options = self.menu.options
            self.menu = None
            if index == 0:
                pass  # Resume
            elif index == 1 and "PyMon" in options[1]:
                # Show PyMon status
                pymon = self.player_data.get_active_pymon()
                if pymon:
                    lines = [
                        f"{pymon['name']} (Lv. {pymon['level']})",
                        f"HP: {pymon['hp']}/{pymon['max_hp']}  ATK: {pymon['attack']}  DEF: {pymon['defense']}",
                        f"XP: {pymon['xp']}/{XP_EVOLUTION_THRESHOLD}",
                        f"Type: {pymon['type'].capitalize()}"
                    ]
                    if pymon.get('evolved'):
                        lines.append("(Evolved!)")
                    self.textbox.show(lines, speaker="PyMon Status")
            elif "Quit" in options[index]:
                self.running = False
            elif "Enter" in options[index]:
                # Enter gym
                gym_idx = getattr(self, '_pending_gym_index', 0)
                self._start_gym(gym_idx)
            elif "Not ready" in options[index] or "Already" in options[index]:
                pass

    def _handle_interaction(self, interaction):
        itype = interaction['type']

        if itype == 'npc':
            npc = interaction['npc']
            dlg_key = npc.dialogue_key
            if dlg_key in NPC_DIALOGUES:
                speaker = npc.npc_id.replace('_', ' ').title()
                if npc.npc_id == 'professor':
                    speaker = "Professor Pine"
                elif npc.npc_id.startswith('gym_'):
                    gym_idx = int(npc.npc_id.split('_')[1])
                    speaker = GYM_DATA[gym_idx]['leader']
                self.textbox.show(NPC_DIALOGUES[dlg_key], speaker=speaker)

                # If it's a gym leader, offer gym challenge after dialogue
                if npc.npc_id.startswith('gym_'):
                    gym_idx = int(npc.npc_id.split('_')[1])
                    self._pending_gym_index = gym_idx
                    self.dialogue_callback = lambda: self._offer_gym(gym_idx)

        elif itype == 'sign':
            self.textbox.show([interaction['text']], speaker="Sign")

        elif itype == 'gym':
            gym_idx = interaction['gym_index']
            self._pending_gym_index = gym_idx
            self._offer_gym(gym_idx)

    def _offer_gym(self, gym_idx):
        if gym_idx in self.player_data.badges:
            self.menu = Menu(SCREEN_WIDTH // 2 - 120, 300,
                           [f"Already beaten!", "Leave"])
        elif self.player_data.can_challenge_gym(gym_idx):
            self.menu = Menu(SCREEN_WIDTH // 2 - 120, 300,
                           [f"Enter {GYM_DATA[gym_idx]['name']}", "Not now"])
        else:
            required = GYM_DATA[gym_idx]['xp_required']
            self.textbox.show(
                [f"You need {required} XP to challenge this gym.",
                 f"You currently have {self.player_data.xp} XP.",
                 "Keep battling bugs and catching PyMons!"],
                speaker="Gym Guard"
            )

    def _update_overworld(self):
        if not self.world:
            return
        keys = CombinedInput(pygame.key.get_pressed(), self.touch_controls.get_pressed_keys())
        tile_stepped = self.world.handle_movement(keys)

        if tile_stepped == TILE_TALL_GRASS:
            if self.world.check_grass_encounter():
                self._start_encounter()

    def _start_encounter(self):
        # Random: 60% syntax bug, 40% wild pymon
        if random.random() < 0.6:
            self._transition_to(STATE_BATTLE, lambda: self._init_battle('bug'))
        else:
            key = random.choice(WILD_PYMONS)
            self._transition_to(STATE_BATTLE, lambda: self._init_battle('wild', key))

    def _init_battle(self, encounter_type, wild_key=None):
        self.battle = Battle(self.sprites, self.player_data.as_dict(),
                            encounter_type, wild_key)

    def _start_gym(self, gym_index):
        self.menu = None
        self._transition_to(STATE_GYM, lambda: self._init_gym(gym_index))

    def _init_gym(self, gym_index):
        self.gym_battle = GymBattle(gym_index, self.sprites, self.player_data.as_dict())

    def _draw_overworld(self):
        self.screen.fill(GRASS_GREEN)

        if self.world:
            # Handle movement in draw since we need continuous key checks
            if not self.textbox.active and not self.menu and not self.transitioning:
                keys = CombinedInput(pygame.key.get_pressed(), self.touch_controls.get_pressed_keys())
                tile_stepped = self.world.handle_movement(keys)
                if tile_stepped == TILE_TALL_GRASS:
                    if self.world.check_grass_encounter():
                        self._start_encounter()

            self.world.update()
            self.world.draw(self.screen)
            self.hud.draw(self.screen, self.player_data.as_dict(), self.sprites)

    # ─── BATTLE ──────────────────────────────────────────

    def _handle_battle_event(self, event):
        if self.battle:
            result = self.battle.handle_event(event)
            if result and result.get('action') == 'battle_end':
                self._end_battle(result)

    def _end_battle(self, result):
        xp = result.get('xp', 0)
        if xp > 0:
            evolving = self.player_data.add_xp(xp)
            self.player_data.add_pymon_xp(xp)

        # Handle capture
        if result.get('result') == 'capture':
            captured_key = result.get('captured')
            if captured_key and len(self.player_data.pymons) < 3:
                self.player_data.add_pymon(captured_key)

        # Update active pymon HP from battle
        active = self.player_data.get_active_pymon()
        if active and self.battle:
            active['hp'] = max(1, self.battle.player_hp)  # don't let it reach 0 permanently

        self.battle = None

        # Check for evolution
        active = self.player_data.get_active_pymon()
        if active and not active.get('evolved') and active['xp'] >= XP_EVOLUTION_THRESHOLD:
            self.evolution_pymon = active
            self.evolution_timer = 0
            self._transition_to(STATE_EVOLUTION)
        else:
            self._transition_to(STATE_OVERWORLD, self._return_to_overworld)

    def _return_to_overworld(self):
        # Re-init world with updated player data
        if self.world:
            old_tx = self.world.player.tile_x
            old_ty = self.world.player.tile_y
            self.player_data.start_pos = (old_tx, old_ty)
        self.world = World(self.sprites, self.player_data.as_dict())
        if hasattr(self, '_saved_player_pos'):
            self.world.player.tile_x = self._saved_player_pos[0]
            self.world.player.tile_y = self._saved_player_pos[1]
            self.world.player.pixel_x = float(self._saved_player_pos[0] * TILE_SIZE)
            self.world.player.pixel_y = float(self._saved_player_pos[1] * TILE_SIZE)

    def _draw_battle(self):
        if self.battle:
            self.battle.draw(self.screen)

    # ─── GYM ─────────────────────────────────────────────

    def _handle_gym_event(self, event):
        if self.gym_battle:
            result = self.gym_battle.handle_event(event)
            if result and result.get('action') == 'gym_end':
                self._end_gym(result)

    def _end_gym(self, result):
        if result.get('result') == 'win':
            gym_idx = result['gym_index']
            self.player_data.badges.append(gym_idx)
            xp = result.get('xp', 0)
            self.player_data.add_xp(xp)
            self.player_data.add_pymon_xp(xp)

        self.gym_battle = None
        self._transition_to(STATE_OVERWORLD, self._return_to_overworld)

    def _draw_gym(self):
        if self.gym_battle:
            self.gym_battle.draw(self.screen)

    # ─── EVOLUTION ───────────────────────────────────────

    def _handle_evolution_event(self, event):
        if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
            if self.evolution_timer > 120:
                if self.evolution_pymon:
                    self.player_data.evolve_pymon(self.evolution_pymon)
                self.evolution_pymon = None
                self._transition_to(STATE_OVERWORLD, self._return_to_overworld)

    def _draw_evolution(self):
        self.screen.fill(UI_BG)
        t = min(self.evolution_timer / 120.0, 1.0)

        if not self.evolution_pymon:
            return

        old_key = self.evolution_pymon['base_key']
        evo_key = PYMON_DATA[old_key].get('evolution', old_key)

        # Flash effect
        if t < 0.5:
            # Show original with increasing glow
            sprite = self.sprites.get_pymon(old_key, False)
            flash = int(t * 2 * 255)
            glow = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            glow.fill((255, 255, 255, min(flash, 200)))
        else:
            # Show evolved
            sprite = self.sprites.get_pymon(evo_key.replace('_evo', ''), True)
            flash = int((1 - t) * 2 * 200)
            glow = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            glow.fill((255, 255, 255, max(flash, 0)))

        # Title
        if t < 0.5:
            text = self.font_large.render(f"{self.evolution_pymon['name']} is evolving!", True, SOLAR_YELLOW)
        else:
            evo_name = PYMON_DATA[old_key].get('evo_name', 'Unknown')
            text = self.font_large.render(f"Evolved into {evo_name}!", True, UI_HIGHLIGHT)

        self.screen.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 60))

        if sprite:
            # Pulse scale
            pulse = 1.0 + 0.3 * math.sin(self.evolution_timer * 0.15)
            sw = int(sprite.get_width() * pulse)
            sh = int(sprite.get_height() * pulse)
            scaled = pygame.transform.scale(sprite, (sw, sh))
            sx = (SCREEN_WIDTH - sw) // 2
            sy = (SCREEN_HEIGHT - sh) // 2 - 40
            self.screen.blit(scaled, (sx, sy))

        self.screen.blit(glow, (0, 0))

        if t >= 1.0:
            prompt = self.font.render("Press any key to continue", True, MID_GRAY)
            self.screen.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 520))

    # ─── TRANSITIONS ─────────────────────────────────────

    def _transition_to(self, new_state, callback=None):
        """Start a fade-to-black transition to a new state."""
        self.transitioning = True
        self.transition_alpha = 0
        self.transition_target = new_state

        # Save player position before transition
        if self.world and self.state == STATE_OVERWORLD:
            self._saved_player_pos = (self.world.player.tile_x, self.world.player.tile_y)

        def on_black():
            self.state = new_state
            if callback:
                callback()
        self.transition_callback = on_black

    def _sync_text_input(self):
        rect = None

        if self.transitioning or self.textbox.active or self.menu:
            rect = None
        elif self.state == STATE_SETUP and self.setup_phase == 0 and self.name_input and self.name_input.active:
            rect = self.name_input.get_text_input_rect()
        elif self.state == STATE_BATTLE and self.battle and self.battle.wants_text_input():
            rect = self.battle.get_text_input_rect()
        elif self.state == STATE_GYM and self.gym_battle and self.gym_battle.wants_text_input():
            rect = self.gym_battle.get_text_input_rect()

        wants_text_input = rect is not None

        if wants_text_input and not self.text_input_enabled:
            pygame.key.start_text_input()
            self.text_input_enabled = True
        elif not wants_text_input and self.text_input_enabled:
            pygame.key.stop_text_input()
            self.text_input_enabled = False

        if wants_text_input:
            pygame.key.set_text_input_rect(rect)
