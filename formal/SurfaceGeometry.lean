import Cadloom

namespace Cadloom

/-- Unnormalized circular-cylinder implicit equation, q measured from an axis point. -/
def cylinderForm3 {K : Type*} [CommRing K] (dx dy dz x y z radiusSquared : K) : K :=
  (dy*z-dz*y)^2+(dz*x-dx*z)^2+(dx*y-dy*x)^2-
    radiusSquared*(dx^2+dy^2+dz^2)

/-- Lagrange identity relates the implemented cross-product form to axis distance. -/
theorem cylinder_projection_identity {K : Type*} [CommRing K] (dx dy dz x y z r : K) :
    cylinderForm3 dx dy dz x y z r =
      (dx^2+dy^2+dz^2)*(x^2+y^2+z^2)-(dx*x+dy*y+dz*z)^2-
      r*(dx^2+dy^2+dz^2) := by
  unfold cylinderForm3
  ring

/-- Moving the chosen axis origin along the same axis preserves the equation. -/
theorem cylinder_axis_shift {K : Type*} [CommRing K] (dx dy dz x y z r s : K) :
    cylinderForm3 dx dy dz (x+s*dx) (y+s*dy) (z+s*dz) r =
      cylinderForm3 dx dy dz x y z r := by
  unfold cylinderForm3
  ring

/-- Rescaling multiplies the equation by the square of the scale. -/
theorem cylinder_axis_scale {K : Type*} [CommRing K] (dx dy dz x y z r s : K) :
    cylinderForm3 (s*dx) (s*dy) (s*dz) x y z r =
      s^2*cylinderForm3 dx dy dz x y z r := by
  unfold cylinderForm3
  ring

/-- Coefficients of the implemented line/cylinder intersection polynomial. -/
theorem line_cylinder_polynomial {K : Type*} [CommRing K]
    (dx dy dz x y z vx vy vz r t : K) :
    cylinderForm3 dx dy dz (x+t*vx) (y+t*vy) (z+t*vz) r =
      ((dy*vz-dz*vy)^2+(dz*vx-dx*vz)^2+(dx*vy-dy*vx)^2)*t^2+
      2*((dy*z-dz*y)*(dy*vz-dz*vy)+(dz*x-dx*z)*(dz*vx-dx*vz)+
        (dx*y-dy*x)*(dx*vy-dy*vx))*t+
      cylinderForm3 dx dy dz x y z r := by
  unfold cylinderForm3
  ring

/-- The implemented radial normal is exactly perpendicular to the axis. -/
theorem cylinder_normal_perpendicular {K : Type*} [CommRing K] (dx dy dz x y z : K) :
    let D := dx^2+dy^2+dz^2
    let along := dx*x+dy*y+dz*z
    dx*(D*x-dx*along)+dy*(D*y-dy*along)+dz*(D*z-dz*along)=0 := by
  dsimp
  ring

/-- On a regular cylinder the normal has squared norm r*D². -/
theorem cylinder_normal_squared {K : Type*} [CommRing K] (dx dy dz x y z r : K)
    (h : cylinderForm3 dx dy dz x y z r = 0) :
    let D := dx^2+dy^2+dz^2
    let along := dx*x+dy*y+dz*z
    (D*x-dx*along)^2+(D*y-dy*along)^2+(D*z-dz*along)^2=r*D^2 := by
  unfold cylinderForm3 at h
  dsimp
  linear_combination (dx^2+dy^2+dz^2)*h

/-- Spatial line substitution into a rational squared-radius sphere. -/
theorem line_sphere_polynomial {K : Type*} [CommRing K]
    (x y z vx vy vz r t : K) :
    (x+t*vx)^2+(y+t*vy)^2+(z+t*vz)^2-r =
      (vx^2+vy^2+vz^2)*t^2+2*(x*vx+y*vy+z*vz)*t+(x^2+y^2+z^2-r) := by
  ring

/-- Coefficients producing a point on two nonparallel rational planes. -/
theorem plane_gram_intersection {K : Type*} [Field K] (A B C k l : K)
    (h : A*B-C^2 ≠ 0) :
    let alpha := (k*B-l*C)/(A*B-C^2)
    let beta := (l*A-k*C)/(A*B-C^2)
    A*alpha+C*beta=k ∧ C*alpha+B*beta=l := by
  dsimp
  generalize hd : A*B-C^2 = determinant at *
  constructor <;> field_simp [h] <;> rw [← hd] <;> ring

/-- The basis u, n×u is positively oriented about n when n·u=0 and both are nonzero. -/
theorem circle_basis_orientation {K : Type*} [CommRing K] (nx ny nz ux uy uz : K) :
    nx*(uy*(nx*uy-ny*ux)-uz*(nz*ux-nx*uz))+
    ny*(uz*(ny*uz-nz*uy)-ux*(nx*uy-ny*ux))+
    nz*(ux*(nz*ux-nx*uz)-uy*(ny*uz-nz*uy)) =
      (nx^2+ny^2+nz^2)*(ux^2+uy^2+uz^2)-(nx*ux+ny*uy+nz*uz)^2 := by
  ring

/-- Strict circle inclusion and strict disk separation can be checked on squared
radii and squared center distances without constructing square roots. -/
theorem strict_sum_squares_iff {K : Type*} [Field K] [LinearOrder K] [IsStrictOrderedRing K]
    (a b c : K) (ha : 0 ≤ a) (hb : 0 ≤ b) (hc : 0 ≤ c) :
    b+c<a ↔ 0<a^2-b^2-c^2 ∧ 4*b^2*c^2<(a^2-b^2-c^2)^2 := by
  have hbc : 0 ≤ 2*b*c := by positivity
  constructor
  · intro h
    have hp : 0 < (a-(b+c))*(a+(b+c)) := mul_pos (by linarith) (by linarith)
    have hA : 2*b*c < a^2-b^2-c^2 := by nlinarith [hp]
    have hq : 0 < ((a^2-b^2-c^2)-2*b*c)*((a^2-b^2-c^2)+2*b*c) :=
      mul_pos (by linarith) (by linarith)
    constructor <;> nlinarith [hq]
  · rintro ⟨hA, hq⟩
    have hcross : 2*b*c < a^2-b^2-c^2 := by
      by_contra h
      have hp : 0 ≤ (2*b*c-(a^2-b^2-c^2))*(2*b*c+(a^2-b^2-c^2)) :=
        mul_nonneg (by linarith) (by linarith)
      nlinarith [hp]
    by_contra h
    have hp : 0 ≤ ((b+c)-a)*((b+c)+a) := mul_nonneg (by linarith) (by positivity)
    nlinarith [hp]

/-- CCW circular tangent crossed with increasing axial direction gives the
outward non-unit cylinder normal; no unit-axis normalization is needed. -/
theorem cylinder_tangent_axis_cross {K : Type*} [CommRing K] (dx dy dz x y z : K) :
    (dz*x-dx*z)*dz-(dx*y-dy*x)*dy =
      (dx^2+dy^2+dz^2)*x-dx*(dx*x+dy*y+dz*z) ∧
    (dx*y-dy*x)*dx-(dy*z-dz*y)*dz =
      (dx^2+dy^2+dz^2)*y-dy*(dx*x+dy*y+dz*z) ∧
    (dy*z-dz*y)*dy-(dz*x-dx*z)*dx =
      (dx^2+dy^2+dz^2)*z-dz*(dx*x+dy*y+dz*z) := by
  constructor
  · ring
  · constructor <;> ring

/-- Weighted ellipse equation after substituting a rational supporting line. -/
theorem line_ellipse_polynomial {K : Type*} [CommRing K]
    (a b ox oy dx dy t : K) :
    a*(ox+t*dx)^2+b*(oy+t*dy)^2-a*b =
      (a*dx^2+b*dy^2)*t^2+2*(a*ox*dx+b*oy*dy)*t+
      (a*ox^2+b*oy^2-a*b) := by
  ring

/-- Restricted cylinder quadratic loses rank precisely when the section plane
contains the axis direction (over real ordered fields with nonzero vectors). -/
theorem cylinder_section_gram {K : Type*} [CommRing K]
    (dx dy dz ux uy uz vx vy vz : K) :
    cylinderForm3 dx dy dz ux uy uz 0 * cylinderForm3 dx dy dz vx vy vz 0 -
      ((dy*uz-dz*uy)*(dy*vz-dz*vy)+
       (dz*ux-dx*uz)*(dz*vx-dx*vz)+
       (dx*uy-dy*ux)*(dx*vy-dy*vx))^2 =
      (dx^2+dy^2+dz^2)*
        (dx*(uy*vz-uz*vy)+dy*(uz*vx-ux*vz)+dz*(ux*vy-uy*vx))^2 := by
  unfold cylinderForm3
  ring

/-- Eliminating y from L*y+M=0 and y²=R introduces no missing solutions. -/
theorem ellipse_elimination_identity {K : Type*} [CommRing K] (L M R y : K) :
    (L*y+M)*(M-L*y)+L^2*(y^2-R) = M^2-L^2*R := by
  ring

/-- The plane sign increases in the inward surface direction exactly when
    the boundary tangent opposes N×n. This fixes the two shared-edge uses. -/
theorem cut_boundary_orientation {K : Type*} [CommRing K]
    (nx ny nz Nx Ny Nz tx ty tz : K) :
    nx*(Ny*tz-Nz*ty)+ny*(Nz*tx-Nx*tz)+nz*(Nx*ty-Ny*tx) =
      -(tx*(Ny*nz-Nz*ny)+ty*(Nz*nx-Nx*nz)+tz*(Nx*ny-Ny*nx)) := by
  ring

/-- A nonparallel halfspace supplies one strict upper fiber bound.
The lower-bound case follows by negating the coefficient and plane. -/
theorem positive_height_bound {K : Type*} [Field K] [LinearOrder K] [IsStrictOrderedRing K]
    (a b t : K) (ha : 0 < a) :
    a*t+b<0 ↔ t<(-b)/a := by
  rw [lt_div_iff₀ ha]
  constructor <;> intro h <;> nlinarith

/-- Distinct roots of one quadratic give exact rational sums and products,
without treating the two conjugates as independent algebraic parameters. -/
theorem quadratic_roots_vieta {K : Type*} [Field K] (a b c x y : K)
    (ha : a ≠ 0) (hne : x ≠ y)
    (hx : a*x^2+b*x+c=0) (hy : a*y^2+b*y+c=0) :
    x+y=(-b)/a ∧ x*y=c/a := by
  have hfactor : (x-y)*(a*(x+y)+b)=0 := by linear_combination hx-hy
  have hs : a*(x+y)+b=0 := (mul_eq_zero.mp hfactor).resolve_left (sub_ne_zero.mpr hne)
  constructor
  · apply (eq_div_iff ha).2
    linear_combination hs
  · apply (eq_div_iff ha).2
    linear_combination -hx+x*hs

/-- Contracting toward an axis point makes a regular cylinder boundary point
strictly radial-interior for a scale between zero and one. -/
theorem cylinder_radial_contraction {K : Type*} [CommRing K]
    (dx dy dz x y z r s : K) :
    cylinderForm3 dx dy dz (s*x) (s*y) (s*z) r =
      s^2*cylinderForm3 dx dy dz x y z r+
      (s^2-1)*r*(dx^2+dy^2+dz^2) := by
  unfold cylinderForm3
  ring

/-- Weighted Cauchy identity for exact linear-functional extrema on an ellipse. -/
theorem ellipse_support_identity {K : Type*} [CommRing K] (A B a b x y : K) :
    (A*a^2+B*b^2)*(B*x^2+A*y^2)-A*B*(a*x+b*y)^2 =
      (B*b*x-A*a*y)^2 := by
  ring

/-- Homogeneous de Boor blending preserves a strictly positive denominator. -/
theorem homogeneous_positive_blend {K : Type*} [Field K] [LinearOrder K]
    [IsStrictOrderedRing K] (a u v : K) (ha0 : 0 ≤ a) (ha1 : a ≤ 1)
    (hu : 0 < u) (hv : 0 < v) :
    0 < (1-a)*u+a*v := by
  by_cases h : a = 0
  · simpa [h] using hu
  · exact add_pos_of_nonneg_of_pos
      (mul_nonneg (sub_nonneg.mpr ha1) (le_of_lt hu))
      (mul_pos (lt_of_le_of_ne ha0 (Ne.symm h)) hv)

end Cadloom
