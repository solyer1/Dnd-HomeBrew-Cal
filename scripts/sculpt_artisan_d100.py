import bpy
import bmesh
import mathutils
import math
import json
import os

print("="*60)
print("SCULPTING MASTER ARTISAN D100 (ZOCCHIHEDRON)")
print("="*60)

json_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\rpg_dice_data.json"
export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
blend_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
root_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate"

with open(json_path, "r") as f:
    d100_info = json.load(f)["D100"]

faces_data = d100_info["faces"]
radius = d100_info["radius"]

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. PBR Materials Setup
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
    bo.inputs["Metallic"].default_value = 0.05
    bo.inputs["Roughness"].default_value = 0.20

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

def get_up_vector(normal):
    ref = mathutils.Vector((0, 1, 0))
    if abs(normal.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 0, 1))
    up = (ref - normal * normal.dot(ref)).normalized()
    return up

# 2. Build Base Polyhedron BMesh
bm = bmesh.new()

vert_lookup = {}
def get_or_add_vert(coord):
    key = (round(coord[0], 5), round(coord[1], 5), round(coord[2], 5))
    if key not in vert_lookup:
        vert_lookup[key] = bm.verts.new(mathutils.Vector(coord))
    return vert_lookup[key]

poly_faces = []
for f_info in faces_data:
    v_objs = [get_or_add_vert(c) for c in f_info["vertices"]]
    clean_v = []
    for v in v_objs:
        if not clean_v or clean_v[-1] != v:
            clean_v.append(v)
    if len(clean_v) > 2 and clean_v[0] == clean_v[-1]:
        clean_v.pop()
    if len(clean_v) >= 3:
        bm_f = bm.faces.new(clean_v)
        # We will explicitly set materials after inset
        poly_faces.append(bm_f)

bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()

# Inset individual faces: depth = -0.022, thickness = 0.085
inset_res = bmesh.ops.inset_individual(
    bm,
    faces=poly_faces,
    thickness=0.085,
    depth=-0.022
)

# CRITICAL MATERIAL FIX:
# poly_faces are the 100 inner recessed facet panels -> Material 1 (Obsidian_Black)!
for f in poly_faces:
    f.material_index = 1

# inset_res["faces"] are the 600 outer border quads -> Material 0 (Gold_Corner_Trim)!
for f in inset_res["faces"]:
    f.material_index = 0

print(f"[OK] Material assignment: {len(poly_faces)} Obsidian facets, {len(inset_res['faces'])} Gold border quads")

mesh = bpy.data.meshes.new("D100_Mesh")
bm.to_mesh(mesh)
bm.free()

die_obj = bpy.data.objects.new("D100_Die", mesh)
bpy.context.collection.objects.link(die_obj)
for m in mats:
    die_obj.data.materials.append(m)

# 3. Emblems & 3D Numerals
emblem_bm = bmesh.new()
text_objects = []

# Emblem functions
def build_black_hole_void(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center - normal * 0.018) + (rot_mat @ v)

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
        vo.append(bm.verts.new(wpt(r_out * math.cos(ang), r_out * math.sin(ang), 0.006)))
        vi.append(bm.verts.new(wpt(r_in * math.cos(ang), r_in * math.sin(ang), 0.006)))
    for i in range(ring_n):
        i_next = (i + 1) % ring_n
        bm.faces.new([vo[i], vi[i], vi[i_next], vo[i_next]]).material_index = 3

    crown_n = 18
    vco, vci = [], []
    for i in range(crown_n):
        t = i / (crown_n - 1)
        ang = math.pi * 0.10 + t * (math.pi * 0.80)
        rc_out = 0.35 + 0.06 * math.sin(t * math.pi)
        rc_in  = 0.25 + 0.02 * math.sin(t * math.pi)
        vco.append(bm.verts.new(wpt(rc_out * math.cos(ang), rc_out * math.sin(ang), 0.008)))
        vci.append(bm.verts.new(wpt(rc_in * math.cos(ang), rc_in * math.sin(ang), 0.008)))
    for i in range(crown_n - 1):
        bm.faces.new([vco[i], vci[i], vci[i+1], vco[i+1]]).material_index = 3

    tr_pts = 14
    for horn_ang in [-0.15, math.pi - 0.15]:
        for i in range(tr_pts - 1):
            t0 = i / (tr_pts - 1)
            t1 = (i + 1) / (tr_pts - 1)
            a0 = horn_ang + t0 * 1.5
            a1 = horn_ang + t1 * 1.5
            r0 = 0.22 + t0 * 0.18
            r1 = 0.22 + t1 * 0.18
            w0 = 0.035 * (1.0 - t0 * 0.65)
            w1 = 0.035 * (1.0 - t1 * 0.65)
            p0_a = wpt((r0 + w0) * math.cos(a0), (r0 + w0) * math.sin(a0), 0.008)
            p0_b = wpt((r0 - w0) * math.cos(a0), (r0 - w0) * math.sin(a0), 0.008)
            p1_b = wpt((r1 - w1) * math.cos(a1), (r1 - w1) * math.sin(a1), 0.008)
            p1_a = wpt((r1 + w1) * math.cos(a1), (r1 + w1) * math.sin(a1), 0.008)
            bm.faces.new([bm.verts.new(p) for p in [p0_a, p0_b, p1_b, p1_a]]).material_index = 3

def build_cosmic_vortex(bm, center, normal, up, scale, max_val_str="100"):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()
    
    tilt_rad = math.radians(-22.0)
    cos_t, sin_t = math.cos(tilt_rad), math.sin(tilt_rad)
    def rot_pt(x, y):
        return (x * cos_t - y * sin_t, x * sin_t + y * cos_t)

    def world_pt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center - normal * 0.018) + (rot_mat @ v)

    # 1. Singularity Core Void
    sin_n = 24
    r_sin = 0.10
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_sin * math.cos(ang), r_sin * math.sin(ang))
        v_sin.append(bm.verts.new(world_pt(xo, yo, -0.003)))
    bm.faces.new(v_sin).material_index = 2

    # 2. Glowing Accretion Ring
    ring_n = 28
    r_out = 0.16
    r_in = 0.11
    vo, vi = [], []
    for i in range(ring_n):
        ang = i * (2 * math.pi / ring_n)
        xo, yo = rot_pt(r_out * math.cos(ang), r_out * math.sin(ang))
        xi, yi = rot_pt(r_in * math.cos(ang), r_in * math.sin(ang))
        vo.append(bm.verts.new(world_pt(xo, yo, 0.007)))
        vi.append(bm.verts.new(world_pt(xi, yi, 0.007)))
    for i in range(ring_n):
        i_next = (i + 1) % ring_n
        bm.faces.new([vo[i], vi[i], vi[i_next], vo[i_next]]).material_index = 3

    # 3. Gravitational Lensing Crown
    crown_n = 18
    vco, vci = [], []
    for i in range(crown_n):
        t = i / (crown_n - 1)
        ang = math.pi * 0.12 + t * (math.pi * 0.76)
        rc_out = 0.24 + 0.04 * math.sin(t * math.pi)
        rc_in  = 0.17 + 0.015 * math.sin(t * math.pi)
        xo, yo = rot_pt(rc_out * math.cos(ang), rc_out * math.sin(ang))
        xi, yi = rot_pt(rc_in * math.cos(ang), rc_in * math.sin(ang))
        vco.append(bm.verts.new(world_pt(xo, yo, 0.008)))
        vci.append(bm.verts.new(world_pt(xi, yi, 0.008)))
    for i in range(crown_n - 1):
        bm.faces.new([vco[i], vci[i], vci[i+1], vco[i+1]]).material_index = 3

    # 4. Relativistic Vortex Horns
    tr_pts = 14
    for horn_ang in [-0.15, math.pi - 0.15]:
        for i in range(tr_pts - 1):
            t0 = i / (tr_pts - 1)
            t1 = (i + 1) / (tr_pts - 1)
            ang0 = horn_ang + t0 * 1.5
            ang1 = horn_ang + t1 * 1.5
            r0 = 0.15 + t0 * 0.14
            r1 = 0.15 + t1 * 0.14
            w0 = 0.026 * (1.0 - t0 * 0.65)
            w1 = 0.026 * (1.0 - t1 * 0.65)
            p0_a = world_pt(*rot_pt((r0 + w0) * math.cos(ang0), (r0 + w0) * math.sin(ang0)), 0.009)
            p0_b = world_pt(*rot_pt((r0 - w0) * math.cos(ang0), (r0 - w0) * math.sin(ang0)), 0.009)
            p1_b = world_pt(*rot_pt((r1 - w1) * math.cos(ang1), (r1 - w1) * math.sin(ang1)), 0.009)
            p1_a = world_pt(*rot_pt((r1 + w1) * math.cos(ang1), (r1 + w1) * math.sin(ang1)), 0.009)
            bm.faces.new([bm.verts.new(p) for p in [p0_a, p0_b, p1_b, p1_a]]).material_index = 3

d100_gltf_normals = {}

for f_info in faces_data:
    val = f_info["value"]
    center = mathutils.Vector(f_info["center"])
    normal = mathutils.Vector(f_info["normal"]).normalized()
    up = get_up_vector(normal)

    # Calculate glTF coordinates for physics mapping: gx = bx, gy = bz, gz = -by
    gx = round(normal.x, 4)
    gy = round(normal.z, 4)
    gz = round(-normal.y, 4)
    d100_gltf_normals[str(val)] = [gx, gy, gz]

    emblem_scale = radius * 0.36

    if val == 1:
        # Nat 1: Black Hole Void
        build_black_hole_void(emblem_bm, center, normal, up, emblem_scale)
        continue

    if val == 100:
        # Nat 100: Cosmic Supernova Vortex
        build_cosmic_vortex(emblem_bm, center, normal, up, emblem_scale, "100")
        txt_data = bpy.data.curves.new(f"D100_Num_{val}", type='FONT')
        txt_data.body = "100"
        txt_data.size = emblem_scale * 0.18
        txt_data.extrude = 0.016
        txt_data.bevel_depth = 0.003
        txt_data.bevel_resolution = 1
        txt_data.resolution_u = 2
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
        num_obj.location = center - normal * 0.018 - up * (emblem_scale * 0.10)
        num_obj.rotation_mode = 'QUATERNION'
        num_obj.rotation_quaternion = rot_mat.to_quaternion()
        text_objects.append(num_obj)
        continue

    # Standard numerals (2 to 99)
    txt_data = bpy.data.curves.new(f"D100_Num_{val}", type='FONT')
    txt_data.body = str(val)
    txt_data.size = radius * 0.082 if len(str(val)) <= 2 else radius * 0.068
    txt_data.extrude = 0.016
    txt_data.bevel_depth = 0.003
    txt_data.bevel_resolution = 1
    txt_data.resolution_u = 2
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
    num_obj.location = center - normal * 0.018
    num_obj.rotation_mode = 'QUATERNION'
    num_obj.rotation_quaternion = rot_mat.to_quaternion()
    text_objects.append(num_obj)

# Create emblem mesh object
emblem_mesh = bpy.data.meshes.new("D100_Emblems")
emblem_bm.to_mesh(emblem_mesh)
emblem_bm.free()
emblem_obj = bpy.data.objects.new("D100_Emblems", emblem_mesh)
for m in mats:
    emblem_obj.data.materials.append(m)
bpy.context.collection.objects.link(emblem_obj)

# Convert all text to mesh
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

# Save assets
blend_path = os.path.join(blend_dir, "d100_black_hole_gold.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
print(f"[OK] Saved D100 .blend: {blend_path}")

glb_path = os.path.join(export_dir, "d100_black_hole_gold.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True
)
sz_kb = os.path.getsize(glb_path) / 1024
print(f"[OK] Exported D100 GLB: {glb_path} ({sz_kb:.1f} KB)")

# Save glTF normals to file for checking
with open(r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\d100_truth_normals.json", "w") as f:
    json.dump(d100_gltf_normals, f, indent=2)
print("[OK] Saved d100_truth_normals.json")
