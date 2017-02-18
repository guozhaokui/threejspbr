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
    constructor(){

    }
    load(str:string){

    }
    parse(data:ArrayBuffer):any{
        this.buff=data;
        this.viewer = new DataView(data,0);
        var hstr = this.readString();
        this.read_BLOCK();
        for( var i=0; i<this.blockCount; i++){
            var idx = this.viewer.getUint16(this.readpos,true); this.readpos+=2;
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
        this.blockCount = this.viewer.getUint16(this.readpos,true);this.readpos+=2;
    }
    read_DATA(){
        this.dataoffset = this.viewer.getUint32(this.readpos,true); this.readpos+=4;
        this.datasize = this.viewer.getUint32(this.readpos,true); this.readpos+=4;
    }
    read_STRINGS(){
        var ret = [];
        var offset = this.viewer.getUint16(this.readpos,true);this.readpos+=2;
        var size = this.viewer.getUint16(this.readpos,true);this.readpos+=2;
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
        var index = this.viewer.getUint16(this.readpos,true);this.readpos+=2;
        var stridx = this.viewer.getUint16(this.readpos,true);this.readpos+=2;
        var urlidx = this.viewer.getUint16(this.readpos,true);this.readpos+=2;;
        var shadername = this._strings[stridx];
        var url = this._strings[urlidx];
    }
    read_MESH(){
        alert('没做');
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
}


var cc = new loader_lh();
var data = fs.readFileSync('E:/layaair/layaair/publish/LayaAirPublish/samples/as/3d/bin/h5/threeDimen/models/1/1-MF000F.lm');
cc.parse(data.buffer);