# Artwork sources

The monochrome tree, flower, planter, rock, crate, bench and crystal SVGs in
`scenery.json` were exported with FriendSDK v0.1.4's public `renderProp` API.
Source: Rare Friends Isometric World Assets, supplied with FriendSDK.

`friend-sample.ts` comes from FriendSDK's fishing example at commit
`ca3bf183b809ecf22d87c63d88ce03969a3f8da2`. It contains canonical Generations
animation frames sampled at block 66188037. Guest play displays artwork #7730
as a demo character; it does not claim NFT ownership or connect a wallet.

Source repository: https://github.com/spokesz/friendsdk
Fishing reference: https://github.com/spokesz/friendsdk/tree/main/examples/fishing
Source code license: Apache-2.0. FriendSDK's NOTICE.md permits use, modification
and distribution of its artwork in games, previews and commercial projects,
provided source attribution is retained.

The island layout, gate, enemies, weapons and combat effects are original
code-drawn artwork following the reference's ink-and-paper visual language.

The 75 original chest-equipment sprites in `item-pixels-16.ts` are original native
16×16 binary designs. `items-1bit-16/` contains their generated PNGs and atlas.
The earlier 8×8 source in `item-pixels.ts` and `items-1bit/` is retained for reference.
Each PNG uses a one-bit indexed black/white palette, with white optionally
transparent. Tier progression changes the pixel drawing, not just its tint.

Color reference: FriendSDK src/friend-world.ts, GAME_PALETTE
(https://github.com/spokesz/friendsdk/blob/main/src/friend-world.ts).
Meadow #B9D984, pond #7DB4DB, sun #F2CE68, coral #ED927E, lilac #B3A0D8.
The fishing example defaults to monochrome; Relic Run applies the shared
renderer’s optional colors to terrain, interface accents and combat signals.
Friend pixels and the existing equipment sprite assets remain black and white.

T1 sword, dagger, wand and bow models were supplied by the user as GLB files
exported from PixMesh. Unmodified originals are retained in models/t1/source/
(including the original daggger.glb filename); runtime-ready copies use dagger.glb.
Converted models retain their meshes, UVs, normals and transforms. Embedded
textures contain only black and white; emission and the wand light are neutral.
Normal 3D lighting produces gray shading. These four models and their renders
are retained as the earlier imported-model study.
models/t1/manifest.json records item IDs, source/output hashes and validation.

The current 75-item chest library in models/lowpoly/ is original geometry
authored through Blender in scripts/blender-items.py. Each family has five
additive tiers, two pure black/white materials, flat faces and no textures.
Neutral lighting gives the game icons grayscale shading. Ability items are
physical talismans (boot, shield, gauntlet and healing pendant); the actual
ability effects remain code-drawn. The editable .blend retains named part
vertex groups, and each GLB is exported upright at its local origin.

RuneScape equipment was a visual reference for chunky, readable silhouettes
and progressive tier ornament, not a source of copied meshes or textures.
References: https://oldschool.runescape.wiki/w/Rune_equipment and Jagex's
official crystal equipment concept sheets:
https://cdn.runescape.com/assets/docs/external/elfcity/IorwerthAndCadarnDE.pdf

Effect references:

- Blake / cyze_dev, dithered koi: https://x.com/cyze_dev/status/2104722854310711648
- Ethan / SPRWtv, single-plane ice material breakdown (parallax, cracks and
  sparkle masks): https://x.com/SPRWtv/status/2105121960430555604
- Bardo, animated UI shine: https://x.com/bardo_lab/status/2105300370968690865
- Garrett Johnson, crab leg motion: https://x.com/garrettkjohnson/status/2105504377972912202
- Jae, layered enamel badge shader: https://x.com/Jaenam97/status/2104201809132990900

The first pass adapts the visual ideas into original Canvas/CSS code: water
ripples, crystal glints, articulated crab legs, impact rings, dash trails,
projectile trails, chest rays and button sheen. No post media, shader source
or third-party add-on was copied into the project. The renderer stays 2D;
Blender parallax and full enamel raymarching are reference ideas for later.
Telegraphs remain visible with Reduce motion enabled; decorative motion stops.
