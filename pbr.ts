/// <reference path="typings/index.d.ts" />


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//scene obj
var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

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

var mtl1 = new THREE.MeshPhongMaterial({map:tex1,specular:0xffffff,side:THREE.DoubleSide,alphaTest:0.5});
var geo2 = new THREE.ParametricGeometry(clothFunction,cloth.w,cloth.h);
//geo2.dynamic = true;

var uniforms={texture:{value:tex1}};

//anim
function  update(){
    cube.rotation.x +=0.1;
    cube.rotation.y +=0.1;
}

//render
function render() {
    update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}
render();

var ll = new THREE.ObjectLoader();

