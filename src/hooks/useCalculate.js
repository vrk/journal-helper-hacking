/*
 * @Descripttion: useCalculate
 * @version:
 * @Author: wuchenguang1998
 * @Date: 2024-05-18 15:42:17
 * @LastEditors: wuchenguang1998
 * @LastEditTime: 2024-05-18 17:28:34
 */

export default function useCalculate() {
  const canvasEditor = inject('canvasEditor');

  // Get the DOMRect of the canvas
  const getCanvasBound = () => canvasEditor.canvas.getSelectionElement().getBoundingClientRect();

  // Determine whether the coordinates of the end of the drag and dragging are outside the canvas
  const isOutsideCanvas = (x, y) => {
    const { left, right, top, bottom } = getCanvasBound();
    return x < left || x > right || y < top || y > bottom;
  };

  return {
    getCanvasBound,
    isOutsideCanvas,
  };
}
