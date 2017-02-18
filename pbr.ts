import { loader_lh } from './model';
import { MapLoader } from './pbrmtl';
/// <reference path="typings/index.d.ts" />

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

//TEST
var bb = new loader_lh();

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

//var geo2 = new THREE.ParametricGeometry(clothFunction,cloth.w,cloth.h);
//geo2.dynamic = true;

THREE.Cache.enabled=true;   //打开文件缓存
var loadermgr = new THREE.LoadingManager(
    onloaded,
    (url,loaded,total)=>{
        console.log(url+','+loaded+','+total);
    }
)

var mloader = new MapLoader(scene);
mloader.load('./assets/maps/sce1.json',scene);

//texture
var loader = new THREE.TextureLoader(loadermgr);
var tex1 = loader.load('./imgs/test1.png',(tex)=>{
});
tex1.wrapS=tex1.wrapT=THREE.RepeatWrapping;
tex1.anisotropy=16;

function loadEnv1(env:string):THREE.Texture{
    var p = './imgs/env/'+env+'/';

    var texenv = loader.load( p+'env_0.hdr.png',tex=>{});
    texenv.wrapS=THREE.RepeatWrapping;
    texenv.minFilter = THREE.NearestFilter;

    var mtlsky = new THREE.MeshBasicMaterial({
        side:THREE.DoubleSide,
        color:0xffffffff,
        map:loader.load(p+'env.png',tex=>{tex.minFilter=THREE.NearestFilter;})
    });
    var skysphere = new THREE.Mesh( new THREE.SphereGeometry(100,40,40),mtlsky);
    scene.add(skysphere);
    return texenv;
}

var binxhrloader = new THREE.XHRLoader(loadermgr);
binxhrloader.responseType='arraybuffer';
var texBRDFLUT:THREE.DataTexture=null;
binxhrloader.load('./imgs/oo.raw',(res)=>{
    var ab = (res as any) as ArrayBuffer;
    var u8ab = new Uint8Array(ab);
    texBRDFLUT = new THREE.DataTexture(u8ab,256,256,THREE.RGBAFormat,THREE.UnsignedByteType,THREE.Texture.DEFAULT_MAPPING,
    THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.NearestFilter);
    texBRDFLUT.needsUpdate=true;
});

function createImgDataFromRaw(Buff:Buffer){
    var w = Buff.readUInt32LE(0);
    var h = Buff.readUInt32LE(4);
    //var dtbuf = Buff.buffer.slice(8);
    //var data = new ImageData(w,h);    threejs不能直接使用ImageData对象，因为它需要Uint8Array
    var dt1 = new Uint8Array( (new Uint8Array(Buff)).buffer,8);
    return {width:w,height:h,data:dt1};
    /*
    data.data.forEach((v,i,arr)=>{
        arr[i]=dt1[i];
    })
    return data;
    */
}

function createColorImg(w:number, h:number, col:number){
    var num = w*h;
    var dt = new Uint32Array(num);
    for(var i=0; i<num; i++){
        dt[i]=col;
    }
    return {width:w,height:h,data:new Uint8Array(dt.buffer)};
}

function loadEnv(env:string):THREE.Texture{
    var p = './imgs/env/'+env+'/';

    var fs = require('fs');
    var dd = fs.readFileSync( p+'env_0.hdr.raw');

    var dt1 = null;// new Uint8Array(dd.buffer.slice(8));
    var texenv = new THREE.DataTexture(dt1,2048,1024,THREE.RGBAFormat,THREE.UnsignedByteType,THREE.Texture.DEFAULT_MAPPING,
        THREE.RepeatWrapping, THREE.ClampToEdgeWrapping,THREE.LinearFilter,THREE.LinearMipMapLinearFilter);

    //var texenv = loader.load( p+'env_0.hdr.png',tex=>{
    //    tex.minFilter = THREE.LinearMipMapLinearFilter;
    //});
    var mip0 = createImgDataFromRaw( fs.readFileSync( p+'env_0.hdr.raw')); 
    var mip1 = createImgDataFromRaw( fs.readFileSync( p+'env_1.hdr.raw'));
    var mip2 = createImgDataFromRaw( fs.readFileSync( p+'env_2.hdr.raw'));
    var mip3 = createImgDataFromRaw( fs.readFileSync( p+'env_3.hdr.raw'));
    var mip4 = createImgDataFromRaw( fs.readFileSync( p+'env_4.hdr.raw'));
    var mip5 = createImgDataFromRaw( fs.readFileSync( p+'env_5.hdr.raw'));
    var mip6 = createImgDataFromRaw( fs.readFileSync( p+'env_6.hdr.raw'));
    var mip7 = createImgDataFromRaw( fs.readFileSync( p+'env_7.hdr.raw'));
    var mip8 = createImgDataFromRaw( fs.readFileSync( p+'env_8.hdr.raw'));
    var mip9 = createImgDataFromRaw( fs.readFileSync( p+'env_9.hdr.raw'));
    var mip10 = createImgDataFromRaw( fs.readFileSync( p+'env_10.hdr.raw'));
    //TODO 如果不提供1x1的mipmap，就无法使用 LinearMipMapLinearFilter 。所以先凑一个，实际使用的时候，不要选择这个。
    var mip11 = {width:1,height:1,data:new Uint8Array(mip10.data.buffer,0,4)};

    (texenv as any).mipmaps =[
        mip0,
        mip1,mip2,mip3,mip4,mip5,mip6,mip7,mip8,mip9,
        mip10,//createColorImg(2,1,0xff0000),
        mip11
    ];
    texenv.needsUpdate=true;
    return texenv;
}
var texenv = loadEnv('AtticRoom');


var glslloader = new THREE.XHRLoader(loadermgr);
glslloader.load('./shaders/vs1.glsl');
glslloader.load('./shaders/ps1.glsl');

var shadermtlparam :THREE.ShaderMaterialParameters={};
var sceok=false;

var noiseTex1 = new THREE.DataTexture(createHammersleyTex(32,32),32,32,THREE.RGBAFormat,THREE.FloatType,THREE.Texture.DEFAULT_MAPPING,
    THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.NearestFilter);
noiseTex1.needsUpdate =true;


/**
 * vdc算法产生的序列。这个比random要均匀一些。
 */
function radicalInverse_VdC(bits:number):number {
    var tmpUint = new Uint32Array(1);
    return (function(bits:number){
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
    })(bits);
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

class PbrMtl extends THREE.RawShaderMaterial{
    constructor(roughness:number){
        var mtlparam:THREE.ShaderMaterialParameters={};
        mtlparam.vertexShader= THREE.Cache.get('./shaders/vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
        mtlparam.fragmentShader=THREE.Cache.get('./shaders/ps1.glsl');
        mtlparam.uniforms={
            tex1:{value:tex1},
            texEnv:{value:texenv},
            texBRDFLUT:{value:texBRDFLUT},
            texNoise1:{value:noiseTex1},
            u_fresnel0:{value:{x:1.0,y:1.0,z:1.0}},
            u_roughness:{value:roughness},
            u_lightDir:{value:{x:0,y:1,z:0}}
        };
        super(mtlparam);
    }
}

class PbrSphere{
    mtl:PbrMtl|THREE.Material;
    constructor(roughness:number,scene:THREE.Scene,x:number,y:number,z:number,mtl?:THREE.Material){
        var geometry = new THREE.SphereGeometry(1,60,60);//THREE.BoxGeometry(2,2,2,20,20,20);// 
        //var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        if(mtl)this.mtl=mtl;
        else  this.mtl = new PbrMtl(roughness);
        var sphere = new THREE.Mesh( geometry, this.mtl );
        scene.add( sphere );
        sphere.position.set(x,y,z);
    }
}

function setupScene(){
    shadermtlparam.vertexShader= THREE.Cache.get('./shaders/vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
    shadermtlparam.fragmentShader=THREE.Cache.get('./shaders/ps1.glsl');
    shadermtlparam.uniforms={
        tex1:{value:tex1},
        texEnv:{value:texenv},
        texBRDFLUT:{value:texBRDFLUT},
        texNoise1:{value:noiseTex1},
        u_fresnel0:{value:{x:1.0,y:1.0,z:1.0}},
        u_roughness:{value:0.5},
        u_lightDir:{value:{x:0,y:1,z:0}}
    };
    var mtl2 = new THREE.RawShaderMaterial(shadermtlparam);


    /*
    new PbrSphere(0.0,scene,-3,0,0);
    new PbrSphere(0.2,scene,-1,0,0);
    new PbrSphere(0.3,scene,1,0,0);
    new PbrSphere(0.4,scene,3,0,0);
    new PbrSphere(0.5,scene,5,0,0);
    new PbrSphere(0.6,scene,7,0,0);
    new PbrSphere(0.7,scene,9,0,0);
    new PbrSphere(0.8,scene,11,0,0);
    new PbrSphere(0.9,scene,13,0,0);
    new PbrSphere(1.0,scene,15,0,0);
    */
    var testsph = new PbrSphere(.3,scene,0,0,3,mtl2);

    var objmodloader = new (THREE as any).OBJLoader();
    objmodloader.load('./assets/models/jianling/o.obj',function(o:THREE.Group){
        o.children.forEach((v:THREE.Mesh)=>{
            var tex1 = loader.load('./assets/models/jianling/'+v.name+ '_D.png',tex=>{});
            var mtl = new THREE.MeshBasicMaterial({map:tex1});
            v.material = new PbrMtl(0.5);
            //alert(v.material.uniforms);
            //v.scale.set(0.05,0.05,0.05);
            v.position.set(1.5,0,4);
            var b=v;
        });
        scene.add(o);
    });

    sceok=true;
}

function onloaded(){
    setupScene();
}

//anim
var effectController  = {
    f0r:1.0,
    f0g:1.0,
    f0b:1.0,
    roughness:0.5,
    refresh:0.0,
};
var lightdir=[0,1,0];
function  update(){
    //cube.rotation.x +=0.1;
    controls.update();
}

//render
function render() {
    update();
	requestAnimationFrame( render );
	renderer.render( scene, camera );
}
render();

var ll = new THREE.ObjectLoader();

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

function refreshshader(){
    mloader.refreshshader();
}
var gui = new (window as any).dat.GUI();
gui.add(effectController,'f0r',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'f0g',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'f0b',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'roughness',0,1,0.01).onChange(onUniformChange);
gui.add(effectController,'refresh',0,1,0.01).onChange(refreshshader);
