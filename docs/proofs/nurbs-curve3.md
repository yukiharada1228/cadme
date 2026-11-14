# Exact rational NURBS curves

This layer represents nonperiodic rational B-splines with rational control
points, strictly positive rational weights and expanded rational knots.
Degrees are positive integers; knot runs may have multiplicity at most p+1.
For N control points, there are N+p+1 knots and the active domain is
[U[p],U[N]]. Clamped and unclamped sequences are accepted. Degree zero,
nonpositive weights, periodic data and algebraic input weights/knots are
outside this constructor. Decimal input strings are exact rationals.

## Homogeneous representation and denominator

Lift each pole P to H=(wPx,wPy,wPz,w). On a nonzero span [U[k],U[k+1]],
compile the homogeneous de Boor recurrence over Q[u]. Its four results
X,Y,Z,W are immutable power polynomials in the original parameter; the
curve is (X/W,Y/W,Z/W). No sampled approximation is used.

At stage r and local index j, i=k-p+j and
alpha=(u-U[i])/(U[i+p-r+1]-U[i]). The denominator includes the nonzero
active knot span and is positive. For u on the closed span, alpha∈[0,1].
Starting from positive weights, every weight blend remains positive.
Thus W>0 on the closed span, there are no poles, and clearing W in an
intersection equation introduces no roots there. Lean checks the generic
positive-blend lemma `homogeneous_positive_blend`; the recurrence/indexing
argument and TypeScript implementation are not machine-verified.

Rational parameters use exact polynomial evaluation and division.
Algebraic parameters use the existing single-source rational-function image
operation, retaining an exact root certificate for each coordinate. The
derivative uses (X'W-XW')/W², and similarly for Y,Z. It is one-sided at knots.

## Refinement, splitting and reversal

Interior rational knot insertion blends homogeneous poles, then projects
the resulting positive weights back to rational poles. The standard
B-spline basis refinement identity preserves all four homogeneous span
polynomials, hence the projected curve and original parameterization.
Insertion is limited to multiplicity p+1; endpoint insertion is not supplied.
Splitting raises an interior knot to multiplicity p+1 and separates the
control and knot sequences at that block. No parameter rescaling occurs.

At a full-multiplicity interior knot the two limits can differ. Every span
has its own closed image. Evaluation defaults to the right branch, with
inward limits at the active-domain endpoints; an explicit left branch is
available. Splitting reports whether the two endpoint values coincide.
Reversal maps u to a+b-u, reverses poles and weights and transforms the
reversed knot sequence. At jumps it exchanges the left and right branches.
These APIs do not join discontinuities by a geometric segment.

## Plane intersection completeness

For a rational plane n·P+d=0, a span intersects exactly at roots of
F=nxX+nyY+nzZ+dW. A zero polynomial marks the entire closed span as
coincident. Otherwise the existing Sturm/root-isolation machinery enumerates
all distinct real roots, and exact comparison filters to the closed span.
Repeated differentiation determines parameter-root multiplicity, which
does not by itself classify geometric tangency at a singular parameter.

Events with the same parameter and spatial point are combined with their
incident span/multiplicity provenance. Different points at a discontinuous
knot stay separate. An endpoint event from a noncoincident span may also
belong to a coincident span; the result does not claim every event is a
globally isolated geometric intersection.

## Independent validation and scope

An independent Cox basis-polynomial recurrence checks every homogeneous
coefficient for clamped/unclamped curves of degrees 1–6. Refinement and
split tests compare homogeneous polynomials on entire spans, in addition
to point queries. Other fixtures check an exactly rationally parameterized
unit-circle quadrant, its analytic derivative, algebraic parameters,
nonuniform knots, one-sided corner derivatives, discontinuities and reversal.
An independently constructed degree-six polynomial curve supplies known
rational/irrational roots, endpoint roots and repeated-root multiplicities.
Circle tangency and coincident-span fixtures check the set assembly.

The source baseline and selected Lean lemma are not a proof of the whole
NURBS implementation. General curve/curve and surface intersections,
geometric simplicity/regularity certification, trimmed BRep integration
and commercial CAD file import remain future work. Tensor-product surface
geometry is supplied separately by [nurbsSurface3](nurbs-surface3.md).
These curves are consequently a separate parameterized-geometry API;
they are not yet accepted as the existing `Curve3` BRep edge variants.
High degree and algebraic operations may cause large exact coefficients.

Algorithm references: Michigan Tech's [de Boor recurrence](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/B-spline/de-Boor.html)
and [homogeneous NURBS knot insertion](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/surface/NURBS-knot-insert.html).
