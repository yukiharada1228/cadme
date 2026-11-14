import {dot3} from './point3.js';
import type {Point3} from './point3.js';
import {plane3} from './plane3.js';
import type {Plane3} from './plane3.js';
import type {AlgebraicCoordinates3} from './algebraic-point3.js';
import {surfacesCoincide3} from './surface3.js';
import {reverseCurve3} from './curve3.js';
import type {Curve3} from './curve3.js';
import {partitionClippedCylinderBRep3,assertOwnedClippedCylinder3} from './clipped-cylinder-brep3.js';
import type {ClippedCylinderBRep3} from './clipped-cylinder-brep3.js';
import type {PreparedTrimmedPlanar3} from './trimmed-planar3.js';
import {sewBRepFaces3} from './sew-brep3.js';
import type {SewnBRep3,SewBRepFace3} from './sew-brep3.js';
import type {BRepEdgeUse3} from './brep-topology3.js';
import type {CurveRegionLocation2} from './curve-boolean2.js';

export interface CylinderSplitEdgeMap3 {
  readonly loop:number;readonly coedge:number;readonly edge:number;readonly direction:1|-1;
  /** Shared-table atoms in this child coedge's traversal order. */
  readonly uses:readonly BRepEdgeUse3[];
}
export interface CylinderSplitInterface3 {
  /** Outward normal from the negative child; the positive child is opposite. */
  readonly plane:Plane3;
  readonly domain:PreparedTrimmedPlanar3;
  readonly component:number;
  readonly sample:AlgebraicCoordinates3;
  readonly negativeFace:number;readonly positiveFace:number;
  readonly edges:readonly Curve3[];
  readonly negativeLoops:readonly (readonly BRepEdgeUse3[])[];
  readonly positiveLoops:readonly (readonly BRepEdgeUse3[])[];
  readonly negativeBoundary:readonly CylinderSplitEdgeMap3[];
  readonly positiveBoundary:readonly CylinderSplitEdgeMap3[];
  /** Relative 2D location in the common planar section. */
  locate(point:Point3|AlgebraicCoordinates3):CurveRegionLocation2;
}
interface SplitBase {
  readonly parent:ClippedCylinderBRep3;readonly plane:Plane3;
  readonly negative:ClippedCylinderBRep3;readonly positive:ClippedCylinderBRep3;
  /** Child face → original parent face; null denotes the newly created interface. */
  readonly negativeFaceOrigins:readonly (number|null)[];
  readonly positiveFaceOrigins:readonly (number|null)[];
}
export type ClippedCylinderPlaneSplit3=SplitBase&(
 | {readonly kind:'split';readonly shared:CylinderSplitInterface3}
 | {readonly kind:'touching'|'disjoint';readonly shared:null;readonly materialSide:-1|1}
 | {readonly kind:'empty';readonly shared:null});
export interface RejoinedCylinderSplit3 {
  /** Exact material remains the parent; the boundary is independently re-sewn. */
  readonly parent:ClippedCylinderBRep3;
  readonly sewing:SewnBRep3;
  readonly faces:readonly {readonly side:-1|1;readonly childFace:number;readonly parentFace:number}[];
}
const ownedSplits=new WeakSet<ClippedCylinderPlaneSplit3>();
function finish(result:ClippedCylinderPlaneSplit3):ClippedCylinderPlaneSplit3 {const frozen=Object.freeze(result);ownedSplits.add(frozen);return frozen;}
function identityFaces(body:ClippedCylinderBRep3):readonly number[]{return Object.freeze(body.faces.map((_,i)=>i));}
function facePatch(body:ClippedCylinderBRep3,face:number):SewBRepFace3 {
  const table=body.topology,f=table.faces[face]!;
  return {surface:f.surface,sense:f.sense,loops:f.loops.map(loop=>table.loops[loop]!.coedges.map(id=>{const h=table.coedges[id]!,c=table.edges[h.edge]!.curve;return h.direction===1?c:reverseCurve3(c);} ))};
}
function planarFace(body:ClippedCylinderBRep3,plane:Plane3):number {
  const ids=body.faces.flatMap((f,i)=>f.kind==='planar'&&surfacesCoincide3({kind:'plane',plane:f.plane},{kind:'plane',plane})?[i]:[]);
  if(ids.length!==1)throw new Error('A genuine convex split must have exactly one planar interface face');return ids[0]!;
}
function faceOrigins(parent:ClippedCylinderBRep3,child:ClippedCylinderBRep3,interfaceFace:number):readonly (number|null)[] {
  return Object.freeze(child.faces.map((face,i)=>{
    if(i===interfaceFace)return null;const sample=face.domain.components[face.component]!.sample;
    const ids=parent.faces.flatMap((prior,j)=>{
      if(prior.kind!==face.kind)return [];
      if(prior.kind==='planar'&&face.kind==='planar'&&!surfacesCoincide3({kind:'plane',plane:prior.plane},{kind:'plane',plane:face.plane}))return [];
      return prior.domain.components[prior.component]!.locate(sample)==='inside'?[j]:[];
    });
    if(ids.length!==1)throw new Error('A child boundary face has no unique original parent face');return ids[0]!;
  }));
}
function edgeMaps(body:ClippedCylinderBRep3,face:number,sourceUses:readonly (readonly (readonly BRepEdgeUse3[])[])[]):readonly CylinderSplitEdgeMap3[] {
  const t=body.topology;return Object.freeze(t.faces[face]!.loops.flatMap((loop,l)=>t.loops[loop]!.coedges.map((id,i)=>{const h=t.coedges[id]!;return Object.freeze({loop,coedge:id,edge:h.edge,direction:h.direction,uses:sourceUses[l]![i]!});})));
}
/** Split a constructed convex cylinder/halfspace solid by a rational plane.
 * Both nonempty children are closed solids; their common facet is paired with
 * opposite orientation and exact child-edge subdivision provenance.
 */
export function splitClippedCylinderByPlane3(input:ClippedCylinderBRep3,inputPlane:Plane3):ClippedCylinderPlaneSplit3 {
  assertOwnedClippedCylinder3(input);const plane=plane3(inputPlane.normal.x,inputPlane.normal.y,inputPlane.normal.z,inputPlane.offset);
  if(input.empty)return finish({kind:'empty',parent:input,plane,negative:input,positive:input,negativeFaceOrigins:identityFaces(input),positiveFaceOrigins:identityFaces(input),shared:null});
  const {negative,positive,relation}=partitionClippedCylinderBRep3(input,plane);
  if(relation.kind!=='split'){
    return finish({kind:relation.kind,parent:input,plane,negative,positive,negativeFaceOrigins:negative.empty?Object.freeze([]):identityFaces(input),positiveFaceOrigins:positive.empty?Object.freeze([]):identityFaces(input),shared:null,materialSide:relation.materialSide});
  }
  const N=planarFace(negative,plane),P=planarFace(positive,plane),n=negative.faces[N]!,p=positive.faces[P]!;
  if(n.kind!=='planar'||p.kind!=='planar')throw new Error('Split interface must be planar');
  if(dot3(n.domain.base.normal,plane.normal).sign()<=0||dot3(p.domain.base.normal,plane.normal).sign()>=0)throw new Error('Split cap physical normals are not opposite');
  const sewn=sewBRepFaces3([facePatch(negative,N),facePatch(positive,P)],{requireClosed:true}),component=n.domain.components[n.component]!,sample=component.sample;
  if(input.locate(sample)!=='inside'||negative.locate(sample)!=='boundary'||positive.locate(sample)!=='boundary')throw new Error('Interface interior sample is not an internal common child boundary');
  const shared:CylinderSplitInterface3=Object.freeze({plane,domain:n.domain,component:n.component,sample,negativeFace:N,positiveFace:P,edges:Object.freeze(sewn.topology.edges.map(e=>e.curve)),negativeLoops:sewn.faceLoops[0]!,positiveLoops:sewn.faceLoops[1]!,negativeBoundary:edgeMaps(negative,N,sewn.sourceUses[0]!),positiveBoundary:edgeMaps(positive,P,sewn.sourceUses[1]!),locate:(point:Point3|AlgebraicCoordinates3)=>component.locate(point)});
  return finish({kind:'split',parent:input,plane,negative,positive,negativeFaceOrigins:faceOrigins(input,negative,N),positiveFaceOrigins:faceOrigins(input,positive,P),shared});
}
/** Cancel the paired internal caps and independently sew both external child
 * boundaries. This is an inverse plane split, not a general solid union.
 */
export function rejoinClippedCylinderSplit3(input:ClippedCylinderPlaneSplit3):RejoinedCylinderSplit3 {
  if(!ownedSplits.has(input))throw new RangeError('Rejoining requires a factory-created clipped cylinder split');
  if(input.kind!=='split'){
    const side=input.kind==='empty'?-1 as const:input.materialSide;
    return Object.freeze({parent:input.parent,sewing:input.parent.sewing,faces:Object.freeze(input.parent.faces.map((_,i)=>Object.freeze({side,childFace:i,parentFace:i})))});
  }
  const faces:{side:-1|1;childFace:number;parentFace:number}[]=[],patches:SewBRepFace3[]=[];
  for(const [side,body,origins,internal] of [[-1,input.negative,input.negativeFaceOrigins,input.shared.negativeFace],[1,input.positive,input.positiveFaceOrigins,input.shared.positiveFace]] as const){
    body.faces.forEach((_,face)=>{if(face===internal)return;const parentFace=origins[face];if(parentFace===null||parentFace===undefined)throw new Error('An external child face has no parent origin');faces.push(Object.freeze({side,childFace:face,parentFace}));patches.push(facePatch(body,face));});
  }
  const sewing=sewBRepFaces3(patches,{requireClosed:true}),t=sewing.topology;
  if(t.shells.length!==1||t.vertices.length-t.edges.length+t.faces.length!==2)throw new Error('Rejoined convex boundary must be one spherical closed shell');
  return Object.freeze({parent:input.parent,sewing,faces:Object.freeze(faces)});
}
