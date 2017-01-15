//读取 MERL BRDF Database

uniform samplerBuffer measuredData;

const int BRDF_SAMPLING_RES_THETA_H = 90;
const int BRDF_SAMPLING_RES_THETA_D = 90;
const int BRDF_SAMPLING_RES_PHI_D   = 360;
const float M_PI = 3.1415926535897932384626433832795;
const float RED_SCALE = (1.0/1500.0);
const float GREEN_SCALE = (1.15/1500.0);
const float BLUE_SCALE = (1.66/1500.0);


// Lookup phi_diff index
int phi_diff_index(float phi_diff)
{
    // Because of reciprocity, the BRDF is unchanged under
    // phi_diff -> phi_diff + M_PI
    if (phi_diff < 0.0)
        phi_diff += M_PI;

    // In: phi_diff in [0 .. pi]
    // Out: tmp in [0 .. 179]
    return clamp(int(phi_diff * (1.0/M_PI * (BRDF_SAMPLING_RES_PHI_D / 2))), 0, BRDF_SAMPLING_RES_PHI_D / 2 - 1);
}


// Lookup theta_half index
// This is a non-linear mapping!
// In:  [0 .. pi/2]
// Out: [0 .. 89]
int theta_half_index(float theta_half)
{
    if (theta_half <= 0.0)
        return 0;

    return clamp(int(sqrt(theta_half * (2.0/M_PI)) * BRDF_SAMPLING_RES_THETA_H), 0, BRDF_SAMPLING_RES_THETA_H-1);
}


// Lookup theta_diff index
// In:  [0 .. pi/2]
// Out: [0 .. 89]
int theta_diff_index(float theta_diff)
{
    return clamp(int(theta_diff * (2.0/M_PI * BRDF_SAMPLING_RES_THETA_D)), 0, BRDF_SAMPLING_RES_THETA_D - 1);
}



vec3 BRDF( vec3 toLight, vec3 toViewer, vec3 normal, vec3 tangent, vec3 bitangent )
{
    vec3 H = normalize(toLight + toViewer);
    float theta_H = acos(clamp(dot(normal, H), 0, 1));
    float theta_diff = acos(clamp(dot(H, toLight), 0, 1));
    float phi_diff=0;

    if (theta_diff < 1e-3) {
        // phi_diff indeterminate, use phi_half instead
        phi_diff = atan(clamp(-dot(toLight, bitangent), -1, 1), clamp(dot(toLight, tangent), -1, 1));
    }
    else if (theta_H > 1e-3) {
        // use Gram-Schmidt orthonormalization to find diff basis vectors
        vec3 u = -normalize(normal - dot(normal,H) * H);
        vec3 v = cross(H, u);
        phi_diff = atan(clamp(dot(toLight,v), -1, 1), clamp(dot(toLight,u), -1, 1));
    }
    else theta_H = 0;

    // Find index.
    // Note that phi_half is ignored, since isotropic BRDFs are assumed
    int ind = phi_diff_index(phi_diff) +
        theta_diff_index(theta_diff) * BRDF_SAMPLING_RES_PHI_D / 2 +
        theta_half_index(theta_H) * BRDF_SAMPLING_RES_PHI_D / 2 *
        BRDF_SAMPLING_RES_THETA_D;

    int redIndex = ind;
    int greenIndex = ind + BRDF_SAMPLING_RES_THETA_H*BRDF_SAMPLING_RES_THETA_D*BRDF_SAMPLING_RES_PHI_D/2;
    int blueIndex = ind + BRDF_SAMPLING_RES_THETA_H*BRDF_SAMPLING_RES_THETA_D*BRDF_SAMPLING_RES_PHI_D;

    return vec3(
                texelFetch(measuredData, redIndex).r * RED_SCALE,
                texelFetch(measuredData, greenIndex).r * GREEN_SCALE,
                texelFetch(measuredData, blueIndex).r * BLUE_SCALE
                );
}
