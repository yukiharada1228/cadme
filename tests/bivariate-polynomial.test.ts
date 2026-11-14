import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,Polynomial,BivariatePolynomial,AlgebraicReal} from '../dist/index.js';
const q=(x:bigint,d=1n)=>new Rational(x,d);
test('bivariate normalization, arithmetic, derivatives and specialization match coefficient sums',()=>{
  const A=new BivariatePolynomial([[1n,2n,3n],[-2n,0n,4n],[5n]]),B=new BivariatePolynomial([[0n,1n],[3n,-2n]]),M=A.mul(B);
  assert.ok(Object.isFrozen(A)&&Object.isFrozen(A.rows)&&Object.isFrozen(A.rows[0]));assert.equal(new BivariatePolynomial([[0n],[]]).degreeU,-1);assert.equal(new BivariatePolynomial().degreeV,-1);
  for(let i=0;i<=3;i++)for(let j=0;j<=3;j++){let expected=q(0n);for(let a=0;a<=i;a++)for(let b=0;b<=j;b++)expected=expected.add(A.coefficient(a,b).mul(B.coefficient(i-a,j-b)));assert.equal(M.coefficient(i,j).compare(expected),0);}
  const sum=(u:Rational,v:Rational,du:boolean,dv:boolean)=>{let value=q(0n);for(let i=du?1:0;i<=A.degreeU;i++)for(let j=dv?1:0;j<=A.degreeV;j++){let term=A.coefficient(i,j);if(du)term=term.mul(q(BigInt(i)));if(dv)term=term.mul(q(BigInt(j)));for(let k=0;k<i-(du?1:0);k++)term=term.mul(u);for(let k=0;k<j-(dv?1:0);k++)term=term.mul(v);value=value.add(term);}return value;};
  for(let i=-3n;i<=3n;i++)for(let j=-3n;j<=3n;j++){
    const u=q(i,3n),v=q(j,2n);assert.equal(A.evaluate(u,v).compare(sum(u,v,false,false)),0);assert.equal(M.evaluate(u,v).compare(A.evaluate(u,v).mul(B.evaluate(u,v))),0);
    assert.equal(A.derivativeU().evaluate(u,v).compare(sum(u,v,true,false)),0);assert.equal(A.derivativeV().evaluate(u,v).compare(sum(u,v,false,true)),0);
    assert.equal(A.transpose().evaluate(v,u).compare(A.evaluate(u,v)),0);assert.equal(A.specializeV(v).evaluate(u).compare(A.evaluate(u,v)),0);assert.equal(A.diagonal().evaluate(u).compare(A.evaluate(u,u)),0);
  }
  assert.ok(A.add(B).sub(B).equals(A));assert.ok(A.mul(new BivariatePolynomial()).equals(new BivariatePolynomial()));assert.ok(A.derivativeU().derivativeV().equals(A.derivativeV().derivativeU()));
  assert.throws(()=>A.coefficient(-1,0),RangeError);assert.throws(()=>A.row(0.5),RangeError);assert.throws(()=>new BivariatePolynomial([Array(2)]),TypeError);
});
test('algebraic evaluation preserves diagonal dependence and unrelated quadratic parameters',()=>{
  const u=AlgebraicReal.fromRational(2n).sqrt(),v=AlgebraicReal.fromRational(3n).sqrt(),squares=new BivariatePolynomial([[0n,0n,1n],[],[1n]]);
  assert.equal(squares.evaluateAlgebraic(u,v).compare(AlgebraicReal.fromRational(5n)),0);assert.equal(squares.evaluateAlgebraic(u,u.refine()).compare(AlgebraicReal.fromRational(4n)),0);
  const N=new BivariatePolynomial([[0n,-1n],[1n]]),D=new BivariatePolynomial([[0n,1n],[1n]]),image=N.rationalImage(u,v,D),expected=AlgebraicReal.fromRational(6n).sqrt().affine(2n,-5n);assert.equal(image.compare(expected),0);
  assert.throws(()=>N.rationalImage(u,u,N),RangeError);
  const rational=AlgebraicReal.fromRational('1/2');assert.equal(squares.evaluateAlgebraic(rational,v).compare(AlgebraicReal.fromRational('13/4')),0);
  assert.equal(squares.rationalImage(u,rational,new BivariatePolynomial([[1n]])).compare(AlgebraicReal.fromRational('9/4')),0);
  assert.ok(squares.specializeU(0n).equals(new Polynomial([0n,0n,1n])));
});
