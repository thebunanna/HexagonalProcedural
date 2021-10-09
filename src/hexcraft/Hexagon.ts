import { Mat3, Mat4, Quat, Vec2, Vec3 } from "../lib/TSM.js";


const dist = (1 / (Math.sqrt(3)));
export class HexBlock {
    origin: Vec3;

    vcache: Float32Array;
    icache: Uint32Array;

    public bHidden: Array<Boolean>;

    static readonly bVec = [
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
        0, -1, 0,

        0, 0, -dist, //0
        -0.5, 0, -dist/2, //1
        0, -1, -dist, //7
        -0.5, -1, -dist/2, //8 

        -0.5, 0, -dist/2, //1
        -0.5, 0, dist/2, //2
        -0.5, -1, -dist/2, //8
        -0.5, -1, dist/2, //9
        
        -0.5, 0, dist/2,  //2
        0, 0, dist,  //3
        -0.5, -1, dist/2, //9
        0, -1, dist, //10

        0, 0, dist, 
        0.5, 0, dist/2, 
        0, -1, dist, 
        0.5, -1, dist/2, 

        0.5, 0, dist/2, 
        0.5, 0, -dist/2, 
        0.5, -1, dist/2, 
        0.5, -1, -dist/2, 

        0.5, 0, -dist/2, //5
        0, 0, -dist, //0
        0.5, -1, -dist/2, //12 
        0, -1, -dist, //7

    ];

    static readonly bInd =  [ 
        //upper hex
        0,1,6,  1,2,6,
        2,3,6,  3,4,6,
        4,5,6,  5,0,6,

        0, 6, 1, 1, 6, 2, 
        2, 6, 3, 3, 6, 4, 
        4, 6, 5, 5, 6, 0,
        //lower hex
        // 7,13,8,  8,13,9,
        // 9,13,10,  10,13,11,
        // 11,13,12,  12,13,7,

        14,16,17,   14,17,15,
        18, 20, 21, 18, 21, 19,
        22, 24, 25, 22, 25, 23,
        26, 28, 29, 26, 29, 27,
        30, 32, 33, 30, 33, 31,
        34, 36, 37, 34, 37, 35,
        //sides
        // 0,7,8,  0,8,1,
        // 1,8,9,  1,9,2,
        // 2,9,10,  2,10,3,
        // 3,10,11,  3,11,4,
        // 4,11,12,  4,12,5,
        // 5,12,7,  5,7,0,
        
    ];

    static readonly bNorm = [
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
        this.bHidden = new Array<Boolean>(8);
        for (let i = 0; i < this.bHidden.length; i++) {
            this.bHidden[i] = true;
        }
    }

    public setHidden (ind : number) {
        this.bHidden[ind] = true;
        this.vcache = null;
    }
    public reveal (ind : number) {
        this.bHidden[ind] = false;
        this.vcache = null;
    }

    public getData () : [number[], number[], number[], number[]] {
        let base = [...HexBlock.bVec]

        for (let i = 0; i < base.length / 3; i++) {
            base[i*3] += this.origin.x;
            base[i*3 + 1] += this.origin.y;
            base[i*3 + 2] += this.origin.z;
        }

        let vdata : number[] = [];
        let idata : number[] = [];
        let ndata : number[] = [];
        let tdata : number[] = [];

        if (!this.bHidden[0]) {
            for (let i = 0; i < 7; i++) {
                vdata.push (base[i*3], base[i*3+1], base[i*3+2]);
                ndata.push (HexBlock.bNorm[i*3], HexBlock.bNorm[i*3 + 1], HexBlock.bNorm[i*3 + 2]);
                tdata.push (HexBlock.bVec[i*3] + 0.5, HexBlock.bVec[i*3+2] + 0.5);
            }

            for (let i = 0; i < 6; i++) {
                idata.push (HexBlock.bInd[i*3], HexBlock.bInd[i*3+1], HexBlock.bInd[i*3+2])
            }
        }
        if (!this.bHidden[1]) {
            let len = vdata.length / 3;

            for (let i = 7; i < 14; i++) {
                vdata.push (base[i*3], base[i*3+1], base[i*3+2])
                ndata.push (HexBlock.bNorm[i*3], HexBlock.bNorm[i*3 + 1], HexBlock.bNorm[i*3 + 2]);
                tdata.push (HexBlock.bVec[i*3] + 0.5, HexBlock.bVec[i*3+2] + 0.5);
            }
            for (let i = 6; i < 12; i++) {
                idata.push (HexBlock.bInd[i*3] + len, HexBlock.bInd[i*3+1] + len, HexBlock.bInd[i*3+2] + len)

            }
        }
        for (let i = 0; i < 6; i++) {
            if (!this.bHidden[i + 2]) {
                let len = vdata.length / 3;
                let vecs = []
                for (let j = 14 + i * 4; j < 14 + i * 4 + 4; j++) {
                    let a = new Vec3([base[j*3], base[j*3 + 1], base[j*3 + 2]])
                    vecs.push(a);
                    vdata.push (...a.xyz);
                    
                    // ndata.push (0, 1, 0,);
                }
                
                tdata.push (
                    (1 + dist)/2, 1, 
                    (1 - dist)/2, 1, 
                    (1 + dist)/2, 0, 
                    (1 - dist)/2, 0, 
                );

                let ind = [0, 2, 3, 0, 3, 1];
                
                ind.forEach(element => {
                    idata.push (element + len)
                });

                let dir = Vec3.cross (Vec3.difference(vecs[2], vecs[1]), Vec3.difference(vecs[0], vecs[1]));
                dir.normalize();                
                for (let i = 0; i < 4; i++) {
                    ndata.push (...dir.xyz)
                }
                
            }
        }
        return [vdata, idata, ndata, tdata];
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
    public visCache : Array<[HexBlock, number]>;
    public position : Vec2;
    private neighbors : Array<HexColumn>;
    
    private height : number;
    private gpos : Vec2;

    private dirt = 0;

    public static readonly type = {
        'air' : 0,
        'dirt' : 1,
        'grass' : 2,
        'stone' : 3,
        'leaf' : 4,
        'wood' : 5,
        'water' : 6,
    };

    constructor (height : number, pos : Vec2, seed : string) {
        this.gpos = pos.copy();
        this.height = height;
        this.position = pos.copy();
        if (this.position.y % 2 != 0) {
            this.position.x += this.position.y % 2 * 0.5;
        }

        this.position.y *= 1.5 * dist; 
        // console.log (this.position.xy, pos.xy);
        if (height >= this.count) {
            height = this.count - 1;
        }
        this.blocks = new Uint32Array(this.count);

        if (height < 1) {
            this.blocks[0] = HexColumn.type['water'];
            return;
        }
        //@ts-ignore
        var seedrand = new Math.seedrandom(this.gpos.x.toString() + seed + this.gpos.y.toString());

        let r1 = Math.floor (seedrand() * 4 + 2);
        for (let i = 0; i < this.count; i++) {
            if (i > height) {
                this.blocks[i] = HexColumn.type['air'];
            }
            else if (i == Math.floor(height)) {
                this.blocks[i] = HexColumn.type['grass'];
            }
            else if (i + r1 > height) {
                this.blocks[i] = HexColumn.type['dirt'];
            }
            else {
                this.blocks[i] = HexColumn.type['stone'];
            }
        }
        
        
        // this.createCache();
    }

    public setNeighbors (others : Array<HexColumn>) : void {
        this.neighbors = others;
        console.assert (this.neighbors.length == 6);
    }

    public createCache() : void {
        
        this.visCache = new Array<[HexBlock,number]>();
        for (let i = 0; i < this.count; i++) {
            // if (this.blocks[i] == HexColumn.type['water']) {
            //     console.log ("is water");
            // }
            if (this.blocks[i] == HexColumn.type['air']) { 
                continue;
            }
            
            let below = i - 1;            
            let above = i + 1;

            if (below == -1) {
                below = 0;
            }

            let block = new HexBlock(new Vec3 ([this.position.x, i, this.position.y]));
            let flag = false;
            // this.visCache.push(new HexBlock(new Vec3 ([this.position.x, i, this.position.y])))
            if (this.blocks[below] == HexColumn.type['air']) {
                block.reveal(1);
                flag = true;
            }
            if (above == this.count || this.blocks[above] == HexColumn.type['air']) {
                block.reveal(0);
                flag = true;

            }
            for (let j = 0; j < this.neighbors.length; j++) {
                if (this.neighbors[j] == undefined) {
                    continue;
                }
            
                if (this.neighbors[j].blocks[i] == HexColumn.type['air']) {
                    block.reveal(j + 2);
                    flag = true;
                }
            }

            if (flag) {
                // if (i == 11 && !block.bHidden[0]) {
                //     for (let j = 0; j < others.length; j++) {
                //         console.log (others[j].gpos.xy, Math.floor (others[j].height));
                //     }
                //     console.log (this.gpos.xy, i, block.bHidden);
                // }
                
                this.visCache.push([block, this.blocks[i]])
            }
        
        }
    }

    public add_block (index : number, type : string) : boolean {
        if (!(type in HexColumn.type)) {
            return false;
        }

        if (this.blocks[index] != HexColumn.type['air']) {
            return false;
        }

        // console.log ("added block", index, type);
        this.blocks[index] = HexColumn.type[type];
        return true;
    }

    //returns true if edited.
    public delete_block (index : number) : boolean {
        if (this.blocks[index] == HexColumn.type['air']) {
            return false;
        }
        this.blocks[index] = HexColumn.type['air'];

        return true;
    }

    public check_empty (index : number) : boolean {
        if (this.blocks[index] == HexColumn.type['air']) {
            return true;
        }
        return false;
    }

    public get_neighbors () : Array<HexColumn> {
        return this.neighbors;
    }

    public check_clearance (start : number, height : number, width : number) : boolean {
        
        let n = {}
        this.get_neighbors().forEach((e)=> {
            n[e.gpos.x.toString() + " " + e.gpos.y.toString()] = e;
        });
        n[this.gpos.x.toString() + " " + this.gpos.y.toString()] = this;
        let pos = Math.floor (this.height) + start;

        for (let i = pos; i < pos + height; i++) {
            for (const key in n) {
                if (!n[key].check_empty(i)) {
                    return false;
                }               
            }            
        }
        return true;
    }

    public get_height () : number  {
        return Math.floor(this.height);
    }
    

    public getData() :[number[][],number[][],number[][],number[][]] {
        let ver : number[][] = [];
        let ind : number[][] = [];
        let nor : number[][] = [];
        let tex : number[][] = [];

        for (const key in HexColumn.type) {
            ver.push([]);
            ind.push([]);
            nor.push([]);
            tex.push([]);
        }

        this.visCache.forEach(element => {
            let block = element[0];
            let id = element[1];
            let vlen = ver[id].length / 3;
            let d = block.getData();

            for (let i = 0; i < d[1].length; i++) {
                d[1][i] += vlen;
            }
            ver[id].push(...d[0]);
            ind[id].push(...d[1]);
            nor[id].push(...d[2]);
            tex[id].push(...d[3]);
        });
        
        return [ver, ind, nor, tex]
    }
}

export class HexGrid {
    static readonly chunk_x : number = 16;
    static readonly chunk_y : number = 16;
    public position : Vec2;
    private func : Function;
    private seed : string;

    private grid : HexColumn[][];
    constructor (pos : Vec2, f : Function, s : string) {
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
        let cv = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);

        //@ts-ignore
        var seedrand = new Math.seedrandom(d[0].toString() + seed + d[1].toString());
        let dv = new Vec2([seedrand() - 0.5, seedrand() - 0.5]);


        // av.normalize();
        // bv.normalize();
        // cv.normalize();
        // dv.normalize();
        
        // console.log (av.xy, bv.xy, cv.xy, dv.xy);
        let xc = x / HexGrid.chunk_x;
        let yc = y / HexGrid.chunk_y;

        let at = new Vec2([a[0] - xc, a[1] - yc])
        let bt = new Vec2([b[0] - xc, b[1] - yc])
        let ct = new Vec2([c[0] - xc, c[1] - yc])
        let dt = new Vec2([d[0] - xc, d[1] - yc])

        at.scale(1/8);
        bt.scale(1/8);
        ct.scale(1/8);
        dt.scale(1/8);
        // at.normalize();
        // bt.normalize();
        // ct.normalize();
        // dt.normalize();

        let nuv = new Vec2([1 - uv.x, 1 - uv.y]);
        
        let top = nuv.x * Vec2.dot(av, at) + uv.x * Vec2.dot(bv, bt);
        let bot = nuv.x * Vec2.dot(cv, ct) + uv.x * Vec2.dot(dv, dt);
        let res = nuv.y * top + uv.y * bot
        
        //Biome stuff

        for (let i = 0; i < 2; i++) {
            a[i] = Math.floor (a[i] / 8);
            b[i] = Math.floor (b[i] / 8);
            c[i] = Math.floor (c[i] / 8);
            d[i] = Math.floor (d[i] / 8);
        }

        //@ts-ignore
        seedrand = new Math.seedrandom(a[0].toString() + seed + a[1].toString() + 'var');
        let a_var = (seedrand() + 0.1) * 32;
        let a_off = (seedrand() - 0.25) * 16;
        //@ts-ignore
        seedrand = new Math.seedrandom(b[0].toString() + seed + b[1].toString() + 'var');
        let b_var = (seedrand() + 0.1) * 32;
        let b_off = (seedrand() - 0.25) * 16;

        //@ts-ignore
        seedrand = new Math.seedrandom(c[0].toString() + seed + c[1].toString() + 'var');
        let c_var = (seedrand() + 0.1) * 32;
        let c_off = (seedrand() - 0.25) * 16;

        //@ts-ignore
        seedrand = new Math.seedrandom(d[0].toString() + seed + d[1].toString() + 'var');
        let d_var = (seedrand() + 0.1) * 32;
        let d_off = (seedrand() - 0.25) * 16;

        let vtop = nuv.x * a_var + uv.x * b_var;
        let vbot = nuv.x * c_var + uv.x * d_var;
        let variance = nuv.y * vtop + uv.y * vbot;

        let otop = nuv.x * a_off + uv.x * b_off;
        let obot = nuv.x * c_off + uv.x * d_off;
        let offset = nuv.y * otop + uv.y * obot;
        return Math.ceil ((res + 1) * variance) + offset;
    }

    public generate () : void {
        this.grid = Array<Array<HexColumn>>(HexGrid.chunk_x);
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            this.grid[i] = new Array<HexColumn>(HexGrid.chunk_y);
        }
        let others = {};
        
        for (let i = -1; i < HexGrid.chunk_x + 1; i++) {
            for (let j = -1; j < HexGrid.chunk_y + 1; j++) {
                let pos = this.position.copy().xy;
                pos[0] += i;
                pos[1] += j;
                let res = this.func(pos[0],pos[1], this.seed);
                // console.log (res)
                if (i >= 0 && i < HexGrid.chunk_x && j >= 0 && j < HexGrid.chunk_y) {
                    this.grid[i][j] = new HexColumn(res, new Vec2(pos), this.seed);
                }
                else {
                    others[i.toString() + " " + j.toString()] = new HexColumn(res, new Vec2(pos), this.seed);
                }
            }
        }
        let neighbors_even: [number, number][], neighbors_odd : [number, number][];
        if (this.position.y < 0) {
            neighbors_odd = [[-1,-1], [-1,0],[-1,1],[0,1],[1,0],[0,-1]]
            neighbors_even = [[0,-1],[-1,0],[0,1],[1,1],[1,0],[1,-1]];
        }
        else {
            neighbors_even = [[-1,-1], [-1,0],[-1,1],[0,1],[1,0],[0,-1]]
            neighbors_odd = [[0,-1],[-1,0],[0,1],[1,1],[1,0],[1,-1]];
        }
        
        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                
                let neighbors = j % 2 ? neighbors_odd : neighbors_even;

                let n = new Array<HexColumn>();
                neighbors.forEach(element => {
                    let pos = [...element]
                    pos[0] += i;
                    pos[1] += j;
                    // try {
                    // } catch (error) {
                        
                    // }
                    if (pos[0] >= 0 && pos[0] < HexGrid.chunk_x && pos[1] >= 0 && pos[1] < HexGrid.chunk_y) {
                        n.push(this.grid[pos[0]][pos[1]]);
                    }
                    else {


                        // if (pos[1] >= 0 && this.position.y < 0) {
                        //     n.push(new HexColumn(0, new Vec2 ([0,0])));
                        // }

                        try {
                            n.push (others[pos[0].toString() + " " + pos[1].toString()]);
                        } catch (error) {
                            console.log (" oh no ");
                        }
                    }
                });
                this.grid[i][j].setNeighbors(n);
                
            }
        }
        this.gen_tree();
        for (let i = 0; i < HexGrid.chunk_x; i++) 
            for (let j = 0; j < HexGrid.chunk_y; j++) 
                this.grid[i][j].createCache();
    }

    private gen_tree() : void {
        //@ts-ignore
        let seedrand = new Math.seedrandom(this.position.x.toString() + this.seed + this.position.y.toString() + 'tree');


        for (let i = 2; i < HexGrid.chunk_x - 2; i++) {
            for (let j = 2; j < HexGrid.chunk_y - 2; j++) {
                let col = this.grid[i][j];
                let h = col.get_height();

                let r = seedrand();
                let len = Math.floor (seedrand() * 5) + 2;
                if (r > 0.95 && h >= 2) {
                    
                    if (col.check_clearance(1, 5, 1)) {
                        for (let i = 0; i < len; i++) {
                            col.add_block(h + i + 1, "wood");

                        }
                        
                        col.get_neighbors().forEach(element => {
                            element.add_block(h+len, "leaf");
                        });
                        col.add_block(h+ len + 1, "leaf");
                    }
                }
                this.grid[i][j] = col;
            }

        }
            
        

    }

    public getData() : [number[][], number[][], number[][], number[][]] {
        let ver : number[][] = [];
        let ind : number[][] = [];
        let nor : number[][] = [];
        let tex : number[][] = [];

        for (const key in HexColumn.type) {
            ver.push([]);
            ind.push([]);
            nor.push([]);
            tex.push([]);
        }

        for (let i = 0; i < HexGrid.chunk_x; i++) {
            for (let j = 0; j < HexGrid.chunk_y; j++) {
                let d = this.grid[i][j].getData();

                for (let k = 0; k < d[0].length; k++) {
                    let col_ver = d[0][k];
                    let col_ind = d[1][k];
                    let col_nor = d[2][k];
                    let col_tex = d[3][k];
                    let vlen = ver[k].length / 3;
                    for (let a = 0; a < col_ind.length; a++) {
                        col_ind[a] += vlen;
                    }
                    ind[k].push(...col_ind);
                    ver[k].push(...col_ver);
                    nor[k].push(...col_nor);
                    tex[k].push(...col_tex);
                }

                
            }
        }
        return [ver, ind, nor, tex];
    }

}