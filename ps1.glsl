
float PI = 3.14159265358979323846264;
const float _2PI = 6.2831853071796;
varying vec2 vUv;
varying vec3 vWorldNorm;
varying vec3 vRefDir;
varying vec3 vViewDir;
uniform sampler2D tex1;
uniform sampler2D texEnv;
uniform sampler2D texEnvl;
const vec3 basecolor=vec3(0.,0.5,0.);
uniform vec3 u_lightDir;
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
    //rgba = vec4(u,v,0.,0.);
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


uniform float u_fresnel0;
uniform float u_roughness;
vec3 u_lightColor = vec3(1.,1.,1.);
vec3 u_diffuseColor = vec3(0.1,0.1,0.1);
void main() {
    vec3 normal =  normalize(vWorldNorm);
    vec3 view   = -normalize(vViewDir);
    vec3 halfVec=  normalize(u_lightDir + view);//lightDir 是light所在位置的朝向，而不是入射光线的方向
    float NdotL= dot(normal, u_lightDir);
    float NdotV= dot(normal, view);
    float NdotL_clamped= max(NdotL, 0.0);
    float NdotV_clamped= max(NdotV, 0.0);
    //F的参数到底是halfVec还是normal
    float brdf_spec= fresnel(u_fresnel0, /*halfVec*/normal, u_lightDir) * geometry(normal, halfVec, view, u_lightDir, u_roughness) * distribution(normal, halfVec, u_roughness) / (4.0 * NdotL_clamped * NdotV_clamped);
    vec3 color_spec= NdotL_clamped * brdf_spec * u_lightColor;
    vec3 color_diff= NdotL_clamped * (1.0-u_fresnel0) * u_diffuseColor * u_lightColor;

    vec3 col = basecolor;
    //col += BRDF();
    vec4 refcol;
    texPanorama(texEnv, vRefDir,refcol);
    refcol.rgb = _RGBEToRGB(refcol);
    //vec3 col1 = _RGBEToRGB(texture2D(texEnv,vNorm.xy));

    float f=distribution(normal, halfVec, u_roughness);
    gl_FragColor.rgb = color_spec+color_diff;// (refcol.xyz);// basecolor;
    gl_FragColor.a = 1.0;
}
