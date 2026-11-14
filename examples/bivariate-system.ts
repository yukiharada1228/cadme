import {BivariatePolynomial as P,solveBivariateSystem} from '../dist/index.js';
const U=new P([[],[1n]]),V=new P([[0n,1n]]),one=new P([[1n]]);
const circle=U.mul(U).add(V.mul(V)).sub(one),result=solveBivariateSystem(circle,U.sub(V));
console.log({kind:result.kind,points:result.points.map(p=>({uSquared:p.u.mul(p.u).rational?.toString(),vSquared:p.v.mul(p.v).rational?.toString(),sameCoordinates:p.u.compare(p.v)===0}))});
const shared=solveBivariateSystem(V.mul(U.sub(one)),V.mul(V.sub(one)));
console.log({kind:shared.kind,sharedFactorIsV:shared.commonFactor.equals(V),isolatedPoints:shared.points.map(p=>({u:p.u.rational?.toString(),v:p.v.rational?.toString()}))});
