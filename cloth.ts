

/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf

/**
 * 每一帧都是重新先清零a，然后重新算
 */

var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
var restDistance = 25;

var xSegs = 10;
var ySegs = 10;

var clothFunction = plane(restDistance*xSegs,restDistance*ySegs);

var cloth = new Cloth(xSegs,ySegs);
var GRAVITY = 981*1.4;
var gravity = new THREE.Vector3(0,-GRAVITY,0).multiplyScalar(MASS);

var TIMESTEP = 18/1000;
var TIMESTEP_SQ = TIMESTEP*TIMESTEP;
var pins = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ];

var wind=true;
var windStrenth=2.0;
var windForce=new THREE.Vector3(0,0,0);

var tmpForce = new THREE.Vector3();
var lastTime=0;

function plane(width:number, height:number){
    return function(u:number, v:number){
        var x =(u-0.5)*width;
        var y = (u+0.5)*height;
        var z=0;
        return new THREE.Vector3(x,y,z);
    }
}

class Particle{
    position:THREE.Vector3;
    previous:THREE.Vector3;
    original:THREE.Vector3;
    a=new THREE.Vector3(0,0,0);//加速度
    mass=0;
    invmass=0;
    tmp=new THREE.Vector3();
    tmp2 = new THREE.Vector3();
    constructor(x:number,y:number,z:number,mass:number){
        this.position=clothFunction(x,y);
        this.previous=clothFunction(x,y);
        this.original=clothFunction(x,y);
        this.mass=mass;
        this.invmass=1.0/mass;
    }

    addForce(force:THREE.Vector3){
        this.a.add(
            this.tmp2.copy(force).multiplyScalar(this.invmass)
        );
    }

    /**
     * verlet integration 
     * 计算在力的作用下的新的位置
     * @param timesq dtm*dtm 时间差的平方
     */
    integrate(timesq:number){
        var newPos = this.tmp.subVectors(this.position,this.previous);
        newPos.multiplyScalar(DRAG).add(this.position);
        newPos.add(this.a.multiplyScalar(timesq));

        this.tmp = this.previous;
        this.previous = this.position;
        this.position= newPos;
        this.a.set(0,0,0);//
    }
}

class _constraint{
    p1:Particle;
    p2:Particle;
    dist:number;
}

var diff = new THREE.Vector3();

/**
 * 两个点逐渐靠近或者远离来满足长度限制
 */
function satisifyConstraints(p1:Particle, p2:Particle, distance:number){
    diff.subVectors(p2.position, p1.position);
    var currentDist = diff.length();
    if( currentDist===0) return;//下面要除
    var correction = diff.multiplyScalar(
        1.0-distance/currentDist
    );
    var correctionHalf = correction.multiplyScalar(0.5);
    p1.position.add(correctionHalf);
    p2.position.sub(correctionHalf);
}

class Cloth{
    w=10;
    h=10;
    particles:Particle[];
    constraints:_constraint[];
    constructor(w:number,h:number){
        this.w=w||10;
        this.h=h||10;
        var u=0,v=0;
        //particle
        for(v=0; v<=h;v++){
            for(u=0; u<=w;u++){
                this.particles.push(
                    new Particle(u/w,v/h,0,MASS)
                );
            }
        }

        //structural
        for(v=0; v<h;v++){
            for(u=0; u<w;u++){
                this.constraints.push({
                    p1:this.particles[ this.index(u,v)],
                    p2:this.particles[ this.index(u,v+1)],
                    dist:restDistance
                });
                this.constraints.push({
                    p1:this.particles[ this.index(u,v)],
                    p2:this.particles[ this.index(u+1,v)],
                    dist:restDistance
                });
            }
        }
        //右边
        for(u=w,v=0;v<h;v++){
            this.constraints.push({
                p1:this.particles[this.index(u,v)],
                p2:this.particles[this.index(u,v+1)],
                dist:restDistance
            });
        }
        //下边
        for( v=h,u=0; u<w;u++){
            this.constraints.push({
                p1:this.particles[this.index(u,v)],
                p2:this.particles[this.index(u+1,v)],
                dist:restDistance
            });
        }

        //剪切力
        /*
        var diagnoalDist = Math.sqrt(restDistance*restDistance*2);
        for(v=0; v<h;v++){
            for(u=0;u<w;u++){
                this.constraints.push({
                        p1:this.particles[this.index(u,v)],
                        p2:this.particles[this.index(u+1,v+1)],
                        dist:diagnoalDist
                    });
                this.constraints.push({
                        p1:this.particles[this.index(u+1,v)],
                        p2:this.particles[this.index(u,v+1)],
                        dist:diagnoalDist
                    });
            }
        }
        */
    }

    index(u:number,v:number):number{
        return u+v*(this.w+1);
    }
}

function simulate( time:number ) {
	if ( ! lastTime ) {
		lastTime = time;
		return;
	}

    var i=0,il=0;
    var particles:Particle[];
    var pt, constraints, constraint;
	// 风力的影响
	if ( wind ) {
		var face, faces = clothGeometry.faces, normal;
		particles = cloth.particles;

		for ( i = 0, il = faces.length; i < il; i ++ ) {
			face = faces[ i ];
			normal = face.normal;

			tmpForce.copy( normal ).normalize().multiplyScalar( normal.dot( windForce ) );
			particles[ face.a ].addForce( tmpForce );
			particles[ face.b ].addForce( tmpForce );
			particles[ face.c ].addForce( tmpForce );
		}
	}

    cloth.particles.forEach(p=>{
        p.addForce(gravity);
        p.integrate(TIMESTEP_SQ);
    }); 

	// Start Constraints
    cloth.constraints.forEach(c=>{
        satisifyConstraints(c.p1,c.p2,c.dist);
    });


	// Ball Constraints
    /*
	ballPosition.z = - Math.sin( Date.now() / 600 ) * 90 ; //+ 40;
	ballPosition.x = Math.cos( Date.now() / 400 ) * 70;

	if ( sphere.visible ) {
		for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
			particle = particles[ i ];
			pos = particle.position;
			diff.subVectors( pos, ballPosition );
			if ( diff.length() < ballSize ) {
				// collided
				diff.normalize().multiplyScalar( ballSize );
				pos.copy( ballPosition ).add( diff );
			}
		}
	}

	// Floor Constraints
	for ( particles = cloth.particles, i = 0, il = particles.length; i < il; i ++ ) {
		particle = particles[ i ];
		pos = particle.position;
		if ( pos.y < - 250 ) {
			pos.y = - 250;
		}
	}
    */
	// Pin Constraints
	for ( i = 0, il = pins.length; i < il; i ++ ) {
		var xy = pins[ i ];
		var p = particles[ xy ];
		p.position.copy( p.original );
		p.previous.copy( p.original );
	}
}