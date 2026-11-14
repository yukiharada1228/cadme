# Exact rational tensor-product NURBS surfaces

`nurbsSurface3` accepts a rectangular pole grid indexed [u][v], positive
rational weights, two positive degrees and expanded rational knot sequences.
Each direction has the same clamped/unclamped and multiplicity rules as
`nurbsCurve3`. Data are snapshotted and frozen; supplied cached domains are
ignored when reconstructing structural inputs. Periodic wrapping, negative
weights and algebraic input knots/weights are not supplied.

## Polynomial representation and evaluation

Lift each pole to H=(wx,wy,wz,w). Compile the u-direction curves over Q[u],
then apply the v-direction homogeneous de Boor recurrence over Q[u,v].
Each nonzero knot rectangle has four immutable bivariate polynomials
X,Y,Z,W. The represented point is (X/W,Y/W,Z/W). No mesh or samples define
the geometry. Positivity of the denominator follows by applying the existing
positive-blend argument successively in both directions; the selected Lean
lemma `homogeneous_positive_blend` is reused, not a new runtime proof.

`BivariatePolynomial` stores coefficient [i][j] of u^i v^j using univariate
v-polynomial rows. Arithmetic, partial derivatives, specialization and
transposition use exact rationals. Evaluation at rational or algebraic
parameters uses the existing certified algebraic arithmetic. If either
parameter is rational, specialization leaves a single-source rational image.
Semantically equal algebraic parameters use diagonal substitution u=v.
Unrelated algebraic parameters use exact field arithmetic; this can cause
large degrees and coefficients and has no interactive performance bound.

The active-domain endpoint conventions are inward limits, independently in
u and v. At interior full-multiplicity knots callers select left or right
in each direction, allowing four distinct branches at a crossing of seams.
Each polynomial rectangle describes its own closed image; jumps are not
connected by fabricated surface strips.

## Differentials, curves and refinement

For each numerator N, partial derivatives are (NuW-NWu)/W² and
(NvW-NWv)/W². Their cross product is the nonunit oriented normal.
`regular` means this normal is nonzero at the queried branch and parameter.
Zero normals are reported rather than normalized. This is not a global
regularity, injectivity or valid-face certificate.

Fixing a rational u evaluates the homogeneous u-curves at that value. Their
positive output weights and projected poles form a v-direction NURBS curve.
Fixing v is symmetric. Thus isocurves retain their original parameterization
and may themselves have jumps in the remaining direction.

Knot insertion applies the existing homogeneous curve insertion to every
control line in the chosen direction. Linearity in the other direction
preserves all four homogeneous patch polynomials. Splitting similarly
separates every line at the same knot, preserving parameter domains.
The two one-sided isocurves are returned as boundaries. Continuity is tested
by exact polynomial cross products NA·WB=NB·WA for x,y,z on every boundary
span. It compares projected functions at matching parameters, rather than
requiring equal control points or merely matching image endpoints.
Reversal in one direction reflects that parameter and changes normal sign.

## Plane restrictions and scope

`nurbsSurfacePlaneEquations3` restricts a rational plane to every rectangle:
F=nxX+nyY+nzZ+dW. Since W>0, F=0 is exactly the preimage of the plane.
`nurbsSurfaceOnPlane3` checks that every F is the zero polynomial. A nonzero
polynomial cannot vanish on a whole positive-area parameter rectangle, so
this is an exact whole-surface containment criterion, including degenerate
parameterizations. Returning F does not isolate, trace or assemble its
zero-set topology and is not a complete surface/plane intersection API.

Tests use independent Cox basis products to compare every coefficient for
mixed degrees through (3,3), then compare whole homogeneous patches after
both insertion orders and splitting. Analytic saddle/cylinder formulas,
independent and equal algebraic parameters, unclamped grids, tiny knot
rectangles, extreme coordinates, corner normals, jumps and continuity with
different homogeneous representations provide additional checks. Polynomial
arithmetic is compared to direct coefficient sums and algebraic identities.

This is parameterized geometry, separate from the existing `Surface3`/BRep
surface variants. Trimmed faces, self-intersection/embedding certification,
intersection-curve topology, shell sewing and commercial file import remain
future work. The TypeScript implementation is not formally verified.

Algorithm references: Michigan Tech's [tensor-product de Boor evaluation](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/surface/bspline-de-boor.html)
and [homogeneous knot refinement](https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/surface/NURBS-knot-insert.html).
