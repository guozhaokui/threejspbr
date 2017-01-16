//#version 300 es
precision highp float;
precision highp int;

float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
in vec2 vUv;
in vec3 vWorldNorm;
in vec3 vViewDir;
//
uniform sampler2D texBaseColor;
uniform sampler2D texNormal;
uniform sampler2D texORM;   //Ao, Roughness, Metallic
//预计算的贴图
uniform sampler2D texPreFilterdEnv;
uniform sampler2D texBRDFLUT;

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
    rgba = textureLod(tex, vec2(u,v),lod);
    //rgba = texelFetch(tex,ivec2(int(2048.*u), int(1024.*v)),int(lod));
}

vec3 ApproximateSpecularIBL( vec3 SpecularColor , float Roughness , float NoV, vec3 R){
    vec4 PrefilteredColor;
    texPanoramaLod(texPreFilterdEnv, R, PrefilteredColor, floor(Roughness*10.0));
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

void main() {
    vec3 normal =  normalize(vWorldNorm);
    vec3 view   = -normalize(vViewDir);
    vec4 pbrinfo = texture(texORM,vUv);
    vec4 basecolor = texture(texBaseColor,vUv);
    float NoV = saturate(dot( view, normal ));
    vec3 R = 2. * NoV * normal - view;
    
    vec3 color_spec = ApproximateSpecularIBL(basecolor.rgb,pbrinfo.g, NoV, R);
    vec3 color_diff= testDiff(normal)*basecolor.rgb;
    fragColor.rgb =color_spec +((1.0-pbrinfo.b)*color_diff) ;//+color_diff;// (refcol.xyz);// basecolor;
    fragColor.a = 1.0;
}
