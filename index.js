//修改为weakmap
const bucket = new WeakMap();

let activeEffect
//effect栈 
const effectStack = [] 
// 副作用函数定义
function effect(fn,options={}){
    const effectFn = () =>{
        cleanup(effectFn)
        //如果是嵌套函数  这里只能保留一个内部函数 引发问题
        activeEffect = effectFn
        //在调用副作用函数之前将当前副作用函数压入栈中
        effectStack.push(effectFn) 
        //存储fn的执行结果
        const res = fn()  
        //在当前副作用函数执行完毕之后，将当前副作用函数弹出栈，并把activeEffect还原为之前的值
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1] 
        return res //新增
    }
    effectFn.options = options
    //activeEffect.deps用来存储所有与该副作用函数相关联的依赖集合
    effectFn.deps = []
    //处理lazy
    if(!options.lazy){
        effectFn()
    }
    //返回副作用函数
    return effectFn
}

const data = {
    foo:1,
    bar:3
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
    //解决obj.foo ++ 引发的无限递归问题
    //判断如果trigger触发执行的副作用函数与当前相同，则不添加到执行队列中
    effects && effects.forEach(effectFn =>{
        if(effectFn != activeEffect){
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun.forEach(effectFn => {
        //判断options是否存在 传递参数
        if(effectFn.options.scheduler){    
            effectFn.options.scheduler(effectFn)
        }else{
            effectFn()
        }
    })
}

//新增cleanup函数
function cleanup(effectFn){
    // console.log(effectFn)
    //遍历effectFn.deps数组
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn)
    }
    //重置数组
    effectFn.deps.length = 0
}

// const effectFn = effect(()=>
//     obj.foo + obj.bar,
//     //options
//     {
//         lazy:true
//     }
// )

//手动执行副作用函数 value是getter的返回值
// const value = effectFn()

//实现computed
function computed(getter){
    const effectFn = effect(getter,{
        lazy:true
    })

    const obj = {
        //只有当读取value时才执行effctFn
        get value(){
            return effectFn()
        }
    }

    return obj
}

const sumRes = computed(()=>obj.foo + obj.bar)
console.log(sumRes.value)
