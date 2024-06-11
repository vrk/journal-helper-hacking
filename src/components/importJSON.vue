<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-05-31 16:58:12
 * @Description: 导入JSON文件
-->

<template>
  <div style="display: inline-block">
    <Button @click="clickHandler">Open</Button>
  </div>
</template>

<script name="ImportJson" setup>
import useSelect from '@/hooks/select';
import useMaterial from '@/hooks/useMaterial';
import { Message } from 'view-ui-plus';
import modalSzie from '@/components/common/modalSzie';
import { Spin } from 'view-ui-plus';

const { canvasEditor } = useSelect();
const { createTmpl, routerToId } = useMaterial();
const modalSizeRef = ref(null);

const clickHandler = (type) => {
  canvasEditor.insert();
};

const createDesign = () => {
  modalSizeRef.value.showSetSize();
};

const customSizeCreate = async (w, h) => {
  const res = await createTmpl(w, h);
  routerToId(res.data.data.id);
  Message.success('创建成功');
};
</script>
<style scoped lang="less">
h3 {
  margin-bottom: 10px;
}
.divider {
  margin-top: 0;
}
</style>
