import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone, KeyFrame, Mesh, Ray } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Vector2 } from "../lib/threejs/src/Three.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

export enum Mode {
  playback,  
  edit  
}

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.2;
  private static readonly rollSpeed: number = 0.2;
  private static readonly panSpeed: number = 0.2;

  private ctx: DOMRect;
  private center: Vec3;
  private camera: Camera;
  private mesh: Mesh[];

  //Do note that this should be changed lateR?
  private dragging: boolean;
  private fps: boolean;
  private prevX: number;
  private prevY: number;

  private height: number;
  private viewPortHeight: number;
  private width: number;

  private animation: SkinningAnimation;

  public time: number;
  
  public mode: Mode;
  

  public hoverX: number = 0;
  public hoverY: number = 0;

  public debugLines: number[];
  public debug: boolean = false;
  
  public keyframes : KeyFrame[];
  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param sponge required for some of the controls
   */
  constructor(canvas: HTMLCanvasElement, animation: SkinningAnimation) {
    this.height = canvas.height;
    this.viewPortHeight = this.height - 200;
    this.width = canvas.width;
    this.prevX = 0;
    this.prevY = 0;
    this.ctx = canvas.getBoundingClientRect();;
    //center in terms of world coords. will not work if scrolled.
    //this.center = new Vec3([size.width / 2 + size.x, this.viewPortHeight / 2 + size.y, 0])
    this.animation = animation;
    
    this.reset();
    
    this.registerEventListeners(canvas);
  }

  public getKeyFrameLengths () : number[] {
    let b = []
    this.keyframes.forEach(k => {
      b.push (k.getLength());
    });
    return b
  }

  public getNumKeyFrames(): number {
    // TODO
    // Used in the status bar in the GUI
    return this.keyframes.length;
  }
  public getTime(): number { return this.time; }
  
  public getMaxTime(): number { 
    // TODO
    // The animation should stop after the last keyframe
    let total = 0;
    this.keyframes.forEach((k, ind) => {
      if (ind != 0) {
        total += k.getLength();
      }
      
    });
    return total * 1000;
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    this.fps = false;
    this.dragging = false;
    this.time = 0;
    this.mode = Mode.edit;
    this.camera = new Camera(
      new Vec3([0, 0, -6]),
      new Vec3([0, 0, 0]),
      new Vec3([0, 1, 0]),
      45,
      this.width / this.viewPortHeight,
      0.1,
      1000.0
    );
    this.debugLines = [];
    this.keyframes = [];

  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    aspect: number,
    zNear: number,
    zFar: number
  ) {
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    if (mouse.offsetY > 600) {
      // outside the main panel
      return;
    }
    
    // TODO
    // Some logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
    
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;
    

    if (this.debug) {
      
    }
    
  }

  private prevind = 0;

  public incrementTime(dT: number): void {
    if (this.mode === Mode.playback) {
      this.time += dT;
      if (this.time >= this.getMaxTime()) {
        this.time = 0;
        this.mode = Mode.edit;
        this.prevind = 0;
      }
      else {
        let m = this.animation.getScene().meshes[0];

        let total = 0
        let i = 1;
        for (; i < this.keyframes.length; i++) {
          if (this.keyframes[i].getLength() * 1000 + total >= this.time) {
            break;
          }
          else {
            total += this.keyframes[i].getLength() * 1000;
          }
        }

        i -= 1;
        if (this.prevind != i) {
          m.setKeyFrame(this.keyframes[this.prevind+1])
          this.prevind = i;
          this.keyframes[i+1].init(m);
        }
        let t = (this.time - total) / 1000;

        m.applyKeyFrame(this.keyframes[i + 1], t);
      }
    }
  }

  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    let x = mouse.offsetX;
    let y = mouse.offsetY;
    if (this.dragging) {
      const dx = mouse.screenX - this.prevX;
      const dy = mouse.screenY - this.prevY;
      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      /* Left button, or primary button */
      const mouseDir: Vec3 = this.camera.right();
      mouseDir.scale(-dx);
      mouseDir.add(this.camera.up().scale(dy));
      mouseDir.normalize();

      if (dx === 0 && dy === 0) {
        return;
      }

      switch (mouse.buttons) {
        case 1: {
          let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
          rotAxis = rotAxis.normalize();
          this.camera.rotate(rotAxis, GUI.rotationSpeed);
          //console.log (this.camera.right().xyz);
          //let r = this.camera.right();
          // if ( Math.abs (this.camera.right().y - 1e-5) > 0) {
          //   let plane = new Vec3 ([0,1,0])//Vec3.cross(this.camera.forward(), new Vec3 ([r.x, 0, r.z]))
          //   let angle = Math.asin(Math.abs (Vec3.dot(plane, r)) / (plane.length() * r.length()));
          //   console.log (angle);
          //   if (angle <= 1) {
          //     this.camera.rotate(this.camera.forward(), angle);
          //   }
          //   

          // }
          break;
        }
        case 2: {
          /* Right button, or secondary button */
          // let m = this.animation.getScene().meshes[0];

          // let index = m.getHighlight();
          // if (index != -1) {
          //   let axis = Vec3.cross (mouseDir, m.bones[index].getDir());
          //   let mat = m.bones[index].VMat().toMat4();
          //   m.rotateBone(Quat.fromAxisAngle(mat.multiplyVec3(axis), 0.1), index);
          //   return;
          // }
          // else {
          //   this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
          // }
          
          // break;
        }
        default: {
          break;
        }
      }
    } 
    
    // TODO
    // You will want logic here:
    // 1) To highlight a bone, if the mouse is hovering over a bone;
    // 2) To rotate a bone, if the mouse button is pressed and currently highlighting a bone.
    // let pos = this.camera.pos()
    

    // //let dif = Vec3.difference(new Vec3([mouse.clientX, mouse.clientY, -1]), this.center);
    // let mouseNDC = new Vec4 ([(2 * mouse.clientX / this.width) - 1, 1 - (2 * mouse.clientY/this.viewPortHeight),-1, 1]);
    // let cc = this.camera.projMatrix().inverse().multiplyVec4(mouseNDC);
    // let mw = this.camera.viewMatrix().inverse().multiplyVec4(cc);
    // mw.scale(1 / mw.w);

    // //console.log (mw.x, mw.y, mw.z);

    // let dir = Vec3.difference(new Vec3 ([mw.x, mw.y, mw.z]), pos);
    // dir.normalize();
    // let r : Ray = new Ray(pos, dir);
    
    // this.animation.getScene().meshes.forEach(m => {
    //   let bIndex = -1;
    //   let time = -1;
    //   m.bones.forEach((bone, idx) => {
    //     let t = bone.intersect(0.3, r);
        
    //     if (t > 0 && (t < time || bIndex == -1)) {
    //       //console.log (t);
    //       time = t;
    //       bIndex = idx;
    //     }
    //   });
    //   m.setHighlight(bIndex);
      

    //});
  }

  public getModeString(): string {
    switch (this.mode) {
      case Mode.edit: { return "edit: " + this.getNumKeyFrames() + " keyframes"; }
      case Mode.playback: { return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2); }
    }
  }

  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.prevX = 0;
    this.prevY = 0;
    
    // TODO
    // Maybe your bone highlight/dragging logic needs to do stuff here too
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        this.animation.setScene("/static/assets/skinning/split_cube.dae");
        break;
      }
      case "Digit2": {
        this.animation.setScene("/static/assets/skinning/long_cubes.dae");
        break;
      }
      case "Digit3": {
        this.animation.setScene("/static/assets/skinning/simple_art.dae");
        break;
      }      
      case "Digit4": {
        this.animation.setScene("/static/assets/skinning/mapped_cube.dae");
        break;
      }
      case "Digit5": {
        this.animation.setScene("/static/assets/skinning/robot.dae");
        break;
      }
      case "Digit6": {
        this.animation.setScene("/static/assets/skinning/head.dae");
        break;
      }
      case "Digit7": {
        this.animation.setScene("/static/assets/skinning/wolf.dae");
        break;
      }
      case "Digit8": {
        this.debug = !this.debug;
        break;
      }
      case "KeyW": {
        this.camera.offset(
            this.camera.forward().negate(),
            GUI.zoomSpeed,
            true
          );
        break;
      }
      case "KeyA": {
        this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyS": {
        this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyD": {
        this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyR": {
        this.animation.reset();
        this.keyframes = [];
        break;
      }
      case "ArrowLeft": {
        this.camera.roll(GUI.rollSpeed, false);
        break;
      }
      case "ArrowRight": {
        this.camera.roll(GUI.rollSpeed, true);
        break;
      }
      case "ArrowUp": {
        this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
        break;
      }
      case "ArrowDown": {
        this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyK": {
        if (this.mode === Mode.edit) {
          let k = this.animation.getScene().meshes[0].createKeyFrame();
          let time = document.getElementById("time") as HTMLInputElement;
          
          k.setLength(+time.value);
          this.keyframes.push(k);
        }
        break;
      }      
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1)
        {
          this.mode = Mode.playback;
          this.animation.getScene().meshes[0].setKeyFrame(this.keyframes[0]);
          this.keyframes[1].init(this.animation.getScene().meshes[0]);
          this.time = 0;
        } else if (this.mode === Mode.playback) {
          this.mode = Mode.edit;
        }
        break;
      }
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );
  }
  private registerRangeListenrs(): void {
    let xrange = document.getElementById("xrange") as HTMLInputElement;
    let yrange = document.getElementById("yrange") as HTMLInputElement;
    let zrange = document.getElementById("zrange") as HTMLInputElement;
    xrange.addEventListener("change", (event: any) => {
      
    })
  }
}
