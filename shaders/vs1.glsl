
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

in vec3 position;
in vec3 normal;
in vec3 tangent;
in vec3 bintangent;
in vec2 uv;

out vec2 vUv;
out vec3 vWorldNorm;
out vec4 vViewPos;
out vec4 vWorldPos;
out vec3 vLightDir;
out vec3 vViewDir;
out vec3 vRefDir;
out vec3 vNorm;

invariant gl_Position;

void main() {
    vUv = uv;
    vWorldPos = modelMatrix*vec4(position, 1.0);
    vNorm = normal;
    vWorldNorm =  (modelMatrix*vec4(normal,0.0)).xyz;
    vViewPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(vWorldPos.xyz-cameraPosition);
    vRefDir = reflect(vViewDir,vWorldNorm);
    gl_Position = projectionMatrix * vViewPos;
}
