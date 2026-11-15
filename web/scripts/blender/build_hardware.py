# Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
"""
build_hardware.py — builds the outpost's hero hardware in Blender (original designs, no agency insignia):
  habitat.glb   core habitat drum on legs, airlock with stairs, lab module, tanks, roof equipment
  ascent.glb    the ascent vehicle (rocket) with engines, landing legs, ladder, thrusters
Every hard edge is bevelled; panels are inset with seams and rivets; our own markings ("PLUTONYX", module
numbers, hazard stripes) are real geometry. Ambient occlusion, edge wear and engine scorch are baked into
vertex colours (R = occlusion, G = wear, B = scorch), and box-projected UVs carry tiling PBR textures.

Run:  blender -b -P build_hardware.py -- <output folder>
Axes: Blender Z up, X east, Y north (the exporter converts to glTF Y up).
"""
import bpy, bmesh, math, sys, os, random
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.getcwd()
MATS = ['hull', 'graphite', 'orange', 'steel', 'foil', 'glass', 'engine', 'rubber', 'mark']
HULL, GRAPHITE, ORANGE, STEEL, FOIL, GLASS, ENGINE, RUBBER, MARK = range(9)
MAT_COLORS = [(0.80, 0.76, 0.68), (0.03, 0.03, 0.035), (0.58, 0.09, 0.012), (0.33, 0.34, 0.36), (0.48, 0.25, 0.04), (0.02, 0.05, 0.08), (0.04, 0.035, 0.03), (0.01, 0.01, 0.01), (0.015, 0.016, 0.02)]
T = Matrix.Translation
RX = lambda a: Matrix.Rotation(a, 4, 'X')
RY = lambda a: Matrix.Rotation(a, 4, 'Y')
RZ = lambda a: Matrix.Rotation(a, 4, 'Z')
random.seed(7)


class Kit:
    def __init__(self):
        self.bm = bmesh.new()
        self.hard = self.bm.faces.layers.int.new('hard')

    def _tag(self, verts, mat, hard):
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mat
            f[self.hard] = 1 if hard else 0

    def cyl(self, r1, r2, h, M, mat, segs=32, caps=True, hard=True):
        """Cylinder/frustum along local Z, centred."""
        r = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h, matrix=M)
        self._tag(r['verts'], mat, hard)
        return r['verts']

    def box(self, sx, sy, sz, M, mat, hard=True):
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M @ Matrix.Diagonal((sx, sy, sz, 1)))
        self._tag(r['verts'], mat, hard)
        return r['verts']

    def sphere(self, r, M, mat, u=24, v=12, hard=False):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=u, v_segments=v, radius=r, matrix=M)
        self._tag(res['verts'], mat, hard)
        return res['verts']

    def torus(self, R, r, M, mat, seg=48, tube=8, arc=math.tau):
        rings = []
        n = seg if arc >= math.tau - 1e-6 else seg + 1
        for i in range(n):
            a = arc * i / seg
            c = Vector((math.cos(a) * R, math.sin(a) * R, 0)); d = Vector((math.cos(a), math.sin(a), 0))
            rings.append([self.bm.verts.new(M @ (c + d * (math.cos(t) * r) + Vector((0, 0, math.sin(t) * r)))) for t in [math.tau * k / tube for k in range(tube)]])
        self._skin(rings, mat, closed=arc >= math.tau - 1e-6)

    def tube(self, pts, r, mat, seg=8):
        """Round pipe along a polyline (list of Vectors)."""
        rings = []
        for i, p in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            a = d.cross(Vector((0, 0, 1)))
            if a.length < 1e-4: a = d.cross(Vector((1, 0, 0)))
            a.normalize(); b = d.cross(a).normalized()
            rings.append([self.bm.verts.new(p + (a * math.cos(t) + b * math.sin(t)) * r) for t in [math.tau * k / seg for k in range(seg)]])
        self._skin(rings, mat, closed=False)

    def _skin(self, rings, mat, closed):
        n = len(rings); m = len(rings[0])
        for i in range(n if closed else n - 1):
            A, B = rings[i], rings[(i + 1) % n]
            for k in range(m):
                f = self.bm.faces.new((A[k], A[(k + 1) % m], B[(k + 1) % m], B[k]))
                f.material_index = mat; f[self.hard] = 0

    def panel_wall(self, R, z0, z1, cols, rows, M, mat, a0=0.0, a1=math.tau, inset=0.035, depth=-0.018, rivets=True, skip=None):
        """A cylindrical wall of separate inset panels with seams and rivets. Axis = local Z."""
        full = a1 - a0 >= math.tau - 1e-6
        nc = cols if full else cols + 1
        grid = [[self.bm.verts.new(M @ Vector((math.cos(a0 + (a1 - a0) * c / cols) * R, math.sin(a0 + (a1 - a0) * c / cols) * R, z0 + (z1 - z0) * r / rows))) for c in range(nc)] for r in range(rows + 1)]
        faces = []
        for r in range(rows):
            for c in range(cols):
                if skip and skip(r, c): continue
                f = self.bm.faces.new((grid[r][c], grid[r][(c + 1) % nc], grid[r + 1][(c + 1) % nc], grid[r + 1][c]))
                f.material_index = mat; f[self.hard] = 0; faces.append(f)
        bmesh.ops.inset_individual(self.bm, faces=faces, thickness=inset, depth=depth)
        if rivets:
            for r in range(rows + 1):
                for c in range(cols * 3):
                    a = a0 + (a1 - a0) * c / (cols * 3)
                    self.rivet(M @ T((math.cos(a) * (R + 0.004), math.sin(a) * (R + 0.004), z0 + (z1 - z0) * r / rows + (0.05 if r == 0 else -0.05 if r == rows else 0))) @ RZ(a) @ RY(math.pi / 2))

    def rivet(self, M, r=0.016):
        v = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=6, radius1=r, radius2=r * 0.6, depth=0.012, matrix=M)['verts']
        self._tag(v, STEEL, False)

    def text(self, body, size, M, mat=MARK, wrap_r=None):
        """Our own markings as real geometry. With wrap_r the text bends around a cylinder of that radius (axis Z)."""
        cu = bpy.data.curves.new(type='FONT', name='t'); cu.body = body; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.space_character = 1.12
        ob = bpy.data.objects.new('t', cu); bpy.context.collection.objects.link(ob)
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        n0 = len(self.bm.verts); self.bm.from_mesh(me); self.bm.verts.ensure_lookup_table()
        new = self.bm.verts[n0:]
        for v in new:
            if wrap_r:
                a = v.co.x / wrap_r
                v.co = M @ Vector((math.sin(a) * (wrap_r + 0.012), -math.cos(a) * (wrap_r + 0.012), v.co.y))
            else:
                v.co = M @ Vector((v.co.x, v.co.y, 0.012))
        self._tag(new, mat, False)
        bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)

    def hazard(self, w, h, M, n=10):
        """Black-and-orange hazard stripe bar (our own marking)."""
        for i in range(n):
            self.box(w / n * 0.98, 0.012, h, M @ T((-w / 2 + w / n * (i + 0.5), 0, 0)), ORANGE if i % 2 else GRAPHITE, hard=False)

    def finish(self, name, scorch=None):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.edges.ensure_lookup_table()
        edges = [e for e in bm.edges if len(e.link_faces) == 2 and all(f[self.hard] for f in e.link_faces) and e.calc_face_angle(0) > 0.6 and e.calc_length() > 0.06]
        bmesh.ops.bevel(bm, geom=edges, offset=0.022, offset_type='OFFSET', segments=2, profile=0.6, affect='EDGES', clamp_overlap=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.normal_update(); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        # text meshes bring their own UV and colour layers: drop them so ours are the first (TEXCOORD_0 / COLOR_0)
        for layers in (bm.loops.layers.uv, bm.loops.layers.color, bm.loops.layers.float_color):
            for l in list(layers.values()): layers.remove(l)
        # box-projected UVs (2 m tiles)
        uv = bm.loops.layers.uv.new('UVMap')
        for f in bm.faces:
            n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
            for l in f.loops:
                c = l.vert.co
                l[uv].uv = ((c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y))
                l[uv].uv = (l[uv].uv[0] * 0.5, l[uv].uv[1] * 0.5)
        # baked occlusion, edge wear, scorch → vertex colours
        tree = BVHTree.FromBMesh(bm)
        samples = []
        for i in range(14):
            u, v = random.random(), random.random(); r = math.sqrt(u); t = math.tau * v
            samples.append(Vector((r * math.cos(t), r * math.sin(t), math.sqrt(max(0.0, 1 - u)))))
        ao = {}
        for v in bm.verts:
            n = v.normal
            if n.length < 0.5: ao[v.index] = (1, 0); continue
            a = n.cross(Vector((0, 0, 1)));
            if a.length < 1e-3: a = n.cross(Vector((1, 0, 0)))
            a.normalize(); b = n.cross(a)
            o = v.co + n * 0.07; occ = 0.0
            for s in samples:
                d = a * s.x + b * s.y + n * s.z
                hit = tree.ray_cast(o, d, 2.2)
                # ignore the panel seam or rivet right next to the vertex: only larger shapes cast baked shadow
                if hit[0] is not None and hit[3] > 0.16: occ += 1 - hit[3] / 2.2
                elif d.z < -0.05 and -o.z / d.z < 2.2: occ += 1 - (-o.z / d.z) / 2.2
            # convex edges wear first: compare the vertex normal with its faces' normals
            wear = 0.0
            if v.link_faces: wear = max(0.0, 1 - min(n.dot(f.normal) for f in v.link_faces)) * 2.2
            ao[v.index] = (max(0.0, 1 - occ / len(samples) * 1.05), min(1.0, wear))
        col = bm.loops.layers.color.new('Col')
        enc = lambda x: max(0.0, min(1.0, x)) ** (1 / 2.2)   # byte colours are stored sRGB; the exporter turns them back to linear
        for f in bm.faces:
            f.smooth = True
            for l in f.loops:
                o, w = ao[l.vert.index]
                l[col] = (enc(o), enc(w), enc(scorch(l.vert.co) if scorch else 0.0), 1.0)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        for i, m in enumerate(MATS):
            mat = bpy.data.materials.get(m) or bpy.data.materials.new(m)
            mat.diffuse_color = MAT_COLORS[i] + (1.0,)   # distinct colours so exporters and optimisers never merge them
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf: bsdf.inputs['Base Color'].default_value = MAT_COLORS[i] + (1.0,)
            me.materials.append(mat)
        # keep exactly one colour attribute (ours) so it is exported as COLOR_0
        for ca in list(me.color_attributes):
            if ca.name != 'Col': me.color_attributes.remove(ca)
        if 'Col' in me.color_attributes:
            me.color_attributes.active_color = me.color_attributes['Col']
            try: me.color_attributes.render_color_index = 0
            except Exception: pass
        ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
        mod = ob.modifiers.new('split', 'EDGE_SPLIT'); mod.split_angle = 0.62
        print(name, 'verts', len(me.vertices), 'faces', len(me.polygons))
        return ob


def export(ob, path):
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    base = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    for extra in ({'export_vertex_color': 'ACTIVE', 'export_all_vertex_colors': False}, {'export_vertex_color': 'ACTIVE'}, {'export_colors': True}, {}):
        try:
            bpy.ops.export_scene.gltf(**base, **extra); print('exported', path, extra); return
        except TypeError as e:
            print('export retry:', e)


def leg(k, M, top, foot, pad=0.55):
    """Landing/support leg: main strut, two braces, hydraulic sleeve, foot pad."""
    k.tube([M @ Vector(top), M @ Vector(foot)], 0.11, STEEL, 10)
    mid = Vector(top).lerp(Vector(foot), 0.45)
    k.tube([M @ mid, M @ (Vector(top) + Vector((0, 0, -0.9)) - Vector((top[0], top[1], 0)).normalized() * 0.5)], 0.055, STEEL, 8)
    k.cyl(0.15, 0.15, 0.7, M @ T(Vector(top).lerp(Vector(foot), 0.72)) @ Matrix.Identity(4), GRAPHITE, 12)
    k.cyl(pad, pad * 1.08, 0.1, M @ T((foot[0], foot[1], 0.05)), GRAPHITE, 20)
    k.cyl(pad * 0.45, pad * 0.45, 0.16, M @ T((foot[0], foot[1], 0.14)), STEEL, 14)


def hatch(k, M, r=0.85):
    """Round pressure hatch facing local +Y: frame ring, door, wheel handle, porthole, stripes."""
    R = RX(-math.pi / 2)
    k.cyl(r + 0.16, r + 0.16, 0.12, M @ R, GRAPHITE, 36)
    k.cyl(r, r, 0.1, M @ T((0, 0.06, 0)) @ R, HULL, 36)
    k.torus(r + 0.02, 0.05, M @ T((0, 0.1, 0)) @ R, STEEL, 40, 8)
    k.torus(0.3, 0.035, M @ T((0, 0.2, -0.05)) @ R, ORANGE, 24, 8)
    for a in (0, math.pi / 3, 2 * math.pi / 3):
        k.tube([M @ Vector((math.cos(a) * 0.3, 0.2, math.sin(a) * 0.3 - 0.05)), M @ Vector((-math.cos(a) * 0.3, 0.2, -math.sin(a) * 0.3 - 0.05))], 0.02, ORANGE, 6)
    k.cyl(0.05, 0.05, 0.14, M @ T((0, 0.15, -0.05)) @ R, STEEL, 10)
    k.cyl(0.2, 0.2, 0.05, M @ T((0, 0.13, 0.42)) @ R, GLASS, 20)
    k.torus(0.21, 0.028, M @ T((0, 0.15, 0.42)) @ R, STEEL, 20, 6)
    for i in range(6):
        a = math.tau * i / 6 + 0.3
        k.box(0.16, 0.06, 0.07, M @ T((math.cos(a) * (r + 0.08), 0.09, math.sin(a) * (r + 0.08))) @ RY(-a), STEEL)


# =====================================================================================================  HABITAT
def build_habitat():
    k = Kit()
    R, Z0, Z1 = 5.4, 1.7, 8.1
    # core drum: 28 panel columns x 4 rows; the airlock side (south, -Y) keeps plain panels
    k.panel_wall(R, Z0, Z1, 28, 4, Matrix.Identity(4), HULL)
    k.cyl(R - 0.02, R - 0.02, 0.2, T((0, 0, Z0 + 0.1)), GRAPHITE, 56)                       # floor plate
    k.cyl(R + 0.08, R + 0.08, 0.26, T((0, 0, Z0 - 0.05)), GRAPHITE, 56)                     # lower skirt ring
    k.cyl(R - 0.5, R + 0.02, 0.5, T((0, 0, Z0 - 0.4)), GRAPHITE, 56)
    k.cyl(R + 0.06, R + 0.06, 0.22, T((0, 0, 4.9)), ORANGE, 56)                             # accent band
    k.cyl(R + 0.1, R + 0.1, 0.2, T((0, 0, Z1)), GRAPHITE, 56)                               # roof ring
    # roof: shallow panelled cone, cap, handrail
    for i in range(3):
        r0, r1 = R - i * 1.7, R - (i + 1) * 1.7
        k.cyl(r0 + 0.02, max(r1, 0.4) + 0.02, 0.42, T((0, 0, Z1 + 0.3 + i * 0.42)), HULL, 56, caps=(i == 2))
        k.torus(r0, 0.035, T((0, 0, Z1 + 0.1 + i * 0.42)), STEEL, 56, 6)
    k.torus(R - 0.25, 0.03, T((0, 0, Z1 + 1.15)), STEEL, 56, 6)
    for i in range(20):
        a = math.tau * i / 20
        k.tube([Vector((math.cos(a) * (R - 0.25), math.sin(a) * (R - 0.25), Z1 + 0.15)), Vector((math.cos(a) * (R - 0.25), math.sin(a) * (R - 0.25), Z1 + 1.15))], 0.022, STEEL, 6)
    # windows: two rows, framed, glass slightly recessed (skip the airlock and lab sides)
    for row, z in enumerate((3.45, 6.45)):
        for i in range(14):
            a = math.tau * i / 14 + row * 0.22
            if abs(math.atan2(math.sin(a + math.pi / 2), math.cos(a + math.pi / 2))) < 0.42 and row == 0: continue
            if abs(math.atan2(math.sin(a), math.cos(a))) < 0.3 and row == 0: continue
            M = RZ(a) @ T((R + 0.01, 0, z)) @ RY(math.pi / 2)
            k.box(0.86, 1.1, 0.1, M, GRAPHITE)
            k.box(0.66, 0.9, 0.06, M @ T((0, 0, 0.045)), GLASS, hard=False)
            for sx in (-0.48, 0.48):
                for sy in (-0.5, 0.5): k.rivet(M @ T((sy * 0.76, sx * 1.0, 0.055)), 0.02)
    # legs
    for i in range(8):
        a = math.tau * i / 8 + 0.39
        leg(k, RZ(a), (4.5, 0, Z0 - 0.3), (5.5, 0, 0.1))
    # airlock (south): box, hatch, light, hazard bars, stairs with rails, name plate
    A = T((0, -6.6, 2.95))
    k.box(2.8, 3.4, 2.8, A, HULL)
    k.box(2.9, 0.16, 2.9, A @ T((0, -1.62, 0)), GRAPHITE)
    for sx in (-1.42, 1.42):
        for z in (-0.9, 0.0, 0.9): k.box(0.06, 3.1, 0.12, A @ T((sx, 0, z)), GRAPHITE)
    hatch(k, A @ T((0, -1.72, -0.05)) @ RZ(math.pi))
    k.hazard(2.5, 0.16, A @ T((0, -1.74, 1.22)))
    k.box(0.5, 0.1, 0.14, A @ T((0, -1.74, 1.02)), GLASS, hard=False)
    k.text('LS-01', 0.36, A @ T((-1.415, -0.2, 0.7)) @ RZ(-math.pi / 2) @ RX(math.pi / 2))
    k.text('PLUTONYX', 0.3, A @ T((1.415, 0.1, 0.72)) @ RZ(math.pi / 2) @ RX(math.pi / 2))
    k.cyl(1.05, 1.05, 1.3, T((0, -4.9, 2.95)) @ RX(math.pi / 2), GRAPHITE, 28)                # collar to the drum
    for i in range(7):
        k.box(1.7, 0.3, 0.05, T((0, -8.55 - i * 0.34, 1.52 - i * 0.235)), STEEL)
    for sx in (-0.9, 0.9):
        k.tube([Vector((sx, -8.4, 1.55)), Vector((sx, -10.75, 0.05))], 0.035, STEEL, 8)
        k.tube([Vector((sx, -8.4, 2.5)), Vector((sx, -10.75, 1.0)), Vector((sx, -10.75, 0.02))], 0.03, ORANGE, 8)
        for j in range(4):
            y = -8.4 - j * 0.78; z = 1.55 - j * 0.5
            k.tube([Vector((sx, y, z)), Vector((sx, y, z + 0.95))], 0.022, STEEL, 6)
    # lab module (east): horizontal cylinder, panels, frames, cradles, end hatch, windows, pipes
    L = T((12.6, 1.0, 3.3)) @ RY(math.pi / 2)
    k.panel_wall(2.3, -4.4, 4.4, 20, 5, L, HULL, inset=0.03)
    for z in (-4.4, 4.4):
        k.cyl(2.32, 2.32, 0.12, L @ T((0, 0, z)), GRAPHITE, 40)
    k.cyl(2.3, 1.5, 0.7, L @ T((0, 0, 4.8)), HULL, 40); k.cyl(1.5, 1.5, 0.12, L @ T((0, 0, 5.2)), GRAPHITE, 32)
    k.cyl(1.5, 2.3, 0.7, L @ T((0, 0, -4.8)), HULL, 40)
    for z in (-2.9, 0.0, 2.9): k.torus(2.34, 0.07, L @ T((0, 0, z)), STEEL, 48, 8)
    hatch(k, T((18.0, 1.0, 3.3)) @ RZ(-math.pi / 2), 0.8)
    k.cyl(1.25, 1.25, 2.6, T((6.4, 1.0, 3.3)) @ RY(math.pi / 2), GRAPHITE, 28)               # tunnel to the drum
    for i in range(6): k.torus(1.27, 0.035, T((5.4 + i * 0.4, 1.0, 3.3)) @ RY(math.pi / 2), RUBBER, 28, 6)
    for x in (9.7, 12.6, 15.5):
        k.box(0.5, 4.2, 0.3, T((x, 1.0, 0.95)), GRAPHITE)
        for sy in (-1.7, 1.7):
            k.tube([Vector((x, 1.0 + sy, 1.0)), Vector((x, 1.0 + sy * 1.15, 0.08))], 0.09, STEEL, 8)
            k.cyl(0.42, 0.45, 0.09, T((x, 1.0 + sy * 1.15, 0.045)), GRAPHITE, 16)
        for sy in (-1, 1):
            k.box(0.9, 0.1, 0.62, T((x + 1.4 if x < 15 else x - 1.4, 1.0 + sy * 2.3, 3.75)), GRAPHITE)
            k.box(0.72, 0.07, 0.46, T((x + 1.4 if x < 15 else x - 1.4, 1.0 + sy * 2.34, 3.75)), GLASS, hard=False)
    k.text('PLUTONYX', 0.5, T((12.6, 1.0, 3.3)), wrap_r=None) if False else None
    k.text('GH-LAB 02', 0.34, T((12.6, -1.32, 2.55)) @ RX(math.pi / 2))
    k.box(4.4, 0.03, 0.7, T((12.6, -1.305, 2.55)), HULL, hard=False)
    for dy in (-0.5, 0.0, 0.5):
        k.tube([Vector((8.4 + i * 0.5, 1.0 + dy, 5.63 - abs(dy) * 0.12)) for i in range(18)], 0.045, STEEL if dy else ORANGE, 8)
    # tanks (west) with straps and feed pipes
    for i, a in enumerate((2.35, 2.9, 3.45)):
        x, y = math.cos(a) * 6.5, math.sin(a) * 6.5
        k.cyl(0.62, 0.62, 2.0, T((x, y, 2.3)), FOIL, 24, caps=False)
        k.sphere(0.62, T((x, y, 3.3)), FOIL, 24, 10); k.sphere(0.62, T((x, y, 1.3)), FOIL, 24, 10)
        for z in (1.6, 2.3, 3.0): k.torus(0.635, 0.03, T((x, y, z)), STEEL, 24, 6)
        k.cyl(0.75, 0.8, 0.14, T((x, y, 0.07)), GRAPHITE, 20)
        for s in (0, 2.1, 4.2): k.tube([Vector((x + math.cos(s) * 0.45, y + math.sin(s) * 0.45, 0.14)), Vector((x + math.cos(s) * 0.3, y + math.sin(s) * 0.3, 0.9))], 0.035, STEEL, 6)
        k.tube([Vector((x, y, 3.9)), Vector((x * 0.93, y * 0.93, 4.3)), Vector((math.cos(a) * 5.45, math.sin(a) * 5.45, 4.3))], 0.045, STEEL, 8)
    # roof equipment: radiators, vents, mast with lamp, cable tray, sensor boxes
    for i in range(4):
        M = RZ(0.9) @ T((-2.4 + i * 0.62, 1.4, Z1 + 1.9)) @ RX(0.32)
        k.box(0.05, 2.6, 1.5, M, HULL)
        for j in range(9): k.box(0.07, 0.02, 1.4, M @ T((0, -1.2 + j * 0.3, 0)), STEEL, hard=False)
    k.box(2.6, 0.12, 0.12, RZ(0.9) @ T((-1.45, 1.4, Z1 + 1.2)), GRAPHITE)
    for a, r in ((4.0, 2.6), (4.6, 3.3), (5.4, 2.2)):
        k.cyl(0.26, 0.3, 0.5, T((math.cos(a) * r, math.sin(a) * r, Z1 + 0.95)), GRAPHITE, 18); k.cyl(0.36, 0.36, 0.06, T((math.cos(a) * r, math.sin(a) * r, Z1 + 1.26)), STEEL, 18)
    k.cyl(0.06, 0.09, 5.4, T((1.8, 1.2, Z1 + 3.9)), STEEL, 10); k.sphere(0.13, T((1.8, 1.2, Z1 + 6.65)), GLASS, 12, 8)
    for z in (1.6, 3.2, 4.6): k.tube([Vector((1.8, 1.2, Z1 + z)), Vector((2.9, 0.4, Z1 + 1.0))], 0.012, STEEL, 4)
    k.box(0.9, 0.6, 0.45, T((-0.4, -2.6, Z1 + 1.1)), GRAPHITE); k.box(0.5, 0.5, 0.3, T((2.6, -1.8, Z1 + 0.95)), ORANGE)
    # cables down to the ground
    k.tube([Vector((3.9, -3.6, Z0 - 0.1)), Vector((4.6, -4.3, 0.6)), Vector((5.6, -5.2, 0.06)), Vector((9.5, -7.0, 0.05))], 0.05, RUBBER, 8)
    k.tube([Vector((-3.6, 3.9, Z0 - 0.1)), Vector((-4.4, 4.6, 0.5)), Vector((-6.5, 5.5, 0.05))], 0.05, RUBBER, 8)
    return k.finish('habitat')


# =====================================================================================================  ASCENT VEHICLE
def build_ascent():
    k = Kit()
    R = 2.25
    k.panel_wall(R, 3.0, 8.4, 20, 3, Matrix.Identity(4), HULL)                               # lower tank section
    k.cyl(R + 0.05, R + 0.05, 0.5, T((0, 0, 8.65)), GRAPHITE, 48)                            # interstage
    for i in range(24):
        a = math.tau * i / 24
        if i % 2: k.box(0.52, 0.02, 0.42, RZ(a) @ T((0, -(R + 0.06), 8.65)), HULL, hard=False)   # roll pattern
    k.panel_wall(R, 8.9, 12.6, 20, 2, Matrix.Identity(4), HULL)                              # crew section
    k.cyl(R + 0.04, R + 0.04, 0.3, T((0, 0, 12.75)), ORANGE, 48)
    # nose: ogive from stacked frustums, cap, pitot
    prof = [(R, 12.9), (2.12, 13.9), (1.78, 14.9), (1.28, 15.8), (0.72, 16.5), (0.3, 16.95)]
    for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
        k.cyl(r0, r1, z1 - z0, T((0, 0, (z0 + z1) / 2)), HULL, 48, caps=False)
        k.torus(r0, 0.022, T((0, 0, z0)), STEEL, 48, 6)
    k.sphere(0.3, T((0, 0, 16.95)), GRAPHITE, 20, 10); k.cyl(0.02, 0.03, 0.9, T((0, 0, 17.6)), STEEL, 8)
    # thrust structure and engines
    k.cyl(R, R + 0.4, 0.9, T((0, 0, 2.55)), GRAPHITE, 48)
    k.cyl(R + 0.4, R + 0.4, 0.18, T((0, 0, 2.05)), STEEL, 48)
    for i, (x, y) in enumerate([(0, 0)] + [(math.cos(a) * 1.35, math.sin(a) * 1.35) for a in (0.785, 2.356, 3.927, 5.498)]):
        k.cyl(0.26, 0.2, 0.4, T((x, y, 1.9)), STEEL, 20)
        k.cyl(0.24, 0.62, 1.25, T((x, y, 1.15)), ENGINE, 28, caps=False)
        k.torus(0.62, 0.035, T((x, y, 0.53)), ENGINE, 28, 6)
        for z in (0.9, 1.3): k.torus(0.3 + (1.78 - z) * 0.3, 0.02, T((x, y, z)), STEEL, 24, 6)
        k.tube([Vector((x + 0.3, y, 2.0)), Vector((x + 0.5, y + 0.2, 1.6)), Vector((x + 0.36, y + 0.3, 1.2))], 0.03, STEEL, 6)
    # landing legs: four, with A-frames and big pads
    for i in range(4):
        a = math.tau * i / 4 + 0.785; M = RZ(a)
        k.tube([M @ Vector((R, 0, 5.6)), M @ Vector((5.0, 0, 0.22))], 0.14, HULL, 12)
        k.cyl(0.19, 0.19, 1.3, M @ T((3.05, 0, 3.55)) @ RY(-0.74), GRAPHITE, 14)
        for s in (-1, 1): k.tube([M @ Vector((R + 0.3, s * 1.1, 2.7)), M @ Vector((4.3, 0, 1.1))], 0.07, STEEL, 8)
        k.tube([M @ Vector((R + 0.2, 0, 3.4)), M @ Vector((3.6, 0, 2.3))], 0.05, STEEL, 8)
        k.cyl(0.85, 0.95, 0.14, M @ T((5.0, 0, 0.07)), GRAPHITE, 24); k.cyl(0.3, 0.3, 0.3, M @ T((5.0, 0, 0.22)), STEEL, 14)
        k.box(0.5, 0.42, 0.6, M @ T((R + 0.18, 0, 5.6)), GRAPHITE)
        # thruster quad above each leg
        Q = M @ T((R + 0.2, 0, 11.6)); k.box(0.36, 0.5, 0.5, Q, GRAPHITE)
        for d in ((0.26, 0, 0, RY(math.pi / 2)), (0, 0.3, 0, RX(-math.pi / 2)), (0, -0.3, 0, RX(math.pi / 2)), (0, 0, 0.3, Matrix.Identity(4))):
            k.cyl(0.05, 0.1, 0.16, Q @ T(d[:3]) @ d[3], ENGINE, 12, caps=False)
    # hatch, ladder, windows, raceway, umbilical plate, radiators
    hatch(k, RZ(math.pi) @ T((0, R + 0.02, 7.2)) @ RZ(0) if False else T((0, -(R + 0.02), 7.2)) @ RZ(math.pi), 0.72)
    k.hazard(1.9, 0.14, T((0, -(R + 0.05), 8.25)))
    for sx in (-0.34, 0.34): k.tube([Vector((sx, -(R + 0.16), 2.6)), Vector((sx, -(R + 0.16), 6.3))], 0.028, STEEL, 8)
    for j in range(12): k.tube([Vector((-0.34, -(R + 0.16), 2.75 + j * 0.3)), Vector((0.34, -(R + 0.16), 2.75 + j * 0.3))], 0.02, STEEL, 6)
    for j in (2.7, 4.4, 6.2):
        for sx in (-0.34, 0.34): k.tube([Vector((sx, -(R + 0.16), j)), Vector((sx, -R, j))], 0.02, STEEL, 6)
    for a in (-0.55, 0.0, 0.55):
        M = RZ(a) @ T((0, -(R + 0.01), 10.9)) @ RX(math.pi / 2)
        k.cyl(0.36, 0.36, 0.08, M, GRAPHITE, 24); k.cyl(0.27, 0.27, 0.06, M @ T((0, 0, 0.04)), GLASS, 24, hard=False); k.torus(0.37, 0.03, M @ T((0, 0, 0.05)), STEEL, 24, 6)
    k.box(0.34, 0.16, 8.6, RZ(1.9) @ T((0, -(R + 0.07), 7.5)), GRAPHITE)
    k.box(0.9, 0.12, 1.3, RZ(-1.9) @ T((0, -(R + 0.05), 4.4)), STEEL)
    for i in range(6): k.cyl(0.08, 0.08, 0.1, RZ(-1.9) @ T((-0.25 + (i % 2) * 0.5, -(R + 0.12), 3.95 + (i // 2) * 0.45)) @ RX(math.pi / 2), GRAPHITE, 10)
    for s in (1, -1):
        M = RZ(s * 1.2 + math.pi) @ T((0, -(R + 0.12), 10.2))
        k.box(1.7, 0.06, 2.2, M, HULL)
        for j in range(8): k.box(1.6, 0.03, 0.03, M @ T((0, -0.045, -0.95 + j * 0.27)), STEEL, hard=False)
    # markings: mission name up the side, vehicle number, both real geometry on the curved hull
    k.text('PLUTONYX', 0.62, RZ(0.9) @ T((0, 0, 5.9)) @ RY(math.pi / 2) if False else RZ(0.9) @ T((0, 0, 5.7)), wrap_r=R)
    k.text('AV-01', 0.5, RZ(-0.9) @ T((0, 0, 10.0)), wrap_r=R)
    k.text('PLUTONYX', 0.34, RZ(2.6) @ T((0, 0, 9.9)), wrap_r=R)
    return k.finish('ascent', scorch=lambda c: max(0.0, min(1.0, (3.4 - c.z) / 2.4)) * (0.55 + 0.45 * random.random()))


bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(OUT, exist_ok=True)
export(build_habitat(), os.path.join(OUT, 'habitat.glb'))
export(build_ascent(), os.path.join(OUT, 'ascent.glb'))
print('HARDWARE_DONE')
