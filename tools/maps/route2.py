# Generates the rows of Route 2 (src/world/maps.ts). Run: python tools/maps/route2.py --show to preview with coordinates.
import sys
W, H = 48, 36
g = [['.' for _ in range(W)] for _ in range(H)]

def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = c

def put(points, c):
    for x, y in points:
        g[y][x] = c

# Border of trees.
rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T')

# ---- The plateau (north), where Boxford is.
rect(1, 1, 6, 2, 'T'); rect(12, 1, 15, 1, 'T'); rect(40, 1, 46, 3, 'T'); rect(44, 4, 46, 4, 'T')
rect(42, 9, 46, 11, 'T'); rect(1, 9, 2, 11, 'T')
rect(8, 3, 14, 5, ','); rect(20, 2, 27, 4, ','); rect(34, 9, 40, 11, ',')
rect(16, 8, 19, 9, '~'); put([(17, 10), (18, 10)], '~')
rect(4, 5, 8, 6, 'M')  # a rocky outcrop on the plateau
put([(9, 6), (3, 7), (24, 9), (37, 5)], 'r')
put([(10, 8), (22, 6), (35, 3), (27, 10), (5, 3)], 'f')

# ---- The cliff: a wall of rock from side to side, 4 or 5 tiles tall, with a ragged top and foot.
tops = [12, 12, 11, 11, 12, 12, 12, 11, 11, 11, 12, 12, 12, 12, 11, 11, 12, 12, 12, 12, 12, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 11, 11, 11, 12, 12, 12, 12, 11, 11, 12, 12, 12, 12]
foots = [15, 15, 15, 16, 16, 15, 15, 15, 15, 16, 16, 16, 15, 15, 15, 15, 15, 16, 16, 15, 15, 15, 15, 15, 16, 16, 15, 15, 15, 15, 15, 15, 15, 15, 16, 16, 15, 15, 15, 15, 16, 16, 15, 15, 15, 15, 15, 15]
for x in range(1, W - 1):
    for y in range(tops[x], foots[x] + 1):
        g[y][x] = 'M'
# The tower site: where the old stairs stood, two tiles wide, the whole height of the wall.
for y in range(12, 16):
    for x in (30, 31):
        g[y][x] = 'h'

# ---- The lowland (south), from Echo Harbor.
rect(1, 17, 3, 22, 'T'); rect(1, 27, 9, 34, 'T'); rect(4, 31, 6, 32, '.'); rect(5, 27, 5, 30, '.')
rect(10, 19, 15, 21, '~'); put([(11, 18), (12, 18), (13, 18), (11, 22), (12, 22), (13, 22), (14, 22)], '~')
rect(18, 18, 25, 20, ','); rect(16, 28, 24, 31, ','); rect(34, 27, 39, 31, ',')
rect(41, 17, 46, 34, 'T'); rect(38, 32, 40, 34, 'T'); rect(36, 17, 38, 19, 'T')
rect(12, 33, 16, 34, 'T'); rect(26, 33, 29, 34, 'T')
put([(14, 17), (23, 17), (35, 17), (27, 22)], 'r')
put([(7, 25), (20, 23), (33, 26), (26, 30), (13, 27)], 'f')

# The main path: in from the west, then north to the foot of the cliff; on top, north and east to Boxford.
rect(0, 24, 31, 25, ':')
rect(30, 16, 31, 25, ':')
rect(30, 6, 31, 11, ':')
rect(30, 6, W - 1, 7, ':')

rows = [''.join(r) for r in g]
for r in rows:
    assert len(r) == W
if '--show' in sys.argv:
    print('   ' + ''.join(str(x % 10) for x in range(W)))
    for y, r in enumerate(rows):
        print(f'{y:2} {r}')
else:
    print(',\n'.join(f"    '{r}'" for r in rows))
