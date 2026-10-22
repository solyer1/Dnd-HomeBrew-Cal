import bpy
import bmesh
import mathutils
import math
import os

print("Building test solid D7...")

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Materials
mat_gold = bpy.data.materials.new("Gold_Corner_Trim")
mat_gold.use_nodes = True
b_gold = mat_gold.node_tree.nodes.get("Principled BSDF")
b_gold.inputs["Base Color"].default_value = (1.0, 0.76, 0.22, 1.0)
b_gold.inputs["Metallic"].default_value = 0.96
b_gold.inputs["Roughness"].default_value = 0.14

mat_obs = bpy.data.materials.new("Obsidian_Black")
mat_obs.use_nodes = True
b_obs = mat_obs.node_tree.nodes.get("Principled BSDF")
b_obs.inputs["Base Color"].default_value = (0.015, 0.012, 0.02, 1.0)
b_obs.inputs["Metallic"].default_value = 0.05
b_obs.inputs["Roughness"].default_value = 0.20

mat_sin = bpy.data.materials.new("Singularity_Void")
mat_sin.use_nodes = True
b_sin = mat_sin.node_tree.nodes.get("Principled BSDF")
b_sin.inputs["Base Color"].default_value = (0.002, 0.001, 0.004, 1.0)
b_sin.inputs["Metallic"].default_value = 0.0
b_sin.inputs["Roughness"].default_value = 0.02

mat_lav = bpy.data.materials.new("Lavender_Numerals")
mat_lav.use_nodes = True
b_lav = mat_lav.node_tree.nodes.get("Principled BSDF")
b_lav.inputs["Base Color"].default_value = (0.78, 0.68, 0.95, 1.0)
b_lav.inputs["Metallic"].default_value = 0.18
b_lav.inputs["Roughness"].default_value = 0.24

n_sides = 7
radius = 2.2
half_h = 1.8
cap_h = radius * 0.75 # steep pyramid cap so it cannot land on top/bottom

bm = bmesh.new()

# Create top & bottom apex vertices
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

# 1. Top and Bottom Solid Pyramidal Gold Caps
for i in range(n_sides):
    next_i = (i + 1) % n_sides
    # Top triangle
    f_top = bm.faces.new([v_top_apex, v_top_rim[i], v_top_rim[next_i]])
    f_top.material_index = 0 # Gold_Corner_Trim
    # Bottom triangle
    f_bot = bm.faces.new([v_bot_apex, v_bot_rim[next_i], v_bot_rim[i]])
    f_bot.material_index = 0 # Gold_Corner_Trim

# 2. Side Rolling Rectangles with Inset Beveled Rails
face_w = 2 * radius * math.sin(math.pi / n_sides)
face_h = 2 * half_h
border_w = min(face_w * 0.15, 0.14)
depth = 0.05 * radius

rolling_faces = []
side_normals = []
side_centers = []

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
    
    # Inset corners for the obsidian panel
    in_t0 = t0 + (center - t0) * 0.14 - normal * depth
    in_t1 = t1 + (center - t1) * 0.14 - normal * depth
    in_b1 = b1 + (center - b1) * 0.14 - normal * depth
    in_b0 = b0 + (center - b0) * 0.14 - normal * depth
    
    vo_t0 = bm.verts.new(t0)
    vo_t1 = bm.verts.new(t1)
    vo_b1 = bm.verts.new(b1)
    vo_b0 = bm.verts.new(b0)
    
    vi_t0 = bm.verts.new(in_t0)
    vi_t1 = bm.verts.new(in_t1)
    vi_b1 = bm.verts.new(in_b1)
    vi_b0 = bm.verts.new(in_b0)
    
    # 4 border quads (Gold)
    # Top border
    bm.faces.new([vo_t0, vo_t1, vi_t1, vi_t0]).material_index = 0
    # Right border
    bm.faces.new([vo_t1, vo_b1, vi_b1, vi_t1]).material_index = 0
    # Bottom border
    bm.faces.new([vo_b1, vo_b0, vi_b0, vi_b1]).material_index = 0
    # Left border
    bm.faces.new([vo_b0, vo_t0, vi_t0, vi_b0]).material_index = 0
    
    # Recessed inner obsidian panel
    f_panel = bm.faces.new([vi_t0, vi_t1, vi_b1, vi_b0])
    f_panel.material_index = 1 # Obsidian_Black
    rolling_faces.append(f_panel)

# Helper function to place strictly-bounded emblem
def add_black_hole_void(bm, center, normal, up, scale):
    right = up.cross(normal).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up.x, normal.x],
        [right.y, up.y, normal.y],
        [right.z, up.z, normal.z]
    ]).to_4x4()
    def wpt(x, y, z):
        v = mathutils.Vector((x * scale, y * scale, z * scale))
        return (center + normal * 0.012) + (rot_mat @ v)

    # 1. Pitch black singularity core
    sin_n = 20
    r_sin = 0.18
    v_sin = []
    for i in range(sin_n):
        ang = i * (2 * math.pi / sin_n)
        v_sin.append(bm.verts.new(wpt(r_sin * math.cos(ang), r_sin * math.sin(ang), -0.006)))
    f_sin = bm.faces.new(v_sin)
    f_sin.material_index = 2

    # 2. Infalling Spiral Arms (Lavender)
    for arm_offset in [0, math.pi]:
        arm_pts = 10
        for step in range(arm_pts - 1):
            t0 = step / (arm_pts - 1)
            t1 = (step + 1) / (arm_pts - 1)
            th0 = arm_offset + t0 * 2.8
            th1 = arm_offset + t1 * 2.8
            rad0 = 0.38 - t0 * 0.18
            rad1 = 0.38 - t1 * 0.18
            w0 = 0.045 * (1.0 - t0 * 0.5)
            w1 = 0.045 * (1.0 - t1 * 0.5)
            p0_out = wpt(rad0 * math.cos(th0) + w0 * math.sin(th0), rad0 * math.sin(th0) - w0 * math.cos(th0), 0.006)
            p0_in  = wpt(rad0 * math.cos(th0) - w0 * math.sin(th0), rad0 * math.sin(th0) + w0 * math.cos(th0), 0.006)
            p1_in  = wpt(rad1 * math.cos(th1) - w1 * math.sin(th1), rad1 * math.sin(th1) + w1 * math.cos(th1), 0.006)
            p1_out = wpt(rad1 * math.cos(th1) + w1 * math.sin(th1), rad1 * math.sin(th1) - w1 * math.cos(th1), 0.006)
            f_arm = bm.faces.new([bm.verts.new(p) for p in [p0_out, p0_in, p1_in, p1_out]])
            f_arm.material_index = 3

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

    # 4. Embossed 1
    w1, h1 = 0.04, 0.18
    p_num = [
        wpt(-w1, -h1/2, 0.018), wpt(w1, -h1/2, 0.018),
        wpt(w1, h1/2, 0.018), wpt(-w1, h1/2, 0.018)
    ]
    bm.faces.new([bm.verts.new(p) for p in p_num]).material_index = 3

# Face 1: Black Hole Void (Scale STRICTLY bounded by face_w * 0.70!)
up_vec = mathutils.Vector((0, 1, 0))
emblem_scale = min(face_w, face_h) * 0.70
add_black_hole_void(bm, side_centers[0] - side_normals[0] * (depth * 0.5), side_normals[0], up_vec, emblem_scale)

# Finish mesh
mesh = bpy.data.meshes.new("D7_Mesh")
bm.to_mesh(mesh)
bm.free()

die_obj = bpy.data.objects.new("D7_Die", mesh)
bpy.context.collection.objects.link(die_obj)

for m in [mat_gold, mat_obs, mat_sin, mat_lav]:
    die_obj.data.materials.append(m)

# Add 3D text for remaining faces (2 to 7)
for val in range(2, n_sides + 1):
    f_idx = val - 1
    cen = side_centers[f_idx]
    norm = side_normals[f_idx]
    
    txt_data = bpy.data.curves.new(f"D7_Num_{val}", type='FONT')
    txt_data.body = str(val)
    txt_data.size = face_w * 0.45
    txt_data.extrude = 0.035
    txt_data.bevel_depth = 0.010
    txt_data.bevel_resolution = 1
    txt_data.align_x = 'CENTER'
    txt_data.align_y = 'CENTER'
    
    num_obj = bpy.data.objects.new(f"D7_Num_{val}", txt_data)
    num_obj.data.materials.append(mat_lav)
    bpy.context.collection.objects.link(num_obj)
    
    right = up_vec.cross(norm).normalized()
    rot_mat = mathutils.Matrix([
        [right.x, up_vec.x, norm.x],
        [right.y, up_vec.y, norm.y],
        [right.z, up_vec.z, norm.z]
    ]).to_4x4()
    
    num_obj.location = cen + norm * 0.014
    num_obj.rotation_euler = rot_mat.to_euler()

# Render camera & light to verify
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
cam.location = (0, 0.5, 7.5)
cam.rotation_euler = (0.07, 0, 0)
bpy.context.collection.objects.link(cam)
bpy.context.scene.camera = cam

light_data = bpy.data.lights.new("Sun", 'SUN')
light_data.energy = 3.5
light = bpy.data.objects.new("Sun", light_data)
light.location = (4, -5, 6)
bpy.context.collection.objects.link(light)

bpy.context.scene.render.filepath = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\scripts\test_d7_render.png"
bpy.ops.render.render(write_still=True)
print("Rendered test D7 successfully!")
