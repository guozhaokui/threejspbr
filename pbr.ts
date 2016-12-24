/// <reference path="typings/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

import * as fs from 'fs';

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
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
function setupScene(){
    shadermtlparam.vertexShader= THREE.Cache.get('./vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
    shadermtlparam.fragmentShader=THREE.Cache.get('./ps1.glsl');
    shadermtlparam.uniforms={
        tex1:{value:tex1},
        texEnv:{value:texenv},
        texEnvl:{value:texenvl},
        u_fresnel0:{value:1.0},
        u_roughness:{value:0.5},
        u_lightDir:{value:{x:0,y:1,z:0}}
    };
    var mtl2 = new THREE.ShaderMaterial(shadermtlparam);

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
    var skysphere = new THREE.Mesh( new THREE.SphereGeometry(13,40,40),mtlsky);
    scene.add(skysphere);
    sceok=true;
}

function onloaded(){
    setupScene();
}

//anim
var f0=.2;
var roughness=0.5;
var lightdir=[0,1,0];
function  update(){
    //cube.rotation.x +=0.1;
    controls.update();
    if(sceok){
        shadermtlparam.uniforms.u_fresnel0.value=f0;
        shadermtlparam.uniforms.u_roughness.value = roughness;
        var lightdirlen = Math.sqrt( lightdir[0]*lightdir[0]+lightdir[1]*lightdir[1]+lightdir[2]*lightdir[2]);
        shadermtlparam.uniforms.u_lightDir.x = lightdir[0]/lightdirlen;
        shadermtlparam.uniforms.u_lightDir.y = lightdir[1]/lightdirlen;
        shadermtlparam.uniforms.u_lightDir.z = lightdir[2]/lightdirlen;
    }
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