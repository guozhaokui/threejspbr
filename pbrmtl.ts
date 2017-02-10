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
    constructor(texbasecolor:THREE.Texture, texnormal:THREE.Texture, texpbrinfo:THREE.Texture,preenv:THREE.Texture,
        prediff:THREE.Texture, pbrlut:THREE.Texture){
        this.mtlparam.vertexShader= THREE.Cache.get('./shaders/vs1.glsl'); //glslloader.load('./vs1.glsl');//不能再调glslloader.load了，会再次触发完成事件
        this.mtlparam.fragmentShader=THREE.Cache.get('./shaders/uepbr.glsl');
        this.mtlparam.uniforms={
            texBaseColor:{value:texbasecolor},
            texNormal:{value:texnormal},
            texORM:{value:texpbrinfo},
            texPreFilterdEnv:{value:preenv},
            texPrefilterDiff:{value:prediff},
            texBRDFLUT:{value:pbrlut}
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
    texenv:THREE.Texture;
    texenvdiff:THREE.Texture;   //临时。以后用SH
    pbrlut:THREE.Texture;
    sceobj:any;
    loaded=false;//TODO texture不能用cache，所以只能load，load会导致再次调用onload，所以
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
        this.txtxhrloader.load(src,(responseText)=>{
            this.sceobj = JSON.parse(responseText);
            if(!this.sceobj){
                alert('error1');
            }else{
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
                './assets/imgs/env/AtticRoom/envdiff.png',
                './assets/models/jianling/MF000_D.png', 
                './assets/models/jianling/MF000_N.png',   
                './assets/models/jianling/MF000_orm.png',  
                './assets/models/jianling/MF000F_D.png', 
                './assets/models/jianling/MF000F_N.png',  
                './assets/models/jianling/MF000F_orm.png',  
                './assets/models/jianling/MF000H_D.png',  
                './assets/models/jianling/MF000H_N.png',  
                './assets/models/jianling/MF000H_orm.png',
                './assets/models/sphere/basecolor.png',
                './assets/models/sphere/normal.png',
                './assets/models/sphere/orm.png'
                ];
                this.allfiles[3]=['./assets/models/jianling/o.obj',
                './assets/models/sphere/sphere.obj'
                ];

                var loader=[this.binxhrloader,this.txtxhrloader,this.texloader,this.modloader_obj];
                this.allfiles.forEach((all,loaderidx)=>{
                    all.forEach((f,fidx)=>{
                        (loader[loaderidx] as threejsloader).load(f);
                    })
                })
            }
        });        
    }

    getAllFiles(obj:Object):string[]{
        return null;
    }

    onloaded(){
        if(!this.loaded){
            this.loadScene();
            this.loaded=true;
        }
    }

    loadScene(){
        this.loadLUT();
        this.loadEnv('AtticRoom');

        this.texenvdiff = this.texloader.load('./assets/imgs/env/AtticRoom/envdiff.png');
        this.texenvdiff.wrapT = THREE.ClampToEdgeWrapping;
        this.texenvdiff.wrapS = THREE.RepeatWrapping;
        //测试球
        var geometry = new THREE.SphereGeometry(1,60,60);//THREE.BoxGeometry(2,2,2,20,20,20);// 
        var pbrmtl = new UEPbrMtl(
            this.texloader.load('./assets/models/sphere/basecolor.png'),
            this.texloader.load('./assets/models/sphere/normal.png'),
            this.texloader.load('./assets/models/sphere/orm.png'),
            this.texenv,
            this.texenvdiff,
            this.pbrlut,
            );
        var sphere = new THREE.Mesh( geometry, pbrmtl.mtl );
        this.scene.add( sphere );
        sphere.position.set(0,2,2);        

        //测试模型
        var objmtl = this.sceobj.model1;
        this.modloader_obj.load('./assets/models/jianling/o.obj',(o:THREE.Group)=>{
            o.children.forEach((v:THREE.Mesh)=>{
                var texpath = objmtl.path+'/';
                var groupmtl = objmtl[v.name];
                if(groupmtl){
                    var texbc=this.texloader.load(texpath+ groupmtl.basecolor );
                    var texnorm = this.texloader.load(texpath+groupmtl.normal);
                    var texpbr = this.texloader.load(texpath+groupmtl.pbrinfo);
                    var mtl = new UEPbrMtl(texbc,texnorm,texpbr,this.texenv,this.texenvdiff, this.pbrlut);
                    v.material = mtl.mtl;
                    //v.position.set(-1.5,0,4);
                    v.position.set(0,0,0);
                }
            });
            this.scene.add(o);
        });
    }

    getNode(name:string){

    }

    createImgDataFromRaw(Buff:ArrayBuffer){
        var dv = new DataView(Buff);
        var w = dv.getUint32(0,true);
        var h = dv.getUint32(4,true);
        //var data = new ImageData(w,h);    threejs不能直接使用ImageData对象，因为它需要Uint8Array
        var dt1 = new Uint8Array( Buff,8);
        return {width:w,height:h,data:dt1};
    }

    createColorImg(w:number, h:number, col:number){
        var num = w*h;
        var dt = new Uint32Array(num);
        for(var i=0; i<num; i++){
            dt[i]=col;
        }
        return {width:w,height:h,data:new Uint8Array(dt.buffer)};
    }

    loadLUT(){
        var pbrlutbuf = THREE.Cache.get('./assets/imgs/pbrlut.raw') as ArrayBuffer;
        var u8ab = new Uint8Array(pbrlutbuf);
        this.pbrlut = new THREE.DataTexture(u8ab,256,256,THREE.RGBAFormat,THREE.UnsignedByteType,THREE.Texture.DEFAULT_MAPPING,
            THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,THREE.NearestFilter,THREE.NearestFilter);
        this.pbrlut.needsUpdate=true;
    }

    loadEnv(env:string){
        var p = './assets/imgs/env/'+env+'/';
        var dt1 = null;// new Uint8Array(dd.buffer.slice(8));
        this.texenv = new THREE.DataTexture(dt1,2048,1024,THREE.RGBAFormat,THREE.UnsignedByteType,THREE.Texture.DEFAULT_MAPPING,
            THREE.RepeatWrapping, THREE.ClampToEdgeWrapping,THREE.LinearFilter,THREE.LinearMipMapLinearFilter);

        var mip0 = this.createImgDataFromRaw( THREE.Cache.get(p+'env_0.hdr.raw') as ArrayBuffer); 
        var mip1 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_1.hdr.raw') as ArrayBuffer);
        var mip2 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_2.hdr.raw') as ArrayBuffer);
        var mip3 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_3.hdr.raw') as ArrayBuffer);
        var mip4 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_4.hdr.raw') as ArrayBuffer);
        var mip5 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_5.hdr.raw') as ArrayBuffer);
        var mip6 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_6.hdr.raw') as ArrayBuffer);
        var mip7 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_7.hdr.raw') as ArrayBuffer);
        var mip8 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_8.hdr.raw') as ArrayBuffer);
        var mip9 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_9.hdr.raw') as ArrayBuffer);
        var mip10 = this.createImgDataFromRaw( THREE.Cache.get( p+'env_10.hdr.raw') as ArrayBuffer);
        //TODO 如果不提供1x1的mipmap，就无法使用 LinearMipMapLinearFilter 。所以先凑一个，实际使用的时候，不要选择这个。
        var mip11 = {width:1,height:1,data:new Uint8Array(mip10.data.buffer,0,4)};

        (this.texenv as any).mipmaps =[
            mip0,mip1,mip2,mip3,mip4,mip5,mip6,mip7,mip8,mip9, mip10,mip11
        ];
        this.texenv.needsUpdate=true;

        //用来显示的球
        var mtlsky = new THREE.MeshBasicMaterial({
            side:THREE.DoubleSide,
            color:0xffffffff,
            map:this.texloader.load(p+'env.png')
        });
        
        var skysphere = new THREE.Mesh( new THREE.SphereGeometry(100,40,40),mtlsky);
        this.scene.add(skysphere);
    }
    
}

//var sce = new Sceloader();
//sce.load('assets/sce1.json',null);
