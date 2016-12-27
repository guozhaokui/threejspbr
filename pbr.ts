/// <reference path="typings/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

import * as fs from 'fs';

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
//TODO 这里用了扩展，手机应该是不支持的
renderer.context.getExtension('OES_texture_float');
renderer.context.getExtension( 'OES_texture_float_linear' );

document.body.appendChild( renderer.domElement );

camera.position.z = 5;

var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.rotateSpeed = 0.35;

var dirlight = new THREE.DirectionalLight(0xffffff,1.0);
dirlight.position.set(50,200,100);
dirlight.castShadow =false;
dirlight.shadow.mapSize.width=1024;
dirlight.shadow.mapSize.height=1024;
var d=300;
//dirlight.shadow.camera.left=-d;

//texture
var loader = new THREE.TextureLoader();
var tex1 = loader.load('./imgs/test1.png',(tex)=>{
});
tex1.wrapS=tex1.wrapT=THREE.RepeatWrapping;
tex1.anisotropy=16;

var texenv0 = loader.load('./imgs/env/env2.jpg',tex=>{});
var texenv = loader.load('./imgs/env/env2_2k.png',tex=>{});
texenv.wrapS=THREE.RepeatWrapping;
texenv.minFilter = THREE.NearestFilter;
var texenvl = loader.load('./imgs/env/env2_Env.png',tex=>{});

//var geo2 = new THREE.ParametricGeometry(clothFunction,cloth.w,cloth.h);
//geo2.dynamic = true;

THREE.Cache.enabled=true;   //打开文件缓存
var loadermgr = new THREE.LoadingManager(
    onloaded,
    (url,loaded,total)=>{
        console.log(url+','+loaded+','+total);
    }
)

var sphere:THREE.Mesh=null;
var glslloader = new THREE.XHRLoader(loadermgr);
glslloader.load('./vs1.glsl');
glslloader.load('./ps1.glsl');

var shadermtlparam :THREE.ShaderMaterialParameters={};
var sceok=false;


/**
 * vdc算法产生的序列。这个比random要均匀一些。
 */
var tmpUint = new Uint32Array(1);
 function radicalInverse_VdC(bits:number):number {
     //先颠倒前后16位
     bits = (bits << 16) | (bits >>> 16);
     //下面颠倒16位中的前后8位
     bits = ((bits & 0x55555555) << 1) | ((bits & 0xAAAAAAAA) >>> 1);
     bits = ((bits & 0x33333333) << 2) | ((bits & 0xCCCCCCCC) >>> 2);
     bits = ((bits & 0x0F0F0F0F) << 4) | ((bits & 0xF0F0F0F0) >>> 4);
     bits = ((bits & 0x00FF00FF) << 8) | ((bits & 0xFF00FF00) >>> 8);
     //必须是uint的
     tmpUint[0]=bits;
     return tmpUint[0] * 2.3283064365386963e-10; // / 0x100000000
 }

/**
 * 
 */
function createHammersleyTex(w:number, h:number):Float32Array{
    var ret = new Float32Array(w*h*4);
    var ri=0;
    var ci=0;
    for(ci=0; ci<w*h; ci++){
        var v = radicalInverse_VdC(ci);
        ret[ri++] = v;
        ret[ri++]=0;
        ret[ri++]=0;
        ret[ri++]=1.0;
    }
    return ret;
}
function setupScene(){
    var noiseTex1 = new THREE.DataTexture(createHammersleyTex(32,32),32,32,THREE.RGBAFormat,THREE.FloatType,THREE.Texture.DEFAULT_MAPPING,
    THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.NearestFilter);
    noiseTex1.needsUpdate =true;

    
    shadermtlparam.vertexShader= THREE.Cache.get('./vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
    shadermtlparam.fragmentShader=THREE.Cache.get('./ps1.glsl');
    shadermtlparam.uniforms={
        tex1:{value:tex1},
        texEnv:{value:texenv},
        texEnvl:{value:texenvl},
        texNoise1:{value:noiseTex1},
        u_fresnel0:{value:{x:1.0,y:1.0,z:1.0}},
        u_roughness:{value:0.5},
        u_lightDir:{value:{x:0,y:1,z:0}}
    };
    var mtl2 = new THREE.ShaderMaterial(shadermtlparam);
    //mtl2.extensions = {a:0};

    //scene obj
    var geometry = new THREE.SphereGeometry(1,40,40);
    //var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    sphere = new THREE.Mesh( geometry, mtl2 );
    scene.add( sphere );

    var mtlsky = new THREE.MeshBasicMaterial({
        side:THREE.DoubleSide,
        color:0xffffffff,
        map:texenv0
    });
    var skysphere = new THREE.Mesh( new THREE.SphereGeometry(100,40,40),mtlsky);
    scene.add(skysphere);
    sceok=true;
}

function onloaded(){
    setupScene();
}

//anim
var effectController  = {
    f0r:.2,
    f0g:.2,
    f0b:.2,
    roughness:0.5
};
var lightdir=[0,1,0];
function  update(){
    //cube.rotation.x +=0.1;
    controls.update();
    if(sphere){
        //sphere.rotation.y +=0.01;
    }
}

//render
function render() {
    update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}
render();

var ll = new THREE.ObjectLoader();

var parsehdr = require('parse-hdr');
function testReadHDR(){
    var file = 'F:/work/osgjs/examples/hdr/textures/Walk_Of_Fame/Mans_Outside_2k.hdr';
    var buff = fs.readFileSync(file);
    var img = parsehdr(buff);
    console.log(img.shape);
    console.log(img.exposure);
    console.log(img.gamma);
    console.log(img.data[1]);//w*h*3
}

//testReadHDR();

//UI
function onUniformChange(){
    if(sceok){
        //shadermtlparam.uniforms.u_fresnel0.value=f0;
        shadermtlparam.uniforms.u_roughness.value = effectController.roughness;
        var lightdirlen = Math.sqrt( lightdir[0]*lightdir[0]+lightdir[1]*lightdir[1]+lightdir[2]*lightdir[2]);
        shadermtlparam.uniforms.u_lightDir.value.x = lightdir[0]/lightdirlen;
        shadermtlparam.uniforms.u_lightDir.value.y = lightdir[1]/lightdirlen;
        shadermtlparam.uniforms.u_lightDir.value.z = lightdir[2]/lightdirlen;
        shadermtlparam.uniforms.u_fresnel0.value.x = effectController.f0r;
        shadermtlparam.uniforms.u_fresnel0.value.y = effectController.f0g;
        shadermtlparam.uniforms.u_fresnel0.value.z = effectController.f0b;
    }
}
var gui = new (window as any).dat.GUI();
gui.add(effectController,'f0r',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'f0g',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'f0b',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'roughness',0,1,0.01).onChange(onUniformChange);
alert(gui);