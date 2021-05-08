import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities
} from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { GUI, Mode } from "./Gui.js";
import {
  sceneFSText,
  sceneVSText,
  floorFSText,
  floorVSText,
  skeletonFSText,
  skeletonVSText,
  sBackVSText,
  sBackFSText,
  debugVSText,
  debugFSText,
  hexVSText,
  hexFSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3, Quat, Vec2 } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { HexBlock, HexColumn, HexGrid } from "./Hexagon.js";

// var seedrand = require("seedrandom");

// seedrand.seedrandom()

export class SkinningAnimation extends CanvasAnimation {
  private gui: GUI;
  private millis: number;

  private loadedScene: string;

  /* Scene rendering info */
  private scene: CLoader;
  private sceneRenderPass: RenderPass;

  /* Skeleton rendering info */
  private skeletonRenderPass: RenderPass[];
  private hexagonRenderPass: RenderPass;

  private floor : Floor;
  private floorRenderPass: RenderPass;
  private highlightBuffer: WebGLBuffer = -1;
  private highlightALoc: GLint = -1;
  /* Scrub bar background rendering info */
  private sBackRenderPass: RenderPass;
  private debugPass: RenderPass;

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private lightDir: Vec4;
  private backgroundColor: Vec4;

  private canvas2d: HTMLCanvasElement;
  private ctx2: CanvasRenderingContext2D | null;

  private pos : Vec2;

  private render : {};
  private loaded : {};
  private islight : boolean;
  private seed : string;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;
    this.ctx2 = this.canvas2d.getContext("2d");
    if (this.ctx2) {
      this.ctx2.font = "25px serif";
      this.ctx2.fillStyle = "#ffffffff";
    }

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;
    this.floor = new Floor();

    this.floorRenderPass = new RenderPass(this.extVAO, gl, floorVSText, floorFSText);
    this.sceneRenderPass = new RenderPass(this.extVAO, gl, sceneVSText, sceneFSText);
    
    this.skeletonRenderPass = [];

    this.skeletonRenderPass.push(new RenderPass(this.extVAO, gl, skeletonVSText, skeletonFSText));

    this.gui = new GUI(this.canvas2d, this);
    this.lightPosition = new Vec4([10, 64, 10, 1]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.scene = new CLoader("");
    this.initFloor();
    // Status bar
    this.sBackRenderPass = new RenderPass(this.extVAO, gl, sBackVSText, sBackFSText);
    
    this.debugPass = new RenderPass(this.extVAO, gl, debugVSText, debugFSText);
    // TODO
    // Other initialization, for instance, for the bone highlighting
    
    this.render = {};
    this.loaded = {};
    this.seed = '0';
    this.lightDir = new Vec4 ([0.0,-1,0,0]);


    this.initGui();

    this.pos = this.getGUI().getCameraPos();

    this.millis = new Date().getTime();
    //@ts-ignore
    window.renderer = this;
  }

  public getScene(): CLoader {
    return this.scene;
  }

  /**
   * Setup the animation. This can be called again to reset the animation.
   */
  public reset(): void {
      this.gui.reset();
      this.setScene();
  }

  public initGui(): void {
    // Status bar background
    let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
    this.sBackRenderPass.setIndexBufferData(new Uint32Array([1, 0, 2, 2, 0, 3]))
    this.sBackRenderPass.addAttribute("vertPosition", 2, this.ctx.FLOAT, false,
      2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, verts);

    this.sBackRenderPass.setDrawData(this.ctx.TRIANGLES, 6, this.ctx.UNSIGNED_INT, 0);
    this.sBackRenderPass.setup();

    }
/**
   * Sets up the floor drawing
   */
 public initFloor(): void {
  this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
  this.floorRenderPass.addAttribute("aVertPos",
    4,
    this.ctx.FLOAT,
    false,
    4 * Float32Array.BYTES_PER_ELEMENT,
    0,
    undefined,
    this.floor.positionsFlat()
  );

  this.floorRenderPass.addUniform("uLightPos",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform4fv(loc, this.lightPosition.xyzw);
  });
  this.floorRenderPass.addUniform("uWorld",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
  });
  this.floorRenderPass.addUniform("uProj",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
  });
  this.floorRenderPass.addUniform("uView",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
  });
  this.floorRenderPass.addUniform("uProjInv",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().inverse().all()));
  });
  this.floorRenderPass.addUniform("uViewInv",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().inverse().all()));
  });

  this.floorRenderPass.setDrawData(this.ctx.TRIANGLES, this.floor.indicesFlat().length, this.ctx.UNSIGNED_INT, 0);
  this.floorRenderPass.setup();
}



  public initScene(): void {
    this.initDebug();
    this.initHexBlocks();
    this.gui.reset();
  }

  public hill(x,y,z) : number {
    return 1 ;Math.min (63, Math.floor (Math.max (- ((x-8)**2 + (y-8)**2) + 6, 0)));
  }

  public unirand(a,b,c) : number {
    return 12;
    return Math.floor(Math.random() * 2) + 1;
  }

  public initHexBlocks(): void {
    this.hexagonRenderPass = new RenderPass(this.extVAO, this.ctx, hexVSText, hexFSText);

    // let a = [2,2,2,1,1,1];
    // let b = new Vec2 ([-1,-4]);
    // let hl = []
    // a.forEach(element => {
    //   hl.push(new HexColumn (element, b)); 
    // });
    
    // let h = new HexColumn (5, b);
    // h.createCache(hl);
    let h = new HexBlock (new Vec3([0,1,0]));
    for (let i = 0; i < 8; i++) {
      h.reveal(i);
    }
    // h.setHidden(1);
    // let h = new HexGrid(new Vec2([-16,0]), HexGrid.perlin, 0);
    // h.generate();
    let d = h.getData();
    // let d = [[],[],[]];
    let fIndices : number[] = d[1];
    let fNorms : number[] = d[2];
    let fVert :number[] = d[0];
    let fText : number[] = d[3];

    this.hexagonRenderPass.setIndexBufferData(new Uint32Array(fIndices));

    this.hexagonRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(fVert));
    
    this.hexagonRenderPass.addAttribute("aNorm", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(fNorms));

    this.hexagonRenderPass.addAttribute("aTextureCoord", 2, this.ctx.FLOAT, false,
      2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array(fText));

    this.hexagonRenderPass.addUniform("uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightDir.xyzw);
    });
    
    this.hexagonRenderPass.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
    });
    this.hexagonRenderPass.addUniform("mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.hexagonRenderPass.addUniform("mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });
    this.hexagonRenderPass.addUniform("uSampler",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1i(loc, 0);
    });


    this.hexagonRenderPass.addUniform("cPos",
    (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
      gl.uniform3fv(loc, this.getGUI().camera.pos().xyz);
    });
    this.hexagonRenderPass.addTextureMap("minecraft_tree_wood.jpg");
    this.hexagonRenderPass.setDrawData(this.ctx.TRIANGLES,
      fIndices.length, this.ctx.UNSIGNED_INT, 0);
    this.hexagonRenderPass.setup();
  }

  public initDebug() {
    this.debugPass.setIndexBufferData(new Uint32Array([]));

    this.debugPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, new Float32Array([]));

    this.debugPass.addUniform("mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
    });
    this.debugPass.addUniform("mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.projMatrix().all()));
    });
    this.debugPass.addUniform("mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(this.gui.viewMatrix().all()));
    });

    this.debugPass.setDrawData(this.ctx.LINES,
      0, this.ctx.UNSIGNED_INT, 0);
    this.debugPass.setup();
  }
  /**
   * Sets up the floor drawing
   */
  

  /** @internal
   * Draws a single frame
   *
   */
  public draw(): void {
    // Advance to the next time step
    let curr = new Date().getTime();
    let deltaT = curr - this.millis;
    this.millis = curr;
    //
    this.getGUI().incrementTime(deltaT);
    deltaT /= 1000;

    if (this.islight) {
      this.lightDir = new Vec4 ([Math.cos(curr * Math.PI / 36000), Math.sin(curr * Math.PI / 36000), 0 , 0]);
      this.lightDir.normalize();
    }
    
    // TODO
    // If the mesh is animating, probably you want to do some updating of the skeleton state here
    
    // draw the status message
    /*
    if (this.ctx2) {
      this.ctx2.clearRect(0, 0, this.ctx2.canvas.width, this.ctx2.canvas.height);
      if (this.scene.meshes.length > 0) {
        this.ctx2.fillStyle = "#000000";
        this.ctx2.fillRect(20, 650, 2, 100);
        this.ctx2.fillRect(this.ctx2.canvas.width - 20, 650, 2, 100);
        const len = this.getGUI().getKeyFrameLengths();
        let total = 0;
        for (let i = 1; i < len.length; i++) {
          total += len[i]
        }
        let tick = (this.ctx2.canvas.width - 40) / total;
        let tTotal = 0;
        this.ctx2.fillStyle = "#FFFFFF";

        for (let i = 1; i < len.length; i++) {
          this.ctx2.fillRect(20 + tTotal + tick * len[i], 650, 2, 100);
          tTotal += tick * len[i];
        }
        this.ctx2.fillStyle = "#FF0000";
        this.ctx2.fillRect(20 + tick * this.getGUI().getTime() / 1000, 660, 2, 80);
        this.ctx2.fillStyle = "#FFFFFF";

        //this.ctx2.fillRect((this.ctx2.canvas.width / 2) - 1, 600, 2, 200);
        this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
      }
    }
    */


    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    this.drawScene(0, 200, 800, 600);    

    /* Draw status bar */
    if (this.scene.meshes.length > 0) {
      gl.viewport(0, 0, 800, 200);
      //this.sBackRenderPass.draw();      
    }    

  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);

    this.floorRenderPass.draw();

    /* Draw Scene */
    

    let cam_pos = this.getGUI().getCameraPos();
    let npos : [number, number] = [Math.floor (cam_pos.x / 16) * 16, Math.floor (cam_pos.y / 13.5) * 16];

    // if (npos[0] != this.pos.x || npos[1] != this.pos.y) {

    //   this.pos = new Vec2 (npos);
    //   let hgl : HexGrid[] = [];
    //   for (let i = -1; i < 2; i++) {
    //     for (let j = -1; j < 2; j++) {
    //       let new_g_pos : [number, number] = [npos[0] + i * 16, npos[1] + j * 16]
    //       let s = new_g_pos.join(' ');
    //       if (! (s in this.loaded)) {
    //         let g = new HexGrid(new Vec2 (new_g_pos), HexGrid.perlin, this.seed);
    //         g.generate();
    //         this.loaded[s] = g;
    //       }
    //       hgl.push (this.loaded[s]);
    //     }
    //   }
      
    //   let fIndices : number[] = []
    //   let fVert = []
    //   let fNorms : number[] = []

    //   hgl.forEach(grid => {
    //     let data = grid.getData();
    //     let v = data[0];
    //     let i = data[1];
    //     let n = data[2];
    //     for (let ind = 0; ind < i.length; ind++) {
    //       i[ind] += fVert.length / 3;
    //     }
    //     fIndices.push(...i);
    //     fVert.push(...v);
    //     fNorms.push(...n);
    //   });

    //   this.hexagonRenderPass.updateAttr("vertPosition", new Float32Array(fVert));
    //   this.hexagonRenderPass.updateAttr("aNorm", new Float32Array(fNorms));
    //   this.hexagonRenderPass.updateIndex(new Uint32Array(fIndices));
    //   this.hexagonRenderPass.setDrawData(this.ctx.TRIANGLES,
    //     fIndices.length, this.ctx.UNSIGNED_INT, 0);
    // }
    this.hexagonRenderPass.draw();

      // this.sceneRenderPass.draw();
      // gl.disable(gl.DEPTH_TEST);
      // this.skeletonRenderPass[0].draw();
      // this.skeletonRenderPass[0].updateAttr("highlight", this.scene.meshes[0].getHighlightedBones());
      //this.scene.meshes[0].rotateBone(Quat.fromAxisAngle(new Vec3([1,1,0]), 0.01), 0);
      
      // this.debugPass.draw();
      // let h1 = new HexColumn(1, new Vec2([0,0]));
      // let data = new Float32Array(h1.getVertex());
      // this.debugPass.updateAttr("vertPosition", data);

      // this.debugPass.updateIndex(new Uint32Array(h1.visCache[0].getIndex(0)));
      // this.debugPass.setDrawData(this.ctx.LINES, h1.visCache[0].getIndex(0).length, this.ctx.UNSIGNED_INT, 0);      
      // TODO
      // Also draw the highlighted bone (if applicable)
    
  }

  public getGUI(): GUI {
    return this.gui;
  }
  
  /**
   * Loads and sets the scene from a Collada file
   * @param fileLocation URI for the Collada file
   */
  public setScene(): void {
    const seed_val = document.getElementById("seed") as HTMLInputElement;
    this.seed = seed_val.value;
    this.loaded = {};
    this.render = {};
    this.initScene();
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  const slider = document.getElementById("light") as HTMLInputElement;
  slider.addEventListener("change", (event) => {
    let t = event.target as HTMLInputElement;

    //@ts-ignore
    window.renderer.islight = t.checked;

  })
  /* Start drawing */
  const canvasAnimation: SkinningAnimation = new SkinningAnimation(canvas);
  canvasAnimation.start();
  canvasAnimation.setScene();
}
