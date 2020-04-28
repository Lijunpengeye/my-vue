
class compile {
  constructor(el, vm) {
    this.$el = document.querySelector(el)
    this.$vm = vm
    if (this.$el) {
      this.$fragment = this.nodeFragment(this.$el)
      this.compileElement(this.$fragment)
      this.$el.appendChild(this.$fragment)
    }
  }
  nodeFragment(el){
    let fragment = document.createDocumentFragment()
    let child
    while (child = el.firstChild) {
      fragment.appendChild(child)
    }
    return fragment
  }
  compileElement(el){
    const childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      let text = node.textContent
      let reg = /\{\{(.*)\}\}/
      if (this.isElement(node)) {
        this.handleElement(node)
      }else if (this.isTextNode(node) && reg.test(text)) {
        this.text(node,this.$vm,RegExp.$1)
      }
      if (node.childNodes && node.childNodes.length) {
        this.compileElement(node)
      }
    })
  }
  text(node,vm,exp){
    this.updata(node,vm,exp,'text')
  }
  html(node,vm,exp){
    this.updata(node,vm,exp,'html')
  }
  model(node,vm,exp){
    this.updata(node,vm,exp,'model')
    node.addEventListener('input',e => {
      let newVal = e.target.value
      vm[exp] = newVal
    },false)
  }
  show(node,vm,exp){
    this.updata(node,vm,exp,'show')
  }
  updata(node,vm,exp,dir){
    const updataFun = this[dir+'Updata']
    updataFun && updataFun(node,vm,exp)
    new Watcher(vm,exp,function(value){
      updataFun && updataFun(node,vm,exp)
    })
  }
  textUpdata(node,vm,exp){
    node.textContent = vm[exp]
  }
  htmlUpdata(node,vm,exp){
    node.innerHTML = vm[exp]
  }
  modelUpdata(node,vm,exp){
    node.value = vm[exp]
  }
  showUpdata(node,vm,exp){
    node.style.display = vm[exp] ? 'block' : 'none'
  }

  isElement(node){
    return node.nodeType === 1
  }
  isTextNode(node){
    return node.nodeType === 3
  }
  handleElement(node){
    const nodeAttrs = node.attributes
    Array.from(nodeAttrs).forEach(attr => {
      let attrName = attr.name
      let exp = attr.value
      if (this.isDirective(attrName)) {
        let dir = attrName.substring(2)
        this[dir](node,this.$vm,exp)
      }
      if (this.isEventDirctive(attrName)){
        let dir = attrName.substring(1)
        this.handleEvent(node,this.$vm,exp,dir)
      }
    })
  }
  handleEvent(node,vm,exp,dir){
    let fn = vm.$options.methods[exp]
    node.addEventListener(dir,fn.bind(vm),false)
  }
  isDirective(attr){
    return attr.indexOf('v-') === 0
  }
  isEventDirctive(attr){
    return attr.indexOf('@') === 0
  }
}

class Dep {
  constructor() {
    this.deps = []
  }
  addDep(dep) {
    this.deps.push(dep)
  }
  notify() {
    this.deps.forEach((dep) => {
      dep.updata()
    })
  }
}

let watch = null
class Watcher {
  constructor(vm, key, cb) {
    this.$vm = vm
    this.$key = key
    this.watchDepType = false
    this.value = this.get()
    this.cb = cb
  }
  get() {
    watch = this
    let value = this.$vm.$data[this.$key]
    watch = null
    return value
  }
  updata() {
    let value = this.get()
    this.cb.call(this.$vm, value)
  }
}

class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    this.observe()
    this.$compile = new compile(this.$el, this)
  }
  observe() {
    Object.keys(this.$data).forEach((key) => {
      this.proxyData(key)
      this.defineReactive(key, this.$data[key])
    })
  }
  proxyData(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key]
      },
      set(newVal) {
        this.$data[key] = newVal
      },
    })
  }
  defineReactive(key, val) {
    const dep = new Dep()
    Object.defineProperty(this.$data, key, {
      get() {
        if (watch) {
          if (!watch.watchDepType) {
            dep.addDep(watch)
            watch.watchDepType = true
          }
        }
        return val
      },
      set(newVal) {
        if (newVal === val) return
        val = newVal
        dep.notify()
      },
    })
  }
}
