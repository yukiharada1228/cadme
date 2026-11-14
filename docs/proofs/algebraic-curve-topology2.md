# Exact zero-locus graphs in a rational rectangle

`traceAlgebraicCurve2` represents F(u,v)=0 inside a closed, positive-area,
rational rectangle. Its vertices have exact algebraic coordinates. Edges
are implicit root branches and vertical segments, not straight chords.
The graph retains isolated points and returns connected parameter-space
components. F=0 returns `kind: 'area'`; this two-dimensional set is not
misrepresented as a graph. Nonzero constants return an empty graph.

## Reduction and complete projection events

Let C(u) be the gcd of the v coefficients of nonzero F. Divide F by C to
obtain a primitive nonvertical polynomial P. Replace C by its univariate
square-free part and P by H=P/gcd(P,Pv). This preserves the real zero set,
removes multiplicities and ensures that no fiber of H is identically zero.
Every irreducible factor of primitive P depends on v, so in characteristic
zero H and Hv are coprime. For positive v degree, Res_v(H,Hv) is nonzero.

Projection events include the u bounds and real roots of C, the v-leading
coefficient of H, Res_v(H,Hv), H(u,vMin) and H(u,vMax). Constant/zero
boundary restrictions create no additional events. If a boundary restriction
is identically zero, that horizontal boundary is a component; another
branch crossing it gives a multiple fiber root and is already a resultant
event. Isolating projection polynomials separately avoids artificially
combining their certificates into a single larger polynomial. Equal real
events are merged semantically, without tolerance or generic-position shears.

At every event alpha, enumerate all distinct real roots of H(alpha,v) in
the closed vertical bounds. If C(alpha)=0, add the vertical bound endpoints
and split the entire vertical segment at these contact points. This supplies
every point of the event fiber, including isolated real zeros and contacts
between vertical and nonvertical components.

## Regular slabs and exact attachment

Between consecutive events, the leading coefficient is nonzero, every
fiber root is simple, and no branch crosses the vertical bounds except for
components identically on them. The implicit-function theorem therefore
gives continuous, ordered, noncrossing real root branches. Their number
inside the rectangle is constant. A rational sample u in each open slab
records one root per branch; its bottom-to-top rank identifies the branch
throughout that slab.

To attach branches to an event, place rational horizontal separators
strictly between its distinct nonvertical fiber roots. For every separator
s, isolate all roots of H(u,s), and choose a rational probe between the event
and the nearest separator crossing toward the sample. At the event no
separator is a root, so such a probe exists. No separator can be crossed
between this probe and the event; root order matches the slab sample.

Each branch remains in the compact vertical interval. Every cluster point
as u approaches the event is a root on that event fiber. Since the branch
cannot cross the separating horizontal levels, exactly one fiber root is
possible, giving its unique endpoint. With one event root all bounded
branches attach there. With none there can be no incoming bounded branch.
This argument also handles several critical points with the same u,
crossings, cusps, tangencies and redundant complex-only projection events.
It does not infer connections from a fixed probe distance or nearest sample.

Every zero is now an event vertex, a vertical edge point or a unique branch
interior point. Branch interiors are ordered in disjoint open slabs;
vertical edges are split at every incident nonvertical root. Distinct edge
interiors do not intersect. Thus this finite graph with implicit edges
represents the exact bounded real zero locus, including graph cycles and
isolated vertices. `evaluateAlgebraicCurveEdge2` uses u on a branch and v
on a vertical edge, preserving stored endpoint incidence at critical fibers.
Multiplicity, orientation and pairing smooth analytic germs through a
singularity are separate questions and are not certified by this graph.

## Exact fibers and rational recognition

`bivariateFiberRoots` distinguishes an identically zero fiber from a finite
root list. Linear fibers use one-source rational images. Quadratic fibers
use the exact discriminant and quadratic formula, retaining one source
when its square root is rational. Higher-degree fibers use the existing
nonminimal-certificate norm elimination and exact candidate filtering.

`AlgebraicReal.recognizeRational` clears coefficient denominators. By the
rational-root theorem a reduced rational root has denominator at most the
absolute integer leading coefficient B. Refine its certificate to width
less than 1/(2B²). If the root is p/q, its distance to the interval midpoint
is less than 1/(4B²), hence less than 1/(2q²). Legendre's theorem makes it
a continued-fraction convergent of that midpoint. Enumerate convergents
of denominator at most B. Acceptance checks both exact polynomial zero
and strict membership in the isolating interval, so another root or a
nearby irrational value cannot be substituted. Failure leaves the same
root as an equivalent refined certificate. All refinement is exact and
has no fixed iteration limit.

## NURBS plane sections and limits

`intersectNurbsSurfacePlane3` applies this graph construction to each exact
NURBS plane-restriction polynomial in its parameter rectangle. A zero
restriction retains the whole patch in `containedPatches`. Empty graphs
are omitted; isolated vertices remain. Edge/vertex evaluators lift through
that exact patch's homogeneous polynomials, preserving both limits at
discontinuous knot seams instead of applying a global right-side default.
Positive weights make clearing the denominator equivalent to the plane
equation, so these lifted sets form the complete closed patch-wise section.

Graphs and connected components describe the parameter rectangles. Seams
between patches are not welded, and a noninjective surface may identify
different parameter points or edges in space. Global spatial topology,
surface embedding, trimmed-face classification, orientation and BRep sewing
remain future work. Exact arithmetic can be expensive at high degrees.
The construction arguments and independent tests are not a machine proof
of this TypeScript implementation.

Tests cover graph cycles, crossings, cusps, tangencies, isolated real points,
multiple critical roots on one fiber, nonlinear irrational fibers, separator
crossings, degree drops, vertical/repeated factors, boundary contacts and
very close components. Independent rational grids and Pythagorean points
check set coverage; analytic saddle/cylinder/paraboloid sections check lifts.

References: [CGAL algebraic curve/fiber analysis](https://doc.cgal.org/latest/Algebraic_kernel_d/index.html),
[rational-root theorem](https://math.oxford.emory.edu/site/math108/rationalRoots/),
and [continued-fraction convergence](https://crypto.stanford.edu/pbc/notes/contfrac/converge.html).
