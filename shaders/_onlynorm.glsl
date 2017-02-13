/*
struct V2F {
  vec3 normal;               // interpolated normal
  vec3 tangent;              // interpolated tangent
  vec3 bitangent;            // interpolated bitangent
  vec3 position;             // interpolated position
  vec2 tex_coord;            // interpolated texture coordinates (uv0)
  vec2 multi_tex_coord[8];   // interpolated texture coordinates (uv0-uv7)
};
*/

import lib-sampler.glsl
// import lib-pbr.glsl

import lib-normal.glsl
import lib-random.glsl
// import lib-env.glsl
// lib-env start
import lib-defines.glsl

//: param auto texture_environment
uniform sampler2D environment_texture;
//: param auto environment_rotation
uniform float environment_rotation;
//: param auto environment_exposure
uniform float environment_exposure;
//: param auto environment_irrad_mat_red
uniform mat4 irrad_mat_red;
//: param auto environment_irrad_mat_green
uniform mat4 irrad_mat_green;
//: param auto environment_irrad_mat_blue
uniform mat4 irrad_mat_blue;

vec3 envSampleLOD(vec3 dir, float lod){
  vec2 pos = M_INV_PI * vec2(atan(-dir.z, -dir.x), 2.0 * asin(dir.y));
  pos = 0.5 * pos + vec2(0.5);
  pos.x += environment_rotation;
  return texture2DLod(environment_texture, pos, lod).rgb * environment_exposure;
}

//根据球谐函数计算的辐照度
vec3 envIrradiance(vec3 dir){
  float rot = environment_rotation * M_2PI;
  float crot = cos(rot);
  float srot = sin(rot);
  vec4 shDir = vec4(dir.xzy, 1.0);
  shDir = vec4(
	shDir.x * crot - shDir.y * srot,
	shDir.x * srot + shDir.y * crot,
	shDir.z,
	1.0);
  return max(vec3(0.0), vec3(
	dot(shDir, irrad_mat_red * shDir),
	dot(shDir, irrad_mat_green * shDir),
	dot(shDir, irrad_mat_blue * shDir)
	)) * environment_exposure;
}

// lib-env end

//: param auto channel_emissive
uniform sampler2D emissive_tex;

//: param auto is_perspective_projection
uniform bool is_perspective;

//: param auto world_eye_position
uniform vec3 camera_pos;

//: param auto world_camera_direction
uniform vec3 camera_dir;

//: param auto environment_max_lod
uniform float maxLod;

//: param custom {
//:   "default": 16,
//:   "label": "Quality",
//:   "widget": "combobox",
//:   "values": {
//:     "Low (4 spp)": 4,
//:     "Medium (16 spp)": 16,
//:     "High (64 spp)": 64
//:   }
//: }
uniform int nbSamples;


//: param custom {
//:   "default": 1.0,
//:   "label": "Emissive Intensity",
//:   "min": 0.00,
//:   "max": 10.0
//: }
uniform float emissive_intensity;

//: param auto facing
uniform int facing;

bool isBackFace() {
  return facing == -1 || (facing == 0 && !gl_FrontFacing);
}

const float EPSILON_COEF = 1e-4;

float normal_distrib(
  float ndh,
  float Roughness){
  // use GGX / Trowbridge-Reitz, same as Disney and Unreal 4
  // cf http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf p3
  float alpha = Roughness * Roughness;
  float tmp = alpha / max(1e-8,(ndh*ndh*(alpha*alpha-1.0)+1.0));
  return tmp * tmp * M_INV_PI;
}

vec3 fresnel(  float vdh,  vec3 F0){
  // Schlick with Spherical Gaussian approximation
  // cf http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf p3
  float sphg = pow(2.0, (-5.55473*vdh - 6.98316) * vdh);
  return F0 + (vec3(1.0, 1.0, 1.0) - F0) * sphg;
}

float G1(
  float ndw, // w is either Ln or Vn
  float k){
  // One generic factor of the geometry function divided by ndw
  // NB : We should have k > 0
  return 1.0 / ( ndw*(1.0-k) +  k );
}

float visibility(  float ndl,  float ndv,  float Roughness){
  // Schlick with Smith-like choice of k
  // cf http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf p3
  // visibility is a Cook-Torrance geometry function divided by (n.l)*(n.v)
  float k = max(Roughness * Roughness * 0.5, 1e-5);
  return G1(ndl,k)*G1(ndv,k);
}

vec3 cook_torrance_contrib( float vdh,  float ndh,  float ndl,  float ndv,  vec3 Ks,  float Roughness){
  // This is the contribution when using importance sampling with the GGX based
  // sample distribution. This means ct_contrib = ct_brdf / ggx_probability
  return fresnel(vdh,Ks) * (visibility(ndl,ndv,Roughness) * vdh * ndl / ndh );
}

vec3 importanceSampleGGX(vec2 Xi, vec3 A, vec3 B, vec3 C, float roughness){
  float a = roughness*roughness;
  float cosT = sqrt((1.0-Xi.y)/(1.0+(a*a-1.0)*Xi.y));
  float sinT = sqrt(1.0-cosT*cosT);
  float phi = 2.0*M_PI*Xi.x;
  return (sinT*cos(phi)) * A + (sinT*sin(phi)) * B + cosT * C;
}

float probabilityGGX(float ndh, float vdh, float Roughness){
  return normal_distrib(ndh, Roughness) * ndh / (4.0*vdh);
}

float distortion(vec3 Wn){
  // Computes the inverse of the solid angle of the (differential) pixel in
  // the cube map pointed at by Wn
  float sinT = sqrt(1.0-Wn.y*Wn.y);
  return sinT;
}

float computeLOD(vec3 Ln, float p){
  return max(0.0, (maxLod-1.5) - 0.5*(log(float(nbSamples)) + log( p * distortion(Ln) ))
    * M_INV_LOG2);
}

vec4 pbrComputeBRDF(V2F inputs, vec3 diffColor, vec3 specColor, float glossiness, float occlusion){
  //world space normal
  vec3 normal_vec = computeWSNormal(inputs.tex_coord, inputs.tangent, inputs.bitangent, inputs.normal);
  return vec4(normal_vec,1.);
  if (isBackFace()) {
    normal_vec = -normal_vec;
  }

  vec3 eye_vec = is_perspective ?normalize(camera_pos - inputs.position) : -camera_dir;
  float ndv = dot(eye_vec, normal_vec);
  //Trick to remove black artefacts Backface ? place the eye at the opposite - removes black zones
  if (ndv < 0) {
    eye_vec = reflect(eye_vec, normal_vec);
    ndv = abs(ndv);
  }     

  vec3 Tp = normalize( inputs.tangent - normal_vec*dot(inputs.tangent, normal_vec)  ); // local tangent
  vec3 Bp = normalize(inputs.bitangent- normal_vec*dot(inputs.bitangent, normal_vec) - Tp*dot(inputs.bitangent, Tp) ); // local bitangent

  vec3 contribE = occlusion * envIrradiance(normal_vec) * diffColor;

  float roughness = 1.0 - glossiness;
  vec3 contribS = vec3(0.0);
  for(int i=0; i<nbSamples; ++i){
    vec2 Xi = hammersley2D(i, nbSamples);
    vec3 Hn = importanceSampleGGX(Xi,Tp,Bp,normal_vec,roughness);
    vec3 Ln = -reflect(eye_vec,Hn);
    float ndl = dot(normal_vec, Ln);

    // Horizon fading trick from http://marmosetco.tumblr.com/post/81245981087
    // 解决反射错误的一个小技巧：法向量反射的时候，会忽略遮挡（光线穿过物体）导致错误的效果（如果反射的是高光就很明显）
    const float horizonFade = 1.3;
    float horiz = clamp( 1.0 + horizonFade * ndl, 0.0, 1.0 ); //如果ndl<0表示反射线在表面下面了，需要算遮挡，削弱反射值。
                                                              //只能是法线图和原始法线的比较，不能解决大范围的遮挡问题
    horiz *= horiz; //柔和一下

    ndl = max( 1e-8, abs(ndl) );
    float vdh = max(1e-8, dot(eye_vec, Hn));
    float ndh = max(1e-8, dot(normal_vec, Hn));
    float lodS = roughness < 0.01 ? 0.0 : computeLOD(Ln,probabilityGGX(ndh, vdh, roughness));
    contribS +=envSampleLOD(Ln, lodS) *cook_torrance_contrib(
      vdh, ndh, ndl, ndv,
      specColor,
      roughness) * horiz;
  }
  // Remove occlusions on shiny reflections
  contribS *= mix(occlusion, 1.0, glossiness * glossiness) / float(nbSamples);

  vec3 contribEm = emissive_intensity * texture2D(emissive_tex, inputs.tex_coord).rgb;
  return vec4(diffColor,1.0);
  return vec4(contribS + contribE + contribEm, 1.0);
}

//pbr

//: metadata {
//:   "mdl":"mdl::alg::materials::physically_metallic_roughness::physically_metallic_roughness"
//: }

//: param auto channel_basecolor
uniform sampler2D basecolor_tex;
//: param auto channel_roughness
uniform sampler2D roughness_tex;
//: param auto channel_metallic
uniform sampler2D metallic_tex;
//: param auto channel_normal
uniform sampler2D normal_tex;

//自己控制的参数
//: param custom { "default": 0, "label": "Color RGB", "widget": "color" }
uniform vec3 u_color_float3;
//: param custom { "default": 1, "label": "Color RGBA", "widget": "color" }
uniform vec4 u_color_float4;

// /: param custom { "default": "texture_name", "label": "Texture", "usage": "texture" }
//uniform sampler2D u_sampler3;

vec4 shade(V2F inputs) {
  // Fetch material parameters, and conversion to the specular/glossiness model
  float glossiness = 1.0 - getRoughness(roughness_tex, inputs.tex_coord);
  vec3 baseColor = getBaseColor(basecolor_tex, inputs.tex_coord);
  float metallic = getMetallic(metallic_tex, inputs.tex_coord);
  vec3 diffColor = generateDiffuseColor(baseColor, metallic);
  vec3 specColor = generateSpecularColor(baseColor, metallic);
  // Get detail (ambient occlusion) and global (shadow) occlusion factors
  float occlusion = getAO(inputs.tex_coord) * getShadowFactor();

  // Feed parameters for a physically based BRDF integration
  //return vec4(inputs.normal.xyz,1.0);
  return pbrComputeBRDF(inputs, diffColor, specColor, glossiness, occlusion);

  //return texture2D(normal_tex,inputs.tex_coord);
}

void shadeShadow(V2F inputs)
{
}