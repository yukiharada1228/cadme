# Closed convex cylinder-solid plane splitting

`splitClippedCylinderByPlane3` accepts a factory-owned `clipCylinderBRep3`
solid and a rational plane h=0. It constructs the regularized children
S∩{h≤0} and S∩{h≥0}. Empty, one-sided disjoint, supporting contact and
genuine volume splits are distinguished. Lower-dimensional remnants are
removed from the children, while supporting contact is reported separately.

## Material and boundary

The parent is convex, compact and full-dimensional unless empty. Adding one
halfspace preserves the constructor's domain and boundary-completeness
argument. Every parent point belongs to at least one closed child; in a
genuine split the child interiors are disjoint. Their common set is the
convex planar section S∩{h=0}, a disk with positive relative area.

Each child has exactly one new cap on this plane. The negative child's
physical outward normal agrees with h; the positive child's is opposite.
The cap interior witness is checked against the parent and both children.
The two oriented cap boundaries are independently sewn into a common edge
table. Each original child coedge records its common-table subdivisions in
traversal order. This permits different child edge subdivisions while
preserving an exact correspondence. Existing child faces retain their
unique parent-face provenance; only the new cap has a null origin.

For a one-sided result the retained child is the original parent object,
so a redundant or supporting cut preserves the parent's topology indices.

## Exact one-sided classification

Before constructing children, enumerate signs of h at all existing vertices
and at stationary points of elliptic boundary edges that belong to the
actual arcs. Segment extrema occur at endpoints. A linear functional on a
planar facet attains its extrema on its polygonal/curved boundary unless
constant, in which case the boundary has the same value. In a cylinder wall
interior a stationary linear functional must be constant along the axis
(n·d=0); its generator extends to the finite wall boundary with unchanged
value. Thus vertices plus elliptic edge extrema suffice for this convex
cylinder/halfspace family, including artificial chart boundaries.

Both strict signs imply a genuine volume split, by convexity and
full-dimensionality. One strict sign and a zero imply supporting contact;
one strict sign without zero implies strict separation. A nonempty
full-dimensional parent cannot have only zero values. The retained child
is the original parent. The rejected child has empty owned boundary data
and the same normalized halfspace inventory that a full construction would
receive; only the zero-dimensional/lower-dimensional contact is regularized
away. An independent strict interior witness checks the material side.

On an ellipse p=C+Ux+Vy with x²/A+y²/B=1, write h(p)=c+ax+by and
T=Aa²+Bb². The weighted Cauchy identity

```
T(Bx²+Ay²) − AB(ax+by)² = (Bbx−Aay)²
```

gives the extrema ±√T of ax+by. When T>0 the stationary points are
p=C±(U·Aa+V·Bb)√T/T. They use one correlated algebraic parameter;
exact arc membership excludes stationary points on removed parts of the
supporting ellipse. If an extremum's sign was already observed, it cannot
change the classification and its membership test is skipped. For T=0,
h is constant on the edge and its vertices suffice. A zero extremum requires
c²=T; its coordinates x=−cAa/T, y=−cBb/T are rational. No floating-point
tolerance is used.
The identity is checked in Lean as `ellipse_support_identity`; the
enumeration and TypeScript execution are supported by arguments and tests.

## Rejoining

`rejoinClippedCylinderSplit3` removes the paired internal caps and independently
sews all external child patches. It retains child-to-parent face provenance
and checks closed oriented incidence, one shell and Euler characteristic 2.
The material is the original parent, by the child halfspace partition.
This operation is an inverse of the owned split, not arbitrary solid union.
It returns a sewn boundary and parent reference, rather than certifying a
new arbitrary BRep from topology alone.

## Validation and limits

Tests inspect opposite common-edge incidence, child-coedge subdivision
endpoints, physical cap normals, material partition on independent rational
grids, repeated child cuts, face provenance and closed rejoined shells.
They include rational oblique planes and axes, sign-scaled plane equations,
thin positive-volume children, a polyhedron entirely inside the cylinder,
nonvertex supporting contacts and ownership/freeze checks. Independent
finite-cylinder support formulas cover signed Pythagorean normals, both
axial extrema, normal reversal and a translated arbitrary rational axis. Additional cases reject ellipse extrema
outside retained arcs and preserve thin cuts detected only by irrational
stationary points.

Regression tests also cover a sole tangent contact at an ellipse seam in
finite plane/cylinder-face and bounded planar/cylinder-face intersections.
Those routines must return the isolated point, never the whole ellipse.

This is limited to convex filled-cylinder/rational-halfspace solids.
It does not implement general curved Booleans, cylinder/cylinder section
curves, nonconvex shell nesting or full TypeScript/runtime verification.
The oblique supporting-contact regression took about 118 seconds before
boundary classification and about 0.4 seconds afterward, including parent
construction, in separate local runs. These are observed case timings,
not a uniform performance bound. Genuine splits still construct both
children; expensive algebraic face construction remains possible.
