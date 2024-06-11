<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-05-21 15:38:38
 * @Description: 尺寸设置
-->

<template>
  <Form inline class="form-wrap">
    <FormItem :label="$t('Width')" prop="name">
      <InputNumber v-model="width" @on-change="setSize"></InputNumber>
    </FormItem>
    <FormItem :label="$t('Height')" prop="name">
      <InputNumber v-model="height" @on-change="setSize"></InputNumber>
    </FormItem>
    <FormItem label="DPI" prop="name">
      <InputNumber v-model="dpiRef" @on-change="setSize"></InputNumber>
    </FormItem>
  </Form>
</template>

<script setup name="CanvasSize">
const props = defineProps(['initialHeight', 'initialWidth', 'initialDpi']);

import useSelect from '@/hooks/select';

const { mixinState, canvasEditor } = useSelect();

let width = ref(props.initialWidth ?? 0);
let height = ref(props.initialHeight ?? 0);
let dpiRef = ref(props.initialDpi ?? 72);

onMounted(() => {
  console.log('set size mounted');
  canvasEditor.on('sizeChange', (w, h, dpi) => {
    console.log('HIIII', canvasEditor.option);
    canvasEditor.fabricCanvas.dpi = dpi;
    const divisor =
      canvasEditor.fabricCanvas.units === 'pixels' ? 1 : canvasEditor.fabricCanvas.dpi;
    width.value = w / divisor;
    height.value = h / divisor;
    dpiRef.value = dpi;
  });
});

const setSize = () => {
  if (canvasEditor.fabricCanvas.units === 'pixels') {
    canvasEditor.setSize(width.value, height.value, dpiRef.value);
  } else {
    canvasEditor.fabricCanvas.dpi = dpiRef.value;
    canvasEditor.setSize(
      width.value * canvasEditor.fabricCanvas.dpi,
      height.value * canvasEditor.fabricCanvas.dpi,
      canvasEditor.fabricCanvas.dpi
    );
  }
};
</script>

<style scoped lang="less">
:deep(.ivu-form-item) {
  margin-bottom: 0;
}

:deep(.ivu-input-number) {
  width: 70px;
}
.form-wrap {
  display: flex;
  flex-direction: column;
}

h4 {
  font-weight: normal;
}
</style>
