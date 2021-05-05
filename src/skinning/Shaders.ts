export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
    }
`;

export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        gl_FragColor = vec4(clamp(dot_nl * color, 0.0, 1.0), 1.0);
    }
`;

export const sceneVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec2 aUV;
    attribute vec3 aNorm;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;
    
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    // uniform vec4 dMats[256];
    // uniform vec4 uMats[256];

    void main () {
        vec3 trans = vertPosition;
        //vec4 worldPosition = mWorld * vec4(trans, 1.0);

        int xi = int (skinIndices.x);
        int yi = int (skinIndices.y);
        int zi = int (skinIndices.z);
        int wi = int (skinIndices.w);
        vec4 worldPosition = 
            skinWeights.x * vec4(jTrans[xi] + qtrans(jRots[xi], v0.xyz), 1.0)
            + skinWeights.y * vec4(jTrans[yi] + qtrans(jRots[yi], v1.xyz), 1.0)
            + skinWeights.z * vec4(jTrans[zi] + qtrans(jRots[zi], v2.xyz), 1.0)
            + skinWeights.w * vec4(jTrans[wi] + qtrans(jRots[wi], v3.xyz), 1.0);

        gl_Position = mProj * mView * worldPosition;
        
        //  Compute light direction and transform to camera coordinates
        lightDir = lightPosition - worldPosition;
        
        vec4 aNorm4 = vec4(aNorm, 0.0);
        vec4 norm = skinWeights.x * vec4(qtrans(jRots[xi], aNorm), 0.0)
         + skinWeights.y * vec4(qtrans(jRots[yi], aNorm), 0.0)
         + skinWeights.z * vec4(qtrans(jRots[zi], aNorm), 0.0)
         + skinWeights.w * vec4(qtrans(jRots[wi], aNorm), 0.0);
        normal = normalize(mWorld * norm);

        uv = aUV;
    }

`;

export const sceneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;

    void main () {
        gl_FragColor = vec4((normal.x + 1.0)/2.0, (normal.y + 1.0)/2.0, (normal.z + 1.0)/2.0,1.0);
    }
`;

export const skeletonVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute float boneIndex;
    attribute float highlight;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 bTrans[64];
    uniform vec4 bRots[64];

    varying float high;

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        int index = int(boneIndex);
        gl_Position = mProj * mView * mWorld * vec4(bTrans[index] + qtrans(bRots[index], vertPosition), 1.0);
        high = highlight;
    }
    
`;

export const skeletonFSText = `
    precision mediump float;
    varying float high;

    void main () {
        gl_FragColor = vec4(1.0, high, 0.0, 1.0);
    }
`;
export const hexVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 aNorm;

    uniform vec4 uLightPos;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    varying vec4 lightDir;
    varying vec4 normal;   

    void main () {
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        lightDir = uLightPos - vec4(vertPosition, 1.0);
        normal = vec4 (aNorm, 0.0);
    }
`;

export const hexFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   

    void main () {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.0);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;
export const debugVSText = `
    precision mediump float;

    attribute vec3 vertPosition;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    void main () {
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
    }
`;

export const debugFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
`;

export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;

export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;