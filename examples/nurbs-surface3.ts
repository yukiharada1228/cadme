import {point3,plane3,nurbsSurface3,evaluateNurbsSurface3,differentialNurbsSurface3,nurbsSurfaceIsoCurve3,splitNurbsSurface3,nurbsSurfacePlaneEquations3,evaluateNurbsCurve3} from '../dist/index.js';

const poles=[[1n,0n],[1n,1n],[0n,1n]],surface=nurbsSurface3(2,1,poles.map(([x,y])=>[point3(x!,y!,-2n),point3(x!,y!,3n)]),[0n,0n,0n,1n,1n,1n],[0n,0n,1n,1n],[[1n,1n],[1n,1n],[2n,2n]]);
const point=evaluateNurbsSurface3(surface,'1/2','2/5'),d=differentialNurbsSurface3(surface,'1/2','2/5'),iso=nurbsSurfaceIsoCurve3(surface,'v','2/5'),split=splitNurbsSurface3(surface,'u','1/2'),equations=nurbsSurfacePlaneEquations3(surface,plane3(0n,0n,1n));
const strings=(p:typeof point)=>Object.fromEntries((['x','y','z'] as const).map(k=>[k,p[k].rational!.toString()]));
console.log({point:strings(point),normal:strings(d.normal),regular:d.regular,isocurvePoint:strings(evaluateNurbsCurve3(iso,'1/2')),splitContinuous:split.continuous,planeEquationVanishingAlongIso:equations.every(e=>e.polynomial.specializeV('2/5').degree<0)});
