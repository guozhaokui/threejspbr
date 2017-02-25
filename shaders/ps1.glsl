//#version 300 es
//#version 130
#define USEPRETEX 
precision highp float;
precision highp int;
uniform vec3 cameraPosition;

float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
in vec2 vUv;
in vec3 vWorldNorm;
in vec3 vRefDir;
in vec3 vViewDir;
in vec4 vWorldPos;
uniform sampler2D tex1;
uniform sampler2D texEnv;
uniform sampler2D texPreFilterdEnv;
uniform sampler2D texNoise1;
uniform sampler2D texBRDFLUT;
const vec3 basecolor=vec3(0.,0.5,0.);
uniform vec3 u_lightDir;

out vec4 fragColor;
//const vec3 lpos=vec3()
/*
const float n=3;
vec3 BRDF( vec3 L, vec3 V, vec3 N, vec3 X, vec3 Y ){
    vec3 H = normalize(L+V);

    float val = pow(max(0,dot(N,H)),n);
    return vec3(val);
}
*/
//const float _ff00=256.0*256.0;
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
    float u = atan(-dir.z,dir.x)/_2PI+0.5;  //逆时针增加，所以z取负       //TODO 这里好像不对。参考uepbr.glsl中的 
    float v = asin(dir.y)/PI+0.5;
    //rgba = texture2D(tex, vec2(u,v));
    #ifdef USEPRETEX
    rgba = texture(tex, vec2(u,1.-v));
    #else
    rgba = texture(tex, vec2(u,v));
    #endif
    /*
    float u1 = floor(u*10.);
    float v1 = floor(v*10.);
    float vv = mod(floor(u1+v1),2.);
    if(vv<1.0){
        rgba = vec4(0.,0.,0.,0.5);
    }else{
        rgba =  vec4(1.,1.,1.,0.5);
    }
    rgba = vec4(dir,0.);
    */
}

/**
//https://www.khronos.org/registry/gles/extensions/EXT/EXT_shader_texture_lod.txt
#version 100
#extension GL_EXT_shader_texture_lod : require

attribute vec2      tex_st;
uniform   sampler2D sampler;

void main (void)
{
  // Note the EXT suffix, that is very important in ESSL 1.00
  gl_FragColor = texture2DLodEXT (sampler, tex_st, 0);
}
*/
void texPanoramaLod(sampler2D tex, const in vec3 dir, out vec4 rgba, float lod){
    float u = atan(-dir.z,dir.x)/_2PI+0.5;  //逆时针增加，所以z取负 //TODO 这里好像不对。参考uepbr.glsl中的 
    float v = asin(dir.y)/PI+0.5;
    #ifdef USEPRETEX
    v = 1.-v;
    rgba = textureLod(tex, vec2(u,v),lod);
    //rgba = texelFetch(tex,ivec2(int(2048.*u), int(1024.*v)),int(lod));
    #else
    rgba = textureLod(tex, vec2(u,v), lod);
    #endif
    //rgba = texture(tex, vec2(u,v));
    /*
    float u1 = floor(u*10.);
    float v1 = floor(v*10.);
    float vv = mod(floor(u1+v1),2.);
    if(vv<1.0){
        rgba = vec4(0.,0.,0.,0.5);
    }else{
        rgba =  vec4(1.,1.,1.,0.5);
    }
    rgba = vec4(dir,0.);
    */
}

//fresnel_schlick
float fresnel(float f0, vec3 n, vec3 l){
    return f0 + (1.0-f0) * pow(1.0- dot(n, l), 5.0);
}

//distributionEum.Beckmann
float distribution(vec3 n, vec3 h, float roughness){
    float m_Sq= roughness * roughness;
    float NdotH_Sq= max(dot(n, h), 0.0);
    NdotH_Sq= NdotH_Sq * NdotH_Sq;
    return exp( (NdotH_Sq - 1.0)/(m_Sq*NdotH_Sq) )/ (3.14159265 * m_Sq * NdotH_Sq * NdotH_Sq) ;
}

//geometryEum.Schlick
float geometry(vec3 n, vec3 h, vec3 v, vec3 l, float roughness){
    float NdotL_clamped= max(dot(n, l), 0.0);
    float NdotV_clamped= max(dot(n, v), 0.0);
    float k= roughness * sqrt(2.0/3.14159265);
    float one_minus_k= 1.0 -k;
    return ( NdotL_clamped / (NdotL_clamped * one_minus_k + k) ) * ( NdotV_clamped / (NdotV_clamped * one_minus_k + k) );
}

float G_Smith( float Roughness, float NoV, float NoL ){
    float k= Roughness * sqrt(2.0/3.14159265);
    float one_minus_k= 1.0 -k;
    return ( NoL / (NoL * one_minus_k + k) ) * ( NoV / (NoV * one_minus_k + k));
}

// TODO 不支持 uint和 >> 怎么办  #version 130
//http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html#wong97
 float radicalInverse_VdC(uint bits) {
     bits = (bits << 16u) | (bits >> 16u);
     bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
     bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
     bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
     bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
     return float(bits) * 2.3283064365386963e-10; // / 0x100000000
 }

vec2 hammersley2d(uint i, uint N) {
    return vec2(float(i)/float(N), radicalInverse_VdC(i));
}

//投影到半球上
//均匀分布
vec3 hemisphereSample_uniform(float u, float v) {
    float phi = v * 2.0 * PI;
    float cosTheta = 1.0 - u;
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    return vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
}

//cos分布
vec3 hemisphereSample_cos(float u, float v) {
    float phi = v * 2.0 * PI;
    float cosTheta = sqrt(1.0 - u);
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    return vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
}

vec2 Hammersley(uint i, uint NumSamples){
    return hammersley2d(i,NumSamples);
}

//https://de45xmedrsdbp.cloudfront.net/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
//Image-Based Lighting
//P4
// N的作用是用来把生成的H转换到世界空间用。
vec3 ImportanceSampleGGX( vec2 Xi, float Roughness, vec3 N ){
    float a = Roughness * Roughness;
    float Phi = 2. * PI * Xi.x;//与水平面x轴的夹角
    float CosTheta = sqrt( (1. - Xi.y) / ( 1. + (a*a - 1.) * Xi.y ) );
    float SinTheta = sqrt( 1. - CosTheta * CosTheta );
    vec3 H;
    //TODO 这里需要修改朝向么，坐标系
    H.x = SinTheta * cos( Phi );
    H.y = SinTheta * sin( Phi );
    H.z = CosTheta;//Z向上，应该对应N
    vec3 UpVector = abs(N.z) < 0.9999 ? vec3(0.,0.,1.) : vec3(1.,0.,0.);
    vec3 TangentX = normalize( cross( UpVector,N ) );
    vec3 TangentY = cross( N, TangentX );
    // Tangent to world space
    return TangentX * H.x + TangentY * H.y + N * H.z;
}

/*
    环境贴图的预处理。
    R 是入射灯光的朝向。
    实际计算的时候用这个作为N来转换返回的H
*/
vec3 PrefilterEnvMap( float Roughness , vec3 R ){
    vec3 N = R;//TODO 用优化么
    vec3 V = R;
    vec3 PrefilteredColor = vec3(0.,0.,0.);
    float TotalWeight = 0.;
    const uint NumSamples = 1024u;
    for( uint i = 0u; i < NumSamples; i++ ) {
        vec2 Xi = Hammersley( i, NumSamples );
        vec3 H = ImportanceSampleGGX( Xi, Roughness , N );
        vec3 L = 2. * dot( V, H ) * H - V;
        float NoL = max( dot( N, L ),0. );
        if( NoL > 0. ){
            vec4 SampleColor;
            texPanorama(texEnv, L, SampleColor);
            SampleColor.rgb = _RGBEToRGB(SampleColor);
            PrefilteredColor += SampleColor.rgb * NoL;
            TotalWeight += NoL;
        }
    }
    return PrefilteredColor / TotalWeight;
}

/*
    BRDF部分的积分的预处理。
    在排除F0以后，剩下的可以预计算了。
    输入为 Roughness 和 cosθ。
*/
vec2 IntegrateBRDF( float Roughness , float NoV ){
    vec3 N=vec3(0.,0.,1.);//TODO 为什么是 001呢
    vec3 V;
    V.x = sqrt( 1.0f - NoV * NoV ); // sin
    V.y = 0.;
    V.z = NoV; // cos
    float A = 0.;
    float B = 0.;
    const uint NumSamples = 1024u;
    for( uint i = 0u; i < NumSamples; i++ ){
        vec2 Xi = Hammersley( i, NumSamples );
        vec3 H = ImportanceSampleGGX( Xi, Roughness , N );
        vec3 L = 2. * dot( V, H ) * H - V;
        float NoL = saturate( L.z );
        float NoH = saturate( H.z );
        float VoH = saturate( dot( V, H ) );
        if( NoL > 0. ){
            float G = G_Smith( Roughness , NoV, NoL );
            float G_Vis = G * VoH / (NoH * NoV);
            float Fc = pow( 1. - VoH, 5. );
            A += (1. - Fc) * G_Vis; //F0的缩放部分 A*F0+B
            B += Fc * G_Vis;        //F0的偏移部分
        }
    }
    return vec2( A, B ) / float(NumSamples);
}

vec3 ApproximateSpecularIBL( vec3 SpecularColor , float Roughness , vec3 N, vec3 V ){
    float NoV = saturate( dot( N, V ) );
    vec3 R = 2. * dot( V, N ) * N - V;
  #ifdef USEPRETEX
    vec4 PrefilteredColor;
    texPanoramaLod(texPreFilterdEnv, R, PrefilteredColor, floor(Roughness*10.0));
    PrefilteredColor.rgb = _RGBEToRGB(PrefilteredColor);
    vec4 EnvBRDF = texture(texBRDFLUT,vec2(Roughness , NoV));//TODO lod
    vec2 rg = _RGBAToU16(EnvBRDF);    
    return PrefilteredColor.rgb * SpecularColor* rg.x + saturate( 50.0 * PrefilteredColor.g ) * rg.y;
  #else
    vec3 PrefilteredColor = PrefilterEnvMap( Roughness , R );
    vec2 EnvBRDF = IntegrateBRDF( Roughness , NoV );
    return PrefilteredColor * ( SpecularColor * EnvBRDF.x + EnvBRDF.y );//TODO 这里应该没有括号
  #endif
}

/*
vec3 EnvBRDF( vec3 SpecularColor, float Roughness, float NoV ){
    // Importance sampled preintegrated G * F
    vec2 AB = texture( PreIntegratedGF, PreIntegratedGFSampler, vec2( NoV, Roughness ), 0. ).rg;
    // Anything less than 2% is physically impossible and is instead considered to be shadowing 
    vec3 GF = SpecularColor * AB.x + saturate( 50.0 * SpecularColor.g ) * AB.y;
    return GF;
}
*/

vec3 SpecularIBL( vec3 SpecularColor , float Roughness, vec3 N, vec3 V ){
    return ApproximateSpecularIBL(SpecularColor, Roughness, N, V);
}

vec3 SpecularIBL1( vec3 SpecularColor , float Roughness, vec3 N, vec3 V ){
    vec3 SpecularLighting = vec3(0.,0.,0.);
    const uint NumSamples = 1024u;//1024;
    float dx = 1.0/float(NumSamples);
    float cx = 0.;
    float cy = 0.;
    float tx = 0.;
    float ty = 0.;
    for( uint i = 0u; i < NumSamples; i++ ){
        float fi = float(i);
        //ty = floor(fi/32.0)/32.0;
        //tx = mod(fi,32.0)/32.0;
        //cy = texture(texNoise1,vec2(tx,ty)).r;
        vec2 Xi = Hammersley( i, NumSamples );//vec2(float(i)*dx,cy);// 
        //cx+=dx;
        //当前采样到的法线
        //因为要计算当H为某个值的时候的概率密度函数和其他与H相关的分量
        //理论上可以随机，即可以不用考虑Roughness,但是这样更好
        vec3 H = ImportanceSampleGGX( Xi, Roughness, N );
        //这个H对应的光源。
        vec3 L = 2. * dot( V, H ) * H - V;  //反射的光线
        float NoV = saturate( dot( N, V ));
        float NoL = saturate( dot( N, L ));
        float NoH = saturate( dot( N, H ));
        float VoH = saturate( dot( V, H ));
        if( NoL > 0. ){
            vec4 SampleColor;
            texPanorama(texEnv, L, SampleColor);
            SampleColor.rgb = _RGBEToRGB(SampleColor);
            //vec3 SampleColor = EnvMap.SampleLevel( EnvMapSampler , L, 0 ).rgb;
            float G = G_Smith( Roughness, NoV, NoL );
            float Fc = pow( 1.0 - VoH, 5.0 );
            vec3 F = (1.0 - Fc) * SpecularColor + Fc;
            // Incident light = SampleColor * NoL
            // Microfacet specular = D*G*F / (4*NoL*NoV)
            // pdf = D * NoH / (4 * VoH)
            SpecularLighting += SampleColor.rgb * F * G * VoH / (NoH * NoV);
        }
        //return H;
    }
    return SpecularLighting / float(NumSamples);
}

uniform vec3 u_fresnel0;
uniform float u_roughness;
vec3 u_lightColor = vec3(1.,1.,1.);
vec3 u_diffuseColor = vec3(0.1,0.1,0.1);
void main() {
    vec3 normal =  normalize(vWorldNorm);
    //vec3 normal =  normalize(vWorldPos.xyz);// 
    vec3 view   = -normalize(vViewDir);
    vec3 halfVec=  normalize(u_lightDir + view);//lightDir 是light所在位置的朝向，而不是入射光线的方向
    float NdotL= dot(normal, u_lightDir);
    float NdotV= dot(normal, view);
    float NdotL_clamped= max(NdotL, 0.0);
    float NdotV_clamped= max(NdotV, 0.0);
    //F的参数到底是halfVec还是normal
    float brdf_spec= fresnel(u_fresnel0.x, /*halfVec*/normal, u_lightDir) * geometry(normal, halfVec, view, u_lightDir, u_roughness) * distribution(normal, halfVec, u_roughness) / (4.0 * NdotL_clamped * NdotV_clamped);
    //vec3 color_spec= NdotL_clamped * brdf_spec * u_lightColor;
    vec3 color_spec = SpecularIBL(u_fresnel0,u_roughness,normal, view);
    vec3 color_diff= NdotL_clamped * (1.0-u_fresnel0.x) * u_diffuseColor * u_lightColor;

    vec3 col = basecolor;
    //col += BRDF();
    vec4 refcol;
    texPanorama(texEnv, vRefDir,refcol);
    refcol.rgb = _RGBEToRGB(refcol);
    //vec3 col1 = _RGBEToRGB(texture2D(texEnv,vNorm.xy));

    vec4 noisev = texture(texNoise1,vUv);
    float f=distribution(normal, halfVec, u_roughness);

    vec4 brdflutc = texture(texBRDFLUT, vUv);
    vec2 rg = _RGBAToU16(brdflutc);
    fragColor.rgb = color_spec;//+color_diff;// (refcol.xyz);// basecolor;
    fragColor.a = 1.0;
}
