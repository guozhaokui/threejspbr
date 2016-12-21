
float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
varying vec2 vUv;
varying vec3 vNorm;
varying vec4 vViewPos;
uniform sampler2D tex1;
uniform sampler2D texEnv;
uniform sampler2D texEnvl;
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

vec3 _RGBEToRGB( const in vec4 rgba ){
    float f = pow(2.0, rgba.w * 255.0 - (128.0 + 8.0));
    return rgba.rgb * (255.0 * f);
}

/*
 * 对一个全景图进行采样。假设x轴指向中心。
 */
void texPanorama(sampler2D tex, const in vec3 dir, out vec4 rgba){
    float u = atan(-dir.z,dir.x)/_2PI+0.5;  //逆时针增加，所以z取负
    float v = asin(dir.y)/PI+0.5;
    rgba = texture2D(tex, vec2(u,v));
}

void main() {
    vec3 col = basecolor;
    //col += BRDF();
    vec4 refcol;
    texPanorama(texEnv, reflect(normalize(vViewPos.xyz),vNorm),refcol);
    refcol.rgb = _RGBEToRGB(refcol);
    vec3 col1 = _RGBEToRGB(texture2D(texEnv,vNorm.xy));

    gl_FragColor.rgb = (refcol.xyz);// basecolor;
    gl_FragColor.a = 1.0;
}
