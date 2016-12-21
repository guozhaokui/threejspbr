
varying vec2 vUv;
varying vec3 vNorm;
uniform sampler2D tex1;
const vec3 basecolor=vec3(0.,0.5,0.);
//const vec3 lpos=vec3()
/*
const float n=3;
vec3 BRDF( vec3 L, vec3 V, vec3 N, vec3 X, vec3 Y ){
    vec3 H = normalize(L+V);

    float val = pow(max(0,dot(N,H)),n);
    return vec3(val);
}
*/

void main() {
    vec3 col = basecolor;
    //col += BRDF();
    gl_FragColor.rgb = vNorm;// basecolor;
    gl_FragColor.a = 1.0;
}
