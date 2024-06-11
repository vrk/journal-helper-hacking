<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-05-21 08:59:36
 * @Description: 图层面板
-->

<template>
  <div class="box">
    <template v-if="list.length">
      <Divider plain orientation="left">{{ $t('layers') }}</Divider>
      <div class="layer-box">
        <div
          v-for="item in list"
          @click="select(item.id)"
          :key="item.id"
          :class="isSelect(item) && 'active'"
        >
          <div class="ellipsis">
            <span :class="isSelect(item) && 'active'" v-html="iconType(item.type)"></span>
            | {{ textType(item.type, item) }}
          </div>
        </div>
      </div>
      <!-- 层级调整按钮 -->
      <div class="btn-box">
        <ButtonGroup v-show="mixinState.mSelectMode === 'one'" size="small">
          <Button @click="up"><span v-html="btnIconType('up')"></span></Button>
          <Button @click="down"><span v-html="btnIconType('down')"></span></Button>
          <Button @click="upTop"><span v-html="btnIconType('upTop')"></span></Button>
          <Button @click="downTop"><span v-html="btnIconType('downTop')"></span></Button>
        </ButtonGroup>
      </div>
    </template>
    <template v-else>
      <p class="empty-text">No layers yet</p>
    </template>
  </div>
</template>

<script setup name="Layer">
import { uniqBy } from 'lodash-es';
import useSelect from '@/hooks/select';
const { canvasEditor, fabric, mixinState } = useSelect();

const list = ref([]);

// 是否选中元素
const isSelect = (item) => {
  return item.id === mixinState.mSelectId || mixinState.mSelectIds.includes(item.id);
};

// 图层类型图标
const iconType = (type) => {
  const defaultIcon =
    '<svg t="1650855578257" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="17630" width="16" height="16"><path d="M620.606061 0a62.060606 62.060606 0 0 1 62.060606 62.060606v188.943515C874.945939 273.997576 1024 437.651394 1024 636.121212c0 214.217697-173.661091 387.878788-387.878788 387.878788-198.469818 0-362.123636-149.054061-385.117091-341.333333H62.060606a62.060606 62.060606 0 0 1-62.060606-62.060606V62.060606a62.060606 62.060606 0 0 1 62.060606-62.060606h558.545455z m62.060606 297.937455V620.606061a62.060606 62.060606 0 0 1-62.060606 62.060606H297.937455C320.636121 849.159758 463.39103 977.454545 636.121212 977.454545c188.509091 0 341.333333-152.824242 341.333333-341.333333 0-172.730182-128.294788-315.485091-294.787878-338.183757zM620.606061 46.545455H62.060606a15.515152 15.515152 0 0 0-15.406545 13.699878L46.545455 62.060606v558.545455a15.515152 15.515152 0 0 0 13.699878 15.406545L62.060606 636.121212h186.181818c0-214.217697 173.661091-387.878788 387.878788-387.878788V62.060606a15.515152 15.515152 0 0 0-13.699879-15.406545L620.606061 46.545455z m15.515151 248.242424c-188.509091 0-341.333333 152.824242-341.333333 341.333333h325.818182a15.515152 15.515152 0 0 0 15.406545-13.699879L636.121212 620.606061V294.787879z" p-id="17631"></path></svg>';
  return iconType[type] || defaultIcon;
};
const textType = (type, item) => {
  console.log(item);
  if (type.includes('text')) {
    return item.name || item.text;
  }
  const typeText = {
    group: 'combination',
    image: 'picture',
    rect: 'rectangle',
    circle: '圆形',
    triangle: 'triangle',
    polygon: 'Polygonal',
    path: 'path',
  };
  return item.name || typeText[type] || 'Default element';
};
// 选中元素
const select = (id) => {
  const info = canvasEditor.canvas.getObjects().find((item) => item.id === id);
  canvasEditor.canvas.discardActiveObject();
  canvasEditor.canvas.setActiveObject(info);
  canvasEditor.canvas.requestRenderAll();
};

// 按钮类型
const btnIconType = (type) => {
  const iconType = {
    up: '<svg t="1650442206559" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1799" width="12" height="12"><path d="M876.2 434.3L536.7 94.9c-6.6-6.6-15.5-10.3-24.7-10.3-9.3 0-18.2 3.7-24.7 10.3L147.8 434.3c-13.7 13.7-13.7 35.8 0 49.5 13.7 13.7 35.8 13.7 49.5 0L477 204.1v700.2c0 19.3 15.7 35 35 35s35-15.7 35-35V204.1l279.7 279.7c6.8 6.8 15.8 10.3 24.7 10.3s17.9-3.4 24.7-10.3c13.7-13.7 13.7-35.8 0.1-49.5z" p-id="1800"></path></svg>',
    down: '<svg t="1650442229022" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1997" width="12" height="12"><path d="M876.2 589.7L536.7 929.1c-6.6 6.6-15.5 10.3-24.7 10.3-9.3 0-18.2-3.7-24.7-10.3L147.8 589.7c-13.7-13.7-13.7-35.8 0-49.5 13.7-13.7 35.8-13.7 49.5 0L477 819.9V119.6c0-19.3 15.7-35 35-35s35 15.7 35 35v700.2l279.7-279.7c6.8-6.8 15.8-10.3 24.7-10.3s17.9 3.4 24.7 10.3c13.7 13.8 13.7 35.9 0.1 49.6z" p-id="1998" ></path></svg>',
    upTop:
      '<svg t="1650442106652" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1839" width="11" height="11"><path d="M548.352 219.648a58.88 58.88 0 0 0-16.896-10.752 51.2 51.2 0 0 0-38.912 0 58.88 58.88 0 0 0-16.896 10.752l-256 256a51.2 51.2 0 0 0 72.704 72.704L460.8 379.392V972.8a51.2 51.2 0 0 0 102.4 0V379.392l168.448 168.96a51.2 51.2 0 0 0 72.704-72.704zM972.8 0H51.2a51.2 51.2 0 0 0 0 102.4h921.6a51.2 51.2 0 0 0 0-102.4z" p-id="1840" ></path></svg>',
    downTop:
      '<svg t="1650442146918" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2045" width="11" height="11"><path d="M548.352 804.352a58.88 58.88 0 0 1-16.896 10.752 51.2 51.2 0 0 1-38.912 0 58.88 58.88 0 0 1-16.896-10.752l-256-256a51.2 51.2 0 0 1 72.704-72.704L460.8 644.608V51.2a51.2 51.2 0 0 1 102.4 0v593.408l168.448-168.96a51.2 51.2 0 0 1 72.704 72.704zM972.8 1024H51.2a51.2 51.2 0 0 1 0-102.4h921.6a51.2 51.2 0 0 1 0 102.4z" p-id="2046"></path></svg>',
  };
  return iconType[type];
};
const up = () => {
  canvasEditor.up();
};
const upTop = () => {
  canvasEditor.upTop();
};
const down = () => {
  canvasEditor.down();
};
const downTop = () => {
  canvasEditor.downTop();
};

const getList = () => {
  // 不改原数组 反转
  list.value = [
    ...canvasEditor.canvas.getObjects().filter((item) => {
      // return item;
      // 过滤掉辅助线
      return !(item instanceof fabric.GuideLine || item.id === 'workspace');
    }),
  ]
    .reverse()
    .map((item) => {
      const { type, id, name, text } = item;
      return {
        type,
        id,
        name,
        text,
      };
    });
  list.value = uniqBy(unref(list), 'id');
};

onMounted(() => {
  getList();
  canvasEditor.canvas.on('after:render', getList);
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="less">
:deep(.ivu-tooltip-inner) {
  white-space: normal;
}

:deep(.ivu-tooltip) {
  display: block;
}

// :deep(.ivu-tooltip-rel) {
//   display: block;
// }
.box {
  width: 100%;
}
.layer-box {
  height: calc(100vh - 170px);
  overflow-y: auto;
  margin-bottom: 5px;
  .ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  & > div {
    padding: 0px 5px;
    margin: 3px 0;
    background: #f7f7f7;
    color: #c8c8c8;
    border-radius: 3px;
    font-size: 14px;
    line-height: 28px;
    &.active {
      color: #2d8cf0;
      background: #f0faff;
      font-weight: bold;
    }
  }
}
.btn-box {
  width: 100%;
  margin-bottom: 20px;
  background: #f3f3f3;
  .ivu-btn-group {
    display: flex;
  }
  .ivu-btn-group > .ivu-btn {
    flex: 1;
  }
}
svg {
  vertical-align: text-top;
}
:deep(.ivu-divider-plain) {
  &.ivu-divider-with-text-left {
    margin: 10px 0;
    font-size: 16px;
    font-weight: bold;
    color: #000000;
  }
}
.empty-text {
  width: 100%;
  text-align: center;
  padding-top: 10px;
  color: #999;
}
</style>

<style lang="less">
span {
  svg {
    vertical-align: middle;
  }
  &.active {
    svg.icon {
      fill: #2d8cf0;
    }
  }
}
</style>
