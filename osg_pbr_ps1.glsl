#version 100
#ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
#endif
#define CUBEMAP_LOD 
#define LUV
#define NO_TANGENT
#define PI 3.1415926535897932384626433832795
#define PI_2 (2.0*3.1415926535897932384626433832795)
#define INV_PI 1.0/PI
#define INV_LOG2 1.4426950408889634073599246810019

uniform mat4 uEnvironmentTransform;

#ifdef CUBEMAP_LOD
uniform samplerCube uEnvironmentCube;
#extension GL_EXT_shader_texture_lod : enable
#endif

#ifdef PANORAMA
uniform sampler2D uEnvironment;
#endif

uniform vec2 uEnvironmentSize;
uniform vec2 uEnvironmentLodRange;
uniform float uLod;

uniform float uBrightness;

uniform sampler2D uIntegrateBRDF; // ue4

uniform vec3 uEnvironmentSphericalHarmonics[9];

varying vec3 vViewVertex;
varying vec3 vViewNormal;
varying vec2 vTexCoord0;
varying vec4 vViewTangent;

mat3 environmentTransform;

uniform sampler2D albedoMap;
uniform sampler2D roughnessMap;
uniform sampler2D normalMap;
uniform sampler2D specularMap;
uniform sampler2D aoMap;
uniform int uFlipNormalY;
uniform int uNormalAA;
uniform int uSpecularPeak;
uniform int uOcclusionHorizon;

#ifdef DEBUG
#define PI 3.1415926535897932384626433832795

vec3 shCoefs[9];

void createCoef() {

    // vec3(  1.0/(2.0*sqrt(PI) ) ),

    // vec3( -( sqrt(3.0/PI)*0.5 * y ) ),
    // vec3( ( sqrt(3.0/PI)*0.5 * z ) ),
    // vec3( -( sqrt(3.0/PI)*0.5 * x ) ),

    // vec3( ( sqrt(15.0/PI)*0.5 * x * y ) ),
    // vec3( -( sqrt(15.0/PI)*0.5 * y * z ) ),
    // vec3( ( sqrt(5.0/PI)* 0.25 * ( 3.0*z*z - 1.0) ) ),
    // vec3( -( sqrt(15.0/PI)* 0.5 * x *z ) ),
    // vec3( ( sqrt(15.0/PI) * 0.25 * (x*x - y*y )) ),

    shCoefs[0] = vec3(  1.0/(2.0*sqrt(PI) ) );

    shCoefs[1] = vec3( -( sqrt(3.0/PI)*0.5 ) );
    shCoefs[2] = -shCoefs[1];
    shCoefs[3] = shCoefs[1];

    shCoefs[4] = vec3( sqrt(15.0/PI)*0.5 );
    shCoefs[5] = -shCoefs[4];
    shCoefs[6] = vec3( sqrt(5.0/PI)* 0.25 );
    shCoefs[7] = shCoefs[5];
    shCoefs[8] = vec3( sqrt(15.0/PI) * 0.25 );

}

vec3 sphericalHarmonics( const in vec3 normal )
{
    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    createCoef();
    vec3 result = (
        shCoefs[0] * uSph[0] +

        shCoefs[1] * uSph[1] * y +
        shCoefs[2] * uSph[2] * z +
        shCoefs[3] * uSph[3] * x +

        shCoefs[4] * uSph[4] * y * x +
        shCoefs[5] * uSph[5] * y * z +
        shCoefs[6] * uSph[6] * (3.0 * z * z - 1.0) +
        shCoefs[7] * uSph[7] * (z * x) +
        shCoefs[8] * uSph[8] * (x*x - y*y)
    );
}

#else
// expect shCoefs uniform
// https://github.com/cedricpinson/envtools/blob/master/Cubemap.cpp#L523
vec3 sphericalHarmonics( const vec3 sph[9], const in vec3 normal )
{
    float x = normal.x;
    float y = normal.y;
    float z = normal.z;

    vec3 result = (
        sph[0] +

        sph[1] * y +
        sph[2] * z +
        sph[3] * x +

        sph[4] * y * x +
        sph[5] * y * z +
        sph[6] * (3.0 * z * z - 1.0) +
        sph[7] * (z * x) +
        sph[8] * (x*x - y*y)
    );

    return max(result, vec3(0.0));
}

#endif


#define DefaultGamma 2.4

float linearrgb_to_srgb1(const in float c, const in float gamma)
{
    float v = 0.0;
    if(c < 0.0031308) {
        if ( c > 0.0)
            v = c * 12.92;
    } else {
        v = 1.055 * pow(c, 1.0/ gamma) - 0.055;
    }
    return v;
}

// coding style should be camel case except for acronyme like SRGB or HDR
vec4 linearTosRGB(const in vec4 col_from, const in float gamma)
{
    vec4 col_to;
    col_to.r = linearrgb_to_srgb1(col_from.r, gamma);
    col_to.g = linearrgb_to_srgb1(col_from.g, gamma);
    col_to.b = linearrgb_to_srgb1(col_from.b, gamma);
    col_to.a = col_from.a;
    return col_to;
}

vec3 linearTosRGB(const in vec3 col_from, const in float gamma)
{
    vec3 col_to;
    col_to.r = linearrgb_to_srgb1(col_from.r, gamma);
    col_to.g = linearrgb_to_srgb1(col_from.g, gamma);
    col_to.b = linearrgb_to_srgb1(col_from.b, gamma);
    return col_to;
}

float sRGBToLinear(const in float c, const in float gamma)
{
    float v = 0.0;
    if ( c < 0.04045 ) {
        if ( c >= 0.0 )
            v = c * ( 1.0 / 12.92 );
    } else {
        v = pow( ( c + 0.055 ) * ( 1.0 / 1.055 ), gamma );
    }
    return v;
}
vec4 sRGBToLinear(const in vec4 col_from, const in float gamma)
{
    vec4 col_to;
    col_to.r = sRGBToLinear(col_from.r, gamma);
    col_to.g = sRGBToLinear(col_from.g, gamma);
    col_to.b = sRGBToLinear(col_from.b, gamma);
    col_to.a = col_from.a;
    return col_to;
}
vec3 sRGBToLinear(const in vec3 col_from, const in float gamma)
{
    vec3 col_to;
    col_to.r = sRGBToLinear(col_from.r, gamma);
    col_to.g = sRGBToLinear(col_from.g, gamma);
    col_to.b = sRGBToLinear(col_from.b, gamma);
    return col_to;
}

vec3 RGBEToRGB( const in vec4 rgba )
{
    float f = pow(2.0, rgba.w * 255.0 - (128.0 + 8.0));
    return rgba.rgb * (255.0 * f);
}

//http://graphicrants.blogspot.fr/2009/04/rgbm-color-encoding.html
vec3 RGBMToRGB( const in vec4 rgba )
{
    const float maxRange = 8.0;
    return rgba.rgb * maxRange * rgba.a;
}


const mat3 LUVInverse = mat3( 6.0013,    -2.700,   -1.7995,
                              -1.332,    3.1029,   -5.7720,
                              0.3007,    -1.088,    5.6268 );

vec3 LUVToRGB( const in vec4 vLogLuv )
{
    float Le = vLogLuv.z * 255.0 + vLogLuv.w;
    vec3 Xp_Y_XYZp;
    Xp_Y_XYZp.y = exp2((Le - 127.0) / 2.0);
    Xp_Y_XYZp.z = Xp_Y_XYZp.y / vLogLuv.y;
    Xp_Y_XYZp.x = vLogLuv.x * Xp_Y_XYZp.z;
    vec3 vRGB = LUVInverse * Xp_Y_XYZp;
    return max(vRGB, 0.0);
}



// From Sebastien Lagarde Moving Frostbite to PBR page 69
// We have a better approximation of the off specular peak
// but due to the other approximations we found this one performs better.
// N is the normal direction
// R is the mirror vector
// This approximation works fine for G smith correlated and uncorrelated
vec3 getSpecularDominantDir(const in vec3 N, const in vec3 R, const in float realRoughness)
{
    vec3 dominant;
    if ( uSpecularPeak == 1 ) {
        float smoothness = 1.0 - realRoughness;
        float lerpFactor = smoothness * (sqrt(smoothness) + realRoughness);
        // The result is not normalized as we fetch in a cubemap
        dominant = mix(N, R, lerpFactor);
    } else {
        dominant = R;
    }
    return dominant;
}


float occlusionHorizon( const in vec3 R, const in vec3 normal)
{
    if ( uOcclusionHorizon == 0)
        return 1.0;

// http://marmosetco.tumblr.com/post/81245981087
// TODO we set a min value (10%) to avoid pure blackness (in case of pure metal)
    float factor = clamp( 1.0 + 1.3 * dot(R, normal), 0.1, 1.0 );
    return factor * factor;
}


vec3 evaluateDiffuseSphericalHarmonics( const in vec3 N,
                                        const in vec3 V ) {
    return sphericalHarmonics( uEnvironmentSphericalHarmonics, environmentTransform * N );
}


#ifdef CUBEMAP_LOD


vec3 textureCubeRGBE(const in samplerCube texture, const in vec3 uv) {
    vec4 rgbe = textureCube(texture, uv );
    return RGBEToRGB( rgbe );
}


vec3 scaleDirection(const in float scale, const in vec3 dirIn)
{
    vec3 dir = dirIn;
    float M = max(max(abs(dir.x), abs(dir.y)), abs(dir.z));
    if (abs(dir.x) != M) dir.x *= scale;
    if (abs(dir.y) != M) dir.y *= scale;
    if (abs(dir.z) != M) dir.z *= scale;
    return dir;
}

vec3 textureCubemapLod(const in samplerCube texture, const in vec3 dir, const in float lod )
{
    vec4 rgba = textureCubeLodEXT( texture, dir, lod );
#ifdef FLOAT
    return rgba.rgb;
#endif
#ifdef RGBE
    return RGBEToRGB( rgba );
#endif
#ifdef RGBM
    return RGBMToRGB( rgba );
#endif
#ifdef LUV
    return LUVToRGB( rgba );
#endif
}

vec3 textureCubemap(const in samplerCube texture, const in vec3 dir )
{
    vec4 rgba = textureCube( texture, dir );
#ifdef FLOAT
    return rgba.rgb;
#endif
#ifdef RGBE
    return RGBEToRGB( rgba );
#endif
#ifdef RGBM
    return RGBMToRGB( rgba );
#endif
#ifdef LUV
    return LUVToRGB( rgba );
#else
    return rgba.rgb;
#endif
}



vec3 cubemapSeamlessFixDirection(const in vec3 direction, const in float scale )
{
    vec3 dir = direction;
    // http://seblagarde.wordpress.com/2012/06/10/amd-cubemapgen-for-physically-based-rendering/
    float M = max(max(abs(dir.x), abs(dir.y)), abs(dir.z));

    if (abs(dir.x) != M) dir.x *= scale;
    if (abs(dir.y) != M) dir.y *= scale;
    if (abs(dir.z) != M) dir.z *= scale;

    return dir;
}

vec3 textureCubeLodEXTFixed(const in samplerCube texture, const in vec3 direction, const in float lodInput )
{

    float lod = min( uEnvironmentLodRange[0], lodInput );

    // http://seblagarde.wordpress.com/2012/06/10/amd-cubemapgen-for-physically-based-rendering/
    float scale = 1.0 - exp2(lod) / uEnvironmentSize[0];
    vec3 dir = cubemapSeamlessFixDirection( direction, scale);

    return textureCubemapLod( texture, dir, lod ).rgb;
}


// seamless cubemap for background ( no lod )
vec3 textureCubeFixed(const in samplerCube texture, const in vec3 direction )
{
    // http://seblagarde.wordpress.com/2012/06/10/amd-cubemapgen-for-physically-based-rendering/
    float scale = 1.0 - 1.0 / uEnvironmentSize[0];
    vec3 dir = cubemapSeamlessFixDirection( direction, scale);
    return textureCubemap( texture, dir );
}

#endif


#ifdef PANORAMA

#define PI 3.1415926535897932384626433832795
#define PI_2 (2.0*3.1415926535897932384626433832795)
#define INV_PI 1.0/PI
#define INV_LOG2 1.4426950408889634073599246810019



vec2 computeUVForMipmap( const in float level, const in vec2 uv, const in float size, const in float maxLOD ) {

    // width for level
    float widthForLevel = exp2( maxLOD-level);

    // the height locally for the level in pixel
    // to opimitize a bit we scale down the v by two in the inputs uv
    float heightForLevel = widthForLevel * 0.5;


#if 0
    float texelSize = 1.0 / size;

    float resizeX = (widthForLevel - 2.0) * texelSize;
    float resizeY = (heightForLevel - 2.0) * texelSize;

    float uvSpaceLocalX = texelSize + uv.x * resizeX;
    float uvSpaceLocalY = texelSize + uv.y * resizeY;

    uvSpaceLocalY += (size - widthForLevel ) / size;

    return vec2( uvSpaceLocalX, uvSpaceLocalY);

#else
    // compact version
    float texelSize = 1.0/size;
    vec2 uvSpaceLocal =  vec2(1.0) + uv * vec2(widthForLevel - 2.0, heightForLevel - 2.0);
    uvSpaceLocal.y += size - widthForLevel;
    return uvSpaceLocal * texelSize;
#endif

}

//for y up
vec2 normalToPanoramaUVY( const in vec3 dir )
{
    float n = length(dir.xz);

    // to avoid bleeding the max(-1.0,dir.x / n) is needed
    vec2 pos = vec2( (n>0.0000001) ? max(-1.0,dir.x / n) : 0.0, dir.y);

    // fix edge bleeding
    if ( pos.x > 0.0 ) pos.x = min( 0.999999, pos.x );

    pos = acos(pos)*INV_PI;

    pos.x = (dir.z > 0.0) ? pos.x*0.5 : 1.0-(pos.x*0.5);

    // shift u to center the panorama to -z
    pos.x = mod(pos.x-0.25+1.0, 1.0 );
    pos.y = 1.0-pos.y;
    return pos;
}


// for z up
vec2 normalToPanoramaUVZ( const in vec3 dir )
{
    float n = length(dir.xy);

    // to avoid bleeding the max(-1.0,dir.x / n) is needed
    vec2 pos = vec2( (n>0.0000001) ? max(-1.0,dir.x / n) : 0.0, dir.z);

    // fix edge bleeding
    if ( pos.x > 0.0 ) pos.x = min( 0.999999, pos.x );

    pos = acos(pos)*INV_PI;

    // to avoid bleeding the limit must be set to 0.4999999 instead of 0.5
    pos.x = (dir.y > 0.0) ? pos.x*0.5 : 1.0-(pos.x*0.5);

    // shift u to center the panorama to -y
    pos.x = mod(pos.x-0.25+1.0, 1.0 );
    pos.y = 1.0-pos.y;
    return pos;
}

#define normalToPanoramaUV normalToPanoramaUVY


vec3 texturePanorama(const in sampler2D texture, const in vec2 uv)
{
    vec4 rgba = texture2D(texture, uv );
#ifdef FLOAT
    return rgba.rgb;
#endif
#ifdef RGBE
    return RGBEToRGB( rgba );
#endif
#ifdef RGBM
    return RGBMToRGB( rgba );
#endif
#ifdef LUV
    return LUVToRGB( rgba );
#else
    return rgba.rgb;
#endif
}

vec3 texturePanoramaLod(const in sampler2D texture,
                         const in vec2 size ,
                         const in vec3 direction,
                         const in float lodInput,
                         const in float maxLOD ) {

    float lod = min( maxLOD, lodInput );
    vec2 uvBase = normalToPanoramaUV( direction );

    // // we scale down v here because it avoid to do twice in sub functions
    // uvBase.y *= 0.5;

    float lod0 = floor(lod);
    vec2 uv0 = computeUVForMipmap(lod0, uvBase, size.x, maxLOD );
    vec3 texel0 = texturePanorama( texture, uv0.xy);

    float lod1 = ceil(lod);
    vec2 uv1 = computeUVForMipmap(lod1, uvBase, size.x, maxLOD );
    vec3 texel1 = texturePanorama( texture, uv1.xy);

    return mix(texel0, texel1, fract( lod ) );
}

vec3 getTexelPanorama( const in vec3 dir, const in float lod ) {
    vec2 uvBase = normalToPanoramaUV( dir );
    vec3 texel = texturePanoramaLod( uEnvironment,
                                     uEnvironmentSize,
                                     dir,
                                     lod,
                                     uEnvironmentLodRange[0] );
    return texel;
}

vec3 getReferenceTexelEnvironment( const in vec3 dirLocal, const in float lod ) {
    vec3 direction = environmentTransform * dirLocal;
    return getTexelPanorama( direction, lod );
}

#endif


// require:
// uniform int uEnvironmentMaxLod
// samplerCube uEnvironmentCube
// uniform sampler2D uIntegrateBRDF;
// 


// frostbite, lagarde paper p67
// http://www.frostbite.com/wp-content/uploads/2014/11/course_notes_moving_frostbite_to_pbr.pdf
float linRoughnessToMipmap( float roughnessLinear )
{
    //return roughnessLinear;
    return sqrt(roughnessLinear);
}

vec3 prefilterEnvMap( float roughnessLinear, const in vec3 R )
{
#ifdef CUBEMAP_LOD

    float lod = linRoughnessToMipmap(roughnessLinear) * uEnvironmentLodRange[1]; //( uEnvironmentMaxLod - 1.0 );
    return textureCubeLodEXTFixed( uEnvironmentCube, R, lod );

#else

    float lod = linRoughnessToMipmap(roughnessLinear) * uEnvironmentLodRange[1];

    vec2 uvBase = normalToPanoramaUV( R );
    vec3 texel = texturePanoramaLod( uEnvironment,
                                     uEnvironmentSize,
                                     R,
                                     lod,
                                     uEnvironmentLodRange[0] );
    return texel;
#endif
}

vec2 integrateBRDF( float r, float NoV )
{
    vec4 rgba = texture2D( uIntegrateBRDF, vec2(NoV, r ) );

    const float div = 1.0/65535.0;
    float b = (rgba[3] * 65280.0 + rgba[2] * 255.0);
    float a = (rgba[1] * 65280.0 + rgba[0] * 255.0);

    return vec2( a, b ) * div;
}

// https://www.unrealengine.com/blog/physically-based-shading-on-mobile
vec3 integrateBRDFApprox( const in vec3 specular, float roughness, float NoV )
{
    const vec4 c0 = vec4( -1, -0.0275, -0.572, 0.022 );
    const vec4 c1 = vec4( 1, 0.0425, 1.04, -0.04 );
    vec4 r = roughness * c0 + c1;
    float a004 = min( r.x * r.x, exp2( -9.28 * NoV ) ) * r.x + r.y;
    vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
    return specular * AB.x + AB.y;
}

vec3 approximateSpecularIBL( const in vec3 specularColor,
                             float rLinear,
                             const in vec3 N,
                             const in vec3 V )
{
    float roughnessLinear = max( rLinear, 0.0);
    float NoV = clamp( dot( N, V ), 0.0, 1.0 );
    vec3 R = normalize( (2.0 * NoV ) * N - V);


    // From Sebastien Lagarde Moving Frostbite to PBR page 69
    // so roughness = linRoughness * linRoughness
    vec3 dominantR = getSpecularDominantDir( N, R, roughnessLinear*roughnessLinear );

    vec3 dir = environmentTransform * dominantR;
    vec3 prefilteredColor = prefilterEnvMap( roughnessLinear, dir );


    // marmoset tricks
    prefilteredColor *= occlusionHorizon( dominantR, vViewNormal );

#ifdef MOBILE
    return uBrightness * prefilteredColor * integrateBRDFApprox( specularColor, roughnessLinear, NoV );
#else
    vec2 envBRDF = integrateBRDF( roughnessLinear, NoV );
    return uBrightness * prefilteredColor * ( specularColor * envBRDF.x + envBRDF.y );
#endif
}


vec3 computeIBL_UE4( const in vec3 normal,
                     const in vec3 view,
                     const in vec3 albedo,
                     const in float roughness,
                     const in vec3 specular)
{

    vec3 color = vec3(0.0);
    if ( albedo != color ) { // skip if no diffuse
        color += uBrightness * albedo * evaluateDiffuseSphericalHarmonics(normal,
                                                                          view );
    }

    color += approximateSpecularIBL(specular,
                                    roughness,
                                    normal,
                                    view);

    return color;
}



mat3 getEnvironmentTransfrom( mat4 transform ) {
    vec3 x = vec3(transform[0][0], transform[1][0], transform[2][0]);
    vec3 y = vec3(transform[0][1], transform[1][1], transform[2][1]);
    vec3 z = vec3(transform[0][2], transform[1][2], transform[2][2]);
    mat3 m = mat3(x,y,z);
    return m;
}

vec3 computeNormalFromTangentSpaceNormalMap(const in vec4 tangent, const in vec3 normal, const in vec3 texnormal)
{
    vec3 tang = vec3(0.0,1.0,0.0);
    if (length(tangent.xyz) != 0.0) {
        tang = normalize(tangent.xyz);
    }
    vec3 B = -tangent.w * cross(normal, tang);
    vec3 outnormal = texnormal.x*tang + texnormal.y*B + texnormal.z*normal;
    return normalize(outnormal);
}

vec3 textureNormal(const in vec3 rgb) {
    vec3 n = normalize((rgb-vec3(0.5)));
    n[1] = (uFlipNormalY == 1) ? -n[1] : n[1];
    return n;
}

float adjustRoughness( const in float roughness, const in vec3 normal ) {
    // Based on The Order : 1886 SIGGRAPH course notes implementation (page 21 notes)
    float normalLen = length(normal*2.0-1.0);
    if ( normalLen < 1.0) {
        float normalLen2 = normalLen * normalLen;
        float kappa = ( 3.0 * normalLen -  normalLen2 * normalLen )/( 1.0 - normalLen2 );
        // http://www.frostbite.com/2014/11/moving-frostbite-to-pbr/
        // page 91 : they use 0.5/kappa instead
        return min(1.0, sqrt( roughness * roughness + 1.0/kappa ));
    }
    return roughness;
}

void main(void) {

    vec3 normal = normalize(vViewNormal);
    vec3 eye = normalize(vViewVertex);
    vec4 tangent = vViewTangent;
    vec2 uv = vTexCoord0.xy;

    environmentTransform = getEnvironmentTransfrom( uEnvironmentTransform );

    const vec3 dielectricColor = vec3(0.04);
    float minRoughness = 1.e-4;

    vec4 albedoSource = texture2D( albedoMap, uv ).rgba;
    vec3 albedo = sRGBToLinear( albedoSource.rgb, DefaultGamma );

#ifdef NORMAL
    vec3 normalTexel = texture2D( normalMap, uv ).rgb;
    if ( length(normalTexel) > 0.0001 ) {
        vec3 realNormal = textureNormal( normalTexel );
        normal = computeNormalFromTangentSpaceNormalMap( tangent, normal, realNormal );
    }
#endif

    float roughness = texture2D( roughnessMap, uv ).r;
#ifdef GLOSSINESS
    roughness = 1.0 - roughness;
#endif

    roughness = max( minRoughness , roughness );
    float ao = 1.0;

#ifdef NORMAL
    if ( uNormalAA == 1 ) {
        roughness = adjustRoughness( roughness, normalTexel);
    }
#endif

#ifdef AO
    ao = texture2D( aoMap, uv ).r;
#endif

    vec3 specular;

#ifdef SPECULAR
    specular = sRGBToLinear( texture2D( specularMap, vTexCoord0 ), DefaultGamma ).rgb;
#else
    float metallic = texture2D( specularMap, uv ).r;
    vec3 albedoReduced = albedo * (1.0 - metallic);
    specular = mix( dielectricColor, albedo, metallic);
    albedo = albedoReduced;
#endif

    vec3 resultIBL = computeIBL_UE4( normal, -eye, albedo, roughness, specular );
    vec4 result = vec4( resultIBL, 1.0);

    gl_FragColor = linearTosRGB(result, DefaultGamma );
}