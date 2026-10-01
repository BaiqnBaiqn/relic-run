"""Reopen the saved Blender library, check its editable meshes, and package it."""
import bpy
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'games/relic-run/art/models/lowpoly'
manifest = json.loads((OUT / 'manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'relic-run-75-items.blend'))
meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
assert len(meshes) == 75
by_id = {obj['item_id']: obj for obj in meshes}
assert len(by_id) == 75
for item in manifest['models']:
    obj = by_id[item['id']]
    obj.data.calc_loop_triangles()
    assert len(obj.data.loop_triangles) == item['triangles']
    assert len(obj.data.vertices) == item['vertices']
    assert obj['tier'] == item['tier'] and obj['family'] == item['type']
    assert set(group.name for group in obj.vertex_groups) == set(item['parts'])
    assert not obj.modifiers and not obj.hide_render
    assert all(not face.use_smooth for face in obj.data.polygons)
    for mat in obj.data.materials:
        rgb = tuple(mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)
        assert rgb in [(0,0,0,1), (1,1,1,1)]

readme = '''RELIC RUN - 75 ORIGINAL LOW-POLY EQUIPMENT ASSETS

Open relic-run-75-items.blend in Blender. The asset library is arranged in
five tier columns and fifteen family rows. Each item has its own collection,
one flat-shaded mesh, named vertex groups for its components, and item metadata.
Use Material Preview to see the pure black/white materials.

glb/: 75 individual models, exported at their local origins with glTF Y-up.
renders/: 192 x 192 transparent PNGs under neutral lighting (gray shading).
lowpoly-items.html: self-contained gallery. Open in a browser; filter by slot.
catalog.json and manifest.json: game IDs, families, tiers, files, parts and counts.
validation.json: Khronos glTF validation results and file hashes.

Weapons: wand, bow, sword, dagger.
Abilities: dash boot, shield, bash gauntlet, healing pendant.
Armor: robes, light armor, heavy armor.
Rings: health, attack, dexterity, speed.
Every family has five iterative tiers. All models use 52-292 triangles,
two solid materials, no textures, no subdivision, and no animation or rigging.

Created with Blender 5.2.1 LTS. Original models inspired by RuneScape's
readable silhouettes; no RuneScape meshes or textures were copied.
The game's 2D catalog and held weapons use the PNG renders.
In the repository, npm run art:models rebuilds and packages the full library.
'''
archive = ROOT / 'artifacts/rarefriends-lowpoly-items.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
    bundle.writestr('README.txt', readme)
    for name in ['relic-run-75-items.blend','catalog.json','manifest.json','validation.json']:
        bundle.write(OUT / name, name)
    for item in manifest['models']:
        for field in ['file','render']:
            bundle.write(OUT / item[field], item[field])
    bundle.write(ROOT / 'artifacts/lowpoly-items.html', 'lowpoly-items.html')
print(f'BLEND_VERIFIED: {len(meshes)} editable meshes; packaged {archive.name}', flush=True)
