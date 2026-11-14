import {point3,plane3,nurbsSurface3,intersectNurbsSurfacePlane3,nurbsPlaneSectionEdgePoint3} from '../dist/index.js';
const s=nurbsSurface3(1,1,[[point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,1n,1n)]],[0n,0n,1n,1n],[0n,0n,1n,1n]);
const section=intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n,'-1/4')),p=nurbsPlaneSectionEdgePoint3(section,0,0,'1/2');
console.log({pieces:section.pieces.length,vertices:section.pieces[0]!.topology.vertices.length,edges:section.pieces[0]!.topology.edges.length,components:section.pieces[0]!.topology.components.length,point:{x:p.x.rational!.toString(),y:p.y.rational!.toString(),z:p.z.rational!.toString()}});
