
varying vec2 vUv;
uniform sampler2D tex1;
void main() {
    gl_FragColor.rgb = texture2D(tex1,vUv).rgb;
    gl_FragColor.a = 1.0;
}
