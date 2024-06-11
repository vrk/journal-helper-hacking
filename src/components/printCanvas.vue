<template>
  <Button type="text" @click="printCanvas">Print</Button>
</template>

<script lang="ts" setup>
const canvasEditor: any = inject('canvasEditor');
const printCanvas = () => {
  canvasEditor.print();
};
</script>

<style scoped lang="less"></style>
