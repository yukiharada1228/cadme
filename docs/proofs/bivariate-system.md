# Exact bivariate algebraic systems

This layer solves F(u,v)=G(u,v)=0 over real coordinates as the union of an
implicit shared zero locus and distinct isolated points outside that locus.
All coefficients are rational; coordinates are `AlgebraicReal` certificates.
It is groundwork for curve intersections and critical-point decompositions,
not a topology/parameterization of an algebraic curve.

## Polynomial operations

`divideBivariateExact` uses lexicographic leading monomials (u first).
Subtracting a suitable monomial multiple cancels the leading term. If the
divisor's leading monomial does not divide the current leading monomial,
division is not exact and is rejected. No approximate remainder is accepted.

`gcdBivariate` views the inputs in Q[u][v]. It separates coefficient content
in Q[u], computes a primitive pseudo-remainder sequence in v and restores
the gcd of the contents. Gauss's lemma relates this primitive sequence to
Euclidean gcd over Q(u). The final lexicographic leading rational coefficient
is normalized to one; gcd(0,0)=0. Pseudo-remainders have strictly decreasing
v degree, so the computation terminates. This is primitive PRS, not an
optimized modular or subresultant gcd implementation.

`resultantBivariate` reuses the existing fraction-free Sylvester determinant,
eliminating either variable over a rational-polynomial coefficient ring.
Bareiss divisions must have exactly zero remainders. Zero inputs give zero;
two nonzero constants give the empty determinant 1.

## Shared locus and isolated residual solutions

Let C=gcd(F,G), A=F/C and B=G/C. Then

```
Z(F,G) = Z(C) ∪ (Z(A,B) \ Z(C)).
```

If C=0 both inputs are zero, giving all of R². A constant nonzero C is
normalized to 1 and has no zero locus. A nonconstant C is returned implicitly,
with its gcd multiplicities retained. Such a polynomial may have no real
zeros, isolated real zeros, real curves, or combinations; `kind: 'shared'`
does not claim positive real dimension. Its real topology is not resolved
and isolated real points inside Z(C) are represented implicitly, not listed.

The residual A,B are coprime. Unless one is a nonzero constant, their common
complex zeros are finite. The nonzero v-resultant R(u) contains the u
coordinate of every such zero. Isolate all real roots alpha of R, including
degree-drop candidates. At each root, exact coefficient sign tests determine
the specialized v degrees. A nonzero constant specialization rejects the
fiber. If one polynomial is identically zero there, use the other. Both
cannot vanish identically on the same fiber without a common factor.

For a nonzero positive-degree fiber H(alpha,v), rational alpha permits
ordinary univariate root isolation. For an algebraic alpha with certificate
P(u), form the norm resultant Res_u(P,H), whose real roots include all
possible v coordinates. A certificate is square-free but need not be minimal:
some other factors of P may give identically zero fibers. Remove
gcd(P, content_v(H)) first. This retains alpha, because the chosen actual
fiber is nonzero, and makes the norm nonzero. This removal is essential;
using the original nonminimal P can produce an identically zero norm.

Isolate all real roots beta of the norm, then check A(alpha,beta)=0 and
B(alpha,beta)=0 using exact algebraic arithmetic. This rejects conjugate
pairings and extraneous degree-drop roots. Discard points on Z(C), which
are already represented there; sort and deduplicate the remaining pairs.
They are isolated in the complete solution set because C is nonzero in a
neighborhood and the residual zero set is finite. Point intersection
multiplicities are not computed.

## Validation and limits

Tests recover constructed gcd factors, repeated factors and vertical
content, and check exact quotients. Resultants at rational samples match
an independent rational Gaussian-elimination Sylvester determinant using
the original symbolic degrees, including sign and constant conventions.
Known circle, tangent, Cartesian-grid, quartic nonlinear and mixed-product
systems check root completeness and exact coordinate dependence. A cubic
nonminimal projection certificate checks conjugate zero-fiber removal.
Further cases cover degree drops, zero equations, imaginary/isolated shared
loci and removal of residual points already covered by a shared factor.

Single-variable expressions dispatch to the existing single-source rational
image evaluator instead of introducing an unrelated algebraic generator.
General field arithmetic, resultants and primitive PRS can still cause
large exact coefficients and expensive computations. There are no floating
tolerances or fixed refinement limits. This implementation has construction
arguments and independent tests, not machine-verified TypeScript execution.
Bounded zero-locus graphs and patch-wise NURBS plane sections are supplied
separately by [curve topology](algebraic-curve-topology2.md). Arbitrary trim
domains and global NURBS/BRep intersection assembly remain future work.

Reference: [SymPy polynomial internals: primitive PRS and resultants](https://docs.sympy.org/latest/modules/polys/internals.html).
