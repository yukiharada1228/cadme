import {Rational} from '../numeric/rational.js';
import {exactRational} from '../numeric/polynomial.js';
import {BivariatePolynomial} from '../numeric/bivariate-polynomial.js';
import {AlgebraicReal} from '../numeric/real-roots.js';
import type {ExactInput} from './point2.js';
import {point3} from './point3.js';
import type {Point3} from './point3.js';
import {algebraicCoordinates3} from './algebraic-point3.js';
import type {AlgebraicCoordinates3} from './algebraic-point3.js';
import {plane3} from './plane3.js';
import type {Plane3} from './plane3.js';
import {nurbsCurve3,nurbsCurveSpans3,selectNurbsSpan3,insertNurbsKnot3,splitNurbsCurve3,reverseNurbsCurve3} from './nurbs-curve3.js';
import type {NurbsCurve3,NurbsKnotSide3} from './nurbs-curve3.js';

export type NurbsDirection3='u'|'v';
export interface NurbsSurfaceSides3 {readonly uSide?:NurbsKnotSide3;readonly vSide?:NurbsKnotSide3;}
/** Nonperiodic rational tensor-product surface. Grid indexing is [u][v]. */
export interface NurbsSurface3 {
  readonly degreeU:number;readonly degreeV:number;
  readonly controlPoints:readonly (readonly Point3[])[];
  readonly weights:readonly (readonly Rational[])[];
  readonly knotsU:readonly Rational[];readonly knotsV:readonly Rational[];
  readonly startU:Rational;readonly endU:Rational;readonly startV:Rational;readonly endV:Rational;
}
export interface NurbsSurfacePatch3 {
  readonly uSpan:number;readonly vSpan:number;
  readonly startU:Rational;readonly endU:Rational;readonly startV:Rational;readonly endV:Rational;
  readonly x:BivariatePolynomial;readonly y:BivariatePolynomial;readonly z:BivariatePolynomial;readonly weight:BivariatePolynomial;
}
export interface NurbsSurfaceDifferential3 {
  readonly du:AlgebraicCoordinates3;readonly dv:AlgebraicCoordinates3;
  /** Nonunit du × dv; zero at a singular parameter. */
  readonly normal:AlgebraicCoordinates3;readonly regular:boolean;
}
export interface NurbsSurfaceSplit3 {
  readonly direction:NurbsDirection3;readonly parameter:Rational;
  readonly lower:NurbsSurface3;readonly upper:NurbsSurface3;
  readonly boundaries:readonly [NurbsCurve3,NurbsCurve3];
  /** Pointwise equality of both one-sided boundary curves, at the same parameter. */
  readonly continuous:boolean;
}
type H=readonly [BivariatePolynomial,BivariatePolynomial,BivariatePolynomial,BivariatePolynomial];
const one=new Rational(1n),owned=new WeakSet<NurbsSurface3>(),patchCache=new WeakMap<NurbsSurface3,readonly NurbsSurfacePatch3[]>(),lineCache=new WeakMap<NurbsSurface3,Map<NurbsDirection3,readonly NurbsCurve3[]>>();
const asReal=(v:AlgebraicReal|ExactInput)=>v instanceof AlgebraicReal?v:AlgebraicReal.fromRational(v);
function direction(value:NurbsDirection3):void {if(value!=='u'&&value!=='v')throw new RangeError('NURBS direction must be u or v');}
function snapshot(input:NurbsSurface3):NurbsSurface3 {return owned.has(input)?input:nurbsSurface3(input.degreeU,input.degreeV,input.controlPoints,input.knotsU,input.knotsV,input.weights);}

export function nurbsSurface3(degreeU:number,degreeV:number,inputPoints:readonly (readonly Point3[])[],inputKnotsU:readonly ExactInput[],inputKnotsV:readonly ExactInput[],inputWeights?:readonly (readonly ExactInput[])[]):NurbsSurface3 {
  const nu=inputPoints.length,nv=inputPoints[0]?.length??0;
  if(nu===0||nv===0||Array.from(inputPoints).some(row=>row.length!==nv))throw new RangeError('NURBS control grid must be nonempty and rectangular');
  const controlPoints=Object.freeze(Array.from(inputPoints,row=>Object.freeze(Array.from(row,p=>point3(p.x,p.y,p.z)))));
  if(inputWeights!==undefined&&(inputWeights.length!==nu||Array.from(inputWeights).some(row=>row.length!==nv)))throw new RangeError('NURBS weight grid dimensions disagree');
  const weights=Object.freeze(controlPoints.map((row,i)=>Object.freeze(row.map((_,j)=>inputWeights===undefined?one:exactRational(inputWeights[i]![j]!)))));
  if(weights.some(row=>row.some(w=>w.sign()<=0)))throw new RangeError('NURBS surface weights must be strictly positive');
  const u=nurbsCurve3(degreeU,controlPoints.map(row=>row[0]!),inputKnotsU,weights.map(row=>row[0]!)),v=nurbsCurve3(degreeV,controlPoints[0]!,inputKnotsV,weights[0]!);
  const result=Object.freeze({degreeU,degreeV,controlPoints,weights,knotsU:u.knots,knotsV:v.knots,startU:u.startParameter,endU:u.endParameter,startV:v.startParameter,endV:v.endParameter});owned.add(result);return result;
}
/** Curves in a control-grid direction, including homogeneous weights. */
function lines(surface:NurbsSurface3,axis:NurbsDirection3):readonly NurbsCurve3[] {
  let cache=lineCache.get(surface);if(!cache){cache=new Map();lineCache.set(surface,cache);}const prior=cache.get(axis);if(prior)return prior;
  const result=Object.freeze(axis==='u'?surface.controlPoints[0]!.map((_,j)=>nurbsCurve3(surface.degreeU,surface.controlPoints.map(row=>row[j]!),surface.knotsU,surface.weights.map(row=>row[j]!))):surface.controlPoints.map((row,i)=>nurbsCurve3(surface.degreeV,row,surface.knotsV,surface.weights[i]!)));
  cache.set(axis,result);return result;
}
/** Exact homogeneous Q[u,v] patches, one per nonzero knot rectangle. */
export function nurbsSurfacePatches3(input:NurbsSurface3):readonly NurbsSurfacePatch3[] {
  const s=snapshot(input),prior=patchCache.get(s);if(prior)return prior;
  const columns=lines(s,'u').map(nurbsCurveSpans3),vSpans=nurbsCurveSpans3(lines(s,'v')[0]!),result:NurbsSurfacePatch3[]=[],V=s.knotsV,q=s.degreeV;
  for(let a=0;a<columns[0]!.length;a++)for(const v of vSpans){
    const u=columns[0]![a]!,k=v.index,d:H[]=columns.slice(k-q,k+1).map(column=>{const span=column[a]!;return [span.x,span.y,span.z,span.weight].map(p=>new BivariatePolynomial(p.coefficients.map(c=>[c]))) as unknown as H;});
    for(let r=1;r<=q;r++)for(let j=q;j>=r;j--){
      const i=k-q+j,den=V[i+q-r+1]!.sub(V[i]!),alpha=new BivariatePolynomial([[V[i]!.neg().div(den),one.div(den)]]),beta=new BivariatePolynomial([[one]]).sub(alpha);
      d[j]=d[j]!.map((value,c)=>d[j-1]![c]!.mul(beta).add(value.mul(alpha))) as unknown as H;
    }
    const [x,y,z,weight]=d[q]!;result.push(Object.freeze({uSpan:u.index,vSpan:v.index,startU:u.startParameter,endU:u.endParameter,startV:v.startParameter,endV:v.endParameter,x,y,z,weight}));
  }
  const frozen=Object.freeze(result);patchCache.set(s,frozen);return frozen;
}
function selected(s:NurbsSurface3,u:AlgebraicReal,v:AlgebraicReal,sides:NurbsSurfaceSides3):NurbsSurfacePatch3 {
  const U=selectNurbsSpan3(lines(s,'u')[0]!,u,sides.uSide??'right'),V=selectNurbsSpan3(lines(s,'v')[0]!,v,sides.vSide??'right'),patch=nurbsSurfacePatches3(s).find(p=>p.uSpan===U.index&&p.vSpan===V.index);
  if(!patch)throw new Error('NURBS patches do not cover the selected parameter rectangle');return patch;
}
export function evaluateNurbsSurface3(input:NurbsSurface3,inputU:AlgebraicReal|ExactInput,inputV:AlgebraicReal|ExactInput,sides:NurbsSurfaceSides3={}):AlgebraicCoordinates3 {
  const s=snapshot(input),u=asReal(inputU),v=asReal(inputV),p=selected(s,u,v,sides);
  return algebraicCoordinates3(p.x.rationalImage(u,v,p.weight),p.y.rationalImage(u,v,p.weight),p.z.rationalImage(u,v,p.weight));
}
export function differentialNurbsSurface3(input:NurbsSurface3,inputU:AlgebraicReal|ExactInput,inputV:AlgebraicReal|ExactInput,sides:NurbsSurfaceSides3={}):NurbsSurfaceDifferential3 {
  const s=snapshot(input),u=asReal(inputU),v=asReal(inputV),p=selected(s,u,v,sides),W=p.weight,den=W.mul(W);
  const derivative=(axis:NurbsDirection3)=>{const d=(f:BivariatePolynomial)=>axis==='u'?f.derivativeU():f.derivativeV(),Dw=d(W),image=(N:BivariatePolynomial)=>d(N).mul(W).sub(N.mul(Dw)).rationalImage(u,v,den);return algebraicCoordinates3(image(p.x),image(p.y),image(p.z));};
  const du=derivative('u'),dv=derivative('v'),normal=algebraicCoordinates3(du.y.mul(dv.z).sub(du.z.mul(dv.y)),du.z.mul(dv.x).sub(du.x.mul(dv.z)),du.x.mul(dv.y).sub(du.y.mul(dv.x)));
  return Object.freeze({du,dv,normal,regular:normal.x.sign()!==0||normal.y.sign()!==0||normal.z.sign()!==0});
}
/** Fix the named rational parameter; the returned curve varies in the other. */
export function nurbsSurfaceIsoCurve3(input:NurbsSurface3,axis:NurbsDirection3,parameter:ExactInput,side:NurbsKnotSide3='right'):NurbsCurve3 {
  direction(axis);const s=snapshot(input),t=exactRational(parameter),real=asReal(t),H=lines(s,axis).map(line=>{const span=selectNurbsSpan3(line,real,side);return [span.x,span.y,span.z,span.weight].map(p=>p.evaluate(t));}),points=H.map(h=>point3(h[0]!.div(h[3]!),h[1]!.div(h[3]!),h[2]!.div(h[3]!))),weights=H.map(h=>h[3]!);
  return axis==='u'?nurbsCurve3(s.degreeV,points,s.knotsV,weights):nurbsCurve3(s.degreeU,points,s.knotsU,weights);
}
function fromLines(s:NurbsSurface3,axis:NurbsDirection3,curves:readonly NurbsCurve3[]):NurbsSurface3 {
  const points=axis==='v'?curves.map(c=>c.controlPoints):curves[0]!.controlPoints.map((_,i)=>curves.map(c=>c.controlPoints[i]!)),weights=axis==='v'?curves.map(c=>c.weights):curves[0]!.weights.map((_,i)=>curves.map(c=>c.weights[i]!));
  return nurbsSurface3(s.degreeU,s.degreeV,points,axis==='u'?curves[0]!.knots:s.knotsU,axis==='v'?curves[0]!.knots:s.knotsV,weights);
}
export function insertNurbsSurfaceKnot3(input:NurbsSurface3,axis:NurbsDirection3,parameter:ExactInput,count=1):NurbsSurface3 {
  direction(axis);const s=snapshot(input),curves=lines(s,axis).map(c=>insertNurbsKnot3(c,parameter,count));return count===0?s:fromLines(s,axis,curves);
}
export function reverseNurbsSurface3(input:NurbsSurface3,axis:NurbsDirection3):NurbsSurface3 {direction(axis);const s=snapshot(input);return fromLines(s,axis,lines(s,axis).map(reverseNurbsCurve3));}
export function splitNurbsSurface3(input:NurbsSurface3,axis:NurbsDirection3,parameter:ExactInput):NurbsSurfaceSplit3 {
  direction(axis);const s=snapshot(input),parts=lines(s,axis).map(c=>splitNurbsCurve3(c,parameter)),t=parts[0]!.parameter,lower=fromLines(s,axis,parts.map(p=>p.left)),upper=fromLines(s,axis,parts.map(p=>p.right)),A=nurbsSurfaceIsoCurve3(lower,axis,t),B=nurbsSurfaceIsoCurve3(upper,axis,t),a=nurbsCurveSpans3(A),b=nurbsCurveSpans3(B);
  const continuous=a.length===b.length&&a.every((p,i)=>{const q=b[i]!;return p.startParameter.equals(q.startParameter)&&p.endParameter.equals(q.endParameter)&&(['x','y','z'] as const).every(key=>p[key].mul(q.weight).equals(q[key].mul(p.weight)));});
  return Object.freeze({direction:axis,parameter:t,lower,upper,boundaries:Object.freeze([A,B] as const),continuous});
}
/** Exact plane equations restricted to each parameter rectangle. These are
 * implicit equations, not an enumeration or topology of intersection curves.
 */
export function nurbsSurfacePlaneEquations3(input:NurbsSurface3,inputPlane:Plane3):readonly Readonly<{patch:NurbsSurfacePatch3;polynomial:BivariatePolynomial}>[] {
  const s=snapshot(input),plane=plane3(inputPlane.normal.x,inputPlane.normal.y,inputPlane.normal.z,inputPlane.offset);
  return Object.freeze(nurbsSurfacePatches3(s).map(p=>Object.freeze({patch:p,polynomial:p.x.scale(plane.normal.x).add(p.y.scale(plane.normal.y)).add(p.z.scale(plane.normal.z)).add(p.weight.scale(plane.offset))})));
}
export function nurbsSurfaceOnPlane3(input:NurbsSurface3,plane:Plane3):boolean {return nurbsSurfacePlaneEquations3(input,plane).every(p=>p.polynomial.degreeU<0);}
