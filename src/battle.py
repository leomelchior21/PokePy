"""PokePy: Aurora Archipelago - Battle System with Coding Mode"""

import pygame
import random
import io
import contextlib
from src.settings import *
from src.data import SYNTAX_CHALLENGES, PYMON_DATA, WILD_PYMONS, CODE_COMPLETIONS
from src.ui import (CodeEditor, CompletionBar, Button, StepThroughDisplay,
                    get_font, TextBox)


class CodeRunner:
    """Safely executes player code and captures output/variables."""

    def __init__(self):
        self.output = []
        self.variables = {}
        self.error = None
        self.lines_executed = 0

    def execute(self, code):
        """Execute code and capture results. Returns (success, output, variables, error)."""
        self.output = []
        self.variables = {}
        self.error = None
        self.lines_executed = 0

        # Capture stdout
        stdout_capture = io.StringIO()
        namespace = {'__builtins__': {'print': lambda *args, **kwargs: print(*args, **kwargs, file=stdout_capture),
                                       'str': str, 'int': int, 'float': float, 'len': len,
                                       'range': range, 'bool': bool, 'type': type,
                                       'True': True, 'False': False, 'None': None,
                                       'abs': abs, 'max': max, 'min': min}}
        try:
            exec(code, namespace)
            self.output = stdout_capture.getvalue().strip().split('\n') if stdout_capture.getvalue().strip() else []
            # Collect user-defined variables
            for k, v in namespace.items():
                if not k.startswith('_'):
                    self.variables[k] = v
            return True, self.output, self.variables, None
        except Exception as e:
            self.error = str(e)
            return False, [], {}, str(e)

    def execute_step_by_step(self, code):
        """Execute code line by line, yielding state after each line.
        Returns list of (line_index, variables_snapshot, output_snapshot, error).
        """
        lines = code.split('\n')
        steps = []
        accumulated = ""
        namespace = {}
        all_output = []
        stdout_capture = io.StringIO()
        safe_builtins = {'print': lambda *args, **kwargs: print(*args, **kwargs, file=stdout_capture),
                         'str': str, 'int': int, 'float': float, 'len': len,
                         'range': range, 'bool': bool, 'type': type,
                         'True': True, 'False': False, 'None': None,
                         'abs': abs, 'max': max, 'min': min}
        namespace['__builtins__'] = safe_builtins

        for i, line in enumerate(lines):
            if not line.strip():
                steps.append((i, dict(namespace), list(all_output), None))
                continue
            accumulated += line + '\n'
            stdout_capture = io.StringIO()
            namespace['__builtins__'] = {**safe_builtins,
                                          'print': lambda *args, **kwargs: print(*args, **kwargs, file=stdout_capture)}
            try:
                exec(accumulated, namespace)
                new_output = stdout_capture.getvalue().strip()
                if new_output:
                    all_output.extend(new_output.split('\n'))
                user_vars = {k: v for k, v in namespace.items() if not k.startswith('_')}
                steps.append((i, dict(user_vars), list(all_output), None))
            except Exception as e:
                steps.append((i, {}, list(all_output), str(e)))
                break
        return steps


class Battle:
    """A single battle encounter (wild PyMon or Syntax Bug)."""

    def __init__(self, sprites, player_data, encounter_type='bug', wild_pymon_key=None):
        self.sprites = sprites
        self.player_data = player_data
        self.encounter_type = encounter_type  # 'bug' or 'wild'
        self.wild_pymon_key = wild_pymon_key

        # Battle state
        self.phase = 'intro'  # intro, coding, stepping, result, capture_prompt, capture_anim, done
        self.result = None  # 'win', 'lose'
        self.turn = 0
        self.max_turns = 3

        # Challenge
        self.challenge = self._pick_challenge()
        self.xp_reward = XP_PER_BATTLE

        # Enemy data
        if encounter_type == 'bug':
            self.enemy_name = "Syntax Bug"
            self.enemy_sprite = sprites.get('syntax_bug')
            self.enemy_hp = 30
            self.enemy_max_hp = 30
        else:
            data = PYMON_DATA.get(wild_pymon_key, PYMON_DATA['sparky'])
            self.enemy_name = f"Wild {data['name']}"
            self.enemy_sprite = sprites.get_pymon(wild_pymon_key, False, False)
            self.enemy_hp = data['base_hp']
            self.enemy_max_hp = data['base_hp']

        # Player PyMon
        active = player_data.get('active_pymon')
        if active:
            self.player_pymon_name = active['name']
            self.player_pymon_sprite = sprites.get_pymon(active['base_key'], active.get('evolved', False))
            self.player_hp = active['hp']
            self.player_max_hp = active['max_hp']
        else:
            self.player_pymon_name = "???"
            self.player_pymon_sprite = None
            self.player_hp = 50
            self.player_max_hp = 50

        # UI components
        self.code_editor = CodeEditor(20, 320, SCREEN_WIDTH - 40, 150)
        self.code_editor.set_code(self.challenge['broken_code'])
        self.completion_bar = CompletionBar(20, 480, SCREEN_WIDTH - 40)
        self.completion_bar.set_suggestions(CODE_COMPLETIONS['battle'])
        self.run_button = Button(SCREEN_WIDTH - 140, 520, 120, 36, "Run Code")
        self.hint_button = Button(SCREEN_WIDTH - 280, 520, 120, 36, "Hint")
        self.step_display = StepThroughDisplay(SCREEN_WIDTH - 250, 100, 230, 200)
        self.code_runner = CodeRunner()

        # Step-through animation
        self.step_data = []
        self.step_index = 0
        self.step_timer = 0
        self.step_speed = 40  # frames per step

        # Messages
        self.font = get_font(FONT_SIZE_NORMAL)
        self.font_small = get_font(FONT_SIZE_SMALL)
        self.font_large = get_font(FONT_SIZE_LARGE)
        self.message = ""
        self.message_timer = 0
        self.show_hint = False
        self.hint_text = self.challenge.get('hint', '')

        # Intro animation
        self.intro_timer = 0
        self.intro_duration = 90

        # Capture
        self.capture_success = False
        self.capture_timer = 0

        # Shake animation for damage
        self.enemy_shake = 0
        self.player_shake = 0

    def _pick_challenge(self):
        """Pick a challenge based on player XP (difficulty scaling)."""
        xp = self.player_data.get('xp', 0)
        if xp < 50:
            diff = DIFF_EASY
        elif xp < 150:
            diff = random.choice([DIFF_EASY, DIFF_MEDIUM])
        else:
            diff = random.choice([DIFF_MEDIUM, DIFF_HARD])
        challenges = SYNTAX_CHALLENGES.get(diff, SYNTAX_CHALLENGES[DIFF_EASY])
        return random.choice(challenges)

    def handle_event(self, event):
        """Handle input events. Returns action dict or None."""
        if self.phase == 'intro':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                self.phase = 'coding'
                self.message = self.challenge['prompt']
            return None

        if self.phase == 'coding':
            if event.type == pygame.KEYDOWN:
                self.code_editor.handle_key(event)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                pos = event.pos
                # Check completion bar
                suggestion = self.completion_bar.handle_mouse(pos, clicked=True)
                if suggestion:
                    self.code_editor.insert_text(suggestion)
                # Check run button
                if self.run_button.handle_mouse(pos, clicked=True):
                    self._run_code()
                # Check hint button
                if self.hint_button.handle_mouse(pos, clicked=True):
                    self.show_hint = not self.show_hint
            elif event.type == pygame.MOUSEMOTION:
                self.completion_bar.handle_mouse(event.pos)
                self.run_button.handle_mouse(event.pos)
                self.hint_button.handle_mouse(event.pos)
            return None

        if self.phase == 'result':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                if self.result == 'win':
                    if self.encounter_type == 'wild':
                        self.phase = 'capture_prompt'
                        self.message = "Throw a PyBall? (Z = Yes, X = No)"
                    else:
                        self.phase = 'done'
                        return {'action': 'battle_end', 'result': 'win',
                                'xp': self.xp_reward}
                else:
                    self.phase = 'done'
                    return {'action': 'battle_end', 'result': 'lose', 'xp': 0}
            return None

        if self.phase == 'capture_prompt':
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_z:
                    # Attempt capture
                    self.phase = 'capture_anim'
                    self.capture_timer = 0
                    hp_ratio = self.enemy_hp / max(self.enemy_max_hp, 1)
                    self.capture_success = random.random() > hp_ratio * 0.4
                elif event.key == pygame.K_x:
                    self.phase = 'done'
                    return {'action': 'battle_end', 'result': 'win',
                            'xp': self.xp_reward}
            return None

        if self.phase == 'capture_anim':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                if self.capture_timer > 60:
                    self.phase = 'done'
                    if self.capture_success:
                        return {'action': 'battle_end', 'result': 'capture',
                                'xp': self.xp_reward + XP_PER_CAPTURE,
                                'captured': self.wild_pymon_key}
                    else:
                        return {'action': 'battle_end', 'result': 'win',
                                'xp': self.xp_reward}
            return None

        if self.phase == 'done':
            return {'action': 'battle_end', 'result': self.result or 'win',
                    'xp': self.xp_reward}

        return None

    def _run_code(self):
        """Execute the player's code and start step-through."""
        code = self.code_editor.get_code()
        self.step_data = self.code_runner.execute_step_by_step(code)
        self.step_index = 0
        self.step_timer = 0
        self.phase = 'stepping'
        self.step_display.reset()
        self.step_display.total_lines = len(self.code_editor.lines)
        self.step_display.status = "running"
        self.code_editor.read_only = True

    def _check_answer(self):
        """Check if the code is correct."""
        code = self.code_editor.get_code().strip()
        correct = self.challenge['correct_code'].strip()

        # Try execution-based check
        success1, output1, vars1, err1 = CodeRunner().execute(code)
        success2, output2, vars2, err2 = CodeRunner().execute(correct)

        if success1 and output1 == output2:
            return True
        # Also check exact match (for non-output challenges)
        if code == correct:
            return True
        # Normalize whitespace comparison
        if ' '.join(code.split()) == ' '.join(correct.split()):
            return True
        return False

    def update(self):
        """Update battle state each frame."""
        if self.phase == 'intro':
            self.intro_timer += 1
            return

        if self.phase == 'stepping':
            self.step_timer += 1
            if self.step_timer >= self.step_speed:
                self.step_timer = 0
                if self.step_index < len(self.step_data):
                    line_idx, variables, output, error = self.step_data[self.step_index]
                    self.code_editor.highlight_line = line_idx
                    self.step_display.current_line = line_idx
                    self.step_display.variables = variables
                    self.step_display.output_lines = output
                    if error:
                        self.step_display.status = "error"
                        self.step_display.error_msg = error
                        # Execution failed
                        self._on_code_fail()
                        return
                    self.step_index += 1
                else:
                    # Execution complete - check answer
                    self.code_editor.highlight_line = -1
                    if self._check_answer():
                        self._on_code_success()
                    else:
                        self._on_code_fail()

        if self.phase == 'capture_anim':
            self.capture_timer += 1

        if self.enemy_shake > 0:
            self.enemy_shake -= 1
        if self.player_shake > 0:
            self.player_shake -= 1

        if self.message_timer > 0:
            self.message_timer -= 1

    def _on_code_success(self):
        """Handle successful code execution."""
        self.step_display.status = "success"
        damage = 15 + random.randint(0, 10)
        self.enemy_hp = max(0, self.enemy_hp - damage)
        self.enemy_shake = 15
        self.message = f"Correct! Dealt {damage} damage!"

        if self.enemy_hp <= 0:
            self.message = f"{self.enemy_name} defeated! You win!"
            self.result = 'win'
            self.phase = 'result'
        else:
            self.turn += 1
            if self.turn >= self.max_turns:
                self.message = f"{self.enemy_name} defeated! You win!"
                self.result = 'win'
                self.phase = 'result'
            else:
                # Enemy attacks back (reduced damage since player succeeded)
                enemy_dmg = random.randint(3, 8)
                self.player_hp = max(0, self.player_hp - enemy_dmg)
                self.player_shake = 10
                self.message += f" {self.enemy_name} attacks for {enemy_dmg}!"
                # New challenge
                self.challenge = self._pick_challenge()
                self.code_editor.set_code(self.challenge['broken_code'])
                self.code_editor.read_only = False
                self.code_editor.highlight_line = -1
                self.hint_text = self.challenge.get('hint', '')
                self.show_hint = False
                self.phase = 'coding'
                self.step_display.reset()

    def _on_code_fail(self):
        """Handle failed code execution."""
        self.step_display.status = "error"
        # Enemy attacks
        enemy_dmg = random.randint(8, 15)
        self.player_hp = max(0, self.player_hp - enemy_dmg)
        self.player_shake = 15
        self.message = f"Code error! {self.enemy_name} attacks for {enemy_dmg}!"

        if self.player_hp <= 0:
            self.message = "Your PyMon fainted! You lose..."
            self.result = 'lose'
            self.phase = 'result'
        else:
            self.turn += 1
            if self.turn >= self.max_turns:
                self.message = "Out of turns! The bug escaped..."
                self.result = 'lose'
                self.phase = 'result'
            else:
                self.code_editor.read_only = False
                self.code_editor.highlight_line = -1
                self.phase = 'coding'
                self.step_display.reset()

    def draw(self, surface):
        # Dark background
        surface.fill(UI_BG)

        if self.phase == 'intro':
            self._draw_intro(surface)
            return

        # Battle scene (top half)
        self._draw_battle_scene(surface)

        # Code editor (bottom half)
        if self.phase in ('coding', 'stepping'):
            self.code_editor.draw(surface)
            if self.phase == 'coding':
                self.completion_bar.draw(surface)
                self.run_button.draw(surface)
                self.hint_button.draw(surface)
            self.step_display.draw(surface)

        # Hint
        if self.show_hint and self.phase == 'coding':
            hint_rect = pygame.Rect(30, 300, SCREEN_WIDTH - 60, 24)
            pygame.draw.rect(surface, (60, 60, 30), hint_rect, border_radius=4)
            hint_surf = self.font_small.render(f"Hint: {self.hint_text}", True, SOLAR_YELLOW)
            surface.blit(hint_surf, (38, 303))

        # Message bar
        if self.message:
            msg_rect = pygame.Rect(10, 560, SCREEN_WIDTH - 20, 32)
            pygame.draw.rect(surface, UI_PANEL, msg_rect, border_radius=4)
            msg_surf = self.font.render(self.message, True, UI_TEXT)
            surface.blit(msg_surf, (20, 564))

        # Result screen overlay
        if self.phase in ('result', 'capture_prompt', 'capture_anim'):
            self._draw_result(surface)

    def _draw_intro(self, surface):
        t = self.intro_timer / self.intro_duration
        # Slide in enemy from right
        enemy_x = int(SCREEN_WIDTH + 100 - (SCREEN_WIDTH // 2 + 50) * min(t * 2, 1))
        if self.enemy_sprite:
            surface.blit(self.enemy_sprite, (enemy_x, 80))

        # Text
        if t > 0.5:
            text = self.font_large.render(f"A {self.enemy_name} appeared!", True, UI_TEXT)
            tx = (SCREEN_WIDTH - text.get_width()) // 2
            surface.blit(text, (tx, SCREEN_HEIGHT // 2))
            prompt = self.font.render("Press any key to battle!", True, MID_GRAY)
            surface.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, SCREEN_HEIGHT // 2 + 40))

    def _draw_battle_scene(self, surface):
        # Enemy side (top-right area)
        scene_rect = pygame.Rect(0, 0, SCREEN_WIDTH, 300)
        # Gradient-ish background
        for i in range(300):
            r = 20 + i // 15
            g = 25 + i // 12
            b = 35 + i // 10
            pygame.draw.line(surface, (min(r, 60), min(g, 60), min(b, 80)),
                           (0, i), (SCREEN_WIDTH, i))

        # Ground line
        pygame.draw.rect(surface, (40, 55, 40), (0, 240, SCREEN_WIDTH, 60))

        # Enemy sprite and HP
        ex = SCREEN_WIDTH - 200
        ey = 40
        if self.enemy_shake > 0:
            ex += random.randint(-3, 3)
        if self.enemy_sprite:
            surface.blit(self.enemy_sprite, (ex, ey))

        # Enemy HP bar
        self._draw_hp_bar(surface, ex - 20, ey + 110, 120,
                         self.enemy_name, self.enemy_hp, self.enemy_max_hp)

        # Player PyMon (bottom-left)
        px = 60
        py = 140
        if self.player_shake > 0:
            px += random.randint(-3, 3)
        if self.player_pymon_sprite:
            surface.blit(self.player_pymon_sprite, (px, py))

        # Player HP bar
        self._draw_hp_bar(surface, px - 20, py + 110, 120,
                         self.player_pymon_name, self.player_hp, self.player_max_hp)

        # Turn indicator
        turn_text = self.font_small.render(f"Turn {self.turn + 1}/{self.max_turns}", True, UI_TEXT)
        surface.blit(turn_text, (SCREEN_WIDTH // 2 - 30, 10))

    def _draw_hp_bar(self, surface, x, y, w, name, hp, max_hp):
        # Name
        name_surf = self.font_small.render(name, True, WHITE)
        surface.blit(name_surf, (x, y))
        # HP bar
        bar_y = y + 18
        pygame.draw.rect(surface, DARK_GRAY, (x, bar_y, w, 8), border_radius=3)
        fill = hp / max(max_hp, 1)
        color = UI_HIGHLIGHT if fill > 0.5 else UI_WARNING if fill > 0.25 else UI_ERROR
        if fill > 0:
            pygame.draw.rect(surface, color, (x, bar_y, int(w * fill), 8), border_radius=3)
        hp_text = self.font_small.render(f"{hp}/{max_hp}", True, UI_TEXT)
        surface.blit(hp_text, (x + w + 8, bar_y - 4))

    def _draw_result(self, surface):
        # Semi-transparent overlay
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 150))
        surface.blit(overlay, (0, 0))

        if self.phase == 'result':
            if self.result == 'win':
                text = self.font_large.render("Victory!", True, SOLAR_YELLOW)
                xp_text = self.font.render(f"+{self.xp_reward} XP", True, UI_HIGHLIGHT)
            else:
                text = self.font_large.render("Defeated...", True, UI_ERROR)
                xp_text = self.font.render("No XP gained", True, MID_GRAY)

            surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 200))
            surface.blit(xp_text, ((SCREEN_WIDTH - xp_text.get_width()) // 2, 250))
            prompt = self.font.render("Press any key to continue", True, MID_GRAY)
            surface.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 350))

        elif self.phase == 'capture_prompt':
            text = self.font_large.render("Throw a PyBall?", True, SOLAR_YELLOW)
            surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 200))
            z_text = self.font.render("[Z] Yes    [X] No", True, UI_TEXT)
            surface.blit(z_text, ((SCREEN_WIDTH - z_text.get_width()) // 2, 260))

        elif self.phase == 'capture_anim':
            t = min(self.capture_timer / 60.0, 1.0)
            if t < 1.0:
                # Ball animation
                ball_x = SCREEN_WIDTH // 2
                ball_y = int(300 - 100 * (1 - (2 * t - 1) ** 2))
                pygame.draw.circle(surface, WHITE, (ball_x, ball_y), 12)
                pygame.draw.circle(surface, UI_ERROR, (ball_x, ball_y), 12, 3)
                pygame.draw.line(surface, DARK_GRAY, (ball_x - 12, ball_y), (ball_x + 12, ball_y), 2)
            else:
                if self.capture_success:
                    text = self.font_large.render(f"Caught {self.enemy_name}!", True, SOLAR_YELLOW)
                    xp_text = self.font.render(f"+{self.xp_reward + XP_PER_CAPTURE} XP", True, UI_HIGHLIGHT)
                else:
                    text = self.font_large.render("It broke free!", True, UI_ERROR)
                    xp_text = self.font.render(f"+{self.xp_reward} XP", True, UI_HIGHLIGHT)
                surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 200))
                surface.blit(xp_text, ((SCREEN_WIDTH - xp_text.get_width()) // 2, 260))
                prompt = self.font.render("Press any key to continue", True, MID_GRAY)
                surface.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 350))
