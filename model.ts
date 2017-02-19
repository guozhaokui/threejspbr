import * as fs from 'fs';

export class testModel{

}

class TTT extends THREE.Geometry{
    test(){
        var bb = new THREE.BufferGeometry();
    }
}

//objloader
export class loader_obj{
    constructor(){

    }
    load(src:string){

    }

    /**
     * obj是文本格式的。
     */
    loadMem(data:string){
        var lines = data.split('\n');

        
        var objloader = new THREE.ObjectLoader();
        objloader.load('');
    }
}

class BufferRW{
    constructor(buff:ArrayBuffer){

    }
    wStr(str:string){

    }
}

class Laya_Material{

}

class Mesh_Savelayout{

}
var Mesh_savelayout=[
    {name:'version',member:'version',type:'string'},
    {name:'nouse',value:0,type:'u16'},
    {name:'chunknumber',value:7,type:'u16'},//todo
    {name:'datadesc'},
    {name:'chunk_strings'},


];

/**
 * 根据描述创建一个buffer或者描述一个buffer
 * 通过描述中的属性来访问或者修改buffer的内容。
 */
class binDataStruct{
    buff:ArrayBuffer;
    desc:string[];
    static typeinfo={
        u8:[1,Uint8Array],    //size,class
        u16:[2,Uint16Array],
        u32:[4,Uint32Array],
        f32:[4,Float32Array]
        //不要扩展vec2,3,4,mat之类的，不是一个层级的
    }
    constructor(desc:string[]){
        this.desc=desc;
        var sz = this.calcBufSz(desc);
        this.buff = new ArrayBuffer(sz);
        this.cook(desc,this.buff,0);
    }
    /**
     * 返回[type，num]
     */
    gettype(str:string):[string,number]{
        var st=str.indexOf('[');
        var ed=str.indexOf(']');
        if(st<0){
            return [str,1];
        }
        if(ed<0)throw 'error no ]'+str;
        return [str.substr(0,st), parseInt( str.substr(st+1,ed-st-1))];
    }
    cook(desc:string[],buff:ArrayBuffer,off:number){
        var off=off;
        desc.forEach((v)=>{
            var av = v.split(',');if(av.length<2)throw 'error '+v;
            var ti = this.gettype(av[1]);
            var cls = binDataStruct.typeinfo[ti[0]][1];
            var num = ti[1];
            var isarr=num>1;
            //问题：如果某个uint32或者f32没有按照4对齐会报错。
            if(!isarr){
                var dt = new cls(buff,off,1);
                Object.defineProperty(this,av[0],{
                    set:function(v){dt[0]=v;},
                    get:function(){return dt[0];},
                    enumerable: true,
                    configurable:true
                });
            }else{
                this[av[0]]=new cls(buff,off,num);
            }
            off+=binDataStruct.typeinfo[ti[0]][0]*num;;
        });
    }
    calcBufSz(desc:string[]){
        var sz =0;
        desc.forEach((v)=>{
            var av = v.split(',');if(av.length<2)throw 'error '+v;
            var ti = this.gettype(av[1]);
            var tp = ti[0];
            var num = ti[1];
            sz += binDataStruct.typeinfo[tp][0]*num;
        });
        return sz;
    }
    attachBuff(buff:ArrayBuffer,off:number){
        this.cook(this.desc,buff,off);
    }
}
debugger;
//var，type，defvalue
var bf = new binDataStruct(['id,u16','padd,u16','dataoff,u32','datasize,u32']) as any;
bf.datasize=22;

//test
bf = new binDataStruct(['id,u32','dt,u32[4]']) as any;
bf.dt[0]=10;
bf.dt[1]=11;

var bb = new Uint8Array([1,2,3]);
var c=new binDataStruct(['a,u8','b,u8','c,u8'])
c.attachBuff(bb.buffer,0)

class Laya_Mesh{
    version='LAYASKINANI:01';
    name='mesh01';
    _materials:string[];    //只用字符串表示对应的材质文件或者材质id。有几个就表示有几个submesh
    _bindPoses:ArrayBuffer;//Matrix44[]
    _inverseBindPoses:ArrayBuffer;//Matrix44[]
    _vertexBuffer;
    _indexBuffer;
    
    saveAsLm(){
        this.wstr(this.version);
        this.wu16(0);
        this.wu16(7);//chunk count

        //0
        //data chunk
        //'DATA'
        this.wu16(1);//data chunk id
        var dataoff=0;var datasize=1;
        this.wu32(dataoff);
        this.wu32(datasize);

        //1
        //strings chunk
        //'STRINGS'
        this.wu16(2); //strings chunk id
        var strsoff=0; var strssz = 1;
        this.wu16(strsoff);
        this.wu16(strssz);
        //把所有的string以wstr的方式写到对应区域

        //2
        //material chunk
        //'MATERIAL'
        this.wu16(3);   //id
        this.wu16(0);   //放到_materials数组的位置
        this.wstrid('SIMPLE');//shader name
        this.wstrid('mesh1.lmat');//url

        //其他的material
        //this.wu16(3);//相同块的id相同

        //3
        //mesh chunk
        //'MESH'
        this.wu16(4); //id
        this.wstrid('MESH'); //name
        this.wu32(0);//bindpose start
        this.wu32(0);//bindpose size
        this.wu32(0);//invGBindPose start
        this.wu32(0);//invGBindPose size
        //写bindpose和invgbindpos到相应的地方

        //4
        //sub mesh
        //"SUBMESH"
        this.wu16(5);
        var materialid=0;
        this.wu8(materialid);
        this.wstrid('POSITION:3,32,0;NORMAL:3,32,12;UV:2,32,24;');
        this.wu32(0);//ibofs    都是相对于data的
        this.wu32(0);//ibsize
        this.wu32(0);//vbIndicesofs 不知道干什么的
        this.wu32(0);//vbIndicessize 不知道干什么的
        this.wu32(0);//vbofs
        this.wu32(0);//vbsize
        this.wu32(0);//bonedicofs
        this.wu32(0);//bonedicsize
        //写vb，ib，bonedic：int8[]

        //5
        //DATAAREA
        this.wstrid('DATAAREA');//=6
    }
    wstr(str:string){};
    wstrid(str:string){}//先转成id
    wu16(n:number){};
    wu8(n:number){};
    wu32(n:number){};
    wf32(n:number){};
}

class Laya_SubMesh{

}
/**
 * 问题：现在的格式无法略过不认识的块。
 */
export class loader_lh{
    buff:ArrayBuffer;
    readpos=0;
    viewer:DataView;
    _version='';
    _strings = ['BLOCK', 'DATA', 'STRINGS'];    //初始值。read_STRINGS后会被替换
    _funcs = [null,this.read_DATA.bind(this),this.read_STRINGS.bind(this)];
    blockCount=0;
    dataoffset=0;
    datasize=0;
    _attrReg = new RegExp("(\\w+)|([:,;])", "g");
    _shaderAttributes:string[];
    constructor(){

    }
    load(str:string){

    }
    parse(data:ArrayBuffer):any{
        this.buff=data;
        this.viewer = new DataView(data,0);
        this._version = this.readString();
        this.read_BLOCK();
        for( var i=0; i<this.blockCount; i++){
            var idx = this.readU16();
            var blcokname = this._strings[idx];
            var func = this['read_'+blcokname];
            if(func){
                func.call(this);
            }else{
                console.error('no function to read chunk '+blcokname);
            }
            if(idx==2){//strings 特殊
                var lmaturls = this._strings.filter((v)=>{ return v.indexOf('.lmat')>0;});
            }
        }
    }
    read_BLOCK(){
        this.readpos+=2;
        this.blockCount = this.readU16();
    }
    read_DATA(){
        this.dataoffset = this.readU32();
        this.datasize = this.readU32();
    }
    read_STRINGS(){
        var ret = [];
        var offset = this.readU16();
        var size = this.readU16();
        var oldpos = this.readpos;
        //strings的绝对偏移。注意是相对于data块的
        this.readpos= this.dataoffset+offset;
        for(var i=0; i<size; i++){
            var ss = this.readString();
            ret.push(ss);
        }
        this._strings = ret;
        this.readpos = oldpos;
    }
    read_MATERIAL(){
        var index = this.readU16();
        var stridx = this.readU16();
        var urlidx = this.readU16();
        var shadername = this._strings[stridx];
        var url = this._strings[urlidx];
    }
    read_MESH(){
        var name = this.getStr(this.readU16());
        switch(this._version){
            case 'LAYASKINANI:01':
                var bindPoseStart = this.readU32();
                var binPoseLength = this.readU32();
                var ttt = this.buff.slice(bindPoseStart + this.dataoffset);//由于起始位置不是4的倍数，只能重新复制一个
                var bindPoseDatas = new Float32Array(ttt,0, binPoseLength);
                var invBindPoseStart = this.readU32();
                var invBindPoseLength = this.readU32();
                ttt = this.buff.slice(invBindPoseStart+this.dataoffset);
                var invBindPoseDatas = new Float32Array(ttt, invBindPoseLength);
            break;
            default:
                alert('wrong version :'+this._version);
            break;
        }
    }

    read_SUBMESH(){
        var className = this.getStr(this.readU16());
        var material = this.readU8();
        var bufferAttribute = this.getStr(this.readU16());
        this._shaderAttributes = bufferAttribute.match(this._attrReg);
        var ibofs = this.readU32();
        var ibsize = this.readU32();
        var vbIndicesofs = this.readU32();  //Not use?
        var vbIndicessize = this.readU32(); //not use?
        var vbofs = this.readU32();
        var vbsize = this.readU32();
        var boneDicofs = this.readU32();
        var boneDicsize = this.readU32();
        //vertex decl
        //this._getVertexDeclaration();
        var vbStart = vbofs+this.dataoffset;
        var vbBuff = new Float32Array( this.buff.slice(vbStart,vbStart+vbsize));

        //TODO ib 可能不从0开始
        //现在是相同格式的合并，但是这样可能会导致错误。

        var ibStart = ibofs+this.dataoffset;
        var ibBuff = new Uint16Array( this.buff.slice(ibStart, ibStart+ibsize));

        //bone index
        var bidBuff = new Uint8Array(this.buff.slice(boneDicofs+this.dataoffset,boneDicofs+this.dataoffset+boneDicsize));

        //todo
    }

    readString():string{
        var l = this.viewer.getUint16(this.readpos,true);
        this.readpos+=2;
        var strBuff = this.buff.slice(this.readpos,l+this.readpos);
        this.readpos+=l;
        var texdec = window['TextDecoder'] as any;
        var str='';
        if( texdec){
            var dec = new texdec();
            str = dec.decode(new Uint8Array(strBuff))
        }else{
            alert('不支持TextDecoder')
        }
        return str;
        //str = String.fromCharCode.apply(null,
    }

    readU8():number{
        var r = this.viewer.getUint8(this.readpos);
        this.readpos++;
        return r;
    }
    readU16():number{
        var r = this.viewer.getUint16(this.readpos,true);
        this.readpos+=2;
        return r;
    }
    readU32():number{
        var r = this.viewer.getUint32(this.readpos,true);
        this.readpos+=4;
        return r;
    }
    getStr(id:number):string{
        return this._strings[id];
    }

    _getVertexDeclaration(){
        var position:boolean, normal:boolean, color:boolean, texcoord0:boolean, texcoord1:boolean, tangent:boolean, blendWeight:boolean, blendIndex:boolean;
        for (var i = 0; i < this._shaderAttributes.length; i += 8) {
            switch (this._shaderAttributes[i]) {
            case "POSITION": 
                position = true;
                break;
            case "NORMAL": 
                normal = true;
                break;
            case "COLOR": 
                color = true;
                break;
            case "UV": 
                texcoord0 = true;
                break;
            case "UV1": 
                texcoord1 = true;
                break;
            case "BLENDWEIGHT": 
                blendWeight = true;
                break;
            case "BLENDINDICES": 
                blendIndex = true;
                break;
            case "TANGENT": 
                tangent = true;
                break;
            }
        }
        //TODO
        this._shaderAttributes;
    }
    
}


var cc = new loader_lh();
var data = fs.readFileSync('F:/layaair/layaair/publish/LayaAirPublish/samples/as/3d/bin/h5/threeDimen/models/1/1-MF000F.lm');
cc.parse(data.buffer);