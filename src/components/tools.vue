<template>
  <div>
    <Divider plain orientation="left">{{ $t('common_elements') }}</Divider>
    <div class="tool-box">
      <span
        @click="insertImage"
        :class="state.isDrawingLineMode && state.lineType === 'freeDraw' && 'bg'"
      >
        <Icon type="md-brush" :size="22" />
      </span>
    </div>
  </div>
</template>

<script setup name="Tools">
import { Utils } from '@kuaitu/core';
const { getImgStr, selectFiles } = Utils;
import { v4 as uuid } from 'uuid';
// import initializeLineDrawing from '@/core/remove/initializeLineDrawing';
import { getPolygonVertices } from '@/utils/math';
import useSelect from '@/hooks/select';
import useCalculate from '@/hooks/useCalculate';
import { useI18n } from 'vue-i18n';
import setSize from '@/components/setSize.vue';

const LINE_TYPE = {
  polygon: 'polygon',
  freeDraw: 'freeDraw',
  pathText: 'pathText',
};
// Default attribute
const defaultPosition = { shadow: '', fontFamily: 'arial' };
// Drag attribute
const dragOption = {
  left: 0,
  top: 0,
};
const { t } = useI18n();
const { fabric, canvasEditor } = useSelect();
const { getCanvasBound, isOutsideCanvas } = useCalculate();
const state = reactive({
  isDrawingLineMode: false,
  lineType: false,
});

const insertImage = () => {
  selectFiles({ accept: 'image/*', multiple: true }).then((fileList) => {
    Array.from(fileList).forEach((item) => {
      getImgStr(item).then((file) => {
        insertImgFile(file);
      });
    });
  });
};

// Insert picture file
function insertImgFile(file) {
  if (!file) throw new Error('file is undefined');
  const imgEl = document.createElement('img');
  imgEl.src = file;
  // Insert page
  document.body.appendChild(imgEl);
  imgEl.onload = () => {
    // Create a picture object
    const imgInstance = new fabric.Image(imgEl, {
      id: uuid(),
      name: '图片1',
      left: 100,
      top: 100,
    });
    // Set the zoom
    canvasEditor.canvas.add(imgInstance);
    canvasEditor.canvas.setActiveObject(imgInstance);
    canvasEditor.canvas.renderAll();
    // Delete the picture elements in the page
    imgEl.remove();
  };
}

const endConflictTools = () => {
  canvasEditor.discardPolygon();
  canvasEditor.endDraw();
  canvasEditor.endTextPathDraw();
};
const endDrawingLineMode = () => {
  state.isDrawingLineMode = false;
  state.lineType = '';
  canvasEditor.setMode(state.isDrawingLineMode);
  canvasEditor.setLineType(state.lineType);
};

const ensureObjectSelEvStatus = (evented, selectable) => {
  canvasEditor.canvas.forEachObject((obj) => {
    if (obj.id !== 'workspace') {
      obj.selectable = selectable;
      obj.evented = evented;
    }
  });
};

onMounted(() => {
  nextTick(() => {
    // Line drawing
    // drawHandler = initializeLineDrawing(canvasEditor.canvas, defaultPosition);

    canvasEditor.canvas.on('drop', (opt) => {
      // The distance between the left and top of the browser from the browser
      const { left, top } = getCanvasBound();
      const offset = { left, top };

      // The coordinates of the mouse convert into a canvas (unprepared coordinates)
      const point = {
        x: opt.e.x - offset.left,
        y: opt.e.y - offset.top,
      };

      // The coordinates after conversion, RestorePointervpt is not affected by window transformation
      const pointerVpt = canvasEditor.canvas.restorePointerVpt(point);
      dragOption.left = pointerVpt.x;
      dragOption.top = pointerVpt.y;
    });
  });
});
</script>

<style scoped lang="less">
.tool-box {
  display: flex;
  justify-content: space-around;
  span {
    flex: 1;
    text-align: center;
    padding: 5px 0;
    background: #f6f6f6;
    margin-left: 2px;
    cursor: pointer;
    &:hover {
      background: #edf9ff;
      svg {
        fill: #2d8cf0;
      }
    }
  }
  .bg {
    background: #d8d8d8;

    &:hover {
      svg {
        fill: #2d8cf0;
      }
    }
  }
}
.img {
  width: 20px;
}
</style>
