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
    _gettype(str:string):[string,number]{
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
            var ti = this._gettype(av[1]);
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
            var ti = this._gettype(av[1]);
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

/**
 * 根据描述字符串读写数据
 */
class strDataStruct{
    constructor(){

    }
    desc(str:string){

    }
    size():number{
        return 0;
    }
    fromBuff(buff:ArrayBuffer, off:number){

    }
    toBuff(buff:ArrayBuffer,off:number){

    }
}
/*
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
*/
class Laya_SubMesh{
    attribs='POSITION:3,32,0;NORMAL:3,32,12;UV:2,32,24;'
    _vertexBuffer:Float32Array;
    _indexBuffer:Uint16Array;
    _boneindicesBuffer:Uint8Array;//uint8
}

class Laya_Mesh{
    version='LAYASKINANI:01';
    name='MESH';
    materials:string[]=[];    //只用字符串表示对应的材质文件或者材质id。有几个就表示有几个submesh
    _bindPoses:Float32Array;//Matrix44[]
    _inverseBindPoses:Float32Array;//Matrix44[]
    submeshes:Laya_SubMesh[]=[];
}

function str2Array(str:string):number[]{
    var te = window['TextEncoder'];
    if(te){
        return (new te()).encode(str) as number[];
    }else{
        throw('no TextEncoder support!')
    }
}

class _submeshInfo{
    iboff=0;
    ibsize=0;
    vboff=0;
    vbsize=0;
    boneidxoff=0;
    boneidxsize=0;
}

class Laya_Mesh_W{
    mesh:Laya_Mesh;
    buff:ArrayBuffer;
    datav:DataView;
    _writePos=0;
    _strmap:string[]=['BLOCK', 'DATA', 'STRINGS'];
    nowrite=false;

    dataOff=0;
    dataSize=0;
    strsOff=0;
    strsNum=0; //
    bindPoseOff=0;
    bindPoseSize=0;
    invGBindePoseOff=0;
    invGBindePoseSize=0;
    submeshInfo:_submeshInfo[]=[];

    getStrSize(str:string){
        return 2+str2Array(str).length;
    }

    /**
     * 返回写了多大。
     */
    outobj(obj,members:string,buff:ArrayBuffer,off:number):number{
        if(!obj._memtype){
            throw '对象中必须有_memtype 描述';
        }
        var mems = members.split(',');
        var dview = new DataView(buff,off);
        var moff=0;
        mems.forEach((mname)=>{
            var tp = obj._memtype[mname];
            if(!tp)
                throw 'no type info of member '+mname;
            var value = obj[mname];
            if( value==undefined)
                throw 'no this member :'+mname;
            var isarr = value instanceof Array;
            var len = isarr?value.length:0;
            if(isarr)throw 'outobj not implements array';

            switch(tp){
                case 'u8':
                dview.setUint8(moff,value);moff+=1;               break;
                case 'u16':
                dview.setUint16(moff,value,true);moff+=2;         break;
                case 'u32':
                dview.setUint32(moff,value,true);moff+=4;         break;
                case 'f32':
                dview.setFloat32(moff,value,true);moff+=4;        break;
            }
        });
        return moff;
    }

    outStrings(strs:string[]){

    }

    saveAsLm(file:string){
        this.submeshInfo= [];
        this.mesh.submeshes.forEach((v,i)=>{
            this.submeshInfo[i]=new _submeshInfo()
        });

        //先空跑一下，组装字符表，统计大小
        this.nowrite=true;
        this._saveAsLm();
        var sz = this._writePos;
        this.buff = new ArrayBuffer(sz);
        this.datav=new DataView(this.buff);
        //真正写buffer
        this.nowrite=false;
        this._writePos=0;
        this._saveAsLm();
        fs.writeFileSync(file,new Buffer(new Uint8Array(this.buff)));
    }

    _saveAsLm(){
        this.wstr(this.mesh.version)
        .wu16(0)
        .wu16(5+this.mesh.materials.length+this.mesh.submeshes.length);//chunk count

        //0
        //data chunk
        //'DATA'
        this.wstrid('DATA')//data chunk id
        .wu32(this.dataOff)
        .wu32(this.dataSize);

        //var dataC={id:1,dataoff:0,datasize:0,_memtype:{id:'u16',dataoff:'u32',datasize:'u32'}};
        //this.outobj(dataC,'id,dataoff,datasize',this.buff,this._writePos);

        //1
        //strings chunk
        //'STRINGS'
        this.wstrid('STRINGS') //strings chunk id
        .wu16(this.strsOff)
        .wu16(this.strsNum);
        //把所有的string以wstr的方式写到对应区域

        //2
        //material chunk
        //'MATERIAL'
        this.mesh.materials.forEach((mtlname,i)=>{
            this.wstrid('MATERIAL')   //id
            this.wu16(i)   //放到_materials数组的位置
            .wstrid('SIMPLE')//shader name /没有用
            .wstrid(mtlname);//url
        });

        //其他的material
        //this.wu16(3);//相同块的id相同

        //3
        //mesh chunk
        //'MESH'
        this.wstrid('MESH') //id
        .wstrid(this.mesh.name) //name
        .wu32(this.bindPoseOff)//bindpose start
        .wu32(this.bindPoseSize)//bindpose size
        .wu32(this.invGBindePoseOff)//invGBindPose start
        .wu32(this.invGBindePoseSize);//invGBindPose size
        //写bindpose和invgbindpos到相应的地方

        //4
        //sub mesh
        //"SUBMESH"
        var materialid=0;
        this.mesh.submeshes.forEach((sm,i)=>{
            var sminfo=this.submeshInfo[i];
            this.wstrid('SUBMESH')
            .wstrid('SUBMESH')
            .wu8(materialid)
            .wstrid(sm.attribs)
            .wu32(sminfo.iboff)//ibofs    都是相对于data的
            .wu32(sminfo.ibsize)//ibsize
            .wu32(0)//vbIndicesofs 不知道干什么的
            .wu32(0)//vbIndicessize 不知道干什么的
            .wu32(sminfo.vboff)//vbofs
            .wu32(sminfo.vbsize)//vbsize
            .wu32(sminfo.boneidxoff)//bonedicofs
            .wu32(sminfo.boneidxsize);//bonedicsize
        });
        //写vb，ib，bonedic：int8[]

        //5
        //DATAAREA
        this.wstrid('DATAAREA');//=6

        this.dataOff=this._writePos;
        this.strsOff=this._writePos-this.dataOff;
        this.strsNum=this._strmap.length;

        //strings
        this._strmap.forEach((v)=>{
            this.wstr(v);
        });

        //pose
        this.bindPoseOff=this._writePos-this.dataOff;
        this.bindPoseSize = this.mesh._bindPoses.byteLength;
        this.wab(this.mesh._bindPoses.buffer,this.mesh._bindPoses.byteLength);
        //invpose
        this.invGBindePoseOff=this._writePos-this.dataOff;
        this.invGBindePoseSize=this.mesh._inverseBindPoses.byteLength;
        this.wab(this.mesh._inverseBindPoses.buffer,this.mesh._inverseBindPoses.byteLength);

        this.mesh.submeshes.forEach((sm,i)=>{
            var sminfo = this.submeshInfo[i];
            //vb
            sminfo.vboff=this._writePos-this.dataOff;
            sminfo.vbsize=sm._vertexBuffer.byteLength;
            this.wab(sm._vertexBuffer.buffer,sm._vertexBuffer.byteLength);
            //ib
            sminfo.iboff=this._writePos-this.dataOff;
            sminfo.ibsize=sm._indexBuffer.byteLength;
            this.wab(sm._indexBuffer.buffer,sm._indexBuffer.byteLength);
            //bone index       
            sminfo.boneidxoff=this._writePos-this.dataOff;
            sminfo.boneidxsize=sm._boneindicesBuffer.byteLength;
            this.wab(sm._boneindicesBuffer.buffer,sm._boneindicesBuffer.byteLength);
        });
    }
    wstr(str:string):Laya_Mesh_W{
        var strarr = str2Array(str);
        this.wu16(strarr.length);
        if(!this.nowrite){
            var udata = new Uint8Array(strarr);
            new Uint8Array(this.buff, this._writePos).set(udata);//TODO test
        }
        this._writePos+=strarr.length;
        return this;
    };
    wstrid(str:string):Laya_Mesh_W{//先转成id
        var i = this._strmap.indexOf(str);
        if(i==-1){
            i=this._strmap.length;
            this._strmap.push(str);
        }
        this.wu16(i);
        return this;
    }
    wu16(n:number):Laya_Mesh_W{
        if(!this.nowrite) this.datav.setUint16(this._writePos,n,true);
        this._writePos+=2;
        return this;
    };
    wu8(n:number):Laya_Mesh_W{
        if(!this.nowrite) this.datav.setUint8(this._writePos,n);
        this._writePos++;
        return this;
    };
    wu32(n:number):Laya_Mesh_W{
        if(!this.nowrite) this.datav.setUint32(this._writePos,n,true);
        this._writePos+=4;
        return this;
    };
    wf32(n:number):Laya_Mesh_W{ 
        if(!this.nowrite) this.datav.setFloat32(this._writePos,n,true);
        this._writePos+=4;
        return this;
    };
    wab(arraybuffer:ArrayBuffer|DataView, length:number, offset?:number) {
        if(length==0)return;
        offset = offset ? offset : 0;
        if (length < 0)
            throw "wab error - Out of bounds";
        var ab = null;
        if (arraybuffer instanceof ArrayBuffer)
            ab = arraybuffer;
        else if (arraybuffer.buffer)
            ab = arraybuffer.buffer;
        else
            throw "not arraybuffer/dataview ";
        if(!this.nowrite){
            var uint8array = new Uint8Array(ab, offset, length);
            new Uint8Array(this.buff).set(uint8array,this._writePos);
        }
        this._writePos += length;
        //需要对齐么
        return this;
    }    
}


/**
 * 问题：现在的格式无法略过不认识的块。
 */
export class loader_lh{
    buff:ArrayBuffer;
    readpos=0;
    viewer:DataView;
    _strings = ['BLOCK', 'DATA', 'STRINGS'];    //初始值。read_STRINGS后会被替换
    _funcs = [null,this.read_DATA.bind(this),this.read_STRINGS.bind(this)];
    blockCount=0;
    dataoffset=0;
    datasize=0;
    _attrReg = new RegExp("(\\w+)|([:,;])", "g");
    _shaderAttributes:string[];
    mesh:Laya_Mesh;
    _cursubmeshid=0;
    constructor(){

    }
    load(str:string,mesh:Laya_Mesh){
        this.mesh=mesh;
    }
    parse(data:ArrayBuffer):any{
        this.buff=data;
        this.viewer = new DataView(data,0);
        this.mesh.version=this.readString();
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
        // mesh
        if(index<0||index>255)throw 'material index error:'+index;
        this.mesh.materials[index]=url;
    }
    read_MESH(){
        var name = this.getStr(this.readU16());
        switch(this.mesh.version){
            case 'LAYASKINANI:01':
                var bindPoseStart = this.readU32();
                var binPoseLength = this.readU32();
                var ttt = this.buff.slice(bindPoseStart + this.dataoffset);//由于起始位置不是4的倍数，只能重新复制一个
                var bindPoseDatas = new Float32Array(ttt,0, binPoseLength);
                var invBindPoseStart = this.readU32();
                var invBindPoseLength = this.readU32();
                ttt = this.buff.slice(invBindPoseStart+this.dataoffset);
                var invBindPoseDatas = new Float32Array(ttt, 0,invBindPoseLength);
                //mesh
                this.mesh._bindPoses = bindPoseDatas;
                this.mesh._inverseBindPoses = invBindPoseDatas;
            break;
            default:
                alert('wrong version :'+this.mesh.version);
            break;
        }
    }

    read_SUBMESH(){
        var className = this.getStr(this.readU16());
        var material = this.readU8();//这个没有用
        var bufferAttribute = this.getStr(this.readU16());
        this._shaderAttributes = bufferAttribute.match(this._attrReg);
        var ibofs = this.readU32();
        var ibsize = this.readU32();
        var vbIndicesofs = this.readU32();  //Not use? 骨骼索引?
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

        //mesh
        var sm = this.mesh.submeshes[this._cursubmeshid++]=new Laya_SubMesh();
        sm.attribs = bufferAttribute;
        sm._vertexBuffer = vbBuff;
        sm._indexBuffer=ibBuff;
        sm._boneindicesBuffer = bidBuff;
    }

    read_DATAAREA(){}

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


class geo_Vertex{
    edge:number[]=[];
    face:number[]=[];
}

class geo_Edge{
    v0:number;
    v1:number;
}
class MeshGeo{
    vb:Float32Array;
    ib:Uint16Array;
    vertexnum=0;
    fstride=0;
    attrib:string;
    //faces:geo_Face[]; face直接用ib即可
    uvfoff=0;//uv在floatarray的偏移。不是byte，是float
    normoff=3;
    vertexes:geo_Vertex[];
    edges:geo_Edge[];
    tmpMem=new Float32Array(32);
    tmpMem1=new Float32Array(32);
    TB = new Float32Array(6);
    constructor(vb:Float32Array, ib:Uint16Array, fstride:number, uvoff:number, attrib:string){
        this.vb=vb;
        this.ib=ib;
        this.fstride=fstride;
        this.attrib=attrib;
        this.uvfoff=uvoff;
        this.vertexnum = vb.length/fstride;
        this.gatherInfo();
    }

    gatherInfo(){
        this.vertexes = new Array<geo_Vertex>(this.vertexnum).fill(new geo_Vertex());
        this.vertexes.forEach((v,i)=>{
            v = this.vertexes[i]=new geo_Vertex();//每个都要是不同的实例。
            var st=0;
            while(true){
                var vpos = this.ib.indexOf(i,st);
                if(vpos>=0){
                    st=vpos+1;
                    var fid = Math.floor(vpos/3);
                    if(v.face.indexOf(fid)<0){
                        v.face.push(fid);
                    }
                }
                else{
                    break;
                }
            }
        });
    }


    _calcTangent( verts:Float32Array, p0:number, p1:number, p2:number, 
            uv0:number, uv1:number, uv2:number, 
            normal:number, 
            outverts:Float32Array,
            tangent:number, binormal:number){
        this.TB.fill(0);
        var tb=this.TB;        
        var dx0=verts[p1]- verts[p0]; var dy0=verts[p1+1]-verts[p0+1]; var dz0 = verts[p1+2]-verts[p0+2];
        var dx1=verts[p2]- verts[p0]; var dy1=verts[p2+1]-verts[p0+1]; var dz1 = verts[p2+2]-verts[p0+2];
        var du0=verts[uv1]-verts[uv0]; var dv0 = verts[uv1+1]-verts[uv0+1];
        var du1=verts[uv2]-verts[uv0]; var dv1 = verts[uv2+1]-verts[uv0+1];
        tb[0] = dx0*dv1-dx1*dv0; tb[1] = dy0*dv1-dy1*dv0; tb[2] = dz0*dv1-dz1*dv0;
        tb[3] = -dx0*du1+dx1*du0; tb[4] = -dy0*du1+dy1*du0; tb[5] = -dz0*du1+dz1*du0;    //B = -B 

        this.vec3_normalize(tb,0);
        this.vec3_normalize(tb,3);

        this.vec3_cross(tb,0,3);
        var tdb = this.tmpMem[0]*verts[normal] + this.tmpMem[1]*verts[normal+1] + this.tmpMem[2]*verts[normal+2];
        if(tdb<0.0){
            tb.forEach((v,i)=>{tb[i]=-tb[i];});
        }

        outverts[tangent]=tb[0]; outverts[tangent+1]=tb[1]; outverts[tangent+2]=tb[2];
        outverts[binormal]=tb[3]; outverts[binormal+1]=tb[4]; outverts[binormal+2]=tb[5];
        return true;
    }

    vec3_cross(vb:Float32Array, v0:number, v1:number){
        var ax = vb[v0], ay=vb[v0+1], az=vb[v0+2];
        var bx = vb[v1], by=vb[v1+1], bz=vb[v1+2];
        this.tmpMem[0] = ay * bz - az * by;
        this.tmpMem[1] = az * bx - ax * bz;
        this.tmpMem[2] = ax * by - ay * bx;
    }

    vec3_length(vb:Float32Array, v0:number){
        var x = vb[v0];
        var y = vb[v0+1];
        var z = vb[v0+2];
        var l = x*x+y*y+z*z;
        return Math.sqrt(l);
    }

    vec3_normalize(vb:Float32Array, v0){
        var l = this.vec3_length(vb,v0);
        if(l<1e-5){
            //debugger;
            vb[v0]=0;
            vb[v0+1]=0;
            vb[v0+2]=0;
            return;
        }
        vb[v0]/=l;
        vb[v0+1]/=l;
        vb[v0+2]/=l;
    }

    vec3_copy(vbo:Float32Array, v1:number, vb:Float32Array, v0:number ){
        vbo[v1]=vb[v0];
        vbo[v1+1]=vb[v0+1];
        vbo[v1+2]=vb[v0+2];
    }

    /**
     * 返回tangent和binormal
     */
    calcTangent(){
        var ret={tan:new Float32Array(this.vertexnum*3), binor:new Float32Array(this.vertexnum*3)};
        this.vertexes.forEach((v,i)=>{
            var sum=0;
            //
            var outarr = new Float32Array(6).fill(0);
            v.face.forEach((ef,fi)=>{
                var cout = new Float32Array(6);
                var v0=this.ib[ef*3];
                var v1=this.ib[ef*3+1];
                var v2=this.ib[ef*3+2];
                /* 加上这个效果就全错了
                if(v1==i){
                    [v0,v1]=[v1,v0];
                }
                else if(v2==i){
                    [v0,v2]=[v2,v0];
                }
                */
                var v0p = v0*this.fstride;
                var v1p = v1*this.fstride;
                var v2p = v2*this.fstride;
                if(!this._calcTangent(this.vb,
                    v0p, v1p,v2p,
                    v0p+this.uvfoff, v1p+this.uvfoff,v2p+this.uvfoff,
                    this.normoff,cout,0,3))
                    return ;
                var dbuff = this.tmpMem1;
                dbuff[0]=this.vb[v1p  ]-this.vb[v0p  ];//dx
                dbuff[1]=this.vb[v1p+1]-this.vb[v0p+1];//dy
                dbuff[2]=this.vb[v1p+2]-this.vb[v0p+2];//dz

                dbuff[3]=this.vb[v2p  ]-this.vb[v0p  ];//dx1
                dbuff[4]=this.vb[v2p+1]-this.vb[v0p+1];//dy1
                dbuff[5]=this.vb[v2p+2]-this.vb[v0p+2];//dz1
                this.vec3_cross(dbuff,0,3);
                var l = this.vec3_length(this.tmpMem,0);
                for(var oi=0; oi<6; oi++){
                    outarr[oi]+=cout[oi]*l;
                }
                sum+=l;
            });
            /*
            for(var oi=0; oi<6; oi++){
                outarr[oi]=outarr[oi]/sum;
            }
            */
            this.vec3_normalize(outarr,0);
            this.vec3_normalize(outarr,3);
            if(i>=2100 && i<2200){
                outarr.fill(0);
            }
            this.vec3_copy(ret.tan,i*3, outarr,0);
            this.vec3_copy(ret.binor,i*3, outarr,3);
        });
        return ret;
    }
}

var cc = new loader_lh();
cc.mesh = new Laya_Mesh();
var data = fs.readFileSync('e:/layaair/layaair/publish/LayaAirPublish/samples/as/3d/bin/h5/threeDimen/models/1/orilm/1-MF000F.lm');
cc.parse(data.buffer);

function handlelm(mesh:Laya_Mesh){
    mesh.version = 'LAYAMODEL:02';
    mesh.materials.forEach((mtl,i)=>{
        mesh.materials[i]='face.lpbr';//mtl.replace('.lmat','.lpbr');
        console.log(mesh.materials[i]);
    });
    mesh.submeshes.forEach((sm)=>{
        var oldstride = 32;
        var oldfstride=oldstride/4;
        sm.attribs='POSITION:3,32,0;NORMAL:3,32,12;TANGENT:3,32,24;BINORMAL:3,32,36;UV:2,32,48;';
        //sm.attribs='POSITION:3,32,0;NORMAL:3,32,12;UV:2,32,24;';
        var newstride = 56;
        var newfstride=newstride/4;
        var oldvb = sm._vertexBuffer;
        var vertnum = sm._vertexBuffer.byteLength/oldstride;
        //计算tangent
        var mg = new MeshGeo(oldvb,sm._indexBuffer,oldfstride,6,'');
        var tb = mg.calcTangent();
        
        var vb = sm._vertexBuffer = new Float32Array(vertnum*newfstride);
        var coldi=0, cnewi=0;
        for( var i=0; i<vertnum; i++){
            vb[cnewi++]=oldvb[coldi++];vb[cnewi++]=oldvb[coldi++];vb[cnewi++]=oldvb[coldi++];//pos
            vb[cnewi++]=oldvb[coldi++];vb[cnewi++]=oldvb[coldi++];vb[cnewi++]=oldvb[coldi++];//normal
            vb[cnewi++]=tb.tan[i*3];vb[cnewi++]=tb.tan[i*3+1];vb[cnewi++]=tb.tan[i*3+2];//tan
            vb[cnewi++]=tb.binor[i*3];vb[cnewi++]=tb.binor[i*3+1];vb[cnewi++]=tb.binor[i*3+2];//bin
            vb[cnewi++]=oldvb[coldi++];vb[cnewi++]=oldvb[coldi++];//uv
        }
    });
}
handlelm(cc.mesh);

var save = new Laya_Mesh_W();
save.mesh=cc.mesh;
save.saveAsLm('e:/layaair/layaair/publish/LayaAirPublish/samples/as/3d/bin/h5/threeDimen/models/1/face.lm');
/*
var buf1 =fs.readFileSync('F:/work/pbr/threejspbr/assets/imgs/pbrlut.raw');
var dt1 = new Uint32Array( new Uint8Array(buf1).buffer);
var outdt = '__pbrlutdata = [';
dt1.forEach((v)=>{
    outdt+=('0x'+v.toString(16))+',';
});
outdt.substr(0,outdt.length-1);
outdt+='];'
fs.writeFileSync('F:/work/pbr/threejspbr/assets/imgs/pbrlut.txt',outdt,'utf8');
*/