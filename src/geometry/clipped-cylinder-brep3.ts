import {Rational} from '../numeric/rational.js';
import {exactRational} from '../numeric/polynomial.js';
import {AlgebraicReal} from '../numeric/real-roots.js';
import type {ExactInput} from './point2.js';
import {point3,vector3,dot3,cross3} from './point3.js';
import type {Point3,Vector3} from './point3.js';
import {plane3} from './plane3.js';
import type {Plane3} from './plane3.js';
import {cylinder3,classifyPointToSurface3,evaluateCylinder3} from './surface3.js';
import type {Cylinder3} from './surface3.js';
import {algebraicPoint3,algebraicCoordinates3,snapshotExactPoint3,getPointParameterization3,translateAlgebraicPoint3} from './algebraic-point3.js';
import type {AlgebraicCoordinates3} from './algebraic-point3.js';
import {evaluatePlaneAtAlgebraicPoint3 as evaluate} from './algebraic-segment-plane3.js';
import {intersectPlaneCylinder3} from './plane-cylinder3.js';
import {circle3,circularArc3} from './circle3.js';
import {planeFrame3,reverseCurve3,pointOnCurve3} from './curve3.js';
import type {Curve3} from './curve3.js';
import {prepareCylinderFace3} from './cylinder-face3.js';
import {prepareEllipseFace3,prepareRectangleFace3} from './planar-face3.js';
import type {PreparedPlanarFace3} from './planar-face3.js';
import {prepareTrimmedCylinder3} from './trimmed-cylinder3.js';
import type {CylinderHalfSpace3,PreparedTrimmedCylinder3} from './trimmed-cylinder3.js';
import {prepareTrimmedPlanar3} from './trimmed-planar3.js';
import {convexSectionPolygon3} from './convex-section-polygon3.js';
import {canonical} from './planar-trim-utils3.js';
import type {PreparedTrimmedPlanar3} from './trimmed-planar3.js';
import {sewBRepFaces3} from './sew-brep3.js';
import type {SewnBRep3,SewBRepFace3} from './sew-brep3.js';
import type {BRepTopology3,BRepEdgeUse3} from './brep-topology3.js';
import type {CurveRegionLocation2} from './curve-boolean2.js';

export type ClippedCylinderFace3=
 | {readonly kind:'planar';readonly domain:PreparedTrimmedPlanar3;readonly component:number;readonly plane:Plane3}
 | {readonly kind:'cylindrical';readonly domain:PreparedTrimmedCylinder3;readonly component:number};
export interface ClippedCylinderBRep3 {
  readonly cylinder:Cylinder3;
  readonly lower:Rational;readonly upper:Rational;
  /** Outward-oriented kept-side inequalities, including axial caps. */
  readonly planes:readonly Plane3[];
  readonly empty:boolean;
  readonly faces:readonly ClippedCylinderFace3[];
  readonly topology:BRepTopology3;
  readonly sewing:SewnBRep3;
  readonly interiorSample:Point3|null;
  /** Closed regularized convex solid; lower-dimensional-only results are empty. */
  locate(point:Point3|AlgebraicCoordinates3):CurveRegionLocation2;
}
const ownedSolids=new WeakSet<ClippedCylinderBRep3>();
/** Internal ownership check for operations that preserve construction provenance. */
export function assertOwnedClippedCylinder3(input:ClippedCylinderBRep3):void {if(!ownedSolids.has(input))throw new RangeError('Operation requires a factory-created clipped cylinder solid');}
const axes=['x','y','z'] as const,one=new Rational(1n),two=new Rational(2n);
function negate(p:Plane3):Plane3{return plane3(p.normal.x.neg(),p.normal.y.neg(),p.normal.z.neg(),p.offset.neg());}
function normalize(p:Plane3):Plane3 {const q=plane3(p.normal.x,p.normal.y,p.normal.z,p.offset),pivot=axes.map(k=>q.normal[k]).find(x=>x.sign()!==0)!,s=one.div(pivot.sign()<0?pivot.neg():pivot);return plane3(q.normal.x.mul(s),q.normal.y.mul(s),q.normal.z.mul(s),q.offset.mul(s));}
function key(p:Plane3):string{return [p.normal.x,p.normal.y,p.normal.z,p.offset].map(x=>x.toString()).join(',');}
function scale(d:Vector3,t:Rational):Vector3{return vector3(d.x.mul(t),d.y.mul(t),d.z.mul(t));}
function loops(edges:readonly Curve3[],uses:readonly (readonly BRepEdgeUse3[])[]|null):readonly (readonly Curve3[])[] {
  if(uses===null)throw new Error('Constructed convex boundary patch has ambiguous loops');return Object.freeze(uses.map(loop=>Object.freeze(loop.map(u=>u.direction===1?edges[u.edge]!:reverseCurve3(edges[u.edge]!)))));
}
/** Exact convex solid formed by a filled finite circular cylinder and rational
 * plane halfspaces. Curved walls and planar caps are constructed and sewn,
 * rather than inferred to be a solid merely from closed incidence.
 */
export function clipCylinderBRep3(input:Cylinder3,inputLower:ExactInput,inputUpper:ExactInput,halfspaces:readonly CylinderHalfSpace3[]=[]):ClippedCylinderBRep3 {
  const cylinder=cylinder3(input.axis,input.radiusSquared),lower=exactRational(inputLower),upper=exactRational(inputUpper);if(lower.compare(upper)>=0)throw new RangeError('Cylinder bounds must be strictly increasing');
  const o=cylinder.axis.origin,d=cylinder.axis.direction,D=dot3(d,d),at=(t:Rational)=>plane3(d.x,d.y,d.z,dot3(d,o).add(D.mul(t)).neg()),records=new Map<string,Plane3>();let impossible=false;
  const raw=[{plane:negate(at(lower)),side:-1 as const},{plane:at(upper),side:-1 as const},...halfspaces];
  for(const h of raw){if(h.side!==-1&&h.side!==1)throw new RangeError('Halfspace side must be -1 or +1');const p=normalize(h.side===-1?h.plane:negate(h.plane));records.set(key(p),p);}
  const all=[...records.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,p])=>p),active:Plane3[]=[];
  for(const p of all){
    if(records.has(key(negate(p))))impossible=true;const support=intersectPlaneCylinder3(p,cylinder);
    if(support.kind==='none'||support.kind==='lines'&&support.lines.length===1){if(dot3(p.normal,o).add(p.offset).sign()>0)impossible=true;}
    else active.push(p);
  }
  const planes=Object.freeze(active),faces:ClippedCylinderFace3[]=[],patches:SewBRepFace3[]=[];
  if(!impossible){
    // Nonperiodic angular charts make every wall component a disk, even when
    // the closure of the whole cylindrical region pinches at a tangent cap.
    const u=d.y.sign()!==0||d.z.sign()!==0?cross3(d,vector3(1n,0n,0n)):cross3(d,vector3(0n,1n,0n)),v=cross3(d,u),rays=[u,v,scale(u,one.neg()),scale(v,one.neg())],circle=circle3(o,d,cylinder.radiusSquared),points=rays.map(ray=>algebraicPoint3(o,ray,AlgebraicReal.fromRational(cylinder.radiusSquared.div(dot3(ray,ray))).sqrt()));
    for(let i=0;i<4;i++){
      const angular=circularArc3(circle,points[i]!,points[(i+1)%4]!),base=prepareCylinderFace3(cylinder,lower,upper,{angular}),domain=prepareTrimmedCylinder3(base,planes.map(plane=>({plane,side:-1})));
      domain.components.forEach((component,index)=>{if(component.loops?.length!==1)throw new Error('A nonperiodic cylinder component must have one disk boundary');patches.push({surface:{kind:'cylinder',cylinder},sense:1,loops:loops(domain.edges,component.loops)});faces.push(Object.freeze({kind:'cylindrical',domain,component:index}));});
    }
    for(const p of planes){
      const hit=intersectPlaneCylinder3(p,cylinder),other=planes.filter(q=>q!==p);let base:PreparedPlanarFace3,polygon=false;
      if(hit.kind==='ellipse'){
        const e=hit.ellipse,x=AlgebraicReal.fromRational(e.radiusUSquared).sqrt().upper.add(one),y=AlgebraicReal.fromRational(e.radiusVSquared).sqrt().upper.add(one),fast=convexSectionPolygon3(e.frame,1,x.neg(),x,y.neg(),y,other,q=>q.x.mul(q.x).mul(e.radiusVSquared).add(q.y.mul(q.y).mul(e.radiusUSquared)).compare(e.radiusUSquared.mul(e.radiusVSquared))<=0);
        if(fast.kind==='empty')continue;polygon=fast.kind==='polygon';base=fast.kind==='polygon'?fast.face:prepareEllipseFace3(e);
      }
      else if(hit.kind==='lines'&&hit.lines.length===2){
        const N=dot3(p.normal,p.normal),offset=dot3(p.normal,o).add(p.offset),q=point3(o.x.sub(p.normal.x.mul(offset).div(N)),o.y.sub(p.normal.y.mul(offset).div(N)),o.z.sub(p.normal.z.mul(offset).div(N))),w=cross3(p.normal,d),discriminant=cylinder.radiusSquared.mul(N).sub(offset.mul(offset)),radius=AlgebraicReal.fromRational(discriminant.div(N.mul(N).mul(D))).sqrt(),frame=planeFrame3(q,w,d),sense=dot3(cross3(w,d),p.normal).sign() as 1|-1;
        const bound=radius.upper.add(one),squared=discriminant.div(N.mul(N).mul(D)),fast=convexSectionPolygon3(frame,sense,bound.neg(),bound,lower,upper,other,q=>q.x.mul(q.x).compare(squared)<=0);
        if(fast.kind==='empty')continue;polygon=fast.kind==='polygon';base=fast.kind==='polygon'?fast.face:prepareRectangleFace3(frame,radius.neg(),radius,lower,upper,sense);
      }else throw new Error('Active cylinder halfspace has no positive-area section');
      const domain=prepareTrimmedPlanar3(base,polygon?[]:other.map(plane=>({plane,side:-1})));
      if(domain.components.length>1)throw new Error('A convex planar section cannot have disconnected interior');
      domain.components.forEach((component,index)=>{if(component.loops?.length!==1)throw new Error('A convex planar section must have one disk boundary');patches.push({surface:{kind:'plane',plane:base.surface},sense:base.sense,loops:loops(domain.edges,component.loops)});faces.push(Object.freeze({kind:'planar',domain,component:index,plane:p}));});
    }
  }
  const empty=faces.length===0;
  const strict=(p:AlgebraicCoordinates3)=>classifyPointToSurface3(p,{kind:'cylinder',cylinder})<0&&planes.every(plane=>evaluate(plane,p).sign()<0);
  let interiorSample:Point3|null=null;
  if(!empty){
    const first=faces[0]!,sample=first.domain.components[first.component]!.sample;let step=one.div(two),inside:AlgebraicCoordinates3;
    while(true){
      if(first.kind==='planar')inside=translateAlgebraicPoint3(sample,scale(first.plane.normal,step.neg()));
      else {
        const a=one.sub(step),data=getPointParameterization3(sample);
        inside=data?algebraicPoint3(point3(data.origin.x.mul(a).add(o.x.mul(step)),data.origin.y.mul(a).add(o.y.mul(step)),data.origin.z.mul(a).add(o.z.mul(step))),scale(data.direction,a),data.parameter):algebraicCoordinates3(...axes.map(k=>sample[k].affine(a,o[k].mul(step))) as [AlgebraicReal,AlgebraicReal,AlgebraicReal]);
      }
      if(strict(inside))break;step=step.div(two);
    }
    let coordinates=axes.map(k=>inside[k]);
    while(true){
      const p=point3(...coordinates.map(x=>x.lower.add(x.upper).div(two)) as [Rational,Rational,Rational]);
      if(evaluateCylinder3(cylinder,p).sign()<0&&planes.every(q=>dot3(q.normal,p).add(q.offset).sign()<0)){interiorSample=p;break;}
      coordinates=coordinates.map(x=>x.refine());
    }
  }
  const sewing=sewBRepFaces3(patches,{requireClosed:true}),topology=sewing.topology;
  if(!empty&&(topology.shells.length!==1||topology.vertices.length-topology.edges.length+topology.faces.length!==2))throw new Error('Convex cylinder boundary must have one spherical closed shell');
  const locate:ClippedCylinderBRep3['locate']=inputPoint=>{
    if(empty)return 'outside';const p=snapshotExactPoint3(inputPoint),radial=classifyPointToSurface3(p,{kind:'cylinder',cylinder});if(radial>0)return 'outside';let boundary=radial===0;
    for(const plane of planes){const sign=evaluate(plane,p).sign();if(sign>0)return 'outside';if(sign===0)boundary=true;}return boundary?'boundary':'inside';
  };
  const result=Object.freeze({cylinder,lower,upper,planes:Object.freeze(all),empty,faces:Object.freeze(faces),topology,sewing,interiorSample,locate});ownedSolids.add(result);return result;
}


type CylinderPlaneRelation3 = {readonly kind:'split'} |
  {readonly kind:'touching'|'disjoint';readonly materialSide:-1|1};
/** Linear extrema of a convex cylinder/halfspace solid occur at vertices or
 * stationary points of elliptic boundary edges. A stationary generator in a
 * wall interior extends to the finite wall boundary with unchanged value.
 * This is specific to the factory's convex analytic family, not arbitrary BReps.
 */
function planeRelation(input:ClippedCylinderBRep3,plane:Plane3):CylinderPlaneRelation3 {
  let negative=false,positive=false,zero=false;
  const record=(sign:number)=>{if(sign<0)negative=true;else if(sign>0)positive=true;else zero=true;};
  for(const point of input.topology.vertices){record(evaluate(plane,point).sign());if(negative&&positive)return {kind:'split'};}
  for(const edge of input.topology.edges){
    const curve=canonical(edge.curve);if(curve.kind!=='elliptic-arc')continue;
    const e=curve.arc.ellipse,f=e.frame,a=dot3(plane.normal,f.u),b=dot3(plane.normal,f.v),c=dot3(plane.normal,f.origin).add(plane.offset),S=e.radiusUSquared.mul(a.mul(a)).add(e.radiusVSquared.mul(b.mul(b)));
    if(S.sign()===0)continue;
    const root=AlgebraicReal.fromRational(S).sqrt(),U=e.radiusUSquared.mul(a).div(S),V=e.radiusVSquared.mul(b).div(S),direction=vector3(f.u.x.mul(U).add(f.v.x.mul(V)),f.u.y.mul(U).add(f.v.y.mul(V)),f.u.z.mul(U).add(f.v.z.mul(V)));
    for(const sign of [-1,1] as const){
      const value=root.affine(BigInt(sign),c).sign();
      // An already observed sign cannot change the result. Avoid constructing
      // algebraic points and testing arc membership for those extrema.
      if(value<0&&negative||value>0&&positive||value===0&&zero)continue;
      const point=algebraicPoint3(f.origin,direction,sign===1?root:root.neg());
      if(pointOnCurve3(point,curve))record(value);
      if(negative&&positive)return {kind:'split'};
    }
  }
  if(!negative&&!positive)throw new Error('A nonempty full-dimensional solid cannot lie in a plane');
  return {kind:zero?'touching':'disjoint',materialSide:negative?-1:1};
}
/** Internal owned-solid partition. Certify one-sided cuts on the existing
 * boundary before constructing children, avoiding degenerate trim assembly.
 */
export function partitionClippedCylinderBRep3(input:ClippedCylinderBRep3,plane:Plane3):
  {readonly negative:ClippedCylinderBRep3;readonly positive:ClippedCylinderBRep3;readonly relation:CylinderPlaneRelation3} {
  assertOwnedClippedCylinder3(input);
  if(input.empty)throw new RangeError('Boundary partition requires a nonempty parent');
  const relation=planeRelation(input,plane);
  if(relation.kind==='split'){
    const prior=input.planes.map(plane=>({plane,side:-1 as const})),negative=clipCylinderBRep3(input.cylinder,input.lower,input.upper,[...prior,{plane,side:-1}]),positive=clipCylinderBRep3(input.cylinder,input.lower,input.upper,[...prior,{plane,side:1}]);
    if(negative.empty||positive.empty)throw new Error('Boundary plane classification disagrees with the constructed children');
    return {negative,positive,relation};
  }
  if(evaluate(plane,snapshotExactPoint3(input.interiorSample!)).sign()!==relation.materialSide)throw new Error('One-sided boundary classification disagrees with the interior witness');
  // Only the rejected side is regularized empty. Keep precisely its original
  // inequalities plus the new outward halfspace, including normalization.
  const rejected=normalize(relation.materialSide===-1?negate(plane):plane),records=new Map(input.planes.map(p=>[key(p),p]));records.set(key(rejected),rejected);
  const planes=Object.freeze([...records.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,p])=>p)),sewing=sewBRepFaces3([],{requireClosed:true});
  const empty:ClippedCylinderBRep3=Object.freeze({cylinder:input.cylinder,lower:input.lower,upper:input.upper,planes,empty:true,faces:Object.freeze([]),topology:sewing.topology,sewing,interiorSample:null,locate:()=> 'outside' as const});
  ownedSolids.add(empty);
  return relation.materialSide===-1?{negative:input,positive:empty,relation}:{negative:empty,positive:input,relation};
}
