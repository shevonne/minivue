//修改为weakmap
const bucket = new WeakMap();

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
    //拦截读取
    get(target,key){
        console.log(target)
        if(!activeEffect) return
        let depsMap = bucket.get(target)
        if(!depsMap){
            bucket.set(target,(depsMap = new Map()))
        }
        //等同于
        // if(!depsMap){
        //     bucket.set(target,new Map())
        //     depsMap = new Map()
        // }
        let deps = depsMap.get(key)
        if(!deps){
            depsMap.set(key,(deps = new Set()))
        }
        //最后将当前激活的副作用函数添加到桶里
        deps.add(activeEffect)
        //返回属性值
        return target[key]
    },
    //拦截设置
    set(target,key,newval){
        target[key] = newval
        const depsMap = bucket.get(target)
        if(!depsMap) return
        const effects = depsMap.get(key)
        effects && effects.forEach(fn => {
            fn()
        });
    }
})

//使用
//问题：会两次执行  没有建立obj明确的联系
effect(()=>{
    console.log("effect run ")
    document.body.innerText = obj.text
});

setTimeout(() => {
    obj.text = "你好"
}, 1000);
