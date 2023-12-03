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
        return res 
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
    //缓存上一次计算值
    let value
    //标记是否需要计算  true为需要重新计算
    let dirty = true
    const effectFn = effect(getter,{
            lazy:true,
            scheduler(){
                if(!dirty){
                    dirty = true
                    //当计算属性依赖的响应式数据变化时，手动调用trigger函数触发响应
                    trigger(obj,"value")
                }
            }
        }
    )

    const obj = {
        //只有当读取value时才执行effctFn
        get value(){
            if(dirty){
                value = effectFn()
                dirty = false
            }
            //当读取value时，手动调用track函数进行追踪
            track(obj,"value")
            return value
        }
    }
    return obj
}

const sumRes = computed(()=>obj.foo + obj.bar)
console.log(sumRes.value)
obj.foo++
console.log(sumRes.value)

//watch 
function watch(source,cb){
    //定义getter
    let getter
    if(typeof source === "function"){
        getter = source
    }else{
        getter = () => traverse(source)
    }
    //定义新值与旧值
    let oldValue,newValue
    const effectFn = effect(
        ()=> getter(),
        {
            lazy:true,
            scheduler(){
                //重新执行副作用函数，得到新值
                newValue = effectFn()
                //数据变化时，调用回调函数
                cb(newValue,oldValue)
                //更新旧值
                oldValue = newValue
            }
        }
    )
    //手动调用副作用函数，拿到旧值
    oldValue = effectFn()
}
function traverse(value,seen = new Set()){
    if(typeof value !== "object" || value === null || seen.has(value)) return
    seen.add(value)
    //读取value对象 暂不考虑数组
    for(const k in value){
        console.log("loop",value[k])
        traverse(value[k],seen)
    }
    return value 
}
//使用
watch(
    //getter函数
    ()=> obj.foo,
    //回调函数
    ()=>{
        console.log("obj.foo的值变了")
    }
)
obj.bar ++