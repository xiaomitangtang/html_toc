## 使用方式

### 使用默认样式和节点

```javascript
const toc = new HtmlToc(options)
toc.mountToc(mountOptions)
```

### 暂时不带样式

| className         | 作用                                |                         |
| ----------------- | ----------------------------------- | ----------------------- |
| para_node         | toc 生成的节点统一携带的 class 属性 |                         |
| para_node[active] | 激活的 toc 会带上 active 属性       | 默认情况                |
| para_node[hidden] | 隐藏的 toc 会带上 hidden 属性       | 默认情况                |
| para_node_level_X | toc 节点的层级相关                  | X 代表第几级，从 0 开始 |

```css
.para_node {
  cursor: pointer;
  font-size: 14px;
  user-select: none;
}

.para_node[active] {
  color: green;
}

.para_node_level_0 {
  padding-left: 20px;
}

.para_node_level_1 {
  padding-left: 40px;
}

.para_node_level_2 {
  padding-left: 60px;
}

.para_node_level_3 {
  padding-left: 80px;
}

.para_node_level_4 {
  padding-left: 100px;
}
```

### 导出数据给其他 js 库生成个性化的树 比如 jquery 的 jsTree

```javascript
  const toc = new HtmlToc({
    ...
    titleKey: "text",
    noparent: true
  })

   const data = t2.getTreeData()
    $('#tree').jstree({
      'core': {
        'data': data,
        "plugins": ["checkbox"],
        'check_callback': function () { return true; }
      }
    }).on('changed.jstree', (e, data) => {
      // 这么取值完全是插件是这么设计的，
      let paraTarget = data.node.original.node
      paraTarget.scrollIntoView({
        behavior: 'smooth'
      })
    })
```

### 除了导出 treeData 还可以导出平铺的数据

```javascript
const toc = new HtmlToc(options)
// 导出  树形数据
toc.getTreeData()
// 导出平铺数据
toc.createPlatData()
```

### 平铺数据

```javascript
    [
      {
        title:'第一章' // 元素的文本内容
        _html_toc_level:1,  // 元素的层级  根据传入的选择器列表顺序
        _html_toc_node:node// 元素实际节点
      }
      ...
    ]

```

### 树形数据

```javascript
    [
      {
        title:'第一章' // 元素的文本内容
        _html_toc_level:1,  // 元素的层级  根据传入的选择器列表顺序
        _html_toc_node:node// 元素实际节点
        _html_toc_parent:parent,  //父级data对象
        children:[...]  //子级节点
      }
      ...
    ]

```

### 实例属性以及事件介绍

| 键            | 作用                   | 备注                                                                                     |
| ------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| parseSelector | 解析选择器为 dom 节点  |                                                                                          |
| getPlatData   | 获取平铺数据           |                                                                                          |
| getTreeData   | 获取树形数据           |                                                                                          |
| updateData    | 更新 toc 的节点        | toc 不会监听 dom 变化自动更新，如果 dom 变化，调用此函数，然后在获取数据或者生成新的 toc |
| addEvent      | 给匹配到的节点添加事件 | {click:clickHandler,...}，添加的是原始的节点事件，不是 toc 上的事件                      |
| removeEvent   | 给匹配到的节点移除事件 |                                                                                          |
| mountToc      | 使用默认的样式生成 toc | 第一个参数是目标节点，第二个参数是相关的配置对象                                         |
| destory       | 销毁                   |                                                                                          |

### 进行配置的相关设置

```javascript
const Default_selectors = ['h1', 'h2', 'h3', 'h5', 'h6']
const LevelKey = '_html_toc_level'
const nodeKey = '_html_toc_node'
const parentKey = '_html_toc_parent'
const containerActiveTocItemKey = '_html_old_active_toc'
const containerClickKey = '_htmlClick'
const tocItemClassPre = 'para_node para_node_level_'
const tocNodeKey = '_html_toc_node_data'
const DefaultOptions = {
  titleKey: 'title',
  childrenKey: 'children',
  clearEmptyChildren: true,
  clearParent: false,
}
const DefaultMountTocOptions = {
  scrollbehavior: 'smooth',
  isChildrenHiddenKey: 'hiddenChildren',
  isHiddenKey: 'hidden',
  isActiveKey: 'active',
  autoToggleChildren: false,
}
```

### 可配置的选项

#### 实例化时的 Options

| 键                 | 默认值                         | 作用                                                | 如何配                                                     |
| ------------------ | ------------------------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| selecters          | ['h1', 'h2', 'h3', 'h5', 'h6'] | 用于生成 toc 的选择器列表                           | 可以传入自定义选择器，比如['.t01', '.t02', '.t03', '.t04'] |
| titleKey           | title                          | 指定导出的数据，节点文本信息的 key                  | 实例化传入 option                                          |
| childrenKey        | children                       | 指定导出的数据，子节点的 key                        | 实例化传入 option                                          |
| clearEmptyChildren | true                           | 是否删除 空子节点的数据的 children 字段             | 实例化传入 option                                          |
| clearParent        | false                          | 是否去掉数据节点父节点信息，jsTree 不去掉会内存溢出 | 实例化传入 option                                          |

#### 使用默认 Toc 挂载 时 Options

| 键                  | 默认值         | 作用                                                | 如何配                         |
| ------------------- | -------------- | --------------------------------------------------- | ------------------------------ |
| clickHanle          | null           | 点击 toc 元素的处理函数，如果存在，就不会默认滚动了 | mountToc 传入第二个参数 option |
| scrollbehavior      | smooth         | 默认的处理滚动的 scrollIntoView 参数                | mountToc 传入第二个参数 option |
| autoToggleChildren  | false          | 是否修改子节点的相关属性，用于折叠子级 toc          | mountToc 传入第二个参数        |
| isChildrenHiddenKey | hiddenChildren | 父节点中子级节点隐藏的属性                          | mountToc 传入第二个参数 option |
| isHiddenKey         | hidden         | 节点自身隐藏属性，修改为其他可以自己增加 css 效果   | mountToc 传入第二个参数 option |
| isActiveKey         | active         | 节点当前是否激活属性                                | mountToc 传入第二个参数 option |

### 不建议修改的配置

| 键                        | 默认值                         | 作用                                               | 如何配         |
| ------------------------- | ------------------------------ | -------------------------------------------------- | -------------- |
| Default_selectors         | ['h1', 'h2', 'h3', 'h5', 'h6'] | 默认的选择器                                       | 修改源文件顶部 |
| LevelKey                  | \_html_toc_level               | 绑定在节点以及生成的数据中代表层级的字段           | 修改源文件顶部 |
| nodeKey                   | \_html_toc_node                | 绑定在数据中实际映射的 dom 节点                    | 修改源文件顶部 |
| parentKey                 | \_html_toc_parent              | 绑定在数据中，代表父级数据的 key 值                | 修改源文件顶部 |
| containerActiveTocItemKey | \_html_old_active_toc          | 上一次点击的 toc 节点                              | 修改源文件顶部 |
| containerClickKey         | \_htmlClick                    | 绑定在 container 上，保存点击事件的 key            | 修改源文件顶部 |
| tocNodeKey                | \_html_toc_node_data           | 绑定在 toc 的元素节点上，保存对应的 toc 数据的 key | 修改源文件顶部 |