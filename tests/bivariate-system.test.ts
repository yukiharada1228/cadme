import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,Polynomial,BivariatePolynomial,AlgebraicReal,divideBivariateExact,gcdBivariate,resultantBivariate,solveBivariateSystem} from '../dist/index.js';
const q=(n:bigint,d=1n)=>new Rational(n,d),U=new BivariatePolynomial([[],[1n]]),V=new BivariatePolynomial([[0n,1n]]),one=new BivariatePolynomial([[1n]]),zero=new BivariatePolynomial(),real=(n:bigint|string)=>AlgebraicReal.fromRational(n);
function certified(F:BivariatePolynomial,G:BivariatePolynomial){const result=solveBivariateSystem(F,G);assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.points));for(const p of result.points){assert.ok(Object.isFrozen(p));assert.equal(F.evaluateAlgebraic(p.u,p.v).sign(),0);assert.equal(G.evaluateAlgebraic(p.u,p.v).sign(),0);assert.notEqual(result.commonFactor.evaluateAlgebraic(p.u,p.v).sign(),0);}return result;}
function det(input:Rational[][]):Rational {const a=input.map(row=>[...row]);let result=q(1n);for(let k=0;k<a.length;k++){let r=k;while(r<a.length&&a[r]![k]!.sign()===0)r++;if(r===a.length)return q(0n);if(r!==k){[a[r],a[k]]=[a[k]!,a[r]!];result=result.neg();}const pivot=a[k]![k]!;result=result.mul(pivot);for(let i=k+1;i<a.length;i++){const factor=a[i]![k]!.div(pivot);for(let j=k+1;j<a.length;j++)a[i]![j]=a[i]![j]!.sub(factor.mul(a[k]![j]!));}}return result;}
test('bivariate exact division and primitive PRS recover known common factors including vertical content',()=>{
  const A=U.add(V.scale(2n)).add(one),B=U.scale(2n).sub(V).add(one.scale(3n)),factors=[U,V,U.add(V),U.mul(V).add(one),U.mul(U).add(V.mul(V)).add(one)];
  for(const C of factors){
    const F=C.mul(A),G=C.mul(B);assert.ok(divideBivariateExact(F,C).equals(A));assert.ok(gcdBivariate(F.scale('-3/7'),G.scale('5/9')).equals(C));assert.ok(gcdBivariate(G,F).equals(C));
    const C2=C.mul(C);assert.ok(gcdBivariate(C2.mul(A),C2.mul(C).mul(B)).equals(C2));assert.ok(divideBivariateExact(C2.mul(C).mul(B),C2).equals(C.mul(B)));
  }
  assert.ok(gcdBivariate(zero,U.scale(-3n)).equals(U));assert.ok(gcdBivariate(zero,zero).equals(zero));assert.ok(gcdBivariate(U,V).equals(one));assert.ok(divideBivariateExact(zero,U).equals(zero));assert.throws(()=>divideBivariateExact(U,V),RangeError);assert.throws(()=>divideBivariateExact(U,zero),RangeError);
});
test('resultant coefficients specialize to an independent rational Sylvester determinant',()=>{
  const F=new BivariatePolynomial([[1n,2n,1n],[3n,-1n],[1n]]),G=new BivariatePolynomial([[2n,-1n,1n],[0n,2n],[1n]]);
  for(const axis of ['u','v'] as const){const P=axis==='v'?F.transpose().rows:F.rows,Q=axis==='v'?G.transpose().rows:G.rows,m=P.length-1,n=Q.length-1,R=resultantBivariate(F,G,axis);
    for(let k=-5n;k<=5n;k++){
      const t=q(k,3n),matrix=Array.from({length:m+n},()=>Array.from({length:m+n},()=>q(0n)));
      for(let i=0;i<n;i++)for(let j=0;j<=m;j++)matrix[i]![i+j]=P[m-j]!.evaluate(t);
      for(let i=0;i<m;i++)for(let j=0;j<=n;j++)matrix[n+i]![i+j]=Q[n-j]!.evaluate(t);
      assert.equal(R.evaluate(t).compare(det(matrix)),0);
    }
  }
  assert.ok(resultantBivariate(U.add(V),U.sub(V)).equals(new Polynomial([0n,2n])));assert.ok(resultantBivariate(U.sub(V),U.add(V)).equals(new Polynomial([0n,-2n])));
  assert.ok(resultantBivariate(V.mul(V).add(U),U).equals(new Polynomial([0n,0n,1n])));assert.equal(resultantBivariate(one,one).coefficient(0).toString(),'1');assert.equal(resultantBivariate(zero,one).degree,-1);assert.throws(()=>resultantBivariate(U,V,'bad' as never),RangeError);
});
test('circle intersections include two algebraic points, tangent points and empty real fibers',()=>{
  const F=U.mul(U).add(V.mul(V)).sub(one),G=U.sub(one).mul(U.sub(one)).add(V.mul(V)).sub(one),result=certified(F,G);assert.equal(result.kind,'finite');assert.equal(result.points.length,2);
  result.points.forEach((p,i)=>{assert.equal(p.u.compare(real('1/2')),0);const y=real('3/4').sqrt();assert.equal(p.v.compare(i===0?y.neg():y),0);});
  const tangent=certified(F,U.sub(one.scale(2n)).mul(U.sub(one.scale(2n))).add(V.mul(V)).sub(one));assert.equal(tangent.points.length,1);assert.equal(tangent.points[0]!.u.compare(real(1n)),0);assert.equal(tangent.points[0]!.v.sign(),0);
  assert.equal(certified(F,U.mul(U).add(V.mul(V)).add(one)).points.length,0);
});
test('independent algebraic coordinates and multiple roots enumerate distinct Cartesian solutions',()=>{
  const F=U.mul(U).sub(one.scale(2n)),G=V.mul(V).sub(one.scale(3n)),result=certified(F.mul(F),G.mul(G));assert.equal(result.points.length,4);
  for(const p of result.points){assert.equal(p.u.mul(p.u).compare(real(2n)),0);assert.equal(p.v.mul(p.v).compare(real(3n)),0);}
  const f=U.add(one).mul(U.sub(one.scale('1/3'))).mul(U.sub(one.scale(2n))),g=V.add(one.scale(2n)).mul(V.sub(one.scale('1/2'))),grid=certified(f,g);assert.equal(grid.points.length,6);
  for(const x of ['-1','1/3','2'])for(const y of ['-2','1/2'])assert.ok(grid.points.some(p=>p.u.compare(real(x))===0&&p.v.compare(real(y))===0));
});
test('nonminimal projection certificates remove zero conjugate fibers before norm lifting',()=>{
  const F=U.add(one).mul(V),G=U.mul(U).sub(one.scale(2n)).add(V),result=certified(F,G);assert.equal(result.points.length,3);
  assert.ok(result.points.some(p=>p.u.compare(real(-1n))===0&&p.v.compare(real(1n))===0));
  for(const root of [real(2n).sqrt().neg(),real(2n).sqrt()]){const p=result.points.find(p=>p.u.compare(root)===0)!;assert.ok(p);assert.equal(p.v.sign(),0);assert.equal(p.u.polynomial.degree,3);}
});
test('quartic projections preserve nonlinear coordinate dependence and reject conjugate pairings',()=>{
  const F=V.sub(U.mul(U)),G=U.mul(U).add(V.mul(V)).sub(one),result=certified(F,G),y=real(5n).sqrt().affine('1/2','-1/2'),x=y.sqrt();assert.equal(result.points.length,2);
  result.points.forEach((p,i)=>{assert.equal(p.u.compare(i===0?x.neg():x),0);assert.equal(p.v.compare(y),0);});
  const circle=U.mul(U).add(V.mul(V)).sub(one),hyperbola=U.mul(V).sub(one.scale('1/4')),mixed=certified(circle,hyperbola);assert.equal(mixed.points.length,4);for(const p of mixed.points)assert.equal(p.u.mul(p.v).compare(real('1/4')),0);
});
test('degree-drop projection roots are filtered and a single zero equation on a fiber is retained',()=>{
  assert.equal(certified(U.mul(V).add(one),U.mul(V).add(one.scale(2n))).points.length,0);
  const vertical=certified(U,U.mul(V).add(V.mul(V)).sub(one));assert.equal(vertical.points.length,2);assert.ok(vertical.points.every(p=>p.u.sign()===0&&p.v.mul(p.v).compare(real(1n))===0));
  assert.equal(certified(U,U.mul(U).add(one)).points.length,0);
});
test('shared factors retain their exact locus and residual points on that locus are not duplicated',()=>{
  const result=certified(V.mul(U.sub(one)),V.mul(V.sub(one)));assert.equal(result.kind,'shared');assert.ok(result.commonFactor.equals(V));assert.equal(result.points.length,1);assert.equal(result.points[0]!.u.compare(real(1n)),0);assert.equal(result.points[0]!.v.compare(real(1n)),0);
  const covered=certified(V.mul(U),V.mul(U.add(V)));assert.equal(covered.kind,'shared');assert.equal(covered.points.length,0);
  const positive=U.mul(U).add(V.mul(V)).add(one),emptyShared=certified(positive.mul(U),positive.mul(V));assert.equal(emptyShared.kind,'shared');assert.ok(emptyShared.commonFactor.equals(positive));assert.equal(emptyShared.points.length,1);
  const isolatedShared=certified(U.mul(U).add(V.mul(V)),U.mul(U).add(V.mul(V)).mul(U.mul(U).add(V.mul(V))));assert.equal(isolatedShared.kind,'shared');assert.equal(isolatedShared.points.length,0);assert.equal(isolatedShared.commonFactor.evaluate(0n,0n).sign(),0);
});
test('zero and constant equations preserve empty, shared and whole-plane solution sets',()=>{
  assert.equal(solveBivariateSystem(zero,zero).kind,'all');assert.equal(solveBivariateSystem(zero,one).kind,'finite');assert.equal(solveBivariateSystem(zero,one).points.length,0);
  const shared=solveBivariateSystem(zero,U.mul(U).sub(one.scale(2n)));assert.equal(shared.kind,'shared');assert.ok(shared.commonFactor.equals(U.mul(U).sub(one.scale(2n))));assert.equal(shared.points.length,0);
  const same=solveBivariateSystem(U.add(V),U.add(V).scale(-7n));assert.equal(same.kind,'shared');assert.ok(same.commonFactor.equals(U.add(V)));assert.equal(same.points.length,0);
});
