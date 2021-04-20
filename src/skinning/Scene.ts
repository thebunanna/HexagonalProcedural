import { Mat3, Mat4, Quat, Vec3 } from "../lib/TSM.js";
import { AttributeLoader, MeshGeometryLoader, BoneLoader, MeshLoader } from "./AnimationFileLoader.js";

export class Attribute {
  values: Float32Array;
  count: number;
  itemSize: number;

  constructor(attr: AttributeLoader) {
    this.values = attr.values;
    this.count = attr.count;
    this.itemSize = attr.itemSize;
  }
}

export class MeshGeometry {
  position: Attribute;
  normal: Attribute;
  uv: Attribute | null;
  skinIndex: Attribute; // which bones affect each vertex?
  skinWeight: Attribute; // with what weight?
  v0: Attribute; // position of each vertex of the mesh *in the coordinate system of bone skinIndex[0]'s joint*. Perhaps useful for LBS.
  v1: Attribute;
  v2: Attribute;
  v3: Attribute;

  constructor(mesh: MeshGeometryLoader) {
    this.position = new Attribute(mesh.position);
    this.normal = new Attribute(mesh.normal);
    if (mesh.uv) { this.uv = new Attribute(mesh.uv); }
    this.skinIndex = new Attribute(mesh.skinIndex);
    this.skinWeight = new Attribute(mesh.skinWeight);
    this.v0 = new Attribute(mesh.v0);
    this.v1 = new Attribute(mesh.v1);
    this.v2 = new Attribute(mesh.v2);
    this.v3 = new Attribute(mesh.v3);
  }
}

export class Ray {
  public origin: Vec3;
  public direction: Vec3;

  constructor (pos: Vec3, dir: Vec3) {
    this.origin = pos;
    this.direction = dir;
  }

  public at (time:number) : Vec3 {
    let ret : Vec3;
    this.direction.scale(time, ret)
    return Vec3.sum(ret, this.origin)
  }

  public getOrigin () : Vec3 {
    return this.origin.copy();
  }

  public getDir () : Vec3 {
    return this.direction.copy();
  }
}

export class KeyFrame {
  public length: number;
  public rotations: Quat[];
  public translations: Vec3[];

  public rOri: Quat[];
  public tOri: Mat4[];
  constructor (rotations: Quat[], translations: Vec3[]) {
    this.length = 1.0;
    this.rotations = [];
    this.translations = [];
    this.rOri = [];
    this.tOri = [];
    rotations.forEach(rot => {
      this.rotations.push(rot.copy());
    });
    translations.forEach(t => {
      this.translations.push(t.copy());
    });
  }

  public setLength (t : number) {
    this.length = t;
  }

  public getLength () : number {
    return this.length;
  }

  public init (mesh : Mesh) {
    mesh.bones.forEach(b => {
      this.rOri.push(b.T);
      this.tOri.push(b.B);
    });

  }

  public reset () {
    this.rOri = [];
    this.tOri = [];
  }

  public slerp (time : number) : Quat[] {
    time = time / this.length;
    let rots = []
    for (let i = 0; i < this.rotations.length; i++) {
      rots.push (Quat.slerpShort(this.rOri[i], this.rotations[i], time));
    }
    return rots;
  }
}

export class Bone {
  public mesh: Mesh;
  public parent: number;
  public children: number[];
  public position: Vec3; // current position of the bone's joint *in world coordinates*. Used by the provided skeleton shader, so you need to keep this up to date.
  public endpoint: Vec3; // current position of the bone's second (non-joint) endpoint, in world coordinates
  public rotation: Quat; // current orientation of the joint *with respect to world coordinates*
  
  public initialPosition: Vec3; // position of the bone's joint *in world coordinates*
  public initialEndpoint: Vec3; // position of the bone's second (non-joint) endpoint, in world coordinates

  private localPosition: Vec3 = new Vec3([0,0,0]);
  private localEndpoint: Vec3;
  public offset: number; // used when parsing the Collada file---you probably don't need to touch these
  public initialTransformation: Mat4;

  public B: Mat4;
  public T: Quat;
  private D : Mat4;
  private U : Mat4;

  public isHighlight : boolean;
  private isDirty : boolean;

  constructor(bone: BoneLoader, mesh: Mesh) {
    this.mesh = mesh;
    this.parent = bone.parent;
    this.children = Array.from(bone.children);
    this.position = bone.position.copy();
    this.endpoint = bone.endpoint.copy();
    this.rotation = bone.rotation.copy();
    this.offset = bone.offset;

    this.initialPosition = bone.initialPosition.copy();
    this.initialEndpoint = bone.initialEndpoint.copy();
    this.localEndpoint = Vec3.difference (this.initialEndpoint, this.initialPosition);
    this.initialTransformation = bone.initialTransformation.copy();

    this.T = Quat.identity.copy();
    this.D = null;
    this.U = null;
    this.isHighlight = false;
    this.isDirty = true;
  }

  public getDir() : Vec3 {
    let a = Vec3.difference(this.endpoint, this.position);
    a.normalize();
    return a;
  }

  public getOrtho() : Mat3 {
    let v1 = Vec3.difference (this.position, this.endpoint);
    let v2 : Vec3;
    if (v1.z != 0) {
      v2 = new Vec3 ([0.5,0.5, (v1.x * -0.5 + v1.y * -0.5) / v1.z])
    }
    else if (v1.x != 0) {
      v2 = new Vec3 ([(v1.y * -0.5 + v1.z * -0.5) / v1.x, 0.5, 0.5])
    }
    else if (v1.y != 0) {
      v2 = new Vec3 ([0.5, (v1.z * -0.5 + v1.x * -0.5) / v1.y, 0.5])
    }

    return new Mat3([...v1.xyz, ...v2.xyz, ...Vec3.cross(v1,v2).xyz]);
  }

  public init () : void {
    let iden = Mat4.identity.all()
    iden[12] = this.position.x;
    iden[13] = this.position.y;
    iden[14] = this.position.z;
    if (this.parent == -1) {
      this.B = new Mat4(iden);
    }
    else {
      let pbone = this.mesh.bones[this.parent];
      iden[12] -= pbone.position.x;
      iden[13] -= pbone.position.y;
      iden[14] -= pbone.position.z;
      this.B = new Mat4(iden);
    }
    
  }

  public UMat() : Mat4 {
    if (this.U != null) {
      return this.U;
    }

    if (this.parent == -1) {
      let iden = Mat4.identity.all()
      iden[12] = this.position.x;
      iden[13] = this.position.y;
      iden[14] = this.position.z;
      return new Mat4(iden);
    }
    let dprev : Mat4;

    dprev = this.mesh.bones[this.parent].UMat();
    this.U = Mat4.product(dprev, this.B);
    return this.U
  }

  public DMat() : Mat4 {
    if (this.D != null) {
      return this.D;
    }

    let dprev : Mat4;
    if (this.parent == -1) {
      let iden = Mat4.identity.copy().all()
      iden[12] = this.position.x;
      iden[13] = this.position.y;
      iden[14] = this.position.z;
      this.D = new Mat4(iden);
      this.D.multiply(this.T.toMat4());
      return this.D;
    }

    dprev = this.mesh.bones[this.parent].DMat();
    this.D = Mat4.product(dprev, Mat4.product(this.B, this.T.toMat4()));
    return this.D
  }

  public VMat() : Quat {
    if (this.parent == -1) {
      return this.T.copy();
    }
    let vprev = this.mesh.bones[this.parent].VMat();
    return Quat.product(vprev, this.T)
  }

  public updateRotation() : void {
    this.rotation = this.VMat();
    this.children.forEach(child => {
      this.mesh.bones[child].updateRotation();
    });
  }

  public updatePosition() : void {
    this.D = null;
    let D = this.DMat();
    this.position = D.multiplyPt3(this.localPosition);
    this.endpoint = D.multiplyPt3(this.localEndpoint);
    this.children.forEach(child => {
      this.mesh.bones[child].updatePosition();
    });
  }

  public intersect(width : number, r : Ray) : number {

    let axis = new Mat3([0,0,1 , 1,0,0 , 0,1,0]);
    let R = Mat3.product(axis, this.getOrtho().inverse()); 

    //let lp = R.copy().multiplyVec3(this.position);
    //let le = R.copy().multiplyVec3(this.endpoint);

    let ba : Vec3 = Vec3.difference (this.position, this.endpoint);
    
    let dir = r.getDir();
    //dir = R.copy().multiplyVec3(dir);
    let pos = r.getOrigin();
    //pos = R.copy().multiplyVec3(pos);

    let oc : Vec3 = Vec3.difference (pos, dir);

    let baba : number = Vec3.dot(ba,ba);
    let bard : number = Vec3.dot(ba,dir);
    let baoc : number = Vec3.dot(ba,oc);
    
    let k2 = baba            - bard*bard;
    let k1 = baba*Vec3.dot(oc,dir) - baoc*bard;
    let k0 = baba*Vec3.dot(oc,oc) - baoc*baoc - width*width*baba;
    
    let h = k1*k1 - k2*k0;
    if( h<0.0 ) return -1;
    h = Math.sqrt(h);
    let t = (-k1-h)/k2;

    // // body
    let y = baoc + t*bard;
    if( y>0.0 && y<baba ) return t;//vec4( t, (oc+t*rd - ba*y/baba)/ra );
    
    // // caps
    // t = ( ((y<0.0) ? 0.0 : baba) - baoc)/bard;
    // if( abs(k1+k2*t)<h )
    // {
    //     return vec4( t, ba*sign(y)/baba );
    // }

    // return vec4(-1.0);
    return -1;
  }
}

export class Mesh {
  public geometry: MeshGeometry;
  public worldMatrix: Mat4; // in this project all meshes and rigs have been transformed into world coordinates for you
  public rotation: Vec3;
  public bones: Bone[];
  public materialName: string;
  public imgSrc: String | null;


  private boneIndices: number[];
  private bonePositions: Float32Array;
  private boneIndexAttribute: Float32Array;
  private hboneIndex: number = 0;
  private changes: Quat[]

  constructor(mesh: MeshLoader) {
    this.geometry = new MeshGeometry(mesh.geometry);
    this.worldMatrix = mesh.worldMatrix.copy();
    this.rotation = mesh.rotation.copy();
    this.bones = [];
    this.changes = [];
    mesh.bones.forEach(bone => {
      this.bones.push(new Bone(bone, this));
      this.changes.push(Quat.identity.copy())
    });
    this.bones.forEach(bone => {
      bone.init();
    });
    //this.bones[0].position = Vec3.sum (this.bones[0].position, new Vec3([1,1,1]));
    this.bones[0].updatePosition();
    this.bones[0].updateRotation();
    
    

    this.materialName = mesh.materialName;
    this.imgSrc = null;
    this.boneIndices = Array.from(mesh.boneIndices);
    this.bonePositions = new Float32Array(mesh.bonePositions);
    this.boneIndexAttribute = new Float32Array(mesh.boneIndexAttribute);
  }

  public getBoneIndices(): Uint32Array {
    return new Uint32Array(this.boneIndices);
  }

  public getBonePositions(): Float32Array {
    return this.bonePositions;
  }

  public getBoneIndexAttribute(): Float32Array {
    return this.boneIndexAttribute;
  }

  public getHighlightedBones(): Float32Array {
    let harray = []
    this.bones.forEach(e => {
      harray.push (e.isHighlight)
      harray.push (e.isHighlight)
    });

    return new Float32Array(harray);
  }

  public rotateBone(rot: Quat, index : number): void {

    let b = this.bones[index]
    b.T.multiply(rot);
    //b.position = b.DMat().multiplyPt3(new Vec3([0,0,0]));
    // b.children.forEach(child => {
    //   this.bones[child].position = this.bones[child].DMat().multiplyPt3(new Vec3([0,0,0]));
      
    // });
    b.updatePosition();
    b.updateRotation();
    this.changes[index].multiply(rot)
  }

  public applyKeyFrame(key : KeyFrame, time: number): void {
    //assumes init was called on keyframe.
    key.slerp(time).forEach((rot, ind) => {
      this.bones[ind].T = rot;
      this.bones[ind].updatePosition();
      this.bones[ind].updateRotation();
    });
  }

  public setKeyFrame(key : KeyFrame): void {
    //applies key frame to current mesh.
    key.init(this);
    this.applyKeyFrame(key, key.getLength());
  }

  public createKeyFrame() : KeyFrame {
    let rots = []
    this.bones.forEach(b => {
      rots.push(b.T)
    });
    let key = new KeyFrame(rots, []);
    this.changes = [];
    this.bones.forEach(bone => {
      this.changes.push(Quat.identity.copy())
    });
    return key;
  }

  public setHighlight(index : number): void {
    if (index == -1) {
      if (this.hboneIndex != -1) {
        this.bones[this.hboneIndex].isHighlight = false;
      }
        
      this.hboneIndex = index;
      return;
    }
    if (this.hboneIndex != -1) {
      this.bones[this.hboneIndex].isHighlight = false;
    }

    this.bones[index].isHighlight = true;
    this.hboneIndex = index;
  }

  public getHighlight () : number {
    return this.hboneIndex;
  }

  public getBoneTranslations(): Float32Array {
    let trans = new Float32Array(3 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.position.xyz;
      for (let i = 0; i < res.length; i++) {
        trans[3 * index + i] = res[i];
      }
    });
    return trans;
  }

  public getBoneRotations(): Float32Array {
    let trans = new Float32Array(4 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.rotation.xyzw;
      for (let i = 0; i < res.length; i++) {
        trans[4 * index + i] = res[i];
      }
    });
    return trans;
  }

  public getBoneDMat(): Float32Array {
    let Dmats = new Float32Array(16 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.DMat().all();
      for (let i = 0; i < res.length; i++) {
        Dmats[16 * index + i] = res[i];
      }
    });
    return Dmats;
  }
  public getBoneUMat(): Float32Array {
    let Umats = new Float32Array(16 * this.bones.length);
    this.bones.forEach((bone, index) => {
      let res = bone.UMat().all();
      for (let i = 0; i < res.length; i++) {
        Umats[16 * index + i] = res[i];
      }
    });
    return Umats;
  }
}
