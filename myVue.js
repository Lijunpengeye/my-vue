class Compile {
    constructor(vm, el) {
        this.$vm = vm
        this.$el = document.querySelector(el)
        if (this.$el) {
            this.$fragment = this.nodeFragement(this.$el)
            this.compileElement(this.$fragment)
            this.$el.appendChild(this.$fragment)
        }
    }

    nodeFragement(el) {
        let fragment = document.createDocumentFragment()
        let chil
        while (chil = el.firstChild) {
            fragment.appendChild(chil)
        }
        return fragment
    }

    compileElement(el) {
        let childNodes = el.childNodes
        Array.from(childNodes).forEach(node => {
            let text = node.textContent
            let reg = /\{\{(.*)\}\}/
            if (this.isElement(node)) {
                this.compile(node)
            } else if (this.isTextNode(node) && reg.test(text)) {
                this.complieText(node, RegExp.$1)
            }
            if (node.childNodes.length) {
                this.compileElement(node)
            }
        })
    }

    compile(node) {
        let nodeAttr = node.attributes
        Array.from(nodeAttr).forEach(attr => {
            let name = attr.name
            let exp = attr.value
            if (this.isDirective(name)) {
                let dir = name.substring(2)
                this[dir](node, this.$vm, exp)
            } else if (this.isEventDirective(name)) {
                let even = name.substring(1)
                this.eventHandle(node, this.$vm, exp, even)
            }
        })
    }
    eventHandle(node, vm, exp, even) {
        let fn = vm.$methods[exp]
        if (even && fn) {
            node.addEventListener(even, fn.bind(vm), false)
        }
    }

    text(node, vm, exp) {
        this.update(node, vm, exp, 'text')
    }
    html(node, vm, exp) {
        this.update(node, vm, exp, 'html')
    }
    model(node, vm, exp) {
        this.update(node, vm, exp, 'model')
        let val = vm[exp]
        node.addEventListener('input', e => {
            let newVal = e.target.value
            vm[exp] = newVal
            val = newVal
        })
    }
    update(node, vm, exp, dir) {
        let updaterFn = this[dir + 'Updata']
        updaterFn && updaterFn(node, vm[exp])
        // console.log(this.$vm.$bindding[exp])
        this.$vm.$bindding[exp].directives.push(
            new Watcher(vm, exp, function (value) {
                // 每次有变动， 执行这个
                updaterFn && updaterFn(node, vm[exp])
            })
        )
    }

    textUpdata(node, value) {
        node.textContent = value
    }
    htmlUpdata(node, value) {
        node.innerHTML = value
    }
    modelUpdata(node, value) {
        node.value = value
    }

    complieText(node, exp) {
        this.text(node, this.$vm, exp)
    }

    isDirective(attr) {
        return attr.indexOf('m-') === 0
    }
    // 是不是事件
    isEventDirective(attr) {
        return attr.indexOf('@') === 0
    }

    isElement(node) {
        return node.nodeType == 1
    }
    isTextNode(node) {
        return node.nodeType == 3
    }
}

class Watcher {
    constructor(vm, key, cb) {
        this.$vm = vm
        this.$key = key
        this.cb = cb
        this.value = this.get()
    }
    get() {
        let value = this.$vm.$data[this.$key]
        return value
    }
    updata() {
        this.value = this.get()
        this.cb.call(this.$vm, this.value)
        // console.log('更新视图')
    }
}

class MVue {
    constructor(options) {
        this.$data = options.data
        this.$el = options.el
        this.$methods = options.methods
        this.$bindding = {}
        this.observer(this.$data)
        this.$compile = new Compile(this, this.$el)
    }

    observer(obj) {
        Object.keys(obj).forEach(key => {
            this.proxy(key)
            this.$bindding[key] = { directives: [] }
            // console.log(this.$bindding)
            this.defindReactive(obj, key, obj[key])
        })
    }

    proxy(key) {
        Object.defineProperty(this, key, {
            get() {
                return this.$data[key]
            },
            set(newVal) {
                this.$data[key] = newVal
            }
        })
    }

    defindReactive(obj, key, val) {
        var _this = this
        Object.defineProperty(obj, key, {
            get() {
                return val
            },
            set(newVal) {
                if (val === newVal) return
                val = newVal
                console.log(_this.$bindding)
                _this.$bindding[key].directives.forEach(dir => {
                    dir.updata()
                })
            }
        })
    }
}