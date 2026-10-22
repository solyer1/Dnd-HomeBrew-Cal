import bpy
import bmesh
import mathutils
import math
import json
import os
import shutil

print("="*60)
print("STARTING ARTISAN SCULPTOR FOR CORE RPG DICE SET + D100")
print("="*60)

json_path = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\rpg_dice_data.json"
export_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
blend_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
os.makedirs(export_dir, exist_ok=True)
os.makedirs(blend_dir, exist_ok=True)

with open(json_path, "r") as f:
    dice_data = json.load(f)

# Master PBR Materials Setup
def get_or_create_materials():
    # 1. 24K Polished Gold Trim
    mat_gold = bpy.data.materials.get("Gold_Corner_Trim")
    if not mat_gold:
        mat_gold = bpy.data.materials.new("Gold_Corner_Trim")
        mat_gold.use_nodes = True
    bsdf = mat_gold.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (1.0, 0.76, 0.22, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.96
        bsdf.inputs["Roughness"].default_value = 0.14

    # 2. Obsidian Black Satin Facets
    mat_obsidian = bpy.data.materials.get("Obsidian_Black")
    if not mat_obsidian:
        mat_obsidian = bpy.data.materials.new("Obsidian_Black")
        mat_obsidian.use_nodes = True
    bsdf = mat_obsidian.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.015, 0.012, 0.02, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.05
        bsdf.inputs["Roughness"].default_value = 0.20

    # 3. Infinite Singularity Void
    mat_singularity = bpy.data.materials.get("Singularity_Void")
    if not mat_singularity:
        mat_singularity = bpy.data.materials.new("Singularity_Void")
        mat_singularity.use_nodes = True
    bsdf = mat_singularity.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.002, 0.001, 0.004, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 0.02

    # 4. Lavender Amethyst Numerals
    mat_lavender = bpy.data.materials.get("Lavender_Numerals")
    if not mat_lavender:
        mat_lavender = bpy.data.materials.new("Lavender_Numerals")
        mat_lavender.use_nodes = True
    bsdf = mat_lavender.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.78, 0.68, 0.95, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.18
        bsdf.inputs["Roughness"].default_value = 0.24
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (0.24, 0.12, 0.42, 1.0)
            bsdf.inputs["Emission Strength"].default_value = 0.55
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (0.24, 0.12, 0.42, 1.0)

    return mat_gold, mat_obsidian, mat_singularity, mat_lavender

def get_up_vector(normal):
    ref = mathutils.Vector((0, 0, 1))
    if abs(normal.dot(ref)) > 0.85:
        ref = mathutils.Vector((0, 1, 0))
    up = (ref - normal * normal.dot(ref)).normalized()
    return up

# --- EMBLEM 1: BLACK HOLE VOID (Face 1: Singularity Collapse / Critical Fail) ---
def build_black_hole_void(bm, center, normal, up, scale, die_val=1):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()

    def world_pt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.016) + (rot_mat @ v)

    # 1. Deep Central Event Horizon Void (Pitch Black Singularity)
    sin_n = 28
    r_sin = 0.115
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_sin.append(bm.verts.new(world_pt(r_sin * math.cos(ang), r_sin * math.sin(ang), -0.010)))
    f_sin = bm.faces.new(v_sin)
    f_sin.material_index = 2 # Singularity_Void

    # 2. Infalling Spacetime Spiral Arms (Swirling inward dark matter streams)
    for arm_offset in [0, math.pi]:
        arm_pts = 16
        for step in range(arm_pts - 1):
            t0 = step / (arm_pts - 1)
            t1 = (step + 1) / (arm_pts - 1)
            
            theta0 = arm_offset + t0 * 3.2
            theta1 = arm_offset + t1 * 3.2
            
            # Logarithmic inward spiral
            rad0 = 0.22 - t0 * 0.10
            rad1 = 0.22 - t1 * 0.10
            
            w0 = 0.028 * (1.0 - t0 * 0.5)
            w1 = 0.028 * (1.0 - t1 * 0.5)
            
            p0_out = world_pt(rad0 * math.cos(theta0) + w0 * math.sin(theta0), rad0 * math.sin(theta0) - w0 * math.cos(theta0), 0.005)
            p0_in  = world_pt(rad0 * math.cos(theta0) - w0 * math.sin(theta0), rad0 * math.sin(theta0) + w0 * math.cos(theta0), 0.005)
            p1_in  = world_pt(rad1 * math.cos(theta1) - w1 * math.sin(theta1), rad1 * math.sin(theta1) + w1 * math.cos(theta1), 0.005)
            p1_out = world_pt(rad1 * math.cos(theta1) + w1 * math.sin(theta1), rad1 * math.sin(theta1) - w1 * math.cos(theta1), 0.005)
            
            v_arm = [bm.verts.new(p) for p in [p0_out, p0_in, p1_in, p1_out]]
            f_arm = bm.faces.new(v_arm)
            f_arm.material_index = 3 # Lavender_Numerals

    # 3. Outer Accretion Shadow Ring
    ring_n = 28
    r_out = 0.145
    r_in = 0.116
    v_out, v_in = [], []
    for i in range(ring_n):
        ang = i * (2 * math.pi / ring_n)
        v_out.append(bm.verts.new(world_pt(r_out * math.cos(ang), r_out * math.sin(ang), 0.006)))
        v_in.append(bm.verts.new(world_pt(r_in * math.cos(ang), r_in * math.sin(ang), 0.006)))
    for i in range(ring_n):
        i_next = (i + 1) % ring_n
        f_r = bm.faces.new([v_out[i], v_in[i], v_in[i_next], v_out[i_next]])
        f_r.material_index = 3 # Lavender_Numerals

    # 4. Embossed "1" in the center below the void
    # Small numeral 1 bar
    w1, h1 = 0.022, 0.065
    y1_off = -0.015
    p_num = [
        world_pt(-w1, y1_off - h1/2, 0.015),
        world_pt(w1, y1_off - h1/2, 0.015),
        world_pt(w1, y1_off + h1/2, 0.015),
        world_pt(-w1, y1_off + h1/2, 0.015)
    ]
    f_num = bm.faces.new([bm.verts.new(p) for p in p_num])
    f_num.material_index = 3 # Lavender_Numerals

# --- EMBLEM 2: COSMIC SUPERNOVA VORTEX (Max Face: Critical Hit) ---
def build_cosmic_vortex(bm, center, normal, up, scale, max_val_str="20"):
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
        return (center + normal * 0.018) + (rot_mat @ v)

    # 1. Singularity Void
    sin_n = 28
    r_sin = 0.095
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        xo, yo = rot_pt(r_sin * math.cos(ang), r_sin * math.sin(ang))
        v_sin.append(bm.verts.new(world_pt(xo, yo, -0.005)))
    f_sin = bm.faces.new(v_sin)
    f_sin.material_index = 2 # Singularity_Void

    # 2. Glowing Photon Ring
    ring_n = 32
    r_out = 0.142
    r_in = 0.098
    v_out, v_in = [], []
    for i in range(ring_n):
        ang = i * (2 * math.pi / ring_n)
        xo, yo = rot_pt(r_out * math.cos(ang), r_out * math.sin(ang))
        xi, yi = rot_pt(r_in * math.cos(ang), r_in * math.sin(ang))
        v_out.append(bm.verts.new(world_pt(xo, yo, 0.008)))
        v_in.append(bm.verts.new(world_pt(xi, yi, 0.008)))
    for i in range(ring_n):
        i_next = (i + 1) % ring_n
        f_r = bm.faces.new([v_out[i], v_in[i], v_in[i_next], v_out[i_next]])
        f_r.material_index = 3 # Lavender_Numerals

    # 3. Gravitational Lensing Crown (Upper Crescent Arc)
    crown_n = 20
    v_c_out, v_c_in = [], []
    for i in range(crown_n):
        t = i / (crown_n - 1)
        ang = math.pi * 0.12 + t * (math.pi * 0.76)
        rc_out = 0.205 + 0.035 * math.sin(t * math.pi)
        rc_in  = 0.148 + 0.012 * math.sin(t * math.pi)
        xo, yo = rot_pt(rc_out * math.cos(ang), rc_out * math.sin(ang))
        xi, yi = rot_pt(rc_in * math.cos(ang), rc_in * math.sin(ang))
        v_c_out.append(bm.verts.new(world_pt(xo, yo, 0.010)))
        v_c_in.append(bm.verts.new(world_pt(xi, yi, 0.010)))
    for i in range(crown_n - 1):
        f_c = bm.faces.new([v_c_out[i], v_c_in[i], v_c_in[i+1], v_c_out[i+1]])
        f_c.material_index = 3

    # 4. Dual Relativistic Vortex Horns
    # Top-right Jet Horn
    tr_pts = 16
    for i in range(tr_pts - 1):
        t0 = i / (tr_pts - 1)
        t1 = (i + 1) / (tr_pts - 1)
        ang0 = -0.15 + t0 * 1.6
        ang1 = -0.15 + t1 * 1.6
        r0 = 0.135 + t0 * 0.12
        r1 = 0.135 + t1 * 0.12
        w0 = 0.024 * (1.0 - t0 * 0.65)
        w1 = 0.024 * (1.0 - t1 * 0.65)
        
        p0_a = world_pt(*rot_pt((r0 + w0) * math.cos(ang0), (r0 + w0) * math.sin(ang0)), 0.012)
        p0_b = world_pt(*rot_pt((r0 - w0) * math.cos(ang0), (r0 - w0) * math.sin(ang0)), 0.012)
        p1_b = world_pt(*rot_pt((r1 - w1) * math.cos(ang1), (r1 - w1) * math.sin(ang1)), 0.012)
        p1_a = world_pt(*rot_pt((r1 + w1) * math.cos(ang1), (r1 + w1) * math.sin(ang1)), 0.012)
        
        f_h = bm.faces.new([bm.verts.new(p0_a), bm.verts.new(p0_b), bm.verts.new(p1_b), bm.verts.new(p1_a)])
        f_h.material_index = 3

    # Bottom-left Jet Horn
    for i in range(tr_pts - 1):
        t0 = i / (tr_pts - 1)
        t1 = (i + 1) / (tr_pts - 1)
        ang0 = math.pi - 0.15 + t0 * 1.6
        ang1 = math.pi - 0.15 + t1 * 1.6
        r0 = 0.135 + t0 * 0.12
        r1 = 0.135 + t1 * 0.12
        w0 = 0.024 * (1.0 - t0 * 0.65)
        w1 = 0.024 * (1.0 - t1 * 0.65)
        
        p0_a = world_pt(*rot_pt((r0 + w0) * math.cos(ang0), (r0 + w0) * math.sin(ang0)), 0.012)
        p0_b = world_pt(*rot_pt((r0 - w0) * math.cos(ang0), (r0 - w0) * math.sin(ang0)), 0.012)
        p1_b = world_pt(*rot_pt((r1 - w1) * math.cos(ang1), (r1 - w1) * math.sin(ang1)), 0.012)
        p1_a = world_pt(*rot_pt((r1 + w1) * math.cos(ang1), (r1 + w1) * math.sin(ang1)), 0.012)
        
        f_h = bm.faces.new([bm.verts.new(p0_a), bm.verts.new(p0_b), bm.verts.new(p1_b), bm.verts.new(p1_a)])
        f_h.material_index = 3

# Main builder function for any die
def build_artisan_die(die_id, die_info):
    faces_data = die_info["faces"]
    radius = die_info["radius"]
    max_face_val = max(f["value"] for f in faces_data)
    
    print(f"\n---> Sculpting Artisan {die_id}: Faces={len(faces_data)}, Max={max_face_val}, Radius={radius:.2f}")

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat_gold, mat_obsidian, mat_singularity, mat_lavender = get_or_create_materials()
    mats = [mat_gold, mat_obsidian, mat_singularity, mat_lavender]
    
    # 1. Build Base Polyhedron BMesh
    bm = bmesh.new()
    
    # Map vertices uniquely
    vert_lookup = {}
    def get_or_add_vert(coord):
        key = (round(coord[0], 5), round(coord[1], 5), round(coord[2], 5))
        if key not in vert_lookup:
            vert_lookup[key] = bm.verts.new(mathutils.Vector(coord))
        return vert_lookup[key]

    poly_faces = []
    face_map = {} # bm_face -> face_info
    for f_info in faces_data:
        v_objs = [get_or_add_vert(c) for c in f_info["vertices"]]
        # deduplicate consecutive
        clean_v = []
        for v in v_objs:
            if not clean_v or clean_v[-1] != v:
                clean_v.append(v)
        if len(clean_v) > 2 and clean_v[0] == clean_v[-1]:
            clean_v.pop()
        if len(clean_v) >= 3:
            try:
                bm_f = bm.faces.new(clean_v)
                bm_f.material_index = 0 # Default Gold
                poly_faces.append(bm_f)
                face_map[bm_f] = f_info
            except Exception as e:
                pass

    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    # 2. Inset Individual Faces for 24K Gold Trim & Recessed Obsidian Facets
    inset_thickness = 0.22 if die_id in ["D4", "D6"] else 0.16 if die_id in ["D8", "D10", "D12"] else 0.12 if die_id == "D20" else 0.05
    inset_depth = -0.045 if die_id != "D100" else -0.015

    try:
        inset_res = bmesh.ops.inset_individual(
            bm,
            faces=poly_faces,
            thickness=inset_thickness,
            depth=inset_depth
        )
        inner_faces = inset_res["faces"]
        for f in inner_faces:
            f.material_index = 1 # Obsidian_Black
    except Exception as e:
        print(f"Inset warning for {die_id}: {e}")
        inner_faces = poly_faces

    # 3. Corner Caps & Bevels on Gold Rails
    if die_id not in ["D2", "D100"]:
        try:
            gold_edges = [e for e in bm.edges if any(f.material_index == 0 for f in e.link_faces)]
            bmesh.ops.bevel(
                bm,
                geom=gold_edges,
                offset=0.035,
                segments=2,
                profile=0.6,
                affect='EDGES'
            )
        except Exception as e:
            pass

    # Create mesh object
    mesh = bpy.data.meshes.new(f"{die_id}_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    die_obj = bpy.data.objects.new(f"{die_id}_Die", mesh)
    bpy.context.collection.objects.link(die_obj)
    
    # Assign materials
    for m in [mat_gold, mat_obsidian, mat_singularity, mat_lavender]:
        die_obj.data.materials.append(m)

    # 4. Generate 3D Text & Dual Emblems
    emblem_bm = bmesh.new()
    text_objects = []

    for f_info in faces_data:
        val = f_info["value"]
        center = mathutils.Vector(f_info["center"])
        normal = mathutils.Vector(f_info["normal"]).normalized()
        up = get_up_vector(normal)

        # GIMMICK 1: Face 1 -> Black Hole Void (Critical Fail)
        if val == 1:
            scale = radius * (1.1 if die_id in ["D4", "D6"] else 0.95 if die_id in ["D8", "D10", "D12"] else 0.82 if die_id == "D20" else 0.40)
            build_black_hole_void(emblem_bm, center, normal, up, scale, die_val=1)
            continue

        # GIMMICK 2: Max Face -> Cosmic Supernova Vortex (Critical Hit)
        if val == max_face_val:
            scale = radius * (1.1 if die_id in ["D4", "D6"] else 0.95 if die_id in ["D8", "D10", "D12"] else 0.82 if die_id == "D20" else 0.40)
            build_cosmic_vortex(emblem_bm, center, normal, up, scale, max_val_str=str(val))
            
            # Place the Max Numeral on the lower part of the vortex
            txt_data = bpy.data.curves.new(f"{die_id}_Num_{val}", type='FONT')
            txt_data.body = str(val)
            txt_data.size = scale * 0.28
            txt_data.extrude = 0.04
            txt_data.bevel_depth = 0.012
            txt_data.bevel_resolution = 2
            txt_data.resolution_u = 3
            txt_data.align_x = 'CENTER'
            txt_data.align_y = 'BOTTOM_BASELINE'

            num_obj = bpy.data.objects.new(f"{die_id}_Num_{val}", txt_data)
            num_obj.data.materials.append(mat_lavender)
            bpy.context.collection.objects.link(num_obj)

            right = up.cross(normal).normalized()
            rot_mat = mathutils.Matrix([
                [right.x, up.x, normal.x],
                [right.y, up.y, normal.y],
                [right.z, up.z, normal.z]
            ]).to_4x4()
            
            num_pos = center + normal * 0.022 - up * (scale * 0.12)
            num_obj.location = num_pos
            num_obj.rotation_euler = rot_mat.to_euler()
            text_objects.append(num_obj)
            continue

        # All Other Faces: High-Poly Embossed Numerals
        txt_data = bpy.data.curves.new(f"{die_id}_Num_{val}", type='FONT')
        txt_data.body = str(val)
        txt_size = radius * (0.42 if die_id in ["D4", "D6"] else 0.35 if die_id in ["D8", "D10", "D12"] else 0.28 if die_id == "D20" else 0.11)
        txt_data.size = txt_size
        txt_data.extrude = 0.042
        txt_data.bevel_depth = 0.014
        txt_data.bevel_resolution = 2
        txt_data.resolution_u = 3
        txt_data.align_x = 'CENTER'
        txt_data.align_y = 'CENTER'

        num_obj = bpy.data.objects.new(f"{die_id}_Num_{val}", txt_data)
        num_obj.data.materials.append(mat_lavender)
        bpy.context.collection.objects.link(num_obj)

        right = up.cross(normal).normalized()
        rot_mat = mathutils.Matrix([
            [right.x, up.x, normal.x],
            [right.y, up.y, normal.y],
            [right.z, up.z, normal.z]
        ]).to_4x4()

        num_obj.location = center + normal * 0.012
        num_obj.rotation_euler = rot_mat.to_euler()
        text_objects.append(num_obj)

    # 5. Create Emblem Mesh Object
    emblem_mesh = bpy.data.meshes.new(f"{die_id}_Emblems")
    emblem_bm.to_mesh(emblem_mesh)
    emblem_bm.free()
    emblem_obj = bpy.data.objects.new(f"{die_id}_Emblems", emblem_mesh)
    for m in [mat_gold, mat_obsidian, mat_singularity, mat_lavender]:
        emblem_obj.data.materials.append(m)
    bpy.context.collection.objects.link(emblem_obj)

    # 6. Convert All Text Objects to Meshes and Merge
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()

    text_mesh_objs = []
    for txt in text_objects:
        eval_txt = txt.evaluated_get(depsgraph)
        converted_mesh = bpy.data.meshes.new_from_object(eval_txt)
        txt_mesh_obj = bpy.data.objects.new(f"{txt.name}_mesh", converted_mesh)
        txt_mesh_obj.matrix_world = txt.matrix_world.copy()
        for m in [mat_gold, mat_obsidian, mat_singularity, mat_lavender]:
            txt_mesh_obj.data.materials.append(m)
        bpy.context.collection.objects.link(txt_mesh_obj)
        text_mesh_objs.append(txt_mesh_obj)
        bpy.data.objects.remove(txt, do_unlink=True)

    # 7. Join Everything into Single Master Object
    all_objs = [die_obj, emblem_obj] + text_mesh_objs
    bpy.ops.object.select_all(action='DESELECT')
    for o in all_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = die_obj
    bpy.ops.object.join()

    die_obj.name = f"{die_id}_BlackHole_Gold"

    # Export individual .blend
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
    file_size_kb = os.path.getsize(glb_path) / 1024
    print(f"[OK] Exported GLB: {glb_path} ({file_size_kb:.1f} KB)")

# Run sculptor for all 8 target dice
target_dice = ["D2", "D4", "D6", "D8", "D10", "D12", "D20", "D100"]

for die_id in target_dice:
    if die_id in dice_data:
        build_artisan_die(die_id, dice_data[die_id])

# 8. Create Master Showcase Scene with all 8 Artisan Dice
print("\n---> Assembling Master Showcase .blend Scene...")
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Artisan_Dice_Vault"

# Studio Lights
key_light_data = bpy.data.lights.new(name="Key_Light", type='AREA')
key_light_data.energy = 300.0
key_light_data.size = 8.0
key_light = bpy.data.objects.new(name="Key_Light", object_data=key_light_data)
key_light.location = (8, -10, 12)
bpy.context.collection.objects.link(key_light)

fill_light_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
fill_light_data.energy = 150.0
fill_light_data.color = (0.85, 0.78, 1.0)
fill_light_data.size = 10.0
fill_light = bpy.data.objects.new(name="Fill_Light", object_data=fill_light_data)
fill_light.location = (-9, -8, 10)
bpy.context.collection.objects.link(fill_light)

rim_light_data = bpy.data.lights.new(name="Rim_Light", type='SPOT')
rim_light_data.energy = 600.0
rim_light_data.color = (1.0, 0.85, 0.45)
rim_light = bpy.data.objects.new(name="Rim_Light", object_data=rim_light_data)
rim_light.location = (0, 14, 10)
rim_light.rotation_euler = (-0.8, 0, 3.14)
bpy.context.collection.objects.link(rim_light)

# Camera
cam_data = bpy.data.cameras.new(name="Showcase_Camera")
cam_obj = bpy.data.objects.new(name="Showcase_Camera", object_data=cam_data)
cam_obj.location = (0, -18, 10)
cam_obj.rotation_euler = (1.1, 0, 0)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Import and arrange in 2 rows of 4 dice
row1 = ["D2", "D4", "D6", "D8"]
row2 = ["D10", "D12", "D20", "D100"]

spacing_x = 4.0
for col_i, die_id in enumerate(row1):
    col = bpy.data.collections.new(name=f"Collection_{die_id}")
    bpy.context.scene.collection.children.link(col)
    glb_p = os.path.join(export_dir, f"{die_id.lower()}_black_hole_gold.glb")
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_p)
    new_objs = set(bpy.data.objects) - before_objs
    pos_x = (col_i - 1.5) * spacing_x
    pos_y = 2.2
    for obj in new_objs:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)
        obj.location.x += pos_x
        obj.location.y += pos_y

for col_i, die_id in enumerate(row2):
    col = bpy.data.collections.new(name=f"Collection_{die_id}")
    bpy.context.scene.collection.children.link(col)
    glb_p = os.path.join(export_dir, f"{die_id.lower()}_black_hole_gold.glb")
    before_objs = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_p)
    new_objs = set(bpy.data.objects) - before_objs
    pos_x = (col_i - 1.5) * spacing_x
    pos_y = -2.2
    for obj in new_objs:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)
        obj.location.x += pos_x
        obj.location.y += pos_y

# Save Master Blend Files
master_blend = os.path.join(blend_dir, "dnd_dice_collection_all.blend")
bpy.ops.wm.save_as_mainfile(filepath=master_blend)
print(f"[OK] Master blend saved: {master_blend}")

root_blend = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd_dice_collection_all.blend"
bpy.ops.wm.save_as_mainfile(filepath=root_blend)
print(f"[OK] Root blend updated: {root_blend}")

root_d20 = r"d:\Personalise\Homemad\DND\Dnd Calcurate\d20_black_hole_gold.blend"
d20_src = os.path.join(blend_dir, "d20_black_hole_gold.blend")
if os.path.exists(d20_src):
    shutil.copyfile(d20_src, root_d20)
    print(f"[OK] Root D20 blend updated: {root_d20}")

print("="*60)
print("ARTISAN DICE SCULPTING COMPLETED SUCCESSFULLY!")
print("="*60)
