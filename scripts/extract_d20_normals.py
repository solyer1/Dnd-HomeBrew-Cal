import bpy
import bmesh
import json

bpy.ops.wm.read_factory_settings(use_empty=True)
glb_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models\d20_black_hole_gold.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

o = bpy.data.objects['D20_BlackHole_Gold_Web']
obs_faces = [f for f in o.data.polygons if f.material_index == 1 and f.area > 0.5]

face_indices_to_values = {
    0: 19,
    1: 20,
    2: 16,
    3: 18,
    4: 17,
    5: 15,
    6: 14,
    7: 13,
    8: 12,
    9: 11,
    10: 1,
    11: 2,
    12: 3,
    13: 4,
    14: 5,
    15: 6,
    16: 7,
    17: 8,
    18: 9,
    19: 10
}

d20_gltf_normals = {}

print("="*60)
print("D20 GROUND TRUTH FACE NORMALS:")
print("="*60)

for idx, f in enumerate(obs_faces):
    val = face_indices_to_values[idx]
    # Blender normal:
    bn = f.normal
    # glTF normal:
    # gx = bx, gy = bz, gz = -by
    gx = round(bn.x, 4)
    gy = round(bn.z, 4)
    gz = round(-bn.y, 4)
    d20_gltf_normals[val] = [gx, gy, gz]
    print(f"Face {val:2d} (idx {idx:2d}): Blender=({bn.x:7.4f}, {bn.y:7.4f}, {bn.z:7.4f}) -> glTF=({gx:7.4f}, {gy:7.4f}, {gz:7.4f})")

# Check opposites on D20 (on a standard D20, opposite faces sum to 21)
print("\nChecking opposite pairs (val + opp = 21?):")
for val in range(1, 21):
    n = d20_gltf_normals[val]
    # Find most opposite face in d20_gltf_normals
    best_opp = None
    min_dot = 1.0
    for v2, n2 in d20_gltf_normals.items():
        dot = n[0]*n2[0] + n[1]*n2[1] + n[2]*n2[2]
        if dot < min_dot:
            min_dot = dot
            best_opp = v2
    print(f"Face {val:2d} dot with Face {best_opp:2d} = {min_dot:.4f} (Sum: {val + best_opp})")

with open(r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\d20_truth_normals.json", "w") as out:
    json.dump(d20_gltf_normals, out, indent=2)
