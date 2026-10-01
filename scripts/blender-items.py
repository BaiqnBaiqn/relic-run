"""Build all 75 original Relic Run equipment models in Blender.

Run: blender --background --factory-startup --python scripts/blender-items.py
The 15 families retain their base silhouettes across five additive tiers.
Two solid materials, flat faces, no textures, no subdivision, <= 600 triangles.
"""
import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'games/relic-run/art/models/lowpoly'
CATALOG = json.loads((OUT / 'catalog.json').read_text(encoding='utf-8'))
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'glb').mkdir(exist_ok=True)
(OUT / 'renders').mkdir(exist_ok=True)
SAMPLE = '--sample' in sys.argv
NO_RENDER = '--no-render' in sys.argv

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection' and collection.users == 0:
        bpy.data.collections.remove(collection)

def material(name, value):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (value, value, value, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (value, value, value, 1)
    p.inputs['Roughness'].default_value = 1
    p.inputs['Metallic'].default_value = 0
    p.inputs['Specular IOR Level'].default_value = 0
    return m

WHITE = material('Chalk / pure white', 1)
BLACK = material('Ink / pure black', 0)
VERTS, FACES, MATS, PARTS = [], [], [], []

def piece(name, vertices, faces, front=0, sides=None):
    start = len(VERTS)
    VERTS.extend(vertices)
    FACES.extend([tuple(start+i for i in f) for f in faces])
    MATS.extend(sides if sides is not None else [front] * len(faces))
    PARTS.append((name, start, len(VERTS)))

def prism(name, points, depth=.1, y=0, color=0, edge=1):
    # A solid X/Z silhouette extruded in Y. Front is -Y.
    n = len(points)
    vs = [(x, y-depth/2, z) for x,z in points] + [(x, y+depth/2, z) for x,z in points]
    fs = [tuple(range(n)), tuple(reversed(range(n, 2*n)))]
    fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    piece(name, vs, fs, sides=[color,color]+[edge]*n)

def box(name, center, size, color=0, edge=1):
    x,y,z = center; w,d,h = size
    prism(name, [(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)],d,y,color,edge)

def gem(name, x, z, radius=.12, y=-.12, color=0):
    vs=[(x-radius,y,z),(x,y,z+radius*1.3),(x+radius,y,z),(x,y,z-radius*1.3),(x,y-radius*.8,z),(x,y+radius*.65,z)]
    fs=[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(1,0,5),(2,1,5),(3,2,5),(0,3,5)]
    piece(name,vs,fs,color)

def rod(name, a, b, radius=.05, color=1, sides=6, radius_end=None):
    a,b=Vector(a),Vector(b); direction=b-a
    q=Vector((0,0,1)).rotation_difference(direction.normalized())
    re=radius if radius_end is None else radius_end
    vs=[]
    for point,r in [(a,radius),(b,re)]:
        vs += [tuple(point + q @ Vector((math.cos(i*2*math.pi/sides)*r,math.sin(i*2*math.pi/sides)*r,0))) for i in range(sides)]
    fs=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
    fs += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
    piece(name,vs,fs,color)

def band(name,z,r=.09,h=.075,color=0):
    rod(name,(0,0,z-h/2),(0,0,z+h/2),r,color,6)

def disk(name,x,z,radius,depth=.08,y=0,color=0,edge=1,n=8):
    points=[(x+math.cos(i*2*math.pi/n)*radius,z+math.sin(i*2*math.pi/n)*radius) for i in range(n)]
    prism(name,points,depth,y,color,edge)

def tube_ring(name,radius=.36,thick=.065,y=0,z=.4,color=0):
    # 8 x 4 torus: 64 triangles and a conspicuous open center.
    vs=[]
    for i in range(8):
        a=i*2*math.pi/8
        for j in range(4):
            b=j*2*math.pi/4
            vs.append(((radius+thick*math.cos(b))*math.cos(a),y+thick*math.sin(b),z+(radius+thick*math.cos(b))*math.sin(a)))
    fs=[(i*4+j,((i+1)%8)*4+j,((i+1)%8)*4+(j+1)%4,i*4+(j+1)%4) for i in range(8) for j in range(4)]
    piece(name,vs,fs,color)

def loft(name,levels,color=0):
    # Octagonal cloth/plate volumes, with a black top opening and broad flat facets.
    vs=[(math.sin(i*math.pi/4)*w,math.cos(i*math.pi/4)*d,z) for z,w,d in levels for i in range(8)]
    fs=[tuple(reversed(range(8)))]
    fs += [(j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for j in range(len(levels)-1) for i in range(8)]
    fs += [tuple(range((len(levels)-1)*8,len(levels)*8))]
    piece(name,vs,fs,sides=[color]*(len(fs)-1)+[1])

def blade(name,length,width,base,z=.4,depth=.09):
    # Ridge faces give the broad, angular blade its shape without a texture.
    vs=[(-base,0,z),(base,0,z),(-width,0,z+length*.76),(width,0,z+length*.76),(0,0,z+length),(0,-depth,z),(0,-depth,z+length*.76),(0,depth,z),(0,depth,z+length*.76)]
    fs=[(0,5,6,2),(5,1,3,6),(2,6,4),(6,3,4),(7,0,2,8),(1,7,8,3),(8,2,4),(3,8,4),(0,7,1,5)]
    piece(name,vs,fs,sides=[0,0,0,0,1,0,1,0,1])

def wand(t):
    rod('twig shaft',(0,0,.08),(.03,0,1.1),.055,1,6,.075)
    rod('crooked head',(.03,0,1.1),(.12,0,1.32),.075,0,5,.09)
    rod('grip',(0,-.002,.08),(.005,-.002,.35),.075,1)
    gem('heartwood focus',.12,1.45,.105+.022*(t-1),0,0)
    band('heel',.055,.085,.09)
    if t>=2: band('grip brace',.38,.09);band('focus collar',1.05,.10)
    if t>=3:
        prism('left briar fork',[(-.015,1.0),(-.18,1.19),(-.24,1.46),(-.14,1.27),(.03,1.16)],.09,color=1)
        gem('lower seal',0,.57,.075,-.08)
    if t>=4:
        prism('right elder fork',[(.07,1.02),(.25,1.14),(.39,1.48),(.25,1.31),(.04,1.17)],.09,color=0)
        band('elder binding',.76,.095)
    if t>=5:
        prism('left crown leaf',[(-.12,1.43),(-.33,1.61),(-.22,1.79),(-.13,1.57)],.07,color=0)
        prism('right crown leaf',[(.30,1.43),(.52,1.61),(.40,1.79),(.29,1.57)],.07,color=0)
        gem('crown point',.12,1.82,.08,0)

def bow(t):
    w=.06+.009*(t-1)
    points=[(.12,0),(.24,.3),(.20,.59),(.01,.86),(-.19,.99)]
    for sign in [-1,1]:
        outer=[(x+w,z*sign) for x,z in points]
        inner=[(x-w,z*sign) for x,z in reversed(points)]
        prism('recurved limb',outer+inner,.11,color=0)
    rod('bowstring',(-.19,0,-.99),(-.19,0,.99),.012,1,4)
    box('wrapped grip',(.12,0,0),(.16,.16,.28),1)
    if t>=2:
        for z in [-.18,.18]:box('limb collar',(.18,0,z),(.21,.16,.09),1)
    if t>=3:
        for sign in [-1,1]:prism('briar shoulder',[(.17,.35*sign),(.43,.52*sign),(.19,.61*sign)],.09,color=1)
    if t>=4:
        for sign in [-1,1]:
            prism('moonwood tip',[(-.19,.91*sign),(-.33,1.16*sign),(-.13,1.06*sign),(-.07,.89*sign)],.11,color=0)
        gem('grip jewel',.12,0,.11,-.12)
    if t>=5:
        for sign in [-1,1]:prism('worldtree branch',[(.21,.64*sign),(.49,.89*sign),(.36,.55*sign)],.11,color=0)
        for z in [-.26,.26]:gem('branch seal',.22,z,.07,-.12)

def sword(t):
    length=1.12+.10*(t-1)
    blade('broad ridged blade',length,.15+.023*(t-1),.11+.012*(t-1))
    rod('handle',(0,0,.05),(0,0,.37),.071,1)
    disk('pommel',0,.035,.10,.14)
    span=.29+.03*(t-1)
    prism('crossguard',[(-span,.32),(span,.32),(span+.035,.45),(.10,.42),(0,.47),(-.10,.42),(-span-.035,.45)],.16,color=1)
    if t>=2:band('guard collar',.31,.09,.075);band('pommel collar',.085,.09,.045)
    if t>=3:
        for sign in [-1,1]:prism('briar quillon',[(sign*span,.34),(sign*(span+.11),.49),(sign*(span+.06),.64),(sign*(span-.06),.41)],.13,color=0)
        gem('blade seal',0,.53,.08,-.11)
    if t>=4:
        prism('elder fuller',[(-.03,.69),(.03,.69),(.03,1.36),(0,1.45),(-.03,1.36)],.01,-.105,1,1)
        gem('hilt jewel',0,.375,.095,-.13)
    if t>=5:
        for sign in [-1,1]:prism('crown shoulder',[(sign*.11,.43),(sign*.30,.60),(sign*.25,.82),(sign*.16,.67)],.12,color=0)
        gem('crown pommel',0,.02,.11,-.11)

def dagger(t):
    blade('leaf point',.64+.055*(t-1),.12+.012*(t-1),.095,.33,.085)
    rod('short grip',(0,0,.025),(0,0,.30),.062,1)
    disk('grip cap',0,.025,.072,.10)
    prism('short guard',[(-.19,.27),(.19,.27),(.21,.35),(.07,.37),(-.07,.37),(-.21,.35)],.13,color=1)
    if t>=2:band('grip ferrule',.24,.075,.045);band('heel ferrule',.065,.075,.04)
    if t>=3:
        prism('thorn hook',[(.14,.28),(.30,.33),(.33,.46),(.24,.40),(.18,.35)],.1,color=0)
        gem('thornfang seal',0,.43,.07,-.10)
    if t>=4:
        prism('night groove',[(-.024,.50),(.024,.50),(.024,.85),(0,.96),(-.024,.85)],.01,-.09,1,1)
        prism('reverse quillon',[(-.16,.29),(-.29,.33),(-.26,.49),(-.18,.39)],.11,color=0)
    if t>=5:
        for sign in [-1,1]:prism('ghost petal',[(sign*.04,.16),(sign*.17,.21),(sign*.14,.36),(sign*.065,.28)],.08,-.055,0)
        gem('ghost pommel',0,.025,.09,-.045)

def dash(t):
    # A winged boot carved into a solid wearable rune; silhouette reads as movement.
    prism('boot talisman',[(-.23,.13),(.30,.13),(.43,.22),(.37,.34),(.10,.39),(.07,.88),(-.22,.88)],.20,color=1)
    prism('sole',[(-.24,.10),(.32,.10),(.44,.18),(.43,.23),(-.24,.23)],.23,color=0)
    box('white cuff',(-.075,0,.82),(.34,.25,.13),0)
    if t>=2:prism('heel brace',[(-.25,.28),(-.10,.30),(-.08,.67),(-.23,.70)],.025,-.12,0)
    if t>=3:prism('wind wing',[(-.18,.48),(-.56,.80),(-.47,.91),(-.15,.68)],.12,color=0)
    if t>=4:
        prism('storm feather',[(-.16,.55),(-.57,1.03),(-.43,1.02),(-.11,.76)],.08,.055,0)
        gem('wind seal',.05,.53,.075,-.145)
    if t>=5:
        prism('horizon feather',[(-.13,.64),(-.38,1.23),(-.20,1.12),(.0,.82)],.09,.11,0)
        prism('toe point',[(.28,.23),(.58,.36),(.37,.42),(.20,.37)],.16,color=0)

def shield(t):
    outline=[(-.47,.99),(-.35,.38),(0,.04),(.35,.38),(.47,.99),(0,1.16)]
    prism('heater rim',outline,.19,color=1)
    prism('heater face',[(x*.82,.60+(z-.60)*.80) for x,z in outline],.06,-.13,0)
    box('center rib',(0,-.182,.66),(.065,.04,.64),1)
    if t>=2:
        for sign in [-1,1]:box('rim brace',(sign*.35,-.16,.88),(.14,.05,.07),0)
    if t>=3:
        gem('thorn boss',0,.69,.15,-.20)
        for sign in [-1,1]:prism('side thorn',[(sign*.36,.72),(sign*.59,.83),(sign*.43,.50)],.14,color=0)
    if t>=4:
        prism('ironroot brow',[(-.38,.98),(0,.88),(.38,.98),(0,1.09)],.04,-.19,1)
        gem('lower rivet',0,.24,.07,-.15)
    if t>=5:
        for x in [-.26,0,.26]:prism('ancient crown',[(x-.075,1.06),(x,1.33+(.10 if x==0 else 0)),(x+.075,1.06)],.12,color=0)

def bash(t):
    prism('gauntlet palm',[(-.30,.25),(.28,.25),(.35,.69),(.23,.96),(-.29,.96),(-.38,.72)],.29,color=1)
    for i in range(3):box('stone knuckle',(-.22+i*.21,-.05,.88),(.18,.36,.24),0)
    prism('folded thumb',[(.19,.35),(.47,.54),(.45,.74),(.28,.76),(.21,.61)],.29,color=0)
    box('wrist cuff',(0,0,.22),(.66,.34,.17),0)
    if t>=2:box('reinforced wrist',(0,-.195,.26),(.43,.055,.12),1)
    if t>=3:
        gem('quake seal',0,.57,.13,-.21)
        prism('ram fin',[(-.33,.49),(-.57,.70),(-.36,.84)],.14,color=0)
    if t>=4:
        for x in [-.21,.21]:gem('ruin knuckle',x,1.04,.095,-.04)
    if t>=5:
        prism('cataclysm crown',[(-.17,.95),(0,1.30),(.17,.95)],.18,color=0)
        for sign in [-1,1]:prism('impact flare',[(sign*.27,.30),(sign*.60,.41),(sign*.40,.56)],.14,color=0)

def heal(t):
    outline=[(0,1.12),(-.36,.71),(-.35,.34),(-.18,.14),(.18,.14),(.35,.34),(.36,.71)]
    prism('dew pendant',outline,.18,color=1)
    prism('dew inset',[(x*.78,.60+(z-.60)*.77) for x,z in outline],.035,-.12,0)
    box('cross upright',(0,-.155,.58),(.10,.035,.43),1)
    box('cross bar',(0,-.16,.60),(.32,.035,.10),1)
    if t>=2:disk('suspension eye',0,1.15,.13,.12,color=0,n=6);disk('eye inset',0,1.15,.055,.02,-.085,1,1,n=6)
    if t>=3:
        for sign in [-1,1]:prism('bloom leaf',[(sign*.28,.35),(sign*.59,.64),(sign*.51,.86),(sign*.30,.67)],.10,color=0)
    if t>=4:
        for sign in [-1,1]:prism('lifebloom petal',[(sign*.26,.77),(sign*.46,1.10),(sign*.23,1.04),(sign*.14,.89)],.11,color=0)
        gem('dew drop',0,.07,.08,0)
    if t>=5:
        for sign in [-1,1]:prism('evergreen crown',[(sign*.15,1.03),(sign*.31,1.37),(sign*.07,1.23),(0,1.10)],.1,color=0)

def armor(t,kind):
    robe=kind=='robe'; heavy=kind=='heavy'
    bottom=0 if robe else .48
    hem=.55 if robe else .36
    shoulder=.47 if heavy else .39
    color=0 if heavy else 1
    loft('faceted torso',[(.52,.36,.13),(.91,.29,.14),(1.40,shoulder,.18 if heavy else .14),(1.57,.22,.12)],color)
    for sign in [-1,1]:rod('angular sleeve',(sign*.32,0,1.43),(sign*.61,0,1.20),.205 if heavy else .17,color,6,.15)
    if robe:loft('flared robe skirt',[(.025,.53,.135),(.90,.29,.14)],1)
    if robe:
        prism('robe front fold',[(-.10,.04),(.17,.04),(.07,1.32),(0,1.40)],.035,-.15,0)
        box('cloth belt',(0,-.16,.91),(.65,.045,.075),0)
    elif heavy:
        prism('breast ridge',[(-.06,.78),(.06,.78),(.18,1.42),(0,1.51),(-.18,1.42)],.06,-.22,1)
        box('plate waist',(0,0,.59),(.77,.37,.12),1)
    else:
        prism('cross strap',[(-.34,1.48),(-.26,1.53),(.27,.76),(.20,.72)],.035,-.15,0)
        box('leather belt',(0,-.15,.72),(.68,.04,.09),0)
    if t>=2:
        for sign in [-1,1]:
            prism('reinforced shoulder',[(sign*.37,1.59),(sign*.57,1.51),(sign*.69,1.31),(sign*.49,1.30)],.09,-.15,0,1)
        gem('belt clasp',0,.89 if robe else .65,.07,-.21)
    if t>=3:
        if robe:
            for sign in [-1,1]:prism('grove hem',[(sign*.30,.06),(sign*.43,.06),(sign*.22,.72)],.02,-.15,0)
        else:
            for sign in [-1,1]:prism('layered skirt',[(sign*.08,.53),(sign*.39,.55),(sign*.47,.28),(sign*.12,.30)],.16,color=0 if heavy else 1)
        gem('chest insignia',0,1.25,.105,-.23,0 if not heavy else 1)
    if t>=4:
        for sign in [-1,1]:prism('raised collar',[(sign*.15,1.53),(sign*.18,1.83),(sign*.33,1.69),(sign*.39,1.58)],.16,color=0)
        if heavy:
            for sign in [-1,1]:prism('stoneheart shoulder',[(sign*.48,1.50),(sign*.73,1.87),(sign*.84,1.56)],.20,color=0)
        else:prism('back mantle',[(-.38,.60),(.38,.60),(.46,1.52),(-.46,1.52)],.045,.21,0)
    if t>=5:
        for sign in [-1,1]:
            prism('elder shoulder leaf',[(sign*.46,1.50),(sign*.84,1.84),(sign*.81,1.42),(sign*.53,1.31)],.13,-.035,0)
            prism('crown trim',[(sign*.09,1.22),(sign*.25,1.42),(sign*.22,1.20)],.03,-.255,0 if not heavy else 1)
        gem('heartwood crest',0,1.28,.11,-.28,0)

def ring(t,kind):
    tube_ring('octagonal band',.33,.065+.01*(t-1),z=.36,color=0)
    size=.18+.017*(t-1)
    disk('crest mount',0,.75,size*1.23,.16,-.02,1,n=6 if kind=='speed' else 8)
    if kind=='health':
        points=[(-.9,.35),(-.75,.80),(-.3,1),(0,.65),(.3,1),(.75,.8),(.9,.35),(0,-.65)]
    elif kind=='attack':
        points=[(-.80,-.5),(0,1.15),(.80,-.5),(0,-.15)]
    elif kind=='speed':
        points=[(.15,1.05),(-.85,-.03),(-.15,-.03),(-.30,-.9),(.9,.26),(.13,.26)]
    else:
        points=[(-.67,-.67),(.67,-.67),(.67,.67),(-.67,.67)]
    prism('stat crest',[(x*size,.75+z*size) for x,z in points],.045,-.13,0)
    if kind=='dexterity':
        box('precision vertical',(0,-.16,.75),(.035,.02,size*1.15),1)
        box('precision horizontal',(0,-.17,.75),(size*1.15,.02,.035),1)
    if t>=2:
        for x in [-.24,.24]:gem('shoulder setting',x,.60,.065,-.045)
    if t>=3:
        tube_ring('second band',.33,.045,y=.12,z=.36,color=1)
    if t>=4:
        for sign in [-1,1]:prism('crest wings',[(sign*.18,.70),(sign*.43,.94),(sign*.38,.69),(sign*.23,.61)],.12,color=0)
    if t>=5:
        for x in [-.20,0,.20]:prism('crown prong',[(x-.045,.91),(x,1.10+(.08 if x==0 else 0)),(x+.045,.91)],.10,color=0)

BUILDERS={'wand':wand,'bow':bow,'sword':sword,'dagger':dagger,'dash':dash,'shield':shield,'bash':bash,'heal':heal}
STAGES=['Base silhouette','Reinforced fittings','Signature motif','Advanced guard or crest','Crowned masterwork']

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.cycles.use_denoising=False
scene.cycles.device='CPU'
scene.render.resolution_x=192;scene.render.resolution_y=192;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.view_settings.gamma=1
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.12

def area(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector((0,0,.7))-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
keylight=area('Neutral key',(-3,-4,6),80,4)
filllight=area('Neutral fill',(3,-1,2),20,3)
camera_data=bpy.data.cameras.new('Item camera');camera_data.type='ORTHO'
camera=bpy.data.objects.new('Item camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
models=[];objects=[]
items=CATALOG['items']
if SAMPLE:items=[i for i in items if i['tier'] in [1,5]]

for item in items:
    VERTS,FACES,MATS,PARTS=[],[],[],[]
    kind,tier=item['type'],item['tier']
    if kind in BUILDERS:BUILDERS[kind](tier)
    elif kind in ['robe','light','heavy']:armor(tier,kind)
    else:ring(tier,kind)
    mesh=bpy.data.meshes.new(f"{item['id']}_{kind}_T{tier}")
    mesh.from_pydata(VERTS,[],FACES);mesh.materials.append(WHITE);mesh.materials.append(BLACK)
    mesh.update()
    for face,mat in zip(mesh.polygons,MATS):face.material_index=mat;face.use_smooth=False
    # Make every primitive's normals consistently outward before exporting.
    obj=bpy.data.objects.new(f"{item['id']} | T{tier} {item['name']}",mesh)
    col=bpy.data.collections.new(f"{item['id']}_{kind}_T{tier}");scene.collection.children.link(col);col.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    for part,first,last in PARTS:obj.vertex_groups.new(name=part).add(list(range(first,last)),1,'REPLACE')
    mesh.calc_loop_triangles();triangles=len(mesh.loop_triangles)
    assert triangles<=600, (item,triangles)
    obj['item_id']=item['id'];obj['tier']=tier;obj['family']=kind;obj['triangles']=triangles
    obj['progression']=' > '.join(STAGES[:tier]);obj['palette']='pure black / pure white'
    file=f"{item['id']}-{kind}-t{tier}"
    bpy.ops.export_scene.gltf(filepath=str(OUT/'glb'/f'{file}.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT',export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
    # Pose only the render, keeping the export upright and at its usable local origin.
    if kind in ['wand','sword','dagger']:obj.rotation_euler.y=math.radians(24)
    bpy.context.view_layer.update()
    bounds=[obj.matrix_world @ Vector(v) for v in obj.bound_box]
    center=sum(bounds,Vector())/8
    span=max(max(v.x for v in bounds)-min(v.x for v in bounds),max(v.z for v in bounds)-min(v.z for v in bounds))
    camera.location=center+Vector((1.35,-5,1.3))
    camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.ortho_scale=span*1.24
    if not NO_RENDER:
        scene.render.filepath=str(OUT/'renders'/f'{file}.png')
        bpy.ops.render.render(write_still=True)
    obj.rotation_euler=(0,0,0);obj.hide_render=True;obj.select_set(False)
    objects.append(obj)
    models.append({**item,'file':f'glb/{file}.glb','render':f'renders/{file}.png','triangles':triangles,'vertices':len(mesh.vertices),'parts':[group.name for group in obj.vertex_groups],'stage':STAGES[tier-1]})
    print(f"ASSET_DONE {item['id']} {kind} T{tier}: {triangles} triangles",flush=True)

if not SAMPLE:
    type_order={t['type']:i for i,t in enumerate(CATALOG['types'])}
    # An editable 5-column, 15-row asset library. Each model keeps named part groups.
    for ob,item in zip(objects,models):
        ob.location=((item['tier']-1)*3.2,0,(14-type_order[item['type']])*3.0)
        ob.hide_render=False
    camera.location=(6.4,-65,23);camera.rotation_euler=(Vector((6.4,0,22.5))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=48
    for area_ in (bpy.context.screen.areas if bpy.context.screen else []):
        if area_.type=='VIEW_3D':
            area_.spaces.active.region_3d.view_distance=47
            area_.spaces.active.region_3d.view_location=Vector((6.4,0,22))
            area_.spaces.active.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
            area_.spaces.active.shading.color_type='MATERIAL'
    scene['asset_library']='Relic Run / 75 equipment items / 15 families x 5 tiers'
    scene['design']='Original RuneScape-inspired low-poly silhouettes. Black and white. Additive tier progression.'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'relic-run-75-items.blend'))
    manifest={'generator':'Blender '+bpy.app.version_string,'materials':['#ffffff','#000000'],'triangleBudget':600,'types':CATALOG['types'],'models':models}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
else:
    (OUT/'sample-manifest.json').write_text(json.dumps({'models':models},indent=2)+'\n',encoding='utf-8')
print('BLENDER_ITEMS_COMPLETE',len(models),flush=True)
