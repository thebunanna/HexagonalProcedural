import { Mat3, Mat4, Quat, Vec2, Vec3 } from "../lib/TSM.js";


const dist = (1 / (Math.sqrt(3)));
export class HexBlock {
    origin: Vec3;

    vcache: Float32Array;
    icache: Uint32Array;

    readonly bVec = [
        0, 0, -dist, 
        -0.5, 0, -dist/2, 
        -0.5, 0, dist/2, 
        0, 0, dist, 
        0.5, 0, dist/2, 
        0.5, 0, -dist/2, 
        0, 0, 0,

        0, -1, -dist, 
        -0.5, -1, -dist/2, 
        -0.5, -1, dist/2, 
        0, -1, dist, 
        0.5, -1, dist/2, 
        0.5, -1, -dist/2, 
        0, -1, 0
    ];

    readonly bInd =  [ 
        //upper hex
        0,1,6,  1,2,6,
        2,3,6,  3,4,6,
        4,5,6,  5,0,6,

        //lower hex
        7,13,8,  8,13,9,
        9,13,10,  10,13,11,
        11,13,12,  12,13,7,

        //sides
        0,7,8,  0,8,1,
        1,8,9,  1,9,2,
        2,9,10,  2,10,3,
        3,10,11,  3,11,4,
        4,11,12,  4,12,5,
        5,12,7,  5,7,0,
        
    ];

    readonly bNorm = [
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
        0, -1, 0,
    ]
    constructor (ori : Vec3) {
        this.origin = ori.copy();
    }

    public getVertex () : number[] {

        let base = [...this.bVec]

        for (let i = 0; i < 14; i++) {
            base[i*3] += this.origin.x;
            base[i*3 + 1] += this.origin.y;
            base[i*3 + 2] += this.origin.z;
        }


        return base;
    }
    public getIndex (off : number) : number[] {
        off = Math.trunc(off);
        let base = [...this.bInd];
        //let m = Math.max(...base) + 1
        let l = base.length;
        for (let i = 0; i < l; i++) {
            base[i] += off;
        }

        return base;
    }

    public getNormals() : number[] {
        return [...this.bNorm];
    }

    public getDebugIndex (off : number) {
        off = Math.trunc(off);
        let base = [ 
            //upper hex
            0,1,    1,2,
            2,3,    3,4,
            4,5,    5,0,

            7,8,    8,9,
            9,10,   10,11,
            11,12,  12,7,

            0,7,    1,8,
            2,9,    3,10,
            4,11,   5,12    
        ];
        //let m = Math.max(...base) + 1
        let l = base.length;
        for (let i = 0; i < l; i++) {
            base[i] += off;
        }

        return base;
    }
}

export class HexColumn {
    readonly count = 64;
    private blocks : Uint32Array;
    public visCache : Array<HexBlock>;
    public position : Vec2;

    constructor (height : number, pos : Vec2) {
        this.position = pos.copy();
        if (this.position.y % 2 != 0) {
            this.position.x += this.position.y % 2 * 0.5;
        }

        this.position.y *= 1.5 * dist;  
        if (height >= 64) {
            height = 63;
        }
        this.blocks = new Uint32Array(this.count);
        for (let i = 0; i < this.count; i++) {
            if (i >= height) {
                this.blocks[i] = 0
            }
            else {
                this.blocks[i] = 1;
            }
        }
        // this.createCache();
    }

    public createCache(others : Array<HexColumn>) : void {
        this.visCache = new Array<HexBlock>();
        for (let i = 0; i < this.count; i++) {

            if (this.blocks[i] == 0) {
                continue;
            }

            let a = i - 1;            
            let c = i + 1;

            if (a == -1) {
                a = 0;
            }
            if (c == this.count) {
                c = this.count - 1;
            }
            // this.visCache.push(new HexBlock(new Vec3 ([this.position.x, i, this.position.y])))
            if (this.blocks[a] == 0 || this.blocks[c] == 0) {
                this.visCache.push(new HexBlock(new Vec3 ([this.position.x, i, this.position.y])))
            }
            else {
                let res = others.some(col => {
                    return col.blocks[i] == 0
                });
                if (res) {
                    this.visCache.push(new HexBlock(new Vec3 ([this.position.x, i, this.position.y])))
                }
            }
            
        }
    }
    public getVertex() : number[] {
        let a = [];
        this.visCache.forEach(element => {
            a.push(...element.getVertex())
        });
        return a;
    }

    public getIndex(off : number) : number[] {
        let a = [];
        this.visCache.forEach(e => {
            a.push(...e.getIndex(off));
            //Change this out for more eff
            off += 14;
        });
        return a;
    }

    public getNormals() : number[] {
        let a = [];
        this.visCache.forEach(element => {
            a.push(...element.getNormals())
        });
        return a;
    }
}

var randoms = {}

for (let i = -2; i < 3; i++) {
    for (let j = -2; j < 3; j++) {
        //@ts-ignore
        var seedrand = new Math.seedrandom(i.toString() + '0' + j.toString());
        randoms[i.toString() + '0' + j.toString()] = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);
    }
}

var vis = {}
var count = {}
count[1] = 0;
count[2] = 0;
count[3] = 0;
count[4] = 0;
//@ts-ignore
window.vis = vis;

//@ts-ignore
window.count = count;

export class HexGrid {
    static readonly chunk_x : number = 16;
    static readonly chunk_y : number = 16;
    public position : Vec2;
    private func : Function;
    private seed : number;

    private grid : HexColumn[][];
    constructor (pos : Vec2, f : Function, s : number) {
        let x = Math.trunc (pos.x);
        let y = Math.trunc (pos.y);
        console.assert(x % HexGrid.chunk_x == 0);
        console.assert(y % HexGrid.chunk_y == 0);
        this.position = new Vec2 ([x, y]);
        this.func = f;
        this.seed = s;
    }

    public static perlin (x : number, y : number, seed : string) : number {
        let pos_x = 2 * Math.floor (x / HexGrid.chunk_x);
        let pos_y = 2 * Math.floor (y / HexGrid.chunk_y);
        let quad : number = 0;

        let a,b,c,d : [number, number];
        let uv : Vec2;
        
        const rel_x = x >= 0 ? x % HexGrid.chunk_x : (HexGrid.chunk_x - 1) + (x + 1) % HexGrid.chunk_x;
        const rel_y = y >= 0 ? y % HexGrid.chunk_y : (HexGrid.chunk_y - 1) + (y + 1) % HexGrid.chunk_y;
        const x_half = HexGrid.chunk_x / 2;
        const y_half = HexGrid.chunk_y / 2;
        //determine quadrant
        if (rel_x >= x_half) {
            if (rel_y >= y_half) {
                a = [pos_x, pos_y];
                b = [pos_x+1, pos_y];
                c = [pos_x, pos_y+1];
                d = [pos_x+1, pos_y+1];

                quad = 1;
                uv = new Vec2([rel_x - x_half, rel_y - y_half]);
            }
            else {
                a = [pos_x, pos_y-1];
                b = [pos_x+1, pos_y-1];
                c = [pos_x, pos_y];
                d = [pos_x+1, pos_y];
                quad = 2;
                uv = new Vec2([rel_x - x_half, rel_y]);
            }
        }
        else {
            if (rel_y >= y_half) {
                
                a = [pos_x-1, pos_y];
                b = [pos_x, pos_y];
                c = [pos_x-1, pos_y+1];
                d = [pos_x, pos_y+1];
                quad = 4;
                
                uv = new Vec2([rel_x, rel_y - y_half]);
            }
            else {
                a = [pos_x-1, pos_y-1];
                b = [pos_x, pos_y-1];
                c = [pos_x-1, pos_y];
                d = [pos_x, pos_y];
                quad = 3;
                uv = new Vec2([rel_x, rel_y]);
                // console.log (uv);
                // console.log (uv);
            }
        }
        uv.scale(1.0/8.0);

        uv.add(new Vec2([1.0 / HexGrid.chunk_x, 1.0 / HexGrid.chunk_x]))

        //@ts-ignore
        var seedrand = new Math.seedrandom(a[0].toString() + seed + a[1].toString());
        let av = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);
        
        //@ts-ignore
        var seedrand = new Math.seedrandom(b[0].toString() + seed + b[1].toString());
        let bv = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);

        //@ts-ignore
        var seedrand = new Math.seedrandom(c[0].toString() + seed + c[1].toString());
        let cv =new Vec2([seedrand() - 0.5, seedrand() - 0.5]);

        //@ts-ignore
        var seedrand = new Math.seedrandom(d[0].toString() + seed + d[1].toString());
        let dv = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);

        vis[a[0].toString() + seed + a[1].toString()] = true;
        vis[b[0].toString() + seed + b[1].toString()] = true;
        vis[c[0].toString() + seed + c[1].toString()] = true;
        vis[d[0].toString() + seed + d[1].toString()] = true;


        av.normalize();
        bv.normalize();
        cv.normalize();
        dv.normalize();
        
        // console.log (av.xy, bv.xy, cv.xy, dv.xy);
        let xc = x / HexGrid.chunk_x;
        let yc = y / HexGrid.chunk_y;

        let at = new Vec2([a[0] - xc, a[1] - yc])
        let bt = new Vec2([b[0] - xc, b[1] - yc])
        let ct = new Vec2([c[0] - xc, c[1] - yc])
        let dt = new Vec2([d[0] - xc, d[1] - yc])

        at.normalize();
        bt.normalize();
        ct.normalize();
        dt.normalize();

        let nuv = new Vec2([1 - uv.x, 1 - uv.y]);
        let top = nuv.x * Vec2.dot(av, at) + uv.x * Vec2.dot(bv, bt);
        let bot = nuv.x * Vec2.dot(cv, ct) + uv.x * Vec2.dot(dv, dt);
        let res = nuv.y * top + uv.y * bot

        if (res > 1) {
            console.log (x,y,uv.xy,quad, res);

        }
        
        count[quad] += 1;
        return Math.ceil ((res + 1) * 4);
    }

    public generate () : void{
        this.grid = Array<Array<HexColumn>>(HexGrid.chunk_x);
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            this.grid[i] = new Array<HexColumn>(HexGrid.chunk_y);
        }

        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                let pos = this.position.copy().xy;
                pos[0] += i;
                pos[1] += j;
                let res = this.func(pos[0],pos[1], this.seed);
                // console.log (res)
                this.grid[i][j] = new HexColumn(res, new Vec2(pos))
            }
        }

        let neighbors : [number, number][] = [[0,1], [1,0], [0, -1], [-1,-1], [-1, 0], [-1,1]]
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                let n = new Array<HexColumn>();
                neighbors.forEach(element => {
                    let pos = [...element]
                    pos[0] += i;
                    pos[1] += j;
                    if (pos[0] >= 0 && pos[0] < HexGrid.chunk_x) {
                        if (pos[1] >= 0 && pos[1] < HexGrid.chunk_y) {
                            n.push(this.grid[pos[0]][pos[1]]);
                        }
                    }
                });
                this.grid[i][j].createCache(n);
            }
        }
    }

    public getVertex() : number[] {
        let a = [];
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                a.push(...this.grid[i][j].getVertex())
            }
        }
        return a;
    }
    public getIndex(off : number) : number[] {
        let a = [];
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                // console.log (i,j)
                let ind = this.grid[i][j].getIndex(off);
                // console.log (off)
                // let m = Math.max (...ind);
                a.push(...ind)
                off = Math.max(...a) + 1
            }
        }
        return a;
    }
    public getNormals() : number[] {
        let a = [];
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                a.push(...this.grid[i][j].getNormals())
            }
        }
        return a;
    }

}