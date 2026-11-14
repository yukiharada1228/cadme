import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,Polynomial,BivariatePolynomial,AlgebraicReal,point3,plane3,compareAlgebraicPoints3,nurbsSurface3,nurbsSurfacePatches3,evaluateNurbsSurface3,differentialNurbsSurface3,nurbsSurfaceIsoCurve3,insertNurbsSurfaceKnot3,splitNurbsSurface3,reverseNurbsSurface3,nurbsSurfacePlaneEquations3,nurbsSurfaceOnPlane3,evaluateNurbsCurve3} from '../dist/index.js';
import type {NurbsSurface3,NurbsSurfacePatch3} from '../dist/index.js';
const q=(n:bigint,d=1n)=>new Rational(n,d),one=q(1n),zero=q(0n),K=[0n,0n,1n,1n],keys=['x','y','z','weight'] as const;
const real=(v:bigint|string|Rational)=>AlgebraicReal.fromRational(v);
function same(a:ReturnType<typeof evaluateNurbsSurface3>,b:ReturnType<typeof evaluateNurbsSurface3>){assert.equal(compareAlgebraicPoints3(a,b),0);}
function rationalPoint(x:Rational,y:Rational,z:Rational){return {x:real(x),y:real(y),z:real(z)};}
const saddle=()=>nurbsSurface3(1,1,[[point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,1n,1n)]],K,K);
function basis(U:readonly Rational[],degree:number,span:number):Polynomial[]{
  let B=U.slice(1).map((_,i)=>new Polynomial(i===span?[1n]:[]));
  for(let p=1;p<=degree;p++)B=Array.from({length:B.length-1},(_,i)=>{let sum=new Polynomial();const a=U[i+p]!.sub(U[i]!),b=U[i+p+1]!.sub(U[i+1]!);if(a.sign()>0)sum=sum.add(B[i]!.mul(new Polynomial([U[i]!.neg(),1n])).scale(one.div(a)));if(b.sign()>0)sum=sum.add(B[i+1]!.mul(new Polynomial([U[i+p+1]!, -1n])).scale(one.div(b)));return sum;});return B;
}
function oracle(s:NurbsSurface3,p:NurbsSurfacePatch3):BivariatePolynomial[]{
  const U=basis(s.knotsU,s.degreeU,p.uSpan),V=basis(s.knotsV,s.degreeV,p.vSpan);
  return keys.map(key=>{let sum=new BivariatePolynomial();U.forEach((u,i)=>V.forEach((v,j)=>{const factor=s.weights[i]![j]!.mul(key==='weight'?one:s.controlPoints[i]![j]![key]);sum=sum.add(new BivariatePolynomial(u.coefficients.map(c=>v.coefficients.map(d=>c.mul(d).mul(factor)))));}));return sum;});
}
function unchanged(original:NurbsSurface3,refined:NurbsSurface3){
  for(const p of nurbsSurfacePatches3(refined)){
    const u=p.startU.add(p.endU).div(q(2n)),v=p.startV.add(p.endV).div(q(2n)),prior=nurbsSurfacePatches3(original).find(r=>u.compare(r.startU)>0&&u.compare(r.endU)<0&&v.compare(r.startV)>0&&v.compare(r.endV)<0)!;
    assert.ok(prior);for(const key of keys)assert.ok(p[key].equals(prior[key]),`Changed homogeneous ${key}`);
  }
}
test('bilinear surface values, partials and normals agree with an independent saddle formula',()=>{
  const s=saddle();
  for(let i=0n;i<=4n;i++)for(let j=0n;j<=4n;j++){
    const u=q(i,4n),v=q(j,4n),d=differentialNurbsSurface3(s,u,v);same(evaluateNurbsSurface3(s,u,v),rationalPoint(u,v,u.mul(v)));same(d.du,rationalPoint(one,zero,v));same(d.dv,rationalPoint(zero,one,u));same(d.normal,rationalPoint(v.neg(),u.neg(),one));assert.equal(d.regular,true);
  }
  const u=real('1/2').sqrt(),v=real('1/3').sqrt(),p=evaluateNurbsSurface3(s,u,v),d=differentialNurbsSurface3(s,u,v);same(p,{x:u,y:v,z:u.mul(v)});assert.equal(d.normal.x.compare(v.neg()),0);assert.equal(d.normal.y.compare(u.neg()),0);
  const equal=evaluateNurbsSurface3(s,u,u.refine());assert.equal(equal.z.compare(real('1/2')),0);
});
test('rational quarter-cylinder surface and both isocurve directions retain exact geometry',()=>{
  const poles=[[1n,0n],[1n,1n],[0n,1n]],s=nurbsSurface3(2,1,poles.map(([x,y])=>[point3(x!,y!,-2n),point3(x!,y!,3n)]),[0n,0n,0n,1n,1n,1n],K,[[1n,1n],[1n,1n],[2n,2n]]);
  for(let i=0n;i<=8n;i++)for(let j=0n;j<=4n;j++){
    const u=q(i,8n),v=q(j,4n),den=one.add(u.mul(u)),x=one.sub(u.mul(u)).div(den),y=u.mul(q(2n)).div(den),z=q(-2n).add(v.mul(q(5n))),p=evaluateNurbsSurface3(s,u,v),d=differentialNurbsSurface3(s,u,v);same(p,rationalPoint(x,y,z));assert.equal(d.regular,true);assert.equal(d.normal.x.mul(p.y).sub(d.normal.y.mul(p.x)).sign(),0);assert.equal(d.normal.x.mul(p.x).add(d.normal.y.mul(p.y)).sign(),1);
  }
  for(const axis of ['u','v'] as const){const curve=nurbsSurfaceIsoCurve3(s,axis,'1/2');for(let i=0n;i<=8n;i++){const t=q(i,8n);same(evaluateNurbsCurve3(curve,t),axis==='u'?evaluateNurbsSurface3(s,'1/2',t):evaluateNurbsSurface3(s,t,'1/2'));}}
  const u=real('1/2').sqrt();same(evaluateNurbsSurface3(s,u,'1/2'),evaluateNurbsCurve3(nurbsSurfaceIsoCurve3(s,'v','1/2'),u));
});
test('tensor coefficients match independent Cox products and both refinement orders preserve every patch',()=>{
  for(const [p,r] of [[1,2],[2,3],[3,1],[3,3]]){
    const nu=p!+3,nv=r!+2,U=[...Array(p!+1).fill(0n),'1/4','3/4',...Array(p!+1).fill(1n)],V=[...Array(r!+1).fill(0n),'2/5',...Array(r!+1).fill(1n)],points=Array.from({length:nu},(_,i)=>Array.from({length:nv},(_,j)=>point3(BigInt(i*i-j),q(BigInt(i+2*j),3n),q(BigInt(i*j),7n)))),weights=points.map((row,i)=>row.map((_,j)=>q(BigInt((i+j)%5+1),BigInt(i%2+1)))),s=nurbsSurface3(p!,r!,points,U,V,weights);
    for(const patch of nurbsSurfacePatches3(s)){const expected=oracle(s,patch);keys.forEach((key,i)=>assert.ok(patch[key].equals(expected[i]!)));assert.equal(patch.weight.evaluate(patch.startU,patch.startV).sign(),1);}
    const uv=insertNurbsSurfaceKnot3(insertNurbsSurfaceKnot3(s,'u','1/2',p!+1),'v','1/3',r!+1),vu=insertNurbsSurfaceKnot3(insertNurbsSurfaceKnot3(s,'v','1/3',r!+1),'u','1/2',p!+1);unchanged(s,uv);unchanged(s,vu);
    for(const axis of ['u','v'] as const){const split=splitNurbsSurface3(s,axis,'1/2');assert.equal(split.continuous,true);unchanged(s,split.lower);unchanged(s,split.upper);for(let i=0n;i<=4n;i++)same(evaluateNurbsCurve3(split.boundaries[0],q(i,4n)),evaluateNurbsCurve3(split.boundaries[1],q(i,4n)));}
  }
});
test('unclamped weighted grids, tiny rectangles and reversal preserve the original parameterization',()=>{
  const scale=10n**40n,s=nurbsSurface3(2,1,Array.from({length:4},(_,i)=>[point3(scale+BigInt(i),0n,BigInt(i*i)),point3(scale+BigInt(i),1n,BigInt(i))]),[-3n,-1n,0n,'1/3',2n,3n,5n],[-2n,0n,1n,3n],[[1n,2n],[2n,3n],[3n,1n],[1n,4n]]),tiny=insertNurbsSurfaceKnot3(s,'u',q(1n,3n).add(q(1n,scale)),3);unchanged(s,tiny);
  for(const axis of ['u','v'] as const){const reverse=reverseNurbsSurface3(s,axis);for(let i=0n;i<=4n;i++){const u=q(i,2n),v=q(i,4n),U=axis==='u'?q(2n).sub(u):u,V=axis==='v'?one.sub(v):v,a=differentialNurbsSurface3(s,u,v),b=differentialNurbsSurface3(reverse,U,V);same(evaluateNurbsSurface3(s,u,v),evaluateNurbsSurface3(reverse,U,V));for(const k of ['x','y','z'] as const)assert.equal(a.normal[k].add(b.normal[k]).sign(),0);}}
});
test('independent knot-side choices preserve four branches and split boundary discontinuities',()=>{
  const points=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>point3(BigInt(i),BigInt(j),BigInt(i*j)))),knots=[0n,0n,1n,1n,2n,2n],s=nurbsSurface3(1,1,points,knots,knots);
  for(const uSide of ['left','right'] as const)for(const vSide of ['left','right'] as const){const i=uSide==='left'?1n:2n,j=vSide==='left'?1n:2n;same(evaluateNurbsSurface3(s,1n,1n,{uSide,vSide}),rationalPoint(q(i),q(j),q(i*j)));}
  for(const axis of ['u','v'] as const){const split=splitNurbsSurface3(s,axis,1n);assert.equal(split.continuous,false);for(let i=0n;i<=4n;i++){const t=q(i,2n),a=evaluateNurbsCurve3(split.boundaries[0],t),b=evaluateNurbsCurve3(split.boundaries[1],t);assert.equal(axis==='u'?a.x.rational!.toString():a.y.rational!.toString(),'1');assert.equal(axis==='u'?b.x.rational!.toString():b.y.rational!.toString(),'2');}}
  const reverse=reverseNurbsSurface3(s,'u');same(evaluateNurbsSurface3(s,1n,1n,{uSide:'left',vSide:'left'}),evaluateNurbsSurface3(reverse,1n,1n,{uSide:'right',vSide:'left'}));
});
test('split continuity compares projected boundary functions rather than poles or image endpoints',()=>{
  const left=[0n,'1/2',1n],right=[0n,'1/3',1n],poles=[0n,1n,1n,2n].map((x,i)=>(i<2?left:right).map(y=>point3(x,y,0n))),weights=[[1n,1n,1n],[1n,1n,1n],[1n,'3/2',2n],[1n,'3/2',2n]],U=[0n,0n,1n,1n,2n,2n],V=[0n,0n,0n,1n,1n,1n],s=nurbsSurface3(1,2,poles,U,V,weights),split=splitNurbsSurface3(s,'u',1n);
  assert.equal(split.continuous,true);
  for(let i=0n;i<=8n;i++)same(evaluateNurbsCurve3(split.boundaries[0],q(i,8n)),evaluateNurbsCurve3(split.boundaries[1],q(i,8n)));
  const changed=poles.map((row,i)=>i===2?[point3(1n,0n,0n),point3(1n,0n,0n),point3(1n,1n,0n)]:row),different=nurbsSurface3(1,2,changed,U,V),notContinuous=splitNurbsSurface3(different,'u',1n);
  assert.equal(notContinuous.continuous,false);same(evaluateNurbsCurve3(notContinuous.boundaries[0],0n),evaluateNurbsCurve3(notContinuous.boundaries[1],0n));same(evaluateNurbsCurve3(notContinuous.boundaries[0],1n),evaluateNurbsCurve3(notContinuous.boundaries[1],1n));
});
test('singular parameter normals are reported rather than normalized into a false regular patch',()=>{
  const s=nurbsSurface3(1,2,[[point3(0n,0n,0n),point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,0n,0n),point3(1n,1n,0n)]],K,[0n,0n,0n,1n,1n,1n]);
  assert.equal(differentialNurbsSurface3(s,'1/2',0n).regular,false);const d=differentialNurbsSurface3(s,'1/2','1/2');assert.equal(d.regular,true);assert.equal(d.normal.z.compare(real(1n)),0);assert.equal(nurbsSurfaceOnPlane3(s,plane3(0n,0n,1n)),true);
  const constant=nurbsSurface3(1,1,Array.from({length:2},()=>Array.from({length:2},()=>point3(1n,2n,3n))),K,K);assert.equal(differentialNurbsSurface3(constant,'1/2','1/2').regular,false);
});
test('plane restriction equations agree with exact point values and certify whole-span containment',()=>{
  const s=saddle(),plane=plane3(0n,0n,1n,'-1/4'),equations=nurbsSurfacePlaneEquations3(s,plane);assert.equal(equations.length,1);assert.equal(equations[0]!.polynomial.evaluate('1/2','1/2').sign(),0);assert.equal(nurbsSurfaceOnPlane3(s,plane),false);
  for(let i=0n;i<=4n;i++)for(let j=0n;j<=4n;j++){const u=q(i,4n),v=q(j,4n),p=evaluateNurbsSurface3(s,u,v),F=equations[0]!.polynomial,W=equations[0]!.patch.weight;assert.equal(F.evaluate(u,v).div(W.evaluate(u,v)).compare(p.z.rational!.sub(q(1n,4n))),0);}
  const poles=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>point3(BigInt(i),BigInt(j),q(BigInt(-i-2*j-4),3n)))),planar=nurbsSurface3(1,1,poles,K,K,[[1n,2n],[3n,4n]]);assert.equal(nurbsSurfaceOnPlane3(planar,plane3(1n,2n,3n,4n)),true);assert.equal(nurbsSurfaceOnPlane3(planar,plane3(1n,2n,3n,5n)),false);
});
test('surface snapshots freeze grids, ignore cached metadata and reject malformed data',()=>{
  const points=[[point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,1n,1n)]],weights=[[1n,1n],[1n,1n]],knots=[...K],s=nurbsSurface3(1,1,points,knots,K,weights);points[0]![0]=point3(99n,99n,99n);weights[0]![0]=99n;knots[0]=-99n;assert.equal(evaluateNurbsSurface3(s,0n,0n).x.sign(),0);assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.controlPoints[0])&&Object.isFrozen(s.weights[0])&&Object.isFrozen(nurbsSurfacePatches3(s)[0]));
  same(evaluateNurbsSurface3({...s,startU:q(-100n)},'1/2','1/2'),evaluateNurbsSurface3(s,'1/2','1/2'));
  assert.throws(()=>nurbsSurface3(1,1,[],K,K),RangeError);assert.throws(()=>nurbsSurface3(1,1,[points[0]!,[]],K,K),RangeError);assert.throws(()=>nurbsSurface3(0,1,points,K,K),RangeError);assert.throws(()=>nurbsSurface3(1,1,points,K,K,[[1n,1n],[1n,0n]]),RangeError);assert.throws(()=>nurbsSurface3(1,1,points,K,K,[[1n]]),RangeError);
  assert.throws(()=>evaluateNurbsSurface3(s,'-1/10',0n),RangeError);assert.throws(()=>evaluateNurbsSurface3(s,0n,'11/10'),RangeError);assert.throws(()=>evaluateNurbsSurface3(s,0n,0n,{uSide:'bad' as never}),RangeError);assert.throws(()=>nurbsSurfaceIsoCurve3(s,'bad' as never,'1/2'),RangeError);assert.throws(()=>insertNurbsSurfaceKnot3(s,'u',0n),RangeError);assert.throws(()=>splitNurbsSurface3(s,'v',1n),RangeError);
});
