import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,Polynomial,AlgebraicReal,point3,plane3,compareAlgebraicPoints3,nurbsCurve3,nurbsCurveSpans3,evaluateNurbsCurve3,derivativeNurbsCurve3,insertNurbsKnot3,splitNurbsCurve3,reverseNurbsCurve3,intersectNurbsPlane3} from '../dist/index.js';
import type {NurbsCurve3,NurbsSpan3} from '../dist/index.js';
const q=(n:bigint,d=1n)=>new Rational(n,d),zero=q(0n),one=q(1n),keys=['x','y','z','weight'] as const;
function same(a:ReturnType<typeof evaluateNurbsCurve3>,b:ReturnType<typeof evaluateNurbsCurve3>){assert.equal(compareAlgebraicPoints3(a,b),0);}
const circle=()=>nurbsCurve3(2,[point3(1n,0n,0n),point3(1n,1n,0n),point3(0n,1n,0n)],[0n,0n,0n,1n,1n,1n],[1n,1n,2n]);
/** Independent Cox basis recurrence, rather than the implementation's
 * control-polygon de Boor recurrence. Polynomials hold on a fixed open span.
 */
function basisOracle(curve:NurbsCurve3,span:NurbsSpan3):Polynomial[]{
  const U=curve.knots;let basis=U.slice(1).map((_,i)=>new Polynomial(i===span.index?[1n]:[]));
  for(let degree=1;degree<=curve.degree;degree++)basis=Array.from({length:basis.length-1},(_,i)=>{
    let value=new Polynomial();const A=U[i+degree]!.sub(U[i]!),B=U[i+degree+1]!.sub(U[i+1]!);
    if(A.sign()>0)value=value.add(basis[i]!.mul(new Polynomial([U[i]!.neg(),one])).scale(one.div(A)));
    if(B.sign()>0)value=value.add(basis[i+1]!.mul(new Polynomial([U[i+degree+1]!,one.neg()])).scale(one.div(B)));
    return value;
  });
  assert.ok(basis.reduce((a,b)=>a.add(b),new Polynomial()).equals(new Polynomial([1n])));
  return keys.map(key=>basis.reduce((sum,N,i)=>sum.add(N.scale(curve.weights[i]!.mul(key==='weight'?one:curve.controlPoints[i]![key]))),new Polynomial()));
}
function unchanged(original:NurbsCurve3,refined:NurbsCurve3){
  for(const s of nurbsCurveSpans3(refined)){
    const mid=s.startParameter.add(s.endParameter).div(q(2n)),prior=nurbsCurveSpans3(original).find(p=>mid.compare(p.startParameter)>0&&mid.compare(p.endParameter)<0)!;
    for(const key of keys)assert.ok(s[key].equals(prior[key]),`Homogeneous ${key} changed on ${s.index}`);
  }
}

test('homogeneous NURBS evaluates an exact rationally parameterized circle and its derivatives',()=>{
  const c=circle();
  for(let i=0n;i<=16n;i++){
    const t=q(i,16n),den=one.add(t.mul(t)),p=evaluateNurbsCurve3(c,t),d=derivativeNurbsCurve3(c,t);
    same(p,{x:AlgebraicReal.fromRational(one.sub(t.mul(t)).div(den)),y:AlgebraicReal.fromRational(t.mul(q(2n)).div(den)),z:AlgebraicReal.fromRational(0n)});
    assert.equal(d.x.compare(AlgebraicReal.fromRational(t.mul(q(-4n)).div(den.mul(den)))),0);
    assert.equal(d.y.compare(AlgebraicReal.fromRational(one.sub(t.mul(t)).mul(q(2n)).div(den.mul(den)))),0);
  }
  const t=AlgebraicReal.fromRational('1/2').sqrt(),p=evaluateNurbsCurve3(c,t);
  assert.equal(p.x.mul(p.x).add(p.y.mul(p.y)).compare(AlgebraicReal.fromRational(1n)),0);
  const inserted=insertNurbsKnot3(c,'1/3',3);unchanged(c,inserted);same(evaluateNurbsCurve3(c,t),evaluateNurbsCurve3(inserted,t));
});

test('all span coefficients match an independent Cox basis for degrees 1 through 6',()=>{
  for(let p=1;p<=6;p++)for(const clamped of [false,true]){
    const count=p+4,knots=clamped?[...Array(p+1).fill(0n),'1/5','2/5','4/5',...Array(p+1).fill(1n)]:Array.from({length:count+p+1},(_,i)=>q(BigInt(i-3),3n));
    const c=nurbsCurve3(p,Array.from({length:count},(_,i)=>point3(q(BigInt(i*i-2*i),7n),q(BigInt((i*7)%11-5),3n),q(BigInt(i%3),5n))),knots,Array.from({length:count},(_,i)=>q(BigInt(i%4+1),BigInt(i%3+1))));
    for(const s of nurbsCurveSpans3(c)){
      const expected=basisOracle(c,s);keys.forEach((key,i)=>assert.ok(s[key].equals(expected[i]!)));
      for(const t of [s.startParameter,s.startParameter.add(s.endParameter).div(q(2n)),s.endParameter])assert.equal(s.weight.evaluate(t).sign(),1);
    }
    const t=c.startParameter.mul(q(2n)).add(c.endParameter).div(q(3n)),refined=insertNurbsKnot3(c,t,p+1-c.knots.filter(k=>k.equals(t)).length);unchanged(c,refined);
    const split=splitNurbsCurve3(c,t);assert.equal(split.continuous,true);unchanged(c,split.left);unchanged(c,split.right);
    for(let j=0n;j<=8n;j++){
      const u=c.startParameter.add(c.endParameter.sub(c.startParameter).mul(q(j,8n))),piece=u.compare(t)<=0?split.left:split.right;
      same(evaluateNurbsCurve3(c,u),evaluateNurbsCurve3(piece,u));
    }
  }
});

test('C0 knots retain one-sided derivatives and splitting does not smooth a corner',()=>{
  const c=nurbsCurve3(2,[point3(0n,0n,0n),point3(1n,0n,0n),point3(1n,1n,0n),point3(2n,1n,0n),point3(2n,2n,0n)],[0n,0n,0n,1n,1n,2n,2n,2n]);
  same(evaluateNurbsCurve3(c,1n,'left'),evaluateNurbsCurve3(c,1n,'right'));
  assert.equal(derivativeNurbsCurve3(c,1n,'left').x.sign(),0);assert.equal(derivativeNurbsCurve3(c,1n,'left').y.rational!.toString(),'2');
  assert.equal(derivativeNurbsCurve3(c,1n,'right').x.rational!.toString(),'2');assert.equal(derivativeNurbsCurve3(c,1n,'right').y.sign(),0);
  const split=splitNurbsCurve3(c,1n);assert.equal(split.continuous,true);unchanged(c,split.left);unchanged(c,split.right);
});

test('repeated cubic knots and sub-floating parameter spans preserve symbolic shape at extreme scales',()=>{
  const scale=10n**40n,U=[...Array(4).fill(0n),...Array(4).fill('1/3'),'2/3','2/3',...Array(4).fill(1n)],c=nurbsCurve3(3,Array.from({length:10},(_,i)=>point3(scale+BigInt(i),q(BigInt(i*i),scale),BigInt(i%3))),U,Array.from({length:10},(_,i)=>BigInt(i%5+1)));
  for(const s of nurbsCurveSpans3(c)){const expected=basisOracle(c,s);keys.forEach((key,i)=>assert.ok(s[key].equals(expected[i]!)));}
  const jump=splitNurbsCurve3(c,'1/3');assert.equal(jump.continuous,false);unchanged(c,jump.left);unchanged(c,jump.right);
  const t=q(2n,3n).add(q(1n,scale)),refined=insertNurbsKnot3(c,t,4);unchanged(c,refined);same(evaluateNurbsCurve3(c,t),evaluateNurbsCurve3(refined,t));
});

test('full-multiplicity discontinuities preserve both closed branches, reversal and separate plane events',()=>{
  const c=nurbsCurve3(1,[point3(0n,0n,-1n),point3(1n,0n,0n),point3(10n,0n,0n),point3(11n,0n,1n)],[0n,0n,1n,1n,2n,2n]),reverse=reverseNurbsCurve3(c);
  assert.equal(evaluateNurbsCurve3(c,1n,'left').x.rational!.toString(),'1');assert.equal(evaluateNurbsCurve3(c,1n).x.rational!.toString(),'10');
  same(evaluateNurbsCurve3(c,1n,'left'),evaluateNurbsCurve3(reverse,1n,'right'));same(evaluateNurbsCurve3(c,1n,'right'),evaluateNurbsCurve3(reverse,1n,'left'));
  const split=splitNurbsCurve3(c,1n);assert.equal(split.continuous,false);same(evaluateNurbsCurve3(split.left,1n),evaluateNurbsCurve3(c,1n,'left'));same(evaluateNurbsCurve3(split.right,1n),evaluateNurbsCurve3(c,1n));
  const hit=intersectNurbsPlane3(c,plane3(0n,0n,1n));assert.equal(hit.points.length,2);assert.equal(hit.coincidentSpans.length,0);assert.deepEqual(hit.points.map(e=>e.point.x.rational!.toString()),['1','10']);assert.ok(hit.points.every(e=>e.parameter.compare(AlgebraicReal.fromRational(1n))===0&&e.branches.length===1));
});

function binomial(n:number,k:number):bigint {let result=1n;for(let i=1;i<=k;i++)result=result*BigInt(n-i+1)/BigInt(i);return result;}
function bernstein(poly:Polynomial,p:number):Rational[]{return Array.from({length:p+1},(_,i)=>{let sum=zero;for(let k=0;k<=i;k++)sum=sum.add(poly.coefficient(k).mul(q(binomial(i,k),binomial(p,k))));return sum;});}
test('plane intersections isolate all polynomial roots with exact multiplicity and parameter bounds',()=>{
  const F=new Polynomial([0n,1n]).mul(new Polynomial(['-1/4',1n])).mul(new Polynomial(['-1/4',1n])).mul(new Polynomial(['-1/2',0n,1n])).mul(new Polynomial([-1n,1n])),p=6,X=bernstein(new Polynomial([0n,1n]),p),Y=bernstein(new Polynomial([0n,0n,1n]),p),Z=bernstein(F,p),c=nurbsCurve3(p,X.map((x,i)=>point3(x,Y[i]!,Z[i]!)),[...Array(p+1).fill(0n),...Array(p+1).fill(1n)]);
  const hit=intersectNurbsPlane3(c,plane3(0n,0n,1n));assert.equal(hit.points.length,4);assert.equal(hit.coincidentSpans.length,0);
  const expected=[AlgebraicReal.fromRational(0n),AlgebraicReal.fromRational('1/4'),AlgebraicReal.fromRational('1/2').sqrt(),AlgebraicReal.fromRational(1n)];
  hit.points.forEach((e,i)=>{assert.equal(e.parameter.compare(expected[i]!),0);assert.equal(e.point.x.compare(e.parameter),0);assert.equal(e.point.y.compare(e.parameter.mul(e.parameter)),0);assert.equal(e.point.z.sign(),0);assert.equal(e.branches[0]!.multiplicity,i===1?2:1);});
});

test('circle tangency, endpoint hits, empty intersections and coincident spans are distinct',()=>{
  const c=circle(),tangent=intersectNurbsPlane3(c,plane3(3n,4n,0n,-5n));assert.equal(tangent.points.length,1);assert.equal(tangent.points[0]!.parameter.compare(AlgebraicReal.fromRational('1/2')),0);assert.equal(tangent.points[0]!.branches[0]!.multiplicity,2);
  const endpoint=intersectNurbsPlane3(c,plane3(1n,0n,0n));assert.equal(endpoint.points.length,1);assert.equal(endpoint.points[0]!.parameter.compare(AlgebraicReal.fromRational(1n)),0);
  assert.equal(intersectNurbsPlane3(c,plane3(1n,0n,0n,-2n)).points.length,0);
  const contained=intersectNurbsPlane3(c,plane3(0n,0n,1n));assert.equal(contained.points.length,0);assert.equal(contained.coincidentSpans.length,1);
  const refined=insertNurbsKnot3(c,'1/2',2),samePoint=intersectNurbsPlane3(refined,plane3(3n,4n,0n,-5n));assert.equal(samePoint.points.length,1);assert.equal(samePoint.points[0]!.branches.length,2);assert.ok(samePoint.points[0]!.branches.every(b=>b.multiplicity===2));
  const mixed=nurbsCurve3(1,[point3(-1n,0n,0n),point3(0n,0n,0n),point3(1n,0n,1n)],[0n,0n,1n,2n,2n]),hit=intersectNurbsPlane3(mixed,plane3(0n,0n,1n));assert.equal(hit.coincidentSpans.length,1);assert.equal(hit.points.length,1);
});

test('unclamped and nonuniform knot reversal preserves parameters and reverses derivatives',()=>{
  const c=nurbsCurve3(2,[point3(-1n,0n,0n),point3(0n,1n,0n),point3(2n,2n,1n),point3(4n,0n,0n)],[ -3n,-1n,0n,'1/3',2n,3n,5n],[1n,2n,3n,1n]),reverse=reverseNurbsCurve3(c),sum=c.startParameter.add(c.endParameter);
  for(let i=0n;i<=16n;i++){
    const t=c.startParameter.add(c.endParameter.sub(c.startParameter).mul(q(i,16n))),u=sum.sub(t);same(evaluateNurbsCurve3(c,t),evaluateNurbsCurve3(reverse,u));const a=derivativeNurbsCurve3(c,t),b=derivativeNurbsCurve3(reverse,u);for(const k of ['x','y','z'] as const)assert.equal(a[k].add(b[k]).sign(),0);
  }
});

test('snapshots ignore forged cached metadata and validate malformed NURBS data',()=>{
  const points=[point3(0n,0n,0n),point3(1n,1n,0n)],knots=[0n,0n,1n,1n],weights=[1n,2n],c=nurbsCurve3(1,points,knots,weights);points[0]=point3(99n,99n,99n);knots[0]=-99n;weights[0]=99n;
  assert.equal(evaluateNurbsCurve3(c,0n).x.sign(),0);assert.ok(Object.isFrozen(c)&&Object.isFrozen(c.weights)&&Object.isFrozen(c.knots)&&Object.isFrozen(nurbsCurveSpans3(c)[0]));
  same(evaluateNurbsCurve3({...c,startParameter:q(-100n),endParameter:q(100n)},'1/2'),evaluateNurbsCurve3(c,'1/2'));
  for(const degree of [0,-1,1.5,NaN])assert.throws(()=>nurbsCurve3(degree,points,knots),RangeError);
  assert.throws(()=>nurbsCurve3(1,points,[0n,1n,0n,1n]),RangeError);assert.throws(()=>nurbsCurve3(1,points,[0n,0n,0n,1n]),RangeError);
  assert.throws(()=>nurbsCurve3(1,points,[0n,0n,1n,1n],[0n,1n]),RangeError);assert.throws(()=>nurbsCurve3(1,points,[0n,0n,1n,1n],[]),RangeError);
  assert.throws(()=>nurbsCurve3(1,points,[0n,0n,1n,1n],Array(2)),TypeError);
  assert.throws(()=>evaluateNurbsCurve3(c,'-1/100'),RangeError);assert.throws(()=>evaluateNurbsCurve3(c,'101/100'),RangeError);assert.throws(()=>evaluateNurbsCurve3(c,0n,'bad' as never),RangeError);
  assert.throws(()=>insertNurbsKnot3(c,0n),RangeError);assert.throws(()=>insertNurbsKnot3(c,'1/2',3),RangeError);assert.throws(()=>insertNurbsKnot3(c,'1/2',1.5),RangeError);assert.throws(()=>splitNurbsCurve3(c,1n),RangeError);
});
