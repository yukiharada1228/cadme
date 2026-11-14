import test from 'node:test';
import assert from 'node:assert/strict';
import {Rational,point3,vector3,line3,cylinder3,plane3,clipCylinderBRep3,splitClippedCylinderByPlane3,surfacesCoincide3,dot3} from '../dist/index.js';

const cylinder=cylinder3(line3(point3(0n,0n,0n),vector3(0n,0n,1n)),1n);
test('one-sided classification agrees with independent finite-cylinder support extrema',()=>{
  const parent=clipCylinderBRep3(cylinder,-2n,3n);
  for(const [a,b] of [[3n,4n],[4n,3n],[-3n,4n],[-4n,-3n]])for(const c of [-5n,5n]){
    const z=c<0?-2n:3n,max=5n+c*z,contact=point3(new Rational(a,5n),new Rational(b,5n),z);
    for(const gap of [0n,1n])for(const sign of [-1n,1n]){
      const plane=plane3(a*sign,b*sign,c*sign,(-max-gap)*sign),result=splitClippedCylinderByPlane3(parent,plane);
      assert.equal(result.kind,gap===0n?'touching':'disjoint');
      if(result.kind!=='touching'&&result.kind!=='disjoint')throw new Error('Expected a one-sided result');
      assert.equal(result.materialSide,sign===1n?-1:1);
      const kept=result.materialSide===-1?result.negative:result.positive,empty=result.materialSide===-1?result.positive:result.negative;
      assert.equal(kept,parent);assert.equal(empty.empty,true);assert.equal(empty.topology.faces.length,0);assert.equal(empty.interiorSample,null);assert.equal(empty.locate(contact),'outside');
      assert.equal(parent.locate(contact),'boundary');assert.equal(dot3(plane.normal,contact).add(plane.offset).sign(),gap===0n?0:sign===1n?-1:1);
      assert.ok(empty.planes.some(p=>surfacesCoincide3({kind:'plane',plane:p},{kind:'plane',plane})&&dot3(p.normal,plane.normal).sign()===result.materialSide));
      for(const prior of parent.planes)assert.ok(empty.planes.includes(prior));
      assert.equal(splitClippedCylinderByPlane3(empty,plane3(1n,0n,0n)).kind,'empty');
    }
  }
});

test('stationary points outside retained elliptic arcs cannot create false cuts or contacts',()=>{
  const parent=clipCylinderBRep3(cylinder,-1n,1n,[{plane:plane3(-1n,0n,0n),side:-1}]);
  for(const offset of ['1/4',1n,2n]){
    const result=splitClippedCylinderByPlane3(parent,plane3(1n,0n,0n,offset));
    assert.equal(result.kind,'disjoint');assert.equal(result.positive,parent);assert.equal(result.negative.empty,true);
  }
  const contact=splitClippedCylinderByPlane3(parent,plane3(1n,0n,0n));
  assert.equal(contact.kind,'touching');assert.equal(contact.positive,parent);
});

test('irrational support extrema distinguish a genuine thin cut from a strict gap',()=>{
  const parent=clipCylinderBRep3(cylinder,-1n,1n);
  const split=splitClippedCylinderByPlane3(parent,plane3(1n,1n,0n,'-7/5'));
  assert.equal(split.kind,'split');
  assert.equal(split.positive.locate(point3('7/10','71/100',0n)),'inside');
  assert.equal(split.negative.locate(point3(0n,0n,0n)),'inside');
  const disjoint=splitClippedCylinderByPlane3(parent,plane3(1n,1n,0n,'-3/2'));
  assert.equal(disjoint.kind,'disjoint');assert.equal(disjoint.negative,parent);assert.equal(disjoint.positive.empty,true);
});

test('translated arbitrary-axis support contacts agree with an independent radial and axial witness',()=>{
  const origin=point3(3n,-2n,7n),axis=vector3(1n,2n,2n),radial=vector3(2n,-1n,0n),normal=vector3(5n,5n,6n),parent=clipCylinderBRep3(cylinder3(line3(origin,axis),5n),'-1/2','1/2');
  assert.equal(dot3(radial,axis).sign(),0);assert.equal(dot3(radial,radial).toString(),'5');
  const contact=point3('11/2',-2n,8n),support=dot3(normal,origin).add(new Rational(27n,2n)).add(new Rational(5n));
  assert.equal(dot3(normal,contact).compare(support),0);assert.equal(parent.locate(contact),'boundary');
  for(const gap of [0n,1n]){
    const result=splitClippedCylinderByPlane3(parent,plane3(normal.x,normal.y,normal.z,support.add(new Rational(gap)).neg()));
    assert.equal(result.kind,gap===0n?'touching':'disjoint');assert.equal(result.negative,parent);assert.equal(result.positive.empty,true);
  }
});
