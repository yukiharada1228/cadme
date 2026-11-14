import {Rational} from './rational.js';
import {Polynomial,exactRational} from './polynomial.js';
import {AlgebraicReal} from './real-roots.js';
import type {ExactInput} from '../geometry/point2.js';

const zero=new Rational(0n),empty=new Polynomial();
/** Q[u,v], coefficients[i][j] multiplies u^i v^j. Zero has no rows. */
export class BivariatePolynomial {
  readonly rows:readonly Polynomial[];
  constructor(coefficients:readonly (readonly ExactInput[])[]=[]){
    const rows=Array.from(coefficients,row=>new Polynomial(Array.from(row)));while(rows.length&&rows[rows.length-1]!.degree<0)rows.pop();
    this.rows=Object.freeze(rows);Object.freeze(this);
  }
  private static fromRows(rows:readonly Polynomial[]):BivariatePolynomial {return new BivariatePolynomial(rows.map(r=>r.coefficients));}
  get degreeU():number{return this.rows.length-1;}
  get degreeV():number{return this.rows.reduce((degree,row)=>Math.max(degree,row.degree),-1);}
  row(index:number):Polynomial {if(!Number.isSafeInteger(index)||index<0)throw new RangeError('Invalid polynomial row index');return this.rows[index]??empty;}
  coefficient(i:number,j:number):Rational{return this.row(i).coefficient(j);}
  add(other:BivariatePolynomial):BivariatePolynomial {return BivariatePolynomial.fromRows(Array.from({length:Math.max(this.rows.length,other.rows.length)},(_,i)=>this.row(i).add(other.row(i))));}
  scale(value:ExactInput):BivariatePolynomial {const q=exactRational(value);return BivariatePolynomial.fromRows(this.rows.map(row=>row.scale(q)));}
  sub(other:BivariatePolynomial):BivariatePolynomial{return this.add(other.scale(-1n));}
  mul(other:BivariatePolynomial):BivariatePolynomial {
    if(this.degreeU<0||other.degreeU<0)return new BivariatePolynomial();
    const rows=Array.from({length:this.degreeU+other.degreeU+1},()=>empty);
    this.rows.forEach((a,i)=>other.rows.forEach((b,j)=>{rows[i+j]=rows[i+j]!.add(a.mul(b));}));return BivariatePolynomial.fromRows(rows);
  }
  derivativeU():BivariatePolynomial{return BivariatePolynomial.fromRows(this.rows.slice(1).map((row,i)=>row.scale(BigInt(i+1))));}
  derivativeV():BivariatePolynomial{return BivariatePolynomial.fromRows(this.rows.map(row=>row.derivative()));}
  specializeU(input:ExactInput):Polynomial {const u=exactRational(input);let result=empty;for(let i=this.degreeU;i>=0;i--)result=result.scale(u).add(this.rows[i]!);return result;}
  specializeV(input:ExactInput):Polynomial {const v=exactRational(input);return new Polynomial(this.rows.map(row=>row.evaluate(v)));}
  evaluate(u:ExactInput,v:ExactInput):Rational{return this.specializeU(u).evaluate(v);}
  /** Substitute u=v=t without introducing independent algebraic generators. */
  diagonal():Polynomial {
    if(this.degreeU<0)return empty;
    const coefficients=Array.from({length:this.degreeU+this.degreeV+1},()=>zero);
    this.rows.forEach((row,i)=>row.coefficients.forEach((value,j)=>{coefficients[i+j]=coefficients[i+j]!.add(value);}));return new Polynomial(coefficients);
  }
  transpose():BivariatePolynomial {return new BivariatePolynomial(Array.from({length:this.degreeV+1},(_,j)=>Array.from({length:this.degreeU+1},(_,i)=>this.coefficient(i,j))));}
  equals(other:BivariatePolynomial):boolean{return this.rows.length===other.rows.length&&this.rows.every((row,i)=>row.equals(other.rows[i]!));}
  evaluateAlgebraic(u:AlgebraicReal,v:AlgebraicReal):AlgebraicReal {
    if(u.rational!==null)return v.rationalFunction(this.specializeU(u.rational));
    if(v.rational!==null)return u.rationalFunction(this.specializeV(v.rational));
    if(u.compare(v)===0)return u.rationalFunction(this.diagonal());
    let result=AlgebraicReal.fromRational(0n);for(let i=this.degreeU;i>=0;i--)result=result.mul(u).add(v.rationalFunction(this.rows[i]!));return result;
  }
  rationalImage(u:AlgebraicReal,v:AlgebraicReal,denominator:BivariatePolynomial):AlgebraicReal {
    if(u.rational!==null)return v.rationalFunction(this.specializeU(u.rational),denominator.specializeU(u.rational));
    if(v.rational!==null)return u.rationalFunction(this.specializeV(v.rational),denominator.specializeV(v.rational));
    if(u.compare(v)===0)return u.rationalFunction(this.diagonal(),denominator.diagonal());
    return this.evaluateAlgebraic(u,v).div(denominator.evaluateAlgebraic(u,v));
  }
}
