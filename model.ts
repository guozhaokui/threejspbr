
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