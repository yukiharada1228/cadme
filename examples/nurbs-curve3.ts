import {point3,plane3,nurbsCurve3,evaluateNurbsCurve3,splitNurbsCurve3,intersectNurbsPlane3} from '../dist/index.js';

// An exact unit-circle quadrant with rational poles and asymmetric weights.
const curve=nurbsCurve3(2,[point3(1n,0n,0n),point3(1n,1n,0n),point3(0n,1n,0n)],[0n,0n,0n,1n,1n,1n],[1n,1n,2n]);
const point=evaluateNurbsCurve3(curve,'1/2'),split=splitNurbsCurve3(curve,'1/2'),hit=intersectNurbsPlane3(curve,plane3(3n,4n,0n,-5n));
console.log({
  point:Object.fromEntries((['x','y','z'] as const).map(k=>[k,point[k].rational!.toString()])),
  splitDomains:[[split.left.startParameter.toString(),split.left.endParameter.toString()],[split.right.startParameter.toString(),split.right.endParameter.toString()]],
  continuous:split.continuous,
  tangentParameters:hit.points.map(p=>({parameter:p.parameter.rational?.toString()??'algebraic',multiplicity:p.branches[0]!.multiplicity})),
});
