import bpy
import mathutils
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
glb = r"public\models\d20_black_hole_gold.glb"
bpy.ops.import_scene.gltf(filepath=glb)

obj = bpy.context.active_object or bpy.data.objects[0]
facets = [f for f in obj.data.polygons if f.material_index == 1 and f.area > 0.4]

out_dir = r"scripts\truth_faces"
os.makedirs(out_dir, exist_ok=True)

# Scene setup
scene = bpy.context.scene
scene.render.resolution_x = 300
scene.render.resolution_y = 300

# Add camera
cam_data = bpy.data.cameras.new("Cam")
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 1.4
cam_obj = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Add sun light
light_data = bpy.data.lights.new("Sun", type='SUN')
light_data.energy = 4.0
light_obj = bpy.data.objects.new("Sun", light_data)
scene.collection.objects.link(light_obj)

for idx, f in enumerate(facets):
    c = f.center
    n = f.normal.copy().normalized()
    
    # Position camera at c + n * 3.0, looking at c
    cam_obj.location = c + n * 3.0
    
    # Orientation: align cam +Z to -n, and cam +Y to reference up
    ref = mathutils.Vector((0, 0, 1))
    if abs(n.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 1, 0))
    up = (ref - n * n.dot(ref)).normalized()
    right = up.cross(n).normalized()
    
    # Rotation matrix: col 0 = right, col 1 = up, col 2 = n
    rot_mat = mathutils.Matrix([
        [right.x, up.x, n.x],
        [right.y, up.y, n.y],
        [right.z, up.z, n.z]
    ]).to_4x4()
    cam_obj.matrix_world = mathutils.Matrix.Translation(c + n * 3.0) @ rot_mat
    light_obj.matrix_world = cam_obj.matrix_world.copy()
    
    scene.render.filepath = os.path.join(out_dir, f"facet_{idx}.png")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered facet_{idx}.png: Blender Normal=({n.x:.4f}, {n.y:.4f}, {n.z:.4f})")

print("ALL 20 FACETS RENDERED TO scripts/truth_faces/")
