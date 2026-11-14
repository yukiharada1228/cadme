import {Rational} from '../numeric/rational.js';
import {Polynomial,exactRational} from '../numeric/polynomial.js';
import {AlgebraicReal,isolateRealRoots} from '../numeric/real-roots.js';
import type {ExactInput} from './point2.js';
import {point3} from './point3.js';
import type {Point3} from './point3.js';
import {algebraicCoordinates3,compareAlgebraicPoints3} from './algebraic-point3.js';
import type {AlgebraicCoordinates3} from './algebraic-point3.js';
import {plane3} from './plane3.js';
import type {Plane3} from './plane3.js';

/** Nonperiodic rational B-spline data. Full-multiplicity interior knots may
 * represent discontinuities; every nonzero span has its own closed image.
 */
export interface NurbsCurve3 {
  readonly degree:number;
  readonly controlPoints:readonly Point3[];
  readonly weights:readonly Rational[];
  /** Expanded, nondecreasing knot sequence. */
  readonly knots:readonly Rational[];
  readonly startParameter:Rational;readonly endParameter:Rational;
}
/** Homogeneous power polynomials in the original global parameter. */
export interface NurbsSpan3 {
  readonly index:number;
  readonly startParameter:Rational;readonly endParameter:Rational;
  readonly x:Polynomial;readonly y:Polynomial;readonly z:Polynomial;readonly weight:Polynomial;
}
export type NurbsKnotSide3='left'|'right';
export interface NurbsPlanePoint3 {
  readonly parameter:AlgebraicReal;readonly point:AlgebraicCoordinates3;
  /** Parameter-root multiplicity on each incident noncoincident span. */
  readonly branches:readonly {readonly span:number;readonly multiplicity:number}[];
}
export interface NurbsPlaneIntersection3 {
  /** Endpoint events may also lie on a coincident span. */
  readonly points:readonly NurbsPlanePoint3[];
  readonly coincidentSpans:readonly {readonly span:number;readonly startParameter:Rational;readonly endParameter:Rational}[];
}
type HPoint=readonly [Rational,Rational,Rational,Rational];
type HPolynomial=readonly [Polynomial,Polynomial,Polynomial,Polynomial];
const one=new Rational(1n),owned=new WeakSet<NurbsCurve3>(),compiled=new WeakMap<NurbsCurve3,readonly NurbsSpan3[]>();
function homogeneous(curve:NurbsCurve3):HPoint[]{return curve.controlPoints.map((p,i)=>{const w=curve.weights[i]!;return [p.x.mul(w),p.y.mul(w),p.z.mul(w),w];});}
function snapshot(input:NurbsCurve3):NurbsCurve3 {return owned.has(input)?input:nurbsCurve3(input.degree,input.controlPoints,input.knots,input.weights);}

export function nurbsCurve3(degree:number,inputPoints:readonly Point3[],inputKnots:readonly ExactInput[],inputWeights?:readonly ExactInput[]):NurbsCurve3 {
  if(!Number.isSafeInteger(degree)||degree<1)throw new RangeError('NURBS degree must be a positive safe integer');
  if(inputPoints.length<degree+1||inputKnots.length!==inputPoints.length+degree+1)throw new RangeError('NURBS control point and knot counts disagree');
  const controlPoints=Object.freeze(Array.from(inputPoints,p=>point3(p.x,p.y,p.z))),knots=Object.freeze(Array.from(inputKnots,exactRational)),weights=Object.freeze(inputWeights===undefined?Array.from(inputPoints,()=>one):Array.from(inputWeights,exactRational));
  if(weights.length!==controlPoints.length||weights.some(w=>w.sign()<=0))throw new RangeError('NURBS requires one strictly positive weight per control point');
  let run=1;
  for(let i=1;i<knots.length;i++){
    const order=knots[i]!.compare(knots[i-1]!);if(order<0)throw new RangeError('NURBS knots must be nondecreasing');
    run=order===0?run+1:1;if(run>degree+1)throw new RangeError('Knot multiplicity exceeds degree plus one');
  }
  const startParameter=knots[degree]!,endParameter=knots[controlPoints.length]!;
  if(startParameter.compare(endParameter)>=0)throw new RangeError('NURBS active parameter domain must have positive extent');
  const curve=Object.freeze({degree,controlPoints,weights,knots,startParameter,endParameter});owned.add(curve);return curve;
}

/** Compile de Boor's homogeneous recurrence over Q[u], with no sampling. */
export function nurbsCurveSpans3(input:NurbsCurve3):readonly NurbsSpan3[] {
  const curve=snapshot(input),cached=compiled.get(curve);if(cached)return cached;
  const H=homogeneous(curve),p=curve.degree,U=curve.knots,spans:NurbsSpan3[]=[];
  for(let k=p;k<curve.controlPoints.length;k++){
    if(U[k]!.equals(U[k+1]!))continue;
    const d:HPolynomial[]=H.slice(k-p,k+1).map(h=>h.map(x=>new Polynomial([x])) as unknown as HPolynomial);
    for(let r=1;r<=p;r++)for(let j=p;j>=r;j--){
      const i=k-p+j,alpha=new Polynomial([U[i]!.neg(),one]).scale(one.div(U[i+p-r+1]!.sub(U[i]!))),beta=new Polynomial([one]).sub(alpha);
      d[j]=d[j]!.map((v,c)=>d[j-1]![c]!.mul(beta).add(v.mul(alpha))) as unknown as HPolynomial;
    }
    const [x,y,z,weight]=d[p]!;spans.push(Object.freeze({index:k,startParameter:U[k]!,endParameter:U[k+1]!,x,y,z,weight}));
  }
  const result=Object.freeze(spans);compiled.set(curve,result);return result;
}
function selectSpan(curve:NurbsCurve3,t:AlgebraicReal,side:NurbsKnotSide3):NurbsSpan3 {
  if(side!=='left'&&side!=='right')throw new RangeError('Knot side must be left or right');
  if(t.compare(AlgebraicReal.fromRational(curve.startParameter))<0||t.compare(AlgebraicReal.fromRational(curve.endParameter))>0)throw new RangeError('NURBS parameter is outside the active domain');
  const spans=nurbsCurveSpans3(curve);
  // At domain endpoints only the inward branch exists.
  if(t.compare(AlgebraicReal.fromRational(curve.startParameter))===0)return spans[0]!;
  if(t.compare(AlgebraicReal.fromRational(curve.endParameter))===0)return spans[spans.length-1]!;
  const span=spans.find(s=>{const lo=t.compare(AlgebraicReal.fromRational(s.startParameter)),hi=t.compare(AlgebraicReal.fromRational(s.endParameter));return side==='right'?lo>=0&&hi<0:lo>0&&hi<=0;});
  if(!span)throw new Error('NURBS active spans do not cover the parameter');return span;
}
function image(t:AlgebraicReal,N:Polynomial,W:Polynomial):AlgebraicReal {
  return t.rational===null?t.rationalFunction(N,W):AlgebraicReal.fromRational(N.evaluate(t.rational).div(W.evaluate(t.rational)));
}
function spanPoint(s:NurbsSpan3,t:AlgebraicReal):AlgebraicCoordinates3 {return algebraicCoordinates3(image(t,s.x,s.weight),image(t,s.y,s.weight),image(t,s.z,s.weight));}
export function evaluateNurbsCurve3(input:NurbsCurve3,parameter:AlgebraicReal|ExactInput,side:NurbsKnotSide3='right'):AlgebraicCoordinates3 {
  const curve=snapshot(input),t=parameter instanceof AlgebraicReal?parameter:AlgebraicReal.fromRational(parameter);return spanPoint(selectSpan(curve,t,side),t);
}
/** Exact one-sided derivative with respect to the original parameter. */
export function derivativeNurbsCurve3(input:NurbsCurve3,parameter:AlgebraicReal|ExactInput,side:NurbsKnotSide3='right'):AlgebraicCoordinates3 {
  const curve=snapshot(input),t=parameter instanceof AlgebraicReal?parameter:AlgebraicReal.fromRational(parameter),s=selectSpan(curve,t,side),W=s.weight,Wp=W.derivative(),denominator=W.mul(W);
  const derivative=(N:Polynomial)=>image(t,N.derivative().mul(W).sub(N.mul(Wp)),denominator);
  return algebraicCoordinates3(derivative(s.x),derivative(s.y),derivative(s.z));
}
/** Insert an interior rational knot without changing homogeneous span functions. */
export function insertNurbsKnot3(input:NurbsCurve3,parameter:ExactInput,count=1):NurbsCurve3 {
  let curve=snapshot(input);const t=exactRational(parameter);
  if(!Number.isSafeInteger(count)||count<0)throw new RangeError('Knot insertion count must be a nonnegative safe integer');
  if(t.compare(curve.startParameter)<=0||t.compare(curve.endParameter)>=0)throw new RangeError('Knot insertion requires a strictly interior parameter');
  const multiplicity=curve.knots.filter(u=>u.equals(t)).length;
  if(count>curve.degree+1-multiplicity)throw new RangeError('Inserted knot multiplicity exceeds degree plus one');
  for(let r=0;r<count;r++){
    const U=curve.knots,p=curve.degree,H=homogeneous(curve),s=U.filter(u=>u.equals(t)).length,Q:HPoint[]=[];
    let k=0;while(k+1<U.length&&U[k+1]!.compare(t)<=0)k++;
    for(let i=0;i<=k-p;i++)Q[i]=H[i]!;
    for(let i=k-s;i<H.length;i++)Q[i+1]=H[i]!;
    for(let i=k-p+1;i<=k-s;i++){
      const a=t.sub(U[i]!).div(U[i+p]!.sub(U[i]!)),b=one.sub(a);
      Q[i]=H[i]!.map((v,c)=>H[i-1]![c]!.mul(b).add(v.mul(a))) as unknown as HPoint;
    }
    curve=nurbsCurve3(p,Q.map(h=>point3(h[0].div(h[3]),h[1].div(h[3]),h[2].div(h[3]))),[...U.slice(0,k+1),t,...U.slice(k+1)],Q.map(h=>h[3]));
  }
  return curve;
}
export function splitNurbsCurve3(input:NurbsCurve3,parameter:ExactInput):Readonly<{parameter:Rational;left:NurbsCurve3;right:NurbsCurve3;continuous:boolean}> {
  const curve=snapshot(input),t=exactRational(parameter),multiplicity=curve.knots.filter(u=>u.equals(t)).length,refined=insertNurbsKnot3(curve,t,curve.degree+1-multiplicity),j=refined.knots.findIndex(u=>u.equals(t)),p=curve.degree;
  const left=nurbsCurve3(p,refined.controlPoints.slice(0,j),refined.knots.slice(0,j+p+1),refined.weights.slice(0,j)),right=nurbsCurve3(p,refined.controlPoints.slice(j),refined.knots.slice(j),refined.weights.slice(j));
  return Object.freeze({parameter:t,left,right,continuous:compareAlgebraicPoints3(evaluateNurbsCurve3(left,t),evaluateNurbsCurve3(right,t))===0});
}
export function reverseNurbsCurve3(input:NurbsCurve3):NurbsCurve3 {
  const curve=snapshot(input),sum=curve.startParameter.add(curve.endParameter);
  return nurbsCurve3(curve.degree,[...curve.controlPoints].reverse(),[...curve.knots].reverse().map(u=>sum.sub(u)),[...curve.weights].reverse());
}
/** Complete plane intersections of closed span images, including both branches
 * at discontinuous knots and exact parameter-root multiplicity.
 */
export function intersectNurbsPlane3(input:NurbsCurve3,inputPlane:Plane3):NurbsPlaneIntersection3 {
  const curve=snapshot(input),plane=plane3(inputPlane.normal.x,inputPlane.normal.y,inputPlane.normal.z,inputPlane.offset),events:{parameter:AlgebraicReal;point:AlgebraicCoordinates3;span:number;multiplicity:number}[]=[],coincidentSpans:{span:number;startParameter:Rational;endParameter:Rational}[]=[];
  for(const s of nurbsCurveSpans3(curve)){
    const F=s.x.scale(plane.normal.x).add(s.y.scale(plane.normal.y)).add(s.z.scale(plane.normal.z)).add(s.weight.scale(plane.offset));
    if(F.degree<0){coincidentSpans.push(Object.freeze({span:s.index,startParameter:s.startParameter,endParameter:s.endParameter}));continue;}
    for(const t of isolateRealRoots(F)){
      if(t.compare(AlgebraicReal.fromRational(s.startParameter))<0||t.compare(AlgebraicReal.fromRational(s.endParameter))>0)continue;
      let multiplicity=0;for(let f=F;f.degree>=0&&t.signOf(f)===0;f=f.derivative())multiplicity++;
      events.push({parameter:t,point:spanPoint(s,t),span:s.index,multiplicity});
    }
  }
  events.sort((a,b)=>a.parameter.compare(b.parameter)||compareAlgebraicPoints3(a.point,b.point)||a.span-b.span);
  const points:{parameter:AlgebraicReal;point:AlgebraicCoordinates3;branches:{span:number;multiplicity:number}[]}[]=[];
  for(const event of events){let prior=points[points.length-1];if(!prior||prior.parameter.compare(event.parameter)!==0||compareAlgebraicPoints3(prior.point,event.point)!==0){prior={parameter:event.parameter,point:event.point,branches:[]};points.push(prior);}prior.branches.push(Object.freeze({span:event.span,multiplicity:event.multiplicity}));}
  return Object.freeze({points:Object.freeze(points.map(p=>Object.freeze({...p,branches:Object.freeze(p.branches)}))),coincidentSpans:Object.freeze(coincidentSpans)});
}
