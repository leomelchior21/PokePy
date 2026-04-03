"""Touch-friendly virtual controls for browser play."""

from dataclasses import dataclass

import pygame

from src.settings import (FONT_SIZE_NORMAL, MID_GRAY, SCREEN_HEIGHT,
                          SCREEN_WIDTH, UI_ACCENT, UI_BORDER, UI_HIGHLIGHT,
                          UI_PANEL, UI_TEXT, WHITE)
from src.ui import get_font


class CombinedInput:
    """Merge physical keyboard state with virtual touch buttons."""

    def __init__(self, keyboard_state, virtual_keys):
        self.keyboard_state = keyboard_state
        self.virtual_keys = virtual_keys

    def __getitem__(self, key):
        return bool(self.keyboard_state[key] or key in self.virtual_keys)


@dataclass
class VirtualButton:
    key: int
    label: str
    rect: pygame.Rect
    hold: bool = False


class TouchControls:
    """Simple on-screen controls for the overworld."""

    def __init__(self):
        self.font = get_font(FONT_SIZE_NORMAL)
        self.small_font = get_font(14)
        self.enabled = False
        self._active_pointer = None
        self._pressed_keys = set()
        self.buttons = self._build_buttons()

    def _build_buttons(self):
        size = 56
        gap = 8
        left = 24
        bottom = SCREEN_HEIGHT - 24 - size
        center_x = left + size + gap
        center_y = bottom

        buttons = [
            VirtualButton(pygame.K_LEFT, "<", pygame.Rect(left, center_y, size, size), hold=True),
            VirtualButton(pygame.K_UP, "^", pygame.Rect(center_x, center_y - size - gap, size, size), hold=True),
            VirtualButton(pygame.K_DOWN, "v", pygame.Rect(center_x, center_y + size + gap, size, size), hold=True),
            VirtualButton(pygame.K_RIGHT, ">", pygame.Rect(center_x + size + gap, center_y, size, size), hold=True),
            VirtualButton(pygame.K_z, "Talk", pygame.Rect(SCREEN_WIDTH - 176, SCREEN_HEIGHT - 136, 72, 72)),
            VirtualButton(pygame.K_ESCAPE, "Menu", pygame.Rect(SCREEN_WIDTH - 96, SCREEN_HEIGHT - 96, 80, 48)),
        ]
        return buttons

    def set_enabled(self, enabled):
        if self.enabled == enabled:
            return
        self.enabled = enabled
        if not enabled:
            self._active_pointer = None
            self._pressed_keys.clear()

    def get_pressed_keys(self):
        return set(self._pressed_keys)

    def handle_event(self, event):
        if not self.enabled:
            return False

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            button = self._button_at(event.pos)
            if not button:
                return False
            if button.hold:
                self._active_pointer = button
                self._pressed_keys.add(button.key)
            else:
                self._post_key(button.key)
            return True

        if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self._active_pointer:
                self._pressed_keys.discard(self._active_pointer.key)
                self._active_pointer = None
                return True
            return False

        if event.type == pygame.MOUSEMOTION and self._active_pointer and any(event.buttons):
            button = self._button_at(event.pos)
            if button and button.hold:
                if button.key != self._active_pointer.key:
                    self._pressed_keys.discard(self._active_pointer.key)
                    self._active_pointer = button
                    self._pressed_keys.add(button.key)
                return True
            self._pressed_keys.discard(self._active_pointer.key)
            self._active_pointer = None
            return True

        return False

    def _button_at(self, pos):
        for button in reversed(self.buttons):
            if button.rect.collidepoint(pos):
                return button
        return None

    def _post_key(self, key):
        event = pygame.event.Event(pygame.KEYDOWN, {'key': key, 'unicode': ''})
        pygame.event.post(event)

    def draw(self, surface):
        if not self.enabled:
            return

        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        for button in self.buttons:
            pressed = button.key in self._pressed_keys
            fill = (*UI_PANEL, 190) if not pressed else (*UI_HIGHLIGHT, 210)
            border = UI_BORDER if not pressed else WHITE
            radius = min(button.rect.w, button.rect.h) // 2 if button.hold else 12
            pygame.draw.rect(overlay, fill, button.rect, border_radius=radius)
            pygame.draw.rect(overlay, border, button.rect, 2, border_radius=radius)

            font = self.small_font if len(button.label) > 1 else self.font
            label_color = UI_TEXT if not pressed else UI_ACCENT
            text = font.render(button.label, True, label_color)
            tx = button.rect.x + (button.rect.w - text.get_width()) // 2
            ty = button.rect.y + (button.rect.h - text.get_height()) // 2
            overlay.blit(text, (tx, ty))

        hint = self.small_font.render("Touch controls", True, MID_GRAY)
        overlay.blit(hint, (20, SCREEN_HEIGHT - 22))
        surface.blit(overlay, (0, 0))
