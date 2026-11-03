# Generates the rows of Route 1 (src/world/maps.ts). Run: python tools/maps/route1.py
W, H = 44, 40
g = [['.' for _ in range(W)] for _ in range(H)]

def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = c

def disc(cx, cy, r, c):
    for y in range(H):
        for x in range(W):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5:
                g[y][x] = c

# Border of trees.
rect(0, 0, W - 1, 0, 'T'); rect(0, H - 1, W - 1, H - 1, 'T'); rect(0, 0, 0, H - 1, 'T'); rect(W - 1, 0, W - 1, H - 1, 'T')

# ---- North bank (toward Echo Harbor)
rect(1, 1, 3, 2, 'T'); rect(26, 1, 29, 2, 'T'); rect(40, 1, 42, 3, 'T')
rect(4, 3, 11, 6, ','); rect(31, 4, 39, 8, ','); rect(12, 8, 17, 10, ',')
rect(1, 8, 4, 10, 'T'); rect(37, 9, 42, 10, 'T')
for x, y in [(8, 9), (34, 2), (15, 4), (29, 10)]: g[y][x] = 'f'

# ---- The river, with the bridge site in the middle.
rect(1, 12, W - 2, 14, '~')
rect(16, 11, 27, 11, 's'); rect(15, 15, 28, 15, 's')

# ---- West woods with two clearings.
rect(1, 16, 12, 34, 'T')
disc(6, 20, 3, '.'); disc(5, 29, 3, '.')
rect(3, 24, 13, 24, '.'); rect(9, 20, 13, 20, '.'); rect(5, 23, 6, 26, '.')
rect(2, 29, 3, 30, '~')
for x, y in [(6, 18), (4, 31)]: g[y][x] = 'f'

# ---- The middle meadows.
rect(14, 18, 19, 22, ','); rect(25, 19, 31, 23, ',')
rect(14, 26, 19, 26, 'L'); rect(24, 26, 31, 26, 'L')
rect(14, 30, 19, 33, ','); rect(25, 30, 31, 34, ',')

# ---- East: a copse and a pond.
rect(35, 16, 42, 19, 'T'); rect(39, 20, 42, 24, 'T')
rect(36, 27, 40, 30, '~')
for x, y in [(33, 22), (38, 33), (34, 36), (13, 36)]: g[y][x] = 'f'

# ---- South: little groves by the entrance.
rect(16, 35, 17, 36, 'T'); rect(26, 35, 27, 36, 'T'); rect(1, 35, 6, 38, 'T'); rect(38, 35, 42, 38, 'T')

# The main path from Vila Maker (south) to Echo Harbor (north), and the bridge.
for y in range(H):
    for x in (21, 22):
        g[y][x] = ':'
for y in (12, 13, 14):
    for x in (21, 22):
        g[y][x] = 'b'

rows = [''.join(r) for r in g]
for r in rows:
    assert len(r) == W
print(',\n'.join(f"    '{r}'" for r in rows))
