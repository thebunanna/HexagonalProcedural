import { Mat3, Mat4, Quat, Vec2, Vec3 } from "../lib/TSM.js";

export class RandomGen {
    private width : number;
    private height : number;
    
    private rand : Function;

    constructor (width : number, height : number) {
        this.width = width;
        this.height = height;
    }

    public set_seed (seed : string) {
        //@ts-ignore
        this.rand = new Math.seedrandom(seed);
    }

    public get_rand () : number {
        if (this.rand == undefined) {
            console.log ("hi htere");
            //@ts-ignore
            this.rand = new Math.seedrandom();
        }
        return this.rand();
    }

    public get_texture (gl : WebGLRenderingContext, type : string) {
        if (type == "white") {
            return this.get_bw_texture(gl, 128, 255);
        }
        if (type == "sin_perlin") {
            return this.get_perlin_texture (gl, (uv, val)=> {
                return (Math.sin (30 * (uv.y + 0.2 * val)) + 1) / 2 * 128 + 128;
            });
        }
        if (type == "perlin") {
            return this.get_perlin_texture (gl, (uv, val)=> {
                return Math.floor ((val + 1) / 2 * 255);
            });
        }
        if (type == "white_perlin") {
            return this.get_perlin_texture (gl, (uv, val)=> {
                let v = (this.get_rand() - 0.5) * 0.2;
                return Math.floor (Math.max(0, (val + 1) / 2 + v) * 255);
            });
        }
    }

    public get_bw_texture (gl : WebGLRenderingContext, start : number, end : number) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = this.width;
        const height = this.height;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        let pixels = []
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.width; j++) {
                let value = Math.ceil (this.get_rand() * (end - start) + start);
                pixels.push (...[value, value, value, 255]);
            }
        }
        const pixel = new Uint8Array(pixels);  // opaque blue
        
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border, srcFormat, srcType,
                        pixel);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }

    public get_perlin_texture (gl : WebGLRenderingContext, func : Function) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = this.width;
        const height = this.height;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        let pixels = []

        let nmap_len = 2;
        let alpha = 0.2;
        // let beta = 0.1;


        let rlist = new Array<Array<Vec2>>((nmap_len + 1));

        for (let i = 0 ; i < nmap_len + 1; i++) {
            rlist[i] = new Array<Vec2>(nmap_len + 1)
            for (let j = 0; j < nmap_len + 1; j++) {
                rlist[i][j] = new Vec2 ([this.get_rand(), this.get_rand()]);

            }
        }

        const wnmap = width / nmap_len;
        const hnmap = height/ nmap_len;

        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                let nm_coord = [Math.floor(i / wnmap), Math.floor(j / hnmap)];

                let dist : [number, number][] = [
                                [0, 0], 
                                [1, 0], 
                                [0, 1], 
                                [1, 1]];

                let av = rlist[nm_coord[0]][nm_coord[1]].copy();
                let bv = rlist[nm_coord[0] + 1][nm_coord[1]].copy();
                let cv = rlist[nm_coord[0]][nm_coord[1] + 1].copy();
                let dv = rlist[nm_coord[0] + 1][nm_coord[1] + 1].copy();

                let ti = (i - wnmap * nm_coord[0]) / wnmap + 0.5 / wnmap;
                let tj = (j - hnmap * nm_coord[1]) / hnmap + 0.5 / hnmap;

                let at = new Vec2 ([-ti + dist[0][0], -tj + dist[0][1]]);
                let bt = new Vec2 ([-ti + dist[1][0], -tj + dist[1][1]]);
                let ct = new Vec2 ([-ti + dist[2][0], -tj + dist[2][1]]);
                let dt = new Vec2 ([-ti + dist[3][0], -tj + dist[3][1]]);
                at.normalize();
                bt.normalize();
                ct.normalize();
                dt.normalize();

                let uv = new Vec2 ([ti,tj]);
                let nuv = new Vec2([1 - uv.x, 1 - uv.y]);
                let top = nuv.x * Vec2.dot(av, at) + uv.x * Vec2.dot(bv, bt);
                let bot = nuv.x * Vec2.dot(cv, ct) + uv.x * Vec2.dot(dv, dt);
                let res = nuv.y * top + uv.y * bot;


                // let value = Math.floor ((res + 1) / 2 * 255);
                // console.log (ti,tj, dv.xy, Vec2.dot(dv, dt));
                let value = func (uv, res);
                // let value = (Math.sin (30 * (uv.y + alpha * res)) + 1) / 2 * 128 + 128;
                // console.log (value);

                // let value = 100;
                pixels.push (...[value, value, value, 255]);
            }
        }

        const pixel = new Uint8Array(pixels);  // opaque blue
        
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border, srcFormat, srcType,
                        pixel);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }   
}