//桶拦截
const bucket = new Set();

//原始数据
const data = {
    text:"hello world"
}

let activeEffect
// 副作用函数定义
function effect(fn){
    activeEffect = fn
    fn()
}


//get set 拦截设置
const obj =  new Proxy(data,{
    get(target,key){
        if(activeEffect){
            bucket.add(activeEffect)
        }
        return target[key]
    },
    set(target,key,newval){
        target[key] = newval
        console.log(bucket)
        bucket.forEach(fn => fn())
        return true
    }
})

//使用
//问题：会两次执行  没有建立obj明确的联系
effect(()=>{
    console.log("effect run ")
    document.body.innerText = obj.text
});

setTimeout(() => {
    obj.notExit = "hell vue3"
}, 1000);

