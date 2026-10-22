import bpy
import bmesh
import mathutils
import json
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

glb_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models\d20_black_hole_gold.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
print(f"Found {len(mesh_objs)} mesh objects")

# The main die object
die_obj = None
for obj in mesh_objs:
    if "d20" in obj.name.lower() or len(obj.data.polygons) >= 20:
        die_obj = obj
        break

if not die_obj:
    die_obj = mesh_objs[0]

print(f"Using die object: {die_obj.name} with {len(die_obj.data.polygons)} polygons")

# Find the 20 main obsidian face normals
# In Blender, the glTF import gave us polygons. Let's inspect the polygons and their materials.
# In the rendering script, how were obs_faces selected?
obs_faces = []
for p in die_obj.data.polygons:
    # check material or area
    obs_faces.append(p)

print(f"Total polygons: {len(die_obj.data.polygons)}")

# Let's inspect the materials on die_obj
for idx, mat in enumerate(die_obj.data.materials):
    print(f"Material {idx}: {mat.name if mat else 'None'}")

# Group polygons by material or find the 20 largest/recessed faces
faces_by_mat = {}
for p in die_obj.data.polygons:
    faces_by_mat.setdefault(p.material_index, []).append(p)

for m_idx, plist in faces_by_mat.items():
    print(f"Mat {m_idx} ({die_obj.data.materials[m_idx].name if m_idx < len(die_obj.data.materials) else 'N/A'}): {len(plist)} polygons")

# Find the 20 faces that were rendered
# Let's check which polygons have area > threshold or correspond to the 20 facet panels
candidates = sorted(die_obj.data.polygons, key=lambda p: p.area, reverse=True)
print("Top 25 polygon areas:")
for i in range(min(25, len(candidates))):
    p = candidates[i]
    print(f"[{i}] Area: {p.area:.4f}, normal: ({p.normal.x:.4f}, {p.normal.y:.4f}, {p.normal.z:.4f}), mat: {p.material_index}")
