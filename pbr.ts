/// <reference path="typings/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

camera.position.z = 5;


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

function setupScene(){
    var shadermtlparam :THREE.ShaderMaterialParameters={};
    shadermtlparam.vertexShader= THREE.Cache.get('./vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
    shadermtlparam.fragmentShader=THREE.Cache.get('./ps1.glsl');
    shadermtlparam.uniforms={
        tex1:{value:tex1}
    };
    var mtl2 = new THREE.ShaderMaterial(shadermtlparam);

    //scene obj
    var geometry = new THREE.SphereGeometry(1,20,20);
    //var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    sphere = new THREE.Mesh( geometry, mtl2 );
    scene.add( sphere );
}

function onloaded(){
    setupScene();
}

//anim
function  update(){
    //cube.rotation.x +=0.1;
    if(sphere)
        sphere.rotation.y +=0.01;
}

//render
function render() {
    update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}
render();

var ll = new THREE.ObjectLoader();

