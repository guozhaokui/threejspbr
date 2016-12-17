
Object3D.matrixAutoUpdate 这个如果设置了，就会每帧都去计算矩阵。不管是否发生了变化
如果需要自己控制什么时候计算就调用 updateMatrix()
但是如果调用matrix的方法，就
object.matrix.setRotationFromQuaternion(quaternion);
object.matrix.setPosition(start_position);
object.matrixAutoUpdate = false;            //防止修改被冲掉


## Loader

## light

## 材质
material是基类，基本不用，使用的都是具体的继承类

## render
renderer.render( scene, camera );
场景的ambient scene.add( new THREE.AmbientLight( 0x666666 ) );

WebGLProgram
    这里与shader有关，
    var glVertexShader = THREE.WebGLShader( gl, gl.VERTEX_SHADER, vertexGlsl );
    var glFragmentShader = THREE.WebGLShader( gl, gl.FRAGMENT_SHADER, fragmentGlsl );
    
    在shader中把一些常用的东西都省略了，实际vs的前缀包括
```c++
precision xx float
precision xx int
#define SHADER_NAME xx
...
#define MAX_BONES xx
...
#define USE_SPECULARMAP
#define USE_ROUGHNESSMAP
#define USE_METALNESSMAP
...
#define BONE_TEXTURE
'uniform mat4 modelMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform mat4 projectionMatrix;',
'uniform mat4 viewMatrix;',
'uniform mat3 normalMatrix;',
'uniform vec3 cameraPosition;',

'attribute vec3 position;',
'attribute vec3 normal;',
'attribute vec2 uv;',

'#ifdef USE_COLOR',

'	attribute vec3 color;',

'#endif',

'#ifdef USE_MORPHTARGETS',

'	attribute vec3 morphTarget0;',
'	attribute vec3 morphTarget1;',
'	attribute vec3 morphTarget2;',
'	attribute vec3 morphTarget3;',

'	#ifdef USE_MORPHNORMALS',

'		attribute vec3 morphNormal0;',
'		attribute vec3 morphNormal1;',
'		attribute vec3 morphNormal2;',
'		attribute vec3 morphNormal3;',

'	#else',

'		attribute vec3 morphTarget4;',
'		attribute vec3 morphTarget5;',
'		attribute vec3 morphTarget6;',
'		attribute vec3 morphTarget7;',

'	#endif',

'#endif',

'#ifdef USE_SKINNING',

'	attribute vec4 skinIndex;',
'	attribute vec4 skinWeight;',

'#endif',
```
ps的类似，
```
...
'uniform mat4 viewMatrix;',
'uniform vec3 cameraPosition;',
#define TONE_MAPPING                
```
shader中的#include 是自己做的， parseInclude

gl.bindAttribLocation



## 阴影
light.castShadow=true

## 多输出
GL_EXT_draw_buffers 这个扩展允许使用MRT
( extensions.drawBuffers ) && rendererExtensions.get( 'WEBGL_draw_buffers' ) ? '#extension GL_EXT_draw_buffers : require' : '',
例如在ps中
gl_FragData[ 0 ] = packDepthToRGBA( gl_FragCoord.z );
    
