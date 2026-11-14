import { Rational } from './rational.js';
import type { Sign } from './rational.js';
import type { ExactInput } from '../geometry/point2.js';
import { Polynomial, exactRational } from './polynomial.js';
import {sumElimination,productElimination,resultantInParameter} from './resultant.js';

/** Sturm sequence of the monic square-free part. Zero has infinitely many roots. */
export function sturmSequence(input:Polynomial):readonly Polynomial[] {
  if(input.degree<0)throw new RangeError('The zero polynomial has infinitely many roots');
  const p=input.squareFree(),sequence=[p];
  if(p.degree===0)return Object.freeze(sequence);
  sequence.push(p.derivative());
  while(true){
    const remainder=sequence[sequence.length-2]!.divRem(sequence[sequence.length-1]!).remainder;
    if(remainder.degree<0)break;
    sequence.push(remainder.neg());
  }
  return Object.freeze(sequence);
}
function variations(sequence:readonly Polynomial[],point:Rational):number {
  let previous:Sign=0,count=0;
  for(const p of sequence){const sign=p.evaluate(point).sign();if(sign===0)continue;if(previous!==0&&sign!==previous)count++;previous=sign;}
  return count;
}
function countOpen(sequence:readonly Polynomial[],lo:Rational,hi:Rational):number {
  // V(a)-V(b) includes a root at b and excludes one at a. Remove the b endpoint.
  return variations(sequence,lo)-variations(sequence,hi)-(sequence[0]!.evaluate(hi).sign()===0?1:0);
}
/** Number of distinct real roots in the strict open interval (lower, upper).
 * Repeated roots count once; roots equal to either bound are excluded.
 */
export function countRealRoots(input:Polynomial,lower:ExactInput,upper:ExactInput):number {
  const lo=exactRational(lower),hi=exactRational(upper);
  if(lo.compare(hi)>=0)throw new RangeError('Root-count bounds must be strictly increasing');
  return countOpen(sturmSequence(input),lo,hi);
}
function rootBound(p:Polynomial):Rational {
  let max=0n;
  for(let i=0;i<p.degree;i++){
    const ratio=p.coefficients[i]!.div(p.coefficients[p.degree]!);
    const numerator=ratio.numerator<0n?-ratio.numerator:ratio.numerator;
    const ceiling=(numerator+ratio.denominator-1n)/ratio.denominator;
    if(ceiling>max)max=ceiling;
  }
  return new Rational(max+1n);
}
function intervalValue(p:Polynomial,lo:Rational,hi:Rational):readonly [Rational,Rational] {
  let lower=new Rational(0n),upper=lower;
  for(let i=p.degree;i>=0;i--){
    const products=[lower.mul(lo),lower.mul(hi),upper.mul(lo),upper.mul(hi)].sort((a,b)=>a.compare(b));
    lower=products[0]!.add(p.coefficients[i]!);upper=products[3]!.add(p.coefficients[i]!);
  }
  return [lower,upper];
}

/** Integer Newton iteration from an upper power-of-two bound. The caller
 * checks the square exactly before accepting a rational square root.
 */
function integerSquareRoot(n:bigint):bigint {
  if(n<2n)return n;
  let root=1n<<((BigInt(n.toString(2).length)+1n)/2n);
  while(true){const next=(root+n/root)/2n;if(next>=root)return root;root=next;}
}

/** An exact real algebraic number, specified by a square-free polynomial and its
 * unique real root in a rational open interval, or by an exact rational point.
 * Refinement never mutates existing certificates. No floating-point approximation
 * is used. Arithmetic uses exact polynomial elimination and interval branch selection.
 */
export class AlgebraicReal {
  private constructor(readonly polynomial:Polynomial,readonly lower:Rational,readonly upper:Rational){Object.freeze(this);}
  /** Null means not yet represented as a rational point, not a proof of irrationality. */
  get rational():Rational|null{return this.lower.equals(this.upper)?this.lower:null;}
  static fromRational(input:ExactInput):AlgebraicReal {
    const value=exactRational(input);
    return new AlgebraicReal(new Polynomial([value.neg(),1n]),value,value);
  }
  static isolate(input:Polynomial):readonly AlgebraicReal[] {
    const sequence=sturmSequence(input),p=sequence[0]!;
    if(p.degree===0)return Object.freeze([]);
    if(p.degree===1){const x=p.coefficients[0]!.neg().div(p.coefficients[1]!);return Object.freeze([new AlgebraicReal(p,x,x)]);}
    const bound=rootBound(p),pending=[{lo:bound.neg(),hi:bound,count:countOpen(sequence,bound.neg(),bound)}];
    const result:AlgebraicReal[]=[];
    while(pending.length){
      let {lo,hi,count}=pending.pop()!;
      if(count===0)continue;
      if(count===1){
        // Adjacent isolated roots may initially be interval endpoints. Remove those
        // endpoints before constructing a sign-changing root certificate.
        let exact:Rational|null=null;
        while(p.evaluate(lo).sign()===0||p.evaluate(hi).sign()===0){
          const mid=lo.add(hi).div(new Rational(2n));
          if(p.evaluate(mid).sign()===0){exact=mid;break;}
          if(countOpen(sequence,lo,mid)===1)hi=mid;else lo=mid;
        }
        result.push(exact?new AlgebraicReal(p,exact,exact):new AlgebraicReal(p,lo,hi));
        continue;
      }
      const mid=lo.add(hi).div(new Rational(2n)),atMid=p.evaluate(mid).sign()===0;
      if(atMid)result.push(new AlgebraicReal(p,mid,mid));
      const left=countOpen(sequence,lo,mid),right=countOpen(sequence,mid,hi);
      pending.push({lo,hi:mid,count:left},{lo:mid,hi,count:right});
    }
    result.sort((a,b)=>a.lower.compare(b.lower));
    return Object.freeze(result);
  }
  refine():AlgebraicReal {
    if(this.rational!==null)return this;
    const mid=this.lower.add(this.upper).div(new Rational(2n)),value=this.polynomial.evaluate(mid).sign();
    if(value===0)return new AlgebraicReal(this.polynomial,mid,mid);
    return value===this.polynomial.evaluate(this.lower).sign()?
      new AlgebraicReal(this.polynomial,mid,this.upper):new AlgebraicReal(this.polynomial,this.lower,mid);
  }
  /** Recover an exact rational root, even from a nonminimal certificate.
   * Acceptance checks the polynomial and isolating interval; otherwise an
   * equivalent refined root is returned. No numeric tolerance is used.
   */
  recognizeRational():AlgebraicReal {
    if(this.rational!==null)return this;
    const gcd=(inputA:bigint,inputB:bigint)=>{let a=inputA,b=inputB;while(b!==0n)[a,b]=[b,a%b];return a;};
    let commonDenominator=1n;for(const c of this.polynomial.coefficients)commonDenominator=commonDenominator/gcd(commonDenominator,c.denominator)*c.denominator;
    const leading=this.polynomial.coefficients[this.polynomial.degree]!,integerLeading=leading.numerator*(commonDenominator/leading.denominator),bound=integerLeading<0n?-integerLeading:integerLeading,threshold=new Rational(1n,2n*bound*bound);
    let root:AlgebraicReal=this;while(root.upper.sub(root.lower).compare(threshold)>=0)root=root.refine();if(root.rational!==null)return root;
    const midpoint=root.lower.add(root.upper).div(new Rational(2n));let n=midpoint.numerator,d=midpoint.denominator,p0=0n,p1=1n,q0=1n,q1=0n;
    while(d!==0n){
      let a=n/d;if(n<0n&&n%d!==0n)a--;const r=n-a*d,p=a*p1+p0,q=a*q1+q0;if(q>bound)break;
      const candidate=new Rational(p,q);
      if(candidate.compare(root.lower)>0&&candidate.compare(root.upper)<0&&root.polynomial.evaluate(candidate).sign()===0)return AlgebraicReal.fromRational(candidate);
      [p0,p1,q0,q1]=[p1,p,q1,q];[n,d]=[d,r];
    }
    return root;
  }
  /** Exact rational affine image scale*this + offset, including zero/negative scale. */
  affine(scaleInput:ExactInput,offsetInput:ExactInput=0n):AlgebraicReal {
    const scale=exactRational(scaleInput),offset=exactRational(offsetInput);
    if(scale.sign()===0)return AlgebraicReal.fromRational(offset);
    const map=(x:Rational)=>scale.mul(x).add(offset);
    if(this.rational!==null)return AlgebraicReal.fromRational(map(this.rational));
    const substitute=new Polynomial([offset.neg().div(scale),new Rational(1n).div(scale)]);
    let polynomial=new Polynomial();
    for(let i=this.polynomial.degree;i>=0;i--)polynomial=polynomial.mul(substitute).add(new Polynomial([this.polynomial.coefficients[i]!]));
    const a=map(this.lower),b=map(this.upper);
    return scale.sign()>0?new AlgebraicReal(polynomial.monic(),a,b):new AlgebraicReal(polynomial.monic(),b,a);
  }
  sign():Sign{return this.signOf(new Polynomial([0n,1n]));}
  equals(other:AlgebraicReal):boolean{return this.compare(other)===0;}
  neg():AlgebraicReal{return this.affine(-1n);}
  add(other:AlgebraicReal):AlgebraicReal {
    if(this===other)return this.affine(2n);
    if(this.polynomial.equals(other.polynomial)){
      if(this.compare(other)===0)return this.affine(2n);
      if(this.polynomial.degree===2)return AlgebraicReal.fromRational(this.polynomial.coefficient(1).neg().div(this.polynomial.coefficient(2)));
    }
    return this.combine(other,'sum');
  }
  sub(other:AlgebraicReal):AlgebraicReal {
    return this===other||this.polynomial.equals(other.polynomial)&&this.compare(other)===0?AlgebraicReal.fromRational(0n):this.add(other.neg());
  }
  mul(other:AlgebraicReal):AlgebraicReal {
    if(this===other)return this.rationalFunction(new Polynomial([0n,0n,1n]));
    if(this.polynomial.equals(other.polynomial)){
      if(this.compare(other)===0)return this.rationalFunction(new Polynomial([0n,0n,1n]));
      if(this.polynomial.degree===2)return AlgebraicReal.fromRational(this.polynomial.coefficient(0).div(this.polynomial.coefficient(2)));
    }
    return this.combine(other,'product');
  }
  div(other:AlgebraicReal):AlgebraicReal{return this.mul(other.reciprocal());}
  /** Principal nonnegative square root, selected exactly among conjugate roots. */
  sqrt():AlgebraicReal {
    const sign=this.sign();
    if(sign<0)throw new RangeError('Real algebraic square root of a negative value');
    if(sign===0)return AlgebraicReal.fromRational(0n);
    if(this.rational!==null){
      const q=this.rational,n=integerSquareRoot(q.numerator),d=integerSquareRoot(q.denominator);
      if(n*n===q.numerator&&d*d===q.denominator)return AlgebraicReal.fromRational(new Rational(n,d));
      return AlgebraicReal.isolate(new Polynomial([q.neg(),0n,1n]))[1]!;
    }
    const coefficients:Rational[]=Array.from({length:2*this.polynomial.degree+1},()=>new Rational(0n));
    this.polynomial.coefficients.forEach((c,i)=>{coefficients[2*i]=c;});
    let candidates=[...AlgebraicReal.isolate(new Polynomial(coefficients))].filter(c=>c.sign()>0),source:AlgebraicReal=this;
    while(true){
      candidates=candidates.filter(c=>{
        const lo=c.lower.sign()<0?new Rational(0n):c.lower;
        return lo.mul(lo).compare(source.upper)<=0&&c.upper.mul(c.upper).compare(source.lower)>=0;
      });
      if(candidates.length===0)throw new Error('Algebraic square root lost all positive candidates');
      if(candidates.length===1)return candidates[0]!;
      candidates=candidates.map(c=>c.refine());source=source.refine();
    }
  }
  reciprocal():AlgebraicReal {
    if(this.signOf(new Polynomial([0n,1n]))===0)throw new RangeError('Algebraic division by zero');
    let root:AlgebraicReal=this;
    const one=new Rational(1n);
    while(root.lower.sign()*root.upper.sign()<=0)root=root.refine();
    if(root.rational!==null)return AlgebraicReal.fromRational(one.div(root.rational));
    const polynomial=new Polynomial([...root.polynomial.coefficients].reverse()).monic();
    if(polynomial.degree===1)return AlgebraicReal.fromRational(polynomial.coefficient(0).neg().div(polynomial.coefficient(1)));
    return new AlgebraicReal(polynomial,one.div(root.upper),one.div(root.lower));
  }
  private combine(other:AlgebraicReal,operation:'sum'|'product'):AlgebraicReal {
    let a:AlgebraicReal=this,b=other;
    const rationalCase=():AlgebraicReal|null=>{
      if(a.rational!==null)return operation==='sum'?b.affine(1n,a.rational):b.affine(a.rational);
      if(b.rational!==null)return operation==='sum'?a.affine(1n,b.rational):a.affine(b.rational);
      return null;
    };
    const simple=rationalCase();if(simple!==null)return simple;
    const polynomial=(operation==='sum'?sumElimination(a.polynomial,b.polynomial):productElimination(a.polynomial,b.polynomial)).squareFree();
    if(polynomial.degree<=0)throw new Error('Algebraic operation has no defining polynomial');
    let candidates=[...AlgebraicReal.isolate(polynomial)];
    while(true){
      const exact=rationalCase();if(exact!==null)return exact;
      let lower:Rational,upper:Rational;
      if(operation==='sum'){lower=a.lower.add(b.lower);upper=a.upper.add(b.upper);}
      else {
        const products=[a.lower.mul(b.lower),a.lower.mul(b.upper),a.upper.mul(b.lower),a.upper.mul(b.upper)].sort((x,y)=>x.compare(y));
        lower=products[0]!;upper=products[3]!;
      }
      // Keep every candidate whose certificate may contain a value in the image
      // interval. The actual result is never discarded; refine until unique.
      candidates=candidates.filter(c=>c.lower.compare(upper)<=0&&c.upper.compare(lower)>=0);
      if(candidates.length===0)throw new Error('Algebraic image interval lost all candidate roots');
      if(candidates.length===1)return candidates[0]!;
      candidates=candidates.map(c=>c.refine());
      if(a.upper.sub(a.lower).compare(b.upper.sub(b.lower))>=0)a=a.refine();else b=b.refine();
    }
  }
  /** Evaluate N(root)/D(root) while retaining the single source parameter.
   * Elimination degree is bounded by the source degree, rather than repeated
   * independent conjugate products. Zero denominator at this root is rejected.
   */
  rationalFunction(numerator:Polynomial,denominator:Polynomial=new Polynomial([1n])):AlgebraicReal {
    if(this.signOf(denominator)===0)throw new RangeError('Algebraic rational function has a zero denominator');
    const n=numerator.divRem(this.polynomial).remainder,d=denominator.divRem(this.polynomial).remainder;
    if(this.signOf(n)===0)return AlgebraicReal.fromRational(0n);
    if(this.rational!==null)return AlgebraicReal.fromRational(n.evaluate(this.rational).div(d.evaluate(this.rational)));
    // Remove denominator-zero conjugates, even when the defining polynomial
    // is reducible. They cannot be the represented source root.
    const sourcePolynomial=this.polynomial.divRem(this.polynomial.gcd(d)).quotient;
    const equation=Array.from({length:Math.max(n.degree,d.degree)+1},(_,i)=>new Polynomial([n.coefficient(i).neg(),d.coefficient(i)]));
    const image=resultantInParameter(sourcePolynomial.coefficients.map(c=>new Polynomial([c])),equation).squareFree();
    if(image.degree<=0)throw new Error('Rational algebraic image has no defining polynomial');
    let candidates=[...AlgebraicReal.isolate(image)],root:AlgebraicReal=this;
    while(true){
      if(root.rational!==null)return AlgebraicReal.fromRational(n.evaluate(root.rational).div(d.evaluate(root.rational)));
      const [dl,du]=intervalValue(d,root.lower,root.upper);
      if(dl.sign()*du.sign()<=0){root=root.refine();continue;}
      const [nl,nu]=intervalValue(n,root.lower,root.upper),bounds=[nl.div(dl),nl.div(du),nu.div(dl),nu.div(du)].sort((a,b)=>a.compare(b));
      candidates=candidates.filter(c=>c.lower.compare(bounds[3]!)<=0&&c.upper.compare(bounds[0]!)>=0);
      if(!candidates.length)throw new Error('Rational image lost all candidates');
      if(candidates.length===1)return candidates[0]!;
      candidates=candidates.map(c=>c.refine());root=root.refine();
    }
  }
  /** Exact sign of another polynomial evaluated at this root, including equality. */
  signOf(input:Polynomial):Sign {
    const reduced=input.divRem(this.polynomial).remainder;
    if(reduced.degree<0)return 0;
    if(this.rational!==null)return reduced.evaluate(this.rational).sign();
    const common=this.polynomial.gcd(reduced);
    if(common.degree>0&&countRealRoots(common,this.lower,this.upper)>0)return 0;
    let root:AlgebraicReal=this;
    while(true){
      if(root.rational!==null)return reduced.evaluate(root.rational).sign();
      const [lo,hi]=intervalValue(reduced,root.lower,root.upper);
      if(lo.sign()>0)return 1;
      if(hi.sign()<0)return -1;
      root=root.refine();
    }
  }
  compare(other:AlgebraicReal):Sign {
    let a:AlgebraicReal=this,b=other;
    if(a.rational!==null&&b.rational!==null)return a.rational.compare(b.rational);
    if(a.upper.compare(b.lower)<=0)return -1;
    if(b.upper.compare(a.lower)<=0)return 1;
    if(a.rational!==null&&b.polynomial.evaluate(a.rational).sign()===0)return 0;
    if(b.rational!==null&&a.polynomial.evaluate(b.rational).sign()===0)return 0;
    if(a.rational===null&&b.rational===null){
      const common=a.polynomial.gcd(b.polynomial);
      const lo=a.lower.compare(b.lower)>0?a.lower:b.lower,hi=a.upper.compare(b.upper)<0?a.upper:b.upper;
      if(common.degree>0&&lo.compare(hi)<0&&countRealRoots(common,lo,hi)>0)return 0;
    }
    while(true){
      if(a.rational!==null&&b.rational!==null)return a.rational.compare(b.rational);
      if(a.upper.compare(b.lower)<=0)return -1;
      if(b.upper.compare(a.lower)<=0)return 1;
      if(a.rational===null&&(b.rational!==null||a.upper.sub(a.lower).compare(b.upper.sub(b.lower))>=0))a=a.refine();else b=b.refine();
    }
  }
}
export function isolateRealRoots(input:Polynomial):readonly AlgebraicReal[]{return AlgebraicReal.isolate(input);}
