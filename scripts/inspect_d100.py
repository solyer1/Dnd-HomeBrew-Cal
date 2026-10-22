import bpy
import bmesh
import json

bpy.ops.wm.read_factory_settings(use_empty=True)

glb_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models\d100_black_hole_gold.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
print(f"Found {len(mesh_objs)} mesh objects in D100")
for o in mesh_objs:
    print(f"Object: {o.name}, Polygons: {len(o.data.polygons)}")
    for i, m in enumerate(o.data.materials):
        print(f"  Mat {i}: {m.name if m else 'None'}")
    
    mat_counts = {}
    for p in o.data.polygons:
        mat_counts[p.material_index] = mat_counts.get(p.material_index, 0) + 1
    print("  Polygon count by mat index:", mat_counts)
