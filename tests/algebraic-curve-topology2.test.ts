import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,Polynomial,AlgebraicReal,isolateRealRoots,BivariatePolynomial,traceAlgebraicCurve2,evaluateAlgebraicCurveEdge2,bivariateFiberRoots} from '../dist/index.js';
import type {AlgebraicCurveTopology2} from '../dist/index.js';
const q=(n:bigint,d=1n)=>new Rational(n,d),real=(n:bigint|string|Rational)=>AlgebraicReal.fromRational(n),U=new BivariatePolynomial([[],[1n]]),V=new BivariatePolynomial([[0n,1n]]),one=new BivariatePolynomial([[1n]]),box={uMin:-2n,uMax:2n,vMin:-2n,vMax:2n};
function degree(t:AlgebraicCurveTopology2,id:number){return t.edges.filter(e=>e.from===id||e.to===id).length;}
function audit(t:AlgebraicCurveTopology2){
  assert.ok(Object.isFrozen(t)&&Object.isFrozen(t.vertices)&&Object.isFrozen(t.edges));
  for(const p of t.vertices){assert.equal(t.polynomial.evaluateAlgebraic(p.u,p.v).sign(),0);assert.ok(p.u.compare(real(t.bounds.uMin))>=0&&p.u.compare(real(t.bounds.uMax))<=0&&p.v.compare(real(t.bounds.vMin))>=0&&p.v.compare(real(t.bounds.vMax))<=0);}
  t.edges.forEach((e,i)=>{const a=t.vertices[e.from]!,b=t.vertices[e.to]!;assert.equal(t.polynomial.evaluateAlgebraic(e.sample.u,e.sample.v).sign(),0);for(const p of [a,b]){const r=evaluateAlgebraicCurveEdge2(t,i,e.kind==='branch'?p.u:p.v);assert.equal(r.u.compare(p.u),0);assert.equal(r.v.compare(p.v),0);}const p=evaluateAlgebraicCurveEdge2(t,i,e.kind==='branch'?e.sample.u:e.sample.v);assert.equal(p.u.compare(e.sample.u),0);assert.equal(p.v.compare(e.sample.v),0);});
  assert.equal(t.components.reduce((n,c)=>n+c.vertices.length,0),t.vertices.length);assert.equal(t.components.reduce((n,c)=>n+c.edges.length,0),t.edges.length);
}
function contains(t:AlgebraicCurveTopology2,u:Rational,v:Rational):boolean {
  const x=real(u),y=real(v);if(t.kind==='area')return true;if(t.vertices.some(p=>p.u.compare(x)===0&&p.v.compare(y)===0))return true;
  return t.edges.some((e,i)=>{const a=t.vertices[e.from]!,b=t.vertices[e.to]!;if(e.kind==='vertical')return a.u.compare(x)===0&&y.compare(a.v)>=0&&y.compare(b.v)<=0;if(x.compare(a.u)<=0||x.compare(b.u)>=0)return false;return evaluateAlgebraicCurveEdge2(t,i,x).v.compare(y)===0;});
}
test('continued-fraction rational recognition recovers nonminimal roots without rounding nearby irrational roots',()=>{
  for(const value of ['-7/13','-1/3','0','1/3','5/2','1234567/17','1/1000000000000000000000000000057']){
    const r=Rational.parse(value),p=new Polynomial([r.neg(),1n]).mul(new Polynomial([-2n,0n,1n])),roots=isolateRealRoots(p),source=roots.find(x=>x.compare(real(r))===0)!;assert.ok(source);const recognized=source.recognizeRational();assert.ok(recognized.rational);assert.equal(recognized.rational!.compare(r),0);assert.equal(recognized.compare(source),0);
    for(const x of roots.filter(x=>x.compare(real(r))!==0)){const y=x.recognizeRational();assert.equal(y.rational,null);assert.equal(y.compare(x),0);}
  }
  const near=real(new Rational(10n**60n+1n,10n**60n)).sqrt().recognizeRational();assert.equal(near.rational,null);assert.equal(near.compare(real(1n)),1);
});
test('fiber root isolation distinguishes a whole line, no roots and exact linear/quadratic/general roots',()=>{
  assert.equal(bivariateFiberRoots(U.mul(V),0n).kind,'whole');assert.equal(bivariateFiberRoots(one,real(2n).sqrt()).roots.length,0);
  const line=bivariateFiberRoots(U.mul(V).sub(one),real(2n).sqrt());assert.equal(line.roots.length,1);assert.equal(line.roots[0]!.mul(real(2n).sqrt()).compare(real(1n)),0);
  const quad=bivariateFiberRoots(U.mul(V.mul(V).sub(one)),real(2n).sqrt());assert.deepEqual(quad.roots.map(v=>v.recognizeRational().rational!.toString()),['-1','1']);
  assert.equal(bivariateFiberRoots(V.mul(V).add(one),0n).roots.length,0);assert.equal(bivariateFiberRoots(V.mul(V),0n).roots.length,1);
  const quartic=V.mul(V).sub(one).mul(V.mul(V).sub(one.scale(2n))),roots=bivariateFiberRoots(quartic,real(3n).sqrt()).roots;assert.equal(roots.length,4);roots.forEach(v=>assert.equal(quartic.evaluateAlgebraic(real(3n).sqrt(),v).sign(),0));
});
test('circle graph preserves a closed component and exact Pythagorean points rather than chords',()=>{
  const F=U.mul(U).add(V.mul(V)).sub(one),t=traceAlgebraicCurve2(F,box);audit(t);assert.equal(t.components.length,1);assert.equal(t.edges.length-t.vertices.length+t.components.length,1);assert.ok(t.vertices.every((_,i)=>degree(t,i)===2));
  for(let k=-8n;k<=8n;k++){const a=q(k,8n),den=q(1n).add(a.mul(a)),x=q(1n).sub(a.mul(a)).div(den),y=a.mul(q(2n)).div(den);assert.ok(contains(t,x,y));assert.ok(contains(t,x.neg(),y));}
});
test('crossings, cusps, tangencies and isolated real points retain distinct local graph incidence',()=>{
  const cases=[{F:V.mul(V).sub(U.mul(U)),degree:4},{F:V.mul(V).sub(U.mul(U).mul(U)),degree:2},{F:V.mul(V.sub(U.mul(U))),degree:4},{F:U.mul(U).add(V.mul(V)),degree:0}];
  for(const {F,degree:expected} of cases){const t=traceAlgebraicCurve2(F,box);audit(t);const origin=t.vertices.findIndex(p=>p.u.sign()===0&&p.v.sign()===0);assert.ok(origin>=0);assert.equal(degree(t,origin),expected);assert.equal(t.components.length,1);}
});
test('multiple critical points on one event fiber stay in separate circle components',()=>{
  const A=U.mul(U).add(V.sub(one.scale(2n)).mul(V.sub(one.scale(2n)))).sub(one),B=U.mul(U).add(V.add(one.scale(2n)).mul(V.add(one.scale(2n)))).sub(one),t=traceAlgebraicCurve2(A.mul(B),{...box,vMin:-4n,vMax:4n});audit(t);assert.equal(t.components.length,2);assert.equal(t.edges.length-t.vertices.length+t.components.length,2);
});
test('quartic curves retain multiple irrational critical fibers and nonrational event coordinates',()=>{
  const A=V.mul(V).sub(U.mul(U)).add(one),B=V.mul(V).sub(U.mul(U)).add(one.scale(3n)),t=traceAlgebraicCurve2(A.mul(B),{uMin:-2n,uMax:2n,vMin:-3n,vMax:3n});audit(t);assert.equal(t.components.length,4);assert.ok(t.vertices.some(p=>p.u.mul(p.u).compare(real(3n))===0&&p.v.mul(p.v).compare(real(2n))===0));
});
test('certified probes prevent false connections when branches cross event separators inside a slab',()=>{
  const F=V.sub(U.scale(2n)).mul(V.sub(U.scale(2n)).sub(one.scale(2n))),t=traceAlgebraicCurve2(F,{uMin:-1n,uMax:1n,vMin:-5n,vMax:5n});audit(t);assert.equal(t.vertices.length,4);assert.equal(t.edges.length,2);assert.equal(t.components.length,2);
  for(let i=0;i<t.edges.length;i++){const e=t.edges[i]!,a=t.vertices[e.from]!,b=t.vertices[e.to]!;assert.equal(b.v.sub(a.v).compare(real(4n)),0);}
});
test('vertical components are split at their exact contacts and repeated factors preserve the same set',()=>{
  const circle=U.mul(U).add(V.mul(V)).sub(one),F=U.mul(circle),t=traceAlgebraicCurve2(F,box);audit(t);assert.equal(t.components.length,1);assert.equal(t.edges.filter(e=>e.kind==='vertical').length,3);for(const p of t.vertices.filter(p=>p.u.sign()===0&&p.v.mul(p.v).compare(real(1n))===0))assert.equal(degree(t,t.vertices.indexOf(p)),4);
  const repeated=traceAlgebraicCurve2(F.mul(F).mul(circle),box);audit(repeated);assert.equal(repeated.edges.length,t.edges.length);assert.equal(repeated.vertices.length,t.vertices.length);
  const vertical=traceAlgebraicCurve2(U.mul(U).sub(one.scale(2n)),box);audit(vertical);assert.equal(vertical.components.length,2);assert.equal(vertical.edges.length,2);assert.ok(vertical.edges.every(e=>e.kind==='vertical'));
});
test('leading-degree drops, irrational critical events and boundary-only contacts remain complete',()=>{
  const hyperbola=traceAlgebraicCurve2(U.mul(V).sub(one),box);audit(hyperbola);assert.equal(hyperbola.components.length,2);
  const irrational=traceAlgebraicCurve2(V.mul(V).sub(U.mul(U)).add(one.scale(2n)),box);audit(irrational);assert.equal(irrational.components.length,2);assert.ok(irrational.vertices.some(p=>p.u.mul(p.u).compare(real(2n))===0&&p.v.sign()===0));
  const bounds={uMin:0n,uMax:1n,vMin:0n,vMax:1n},corner=traceAlgebraicCurve2(U.add(V).sub(one.scale(2n)),bounds);audit(corner);assert.equal(corner.vertices.length,1);assert.equal(corner.edges.length,0);
  const boundary=traceAlgebraicCurve2(V.mul(V),bounds);audit(boundary);assert.equal(boundary.edges.length,1);assert.ok(boundary.vertices.every(p=>p.v.sign()===0));
});
test('sub-floating separations preserve distinct vertical and horizontal components',()=>{
  const epsilon=one.scale(new Rational(1n,10n**40n));
  for(const F of [U.mul(U.sub(epsilon)),V.mul(V.sub(epsilon))]){const t=traceAlgebraicCurve2(F,box);audit(t);assert.equal(t.components.length,2);assert.equal(t.edges.length,2);}
});
test('rational grid membership agrees with independent polynomial signs across trimmed examples',()=>{
  for(const F of [U.mul(V),V.sub(U.mul(U)),U.mul(U).add(V.mul(V)).sub(one),U.mul(V).sub(one),V.sub(one).mul(U.add(V))]){const t=traceAlgebraicCurve2(F,box);for(let i=-4n;i<=4n;i++)for(let j=-4n;j<=4n;j++){const u=q(i,2n),v=q(j,2n);assert.equal(contains(t,u,v),F.evaluate(u,v).sign()===0);}}
});
test('whole-area, empty, ownership and edge-domain cases have explicit behavior',()=>{
  assert.equal(traceAlgebraicCurve2(new BivariatePolynomial(),box).kind,'area');const empty=traceAlgebraicCurve2(one,box);assert.equal(empty.vertices.length,0);assert.equal(empty.edges.length,0);
  assert.throws(()=>traceAlgebraicCurve2(V,{...box,uMax:-2n}),RangeError);const t=traceAlgebraicCurve2(V,box);assert.throws(()=>evaluateAlgebraicCurveEdge2({...t},0,0n),RangeError);assert.throws(()=>evaluateAlgebraicCurveEdge2(t,-1,0n),RangeError);assert.throws(()=>evaluateAlgebraicCurveEdge2(t,0,3n),RangeError);
});
