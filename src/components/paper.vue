<template>
  <div>
    <set-size
      :initial-height="DefaultSize.height"
      :initial-width="DefaultSize.width"
      :initial-dpi="DefaultDpi"
    ></set-size>
  </div>
</template>

<script setup name="Paper">
import useSelect from '@/hooks/select';

const { canvasEditor } = useSelect();
const DefaultSize = {
  width: 8.5,
  height: 11,
};
const DefaultDpi = 300;
import setSize from '@/components/setSize.vue';
</script>
