//修改为weakmap
const bucket = new WeakMap();

let activeEffect
// 副作用函数定义
function effect(fn){
    const effectFn = () =>{
        cleanup(effectFn)
        activeEffect = effectFn
        fn()
    }
    //activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
    effectFn.deps = []
    effectFn()
}

const data = {
    ok:true,
    text:"Hello world"
}
//get set 拦截设置
const obj =  new Proxy(data,{
    //拦截读取
    get(target,key){
        track(target,key);
        //返回属性值
        return target[key]
    },
    //拦截设置
    set(target,key,newval){
        //设置属性值
        target[key] = newval
        trigger(target,key)
    }
})

//拆分逻辑  
//get拦截函数 track
function track(target,key){
    if(!activeEffect) return
    let depsMap = bucket.get(target)
    if(!depsMap){
        bucket.set(target,(depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if(!deps){
        depsMap.set(key,(deps = new Set()))
    }
    //最后将当前激活的副作用函数添加到桶里
    deps.add(activeEffect)
    //添加到activeEffect.deps中
    activeEffect.deps.push(deps)
}
//set触发函数 tigger
function trigger(target,key){
    const depsMap = bucket.get(target)
    if(!depsMap) return
    const effects = depsMap.get(key)
    //无限循环问题
    // effects && effects.forEach(fn => {
    //     fn()
    // });
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effectFn => effectFn())
}

//新增cleanup函数
function cleanup(effectFn){
    //遍历effectFn.deps数组
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn)
    }
    //重置数组
    effectFn.deps.length = 0
}

effect(function effectFn(){
    console.log("副作用函数执行")
    document.body.innerText = obj.ok ? obj.text : "not"
})

obj.ok = false
obj.text = "hello vue3"
