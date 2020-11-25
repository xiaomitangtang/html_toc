const Default_selectors = ['h1', 'h2', 'h3', 'h5', 'h6']// 默认的选择器
const LevelKey = '_html_toc_level'// dom节点以及生成的数据项 保存层级的字段名
const nodeKey = '_html_toc_node'// 生成的数据保存原始dom节点的字段名
const parentKey = '_html_toc_parent'// 生成的数据，树形保存父级节点的字段名
const containerActiveTocItemKey = '_html_old_active_toc'// 挂载toc的容器上保存上一次高亮的toc dom元素的字段名
const containerClickKey = '_htmlClick'// 挂载toc的容器上保存点击事件的字段名
const tocItemClassPre = 'html_toc_node html_toc_node_level_'// 生成的toc 元素节点所包含的className的前缀，
const tocNodeKey = '_html_toc_node_data'//toc 元素上保存 生成的toc数据的字段名
const DefaultOptions = { // 生成数据的相关配置   new HtmlToc(root,OPTION)  这里的option
  titleKey: "title",// 生成数据保存原始节点文本内容的字段
  childrenKey: "children",// 树形数据保存子节点的字段
  selecters: Default_selectors,// 指定 生成toc需要抽取的dom选择器列表，列表顺序即是最终生成的level层级，只支持 .xxx tag id  不支持嵌套
  clearEmptyChildren: true,// 树形数据是否去掉 children=[] 是的children字段
  clearParent: false// 树形数据是否保留parent，用以规避在某些外部插件生成树时内存溢出，目前测试的 jq的jsTree需要去掉parent
}
const DefaultMountTocOptions = {// 生成toc的相关配置  mountToc(container,OPTION)  中的option
  scrollbehavior: 'smooth',// 内部是调用的dom的 scrollIntoView实现页面滚动，该字段是传递给此函数的 behavior
  isChildrenHiddenKey: "hiddenChildren",// 当前toc的子级toc是否处于隐藏状态的属性
  isHiddenKey: "hidden",//toc节点自身是否隐藏的属性
  isActiveKey: "active",// toc节点是否激活的属性
  autoToggleChildren: false,// 是否启动子节点的显示隐藏操作
  clickHanle: null// toc的点击事件滚动处理函数，传递了就不会自动处理了
}
class HtmlToc {
  constructor(root, options) {
    options = Object.assign({}, DefaultOptions, options)
    this.$options = options
    this.$root = this.initRoot(root)
    this.$selectors = this.initSelectors()
    this.$titleKey = options.titleKey
    this.$childrenKey = options.childrenKey
    this.$clearEmptyChildren = options.clearEmptyChildren
    this.$clearParent = options.clearParent
    this.updateData()
  }
  initRoot(root) {
    return this.parseSelector(root)
  }
  parseSelector(selecter) {
    if (selecter.nodeType === 1) return selecter
    if (/^\#/.test(selecter)) return document.getElementById(selecter.slice(1))
    if (/\^\./.test(selecter)) return document.getElementsByClassName(selecter.slice(1))[0]
    return document.getElementsByTagName(selecter)[0]
  }
  initSelectors() {
    const selecters = (this.$options.selecters || Default_selectors).filter(Boolean)
    return selecters.map(i => {
      const temp = {
        id: "",
        className: "",
        tag: ""
      }
      if (/^\./.test(i)) temp.className = i.slice(1)
      else if (/^\#/.test(i)) temp.id = i.slice(1)
      else temp.tag = i.toUpperCase()
      return temp
    })
  }
  loopChild(node) {
    if (!node) return
    const isTarget = this.isTargetNode(node)
    if (isTarget) this.$targetList.push(node)
    let children = [...node.children]
    children.forEach(n => this.loopChild(n))
  }
  isTargetNode(node) {
    let isTarget = false, _htmlTocLevel = -1
    for (let i = 0; i < this.$selectors.length; i++) {
      const { id, className, tag } = this.$selectors[i]
      if ((id && id === node.id) || (tag && tag === node.tagName) || (className && node.className && node.className.includes(className))) {
        isTarget = true
        _htmlTocLevel = i
      }
      if (isTarget) {
        node._isHtmlToc = true
        node[LevelKey] = _htmlTocLevel
        return true
      }
    }
    return false
  }
  getPlatData() {
    return this.createPlatData()
  }
  getTreeData() {
    return this.createTreeData()
  }
  updateData() {
    if (!this.$root) {
      console.log('root不能为空',)
      return
    }
    this.$targetList = []
    this.loopChild(this.$root)
  }

  addEvent(eventObj = {}) {
    this.$targetList.forEach(node => {
      Object.keys(eventObj).forEach(key => {
        node.addEventListener(key, eventObj[key], false)
      })
    })
  }
  removeEvent(eventObj = {}) {
    this.$targetList.forEach(node => {
      Object.keys(eventObj).forEach(key => {
        node.removeEventListener(key, eventObj[key], false)
      })
    })
  }
  createPlatData() {
    return this.$targetList.map(node => ({ [LevelKey]: node[LevelKey], [nodeKey]: node, [this.$titleKey]: node.innerText }))
  }
  createTreeData() {
    let rootList = []
    let plathtmlTocNodes = []
    let tmpNode = null
    this.$targetList.forEach(node => {
      let nodeLevel = node[LevelKey]
      let curNode = { [LevelKey]: nodeLevel, [this.$titleKey]: node.innerText, [nodeKey]: node, [this.$childrenKey]: [] }
      plathtmlTocNodes.push(curNode)
      if (!tmpNode) {
        tmpNode = curNode
        rootList.push(tmpNode)
      } else {
        if (nodeLevel === tmpNode[LevelKey]) {
          if (tmpNode[parentKey]) {
            tmpNode[parentKey][this.$childrenKey].push(curNode)
            tmpNode = tmpNode[parentKey]
            curNode[parentKey] = tmpNode
          } else {
            rootList.push(curNode)
            tmpNode = rootList[rootList.length - 1]
          }

        } else if (nodeLevel > tmpNode[LevelKey]) {
          tmpNode[this.$childrenKey].push(curNode)
          curNode[parentKey] = tmpNode
        }
        else if (nodeLevel < tmpNode[LevelKey]) {
          while (tmpNode && tmpNode[LevelKey] >= nodeLevel) {
            tmpNode = tmpNode[parentKey]
          }
          if (!tmpNode) {
            tmpNode = curNode
            rootList.push(tmpNode)
          }
        }
      }
    })

    plathtmlTocNodes.forEach(node => {
      if (this.$clearEmptyChildren && !node[this.$childrenKey] || node[this.$childrenKey].length === 0) {
        delete node[this.$childrenKey]
      }
      if (this.$clearParent) {
        delete node[parentKey]
      }
    })
    return rootList
  }

  mountToc(container, options = {}) {
    this.containers = this.containers || []
    const con = this.parseSelector(container)
    this.generateToc(con, Object.assign({}, DefaultMountTocOptions, options))
    this.containers.push(con)
  }
  destory() {
    if (this.containers) {
      this.containers.forEach(con => {
        con.innerHTML = null
        con.removeEventListener('click', con[containerClickKey], false)
        delete con[containerClickKey]
        delete con[containerActiveTocItemKey]
      })
    }
  }

  generateToc(container, options) {
    container.innerHTML = null
    let nodes = this.getPlatData()
    nodes.forEach(node => {
      const div = document.createElement('div')
      div.innerText = node[this.$titleKey]
      div.className = `${tocItemClassPre}${node[LevelKey]}`
      div[tocNodeKey] = node
      container.appendChild(div)
    })
    const { scrollbehavior,
      isChildrenHiddenKey,
      isHiddenKey,
      isActiveKey, autoToggleChildren, clickHanle } = options
    function containerClick(e) {
      try {
        const tocNode = e.target
        const target = e.target[tocNodeKey][nodeKey]
        const userClickHandle = clickHanle
        if (userClickHandle) {
          userClickHandle(tocNode, target)
        } else {
          target.scrollIntoView({
            behavior: scrollbehavior
          })
        }
        if (autoToggleChildren) {
          const hiddenChild = toggleAttr(tocNode, isChildrenHiddenKey)
          let nextToc = tocNode
          const curLevel = getTocLevel(tocNode)
          while (nextToc && nextToc.nextSibling) {
            nextToc = nextToc.nextSibling
            const nextLevel = getTocLevel(nextToc)
            if (!nextLevel) break
            if (nextLevel > curLevel) {
              updateAttr(nextToc, isHiddenKey, hiddenChild)
            } else if (nextLevel <= curLevel) {
              break
            }
          }
        }

        if (container[containerActiveTocItemKey]) {
          updateAttr(container[containerActiveTocItemKey], isActiveKey, null)
        }
        updateAttr(tocNode, isActiveKey, true)
        container[containerActiveTocItemKey] = tocNode
      } catch (error) {
        console.log('自动处理节点出错', error)
      }
    }

    container.addEventListener('click', containerClick, false)
    container[containerClickKey] = containerClick
  }
}

function getTocLevel(node) {
  try {
    return node[tocNodeKey][LevelKey]
  } catch (error) {
    return null
  }
}
function toggleAttr(node, key) {
  let has = node.hasAttribute(key)
  newVal = !has
  updateAttr(node, key, newVal)
  return newVal
}

function updateAttr(node, key, val) {
  if (val) {
    node.setAttribute(key, val)
  } else {
    node.removeAttribute(key)
  }
}


if (module) {
  module.exports = HtmlToc
}