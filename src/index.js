const Default_selectors = ['h1', 'h2', 'h3', 'h5', 'h6']
const LevelKey = '_html_toc_level'
const nodeKey = '_html_toc_node'
const parentKey = '_html_toc_parent'
const containerActiveTocItemKey = '_html_old_active_toc'
const containerClickKey = '_htmlClick'
const tocItemClassPre = 'para_node para_node_level_'
const tocNodeKey = '_html_toc_node_data'
const DefaultOptions = {
  titleKey: "title",
  childrenKey: "children",
  selecters: Default_selectors,
  clearEmptyChildren: true,
  clearParent: false
}
const DefaultMountTocOptions = {
  scrollbehavior: 'smooth',
  isChildrenHiddenKey: "hiddenChildren",
  isHiddenKey: "hidden",
  isActiveKey: "active",
  autoToggleChildren: false,
  clickHanle: null
}
class HtmlToc {
  constructor(options) {
    options = Object.assign({}, DefaultOptions, options)
    this.$options = options
    this.$root = this.initRoot()
    this.$selectors = this.initSelectors()
    this.$titleKey = options.titleKey
    this.$childrenKey = options.childrenKey
    this.$clearEmptyChildren = options.clearEmptyChildren
    this.$clearParent = options.clearParent
    this.updateData()
  }
  initRoot() {
    const { root } = this.$options
    return this.parseSelector(root)
  }
  parseSelector(selecter) {
    if (selecter.nodeType === 1) return selecter
    if (/^\#/.test(selecter)) return document.getElementById(selecter.slice(1))
    if (/\^\./.test(selecter)) return document.getElementsByClassName(selecter.slice(1))[0]
    return document.getElementsByTagName(selecter)
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
    let isTarget = false, _paraLevel = -1
    for (let i = 0; i < this.$selectors.length; i++) {
      const { id, className, tag } = this.$selectors[i]
      if ((id && id === node.id) || (tag && tag === node.tagName) || (className && node.className && node.className.includes(className))) {
        isTarget = true
        _paraLevel = i
      }
      if (isTarget) {
        node._isHtmlToc = true
        node[LevelKey] = _paraLevel
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
    let platParaNodes = []
    let tmpNode = null
    this.$targetList.forEach(node => {
      let nodeLevel = node[LevelKey]
      let curNode = { [LevelKey]: nodeLevel, [this.$titleKey]: node.innerText, [nodeKey]: node, [this.$childrenKey]: [] }
      platParaNodes.push(curNode)
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

    platParaNodes.forEach(node => {
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
        con.innerHtml = null
        con.removeEventListener('click', con[containerClickKey], false)
        delete con[containerClickKey]
        delete con[containerActiveTocItemKey]
      })
    }
  }

  generateToc(container, options) {
    container.innerHtml = null
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
      const tocNode = e.target
      const userClickHandle = clickHanle
      const target = e.target[tocNodeKey][nodeKey]
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