import { testModel } from './model';
/// <reference path="typings/index.d.ts" />

/**
 * pbr 材质
 * 采用类似UE4的标准
 */


export class UEPbrMtl {
    mtl:THREE.RawShaderMaterial;
    baseColorFile:string;
    normalFile:string;
    ao_rough_metalFile:string;
    mtlparam:THREE.ShaderMaterialParameters={};
    constructor(baseColor:string, normal:string, pbrInfo:string){
        this.mtlparam.vertexShader= THREE.Cache.get('./shaders/vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
        this.mtlparam.fragmentShader=THREE.Cache.get('./shaders/uepbr.glsl');
        this.mtlparam.uniforms={
            texBaseColor:{value:null},
            texNormal:{value:null},
            texORM:{value:null},
            texPreFilterdEnv:{value:null},
            texBRDFLUT:{value:null}
        };
        this.mtl = new THREE.RawShaderMaterial(this.mtlparam);
    }

    set baseColor(imgfile:string){
        this.mtlparam.uniforms.texBaseColor.value='';
        this.baseColorFile=imgfile;
    }
    get baseColor():string{
        return this.baseColorFile;
    }

    set normal(imgfile:string){

    }

    set pbrInfo(imgfile:string){
        this.ao_rough_metalFile = imgfile;
    }

    setup(){
        
    }
}

//test
export class Modelloader{
    constructor(){

    }

    load(src:string){

    }
}

interface threejsloader{
    load(url);
}
export class MapLoader{
    loaderMgr:THREE.LoadingManager;
    binxhrloader:THREE.XHRLoader;
    txtxhrloader:THREE.XHRLoader;
    texloader:THREE.TextureLoader;
    modloader_obj;

    allfiles:string[][]=[];
    scene:THREE.Scene;
    constructor(sce:THREE.Scene){
        this.scene = sce;
        THREE.Cache.enabled=true;   //打开文件缓存
        this.loaderMgr = new THREE.LoadingManager(
            this.onloaded.bind(this),
            (url,loaded,total)=>{
                console.log('-------'+url+','+loaded+','+total);
            }
        )
        this.binxhrloader = new THREE.XHRLoader(this.loaderMgr);
        this.binxhrloader.responseType='arraybuffer';
        this.allfiles.push([]);//0
        //.assets/imgs/pbrlut.raw
        //assets/imgs/env/AtticRoom/ env_0.hdr.raw  ~ env_10.hdr.raw

        this.txtxhrloader = new THREE.XHRLoader(this.loaderMgr);
        this.allfiles.push([]);//1
        //./shaders/vs1.glsl ./shaders/uepbr.glsl

        this.texloader = new THREE.TextureLoader(this.loaderMgr);
        this.allfiles.push([]);//2
        //assets/imgs/env/AtticRoom/ env.png
        //assets/models/  MF000_D.png MF000_N.png  MF000_orm.png 
        //MF000F_D.png MF000F_N.png MF000F_orm.png MF000H_D.png MF000H_N.png MF000H_orm.png

        this.modloader_obj = new (THREE as any).OBJLoader();
        this.allfiles.push([]);//3
        //./assets/models/o.obj
    }

    load(src:string,sce:THREE.Scene){
        /*
        var fs = require('fs');
        var jsonstr = fs.readFileSync(src,'utf8');
        if(jsonstr){
            var jsobj = JSON.parse(jsonstr);
            if(jsobj){
                //this.allfiles = this.getAllFiles(jsobj);
            }

        }
        */
        //TEMP
        this.allfiles[0]=['./assets/imgs/pbrlut.raw',
        './assets/imgs/env/AtticRoom/env_0.hdr.raw',
        './assets/imgs/env/AtticRoom/env_1.hdr.raw',
        './assets/imgs/env/AtticRoom/env_2.hdr.raw',
        './assets/imgs/env/AtticRoom/env_3.hdr.raw',
        './assets/imgs/env/AtticRoom/env_4.hdr.raw',
        './assets/imgs/env/AtticRoom/env_5.hdr.raw',
        './assets/imgs/env/AtticRoom/env_6.hdr.raw',
        './assets/imgs/env/AtticRoom/env_7.hdr.raw',
        './assets/imgs/env/AtticRoom/env_8.hdr.raw',
        './assets/imgs/env/AtticRoom/env_9.hdr.raw',
        './assets/imgs/env/AtticRoom/env_10.hdr.raw'
        ];
        this.allfiles[1]=['./shaders/vs1.glsl', './shaders/uepbr.glsl'];
        this.allfiles[2]=['./assets/imgs/env/AtticRoom/env.png',
        './assets/models/MF000_D.png', 
        './assets/models/MF000_N.png',   
        './assets/models/MF000_orm.png',  
        './assets/models/MF000F_D.png', 
        './assets/models/MF000F_N.png',  
        './assets/models/MF000F_orm.png',  
        './assets/models/MF000H_D.png',  
        './assets/models/MF000H_N.png',  
        './assets/models/MF000H_orm.png'
        ];
        this.allfiles[3]=['./assets/models/o.obj'];

        var loader=[this.binxhrloader,this.txtxhrloader,this.texloader,this.modloader_obj];
        this.allfiles.forEach((all,loaderidx)=>{
            all.forEach((f,fidx)=>{
                (loader[loaderidx] as threejsloader).load(f);
            })
        })
    }

    getAllFiles(obj:Object):string[]{
        return null;
    }

    onloaded(){
        this.loadScene();
    }

    loadScene(){
        //test
        new UEPbrMtl('','','');
    }

    getNode(name:string){

    }
}

//var sce = new Sceloader();
//sce.load('assets/sce1.json',null);
