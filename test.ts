

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function mytest(){
    alert('cao');
    await delay(2000);
    alert('ni');
    await delay(2000);
    alert('hao');
    await delay(2000);
    alert('me');
    await delay(2000);
}

async function mytest1(){
    alert('干，');
    await delay(2000);
    alert('你');
    await delay(2000);
    alert('好');
    await delay(2000);
    alert('么');
    await delay(2000);
}

function myloop(){
    mytest();
    mytest1();
}

//setInterval(myloop,20000);
myloop();