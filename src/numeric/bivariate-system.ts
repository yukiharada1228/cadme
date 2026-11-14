import {Rational} from './rational.js';
import {Polynomial} from './polynomial.js';
import {BivariatePolynomial} from './bivariate-polynomial.js';
import {AlgebraicReal,isolateRealRoots} from './real-roots.js';
import {resultantInParameter} from './resultant.js';

const zero=new Polynomial();
export interface BivariateRoot {readonly u:AlgebraicReal;readonly v:AlgebraicReal;}
export interface BivariateSystemSolutions {
  /** Shared means a nonconstant common factor, not necessarily a real curve. */
  readonly kind:'finite'|'shared'|'all';
  /** All real zeros of this polynomial belong to the solution set. Unit=none;
   * zero=all of R². Repeated factors are retained from the polynomial gcd.
   */
  readonly commonFactor:BivariatePolynomial;
  /** Distinct isolated solutions outside the shared zero locus. */
  readonly points:readonly BivariateRoot[];
}
function normalize(f:BivariatePolynomial):BivariatePolynomial {
  if(f.degreeU<0)return f;const row=f.rows[f.degreeU]!;return f.scale(new Rational(1n).div(row.coefficients[row.degree]!));
}
function monomial(u:number,v:number,c:Rational):BivariatePolynomial {return new BivariatePolynomial([...Array.from({length:u},()=>[]),[...Array.from({length:v},()=>0n),c]]);}
/** Exact division in Q[u,v], with lexicographic leading monomials (u,v). */
export function divideBivariateExact(dividend:BivariatePolynomial,divisor:BivariatePolynomial):BivariatePolynomial {
  if(divisor.degreeU<0)throw new RangeError('Bivariate polynomial division by zero');
  const a=divisor.degreeU,b=divisor.rows[a]!.degree,lc=divisor.coefficient(a,b);let remainder=dividend,quotient=new BivariatePolynomial();
  while(remainder.degreeU>=0){
    const i=remainder.degreeU,j=remainder.rows[i]!.degree;
    if(i<a||j<b)throw new RangeError('Bivariate polynomial division is not exact');
    const term=monomial(i-a,j-b,remainder.coefficient(i,j).div(lc));quotient=quotient.add(term);remainder=remainder.sub(divisor.mul(term));
  }
  return quotient;
}
const coefficientsV=(f:BivariatePolynomial)=>[...f.transpose().rows];
const fromV=(rows:readonly Polynomial[])=>new BivariatePolynomial(rows.map(p=>p.coefficients)).transpose();
function trim(rows:Polynomial[]):Polynomial[]{while(rows.length&&rows[rows.length-1]!.degree<0)rows.pop();return rows;}
function content(rows:readonly Polynomial[]):Polynomial{return rows.reduce((c,p)=>c.gcd(p),zero);}
function primitive(rows:readonly Polynomial[]):Polynomial[]{
  const c=content(rows);if(c.degree<0)return [];
  return trim(rows.map(p=>{const d=p.divRem(c);if(d.remainder.degree>=0)throw new Error('Nonexact content division');return d.quotient;}));
}
/** Primitive pseudo-remainder in Q[u][v]; v degree decreases strictly. */
function pseudoRemainder(a:readonly Polynomial[],b:readonly Polynomial[]):Polynomial[]{
  let r=[...a];const n=b.length-1,lc=b[n]!;
  while(r.length>=b.length){const shift=r.length-b.length,lead=r[r.length-1]!;r=r.map(p=>p.mul(lc));b.forEach((p,i)=>{r[i+shift]=r[i+shift]!.sub(p.mul(lead));});trim(r);}
  return r;
}
/** Primitive PRS over Q[u], restoring coefficient content by Gauss's lemma.
 * The result's lexicographic leading rational coefficient is one.
 */
export function gcdBivariate(first:BivariatePolynomial,second:BivariatePolynomial):BivariatePolynomial {
  if(first.degreeU<0)return normalize(second);if(second.degreeU<0)return normalize(first);
  const A=coefficientsV(first),B=coefficientsV(second),c=content(A).gcd(content(B));let a=primitive(A),b=primitive(B);
  while(b.length){const r=primitive(pseudoRemainder(a,b));a=b;b=r;}
  return normalize(fromV(a.map(p=>p.mul(c))));
}
/** Eliminate the named variable by an exact fraction-free Sylvester determinant. */
export function resultantBivariate(first:BivariatePolynomial,second:BivariatePolynomial,eliminate:'u'|'v'='v'):Polynomial {
  if(eliminate!=='u'&&eliminate!=='v')throw new RangeError('Elimination variable must be u or v');
  return eliminate==='v'?resultantInParameter(coefficientsV(first),coefficientsV(second)):resultantInParameter(first.rows,second.rows);
}
function specializedDegree(coefficients:readonly Polynomial[],u:AlgebraicReal):number {
  for(let i=coefficients.length-1;i>=0;i--)if(u.signOf(coefficients[i]!)!==0)return i;return -1;
}
function fiberCandidates(f:BivariatePolynomial,u:AlgebraicReal):readonly AlgebraicReal[] {
  if(u.rational!==null)return isolateRealRoots(f.specializeU(u.rational));
  // Root certificates need not be minimal. Remove conjugate factors at which
  // every coefficient of f vanishes, or the norm would be identically zero.
  const bad=u.polynomial.gcd(content(coefficientsV(f))),division=u.polynomial.divRem(bad);
  if(division.remainder.degree>=0)throw new Error('Nonexact fiber-certificate division');
  const p=division.quotient,norm=resultantInParameter(p.coefficients.map(c=>new Polynomial([c])),f.rows);
  if(norm.degree<0)throw new Error('A nonzero fiber must have a nonzero norm polynomial');
  return isolateRealRoots(norm);
}
/** Solve two rational bivariate equations over all real coordinates. Shared
 * zero loci are retained implicitly; isolated residual points are exact.
 */
export function solveBivariateSystem(first:BivariatePolynomial,second:BivariatePolynomial):BivariateSystemSolutions {
  const commonFactor=gcdBivariate(first,second);
  if(commonFactor.degreeU<0)return Object.freeze({kind:'all',commonFactor,points:Object.freeze([])});
  const kind=commonFactor.degreeU>0||commonFactor.degreeV>0?'shared' as const:'finite' as const,F=divideBivariateExact(first,commonFactor),G=divideBivariateExact(second,commonFactor),points:BivariateRoot[]=[];
  if(F.degreeU===0&&F.degreeV===0||G.degreeU===0&&G.degreeV===0)return Object.freeze({kind,commonFactor,points:Object.freeze(points)});
  const projection=resultantBivariate(F,G),A=coefficientsV(F),B=coefficientsV(G);
  if(projection.degree<0)throw new Error('Coprime residual equations cannot have a zero resultant');
  for(const u of isolateRealRoots(projection)){
    const a=specializedDegree(A,u),b=specializedDegree(B,u);if(a===0||b===0)continue;
    if(a<0&&b<0)throw new Error('Coprime residual equations cannot share a vertical fiber');
    const f=a<0?G:b<0?F:a<=b?F:G;
    for(const v of fiberCandidates(f,u)){
      if(F.evaluateAlgebraic(u,v).sign()!==0||G.evaluateAlgebraic(u,v).sign()!==0)continue;
      if(kind==='shared'&&commonFactor.evaluateAlgebraic(u,v).sign()===0)continue;
      if(!points.some(p=>p.u.compare(u)===0&&p.v.compare(v)===0))points.push(Object.freeze({u,v}));
    }
  }
  points.sort((a,b)=>a.u.compare(b.u)||a.v.compare(b.v));return Object.freeze({kind,commonFactor,points:Object.freeze(points)});
}
