import bpy
import mathutils
import json

bpy.ops.wm.read_factory_settings(use_empty=True)
glb = r"public\models\d20_black_hole_gold.glb"
bpy.ops.import_scene.gltf(filepath=glb)

obj = bpy.context.active_object or bpy.data.objects[0]
print(f"Loaded object: {obj.name}")

# Facets with material index 1
facets = [f for f in obj.data.polygons if f.material_index == 1 and f.area > 0.4]
print(f"Found {len(facets)} facets with material 1")

# Numeral polygons (material index 3)
num_polys = [p for p in obj.data.polygons if p.material_index == 3]
print(f"Found {len(num_polys)} numeral polygons with material 3")

# Emblem polygons (material index 2)
sing_polys = [p for p in obj.data.polygons if p.material_index == 2]
print(f"Found {len(sing_polys)} singularity polygons with material 2")

for idx, f in enumerate(facets):
    c = f.center
    n = f.normal
    # glTF coordinates: gx = bx, gy = bz, gz = -by
    gx, gy, gz = round(n.x, 4), round(n.z, 4), round(-n.y, 4)
    # Check if singularity is near this face
    has_sing = any((p.center - c).length < 0.8 for p in sing_polys)
    # Count numeral polygons near this face
    nearby_nums = [p for p in num_polys if (p.center - c).length < 0.8]
    print(f"Facet {idx:2d}: Blender Center=({c.x:6.3f}, {c.y:6.3f}, {c.z:6.3f}), Normal=({n.x:6.3f}, {n.y:6.3f}, {n.z:6.3f}) -> glTF=({gx:7.4f}, {gy:7.4f}, {gz:7.4f}) | Singularity={has_sing}, NearbyNums={len(nearby_nums)}")
