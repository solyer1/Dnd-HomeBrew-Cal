import bpy
import bmesh
import mathutils
import math
import json
import os
import numpy as np

print("="*60)
print("SCULPTING FINAL ARTISAN D100 (BLACK HOLE GOLD SUITE) - AUTHENTIC SUITE STYLE")
print("="*60)

export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
blend_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
normals_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\src\components\dice3d\diceNormalsMap.json"
preview_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\d100_final_preview.png"

os.makedirs(export_dir, exist_ok=True)
os.makedirs(blend_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Authentic Master PBR Materials (Identical to D20 and core suite)
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

# 2. Relaxed Antipodal 100 Points on Sphere
np.random.seed(1337)
phi = (1 + math.sqrt(5)) / 2

upper_pts = [np.array([0.0, 0.0, 1.0])] # Face 100 (North Pole)
for i in range(1, 50):
    z = math.cos(math.pi * 0.5 * (i / 50.0))
    r = math.sqrt(max(0.0, 1.0 - z*z))
    theta = i * 2 * math.pi * phi
    upper_pts.append(np.array([r * math.cos(theta), r * math.sin(theta), z]))

upper_pts = np.array(upper_pts)

for step in range(350):
    all_pts_full = np.vstack([upper_pts, -upper_pts])
    forces = np.zeros_like(upper_pts)
    for i in range(50):
        diff = upper_pts[i] - all_pts_full
        dist = np.linalg.norm(diff, axis=1, keepdims=True)
        dist[i] = 1e9
        forces[i] = np.sum(diff / (dist**3 + 1e-6), axis=0)
    upper_pts += (0.006 / (1.0 + step * 0.01)) * forces
    upper_pts[0] = np.array([0.0, 0.0, 1.0])
    upper_pts = upper_pts / np.linalg.norm(upper_pts, axis=1, keepdims=True)

all_100_pts = np.vstack([upper_pts, -upper_pts])

# 3. Build Convex Hull
bm_hull = bmesh.new()
for p in all_100_pts:
    bm_hull.verts.new(mathutils.Vector(p))
bmesh.ops.convex_hull(bm_hull, input=bm_hull.verts)
bm_hull.verts.ensure_lookup_table()
bm_hull.faces.ensure_lookup_table()

# 4. Construct Dual Polyhedron with exactly 100 faces
target_radius = 2.5
face_to_dv = {}
for f in bm_hull.faces:
    n = f.normal.normalized()
    d = f.calc_center_median().dot(n)
    face_to_dv[f] = n / d * target_radius

dual_faces_pts = []
face_normals = []

for v in bm_hull.verts:
    l_faces = list(v.link_faces)
    n = v.co.normalized()
    ref = mathutils.Vector((0, 1, 0)) if abs(n.y) < 0.85 else mathutils.Vector((1, 0, 0))
    u = (ref - n * n.dot(ref)).normalized()
    w = n.cross(u).normalized()
    def af(f):
        dv = face_to_dv[f] - v.co * target_radius
        return math.atan2(dv.dot(w), dv.dot(u))
    sf = sorted(l_faces, key=af)
    pts = [face_to_dv[f] for f in sf]
    # Counter-clockwise winding relative to outward normal
    v0, v1, v2 = pts[0], pts[1], pts[2]
    if (v1 - v0).cross(v2 - v0).dot(n) < 0:
        pts.reverse()
    dual_faces_pts.append(pts)
    face_normals.append(n)

# 5. Map Face Values with Exact Antipodal Symmetry (Sum = 101)
face_records = []
for pts, n in zip(dual_faces_pts, face_normals):
    best_k = 0
    best_sign = 1
    max_dot = -1.0
    for k in range(50):
        up_v = mathutils.Vector(upper_pts[k])
        dp = n.dot(up_v)
        if dp > max_dot:
            max_dot = dp
            best_k = k
            best_sign = 1
        dn = n.dot(-up_v)
        if dn > max_dot:
            max_dot = dn
            best_k = k
            best_sign = -1
    
    if best_k == 0:
        val = 100 if best_sign == 1 else 1
    else:
        val = (100 - best_k) if best_sign == 1 else (1 + best_k)
    
    cen = sum(pts, mathutils.Vector((0,0,0))) / len(pts)
    face_records.append({
        "value": val,
        "normal": n,
        "center": cen,
        "pts": pts
    })

face_records.sort(key=lambda x: x["value"])
print(f"Face values mapped: 1 to 100 (exact antipodal pairs)")

# 6. Sculpt Clean Polyhedral Body (Authentic Inset & Gold Bevel Borders)
bm_die = bmesh.new()
margin = 0.16 # Wide 24K gold border width
depth = 0.045  # Recessed obsidian depth

recessed_centers = {}

for fr in face_records:
    pts = fr["pts"]
    norm = fr["normal"]
    cen = fr["center"]
    k = len(pts)
    
    in_pts = [p + (cen - p) * margin - norm * depth for p in pts]
    in_cen = sum(in_pts, mathutils.Vector((0,0,0))) / k
    recessed_centers[fr["value"]] = in_cen
    
    vo = [bm_die.verts.new(p) for p in pts]
    vi = [bm_die.verts.new(p) for p in in_pts]
    
    # 24K Gold Bevel Border Quads (Material 0)
    for j in range(k):
        j_next = (j + 1) % k
        bm_die.faces.new([vo[j], vo[j_next], vi[j_next], vi[j]]).material_index = 0
    
    # Recessed Obsidian Center Facet (Material 1)
    bm_die.faces.new(vi).material_index = 1

bm_die.verts.ensure_lookup_table()
bm_die.faces.ensure_lookup_table()

# Create Die Mesh Object
mesh = bpy.data.meshes.new("D100_Artisan_Mesh")
bm_die.to_mesh(mesh)
bm_die.free()

die_obj = bpy.data.objects.new("D100_Die", mesh)
bpy.context.collection.objects.link(die_obj)
for m in mats:
    die_obj.data.materials.append(m)

# 7. Upright Orientation Vector
def get_upright_vector(normal):
    if abs(normal.z) > 0.96:
        return mathutils.Vector((0, 1, 0)) if normal.z > 0 else mathutils.Vector((0, -1, 0))
    up = mathutils.Vector((0, 0, 1)) - normal * normal.z
    return up.normalized()

# 8. Dual Gimmick Emblems
emblem_bm = bmesh.new()

def build_singularity_void(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.008) + (rot_mat @ v)

    # 1. Pitch black singularity core
    sin_n = 24
    r_sin = 0.16
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_sin.append(bm.verts.new(wpt(r_sin * math.cos(ang), r_sin * math.sin(ang), -0.006)))
    bm.faces.new(v_sin).material_index = 2 # Singularity_Void

    # 2. Infalling Spiral Arms (Lavender)
    for arm_offset in [0, math.pi]:
        arm_pts = 12
        for step in range(arm_pts - 1):
            t0 = step / (arm_pts - 1)
            t1 = (step + 1) / (arm_pts - 1)
            th0 = arm_offset + t0 * 3.0
            th1 = arm_offset + t1 * 3.0
            rad0 = 0.38 - t0 * 0.18
            rad1 = 0.38 - t1 * 0.18
            w0 = 0.040 * (1.0 - t0 * 0.5)
            w1 = 0.040 * (1.0 - t1 * 0.5)
            p0_out = wpt(rad0 * math.cos(th0) + w0 * math.sin(th0), rad0 * math.sin(th0) - w0 * math.cos(th0), 0.006)
            p0_in  = wpt(rad0 * math.cos(th0) - w0 * math.sin(th0), rad0 * math.sin(th0) + w0 * math.cos(th0), 0.006)
            p1_in  = wpt(rad1 * math.cos(th1) - w1 * math.sin(th1), rad1 * math.sin(th1) + w1 * math.cos(th1), 0.006)
            p1_out = wpt(rad1 * math.cos(th1) + w1 * math.sin(th1), rad1 * math.sin(th1) - w1 * math.cos(th1), 0.006)
            bm.faces.new([bm.verts.new(p) for p in [p0_out, p0_in, p1_in, p1_out]]).material_index = 3

    # 3. Outer Accretion Ring
    r_out, r_in = 0.44, 0.38
    v_out, v_in = [], []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_out.append(bm.verts.new(wpt(r_out * math.cos(ang), r_out * math.sin(ang), 0.008)))
        v_in.append(bm.verts.new(wpt(r_in * math.cos(ang), r_in * math.sin(ang), 0.008)))
    for i in range(sin_n):
        next_i = (i + 1) % sin_n
        bm.faces.new([v_out[i], v_in[i], v_in[next_i], v_out[next_i]]).material_index = 3

    # 4. Embossed Numeral 1
    w1, h1 = 0.038, 0.17
    p_num = [
        wpt(-w1, -h1/2 - 0.02, 0.016), wpt(w1, -h1/2 - 0.02, 0.016),
        wpt(w1, h1/2 - 0.02, 0.016), wpt(-w1, h1/2 - 0.02, 0.016)
    ]
    bm.faces.new([bm.verts.new(p) for p in p_num]).material_index = 3

def build_cosmic_vortex(bm, center, normal, up, scale):
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

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.008) + (rot_mat @ v)

    # 1. Singularity Void
    sin_n = 24
    r_sin = 0.10
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_sin * math.cos(ang), r_sin * math.sin(ang))
        v_sin.append(bm.verts.new(wpt(xo, yo, -0.005)))
    bm.faces.new(v_sin).material_index = 2

    # 2. Glowing Photon Ring
    r_out, r_in = 0.155, 0.108
    v_out, v_in = [], []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_out * math.cos(ang), r_out * math.sin(ang))
        xi, yi = rot_pt(r_in * math.cos(ang), r_in * math.sin(ang))
        v_out.append(bm.verts.new(wpt(xo, yo, 0.008)))
        v_in.append(bm.verts.new(wpt(xi, yi, 0.008)))
    for i in range(sin_n):
        next_i = (i + 1) % sin_n
        bm.faces.new([v_out[i], v_in[i], v_in[next_i], v_out[next_i]]).material_index = 3

    # 3. Dual Relativistic Jets
    for jet_off in [0.0, math.pi]:
        j_pts = 12
        for step in range(j_pts - 1):
            t0 = step / (j_pts - 1)
            t1 = (step + 1) / (j_pts - 1)
            ang0 = jet_off - 0.15 + t0 * 1.6
            ang1 = jet_off - 0.15 + t1 * 1.6
            rad0 = 0.14 + t0 * 0.13
            rad1 = 0.14 + t1 * 0.13
            w0 = 0.024 * (1.0 - t0 * 0.65)
            w1 = 0.024 * (1.0 - t1 * 0.65)
            p0_a = wpt(*rot_pt((rad0 + w0) * math.cos(ang0), (rad0 + w0) * math.sin(ang0)), 0.010)
            p0_b = wpt(*rot_pt((rad0 - w0) * math.cos(ang0), (rad0 - w0) * math.sin(ang0)), 0.010)
            p1_b = wpt(*rot_pt((rad1 - w1) * math.cos(ang1), (rad1 - w1) * math.sin(ang1)), 0.010)
            p1_a = wpt(*rot_pt((rad1 + w1) * math.cos(ang1), (rad1 + w1) * math.sin(ang1)), 0.010)
            bm.faces.new([bm.verts.new(p0_a), bm.verts.new(p0_b), bm.verts.new(p1_b), bm.verts.new(p1_a)]).material_index = 3

# 9. Sculpt 3D Numerals (2 to 99) and Emblems
text_objects = []
d100_gltf_normals = {}

for fr in face_records:
    val = fr["value"]
    normal = fr["normal"]
    center = recessed_centers[val]
    up = get_upright_vector(normal)

    # Convert normal to glTF coordinates
    gx = round(normal.x, 4)
    gy = round(normal.z, 4)
    gz = round(-normal.y, 4)
    d100_gltf_normals[str(val)] = [gx, gy, gz]

    emblem_scale = 0.70

    if val == 1:
        # Face 1: Singularity Void
        build_singularity_void(emblem_bm, center, normal, up, emblem_scale)
        continue

    if val == 100:
        # Face 100: Cosmic Supernova Vortex
        build_cosmic_vortex(emblem_bm, center, normal, up, emblem_scale)
        txt = bpy.data.curves.new("D100_Num_100", type='FONT')
        txt.body = "100"
        txt.size = 0.14
        txt.extrude = 0.035
        txt.bevel_depth = 0.008
        txt.bevel_resolution = 1
        txt.resolution_u = 2
        txt.align_x = 'CENTER'
        txt.align_y = 'CENTER'
        no = bpy.data.objects.new("D100_Num_100", txt)
        no.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(no)
        right = up.cross(normal).normalized()
        rot = mathutils.Matrix([[right.x, up.x, normal.x], [right.y, up.y, normal.y], [right.z, up.z, normal.z]]).to_4x4()
        no.location = center + normal * 0.012 - up * 0.09
        no.rotation_euler = rot.to_euler()
        text_objects.append(no)
        continue

    # Faces 2 to 99: Sculpted 3D Lavender Numerals
    txt = bpy.data.curves.new(f"D100_Num_{val}", type='FONT')
    txt.body = str(val)
    txt.size = 0.26 if val < 10 else 0.20
    txt.extrude = 0.038
    txt.bevel_depth = 0.010
    txt.bevel_resolution = 1
    txt.resolution_u = 2
    txt.align_x = 'CENTER'
    txt.align_y = 'CENTER'

    no = bpy.data.objects.new(f"D100_Num_{val}", txt)
    no.data.materials.append(mat_lavender)
    bpy.context.collection.objects.link(no)

    right = up.cross(normal).normalized()
    rot = mathutils.Matrix([[right.x, up.x, normal.x], [right.y, up.y, normal.y], [right.z, up.z, normal.z]]).to_4x4()
    no.location = center + normal * 0.010
    no.rotation_euler = rot.to_euler()
    text_objects.append(no)

# 10. Emblems Object
emblem_mesh = bpy.data.meshes.new("D100_Emblems_Mesh")
emblem_bm.to_mesh(emblem_mesh)
emblem_bm.free()
emblem_obj = bpy.data.objects.new("D100_Emblems", emblem_mesh)
for m in mats:
    emblem_obj.data.materials.append(m)
bpy.context.collection.objects.link(emblem_obj)

# 11. Convert Text to Meshes and Merge
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()

text_mesh_objs = []
for txt_o in text_objects:
    eval_txt = txt_o.evaluated_get(depsgraph)
    c_mesh = bpy.data.meshes.new_from_object(eval_txt)
    t_obj = bpy.data.objects.new(f"{txt_o.name}_mesh", c_mesh)
    t_obj.matrix_world = txt_o.matrix_world.copy()
    for m in mats:
        t_obj.data.materials.append(m)
    bpy.context.collection.objects.link(t_obj)
    text_mesh_objs.append(t_obj)
    bpy.data.objects.remove(txt_o, do_unlink=True)

# Select all parts and join into one single masterwork model
bpy.ops.object.select_all(action='DESELECT')
for o in [die_obj, emblem_obj] + text_mesh_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = die_obj
bpy.ops.object.join()

die_obj.name = "D100_BlackHole_Gold_Master"

# 12. Save .blend file
blend_file = os.path.join(blend_dir, "d100_black_hole_gold.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_file)
print(f"Saved master .blend file: {blend_file}")

# 13. Export optimized production GLB
glb_file = os.path.join(export_dir, "d100_black_hole_gold.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_file,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True
)
file_size = os.path.getsize(glb_file)
print(f"Exported production GLB: {glb_file} ({file_size / 1024:.1f} KB)")

# 14. Update diceNormalsMap.json with exact coordinates
with open(normals_path, "r") as f:
    normals_map = json.load(f)

normals_map["D100"] = d100_gltf_normals

with open(normals_path, "w") as f:
    json.dump(normals_map, f, indent=2)

print(f"Updated diceNormalsMap.json with {len(d100_gltf_normals)} accurate normals.")
print("="*60)
print("D100 ARTISAN MASTERPIECE COMPLETE!")
print("="*60)
