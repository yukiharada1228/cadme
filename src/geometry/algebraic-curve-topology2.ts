import {Rational} from '../numeric/rational.js';
import {Polynomial,exactRational} from '../numeric/polynomial.js';
import {AlgebraicReal,isolateRealRoots} from '../numeric/real-roots.js';
import {BivariatePolynomial} from '../numeric/bivariate-polynomial.js';
import {gcdBivariate,divideBivariateExact,resultantBivariate,bivariateFiberRoots} from '../numeric/bivariate-system.js';
import type {BivariateRoot} from '../numeric/bivariate-system.js';
import type {ExactInput} from './point2.js';

export interface CurveRectangle2 {readonly uMin:Rational;readonly uMax:Rational;readonly vMin:Rational;readonly vMax:Rational;}
export interface CurveEvent2 {readonly u:AlgebraicReal;readonly vertical:boolean;readonly vertices:readonly number[];readonly nonverticalVertices:readonly number[];}
export interface AlgebraicCurveVertex2 extends BivariateRoot {readonly event:number;}
export type AlgebraicCurveEdge2=
 | {readonly kind:'branch';readonly from:number;readonly to:number;readonly slab:number;readonly rank:number;readonly sample:BivariateRoot}
 | {readonly kind:'vertical';readonly from:number;readonly to:number;readonly event:number;readonly sample:BivariateRoot};
export interface AlgebraicCurveTopology2 {
  /** Zero input fills a 2D area and is not represented as a curve graph. */
  readonly kind:'curve'|'area';readonly polynomial:BivariatePolynomial;readonly bounds:CurveRectangle2;
  readonly verticalFactor:Polynomial;readonly nonvertical:BivariatePolynomial;
  readonly events:readonly CurveEvent2[];readonly vertices:readonly AlgebraicCurveVertex2[];readonly edges:readonly AlgebraicCurveEdge2[];
  readonly slabs:readonly {readonly leftEvent:number;readonly rightEvent:number;readonly sampleU:Rational;readonly edges:readonly number[]}[];
  readonly components:readonly {readonly vertices:readonly number[];readonly edges:readonly number[]}[];
}
const owned=new WeakSet<AlgebraicCurveTopology2>(),two=new Rational(2n);
const real=(value:AlgebraicReal|ExactInput)=>value instanceof AlgebraicReal?value:AlgebraicReal.fromRational(value);
function finish(value:AlgebraicCurveTopology2):AlgebraicCurveTopology2 {const frozen=Object.freeze(value);owned.add(frozen);return frozen;}
/** Density of Q, using only exact separating intervals. */
function between(inputA:AlgebraicReal,inputB:AlgebraicReal):Rational {
  if(inputA.compare(inputB)>=0)throw new Error('Expected strictly ordered endpoints');let a=inputA,b=inputB;
  while(a.upper.compare(b.lower)>=0){a=a.refine();b=b.refine();}
  return a.upper.add(b.lower).div(two);
}
function distinct(values:AlgebraicReal[]):AlgebraicReal[]{return values.sort((a,b)=>a.compare(b)).filter((v,i,all)=>i===0||v.compare(all[i-1]!)!==0);}
function fiber(H:BivariatePolynomial,u:AlgebraicReal,bounds:CurveRectangle2):readonly AlgebraicReal[] {
  const result=bivariateFiberRoots(H,u);if(result.kind==='whole')throw new Error('Primitive nonvertical curve has an identically zero fiber');
  return result.roots.filter(v=>v.compare(real(bounds.vMin))>=0&&v.compare(real(bounds.vMax))<=0);
}
function connections(vertices:readonly AlgebraicCurveVertex2[],edges:readonly AlgebraicCurveEdge2[]):AlgebraicCurveTopology2['components'] {
  const incidence=vertices.map(()=>[] as number[]);edges.forEach((e,i)=>{incidence[e.from]!.push(i);incidence[e.to]!.push(i);});const seen=new Set<number>(),result:{vertices:readonly number[];edges:readonly number[]}[]=[];
  for(let root=0;root<vertices.length;root++)if(!seen.has(root)){
    const todo=[root],vs:number[]=[],es=new Set<number>();seen.add(root);
    while(todo.length){const v=todo.pop()!;vs.push(v);for(const id of incidence[v]!){es.add(id);const e=edges[id]!,other=e.from===v?e.to:e.from;if(!seen.has(other)){seen.add(other);todo.push(other);}}}
    result.push(Object.freeze({vertices:Object.freeze(vs.sort((a,b)=>a-b)),edges:Object.freeze([...es].sort((a,b)=>a-b))}));
  }
  return Object.freeze(result);
}
/** Exact graph of a rational algebraic zero locus in a closed rational
 * rectangle. Branches are implicit ordered roots, not straight segments.
 */
export function traceAlgebraicCurve2(F:BivariatePolynomial,inputBounds:{readonly uMin:ExactInput;readonly uMax:ExactInput;readonly vMin:ExactInput;readonly vMax:ExactInput}):AlgebraicCurveTopology2 {
  const bounds=Object.freeze({uMin:exactRational(inputBounds.uMin),uMax:exactRational(inputBounds.uMax),vMin:exactRational(inputBounds.vMin),vMax:exactRational(inputBounds.vMax)});
  if(bounds.uMin.compare(bounds.uMax)>=0||bounds.vMin.compare(bounds.vMax)>=0)throw new RangeError('Curve rectangle must have positive width and height');
  if(F.degreeU<0)return finish({kind:'area',polynomial:F,bounds,verticalFactor:new Polynomial(),nonvertical:F,events:Object.freeze([]),vertices:Object.freeze([]),edges:Object.freeze([]),slabs:Object.freeze([]),components:Object.freeze([])});
  const content=F.transpose().rows.reduce((g,p)=>g.gcd(p),new Polynomial()),C=content.squareFree(),primitive=divideBivariateExact(F,new BivariatePolynomial(content.coefficients.map(c=>[c]))),H=divideBivariateExact(primitive,gcdBivariate(primitive,primitive.derivativeV())),projection:Polynomial[]=[C];
  if(H.degreeV>0){
    const discriminant=resultantBivariate(H,H.derivativeV());if(discriminant.degree<0)throw new Error('Square-free nonvertical curve has a zero projection resultant');
    projection.push(discriminant,H.transpose().rows[H.degreeV]!,H.specializeV(bounds.vMin),H.specializeV(bounds.vMax));
  }
  const xs=distinct([real(bounds.uMin),real(bounds.uMax),...projection.filter(p=>p.degree>0).flatMap(p=>isolateRealRoots(p)).map(u=>u.recognizeRational()).filter(u=>u.compare(real(bounds.uMin))>=0&&u.compare(real(bounds.uMax))<=0)]),events:CurveEvent2[]=[],vertices:AlgebraicCurveVertex2[]=[],edges:AlgebraicCurveEdge2[]=[],slabs:{leftEvent:number;rightEvent:number;sampleU:Rational;edges:readonly number[]}[]=[];
  const rootsByEvent:readonly AlgebraicReal[][]=xs.map(u=>[...fiber(H,u,bounds)]);
  xs.forEach((u,event)=>{
    const vertical=u.signOf(C)===0,roots=rootsByEvent[event]!,all=distinct([...roots,...(vertical?[real(bounds.vMin),real(bounds.vMax)]:[])]),ids=all.map(v=>{const id=vertices.length;vertices.push(Object.freeze({u,v,event}));return id;}),nonverticalVertices=roots.map(v=>ids[all.findIndex(w=>w.compare(v)===0)]!);
    events.push(Object.freeze({u,vertical,vertices:Object.freeze(ids),nonverticalVertices:Object.freeze(nonverticalVertices)}));
    if(vertical)for(let i=0;i+1<ids.length;i++){const from=ids[i]!,to=ids[i+1]!,sample=Object.freeze({u,v:real(between(all[i]!,all[i+1]!))});edges.push(Object.freeze({kind:'vertical',from,to,event,sample}));}
  });
  /** Match root ranks to an event. Rational horizontal separators between its
   * roots cannot be crossed between the certified probe and the event line.
   */
  const attach=(event:number,sampleU:Rational,count:number):number[]=>{
    if(count===0)return [];const at=events[event]!,roots=rootsByEvent[event]!;
    if(roots.length===0)throw new Error('A bounded slab branch has no event-fiber limit');
    if(roots.length===1)return Array.from({length:count},()=>at.nonverticalVertices[0]!);
    const separators=roots.slice(0,-1).map((v,i)=>between(v,roots[i+1]!)),sample=real(sampleU),left=sample.compare(at.u)<0;let nearest=sample;
    for(const v of separators){
      const restriction=H.specializeV(v);if(restriction.degree<0||at.u.signOf(restriction)===0)throw new Error('An event separator lies on its fiber');
      for(const root of isolateRealRoots(restriction)){
        if(left?root.compare(nearest)>0&&root.compare(at.u)<0:root.compare(at.u)>0&&root.compare(nearest)<0)nearest=root;
      }
    }
    const probe=real(left?between(nearest,at.u):between(at.u,nearest)),values=fiber(H,probe,bounds);if(values.length!==count)throw new Error('Slab branch count changed away from projection events');
    return values.map(v=>{let rank=0;for(const s of separators){const sign=v.compare(real(s));if(sign===0)throw new Error('Probe is on a horizontal separator crossing');if(sign>0)rank++;}return at.nonverticalVertices[rank]!;});
  };
  for(let i=0;i+1<events.length;i++){
    const sampleU=between(xs[i]!,xs[i+1]!),values=fiber(H,real(sampleU),bounds),from=attach(i,sampleU,values.length),to=attach(i+1,sampleU,values.length),ids:number[]=[];
    values.forEach((v,rank)=>{ids.push(edges.length);edges.push(Object.freeze({kind:'branch',from:from[rank]!,to:to[rank]!,slab:i,rank,sample:Object.freeze({u:real(sampleU),v})}));});
    slabs.push(Object.freeze({leftEvent:i,rightEvent:i+1,sampleU,edges:Object.freeze(ids)}));
  }
  return finish({kind:'curve',polynomial:F,bounds,verticalFactor:C,nonvertical:H,events:Object.freeze(events),vertices:Object.freeze(vertices),edges:Object.freeze(edges),slabs:Object.freeze(slabs),components:connections(vertices,edges)});
}
/** Evaluate a branch by u, or a vertical edge by v, on its closed domain. */
export function evaluateAlgebraicCurveEdge2(input:AlgebraicCurveTopology2,edge:number,parameter:AlgebraicReal|ExactInput):BivariateRoot {
  if(!owned.has(input))throw new RangeError('Curve evaluation requires a factory-created topology');
  if(!Number.isSafeInteger(edge)||edge<0||edge>=input.edges.length)throw new RangeError('Invalid curve edge index');
  const e=input.edges[edge]!,a=input.vertices[e.from]!,b=input.vertices[e.to]!,t=real(parameter),lo=e.kind==='branch'?a.u:a.v,hi=e.kind==='branch'?b.u:b.v;
  if(t.compare(lo)<0||t.compare(hi)>0)throw new RangeError('Curve parameter is outside the edge');
  if(t.compare(lo)===0)return Object.freeze({u:a.u,v:a.v});if(t.compare(hi)===0)return Object.freeze({u:b.u,v:b.v});
  if(e.kind==='vertical')return Object.freeze({u:a.u,v:t});
  const values=fiber(input.nonvertical,t,input.bounds),v=values[e.rank];if(v===undefined)throw new Error('Curve rank is absent from an interior fiber');return Object.freeze({u:t,v});
}
