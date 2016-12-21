
varying vec2 vUv;
varying vec3 vNorm;
varying vec4 vViewPos;
void main() {
    vUv = uv;
    vNorm =  (modelViewMatrix*vec4(normal,0.0)).xyz;
    vViewPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * vViewPos;
}
