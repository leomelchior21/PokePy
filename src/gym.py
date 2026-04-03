"""PokePy: Aurora Archipelago - Gym System"""

import pygame
from src.settings import *
from src.data import GYM_DATA, CODE_COMPLETIONS
from src.ui import (CodeEditor, CompletionBar, Button, StepThroughDisplay,
                    get_font)
from src.battle import CodeRunner


class GymBattle:
    """A gym challenge consisting of sequential coding puzzles."""

    def __init__(self, gym_index, sprites, player_data):
        self.sprites = sprites
        self.player_data = player_data
        self.gym_index = gym_index
        self.gym_data = GYM_DATA[gym_index]

        self.phase = 'intro'  # intro, challenge, stepping, success, fail, badge
        self.challenge_index = 0
        self.challenges = self.gym_data['challenges']
        self.current = self.challenges[0]

        # UI
        self.code_editor = CodeEditor(20, 280, SCREEN_WIDTH - 280, 180)
        context_key = ['variables', 'strings', 'logic'][gym_index]
        self.completion_bar = CompletionBar(20, 470, SCREEN_WIDTH - 40)
        self.completion_bar.set_suggestions(CODE_COMPLETIONS.get(context_key, CODE_COMPLETIONS['default']))
        self.run_button = Button(SCREEN_WIDTH - 140, 520, 120, 36, "Run Code")
        self.hint_button = Button(SCREEN_WIDTH - 280, 520, 120, 36, "Hint")
        self.step_display = StepThroughDisplay(SCREEN_WIDTH - 250, 280, 230, 180)
        self.code_runner = CodeRunner()

        # Fonts
        self.font = get_font(FONT_SIZE_NORMAL)
        self.font_small = get_font(FONT_SIZE_SMALL)
        self.font_large = get_font(FONT_SIZE_LARGE)
        self.font_title = get_font(FONT_SIZE_TITLE)

        # State
        self.message = ""
        self.show_hint = False
        self.attempts = 0
        self.max_attempts = 5
        self.intro_timer = 0

        # Step-through
        self.step_data = []
        self.step_index = 0
        self.step_timer = 0
        self.step_speed = 35

        # Badge animation
        self.badge_timer = 0

        self._setup_challenge()

    def _setup_challenge(self):
        self.current = self.challenges[self.challenge_index]
        self.code_editor.set_code('')  # start blank for gym challenges
        self.code_editor.read_only = False
        self.code_editor.highlight_line = -1
        self.step_display.reset()
        self.message = self.current['prompt']
        self.show_hint = False

    def handle_event(self, event):
        """Handle input. Returns action dict or None."""
        if self.phase == 'intro':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                self.intro_timer += 1
                if self.intro_timer > 1:
                    self.phase = 'challenge'
                    self._setup_challenge()
            return None

        if self.phase == 'challenge':
            if event.type == pygame.KEYDOWN:
                self.code_editor.handle_key(event)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                pos = event.pos
                suggestion = self.completion_bar.handle_mouse(pos, clicked=True)
                if suggestion:
                    self.code_editor.insert_text(suggestion)
                if self.run_button.handle_mouse(pos, clicked=True):
                    self._run_code()
                if self.hint_button.handle_mouse(pos, clicked=True):
                    self.show_hint = not self.show_hint
            elif event.type == pygame.MOUSEMOTION:
                self.completion_bar.handle_mouse(event.pos)
                self.run_button.handle_mouse(event.pos)
                self.hint_button.handle_mouse(event.pos)
            return None

        if self.phase == 'success':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                self.challenge_index += 1
                if self.challenge_index >= len(self.challenges):
                    self.phase = 'badge'
                    self.badge_timer = 0
                else:
                    self.phase = 'challenge'
                    self._setup_challenge()
            return None

        if self.phase == 'fail':
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                return {'action': 'gym_end', 'result': 'fail', 'gym_index': self.gym_index}
            return None

        if self.phase == 'badge':
            self.badge_timer += 1
            if event.type == pygame.KEYDOWN or event.type == pygame.MOUSEBUTTONDOWN:
                if self.badge_timer > 30:
                    return {'action': 'gym_end', 'result': 'win',
                            'gym_index': self.gym_index,
                            'xp': XP_PER_GYM}
            return None

        return None

    def _run_code(self):
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
        code = self.code_editor.get_code().strip()
        correct = self.current['correct_code'].strip()
        check_type = self.current.get('check_type', 'exact')

        if check_type == 'output':
            expected = self.current.get('expected_output', '')
            success, output, _, error = CodeRunner().execute(code)
            if success and output:
                return '\n'.join(output).strip() == expected.strip()
            return False
        else:
            # Exact match (with whitespace normalization)
            if code == correct:
                return True
            if ' '.join(code.split()) == ' '.join(correct.split()):
                return True
            # Also try running both and comparing output
            s1, o1, v1, e1 = CodeRunner().execute(code)
            s2, o2, v2, e2 = CodeRunner().execute(correct)
            if s1 and s2 and o1 == o2:
                # Check that key variables match too
                for k in v2:
                    if k not in v1 or v1[k] != v2[k]:
                        return False
                return True
            return False

    def update(self):
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
                        self._on_fail()
                        return
                    self.step_index += 1
                else:
                    self.code_editor.highlight_line = -1
                    if self._check_answer():
                        self._on_success()
                    else:
                        self.step_display.status = "error"
                        self.step_display.error_msg = "Output doesn't match expected result."
                        self._on_fail()

    def _on_success(self):
        self.step_display.status = "success"
        self.message = f"Challenge {self.challenge_index + 1}/{len(self.challenges)} complete!"
        self.phase = 'success'

    def _on_fail(self):
        self.attempts += 1
        if self.attempts >= self.max_attempts:
            self.message = "Too many attempts! Come back and try again."
            self.phase = 'fail'
        else:
            self.message = f"Not quite! Try again. ({self.attempts}/{self.max_attempts} attempts)"
            self.code_editor.read_only = False
            self.code_editor.highlight_line = -1
            self.phase = 'challenge'

    def draw(self, surface):
        surface.fill(UI_BG)

        if self.phase == 'intro':
            self._draw_intro(surface)
            return

        if self.phase == 'badge':
            self._draw_badge(surface)
            return

        # Header
        gym_name = self.gym_data['name']
        header = self.font_large.render(gym_name, True, UI_ACCENT)
        surface.blit(header, (20, 10))

        progress = self.font.render(
            f"Challenge {self.challenge_index + 1}/{len(self.challenges)}  |  "
            f"Attempts: {self.attempts}/{self.max_attempts}", True, UI_TEXT)
        surface.blit(progress, (20, 42))

        # Challenge prompt
        prompt_rect = pygame.Rect(20, 70, SCREEN_WIDTH - 40, 60)
        pygame.draw.rect(surface, UI_PANEL, prompt_rect, border_radius=6)
        pygame.draw.rect(surface, UI_BORDER, prompt_rect, 1, border_radius=6)
        prompt_text = self.font.render(self.current['prompt'], True, SOLAR_YELLOW)
        surface.blit(prompt_text, (32, 82))

        # Expected output hint
        if self.current.get('check_type') == 'output':
            exp = self.font_small.render(
                f"Expected output: {self.current.get('expected_output', '')}",
                True, MID_GRAY)
            surface.blit(exp, (32, 108))

        # Correct code hint area
        if self.show_hint:
            hint_rect = pygame.Rect(20, 140, SCREEN_WIDTH - 40, 30)
            pygame.draw.rect(surface, (60, 60, 30), hint_rect, border_radius=4)
            hint_surf = self.font_small.render(f"Hint: {self.current.get('hint', '')}", True, SOLAR_YELLOW)
            surface.blit(hint_surf, (32, 147))

        # Gym leader sprite
        leader_sprite = self.sprites.get(f'gym_leader_{self.gym_index}')
        if leader_sprite:
            lx = SCREEN_WIDTH - 60
            surface.blit(leader_sprite, (lx, 10))

        # Code editor and UI
        if self.phase in ('challenge', 'stepping'):
            self.code_editor.draw(surface)
            if self.phase == 'challenge':
                self.completion_bar.draw(surface)
                self.run_button.draw(surface)
                self.hint_button.draw(surface)
            self.step_display.draw(surface)

        # Message
        if self.message:
            msg_rect = pygame.Rect(10, 560, SCREEN_WIDTH - 20, 32)
            pygame.draw.rect(surface, UI_PANEL, msg_rect, border_radius=4)
            color = UI_HIGHLIGHT if 'complete' in self.message.lower() else UI_TEXT
            msg = self.font.render(self.message, True, color)
            surface.blit(msg, (20, 564))

        # Result overlay
        if self.phase == 'success':
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 40, 0, 100))
            surface.blit(overlay, (0, 0))
            text = self.font_large.render("Challenge Complete!", True, UI_HIGHLIGHT)
            surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 240))
            cont = self.font.render("Press any key to continue", True, UI_TEXT)
            surface.blit(cont, ((SCREEN_WIDTH - cont.get_width()) // 2, 290))

        if self.phase == 'fail':
            overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
            overlay.fill((40, 0, 0, 100))
            surface.blit(overlay, (0, 0))
            text = self.font_large.render("Gym Challenge Failed", True, UI_ERROR)
            surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 240))
            cont = self.font.render("Press any key to leave", True, UI_TEXT)
            surface.blit(cont, ((SCREEN_WIDTH - cont.get_width()) // 2, 290))

    def _draw_intro(self, surface):
        # Gym entrance screen
        colors = [ENERGY_ORANGE, WATER_BLUE, LEAF_GREEN]
        color = colors[self.gym_index]

        # Background with gym theme color
        surface.fill(UI_BG)
        for i in range(SCREEN_HEIGHT):
            alpha = max(0, 60 - abs(i - SCREEN_HEIGHT // 2) // 4)
            line_color = (color[0] * alpha // 255, color[1] * alpha // 255, color[2] * alpha // 255)
            pygame.draw.line(surface, line_color, (0, i), (SCREEN_WIDTH, i))

        title = self.font_title.render(self.gym_data['name'], True, color)
        surface.blit(title, ((SCREEN_WIDTH - title.get_width()) // 2, 120))

        leader = self.font_large.render(f"Leader: {self.gym_data['leader']}", True, UI_TEXT)
        surface.blit(leader, ((SCREEN_WIDTH - leader.get_width()) // 2, 200))

        theme = self.font.render(f"Theme: {self.gym_data['theme']}", True, MID_GRAY)
        surface.blit(theme, ((SCREEN_WIDTH - theme.get_width()) // 2, 240))

        desc = self.font.render(self.gym_data['description'], True, UI_ACCENT)
        surface.blit(desc, ((SCREEN_WIDTH - desc.get_width()) // 2, 300))

        # Leader sprite (large)
        leader_sprite = self.sprites.get(f'gym_leader_{self.gym_index}')
        if leader_sprite:
            scaled = pygame.transform.scale(leader_sprite,
                (leader_sprite.get_width() * 3, leader_sprite.get_height() * 3))
            surface.blit(scaled, ((SCREEN_WIDTH - scaled.get_width()) // 2, 350))

        prompt = self.font.render("Press any key to begin!", True, UI_TEXT)
        surface.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 540))

    def _draw_badge(self, surface):
        surface.fill(UI_BG)
        t = min(self.badge_timer / 60.0, 1.0)

        # Victory text
        text = self.font_title.render("GYM COMPLETE!", True, SOLAR_YELLOW)
        surface.blit(text, ((SCREEN_WIDTH - text.get_width()) // 2, 80))

        leader = self.font_large.render(
            f"You defeated Leader {self.gym_data['leader']}!", True, UI_TEXT)
        surface.blit(leader, ((SCREEN_WIDTH - leader.get_width()) // 2, 160))

        # Badge animation (scale up)
        badge = self.sprites.get(f'badge_{self.gym_index}')
        if badge and t > 0.3:
            scale = int(4 + 6 * min((t - 0.3) / 0.4, 1.0))
            scaled = pygame.transform.scale(badge, (badge.get_width() * scale, badge.get_height() * scale))
            bx = (SCREEN_WIDTH - scaled.get_width()) // 2
            by = 220
            surface.blit(scaled, (bx, by))

            badge_name = ["Energy Badge", "Communication Badge", "Logic Badge"][self.gym_index]
            badge_text = self.font_large.render(f"Received: {badge_name}!", True, UI_ACCENT)
            surface.blit(badge_text, ((SCREEN_WIDTH - badge_text.get_width()) // 2, 420))

        xp_text = self.font.render(f"+{XP_PER_GYM} XP", True, UI_HIGHLIGHT)
        surface.blit(xp_text, ((SCREEN_WIDTH - xp_text.get_width()) // 2, 470))

        if t >= 1.0:
            prompt = self.font.render("Press any key to continue", True, MID_GRAY)
            surface.blit(prompt, ((SCREEN_WIDTH - prompt.get_width()) // 2, 530))
