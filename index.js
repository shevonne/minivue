//桶拦截
const bucket = new Set();

//原始数据
const data = {
    text:"hello world"
}

//get set 拦截设置
const obj =  new Proxy(data,{
    get(target,key){
        console.log("触发读取操作",key,target)
        bucket.add(effect)
        return target[key]
    },
    set(target,key,newval){
        console.log("触发设置操作",key,target,newval)
        target[key] = newval
        bucket.forEach(fn => fn())
        return true
    }
})

// 副作用函数
function effect(){
    document.body.innerText = obj.text
}

effect();

setTimeout(()=>{
    obj.text = "hello vue3"
},1000)