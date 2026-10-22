import bpy
import os

print("="*60)
print("STARTING BLENDER .BLEND FILE GENERATOR")
print("="*60)

models_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\public\models"
out_dir = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd-calculator\models_blend"
os.makedirs(out_dir, exist_ok=True)

dice_list = [
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10',
    'd11', 'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd100'
]

# 1. Create individual .blend files for each die
for die in dice_list:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    glb_path = os.path.join(models_dir, f"{die}_black_hole_gold.glb")
    if os.path.exists(glb_path):
        bpy.ops.import_scene.gltf(filepath=glb_path)
        blend_path = os.path.join(out_dir, f"{die}_black_hole_gold.blend")
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print(f"[OK] Saved individual: {blend_path}")

# 2. Create the MASTER SHOWCASE .blend file containing all 21 dice!
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.name = "Dice_Vault_Showcase"

# Create Studio Lighting
light_data = bpy.data.lights.new(name="Key_Light", type='AREA')
light_data.energy = 250.0
light_data.size = 8.0
key_light = bpy.data.objects.new(name="Key_Light", object_data=light_data)
key_light.location = (8, -10, 12)
key_light.rotation_euler = (0.785, 0, 0.6)
bpy.context.collection.objects.link(key_light)

fill_data = bpy.data.lights.new(name="Fill_Light", type='AREA')
fill_data.energy = 120.0
fill_data.color = (0.85, 0.78, 1.0)
fill_data.size = 10.0
fill_light = bpy.data.objects.new(name="Fill_Light", object_data=fill_data)
fill_light.location = (-9, -8, 10)
fill_light.rotation_euler = (0.785, 0, -0.7)
bpy.context.collection.objects.link(fill_light)

rim_data = bpy.data.lights.new(name="Rim_Light", type='SPOT')
rim_data.energy = 500.0
rim_data.color = (1.0, 0.85, 0.45)
rim_light = bpy.data.objects.new(name="Rim_Light", object_data=rim_data)
rim_light.location = (0, 14, 10)
rim_light.rotation_euler = (-0.8, 0, 3.14)
bpy.context.collection.objects.link(rim_light)

# Create Camera
cam_data = bpy.data.cameras.new(name="Showcase_Camera")
cam_obj = bpy.data.objects.new(name="Showcase_Camera", object_data=cam_data)
cam_obj.location = (0, -22, 14)
cam_obj.rotation_euler = (1.02, 0, 0)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Import each die into its own Collection and lay them out in a neat showcase grid
cols = 7
spacing_x = 3.2
spacing_y = 3.6

for idx, die in enumerate(dice_list):
    col = bpy.data.collections.new(name=f"Collection_{die.upper()}")
    bpy.context.scene.collection.children.link(col)
    
    glb_path = os.path.join(models_dir, f"{die}_black_hole_gold.glb")
    if os.path.exists(glb_path):
        before_objs = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=glb_path)
        new_objs = set(bpy.data.objects) - before_objs
        
        row_i = idx // cols
        col_i = idx % cols
        pos_x = (col_i - (cols - 1) / 2) * spacing_x
        pos_y = (1 - row_i) * spacing_y
        
        for obj in new_objs:
            for c in list(obj.users_collection):
                c.objects.unlink(obj)
            col.objects.link(obj)
            obj.location.x += pos_x
            obj.location.y += pos_y

master_blend = os.path.join(out_dir, "dnd_dice_collection_all.blend")
bpy.ops.wm.save_as_mainfile(filepath=master_blend)
print(f"[OK] Master blend saved: {master_blend}")

root_blend = r"d:\Personalise\Homemad\DND\Dnd Calcurate\dnd_dice_collection_all.blend"
bpy.ops.wm.save_as_mainfile(filepath=root_blend)
print(f"[OK] Root workspace blend saved: {root_blend}")

root_d20_blend = r"d:\Personalise\Homemad\DND\Dnd Calcurate\d20_black_hole_gold.blend"
d20_src = os.path.join(out_dir, "d20_black_hole_gold.blend")
if os.path.exists(d20_src):
    import shutil
    shutil.copyfile(d20_src, root_d20_blend)
    print(f"[OK] Root D20 blend copied: {root_d20_blend}")

print("="*60)
print("ALL BLENDER .BLEND FILES EXPORTED SUCCESSFULLY!")
print("="*60)
