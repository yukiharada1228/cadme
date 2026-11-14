import {AlgebraicReal} from '../numeric/real-roots.js';
import type {ExactInput} from './point2.js';
import {algebraicCoordinates3} from './algebraic-point3.js';
import type {AlgebraicCoordinates3} from './algebraic-point3.js';
import {plane3} from './plane3.js';
import type {Plane3} from './plane3.js';
import {nurbsSurface3,nurbsSurfacePlaneEquations3} from './nurbs-surface3.js';
import type {NurbsSurface3,NurbsSurfacePatch3} from './nurbs-surface3.js';
import {traceAlgebraicCurve2,evaluateAlgebraicCurveEdge2} from './algebraic-curve-topology2.js';
import type {AlgebraicCurveTopology2} from './algebraic-curve-topology2.js';

export interface NurbsPlaneSection3 {
  readonly surface:NurbsSurface3;readonly plane:Plane3;
  /** Parameter-space graphs; patch seams and spatial self-overlaps are not welded. */
  readonly pieces:readonly {readonly patch:NurbsSurfacePatch3;readonly topology:AlgebraicCurveTopology2}[];
  readonly containedPatches:readonly NurbsSurfacePatch3[];
}
const owned=new WeakSet<NurbsPlaneSection3>();
/** Complete closed patch-wise plane section, retaining isolated contacts and
 * patches wholly on the plane. Graph topology is in each parameter rectangle.
 */
export function intersectNurbsSurfacePlane3(input:NurbsSurface3,inputPlane:Plane3):NurbsPlaneSection3 {
  const surface=nurbsSurface3(input.degreeU,input.degreeV,input.controlPoints,input.knotsU,input.knotsV,input.weights),plane=plane3(inputPlane.normal.x,inputPlane.normal.y,inputPlane.normal.z,inputPlane.offset),pieces:{patch:NurbsSurfacePatch3;topology:AlgebraicCurveTopology2}[]=[],containedPatches:NurbsSurfacePatch3[]=[];
  for(const {patch,polynomial} of nurbsSurfacePlaneEquations3(surface,plane)){
    if(polynomial.degreeU<0){containedPatches.push(patch);continue;}
    const topology=traceAlgebraicCurve2(polynomial,{uMin:patch.startU,uMax:patch.endU,vMin:patch.startV,vMax:patch.endV});
    if(topology.vertices.length)pieces.push(Object.freeze({patch,topology}));
  }
  const result=Object.freeze({surface,plane,pieces:Object.freeze(pieces),containedPatches:Object.freeze(containedPatches)});owned.add(result);return result;
}
function pieceAt(input:NurbsPlaneSection3,piece:number):NurbsPlaneSection3['pieces'][number] {
  if(!owned.has(input))throw new RangeError('Section evaluation requires a factory-created section');
  if(!Number.isSafeInteger(piece)||piece<0||piece>=input.pieces.length)throw new RangeError('Invalid section piece index');return input.pieces[piece]!;
}
function lift(p:NurbsSurfacePatch3,u:AlgebraicReal,v:AlgebraicReal):AlgebraicCoordinates3{return algebraicCoordinates3(p.x.rationalImage(u,v,p.weight),p.y.rationalImage(u,v,p.weight),p.z.rationalImage(u,v,p.weight));}
export function nurbsPlaneSectionVertex3(input:NurbsPlaneSection3,piece:number,vertex:number):AlgebraicCoordinates3 {
  const p=pieceAt(input,piece);if(!Number.isSafeInteger(vertex)||vertex<0||vertex>=p.topology.vertices.length)throw new RangeError('Invalid section vertex index');const v=p.topology.vertices[vertex]!;return lift(p.patch,v.u,v.v);
}
/** Parameter is u on a branch and v on a vertical parameter-space edge. */
export function nurbsPlaneSectionEdgePoint3(input:NurbsPlaneSection3,piece:number,edge:number,parameter:AlgebraicReal|ExactInput):AlgebraicCoordinates3 {
  const p=pieceAt(input,piece),point=evaluateAlgebraicCurveEdge2(p.topology,edge,parameter);return lift(p.patch,point.u,point.v);
}
