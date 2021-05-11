
export const hexVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec3 aNorm;
    attribute vec2 aTextureCoord;

    uniform vec4 uLightPos;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform vec3 cPos;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    void main () {
        gl_Position = mProj * mView * mWorld * vec4 (vertPosition, 1.0);
        lightDir = uLightPos;// - vec4(vertPosition, 1.0);
        normal = vec4 (aNorm, 0.0);
        vTextureCoord = aTextureCoord;

    }
`;

export const hexFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor *= vec4 (0.31, 0.14, 0.12, 0.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;

export const DirtFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor *= vec4 (0.239, 0.169, 0.122, 0.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;

export const GrassFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor *= vec4 (0.0627, 0.38, 0.133, 0.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;

export const StoneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor *= vec4 (0.518, 0.518, 0.51, 0.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;

export const LeafFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);

        // vec4 c1 = vec4(1.00, 0.718, 0.914, 0.0);
        // vec4 c2 = vec4(1.00, 0.718, 0.773, 0.0);
        
        // gl_FragColor = c1 * gl_FragColor.x + (1.0 - gl_FragColor) * c2;
        gl_FragColor *= vec4(1.00, 0.718, 0.914, 0.0);

        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;

export const WoodFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        // vec4 val = texture2D(uSampler, vTextureCoord);
        // float amt = max (sin(50.0 * (vTextureCoord.x + 0.2 * val.x)) + 0.4, 1.0);
        // gl_FragColor = vec4(amt, amt, amt, 0.0);
        
        gl_FragColor = texture2D(uSampler, vTextureCoord);

        // vec4 c1 = vec4(1.00, 0.718, 0.914, 0.0);
        // vec4 c2 = vec4(1.00, 0.718, 0.773, 0.0);
        
        // gl_FragColor = c1 * gl_FragColor.x + (1.0 - gl_FragColor) * c2;
        gl_FragColor *= vec4 (0.31, 0.14, 0.12, 0.0);

        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
        gl_FragColor += vec4 (0,0,0, 1.0);
    }
`;
export const WaterFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec4 normal;   
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main () {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
        gl_FragColor *= vec4 (0, 0.416, 0.82, 0.0);
        gl_FragColor *= max (dot (normalize(lightDir), normal), 0.1);
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
