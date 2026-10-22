import bpy
import bmesh
import mathutils
import math
import json
import os

print("="*60)
print("REMODELING MASTER ARTISAN D100 (100-HEDRON ANTIPODAL DUAL)")
print("="*60)

export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
blend_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
normals_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\src\components\dice3d\diceNormalsMap.json"

os.makedirs(export_dir, exist_ok=True)
os.makedirs(blend_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Materials
mat_gold = bpy.data.materials.new("Gold_Corner_Trim")
mat_gold.use_nodes = True
bg = mat_gold.node_tree.nodes.get("Principled BSDF")
if bg:
    bg.inputs["Base Color"].default_value = (1.0, 0.78, 0.24, 1.0)
    bg.inputs["Metallic"].default_value = 0.96
    bg.inputs["Roughness"].default_value = 0.14

mat_obsidian = bpy.data.materials.new("Obsidian_Black")
mat_obsidian.use_nodes = True
bo = mat_obsidian.node_tree.nodes.get("Principled BSDF")
if bo:
    bo.inputs["Base Color"].default_value = (0.012, 0.010, 0.016, 1.0)
    bo.inputs["Metallic"].default_value = 0.02
    bo.inputs["Roughness"].default_value = 0.28

mat_singularity = bpy.data.materials.new("Singularity_Void")
mat_singularity.use_nodes = True
bs = mat_singularity.node_tree.nodes.get("Principled BSDF")
if bs:
    bs.inputs["Base Color"].default_value = (0.001, 0.001, 0.002, 1.0)
    bs.inputs["Metallic"].default_value = 0.0
    bs.inputs["Roughness"].default_value = 0.02

mat_lavender = bpy.data.materials.new("Lavender_Numerals")
mat_lavender.use_nodes = True
bl = mat_lavender.node_tree.nodes.get("Principled BSDF")
if bl:
    bl.inputs["Base Color"].default_value = (0.78, 0.68, 0.95, 1.0)
    bl.inputs["Metallic"].default_value = 0.18
    bl.inputs["Roughness"].default_value = 0.24
    if "Emission Color" in bl.inputs:
        bl.inputs["Emission Color"].default_value = (0.28, 0.14, 0.48, 1.0)
        bl.inputs["Emission Strength"].default_value = 0.6

mats = [mat_gold, mat_obsidian, mat_singularity, mat_lavender]

# 2. Antipodal 100 Points on Sphere
# 50 points on upper hemisphere, sorted so point 0 is at the pole (0, 0, 1)
phi = (1 + math.sqrt(5)) / 2
half_n = 50
upper_points = []

# Exact pole for Nat 100
upper_points.append(mathutils.Vector((0, 0, 1.0)))

for i in range(1, half_n):
    # z from ~0.96 down to ~0.02
    z = math.cos(math.pi * 0.5 * (i / float(half_n)))
    r = math.sqrt(max(0.0, 1.0 - z * z))
    theta = phi * i * 2 * math.pi
    p = mathutils.Vector((r * math.cos(theta), r * math.sin(theta), z)).normalized()
    upper_points.append(p)

# Pair each upper point with its opposite
paired_points = []
for p in upper_points:
    paired_points.append(p)
    paired_points.append(-p)

print(f"Generated {len(paired_points)} antipodal points on unit sphere")

# Build Convex Hull of these 100 points
bm_hull = bmesh.new()
hull_verts = [bm_hull.verts.new(p) for p in paired_points]
bmesh.ops.convex_hull(bm_hull, input=hull_verts)
bm_hull.verts.ensure_lookup_table()
bm_hull.faces.ensure_lookup_table()

print(f"Hull has {len(bm_hull.verts)} verts, {len(bm_hull.faces)} faces")

# Construct Polar Dual Polyhedron (Faces = 100)
dual_bm = bmesh.new()
face_to_dual_vert = {}
target_radius = 2.5

for f in bm_hull.faces:
    n = f.normal.normalized()
    d = f.calc_center_median().dot(n)
    v_dual = n / d * target_radius
    dv = dual_bm.verts.new(v_dual)
    face_to_dual_vert[f] = dv

# For each vertex in hull, sort incident faces circularly to form dual polygon
face_normals_list = []
dual_poly_faces = []

for v in bm_hull.verts:
    link_faces = list(v.link_faces)
    n = v.co.normalized()
    ref = mathutils.Vector((0, 1, 0)) if abs(n.y) < 0.85 else mathutils.Vector((1, 0, 0))
    u = (ref - n * n.dot(ref)).normalized()
    w = n.cross(u).normalized()
    
    def angle_f(f):
        dv = face_to_dual_vert[f].co - v.co * target_radius
        return math.atan2(dv.dot(w), dv.dot(u))
    
    sorted_faces = sorted(link_faces, key=angle_f)
    face_verts = [face_to_dual_vert[f] for f in sorted_faces]
    df = dual_bm.faces.new(face_verts)
    dual_poly_faces.append(df)
    face_normals_list.append(n)

dual_bm.verts.ensure_lookup_table()
dual_bm.faces.ensure_lookup_table()
print(f"Dual polyhedron created with {len(dual_poly_faces)} faces")

# Assign face values (1 to 100):
# upper_points[0] (Z = 1.0) -> Face 100
# -upper_points[0] (Z = -1.0) -> Face 1
# For i in 1..49:
# upper_points[i] -> Face (100 - i)
# -upper_points[i] -> Face (1 + i)
# Notice: Face (100 - i) + Face (1 + i) = 101!
face_info = []
for idx, (df, n) in enumerate(zip(dual_poly_faces, face_normals_list)):
    # Find matching point in paired_points
    # Even index 2*k = upper_points[k], Odd index 2*k + 1 = -upper_points[k]
    best_k = 0
    best_sign = 1
    max_dot = -1.0
    for k, up_pt in enumerate(upper_points):
        d_pos = n.dot(up_pt)
        if d_pos > max_dot:
            max_dot = d_pos
            best_k = k
            best_sign = 1
        d_neg = n.dot(-up_pt)
        if d_neg > max_dot:
            max_dot = d_neg
            best_k = k
            best_sign = -1
    
    if best_k == 0:
        val = 100 if best_sign == 1 else 1
    else:
        val = (100 - best_k) if best_sign == 1 else (1 + best_k)
    
    center = df.calc_center_median()
    face_info.append({
        "face": df,
        "value": val,
        "normal": n,
        "center": center
    })

face_info.sort(key=lambda x: x["value"])
print(f"Face values assigned: {face_info[0]['value']} to {face_info[-1]['value']}")

# Inset individual faces for 24K gold borders
inset_res = bmesh.ops.inset_individual(
    dual_bm,
    faces=[fi["face"] for fi in face_info],
    thickness=0.038,
    depth=-0.016
)

# Set Material 1 (Obsidian) for recessed facet faces
for fi in face_info:
    fi["face"].material_index = 1

# Set Material 0 (Gold) for border quads
for f in inset_res["faces"]:
    f.material_index = 0

die_mesh = bpy.data.meshes.new("D100_Artisan_Mesh")
dual_bm.to_mesh(die_mesh)
dual_bm.free()

die_obj = bpy.data.objects.new("D100_Die", die_mesh)
bpy.context.collection.objects.link(die_obj)
for m in mats:
    die_obj.data.materials.append(m)

# 3. Emblems and Numerals
emblem_bm = bmesh.new()
text_objects = []

def get_up_vector(normal):
    ref = mathutils.Vector((0, 1, 0))
    if abs(normal.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 0, 1))
    up = (ref - normal * normal.dot(ref)).normalized()
    return up

def build_black_hole_void(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center - normal * 0.014) + (rot_mat @ v)

    sin_n = 24
    r_sin = 0.16
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_sin.append(bm.verts.new(wpt(r_sin * math.cos(ang), r_sin * math.sin(ang), -0.003)))
    bm.faces.new(v_sin).material_index = 2

    ring_n = 28
    r_out = 0.24
    r_in = 0.17
    vo, vi = [], []
    for i in range(ring_n):
        ang = i * (2 * math.pi / ring_n)
        vo.append(bm.verts.new(wpt(r_out * math.cos(ang), r_out * math.sin(ang), 0.005)))
        vi.append(bm.verts.new(wpt(r_in * math.cos(ang), r_in * math.sin(ang), 0.005)))
    for i in range(ring_n):
        i_next = (i + 1) % ring_n
        bm.faces.new([vo[i], vi[i], vi[i_next], vo[i_next]]).material_index = 3

def build_cosmic_vortex(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center - normal * 0.014) + (rot_mat @ v)

    # Core void
    n_pts = 20
    r_core = 0.12
    v_core = []
    for i in range(n_pts):
        ang = i * (2 * math.pi / n_pts)
        v_core.append(bm.verts.new(wpt(r_core * math.cos(ang), r_core * math.sin(ang), -0.002)))
    bm.faces.new(v_core).material_index = 2

    # Photon Ring
    r_out = 0.20
    r_in = 0.13
    vo, vi = [], []
    for i in range(n_pts):
        ang = i * (2 * math.pi / n_pts)
        vo.append(bm.verts.new(wpt(r_out * math.cos(ang), r_out * math.sin(ang), 0.005)))
        vi.append(bm.verts.new(wpt(r_in * math.cos(ang), r_in * math.sin(ang), 0.005)))
    for i in range(n_pts):
        i_next = (i + 1) % n_pts
        bm.faces.new([vo[i], vi[i], vi[i_next], vo[i_next]]).material_index = 3

d100_gltf_normals = {}

for fi in face_info:
    val = fi["value"]
    normal = fi["normal"]
    center = fi["center"]
    up = get_up_vector(normal)

    # Convert to glTF coordinate system: gx = bx, gy = bz, gz = -by
    gx = round(normal.x, 4)
    gy = round(normal.z, 4)
    gz = round(-normal.y, 4)
    d100_gltf_normals[str(val)] = [gx, gy, gz]

    emblem_scale = target_radius * 0.38

    if val == 1:
        # Nat 1: Singularity Void
        build_black_hole_void(emblem_bm, center, normal, up, emblem_scale)
        continue

    if val == 100:
        # Nat 100: Cosmic Supernova Vortex + '100' numeral
        build_cosmic_vortex(emblem_bm, center, normal, up, emblem_scale)
        txt_data = bpy.data.curves.new(f"D100_Num_{val}", type='FONT')
        txt_data.body = "100"
        txt_data.size = emblem_scale * 0.20
        txt_data.extrude = 0.014
        txt_data.bevel_depth = 0.002
        txt_data.bevel_resolution = 0
        txt_data.resolution_u = 1
        txt_data.align_x = 'CENTER'
        txt_data.align_y = 'CENTER'

        num_obj = bpy.data.objects.new(f"D100_Num_{val}", txt_data)
        num_obj.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(num_obj)

        right = up.cross(normal).normalized()
        rot_mat = mathutils.Matrix([
            [right.x, up.x, normal.x],
            [right.y, up.y, normal.y],
            [right.z, up.z, normal.z]
        ]).to_4x4()
        num_obj.location = center - normal * 0.012 - up * (emblem_scale * 0.08)
        num_obj.rotation_mode = 'QUATERNION'
        num_obj.rotation_quaternion = rot_mat.to_quaternion()
        text_objects.append(num_obj)
        continue

    # Numerals 2 to 99
    txt_data = bpy.data.curves.new(f"D100_Num_{val}", type='FONT')
    txt_data.body = str(val)
    txt_data.size = target_radius * 0.088 if len(str(val)) <= 2 else target_radius * 0.072
    txt_data.extrude = 0.014
    txt_data.bevel_depth = 0.002
    txt_data.bevel_resolution = 0
    txt_data.resolution_u = 1
    txt_data.align_x = 'CENTER'
    txt_data.align_y = 'CENTER'

    num_obj = bpy.data.objects.new(f"D100_Num_{val}", txt_data)
    num_obj.data.materials.append(mat_lavender)
    bpy.context.collection.objects.link(num_obj)

    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()
    num_obj.location = center - normal * 0.012
    num_obj.rotation_mode = 'QUATERNION'
    num_obj.rotation_quaternion = rot_mat.to_quaternion()
    text_objects.append(num_obj)

# Create emblem mesh
emblem_mesh = bpy.data.meshes.new("D100_Emblems_Mesh")
emblem_bm.to_mesh(emblem_mesh)
emblem_bm.free()
emblem_obj = bpy.data.objects.new("D100_Emblems", emblem_mesh)
for m in mats:
    emblem_obj.data.materials.append(m)
bpy.context.collection.objects.link(emblem_obj)

# Convert all font curves to meshes
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
text_mesh_objs = []
for txt in text_objects:
    eval_txt = txt.evaluated_get(depsgraph)
    c_mesh = bpy.data.meshes.new_from_object(eval_txt)
    t_obj = bpy.data.objects.new(f"{txt.name}_mesh", c_mesh)
    t_obj.matrix_world = txt.matrix_world.copy()
    for m in mats:
        t_obj.data.materials.append(m)
    bpy.context.collection.objects.link(t_obj)
    text_mesh_objs.append(t_obj)
    bpy.data.objects.remove(txt, do_unlink=True)

all_objs = [die_obj, emblem_obj] + text_mesh_objs
bpy.ops.object.select_all(action='DESELECT')
for o in all_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = die_obj
bpy.ops.object.join()
die_obj.name = "D100_BlackHole_Gold"

# Save .blend
blend_path = os.path.join(blend_dir, "d100_black_hole_gold.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f"[OK] Saved D100 blend: {blend_path}")

# Export GLB
glb_path = os.path.join(export_dir, "d100_black_hole_gold.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)
sz_kb = os.path.getsize(glb_path) / 1024
print(f"[OK] Exported D100 GLB: {glb_path} ({sz_kb:.1f} KB)")

# Save glTF normals map
with open(normals_path, "r") as f:
    full_normals_map = json.load(f)

full_normals_map["D100"] = d100_gltf_normals

with open(normals_path, "w") as f:
    json.dump(full_normals_map, f, indent=2)

print(f"[OK] Updated diceNormalsMap.json with {len(d100_gltf_normals)} accurate D100 face normals!")
