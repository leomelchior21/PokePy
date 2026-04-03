"""PokePy: Aurora Archipelago - Entry Point"""

import sys
import os

# Ensure src is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.game import Game


def main():
    game = Game()
    game.run()


if __name__ == '__main__':
    main()
