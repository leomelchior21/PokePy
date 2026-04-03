"""Copy the latest pygbag web build into the tracked web/ deploy directory."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "build" / "web"
TARGET = ROOT / "web"


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing build output: {SOURCE}")

    if TARGET.exists():
        shutil.rmtree(TARGET)

    shutil.copytree(SOURCE, TARGET)
    print(f"Exported web bundle to {TARGET}")


if __name__ == "__main__":
    main()
