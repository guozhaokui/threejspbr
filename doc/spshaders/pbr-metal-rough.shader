//- Allegorithmic Metal/Rough PBR shader
//- ====================================
//-
//- Import from libraries.
import lib-sampler.glsl
import lib-pbr.glsl

//- Declare the iray mdl material to use with this shader.
//: metadata {
//:   "mdl":"mdl::alg::materials::physically_metallic_roughness::physically_metallic_roughness"
//: }

//- Channels needed for metal/rough workflow are bound here.
//: param auto channel_basecolor
uniform sampler2D basecolor_tex;
//: param auto channel_roughness
uniform sampler2D roughness_tex;
//: param auto channel_metallic
uniform sampler2D metallic_tex;

//- Shader entry point.
vec4 shade(V2F inputs)
{
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
}

//- Entry point of the shadow pass.
void shadeShadow(V2F inputs)
{
}
