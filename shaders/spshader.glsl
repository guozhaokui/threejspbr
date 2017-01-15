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
import lib-pbr.glsl

//: metadata {
//:   "mdl":"mdl::alg::materials::physically_metallic_roughness::physically_metallic_roughness"
//: }

uniform sampler2D basecolor_tex;
//: param auto channel_roughness
uniform sampler2D roughness_tex;
//: param auto channel_metallic
uniform sampler2D metallic_tex;
//: param auto channel_normal
uniform sampler2D normal_tex;
//uniform sampler2D texture_normal;

//自己控制的参数
//: param custom { "default": 0, "label": "Color RGB", "widget": "color" }
uniform vec3 u_color_float3;
//: param custom { "default": 1, "label": "Color RGBA", "widget": "color" }
uniform vec4 u_color_float4;

//: param custom { "default": "texture_name", "label": "Texture", "usage": "texture" }
uniform sampler2D u_sampler3;

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
  return pbrComputeBRDF(inputs, diffColor, specColor, glossiness, occlusion);
  //return texture2D(normal_tex,inputs.tex_coord);
}

void shadeShadow(V2F inputs)
{
}