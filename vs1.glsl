
varying vec2 vUv;
varying vec3 vWorldNorm;
varying vec4 vViewPos;
varying vec4 vWorldPos;
varying vec3 vLightDir;
varying vec3 vViewDir;
varying vec3 vRefDir;
void main() {
    vUv = uv;
    vWorldPos = modelMatrix*vec4(position, 1.0);
    vWorldNorm =  (modelMatrix*vec4(normal,0.0)).xyz;
    vViewPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(vWorldPos.xyz-cameraPosition);
    vRefDir = reflect(vViewDir,vWorldNorm);
    gl_Position = projectionMatrix * vViewPos;
}
