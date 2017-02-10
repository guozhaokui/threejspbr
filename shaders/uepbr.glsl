//#version 300 es
precision highp float;
precision highp int;

float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
in vec2 vUv;
in vec3 vWorldNorm;
in vec3 vViewDir;
in vec4 vViewPos;
//
uniform sampler2D texBaseColor;
uniform sampler2D texNormal;
uniform sampler2D texORM;   //Ao, Roughness, Metallic
//预计算的贴图
uniform sampler2D texPreFilterdEnv;
uniform sampler2D texBRDFLUT;
uniform sampler2D texPrefilterDiff;

uniform vec3 u_fresnel0;
uniform float u_roughness;
vec3 u_lightColor = vec3(1.,1.,1.);
vec3 u_diffuseColor = vec3(0.1,0.1,0.1);

out vec4 fragColor;

const float _maxu8 = 255.0;
const float _maxu16 = 65535.0;
const float _shift8 = 256.0;    //平移的话是*256而不是255
vec2 _RGBAToU16(const in vec4 rgba){
    return vec2((rgba.r*_maxu8+rgba.g*_maxu8*_shift8)/_maxu16, (rgba.b*_maxu8+rgba.a*_maxu8*_shift8)/_maxu16);
}
vec3 _RGBEToRGB( const in vec4 rgba ){
    float f = pow(2.0, rgba.w * 255.0 - (128.0 + 8.0));
    return rgba.rgb * (255.0 * f);
}
float saturate(float v){
    return min(max(v,0.),1.);
}

const vec2 normalScale=vec2(1.,1.);
vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {
    vec3 q0 = dFdx( eye_pos.xyz );
    vec3 q1 = dFdy( eye_pos.xyz );
    vec2 st0 = dFdx( vUv.st );
    vec2 st1 = dFdy( vUv.st );
    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( surf_norm );
    vec3 mapN = texture( texNormal, vUv ).xyz * 2.0 - 1.0;
    mapN.xy = normalScale * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
}

/*
 * 对一个全景图进行采样。假设x轴指向中心。
 */
void texPanorama(sampler2D tex, const in vec3 dir, out vec4 rgba){
    float u = atan(-dir.z,dir.x)/_2PI+0.5;  //逆时针增加，所以z取负
    float v = asin(dir.y)/PI+0.5;
    //rgba = texture2D(tex, vec2(u,v));
    rgba = texture(tex, vec2(u,1.-v));
}


void texPanoramaLod(sampler2D tex, const in vec3 dir, out vec4 rgba, float lod){
    float u = atan(-dir.z,dir.x)/_2PI+0.5;  //逆时针增加，所以z取负
    float v = asin(dir.y)/PI+0.5;
    v = 1.-v;

    float l0 = floor(lod);
    float l1 = l0+1.0;
    float k = lod-l0;
    vec4 v0 = textureLod(tex, vec2(u,v),l0);
    vec4 v1 = textureLod(tex, vec2(u,v),l1);
    rgba = mix(v0,v1,k);
    //rgba = texelFetch(tex,ivec2(int(2048.*u), int(1024.*v)),int(lod));
}

vec3 ApproximateSpecularIBL( vec3 SpecularColor , float Roughness , float NoV, vec3 R){
    vec4 PrefilteredColor;
    texPanoramaLod(texPreFilterdEnv, R, PrefilteredColor, Roughness*10.0);
    PrefilteredColor.rgb = _RGBEToRGB(PrefilteredColor);
    vec4 EnvBRDF = texture(texBRDFLUT,vec2(Roughness , NoV));//TODO lod
    vec2 rg = _RGBAToU16(EnvBRDF);    
    return PrefilteredColor.rgb * SpecularColor* rg.x + saturate( 50.0 * PrefilteredColor.g ) * rg.y;
}

vec3 testDiff(vec3 R ){
    vec4 PrefilteredColor;
    texPanoramaLod(texPreFilterdEnv, R, PrefilteredColor, 9.);
    PrefilteredColor.rgb = _RGBEToRGB(PrefilteredColor);
    return PrefilteredColor.rgb;
}

vec3 testDiff1(vec3 R){
    vec4 PrefilteredDiff;
    texPanorama(texPrefilterDiff, R, PrefilteredDiff);
    return PrefilteredDiff.rgb;
}
/*
    计算sh光照。
    使用level=2，所以需要9个系数。
    https://cseweb.ucsd.edu/~ravir/papers/envmap/envmap.pdf
*/
uniform mat4 rshcoeffs;
vec3 diff_sh9(vec3 dir){
    return vec3(0.0,0.,0.);
}

void main() {
    vec3 normal =  normalize(vWorldNorm);
    //normal = perturbNormal2Arb( -vViewPos.xyz, normal );
    vec3 view   = -normalize(vViewDir);
    vec4 pbrinfo = texture(texORM,vUv);
    vec4 basecolor = texture(texBaseColor,vUv);
    float NoV = saturate(dot( view, normal ));
    vec3 R = 2. * NoV * normal - view;
    const vec3 nonmetalF0 =vec3(0.2);
    vec3 F0 =  mix(nonmetalF0, basecolor.rgb, pbrinfo.b);
    vec3 color_spec = ApproximateSpecularIBL(F0,pbrinfo.g, NoV, R);
    vec3 color_diff=testDiff1(normal)*basecolor.rgb;
    fragColor.rgb = color_spec;//pbrinfo.ggg;//color_spec +((1.0-pbrinfo.b)*color_diff) ;//+color_diff;// (refcol.xyz);// basecolor;
    fragColor.a = 1.0;
}
