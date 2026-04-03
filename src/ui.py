"""PokePy: Aurora Archipelago - UI Components"""

import pygame
from src.settings import *


def get_font(size, mono=False):
    """Get a font, preferring system monospace for code."""
    if mono:
        for name in ['Consolas', 'Courier New', 'Courier', 'monospace']:
            try:
                return pygame.font.SysFont(name, size)
            except Exception:
                continue
    for name in ['Segoe UI', 'Arial', 'Helvetica', None]:
        try:
            return pygame.font.SysFont(name, size)
        except Exception:
            continue
    return pygame.font.Font(None, size)


class TextBox:
    """Dialogue box for NPC conversations and messages."""

    def __init__(self, screen_w, screen_h):
        self.font = get_font(FONT_SIZE_NORMAL)
        self.w = screen_w - 40
        self.h = 100
        self.x = 20
        self.y = screen_h - self.h - 20
        self.lines = []
        self.page_index = 0
        self.pages = []
        self.active = False
        self.speaker = ""
        self.char_index = 0
        self.char_timer = 0
        self.char_speed = 2  # chars per frame
        self.finished_page = False

    def show(self, texts, speaker=""):
        """Start showing a list of text strings as pages."""
        self.pages = texts if isinstance(texts, list) else [texts]
        self.page_index = 0
        self.speaker = speaker
        self.active = True
        self.char_index = 0
        self.char_timer = 0
        self.finished_page = False

    def advance(self):
        """Advance to next page or close if done. Returns True if still active."""
        if not self.finished_page:
            self.char_index = 9999
            self.finished_page = True
            return True
        self.page_index += 1
        if self.page_index >= len(self.pages):
            self.active = False
            return False
        self.char_index = 0
        self.finished_page = False
        return True

    def update(self):
        if not self.active or self.finished_page:
            return
        self.char_timer += 1
        if self.char_timer >= 1:
            self.char_timer = 0
            self.char_index += self.char_speed
            current_text = self.pages[self.page_index]
            if self.char_index >= len(current_text):
                self.finished_page = True

    def draw(self, surface):
        if not self.active:
            return
        # Background
        box_rect = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surface, UI_PANEL, box_rect, border_radius=8)
        pygame.draw.rect(surface, UI_BORDER, box_rect, 2, border_radius=8)

        # Speaker name
        y_off = self.y + 8
        if self.speaker:
            name_surf = self.font.render(self.speaker, True, UI_ACCENT)
            surface.blit(name_surf, (self.x + 12, y_off))
            y_off += 22

        # Text with typewriter effect
        if self.page_index < len(self.pages):
            text = self.pages[self.page_index][:self.char_index]
            words = text.split('\n')
            for line in words:
                if line:
                    txt_surf = self.font.render(line, True, UI_TEXT)
                    surface.blit(txt_surf, (self.x + 12, y_off))
                y_off += 20

        # Continue indicator
        if self.finished_page:
            indicator = ">>> Tap / Z to continue" if self.page_index < len(self.pages) - 1 else ">>> Tap / Z to close"
            ind_surf = self.font.render(indicator, True, UI_HIGHLIGHT)
            surface.blit(ind_surf, (self.x + self.w - ind_surf.get_width() - 12, self.y + self.h - 22))


class Menu:
    """Selection menu (for choosing options)."""

    def __init__(self, x, y, options, font_size=FONT_SIZE_NORMAL):
        self.font = get_font(font_size)
        self.options = options
        self.selected = 0
        self.x = x
        self.y = y
        self.padding = 12
        self.line_height = font_size + 8
        self.w = max(self.font.size(opt)[0] for opt in options) + self.padding * 3
        self.h = len(options) * self.line_height + self.padding * 2
        self.active = True

    def handle_input(self, key):
        if key == pygame.K_UP:
            self.selected = (self.selected - 1) % len(self.options)
        elif key == pygame.K_DOWN:
            self.selected = (self.selected + 1) % len(self.options)
        elif key in (pygame.K_RETURN, pygame.K_z):
            return self.selected
        return None

    def handle_mouse(self, pos, clicked=False):
        for i in range(len(self.options)):
            rect = self._option_rect(i)
            if rect.collidepoint(pos):
                self.selected = i
                if clicked:
                    return i
                break
        return None

    def _option_rect(self, index):
        y = self.y + self.padding + index * self.line_height
        return pygame.Rect(self.x + 4, y - 2, self.w - 8, self.line_height)

    def draw(self, surface):
        box = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surface, UI_PANEL, box, border_radius=6)
        pygame.draw.rect(surface, UI_BORDER, box, 2, border_radius=6)

        for i, opt in enumerate(self.options):
            color = UI_HIGHLIGHT if i == self.selected else UI_TEXT
            y = self.y + self.padding + i * self.line_height
            if i == self.selected:
                sel_rect = self._option_rect(i)
                pygame.draw.rect(surface, (50, 60, 80), sel_rect, border_radius=4)
                arrow = self.font.render(">", True, UI_HIGHLIGHT)
                surface.blit(arrow, (self.x + 8, y))
            txt = self.font.render(opt, True, color)
            surface.blit(txt, (self.x + self.padding + 14, y))


class HUD:
    """Heads-up display showing XP, badges, current PyMon."""

    def __init__(self):
        self.font = get_font(FONT_SIZE_SMALL)
        self.visible = True

    def draw(self, surface, player_data, sprites):
        if not self.visible:
            return
        # XP bar
        bar_w = 150
        bar_h = 16
        x, y = 10, 10
        pygame.draw.rect(surface, UI_PANEL, (x - 2, y - 2, bar_w + 4, bar_h + 4), border_radius=4)
        pygame.draw.rect(surface, DARK_GRAY, (x, y, bar_w, bar_h), border_radius=3)

        xp = player_data.get('xp', 0)
        next_threshold = XP_GYM1_UNLOCK
        for t in [XP_GYM1_UNLOCK, XP_GYM2_UNLOCK, XP_GYM3_UNLOCK, 500]:
            if xp < t:
                next_threshold = t
                break
        fill = min(xp / max(next_threshold, 1), 1.0)
        if fill > 0:
            pygame.draw.rect(surface, UI_HIGHLIGHT, (x, y, int(bar_w * fill), bar_h), border_radius=3)

        xp_text = self.font.render(f"XP: {xp}", True, WHITE)
        surface.blit(xp_text, (x + 4, y + 1))

        # Badges
        bx = x + bar_w + 20
        badge_label = self.font.render("Badges:", True, UI_TEXT)
        surface.blit(badge_label, (bx, y))
        for i in range(3):
            badge_x = bx + 60 + i * 30
            if i < len(player_data.get('badges', [])):
                badge_sprite = sprites.get(f'badge_{i}')
                if badge_sprite:
                    surface.blit(badge_sprite, (badge_x, y - 4))
            else:
                pygame.draw.circle(surface, MID_GRAY, (badge_x + 12, y + 8), 10, 2)

        # Current PyMon mini info
        pymon = player_data.get('active_pymon')
        if pymon:
            px = SCREEN_WIDTH - 180
            pygame.draw.rect(surface, UI_PANEL, (px - 4, y - 2, 174, bar_h + 20), border_radius=4)
            name_text = self.font.render(f"{pymon['name']} Lv.{pymon['level']}", True, UI_ACCENT)
            surface.blit(name_text, (px + 4, y))
            # Mini HP bar
            hp_fill = pymon['hp'] / max(pymon['max_hp'], 1)
            pygame.draw.rect(surface, DARK_GRAY, (px + 4, y + 16, 100, 6), border_radius=2)
            hp_color = UI_HIGHLIGHT if hp_fill > 0.5 else UI_WARNING if hp_fill > 0.25 else UI_ERROR
            pygame.draw.rect(surface, hp_color, (px + 4, y + 16, int(100 * hp_fill), 6), border_radius=2)


class CodeEditor:
    """Interactive code editor for battle/gym coding challenges."""

    def __init__(self, x, y, w, h):
        self.font = get_font(FONT_SIZE_CODE, mono=True)
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.lines = ['']
        self.cursor_row = 0
        self.cursor_col = 0
        self.cursor_blink = 0
        self.scroll_offset = 0
        self.line_height = FONT_SIZE_CODE + 4
        self.toolbar_height = 28
        self.max_visible = max(1, (h - 20 - self.toolbar_height) // self.line_height)
        self.active = True
        self.highlight_line = -1  # for step-through
        self.read_only = False
        self.toolbar_specs = [
            ("Tab", "tab"),
            ("Bksp", "backspace"),
            ("Enter", "enter"),
            ("Left", "left"),
            ("Right", "right"),
            ("Up", "up"),
            ("Down", "down"),
        ]
        self.toolbar_rects = []
        self._layout_toolbar()

    def _layout_toolbar(self):
        self.toolbar_rects = []
        x = self.x + 8
        y = self.y + 6
        for label, command in self.toolbar_specs:
            width = max(48, self.font.size(label)[0] + 18)
            rect = pygame.Rect(x, y, width, self.toolbar_height - 8)
            self.toolbar_rects.append((command, rect, label))
            x += width + 6

    def set_code(self, code):
        self.lines = code.split('\n') if code else ['']
        self.cursor_row = len(self.lines) - 1
        self.cursor_col = len(self.lines[-1])
        self.scroll_offset = max(0, self.cursor_row - self.max_visible + 1)

    def get_code(self):
        return '\n'.join(self.lines)

    def get_text_input_rect(self):
        return pygame.Rect(self.x + 40, self.y + self.toolbar_height + 8, self.w - 48, self.h - self.toolbar_height - 16)

    def insert_text(self, text):
        """Insert text at cursor, handling newlines."""
        if self.read_only:
            return
        for ch in text:
            if ch == '\n':
                # Split line at cursor
                rest = self.lines[self.cursor_row][self.cursor_col:]
                self.lines[self.cursor_row] = self.lines[self.cursor_row][:self.cursor_col]
                self.cursor_row += 1
                self.lines.insert(self.cursor_row, rest)
                self.cursor_col = 0
            else:
                line = self.lines[self.cursor_row]
                self.lines[self.cursor_row] = line[:self.cursor_col] + ch + line[self.cursor_col:]
                self.cursor_col += 1
        self._ensure_visible()

    def handle_text(self, text):
        if self.read_only or not text:
            return
        self.insert_text(text.replace('\r', ''))

    def handle_key(self, event):
        if self.read_only:
            return
        if event.key == pygame.K_BACKSPACE:
            if self.cursor_col > 0:
                line = self.lines[self.cursor_row]
                self.lines[self.cursor_row] = line[:self.cursor_col - 1] + line[self.cursor_col:]
                self.cursor_col -= 1
            elif self.cursor_row > 0:
                self.cursor_col = len(self.lines[self.cursor_row - 1])
                self.lines[self.cursor_row - 1] += self.lines[self.cursor_row]
                self.lines.pop(self.cursor_row)
                self.cursor_row -= 1
        elif event.key == pygame.K_DELETE:
            line = self.lines[self.cursor_row]
            if self.cursor_col < len(line):
                self.lines[self.cursor_row] = line[:self.cursor_col] + line[self.cursor_col + 1:]
            elif self.cursor_row < len(self.lines) - 1:
                self.lines[self.cursor_row] += self.lines[self.cursor_row + 1]
                self.lines.pop(self.cursor_row + 1)
        elif event.key == pygame.K_RETURN:
            self.insert_text('\n')
            # Auto-indent after colon
            prev_line = self.lines[self.cursor_row - 1] if self.cursor_row > 0 else ''
            indent = len(prev_line) - len(prev_line.lstrip())
            if prev_line.rstrip().endswith(':'):
                indent += 4
            if indent > 0:
                self.insert_text(' ' * indent)
        elif event.key == pygame.K_LEFT:
            if self.cursor_col > 0:
                self.cursor_col -= 1
            elif self.cursor_row > 0:
                self.cursor_row -= 1
                self.cursor_col = len(self.lines[self.cursor_row])
        elif event.key == pygame.K_RIGHT:
            if self.cursor_col < len(self.lines[self.cursor_row]):
                self.cursor_col += 1
            elif self.cursor_row < len(self.lines) - 1:
                self.cursor_row += 1
                self.cursor_col = 0
        elif event.key == pygame.K_UP:
            if self.cursor_row > 0:
                self.cursor_row -= 1
                self.cursor_col = min(self.cursor_col, len(self.lines[self.cursor_row]))
        elif event.key == pygame.K_DOWN:
            if self.cursor_row < len(self.lines) - 1:
                self.cursor_row += 1
                self.cursor_col = min(self.cursor_col, len(self.lines[self.cursor_row]))
        elif event.key == pygame.K_HOME:
            self.cursor_col = 0
        elif event.key == pygame.K_END:
            self.cursor_col = len(self.lines[self.cursor_row])
        elif event.key == pygame.K_TAB:
            self.insert_text('    ')
        self._ensure_visible()

    def apply_command(self, command):
        key_map = {
            'tab': pygame.K_TAB,
            'backspace': pygame.K_BACKSPACE,
            'enter': pygame.K_RETURN,
            'left': pygame.K_LEFT,
            'right': pygame.K_RIGHT,
            'up': pygame.K_UP,
            'down': pygame.K_DOWN,
        }
        key = key_map.get(command)
        if key is None:
            return False
        fake_event = pygame.event.Event(pygame.KEYDOWN, {'key': key, 'unicode': ''})
        self.handle_key(fake_event)
        return True

    def _ensure_visible(self):
        if self.cursor_row < self.scroll_offset:
            self.scroll_offset = self.cursor_row
        elif self.cursor_row >= self.scroll_offset + self.max_visible:
            self.scroll_offset = self.cursor_row - self.max_visible + 1

    def handle_mouse(self, pos, clicked=False):
        if not clicked:
            return False

        for command, rect, _label in self.toolbar_rects:
            if rect.collidepoint(pos):
                self.active = True
                return self.apply_command(command)

        editor_rect = self.get_text_input_rect()
        if not editor_rect.collidepoint(pos):
            self.active = False
            return False

        self.active = True
        gutter_w = 35
        text_x = self.x + gutter_w + 4
        text_y = self.y + self.toolbar_height + 8
        local_y = pos[1] - text_y
        row = self.scroll_offset + max(0, min(self.max_visible - 1, local_y // self.line_height))
        row = max(0, min(row, len(self.lines) - 1))

        line = self.lines[row]
        rel_x = max(0, pos[0] - text_x)
        col = 0
        for i in range(len(line) + 1):
            width = self.font.size(line[:i])[0]
            if width >= rel_x:
                col = i
                break
            col = i

        self.cursor_row = row
        self.cursor_col = col
        self._ensure_visible()
        return True

    def _syntax_color(self, text):
        """Simple syntax coloring - returns list of (text, color) segments."""
        keywords = {'print', 'if', 'else', 'elif', 'for', 'while', 'def', 'return',
                    'True', 'False', 'None', 'and', 'or', 'not', 'in', 'str', 'int'}
        segments = []
        i = 0
        while i < len(text):
            # String literals
            if text[i] in ('"', "'"):
                quote = text[i]
                j = i + 1
                while j < len(text) and text[j] != quote:
                    j += 1
                j = min(j + 1, len(text))
                segments.append((text[i:j], LIGHT_GREEN))
                i = j
            # Numbers
            elif text[i].isdigit():
                j = i
                while j < len(text) and text[j].isdigit():
                    j += 1
                segments.append((text[i:j], SOLAR_YELLOW))
                i = j
            # Words (check for keywords)
            elif text[i].isalpha() or text[i] == '_':
                j = i
                while j < len(text) and (text[j].isalnum() or text[j] == '_'):
                    j += 1
                word = text[i:j]
                if word in keywords:
                    segments.append((word, CORAL))
                else:
                    segments.append((word, UI_TEXT))
                i = j
            # Operators
            elif text[i] in '=<>!+-*/%':
                segments.append((text[i], PINK))
                i += 1
            # Parentheses/brackets
            elif text[i] in '()[]{}':
                segments.append((text[i], LIGHT_BLUE))
                i += 1
            else:
                segments.append((text[i], UI_TEXT))
                i += 1
        return segments

    def draw(self, surface):
        # Background
        bg_rect = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surface, UI_CODE_BG, bg_rect, border_radius=6)
        pygame.draw.rect(surface, UI_BORDER, bg_rect, 2, border_radius=6)

        for _command, rect, label in self.toolbar_rects:
            pygame.draw.rect(surface, UI_PANEL, rect, border_radius=4)
            pygame.draw.rect(surface, UI_BORDER, rect, 1, border_radius=4)
            txt = self.font.render(label, True, UI_TEXT)
            tx = rect.x + (rect.w - txt.get_width()) // 2
            ty = rect.y + (rect.h - txt.get_height()) // 2
            surface.blit(txt, (tx, ty))

        # Clip to editor area
        clip = pygame.Rect(self.x + 2, self.y + self.toolbar_height + 2, self.w - 4, self.h - self.toolbar_height - 4)
        surface.set_clip(clip)

        gutter_w = 35
        text_x = self.x + gutter_w + 4
        text_y = self.y + self.toolbar_height + 8

        for i in range(min(self.max_visible, len(self.lines) - self.scroll_offset)):
            line_idx = i + self.scroll_offset
            if line_idx >= len(self.lines):
                break
            y = text_y + i * self.line_height

            # Highlight current step-through line
            if line_idx == self.highlight_line:
                hl_rect = pygame.Rect(self.x + gutter_w, y - 2, self.w - gutter_w - 4, self.line_height)
                pygame.draw.rect(surface, UI_LINE_HIGHLIGHT, hl_rect)

            # Line number
            ln_text = self.font.render(str(line_idx + 1), True, MID_GRAY)
            surface.blit(ln_text, (self.x + 6, y))

            # Gutter separator
            pygame.draw.line(surface, UI_BORDER, (self.x + gutter_w, self.y + self.toolbar_height + 4),
                           (self.x + gutter_w, self.y + self.h - 4), 1)

            # Syntax-colored text
            line = self.lines[line_idx]
            cx = text_x
            for seg_text, seg_color in self._syntax_color(line):
                seg_surf = self.font.render(seg_text, True, seg_color)
                surface.blit(seg_surf, (cx, y))
                cx += seg_surf.get_width()

            # Cursor
            if self.active and line_idx == self.cursor_row and not self.read_only:
                self.cursor_blink = (self.cursor_blink + 1) % 60
                if self.cursor_blink < 40:
                    cursor_x = text_x + self.font.size(line[:self.cursor_col])[0]
                    pygame.draw.rect(surface, UI_CURSOR, (cursor_x, y - 1, 2, self.line_height))

        surface.set_clip(None)


class CompletionBar:
    """Smart Code Completion bar with clickable suggestions."""

    def __init__(self, x, y, w, h=36):
        self.font = get_font(FONT_SIZE_SMALL, mono=True)
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.suggestions = []
        self.button_rects = []
        self.hovered = -1

    def set_suggestions(self, suggestions):
        self.suggestions = suggestions
        self._layout()

    def _layout(self):
        self.button_rects = []
        x = self.x + 8
        for s in self.suggestions:
            text_w = self.font.size(s)[0] + 16
            self.button_rects.append(pygame.Rect(x, self.y + 4, text_w, self.h - 8))
            x += text_w + 6

    def handle_mouse(self, pos, clicked=False):
        """Returns suggestion text if clicked, None otherwise."""
        self.hovered = -1
        for i, rect in enumerate(self.button_rects):
            if rect.collidepoint(pos):
                self.hovered = i
                if clicked:
                    return self.suggestions[i]
        return None

    def draw(self, surface):
        # Background bar
        bar_rect = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surface, UI_COMPLETION_BG, bar_rect, border_radius=4)
        pygame.draw.rect(surface, UI_BORDER, bar_rect, 1, border_radius=4)

        # Label
        label = self.font.render(">>", True, UI_ACCENT)
        surface.blit(label, (self.x + 4, self.y + 10))

        for i, (suggestion, rect) in enumerate(zip(self.suggestions, self.button_rects)):
            bg_color = UI_COMPLETION_HOVER if i == self.hovered else UI_PANEL
            pygame.draw.rect(surface, bg_color, rect, border_radius=4)
            pygame.draw.rect(surface, UI_BORDER, rect, 1, border_radius=4)
            # Show display text (replace newline/spaces for display)
            display = suggestion.replace('\n', '\\n').replace('    ', 'TAB')
            txt = self.font.render(display, True, UI_TEXT)
            surface.blit(txt, (rect.x + 8, rect.y + 4))


class Button:
    """Simple clickable button."""

    def __init__(self, x, y, w, h, text, font_size=FONT_SIZE_NORMAL):
        self.font = get_font(font_size)
        self.rect = pygame.Rect(x, y, w, h)
        self.text = text
        self.hovered = False
        self.active = True

    def handle_mouse(self, pos, clicked=False):
        self.hovered = self.rect.collidepoint(pos)
        if self.hovered and clicked and self.active:
            return True
        return False

    def draw(self, surface):
        color = UI_BUTTON_HOVER if self.hovered else UI_BUTTON
        if not self.active:
            color = MID_GRAY
        pygame.draw.rect(surface, color, self.rect, border_radius=6)
        pygame.draw.rect(surface, UI_BORDER, self.rect, 2, border_radius=6)
        txt = self.font.render(self.text, True, WHITE)
        tx = self.rect.x + (self.rect.w - txt.get_width()) // 2
        ty = self.rect.y + (self.rect.h - txt.get_height()) // 2
        surface.blit(txt, (tx, ty))


class InputField:
    """Text input field for player name entry."""

    def __init__(self, x, y, w, h, placeholder="", max_len=16):
        self.font = get_font(FONT_SIZE_LARGE)
        self.rect = pygame.Rect(x, y, w, h)
        self.text = ""
        self.placeholder = placeholder
        self.max_len = max_len
        self.active = True
        self.cursor_blink = 0

    def handle_key(self, event):
        if not self.active:
            return
        if event.key == pygame.K_BACKSPACE:
            self.text = self.text[:-1]
        elif event.key == pygame.K_RETURN:
            return self.text if self.text.strip() else None
        return None

    def handle_text(self, text):
        if not self.active or not text:
            return
        for ch in text:
            if ch.isprintable() and len(self.text) < self.max_len:
                self.text += ch

    def handle_mouse(self, pos, clicked=False):
        if not clicked:
            return False
        self.active = self.rect.collidepoint(pos)
        return self.active

    def get_text_input_rect(self):
        return self.rect

    def draw(self, surface):
        pygame.draw.rect(surface, UI_CODE_BG, self.rect, border_radius=6)
        pygame.draw.rect(surface, UI_HIGHLIGHT if self.active else UI_BORDER, self.rect, 2, border_radius=6)

        display = self.text if self.text else self.placeholder
        color = UI_TEXT if self.text else MID_GRAY
        txt = self.font.render(display, True, color)
        surface.blit(txt, (self.rect.x + 12, self.rect.y + (self.rect.h - txt.get_height()) // 2))

        # Cursor
        if self.active:
            self.cursor_blink = (self.cursor_blink + 1) % 60
            if self.cursor_blink < 40 and self.text:
                cx = self.rect.x + 12 + self.font.size(self.text)[0] + 2
                cy = self.rect.y + 8
                pygame.draw.rect(surface, UI_CURSOR, (cx, cy, 2, self.rect.h - 16))


class StepThroughDisplay:
    """Visual display for step-through code execution."""

    def __init__(self, x, y, w, h):
        self.font = get_font(FONT_SIZE_SMALL, mono=True)
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.variables = {}  # current variable state
        self.output_lines = []
        self.current_line = -1
        self.total_lines = 0
        self.status = ""  # "running", "success", "error"
        self.error_msg = ""

    def reset(self):
        self.variables = {}
        self.output_lines = []
        self.current_line = -1
        self.status = ""
        self.error_msg = ""

    def draw(self, surface):
        bg = pygame.Rect(self.x, self.y, self.w, self.h)
        pygame.draw.rect(surface, UI_PANEL, bg, border_radius=6)
        pygame.draw.rect(surface, UI_BORDER, bg, 1, border_radius=6)

        y = self.y + 8

        # Status header
        if self.status == "running":
            status_color = SOLAR_YELLOW
            status_text = f"Executing line {self.current_line + 1}/{self.total_lines}..."
        elif self.status == "success":
            status_color = UI_HIGHLIGHT
            status_text = "Code executed successfully!"
        elif self.status == "error":
            status_color = UI_ERROR
            status_text = "Error!"
        else:
            status_color = UI_TEXT
            status_text = "Ready"

        header = self.font.render(status_text, True, status_color)
        surface.blit(header, (self.x + 8, y))
        y += 20

        # Variables panel
        if self.variables:
            var_label = self.font.render("Variables:", True, UI_ACCENT)
            surface.blit(var_label, (self.x + 8, y))
            y += 16
            for name, val in list(self.variables.items())[:6]:
                val_str = repr(val) if isinstance(val, str) else str(val)
                if len(val_str) > 30:
                    val_str = val_str[:27] + "..."
                vtext = self.font.render(f"  {name} = {val_str}", True, LIGHT_BLUE)
                surface.blit(vtext, (self.x + 8, y))
                y += 14
            y += 4

        # Output
        if self.output_lines:
            out_label = self.font.render("Output:", True, UI_ACCENT)
            surface.blit(out_label, (self.x + 8, y))
            y += 16
            for line in self.output_lines[-5:]:
                out_text = self.font.render(f"  {line}", True, LIGHT_GREEN)
                surface.blit(out_text, (self.x + 8, y))
                y += 14

        # Error message
        if self.error_msg:
            y = max(y, self.y + self.h - 40)
            err = self.font.render(self.error_msg[:60], True, UI_ERROR)
            surface.blit(err, (self.x + 8, y))
