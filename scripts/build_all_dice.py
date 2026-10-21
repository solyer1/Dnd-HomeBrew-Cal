import bpy
import bmesh
import mathutils
import math
import json
import os
import time

print("="*60)
print("STARTING BATCH GENERATION OF D1-D100 BLACK HOLE 3D DICE")
print("="*60)

json_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scratch_dice_data.json"
export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
os.makedirs(export_dir, exist_ok=True)

with open(json_path, "r") as f:
    dice_data = json.load(f)

# Master PBR Materials
mat_gold = bpy.data.materials.get("Gold_Corner_Trim")
mat_obsidian = bpy.data.materials.get("Obsidian_Black")
mat_singularity = bpy.data.materials.get("Singularity_Void")
mat_lavender = bpy.data.materials.get("Lavender_Numerals")
mats = [mat_gold, mat_obsidian, mat_singularity, mat_lavender]

def get_up_vector(normal):
    ref = mathutils.Vector((0, 0, 1))
    if abs(normal.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 1, 0))
    up = (ref - normal * normal.dot(ref)).normalized()
    return up

def build_black_hole_emblem(bm, center, normal, up, scale):
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
        return (center + normal * 0.012) + (rot_mat @ v)

    # 1. Singularity Void
    sin_n = 24
    r_sin = 0.092
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_sin * math.cos(ang), r_sin * math.sin(ang))
        v_sin.append(bm.verts.new(world_pt(xo, yo, -0.005)))
    f_sin = bm.faces.new(v_sin)
    f_sin.material_index = 2 # Singularity_Void

    # 2. Photon Ring
    ring_n = 28
    r_out = 0.138
    r_in = 0.094
    v_out, v_in = [], []
    for i in range(ring_n):
        ang = i * (2 * math.pi / ring_n)
        xo, yo = rot_pt(r_out * math.cos(ang), r_out * math.sin(ang))
        xi, yi = rot_pt(r_in * math.cos(ang), r_in * math.sin(ang))
        v_out.append(bm.verts.new(world_pt(xo, yo, 0.024)))
        v_in.append(bm.verts.new(world_pt(xi, yi, 0.024)))
    for i in range(ring_n):
        next_i = (i + 1) % ring_n
        f = bm.faces.new([v_out[i], v_out[next_i], v_in[next_i], v_in[i]])
        f.material_index = 3 # Lavender_Numerals

    # 3. Top Relativistic Accretion Horn
    top_pts = [
        (-0.46, 0.0), (-0.35, 0.06), (-0.20, 0.18), (0.0, 0.265),
        (0.22, 0.22), (0.38, 0.10), (0.48, 0.03), (0.47, 0.13),
        (0.40, 0.23), (0.28, 0.33), (0.12, 0.39), (-0.02, 0.41),
        (0.08, 0.355), (0.22, 0.29), (0.30, 0.19), (0.27, 0.10),
        (0.18, 0.155), (0.0, 0.18), (-0.16, 0.14), (-0.30, 0.065)
    ]
    v_top = [bm.verts.new(world_pt(*rot_pt(x, y), 0.022)) for (x, y) in top_pts]
    e_top = [bm.edges.new((v_top[i], v_top[(i+1)%len(v_top)])) for i in range(len(v_top))]
    res_top = bmesh.ops.triangle_fill(bm, use_beauty=True, edges=e_top)
    for f in res_top['geom']:
        if isinstance(f, bmesh.types.BMFace):
            f.material_index = 3

    # Bottom Horn (point symmetric)
    v_bot = [bm.verts.new(world_pt(*rot_pt(-x, -y), 0.022)) for (x, y) in top_pts]
    e_bot = [bm.edges.new((v_bot[i], v_bot[(i+1)%len(v_bot)])) for i in range(len(v_bot))]
    res_bot = bmesh.ops.triangle_fill(bm, use_beauty=True, edges=e_bot)
    for f in res_bot['geom']:
        if isinstance(f, bmesh.types.BMFace):
            f.material_index = 3

def generate_polyhedral_die(die_id):
    t_start = time.time()
    die_info = dice_data[die_id]
    faces = die_info["faces"]
    max_val = max(f["value"] for f in faces)
    
    # Store face normal map for web physics alignment
    face_normals = {}
    
    bm = bmesh.new()
    
    # 1. Polyhedral Core: Gold Frame & Recessed Obsidian Panels
    for face in faces:
        val = face["value"]
        pts = [mathutils.Vector(v) for v in face["vertices"]]
        k = len(pts)
        if k < 3:
            continue
        center = sum(pts, mathutils.Vector((0,0,0))) / k
        normal = center.normalized()
        face_r = sum((p - center).length for p in pts) / k
        up = get_up_vector(normal)
        
        # Inset margin & depth (adapted for face count)
        if len(faces) >= 60: # D100
            margin = 0.08
            depth = 0.03 * face_r
            font_scale = 0.48
        elif len(faces) >= 20: # D20
            margin = 0.14
            depth = 0.05 * face_r
            font_scale = 0.60
        else:
            margin = 0.16
            depth = 0.06 * face_r
            font_scale = 0.68
            
        in_pts = [p + (center - p) * margin - normal * depth for p in pts]
        
        v_outer = [bm.verts.new(p) for p in pts]
        v_inner = [bm.verts.new(p) for p in in_pts]
        
        # Gold bevel border quads
        for i in range(k):
            next_i = (i + 1) % k
            q = bm.faces.new([v_outer[i], v_outer[next_i], v_inner[next_i], v_inner[i]])
            q.material_index = 0 # Gold_Corner_Trim
            
        # Obsidian recessed panel
        f_panel = bm.faces.new(v_inner)
        f_panel.material_index = 1 # Obsidian_Black
        
        # Record face normal for web engine
        face_normals[val] = [round(normal.x, 4), round(normal.y, 4), round(normal.z, 4)]
        
        # 2. Emblem / Numeral
        if val == max_val:
            # Black Hole Emblem on the max face!
            emblem_scale = face_r * (1.15 if len(faces) >= 60 else 0.95)
            build_black_hole_emblem(bm, center - normal * (depth * 0.5), normal, up, scale=emblem_scale)
        else:
            # 3D Font Numeral
            font_curve = bpy.data.curves.new(name=f"F_{die_id}_{val}", type='FONT')
            font_curve.body = str(val)
            font_curve.size = face_r * font_scale
            font_curve.extrude = 0.022
            font_curve.bevel_depth = 0.002
            font_curve.bevel_resolution = 0
            font_curve.resolution_u = 1
            font_curve.align_x = 'CENTER'
            font_curve.align_y = 'CENTER'
            
            font_obj = bpy.data.objects.new(f"FO_{die_id}_{val}", font_curve)
            bpy.context.collection.objects.link(font_obj)
            
            right = up.cross(normal).normalized()
            rot_mat = mathutils.Matrix([
                [right.x, up.x, normal.x],
                [right.y, up.y, normal.y],
                [right.z, up.z, normal.z]
            ]).to_4x4()
            font_obj.matrix_world = mathutils.Matrix.Translation(center - normal * (depth * 0.5) + normal * 0.012) @ rot_mat
            
            depsgraph = bpy.context.evaluated_depsgraph_get()
            eval_obj = font_obj.evaluated_get(depsgraph)
            f_mesh = bpy.data.meshes.new_from_object(eval_obj)
            
            bm_f = bmesh.new()
            bm_f.from_mesh(f_mesh)
            bmesh.ops.transform(bm_f, matrix=font_obj.matrix_world, verts=bm_f.verts)
            
            v_map = {}
            for v in bm_f.verts:
                v_map[v] = bm.verts.new(v.co)
            for f in bm_f.faces:
                try:
                    fn = bm.faces.new([v_map[v] for v in f.verts])
                    fn.material_index = 3 # Lavender_Numerals
                except ValueError:
                    pass
            bm_f.free()
            
            bpy.data.objects.remove(font_obj, do_unlink=True)
            bpy.data.meshes.remove(f_mesh)
            bpy.data.curves.remove(font_curve)
            
    mesh = bpy.data.meshes.new(f"{die_id}_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    for m in mats:
        mesh.materials.append(m)
        
    obj = bpy.data.objects.new(f"{die_id}_Die", mesh)
    bpy.context.collection.objects.link(obj)
    
    # Export to GLB
    export_path = os.path.join(export_dir, f"{die_id.lower()}_black_hole_gold.glb")
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    bpy.ops.export_scene.gltf(
        filepath=export_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True
    )
    
    sz = os.path.getsize(export_path)
    dur = time.time() - t_start
    print(f"[{die_id}] Exported ({sz / 1024:.1f} KB) in {dur:.2f}s -> {export_path}")
    
    # Clean up scene object to keep memory lean
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    
    return face_normals

def generate_special_d1():
    t_start = time.time()
    bm = bmesh.new()
    radius = 2.4
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=radius)
    for f in bm.faces:
        f.material_index = 0 # Gold
        
    cutoff = radius * 0.72
    top_verts = [v for v in bm.verts if v.co.z > cutoff]
    for v in top_verts:
        v.co.z = cutoff - 0.15
        
    cap_n = 28
    cap_r = math.sqrt(max(0, radius**2 - cutoff**2))
    v_cap = []
    for i in range(cap_n):
        ang = i * (2 * math.pi / cap_n)
        v_cap.append(bm.verts.new((cap_r * 0.88 * math.cos(ang), cap_r * 0.88 * math.sin(ang), cutoff)))
    f_cap = bm.faces.new(v_cap)
    f_cap.material_index = 1 # Obsidian_Black
    
    build_black_hole_emblem(bm, mathutils.Vector((0, 0, cutoff + 0.01)), mathutils.Vector((0, 0, 1)), mathutils.Vector((0, 1, 0)), scale=cap_r * 0.85)
    
    mesh = bpy.data.meshes.new("D1_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    for m in mats:
        mesh.materials.append(m)
    obj = bpy.data.objects.new("D1_Die", mesh)
    bpy.context.collection.objects.link(obj)
    
    export_path = os.path.join(export_dir, "d1_black_hole_gold.glb")
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=export_path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    dur = time.time() - t_start
    print(f"[D1] Exported in {dur:.2f}s -> {export_path}")
    return {1: [0.0, 1.0, 0.0]}

def generate_special_d2():
    t_start = time.time()
    bm = bmesh.new()
    radius = 2.6
    thickness = 0.8
    half_t = thickness / 2
    seg = 36
    
    v_top_rim, v_bot_rim = [], []
    v_top_in, v_bot_in = [], []
    in_r = radius * 0.82
    
    for i in range(seg):
        ang = i * (2 * math.pi / seg)
        ca, sa = math.cos(ang), math.sin(ang)
        v_top_rim.append(bm.verts.new((radius * ca, radius * sa, half_t)))
        v_bot_rim.append(bm.verts.new((radius * ca, radius * sa, -half_t)))
        v_top_in.append(bm.verts.new((in_r * ca, in_r * sa, half_t - 0.06)))
        v_bot_in.append(bm.verts.new((in_r * ca, in_r * sa, -half_t + 0.06)))
        
    for i in range(seg):
        next_i = (i + 1) % seg
        qs = bm.faces.new([v_top_rim[i], v_top_rim[next_i], v_bot_rim[next_i], v_bot_rim[i]])
        qs.material_index = 0
        qt = bm.faces.new([v_top_rim[i], v_top_in[i], v_top_in[next_i], v_top_rim[next_i]])
        qt.material_index = 0
        qb = bm.faces.new([v_bot_rim[i], v_bot_rim[next_i], v_bot_in[next_i], v_bot_in[i]])
        qb.material_index = 0
        
    f_top = bm.faces.new(v_top_in)
    f_top.material_index = 1
    f_bot = bm.faces.new(list(reversed(v_bot_in)))
    f_bot.material_index = 1
    
    # Face 2: Black Hole Emblem on top!
    build_black_hole_emblem(bm, mathutils.Vector((0, 0, half_t - 0.04)), mathutils.Vector((0, 0, 1)), mathutils.Vector((0, 1, 0)), scale=in_r * 0.9)
    
    # Face 1: Numeral 1 on bottom!
    font_curve = bpy.data.curves.new(name="F_D2_1", type='FONT')
    font_curve.body = "1"
    font_curve.size = in_r * 0.9
    font_curve.extrude = 0.022
    font_curve.align_x = 'CENTER'
    font_curve.align_y = 'CENTER'
    font_obj = bpy.data.objects.new("FO_D2_1", font_curve)
    bpy.context.collection.objects.link(font_obj)
    font_obj.matrix_world = mathutils.Matrix.Translation((0, 0, -half_t + 0.03)) @ mathutils.Euler((math.pi, 0, 0)).to_matrix().to_4x4()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_obj = font_obj.evaluated_get(depsgraph)
    f_mesh = bpy.data.meshes.new_from_object(eval_obj)
    
    bm_f = bmesh.new()
    bm_f.from_mesh(f_mesh)
    bmesh.ops.transform(bm_f, matrix=font_obj.matrix_world, verts=bm_f.verts)
    v_map = {}
    for v in bm_f.verts:
        v_map[v] = bm.verts.new(v.co)
    for f in bm_f.faces:
        try:
            fn = bm.faces.new([v_map[v] for v in f.verts])
            fn.material_index = 3
        except ValueError:
            pass
    bm_f.free()
    bpy.data.objects.remove(font_obj, do_unlink=True)
    bpy.data.meshes.remove(f_mesh)
    bpy.data.curves.remove(font_curve)
    
    mesh = bpy.data.meshes.new("D2_Mesh")
    bm.to_mesh(mesh)
    bm.free()
    for m in mats:
        mesh.materials.append(m)
    obj = bpy.data.objects.new("D2_Die", mesh)
    bpy.context.collection.objects.link(obj)
    
    export_path = os.path.join(export_dir, "d2_black_hole_gold.glb")
    for o in bpy.context.scene.objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=export_path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    dur = time.time() - t_start
    print(f"[D2] Exported in {dur:.2f}s -> {export_path}")
    return {1: [0.0, -1.0, 0.0], 2: [0.0, 1.0, 0.0]}

all_normals_map = {}

# Special D1 and D2
all_normals_map['D1'] = generate_special_d1()
all_normals_map['D2'] = generate_special_d2()

# All Polyhedral Dice D3..D19 and D100
ALL_POLYHEDRA = [
    'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
    'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19',
    'D100'
]

for did in ALL_POLYHEDRA:
    fn_map = generate_polyhedral_die(did)
    all_normals_map[did] = fn_map

# Add D20 (already handcrafted)
all_normals_map['D20'] = {
    1: [0.9362, -0.0240, -0.3508],
    2: [0.5897, 0.5527, -0.5889],
    3: [0.0111, 0.3315, -0.9434],
    4: [-0.5649, 0.5704, -0.5963],
    5: [-0.9319, 0.0048, -0.3626],
    6: [0.3423, -0.9392, 0.0273],
    7: [-0.3713, -0.9282, 0.0228],
    8: [0.5717, -0.6015, -0.5580],
    9: [0.0000, -0.3818, -0.9243],
    10: [-0.5828, -0.5837, -0.5653],
    11: [0.9319, -0.0048, 0.3626],
    12: [0.5649, -0.5704, 0.5963],
    13: [-0.0111, -0.3315, 0.9434],
    14: [-0.5897, -0.5527, 0.5889],
    15: [-0.9362, 0.0240, 0.3508],
    16: [-0.5717, 0.6015, 0.5580],
    17: [-0.3423, 0.9392, -0.0273],
    18: [0.3713, 0.9282, -0.0228],
    19: [0.5828, 0.5837, 0.5653],
    20: [0.0000, 0.3982, 0.9173],
}

# Save normals map to JSON for Three.js
normals_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\src\components\dice3d\diceNormalsMap.json"
with open(normals_path, "w") as f:
    json.dump(all_normals_map, f, indent=2)

print("="*60)
print(f"BATCH GENERATION COMPLETE! Saved face normals to {normals_path}")
print("="*60)
