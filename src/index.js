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
  nodeToTitle: node => node.innerText,// 匹配到节点，获取toc 文本内容的函数，可以自有获取，默认是获取innerText
  childrenKey: "children",// 树形数据保存子节点的字段
  selecters: Default_selectors,// 指定 生成toc需要抽取的dom选择器列表，列表顺序即是最终生成的level层级，只支持 .xxx tag id  不支持嵌套
  clearEmptyChildren: true,// 树形数据是否去掉 children=[] 是的children字段
  clearParent: false// 树形数据是否保留parent，用以规避在某些外部插件生成树时内存溢出，目前测试的 jq的jsTree需要去掉parent
}
const DefaultMountTocOptions = {// 生成toc的相关配置  mountToc(container,OPTION)  中的option
  scrollbehavior: 'smooth',// 内部是调用的dom的 scrollIntoView实现页面滚动，该字段是传递给此函数的 behavior
  scrollParams: null,// 内部是调用的dom的 scrollIntoView实现页面滚动，该字段是传递给此函数的 option
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
    this.$nodeToTitle = options.nodeToTitle
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
  //从新获取文章内容的标题节点
  updateData() {
    if (!this.$root) {
      console.log('root不能为空',)
      return
    }
    this.$targetList = []
    this.loopChild(this.$root)
  }
  // 这两个函数是给  匹配到的文章内容的对应标题节点添加和移除事件
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
    return this.$targetList.map(node => ({ [LevelKey]: node[LevelKey], [nodeKey]: node, [this.$titleKey]: this.$nodeToTitle(node) }))
  }
  createTreeData() {
    let rootList = []
    let plathtmlTocNodes = []
    let tmpNode = null
    this.$targetList.forEach(node => {
      let nodeLevel = node[LevelKey]
      let curNode = { [LevelKey]: nodeLevel, [this.$titleKey]: this.$nodeToTitle(node), [nodeKey]: node, [this.$childrenKey]: [] }
      plathtmlTocNodes.push(curNode)
      if (!tmpNode) {
        tmpNode = curNode
        rootList.push(tmpNode)
      } else {
        if (nodeLevel === tmpNode[LevelKey]) {
          // 层级相同，往共同的父级添加子节点即可
          if (tmpNode[parentKey]) {
            // 如果父级存在
            tmpNode[parentKey][this.$childrenKey].push(curNode)
            tmpNode = tmpNode[parentKey]
            curNode[parentKey] = tmpNode
          } else {
            // 父级不存在则存到顶级节点中
            rootList.push(curNode)
            tmpNode = rootList[rootList.length - 1]
          }
          // 如果层级比前一个高   那么就是其子节点
        } else if (nodeLevel > tmpNode[LevelKey]) {
          tmpNode[this.$childrenKey].push(curNode)
          curNode[parentKey] = tmpNode
        }
        // 如果层级比前一个低，则不是其子节点，需要向上找父节点
        else if (nodeLevel < tmpNode[LevelKey]) {
          while (tmpNode && tmpNode[LevelKey] >= nodeLevel) {
            tmpNode = tmpNode[parentKey]
          }
          if (!tmpNode) {
            tmpNode = curNode
            rootList.push(tmpNode)
          } else {
            // 如果存在 那么此时 tmpNode的层级 < curNode的层级， tmpNode是父节点
            tmpNode[this.$childrenKey].push(curNode)
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
      isActiveKey, autoToggleChildren, clickHanle, scrollParams } = options
    function containerClick(e) {
      if (!e.target[tocNodeKey] || !e.target[tocNodeKey][nodeKey]) {
        // toc上都有这个字段，没有的说明不是toc
        return
      }
      try {
        const tocNode = e.target// 指向点击的toc节点
        const target = e.target[tocNodeKey][nodeKey]// 指向toc所对应的 文章内容的标题实际dom节点
        const userClickHandle = clickHanle
        if (userClickHandle) {
          userClickHandle(tocNode, target)
        } else {
          target.scrollIntoView(scrollParams || {
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
            // 为0 说明是顶级toc  为null说明不是toc  否符合终止循环条件
            if (!nextLevel) break
            if (nextLevel > curLevel) {
              updateAttr(nextToc, isHiddenKey, hiddenChild)
            } else if (nextLevel <= curLevel) {
              break
            }
          }
        }
        // 如果存在 高亮节点，则先取消其高亮状态，在激活当前点击的toc高亮   当前设计只允许同时高亮一个toc节点
        if (container[containerActiveTocItemKey]) {
          updateAttr(container[containerActiveTocItemKey], isActiveKey, null)
        }
        updateAttr(tocNode, isActiveKey, true)
        // 存储当前toc为高亮节点
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


if (typeof module !== "undefined") {
  module.exports = HtmlToc
}