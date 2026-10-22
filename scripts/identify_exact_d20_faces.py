import bpy
import bmesh
import mathutils
import json

bpy.ops.wm.open_mainfile(filepath=r"models_blend\d20_black_hole_gold.blend")
obj = bpy.data.objects['D20_BlackHole_Gold']

# Find the 20 main facet panels (material 1, Obsidian_Black)
bm = bmesh.new()
bm.from_mesh(obj.data)

# Facets with material 1 and large area
facet_faces = [f for f in bm.faces if f.material_index == 1 and f.calc_area() > 0.4]
print(f"Found {len(facet_faces)} large obsidian facets")

# Find numeral clusters (material 3)
num_faces = [f for f in bm.faces if f.material_index == 3]

# For each facet, find its center and normal in Blender and glTF
facets_info = []
for idx, f in enumerate(facet_faces):
    c = f.calc_center_median()
    n = f.normal.copy().normalized()
    # Find all numeral faces near this facet (within 0.6 distance)
    cluster = [nf for nf in num_faces if (nf.calc_center_median() - c).length < 0.6]
    # glTF coordinates: gx = bx, gy = bz, gz = -by
    gx = round(n.x, 4)
    gy = round(n.z, 4)
    gz = round(-n.y, 4)
    facets_info.append({
        'idx': idx,
        'blender_center': [round(c.x, 4), round(c.y, 4), round(c.z, 4)],
        'blender_normal': [round(n.x, 4), round(n.y, 4), round(n.z, 4)],
        'gltf_normal': [gx, gy, gz],
        'num_faces_count': len(cluster)
    })

print(json.dumps(facets_info, indent=2))
bm.free()
