import test from 'node:test';
import assert from 'node:assert/strict';
import {point3,plane3,nurbsSurface3,insertNurbsSurfaceKnot3,intersectNurbsSurfacePlane3,nurbsPlaneSectionVertex3,nurbsPlaneSectionEdgePoint3} from '../dist/index.js';
const K=[0n,0n,1n,1n];
test('saddle plane sections trace exact open branches and empty or wholly contained cases',()=>{
  const s=nurbsSurface3(1,1,[[point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,1n,1n)]],K,K),section=intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n,'-1/4'));assert.equal(section.pieces.length,1);assert.equal(section.pieces[0]!.topology.components.length,1);assert.equal(section.containedPatches.length,0);
  const p=nurbsPlaneSectionEdgePoint3(section,0,0,'1/2');assert.equal(p.x.rational!.toString(),'1/2');assert.equal(p.y.rational!.toString(),'1/2');assert.equal(p.z.rational!.toString(),'1/4');assert.equal(intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n,-2n)).pieces.length,0);
  const planar=nurbsSurface3(1,1,[[point3(0n,0n,0n),point3(0n,1n,0n)],[point3(1n,0n,0n),point3(1n,1n,0n)]],K,K),contained=intersectNurbsSurfacePlane3(planar,plane3(0n,0n,1n));assert.equal(contained.containedPatches.length,1);assert.equal(contained.pieces.length,0);
});
test('quarter-cylinder horizontal and tangent sections retain analytic points and vertical parameter edges',()=>{
  const poles=[[1n,0n],[1n,1n],[0n,1n]],s=nurbsSurface3(2,1,poles.map(([x,y])=>[point3(x!,y!,-2n),point3(x!,y!,3n)]),[0n,0n,0n,1n,1n,1n],K,[[1n,1n],[1n,1n],[2n,2n]]),horizontal=intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n));assert.equal(horizontal.pieces.length,1);const p=nurbsPlaneSectionEdgePoint3(horizontal,0,0,'1/2');assert.equal(p.x.rational!.toString(),'3/5');assert.equal(p.y.rational!.toString(),'4/5');assert.equal(p.z.sign(),0);
  const tangent=intersectNurbsSurfacePlane3(s,plane3(3n,4n,0n,-5n));assert.equal(tangent.pieces.length,1);assert.equal(tangent.pieces[0]!.topology.edges.length,1);assert.equal(tangent.pieces[0]!.topology.edges[0]!.kind,'vertical');const a=nurbsPlaneSectionEdgePoint3(tangent,0,0,'1/2');assert.equal(a.x.rational!.toString(),'3/5');assert.equal(a.y.rational!.toString(),'4/5');assert.equal(a.z.rational!.toString(),'1/2');
});
test('isolated tangent contacts are vertices and patch seams retain separate provenance',()=>{
  const coord=[-1n,0n,1n],square=[1n,-1n,1n],poles=coord.map((x,i)=>coord.map((y,j)=>point3(x,y,square[i]!+square[j]!))),s=nurbsSurface3(2,2,poles,[0n,0n,0n,1n,1n,1n],[0n,0n,0n,1n,1n,1n]),contact=intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n));assert.equal(contact.pieces.length,1);assert.equal(contact.pieces[0]!.topology.vertices.length,1);assert.equal(contact.pieces[0]!.topology.edges.length,0);const p=nurbsPlaneSectionVertex3(contact,0,0);assert.equal(p.x.sign(),0);assert.equal(p.y.sign(),0);assert.equal(p.z.sign(),0);
  const split=insertNurbsSurfaceKnot3(s,'u','1/2',2),seams=intersectNurbsSurfacePlane3(split,plane3(0n,0n,1n));assert.equal(seams.pieces.length,2);assert.ok(seams.pieces.every(piece=>piece.topology.vertices.length===1));
});
test('section evaluators enforce ownership, indices and preserve discontinuous patch branches',()=>{
  const s=nurbsSurface3(1,1,[[point3(0n,0n,-1n),point3(0n,1n,1n)],[point3(1n,0n,-1n),point3(1n,1n,1n)],[point3(10n,0n,-1n),point3(10n,1n,1n)],[point3(11n,0n,-1n),point3(11n,1n,1n)]],[0n,0n,1n,1n,2n,2n],K),section=intersectNurbsSurfacePlane3(s,plane3(0n,0n,1n));assert.equal(section.pieces.length,2);const ends=section.pieces.map((p,i)=>p.topology.vertices.map((_,j)=>nurbsPlaneSectionVertex3(section,i,j).x.rational!.toString()));assert.deepEqual(ends,[['0','1'],['10','11']]);assert.ok(Object.isFrozen(section)&&Object.isFrozen(section.pieces));assert.throws(()=>nurbsPlaneSectionVertex3({...section},0,0),RangeError);assert.throws(()=>nurbsPlaneSectionVertex3(section,-1,0),RangeError);assert.throws(()=>nurbsPlaneSectionVertex3(section,0,-1),RangeError);
});
