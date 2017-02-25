//#version 300 es
precision highp float;
precision highp int;

float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
in vec2 vUv;
in vec3 vWorldNorm;
in vec3 vViewDir;
in vec4 vViewPos;
in vec4 vWorldPos;
in vec3 vTest;
//
uniform sampler2D texBaseColor;
uniform sampler2D texNormal;
uniform sampler2D texORM;   //Ao, Roughness, Metallic
//预计算的贴图
uniform sampler2D texPrefilterdEnv;
uniform sampler2D texBRDFLUT;
uniform sampler2D texPrefilterDiff;

uniform vec3 u_fresnel0;
uniform float u_roughness;
vec3 u_lightColor = vec3(1.,1.,1.);
vec3 u_diffuseColor = vec3(0.1,0.1,0.1);

out vec4 fragColor;

vec3 speccontrib = vec3(0.);

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

const float normalScale=1.0;
/**
    这个就是用的普通的求tangent的方法，只不过不再通过三角形的三个顶点计算。
    相当于根据相邻的3个像素来计算，例如当前p0 右边 p1, 下面p2, 可以用dFdx来获得这三个点之间的位置差和uv差，然后
    根据
    q0=T*st0.x+B*st0.y;
    q1=T*st1.x+B*st1.y;
    来计算T和B
    问题：
        1. 还没有细想T和B谁是x谁是y，现在是T,B,N不对就改成 B,T,N
        2. 现在的效果还不太对，可能是只有法线平滑了，但是T，B都是平的有关
*/
vec3 perturbNormal2Arb( vec3 pos, vec3 surf_norm ) {
    vec3 q0 = dFdx( pos.xyz );
    vec3 q1 = dFdy( pos.xyz );
    vec2 st0 = dFdx( vUv );
    vec2 st1 = dFdy( vUv );
    //float f1 = 1.0/(st0.y*st1.x-st1.y*st0.x); 由于要normalize，这个系数就不要了
    vec3 T = normalize(-q0*st1.y+q1*st0.y);
    vec3 B = normalize(q0*st1.x-q1*st0.x);
    vec3 N = normalize( surf_norm );
    vec3 mapN = texture( texNormal, vUv ).xyz * 2.0 - 1.0;
    mapN.xy = normalScale * mapN.xy;
    mat3 tsn = mat3( B, T, N );  //注意调整T,B的顺序
    return normalize( tsn * mapN );
}

/*
 * 对一个全景图进行采样。假设x轴指向中心。
 */
void texPanorama(sampler2D tex, const in vec3 dir, out vec4 rgba){
    float u = atan(dir.z,dir.x)/_2PI+0.5;  
    float v = acos(dir.y)/PI;
    rgba = texture(tex, vec2(u,v));
}


void texPanoramaLod(sampler2D tex, const in vec3 dir, out vec4 rgba, float lod){
    lod=5.;
    float u = atan(dir.z,dir.x)/_2PI+0.5;  
    float v = acos(dir.y)/PI;

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
    texPanoramaLod(texPrefilterdEnv, R, PrefilteredColor, Roughness*10.0);
    PrefilteredColor.rgb = _RGBEToRGB(PrefilteredColor);
    vec4 EnvBRDF = texture(texBRDFLUT,vec2(Roughness , NoV));//TODO lod
    vec2 rg = _RGBAToU16(EnvBRDF);    
    //原来的括号不对
    speccontrib = (SpecularColor* rg.x + saturate( 50.0 * PrefilteredColor.g ) * rg.y);
    return PrefilteredColor.rgb * speccontrib;
}

vec3 testDiff(vec3 R){
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

vec3 flatNorm(){
    vec3 fdx = vec3( dFdx( vWorldPos.x ), dFdx( vWorldPos.y ), dFdx( vWorldPos.z ) );
    vec3 fdy = vec3( dFdy( vWorldPos.x ), dFdy( vWorldPos.y ), dFdy( vWorldPos.z ) );
    return normalize( cross( fdx, fdy ) );
}

void main() {
    vec3 normal =  normalize(vWorldNorm);
    vec3 smoothnorm = normal;
    normal = perturbNormal2Arb( vWorldPos.xyz, normal );
    vec3 view   = -normalize(vViewDir);
    vec4 pbrinfo = texture(texORM,vUv);
    vec4 basecolor = texture(texBaseColor,vUv);
    float NoV = saturate(dot( view, normal ));
    vec3 R = 2. * NoV * normal - view;
    const vec3 nonmetalF0 =vec3(0.2);
    vec3 F0 =  mix(nonmetalF0, basecolor.rgb, pbrinfo.b);
    vec3 color_spec = ApproximateSpecularIBL(F0,pbrinfo.g, NoV, R);
    vec3 color_diff=testDiff(smoothnorm);
    fragColor.rgb = color_diff*mix(basecolor.rgb,vec3(0,0,0),pbrinfo.b)+color_spec;
    fragColor.a = 1.0;
}
