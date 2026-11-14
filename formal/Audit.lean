import SurfaceGeometry
import CircleGeometry
import CoplanarProjection
import TriangleGeometry
import PlaneGeometry
import PrismVolume
import AffineGeometry
import FaceSampling
import Cadloom
import SourceArithmetic
import SegmentMembership
import IntersectionBranches
import CollinearOverlap
import PairLoop
import CutCompleteness
import SortedAdjacency

#print axioms Cadloom.gcdLoop_correct
#print axioms Cadloom.fraction_add
#print axioms Cadloom.fraction_sub
#print axioms Cadloom.fraction_mul
#print axioms Cadloom.fraction_div
#print axioms Cadloom.normalize_preserves_value
#print axioms Cadloom.lerp_zero
#print axioms Cadloom.lerp_one
#print axioms Cadloom.lerp_degenerate
#print axioms Cadloom.degenerate_iff
#print axioms Cadloom.intersection_parameters_meet
#print axioms Cadloom.meeting_parameters_unique
#print axioms Cadloom.nonparallel_intersection_iff
#print axioms Cadloom.parameter_bound_iff
#print axioms Cadloom.interval_intersection
#print axioms Cadloom.adjacent_no_interior_vertex
#print axioms Cadloom.adjacent_intersection_endpoints
#print axioms Cadloom.sourceDeterminant_eq
#print axioms Cadloom.sourceT_eq
#print axioms Cadloom.sourceU_eq
#print axioms Cadloom.sourcePoint_eq
#print axioms Cadloom.sourcePoint_sound
#print axioms Cadloom.scalar_lerp_between
#print axioms Cadloom.scalar_parameter_in_unit
#print axioms Cadloom.containsPoint_iff_onSegment
#print axioms Cadloom.lexLE_total
#print axioms Cadloom.lexLE_antisymm
#print axioms Cadloom.lerp_reverse
#print axioms Cadloom.onSegment_reverse
#print axioms Cadloom.lerp_lex_bounds
#print axioms Cadloom.collinear_lex_bounds_onSegment
#print axioms Cadloom.lexContains_iff_onSegment
#print axioms Cadloom.ordered_point_membership
#print axioms Cadloom.degenerateFirst_correct
#print axioms Cadloom.degenerateSecond_correct
#print axioms Cadloom.nonparallelBranch_correct
#print axioms Cadloom.cross_lerp_identity
#print axioms Cadloom.parallel_common_implies_collinear
#print axioms Cadloom.parallel_noncollinear_correct
#print axioms Cadloom.lexLE_refl
#print axioms Cadloom.lexLE_trans
#print axioms Cadloom.collinear_triple
#print axioms Cadloom.shared_line_iff
#print axioms Cadloom.ordered_members
#print axioms Cadloom.lexLE_ordered
#print axioms Cadloom.lexLE_max_iff
#print axioms Cadloom.lexLE_min_iff
#print axioms Cadloom.overlap_bounds_iff
#print axioms Cadloom.orderedStart_property
#print axioms Cadloom.orderedEnd_property
#print axioms Cadloom.collinearBranch_correct
#print axioms Cadloom.intersectModel_correct
#print axioms Cadloom.resultVertices_sound
#print axioms Cadloom.indexPairs_membership
#print axioms Cadloom.cutStep_membership
#print axioms Cadloom.pairLoop_membership
#print axioms Cadloom.computedCuts_membership
#print axioms Cadloom.computedCuts_sound
#print axioms Cadloom.overlap_boundaries_endpoints
#print axioms Cadloom.collinear_vertices_endpoints
#print axioms Cadloom.segment_start_extreme
#print axioms Cadloom.resultVertices_endpoint
#print axioms Cadloom.resultVertices_nonparallel
#print axioms Cadloom.determinant_swap
#print axioms Cadloom.third_direction_nonparallel
#print axioms Cadloom.intersection_vertex_classification
#print axioms Cadloom.computedCuts_pair_recorded
#print axioms Cadloom.endpoint_recorded
#print axioms Cadloom.nonparallel_recorded
#print axioms Cadloom.global_vertex_recorded_on_segment
#print axioms Cadloom.computedCuts_complete
#print axioms Cadloom.consecutiveEdges_sound
#print axioms Cadloom.consecutiveEdges_complete
#print axioms Cadloom.consecutiveEdges_iff
#print axioms Cadloom.consecutiveEdges_cover
#print axioms Cadloom.sourceEdges_iff_adjacent
#print axioms Cadloom.onSegment_subsegment
#print axioms Cadloom.sourceEdge_sound
#print axioms Cadloom.sourceEdge_no_interior_global_vertex
#print axioms Cadloom.sourceEdges_cover_segment
#print axioms Cadloom.sourceEdge_provenance_complete

#print axioms Cadloom.leftSample_cross
#print axioms Cadloom.leftSample_strictly_left
#print axioms Cadloom.shortenStep_positive
#print axioms Cadloom.shortenStep_before_hit
#print axioms Cadloom.shortenStep_preserves_bound

#print axioms Cadloom.affine_cross_scaled
#print axioms Cadloom.affine_lerp
#print axioms Cadloom.affine_inverse_left
#print axioms Cadloom.affine_segment_iff

#print axioms Cadloom.prism_volume_eq_area_height

#print axioms Cadloom.plane_lerp_value
#print axioms Cadloom.plane_through_orientation
#print axioms Cadloom.plane_through_endpoints
#print axioms Cadloom.plane_zero_parameter_iff
#print axioms Cadloom.plane_parameter_unit_iff
#print axioms Cadloom.plane_constant_on_parallel
#print axioms Cadloom.plane_segment_meets_iff

#print axioms Cadloom.triangle_plane_value
#print axioms Cadloom.triangle_plane_bounds
#print axioms Cadloom.triangle_fan_area_vector

#print axioms Cadloom.plane_lift_satisfies
#print axioms Cadloom.plane_lift_unique

#print axioms Cadloom.cached_edge_halfplane
#print axioms Cadloom.ray_parameter_rescale

#print axioms Cadloom.line_circle_polynomial
#print axioms Cadloom.circle_equation_difference
#print axioms Cadloom.radical_axis_circle_iff
#print axioms Cadloom.circumcenter_linear_equations

#print axioms Cadloom.circle_same_x_half_unique

#print axioms Cadloom.canonical_line_frame

#print axioms Cadloom.circle_tangent_cross_linear
#print axioms Cadloom.circle_germ_normal_offset

#print axioms Cadloom.cylinder_projection_identity
#print axioms Cadloom.cylinder_axis_shift
#print axioms Cadloom.cylinder_axis_scale
#print axioms Cadloom.line_cylinder_polynomial
#print axioms Cadloom.cylinder_normal_perpendicular
#print axioms Cadloom.cylinder_normal_squared

#print axioms Cadloom.line_sphere_polynomial
#print axioms Cadloom.plane_gram_intersection
#print axioms Cadloom.circle_basis_orientation

#print axioms Cadloom.strict_sum_squares_iff

#print axioms Cadloom.cylinder_tangent_axis_cross

#print axioms Cadloom.line_ellipse_polynomial
#print axioms Cadloom.cylinder_section_gram

#print axioms Cadloom.ellipse_elimination_identity

#print axioms Cadloom.cut_boundary_orientation

#print axioms Cadloom.positive_height_bound

#print axioms Cadloom.quadratic_roots_vieta

#print axioms Cadloom.cylinder_radial_contraction

#print axioms Cadloom.ellipse_support_identity

#print axioms Cadloom.homogeneous_positive_blend
