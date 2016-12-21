
varying vec2 vUv;
varying vec3 vNorm;
mat4 viewmat1;
void main() {
    vUv = uv;
    viewmat1 = modelViewMatrix;
    vNorm =  normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
