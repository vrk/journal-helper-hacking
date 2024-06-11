<template>
  <div>
    <Divider plain orientation="left">Dimensions</Divider>
    <set-size
      :initial-height="DefaultSize.height"
      :initial-width="DefaultSize.width"
      :initial-dpi="DefaultDpi"
    ></set-size>
  </div>
</template>

<script setup name="Paper">
const DefaultSize = {
  width: 8.5,
  height: 11,
};
const DefaultDpi = 300;
import setSize from '@/components/setSize.vue';
</script>
