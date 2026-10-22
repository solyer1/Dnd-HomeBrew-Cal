import json
import math
import os

normals_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\src\components\dice3d\diceNormalsMap.json"
d20_truth_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\d20_truth_normals.json"
d100_truth_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\d100_truth_normals.json"

with open(normals_path, "r") as f:
    orig_map = json.load(f)

with open(d20_truth_path, "r") as f:
    d20_truth = json.load(f)

with open(d100_truth_path, "r") as f:
    d100_truth = json.load(f)

accurate_map = {}

# Convert Blender (bx, by, bz) -> glTF (bx, bz, -by)
def b2g(vec):
    bx, by, bz = vec[0], vec[1], vec[2]
    gx = bx
    gy = bz
    gz = -by
    # normalize
    mag = math.sqrt(gx*gx + gy*gy + gz*gz)
    if mag > 1e-6:
        gx /= mag
        gy /= mag
        gz /= mag
    return [round(gx, 4), round(gy, 4), round(gz, 4)]

all_dice = [
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
    'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19',
    'D20', 'D100'
]

for die in all_dice:
    if die == 'D20':
        accurate_map['D20'] = {str(k): [round(x, 4) for x in v] for k, v in d20_truth.items()}
    elif die == 'D100':
        accurate_map['D100'] = {str(k): [round(x, 4) for x in v] for k, v in d100_truth.items()}
    else:
        die_faces = orig_map.get(die, {})
        new_faces = {}
        for val_str, b_vec in die_faces.items():
            new_faces[val_str] = b2g(b_vec)
        accurate_map[die] = new_faces

# Write to diceNormalsMap.json
with open(normals_path, "w") as f:
    json.dump(accurate_map, f, indent=2)

print(f"[OK] Master accurate normals written to {normals_path}")
for die in all_dice:
    print(f"  {die}: {len(accurate_map.get(die, {}))} faces")
