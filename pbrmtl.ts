/// <reference path="typings/index.d.ts" />

/**
 * pbr 材质
 * 采用类似UE4的标准
 */

/*
export class UEPbrMtl extends THREE.RawShaderMaterial{
    baseColorFile:string;
    normalFile:string;
    ao_rough_metalFile:string;
    constructor(baseColor:string, normal:string, pbrInfo:string,){
        var mtlparam:THREE.ShaderMaterialParameters={};
        mtlparam.vertexShader= THREE.Cache.get('./vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
        mtlparam.fragmentShader=THREE.Cache.get('./uepbr.glsl');
        mtlparam.uniforms={
            texBaseColor:{value:tex1},
            texNormal:{value:texenv},
            texORM:{value:null},
            texPreFilterdEnv:{value:null},
            texBRDFLUT:{value:texBRDFLUT}
        };
        super(mtlparam);
    }

    set baseColor(imgfile:string){
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
*/
//test
export class Modelloader{
    constructor(){

    }

    load(src:string){

    }
}

export class Sceloader{
    load(src:string){
        var fs = require('fs');
        var jsonstr = fs.readFileSync(src,'utf8');
        if(jsonstr){
            var jsobj = JSON.parse(jsonstr);
            console.log(JSON.stringify(jsobj));
        }
    }
}

var sce = new Sceloader();
sce.load('assets/sce1.json');
