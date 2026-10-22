import bpy
import bmesh
import mathutils
import math
import json
import os
import shutil

print("="*60)
print("STARTING MASTER ARTISAN SCULPTOR FOR ALL 21 DICE (D1 - D100)")
print("="*60)

export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
blend_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
root_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate"
normals_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\src\components\dice3d\diceNormalsMap.json"

os.makedirs(export_dir, exist_ok=True)
os.makedirs(blend_dir, exist_ok=True)

# Master Face Normals Map to update for Web physics
dice_normals_map = {}
if os.path.exists(normals_path):
    try:
        with open(normals_path, "r") as f:
            dice_normals_map = json.load(f)
    except:
        pass

# 1. PBR Materials
def setup_materials():
    # 24K Polished Gold Trim
    mat_gold = bpy.data.materials.get("Gold_Corner_Trim") or bpy.data.materials.new("Gold_Corner_Trim")
    mat_gold.use_nodes = True
    bg = mat_gold.node_tree.nodes.get("Principled BSDF")
    if bg:
        bg.inputs["Base Color"].default_value = (1.0, 0.78, 0.24, 1.0)
        bg.inputs["Metallic"].default_value = 0.96
        bg.inputs["Roughness"].default_value = 0.14

    # Obsidian Black Satin Facets
    mat_obsidian = bpy.data.materials.get("Obsidian_Black") or bpy.data.materials.new("Obsidian_Black")
    mat_obsidian.use_nodes = True
    bo = mat_obsidian.node_tree.nodes.get("Principled BSDF")
    if bo:
        bo.inputs["Base Color"].default_value = (0.012, 0.010, 0.016, 1.0)
        bo.inputs["Metallic"].default_value = 0.05
        bo.inputs["Roughness"].default_value = 0.20

    # Singularity Void (Pitch Black Event Horizon)
    mat_singularity = bpy.data.materials.get("Singularity_Void") or bpy.data.materials.new("Singularity_Void")
    mat_singularity.use_nodes = True
    bs = mat_singularity.node_tree.nodes.get("Principled BSDF")
    if bs:
        bs.inputs["Base Color"].default_value = (0.001, 0.001, 0.002, 1.0)
        bs.inputs["Metallic"].default_value = 0.0
        bs.inputs["Roughness"].default_value = 0.02

    # Lavender Amethyst Numerals
    mat_lavender = bpy.data.materials.get("Lavender_Numerals") or bpy.data.materials.new("Lavender_Numerals")
    mat_lavender.use_nodes = True
    bl = mat_lavender.node_tree.nodes.get("Principled BSDF")
    if bl:
        bl.inputs["Base Color"].default_value = (0.78, 0.68, 0.95, 1.0)
        bl.inputs["Metallic"].default_value = 0.18
        bl.inputs["Roughness"].default_value = 0.24
        if "Emission Color" in bl.inputs:
            bl.inputs["Emission Color"].default_value = (0.28, 0.14, 0.48, 1.0)
            bl.inputs["Emission Strength"].default_value = 0.6
        elif "Emission" in bl.inputs:
            bl.inputs["Emission"].default_value = (0.28, 0.14, 0.48, 1.0)

    return mat_gold, mat_obsidian, mat_singularity, mat_lavender

def get_up_vector(normal):
    ref = mathutils.Vector((0, 1, 0))
    if abs(normal.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 0, 1))
    up = (ref - normal * normal.dot(ref)).normalized()
    return up

# --- EMBLEM 1: BLACK HOLE VOID (Face 1: Nat 1 Singularity Collapse) ---
def build_black_hole_void(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.014) + (rot_mat @ v)

    # 1. Pitch black singularity core
    sin_n = 24
    r_sin = 0.16
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_sin.append(bm.verts.new(wpt(r_sin * math.cos(ang), r_sin * math.sin(ang), -0.006)))
    f_sin = bm.faces.new(v_sin)
    f_sin.material_index = 2

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
        wpt(-w1, -h1/2, 0.016), wpt(w1, -h1/2, 0.016),
        wpt(w1, h1/2, 0.016), wpt(-w1, h1/2, 0.016)
    ]
    bm.faces.new([bm.verts.new(p) for p in p_num]).material_index = 3

# --- EMBLEM 2: COSMIC SUPERNOVA VORTEX (Max Face: Critical Hit) ---
def build_cosmic_vortex(bm, center, normal, up, scale, max_val_str="20"):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()
    
    tilt_rad = math.radians(-20.0)
    cos_t, sin_t = math.cos(tilt_rad), math.sin(tilt_rad)
    def rot_pt(x, y):
        return (x * cos_t - y * sin_t, x * sin_t + y * cos_t)

    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.016) + (rot_mat @ v)

    # 1. Singularity Core Void
    sin_n = 24
    r_sin = 0.15
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_sin * math.cos(ang), r_sin * math.sin(ang))
        v_sin.append(bm.verts.new(wpt(xo, yo, -0.005)))
    bm.faces.new(v_sin).material_index = 2

    # 2. Glowing Photon Ring
    r_out, r_in = 0.22, 0.16
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

    # 3. Upper Gravitational Lensing Crown
    crown_n = 16
    v_c_out, v_c_in = [], []
    for i in range(crown_n):
        t = i / (crown_n - 1)
        ang = math.pi * 0.15 + t * (math.pi * 0.70)
        rc_out = 0.32 + 0.05 * math.sin(t * math.pi)
        rc_in  = 0.23 + 0.02 * math.sin(t * math.pi)
        xo, yo = rot_pt(rc_out * math.cos(ang), rc_out * math.sin(ang))
        xi, yi = rot_pt(rc_in * math.cos(ang), rc_in * math.sin(ang))
        v_c_out.append(bm.verts.new(wpt(xo, yo, 0.010)))
        v_c_in.append(bm.verts.new(wpt(xi, yi, 0.010)))
    for i in range(crown_n - 1):
        bm.faces.new([v_c_out[i], v_c_in[i], v_c_in[i+1], v_c_out[i+1]]).material_index = 3

    # 4. Dual Relativistic Vortex Horns
    tr_pts = 12
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
            p0_a = wpt(*rot_pt((r0 + w0) * math.cos(a0), (r0 + w0) * math.sin(a0)), 0.010)
            p0_b = wpt(*rot_pt((r0 - w0) * math.cos(a0), (r0 - w0) * math.sin(a0)), 0.010)
            p1_b = wpt(*rot_pt((r1 - w1) * math.cos(a1), (r1 - w1) * math.sin(a1)), 0.010)
            p1_a = wpt(*rot_pt((r1 + w1) * math.cos(a1), (r1 + w1) * math.sin(a1)), 0.010)
            bm.faces.new([bm.verts.new(p) for p in [p0_a, p0_b, p1_b, p1_a]]).material_index = 3


# =========================================================================
# 1. SCULPT PRISM ROLLERS (D3, D5, D7, D9, D11, D13, D15, D17, D19)
# =========================================================================
def sculpt_prism_die(die_id, n_sides, radius=2.2, half_h=1.85):
    print(f"\n---> Sculpting Solid Prism Roller: {die_id} ({n_sides}-sided)...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = setup_materials()
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = mats

    cap_h = radius * (0.85 if n_sides <= 5 else 0.75) # Solid pyramid apex

    bm = bmesh.new()
    v_top_apex = bm.verts.new(mathutils.Vector((0, half_h + cap_h, 0)))
    v_bot_apex = bm.verts.new(mathutils.Vector((0, -(half_h + cap_h), 0)))

    v_top_rim = []
    v_bot_rim = []
    for i in range(n_sides):
        ang = i * (2 * math.pi / n_sides)
        x = radius * math.sin(ang)
        z = radius * math.cos(ang)
        v_top_rim.append(bm.verts.new(mathutils.Vector((x, half_h, z))))
        v_bot_rim.append(bm.verts.new(mathutils.Vector((x, -half_h, z))))

    bm.verts.ensure_lookup_table()

    # Solid Gold Caps
    for i in range(n_sides):
        next_i = (i + 1) % n_sides
        # Top pyramid triangle
        f_top = bm.faces.new([v_top_apex, v_top_rim[i], v_top_rim[next_i]])
        f_top.material_index = 0
        # Bottom pyramid triangle
        f_bot = bm.faces.new([v_bot_apex, v_bot_rim[next_i], v_bot_rim[i]])
        f_bot.material_index = 0

    face_w = 2 * radius * math.sin(math.pi / n_sides)
    face_h = 2 * half_h
    depth = 0.05 * radius

    side_normals = []
    side_centers = []
    side_panels = []

    for i in range(n_sides):
        next_i = (i + 1) % n_sides
        t0 = v_top_rim[i].co
        t1 = v_top_rim[next_i].co
        b1 = v_bot_rim[next_i].co
        b0 = v_bot_rim[i].co

        center = (t0 + t1 + b1 + b0) / 4.0
        normal = mathutils.Vector((center.x, 0, center.z)).normalized()
        side_normals.append(normal)
        side_centers.append(center)

        margin_w = 0.14
        margin_h = 0.12
        in_t0 = t0 + (center - t0) * margin_w - normal * depth
        in_t1 = t1 + (center - t1) * margin_w - normal * depth
        in_b1 = b1 + (center - b1) * margin_w - normal * depth
        in_b0 = b0 + (center - b0) * margin_w - normal * depth

        vo_t0 = bm.verts.new(t0)
        vo_t1 = bm.verts.new(t1)
        vo_b1 = bm.verts.new(b1)
        vo_b0 = bm.verts.new(b0)

        vi_t0 = bm.verts.new(in_t0)
        vi_t1 = bm.verts.new(in_t1)
        vi_b1 = bm.verts.new(in_b1)
        vi_b0 = bm.verts.new(in_b0)

        # 4 Gold Bevel Border Quads
        bm.faces.new([vo_t0, vo_t1, vi_t1, vi_t0]).material_index = 0
        bm.faces.new([vo_t1, vo_b1, vi_b1, vi_t1]).material_index = 0
        bm.faces.new([vo_b1, vo_b0, vi_b0, vi_b1]).material_index = 0
        bm.faces.new([vo_b0, vo_t0, vi_t0, vi_b0]).material_index = 0

        # Recessed Obsidian Panel
        f_panel = bm.faces.new([vi_t0, vi_t1, vi_b1, vi_b0])
        f_panel.material_index = 1
        side_panels.append(f_panel)

    up_vec = mathutils.Vector((0, 1, 0))
    emblem_scale = min(face_w, face_h) * 0.72

    # Face 1: Black Hole Void (Nat 1)
    build_black_hole_void(bm, side_centers[0] - side_normals[0] * (depth * 0.4), side_normals[0], up_vec, emblem_scale)

    # Max Face (n_sides): Cosmic Supernova Vortex (Crit Hit)
    max_idx = n_sides - 1
    build_cosmic_vortex(bm, side_centers[max_idx] - side_normals[max_idx] * (depth * 0.4), side_normals[max_idx], up_vec, emblem_scale, str(n_sides))

    mesh = bpy.data.meshes.new(f"{die_id}_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new(f"{die_id}_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    for m in mats:
        die_obj.data.materials.append(m)

    # 3D Font Numerals for all faces except Face 1
    # For Max Face, put a small embossed number below/in the vortex
    text_objs = []
    for val in range(2, n_sides + 1):
        f_idx = val - 1
        cen = side_centers[f_idx]
        norm = side_normals[f_idx]
        
        txt_data = bpy.data.curves.new(f"{die_id}_Num_{val}", type='FONT')
        txt_data.body = str(val)
        txt_data.align_x = 'CENTER'
        txt_data.align_y = 'CENTER'
        
        if val == n_sides: # Max Face: neatly placed on lower vortex
            txt_data.size = emblem_scale * 0.28
            txt_data.extrude = 0.03
            txt_data.bevel_depth = 0.008
            num_pos = cen + norm * 0.016 - up_vec * (emblem_scale * 0.12)
        else: # Standard intermediate face numeral
            txt_data.size = min(face_w * 0.50, 0.72)
            txt_data.extrude = 0.038
            txt_data.bevel_depth = 0.010
            num_pos = cen + norm * 0.014

        txt_data.bevel_resolution = 1
        txt_data.resolution_u = 2

        num_obj = bpy.data.objects.new(f"{die_id}_Num_{val}", txt_data)
        num_obj.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(num_obj)

        right = up_vec.cross(norm).normalized()
        rot_mat = mathutils.Matrix([
            [right.x, up_vec.x, norm.x],
            [right.y, up_vec.y, norm.y],
            [right.z, up_vec.z, norm.z]
        ]).to_4x4()

        num_obj.location = num_pos
        num_obj.rotation_euler = rot_mat.to_euler()
        text_objs.append(num_obj)

    # Convert text to meshes and join
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    converted_texts = []
    for txt in text_objs:
        eval_txt = txt.evaluated_get(depsgraph)
        converted_mesh = bpy.data.meshes.new_from_object(eval_txt)
        txt_mesh_obj = bpy.data.objects.new(f"{txt.name}_mesh", converted_mesh)
        txt_mesh_obj.matrix_world = txt.matrix_world.copy()
        for m in mats:
            txt_mesh_obj.data.materials.append(m)
        bpy.context.collection.objects.link(txt_mesh_obj)
        converted_texts.append(txt_mesh_obj)
        bpy.data.objects.remove(txt, do_unlink=True)

    all_objs = [die_obj] + converted_texts
    bpy.ops.object.select_all(action='DESELECT')
    for o in all_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = die_obj
    bpy.ops.object.join()
    die_obj.name = f"{die_id}_BlackHole_Gold"

    # Export
    save_die_assets(die_id, die_obj)
    
    # Store Normals Map for Web App
    norm_dict = {}
    for val in range(1, n_sides + 1):
        f_idx = val - 1
        n = side_normals[f_idx]
        norm_dict[str(val)] = [round(n.x, 4), round(n.y, 4), round(n.z, 4)]
    dice_normals_map[die_id] = norm_dict


# =========================================================================
# 2. SCULPT CATALAN TRAPEZOHEDRA (D10, D14, D16, D18)
# =========================================================================
def sculpt_trapezohedron_die(die_id, n_pairs, radius=2.2, h_pole=2.6, h_eq=0.65):
    print(f"\n---> Sculpting Trapezohedron Catalan Die: {die_id} ({n_pairs*2}-sided)...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = setup_materials()
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = mats

    top_pole = mathutils.Vector((0, h_pole, 0))
    bot_pole = mathutils.Vector((0, -h_pole, 0))

    d_theta = (2 * math.pi) / n_pairs
    upper_ring = []
    lower_ring = []
    for i in range(n_pairs):
        ang_u = i * d_theta
        upper_ring.append(mathutils.Vector((math.cos(ang_u) * radius, h_eq, math.sin(ang_u) * radius)))
        ang_l = (i + 0.5) * d_theta
        lower_ring.append(mathutils.Vector((math.cos(ang_l) * radius, -h_eq, math.sin(ang_l) * radius)))

    faces_info = []
    val_counter = 1
    for i in range(n_pairs):
        i_next = (i + 1) % n_pairs
        u0, l0 = upper_ring[i], lower_ring[i]
        u1, l1 = upper_ring[i_next], lower_ring[i_next]

        # Upper kite
        faces_info.append({
            "value": val_counter,
            "verts": [top_pole, u0, l0, u1]
        })
        val_counter += 1

        # Lower kite
        faces_info.append({
            "value": val_counter,
            "verts": [bot_pole, l1, u1, l0]
        })
        val_counter += 1

    total_faces = len(faces_info)
    bm = bmesh.new()

    face_centers = []
    face_normals = []
    face_scales = []

    for finfo in faces_info:
        val = finfo["value"]
        pts = finfo["verts"]
        k = len(pts)
        cen = sum(pts, mathutils.Vector((0,0,0))) / k
        v0, v1, v2 = pts[0], pts[1], pts[2]
        norm = (v1 - v0).cross(v2 - v0).normalized()
        if norm.dot(cen) < 0:
            norm = -norm

        face_r = sum((p - cen).length for p in pts) / k
        face_centers.append(cen)
        face_normals.append(norm)
        face_scales.append(face_r)

        margin = 0.16
        depth = 0.05 * face_r
        in_pts = [p + (cen - p) * margin - norm * depth for p in pts]

        vo = [bm.verts.new(p) for p in pts]
        vi = [bm.verts.new(p) for p in in_pts]

        for j in range(k):
            j_next = (j + 1) % k
            bm.faces.new([vo[j], vo[j_next], vi[j_next], vi[j]]).material_index = 0

        bm.faces.new(vi).material_index = 1

    up_vec = mathutils.Vector((0, 1, 0))

    # Face 1: Black Hole Void
    emblem_scale = face_scales[0] * 0.95
    up1 = get_up_vector(face_normals[0])
    build_black_hole_void(bm, face_centers[0] - face_normals[0] * 0.04, face_normals[0], up1, emblem_scale)

    # Max Face: Cosmic Supernova Vortex
    max_idx = total_faces - 1
    up_max = get_up_vector(face_normals[max_idx])
    build_cosmic_vortex(bm, face_centers[max_idx] - face_normals[max_idx] * 0.04, face_normals[max_idx], up_max, face_scales[max_idx] * 0.95, str(total_faces))

    mesh = bpy.data.meshes.new(f"{die_id}_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new(f"{die_id}_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    for m in mats:
        die_obj.data.materials.append(m)

    # 3D Font Numerals for faces 2 to total_faces
    text_objs = []
    for val in range(2, total_faces + 1):
        f_idx = val - 1
        cen = face_centers[f_idx]
        norm = face_normals[f_idx]
        up = get_up_vector(norm)
        f_scale = face_scales[f_idx]

        txt_data = bpy.data.curves.new(f"{die_id}_Num_{val}", type='FONT')
        txt_data.body = str(val)
        txt_data.align_x = 'CENTER'
        txt_data.align_y = 'CENTER'

        if val == total_faces:
            txt_data.size = f_scale * 0.32
            txt_data.extrude = 0.03
            txt_data.bevel_depth = 0.008
            num_pos = cen + norm * 0.016 - up * (f_scale * 0.14)
        else:
            txt_data.size = f_scale * 0.50
            txt_data.extrude = 0.038
            txt_data.bevel_depth = 0.010
            num_pos = cen + norm * 0.014

        txt_data.bevel_resolution = 1
        txt_data.resolution_u = 2

        num_obj = bpy.data.objects.new(f"{die_id}_Num_{val}", txt_data)
        num_obj.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(num_obj)

        right = up.cross(norm).normalized()
        rot_mat = mathutils.Matrix([
            [right.x, up.x, norm.x],
            [right.y, up.y, norm.y],
            [right.z, up.z, norm.z]
        ]).to_4x4()

        num_obj.location = num_pos
        num_obj.rotation_euler = rot_mat.to_euler()
        text_objs.append(num_obj)

    # Convert text & join
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    converted_texts = []
    for txt in text_objs:
        eval_txt = txt.evaluated_get(depsgraph)
        converted_mesh = bpy.data.meshes.new_from_object(eval_txt)
        txt_mesh_obj = bpy.data.objects.new(f"{txt.name}_mesh", converted_mesh)
        txt_mesh_obj.matrix_world = txt.matrix_world.copy()
        for m in mats:
            txt_mesh_obj.data.materials.append(m)
        bpy.context.collection.objects.link(txt_mesh_obj)
        converted_texts.append(txt_mesh_obj)
        bpy.data.objects.remove(txt, do_unlink=True)

    all_objs = [die_obj] + converted_texts
    bpy.ops.object.select_all(action='DESELECT')
    for o in all_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = die_obj
    bpy.ops.object.join()
    die_obj.name = f"{die_id}_BlackHole_Gold"

    save_die_assets(die_id, die_obj)

    norm_dict = {}
    for finfo, norm in zip(faces_info, face_normals):
        norm_dict[str(finfo["value"])] = [round(norm.x, 4), round(norm.y, 4), round(norm.z, 4)]
    dice_normals_map[die_id] = norm_dict


# =========================================================================
# 3. SCULPT PLATONIC & REGULAR POLYHEDRA (D4, D6, D8, D12)
# =========================================================================
def sculpt_regular_polyhedral_die(die_id):
    print(f"\n---> Sculpting Regular Polyhedral Die: {die_id}...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = setup_materials()
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = mats

    bm = bmesh.new()

    if die_id == "D4":
        r = 2.4
        a = r / math.sqrt(3)
        pts = [
            mathutils.Vector((a, a, a)),
            mathutils.Vector((a, -a, -a)),
            mathutils.Vector((-a, a, -a)),
            mathutils.Vector((-a, -a, a))
        ]
        face_defs = [
            {"verts": [pts[0], pts[2], pts[1]], "val": 1},
            {"verts": [pts[0], pts[3], pts[2]], "val": 2},
            {"verts": [pts[0], pts[1], pts[3]], "val": 3},
            {"verts": [pts[1], pts[2], pts[3]], "val": 4}
        ]
    elif die_id == "D6":
        s = 1.8
        pts = [
            mathutils.Vector((-s, -s, -s)), mathutils.Vector((s, -s, -s)),
            mathutils.Vector((s, s, -s)), mathutils.Vector((-s, s, -s)),
            mathutils.Vector((-s, -s, s)), mathutils.Vector((s, -s, s)),
            mathutils.Vector((s, s, s)), mathutils.Vector((-s, s, s))
        ]
        face_defs = [
            {"verts": [pts[7], pts[6], pts[5], pts[4]], "val": 1}, # +Z
            {"verts": [pts[0], pts[1], pts[2], pts[3]], "val": 6}, # -Z
            {"verts": [pts[2], pts[6], pts[7], pts[3]], "val": 2}, # +Y
            {"verts": [pts[4], pts[5], pts[1], pts[0]], "val": 5}, # -Y
            {"verts": [pts[1], pts[5], pts[6], pts[2]], "val": 3}, # +X
            {"verts": [pts[3], pts[7], pts[4], pts[0]], "val": 4}  # -X
        ]
    elif die_id == "D8":
        r = 2.5
        p = [
            mathutils.Vector((0, r, 0)), mathutils.Vector((r, 0, 0)),
            mathutils.Vector((0, 0, r)), mathutils.Vector((-r, 0, 0)),
            mathutils.Vector((0, 0, -r)), mathutils.Vector((0, -r, 0))
        ]
        face_defs = [
            {"verts": [p[0], p[1], p[2]], "val": 1},
            {"verts": [p[0], p[2], p[3]], "val": 2},
            {"verts": [p[0], p[3], p[4]], "val": 3},
            {"verts": [p[0], p[4], p[1]], "val": 4},
            {"verts": [p[5], p[2], p[1]], "val": 5},
            {"verts": [p[5], p[3], p[2]], "val": 6},
            {"verts": [p[5], p[4], p[3]], "val": 7},
            {"verts": [p[5], p[1], p[4]], "val": 8}
        ]
    elif die_id == "D12":
        r = 2.4
        phi = (1 + math.sqrt(5)) / 2
        inv_phi = 1 / phi
        s = r / math.sqrt(3)
        pts = []
        for x in [-1, 1]:
            for y in [-1, 1]:
                for z in [-1, 1]:
                    pts.append(mathutils.Vector((x * s, y * s, z * s)))
        for y in [-inv_phi, inv_phi]:
            for z in [-phi, phi]:
                pts.append(mathutils.Vector((0, y * s, z * s)))
        for x in [-inv_phi, inv_phi]:
            for y in [-phi, phi]:
                pts.append(mathutils.Vector((x * s, y * s, 0)))
        for x in [-phi, phi]:
            for z in [-inv_phi, inv_phi]:
                pts.append(mathutils.Vector((x * s, 0, z * s)))

        normals = [
            mathutils.Vector((0, phi, 1)).normalized(),
            mathutils.Vector((0, -phi, 1)).normalized(),
            mathutils.Vector((0, phi, -1)).normalized(),
            mathutils.Vector((0, -phi, -1)).normalized(),
            mathutils.Vector((1, 0, phi)).normalized(),
            mathutils.Vector((-1, 0, phi)).normalized(),
            mathutils.Vector((1, 0, -phi)).normalized(),
            mathutils.Vector((-1, 0, -phi)).normalized(),
            mathutils.Vector((phi, 1, 0)).normalized(),
            mathutils.Vector((-phi, 1, 0)).normalized(),
            mathutils.Vector((phi, -1, 0)).normalized(),
            mathutils.Vector((-phi, -1, 0)).normalized()
        ]

        face_defs = []
        for v_idx, norm in enumerate(normals):
            sorted_pts = sorted(pts, key=lambda p: p.dot(norm), reverse=True)[:5]
            cen = sum(sorted_pts, mathutils.Vector((0,0,0))) / 5.0
            ref = (sorted_pts[0] - cen).normalized()
            perp = norm.cross(ref).normalized()
            sorted_pts = sorted(sorted_pts, key=lambda p: math.atan2((p - cen).dot(perp), (p - cen).dot(ref)))
            # check winding
            fn = (sorted_pts[1] - sorted_pts[0]).cross(sorted_pts[2] - sorted_pts[0]).normalized()
            if fn.dot(norm) < 0:
                sorted_pts.reverse()
            face_defs.append({"verts": sorted_pts, "val": v_idx + 1})

    total_faces = len(face_defs)
    face_centers = []
    face_normals = []
    face_scales = []

    for fdef in face_defs:
        val = fdef["val"]
        pts = fdef["verts"]
        k = len(pts)
        cen = sum(pts, mathutils.Vector((0,0,0))) / k
        v0, v1, v2 = pts[0], pts[1], pts[2]
        norm = (v1 - v0).cross(v2 - v0).normalized()
        if norm.dot(cen) < 0:
            norm = -norm

        face_r = sum((p - cen).length for p in pts) / k
        face_centers.append(cen)
        face_normals.append(norm)
        face_scales.append(face_r)

        margin = 0.18 if die_id in ["D4", "D6"] else 0.15
        depth = 0.05 * face_r
        in_pts = [p + (cen - p) * margin - norm * depth for p in pts]

        vo = [bm.verts.new(p) for p in pts]
        vi = [bm.verts.new(p) for p in in_pts]

        for j in range(k):
            j_next = (j + 1) % k
            bm.faces.new([vo[j], vo[j_next], vi[j_next], vi[j]]).material_index = 0

        bm.faces.new(vi).material_index = 1

    # Face 1: Black Hole Void
    emblem_scale = face_scales[0] * 1.05
    up1 = get_up_vector(face_normals[0])
    build_black_hole_void(bm, face_centers[0] - face_normals[0] * 0.04, face_normals[0], up1, emblem_scale)

    # Max Face: Cosmic Vortex
    max_idx = next(i for i, f in enumerate(face_defs) if f["val"] == total_faces)
    up_max = get_up_vector(face_normals[max_idx])
    build_cosmic_vortex(bm, face_centers[max_idx] - face_normals[max_idx] * 0.04, face_normals[max_idx], up_max, face_scales[max_idx] * 1.05, str(total_faces))

    mesh = bpy.data.meshes.new(f"{die_id}_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new(f"{die_id}_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    for m in mats:
        die_obj.data.materials.append(m)

    # 3D Font Numerals for all faces except Face 1
    text_objs = []
    for f_idx, fdef in enumerate(face_defs):
        val = fdef["val"]
        if val == 1:
            continue
        cen = face_centers[f_idx]
        norm = face_normals[f_idx]
        up = get_up_vector(norm)
        f_scale = face_scales[f_idx]

        txt_data = bpy.data.curves.new(f"{die_id}_Num_{val}", type='FONT')
        txt_data.body = str(val)
        txt_data.align_x = 'CENTER'
        txt_data.align_y = 'CENTER'

        if val == total_faces:
            txt_data.size = f_scale * 0.32
            txt_data.extrude = 0.03
            txt_data.bevel_depth = 0.008
            num_pos = cen + norm * 0.018 - up * (f_scale * 0.15)
        else:
            txt_data.size = f_scale * 0.52
            txt_data.extrude = 0.04
            txt_data.bevel_depth = 0.012
            num_pos = cen + norm * 0.014

        txt_data.bevel_resolution = 1
        txt_data.resolution_u = 2

        num_obj = bpy.data.objects.new(f"{die_id}_Num_{val}", txt_data)
        num_obj.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(num_obj)

        right = up.cross(norm).normalized()
        rot_mat = mathutils.Matrix([
            [right.x, up.x, norm.x],
            [right.y, up.y, norm.y],
            [right.z, up.z, norm.z]
        ]).to_4x4()

        num_obj.location = num_pos
        num_obj.rotation_euler = rot_mat.to_euler()
        text_objs.append(num_obj)

    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    converted_texts = []
    for txt in text_objs:
        eval_txt = txt.evaluated_get(depsgraph)
        converted_mesh = bpy.data.meshes.new_from_object(eval_txt)
        txt_mesh_obj = bpy.data.objects.new(f"{txt.name}_mesh", converted_mesh)
        txt_mesh_obj.matrix_world = txt.matrix_world.copy()
        for m in mats:
            txt_mesh_obj.data.materials.append(m)
        bpy.context.collection.objects.link(txt_mesh_obj)
        converted_texts.append(txt_mesh_obj)
        bpy.data.objects.remove(txt, do_unlink=True)

    all_objs = [die_obj] + converted_texts
    bpy.ops.object.select_all(action='DESELECT')
    for o in all_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = die_obj
    bpy.ops.object.join()
    die_obj.name = f"{die_id}_BlackHole_Gold"

    save_die_assets(die_id, die_obj)

    norm_dict = {}
    for fdef, norm in zip(face_defs, face_normals):
        norm_dict[str(fdef["val"])] = [round(norm.x, 4), round(norm.y, 4), round(norm.z, 4)]
    dice_normals_map[die_id] = norm_dict


# =========================================================================
# 4. SCULPT D1 (ORB OF SINGULARITY) & D2 (FATE TOKEN COIN)
# =========================================================================
def sculpt_d1_orb():
    print("\n---> Sculpting D1 (Orb of Singularity)...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = setup_materials()
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = mats

    r = 2.2
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=36, v_segments=24, radius=r)
    for f in bm.faces:
        f.material_index = 1 # Obsidian black body

    # Top flat medallion for Face 1
    cutoff_y = r * 0.72
    top_faces = [f for f in bm.faces if f.calc_center_median().y > cutoff_y]
    for f in top_faces:
        f.material_index = 0 # Gold ring surrounding medallion

    # Add Black Hole Void at top pole (+Y)
    norm = mathutils.Vector((0, 1, 0))
    cen = mathutils.Vector((0, cutoff_y + 0.05, 0))
    up = mathutils.Vector((0, 0, 1))
    build_black_hole_void(bm, cen, norm, up, scale=1.1)

    mesh = bpy.data.meshes.new("D1_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new("D1_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    for m in mats:
        die_obj.data.materials.append(m)

    save_die_assets("D1", die_obj)
    dice_normals_map["D1"] = {"1": [0.0, 1.0, 0.0]}


def sculpt_d2_coin():
    print("\n---> Sculpting D2 (Gilded Fate Token)...")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = setup_materials()
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = mats

    r = 2.4
    thick = 0.85
    bm = bmesh.new()

    # Cylindrical coin rim with 24K reeded edges
    segments = 36
    top_ring = []
    bot_ring = []
    for i in range(segments):
        ang = i * (2 * math.pi / segments)
        top_ring.append(bm.verts.new(mathutils.Vector((r * math.cos(ang), thick/2, r * math.sin(ang)))))
        bot_ring.append(bm.verts.new(mathutils.Vector((r * math.cos(ang), -thick/2, r * math.sin(ang)))))

    # Side rim quads (Gold)
    for i in range(segments):
        next_i = (i + 1) % segments
        bm.faces.new([top_ring[i], top_ring[next_i], bot_ring[next_i], bot_ring[i]]).material_index = 0

    # Inset discs for Face 1 (Top) and Face 2 (Bottom)
    r_in = r * 0.82
    top_in = [bm.verts.new(mathutils.Vector((r_in * math.cos(i * (2 * math.pi / segments)), thick/2 - 0.04, r_in * math.sin(i * (2 * math.pi / segments))))) for i in range(segments)]
    bot_in = [bm.verts.new(mathutils.Vector((r_in * math.cos(i * (2 * math.pi / segments)), -thick/2 + 0.04, r_in * math.sin(i * (2 * math.pi / segments))))) for i in range(segments)]

    for i in range(segments):
        next_i = (i + 1) % segments
        bm.faces.new([top_ring[i], top_in[i], top_in[next_i], top_ring[next_i]]).material_index = 0
        bm.faces.new([bot_ring[i], bot_ring[next_i], bot_in[next_i], bot_in[i]]).material_index = 0

    bm.faces.new(top_in).material_index = 1 # Top Obsidian disc
    bm.faces.new(bot_in).material_index = 1 # Bottom Obsidian disc

    # Top: Black Hole Void (Face 1)
    build_black_hole_void(bm, mathutils.Vector((0, thick/2 - 0.04, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)), scale=1.4)

    # Bottom: Cosmic Supernova Vortex (Face 2)
    build_cosmic_vortex(bm, mathutils.Vector((0, -thick/2 + 0.04, 0)), mathutils.Vector((0, -1, 0)), mathutils.Vector((0, 0, -1)), scale=1.4, max_val_str="2")

    mesh = bpy.data.meshes.new("D2_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new("D2_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    for m in mats:
        die_obj.data.materials.append(m)

    save_die_assets("D2", die_obj)
    dice_normals_map["D2"] = {"1": [0.0, 1.0, 0.0], "2": [0.0, -1.0, 0.0]}


# =========================================================================
# 5. ASSET SAVING & EXPORT UTILITIES
# =========================================================================
def save_die_assets(die_id, die_obj):
    # Save individual .blend
    blend_path = os.path.join(blend_dir, f"{die_id.lower()}_black_hole_gold.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[OK] Saved .blend: {blend_path}")

    # Export production .glb
    glb_path = os.path.join(export_dir, f"{die_id.lower()}_black_hole_gold.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    sz_kb = os.path.getsize(glb_path) / 1024
    print(f"[OK] Exported GLB: {glb_path} ({sz_kb:.1f} KB)")


# =========================================================================
# 6. RUN COMPLETE BATCH SCULPT FOR ALL DICE (D1 to D19)
# =========================================================================
# 1. D1 & D2
sculpt_d1_orb()
sculpt_d2_coin()

# 2. Prisms (Odd rolling dice: D3, D5, D7, D9, D11, D13, D15, D17, D19)
prism_configs = [
    ("D3", 3, 2.2, 1.8),
    ("D5", 5, 2.2, 1.9),
    ("D7", 7, 2.2, 1.9),
    ("D9", 9, 2.2, 1.9),
    ("D11", 11, 2.2, 1.9),
    ("D13", 13, 2.2, 1.9),
    ("D15", 15, 2.2, 1.9),
    ("D17", 17, 2.2, 1.9),
    ("D19", 19, 2.2, 1.9),
]
for did, ns, r, hh in prism_configs:
    sculpt_prism_die(did, ns, r, hh)

# 3. Regular Polyhedra (D4, D6, D8, D12)
for did in ["D4", "D6", "D8", "D12"]:
    sculpt_regular_polyhedral_die(did)

# 4. Trapezohedra (D10, D14, D16, D18)
trapezohedra_configs = [
    ("D10", 5, 2.2, 2.6, 0.65),
    ("D14", 7, 2.2, 2.6, 0.60),
    ("D16", 8, 2.2, 2.6, 0.55),
    ("D18", 9, 2.2, 2.6, 0.50),
]
for did, npairs, r, hp, he in trapezohedra_configs:
    sculpt_trapezohedron_die(did, npairs, r, hp, he)

# Save updated normals JSON
with open(normals_path, "w") as f:
    json.dump(dice_normals_map, f, indent=2)
print(f"\n[OK] Updated physics normals map: {normals_path}")

# =========================================================================
# 7. ASSEMBLE MASTER SHOWCASE .BLEND (ALL 21 DICE IN LUXURY GRID)
# =========================================================================
print("\n---> Assembling Master Showcase .blend Scene with all 21 dice...")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Dice_Vault_Showcase"

# Key light
kl_data = bpy.data.lights.new(name="Key_Light", type='AREA')
kl_data.energy = 300.0
kl_data.size = 10.0
kl = bpy.data.objects.new(name="Key_Light", object_data=kl_data)
kl.location = (10, -14, 15)
bpy.context.collection.objects.link(kl)

# Fill light
fl_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
fl_data.energy = 150.0
fl_data.color = (0.85, 0.78, 1.0)
fl_data.size = 12.0
fl = bpy.data.objects.new(name="Fill_Light", object_data=fl_data)
fl.location = (-12, -10, 12)
bpy.context.collection.objects.link(fl)

# Rim light
rl_data = bpy.data.lights.new(name="Rim_Light", type='SPOT')
rl_data.energy = 600.0
rl_data.color = (1.0, 0.85, 0.45)
rl = bpy.data.objects.new(name="Rim_Light", object_data=rl_data)
rl.location = (0, 16, 12)
rl.rotation_euler = (-0.8, 0, 3.14)
bpy.context.collection.objects.link(rl)

# Camera
cam_data = bpy.data.cameras.new(name="Showcase_Camera")
cam_obj = bpy.data.objects.new(name="Showcase_Camera", object_data=cam_data)
cam_obj.location = (0, -26, 16)
cam_obj.rotation_euler = (1.05, 0, 0)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

all_dice_list = [
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7',
    'd8', 'd9', 'd10', 'd11', 'd12', 'd13', 'd14',
    'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd100'
]

cols = 7
spacing_x = 3.6
spacing_y = 4.0

for idx, die in enumerate(all_dice_list):
    col = bpy.data.collections.new(name=f"Collection_{die.upper()}")
    bpy.context.scene.collection.children.link(col)
    
    glb_p = os.path.join(export_dir, f"{die}_black_hole_gold.glb")
    if os.path.exists(glb_p):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=glb_p)
        new_objs = set(bpy.data.objects) - before
        
        row_i = idx // cols
        col_i = idx % cols
        pos_x = (col_i - (cols - 1) / 2.0) * spacing_x
        pos_y = (1 - row_i) * spacing_y
        
        for obj in new_objs:
            for c in list(obj.users_collection):
                c.objects.unlink(obj)
            col.objects.link(obj)
            obj.location.x += pos_x
            obj.location.y += pos_y

# Save master showcase blends
master_blend = os.path.join(blend_dir, "dnd_dice_collection_all.blend")
bpy.ops.wm.save_as_mainfile(filepath=master_blend)
print(f"[OK] Master showcase blend saved: {master_blend}")

root_blend = os.path.join(root_dir, "dnd_dice_collection_all.blend")
bpy.ops.wm.save_as_mainfile(filepath=root_blend)
print(f"[OK] Root showcase blend saved: {root_blend}")

# Update root d20_black_hole_gold.blend from master
root_d20 = os.path.join(root_dir, "d20_black_hole_gold.blend")
d20_blend_src = os.path.join(blend_dir, "d20_black_hole_gold.blend")
if os.path.exists(d20_blend_src):
    shutil.copyfile(d20_blend_src, root_d20)
    print(f"[OK] Root D20 blend updated: {root_d20}")

print("="*60)
print("ALL 21 ARTISAN BLACK HOLE GOLD DICE SCULPTED & EXPORTED!")
print("="*60)
