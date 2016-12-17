#version 100
#ifdef GL_FRAGMENT_PRECISION_HIGH
 precision highp float;
 #else
 precision mediump float;
#endif
#define LUV
uniform samplerCube uEnvironmentCube;

uniform mat4 uEnvironmentTransform;
uniform float uLod;
uniform float uBrightness;
uniform vec2 uEnvironmentLodRange;
#extension GL_EXT_shader_texture_lod : enable
uniform vec2 uEnvironmentSize;

varying vec3 vViewVertex;
varying vec3 vViewNormal;
varying vec2 vTexCoord0;
varying vec3 vLocalVertex;


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



mat3 getEnvironmentTransfrom( mat4 transform ) {
    vec3 x = vec3(transform[0][0], transform[1][0], transform[2][0]);
    vec3 y = vec3(transform[0][1], transform[1][1], transform[2][1]);
    vec3 z = vec3(transform[0][2], transform[1][2], transform[2][2]);
    mat3 m = mat3(x,y,z);
    return m;
}

void main() {
    vec3 direction = normalize( vViewNormal);
    //direction = normalize(vLocalVertex.xyz);
    direction = getEnvironmentTransfrom( uEnvironmentTransform ) * direction;
#ifdef CUBEMAP_LOD
    vec3 color = uBrightness * textureCubeLodEXTFixed(uEnvironmentCube, direction, uLod ).rgb;
#else
    vec3 color = uBrightness * textureCubeFixed( uEnvironmentCube, direction ).rgb;
#endif
    //color = textureCube(uEnvironment, direction ).rgb;
    gl_FragColor = vec4( linearTosRGB(color, DefaultGamma ), 1.0);
}    