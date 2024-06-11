/*
 * @Author: 秦少卫
 * @Date: 2023-06-27 12:26:41
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-05-11 14:18:13
 * @Description: 画布区域插件
 */

import { fabric } from 'fabric';
import Editor from '../Editor';
import { throttle } from 'lodash-es';
type IEditor = Editor;

type MyOptionType = {
  width: number;
  height: number;
  dpi: number;
};

class WorkspacePlugin {
  public fabricCanvas: fabric.Canvas;
  public editor: IEditor;
  static pluginName = 'WorkspacePlugin';
  static events = ['sizeChange'];
  static apis = ['big', 'small', 'auto', 'one', 'setSize', 'getWorkspase', 'setWorkspaseBg'];

  static cssPixelsPerInch = 90;

  workspaceEl!: HTMLElement;
  workspaceFabricRect: null | fabric.Rect;
  option: MyOptionType;
  constructor(
    fabricCanvas: fabric.Canvas,
    editor: IEditor,
    config: {
      heightInPixels: number;
      widthInPixels: number;
      dpi: number;
    }
  ) {
    console.log('workspace constructed');
    this.fabricCanvas = fabricCanvas;
    this.editor = editor;
    this.workspaceFabricRect = null;
    const workspaceEl = document.querySelector('#workspace') as HTMLElement;
    if (!workspaceEl) {
      throw new Error('element #workspace is missing, plz check!');
    }
    this.workspaceEl = workspaceEl;
    this.workspaceFabricRect = null;
    this.option = {
      width: config.widthInPixels,
      height: config.heightInPixels,
      dpi: config.dpi,
    };
    this._initBackground();
    this._initWorkspace();
    this._initResizeObserve();
    this._bindWheel();
  }

  zoomFactorForInches() {
    const workspaceFabricRect = this.fabricCanvas
      .getObjects()
      .find((item) => item.id === 'workspace') as fabric.Rect;
    return WorkspacePlugin.cssPixelsPerInch / workspaceFabricRect.dpi;
  }

  hookImportAfter() {
    return new Promise((resolve) => {
      const workspace = this.fabricCanvas.getObjects().find((item) => item.id === 'workspace');
      if (workspace) {
        workspace.set('selectable', false);
        workspace.set('hasControls', false);
        this.setSize(workspace.width, workspace.height, workspace.dpi);
        this.editor.emit('sizeChange', workspace.width, workspace.height, workspace.get('dpi'));
      }
      resolve('');
    });
  }

  hookSaveAfter() {
    return new Promise((resolve) => {
      // this.auto();
      resolve(true);
    });
  }

  // Initialization background
  _initBackground() {
    this.fabricCanvas.backgroundImage = '';
    this.fabricCanvas.setWidth(this.workspaceEl.offsetWidth);
    this.fabricCanvas.setHeight(this.workspaceEl.offsetHeight);
  }

  // Initialized canvas
  _initWorkspace() {
    const { width, height, dpi } = this.option;
    const workspace = new fabric.Rect({
      fill: 'rgba(255,255,255,1)',
      width,
      height,
      id: 'workspace',
      strokeWidth: 0,
    });
    workspace.set('selectable', false);
    workspace.set('hasControls', false);
    workspace['dpi'] = dpi;
    workspace.hoverCursor = 'default';
    this.fabricCanvas.add(workspace);
    this.fabricCanvas.renderAll();

    this.workspaceFabricRect = workspace;
    if (this.fabricCanvas.clearHistory) {
      this.fabricCanvas.clearHistory();
    }
    this.auto();
  }

  // 返回workspace对象
  getWorkspase() {
    return this.fabricCanvas.getObjects().find((item) => item.id === 'workspace') as fabric.Rect;
  }

  /**
   * Set the canvas center to the specified object center point
   * @param {Object} obj Specified object
   */
  setCenterFromObject(obj: fabric.Rect) {
    const { fabricCanvas: canvas } = this;
    const objCenter = obj.getCenterPoint();
    const viewportTransform = canvas.viewportTransform;
    if (canvas.width === undefined || canvas.height === undefined || !viewportTransform) return;
    viewportTransform[4] = canvas.width / 2 - objCenter.x * viewportTransform[0];
    viewportTransform[5] = canvas.height / 2 - objCenter.y * viewportTransform[3];
    canvas.setViewportTransform(viewportTransform);
    canvas.renderAll();
  }

  // 初始化监听器
  _initResizeObserve() {
    const resizeObserver = new ResizeObserver(
      throttle(() => {
        this.auto();
      }, 50)
    );
    resizeObserver.observe(this.workspaceEl);
  }

  setSize(width: number | undefined, height: number | undefined, dpi: number | undefined) {
    console.log('size is setting');
    if (width === undefined || height === undefined || dpi === undefined) {
      throw new Error(
        `width or height is undefined. width: ${width}, height: ${height}, dpi: ${dpi}`
      );
    }
    this._initBackground();
    this.option.width = width;
    this.option.height = height;
    // 重新设置workspace
    this.workspaceFabricRect = this.fabricCanvas
      .getObjects()
      .find((item) => item.id === 'workspace') as fabric.Rect;
    this.workspaceFabricRect.set('width', width);
    this.workspaceFabricRect.set('height', height);
    this.workspaceFabricRect.dpi = dpi;
    this.editor.emit(
      'sizeChange',
      this.workspaceFabricRect.width,
      this.workspaceFabricRect.height,
      this.workspaceFabricRect.dpi
    );
    this.one();
  }

  setZoomAuto(scale: number, cb?: (left?: number, top?: number) => void) {
    const { workspaceEl } = this;
    const width = workspaceEl.offsetWidth;
    const height = workspaceEl.offsetHeight;
    this.fabricCanvas.setWidth(width);
    this.fabricCanvas.setHeight(height);
    const center = this.fabricCanvas.getCenter();
    this.fabricCanvas.setViewportTransform(fabric.iMatrix.concat());
    this.fabricCanvas.zoomToPoint(new fabric.Point(center.left, center.top), scale);
    if (!this.workspaceFabricRect) return;
    this.setCenterFromObject(this.workspaceFabricRect);

    // 超出画布不展示
    this.workspaceFabricRect.clone((cloned: fabric.Rect) => {
      this.fabricCanvas.clipPath = cloned;
      this.fabricCanvas.requestRenderAll();
    });
    if (cb) cb(this.workspaceFabricRect.left, this.workspaceFabricRect.top);
  }

  _getScale() {
    return fabric.util.findScaleToFit(this.getWorkspase(), {
      width: this.workspaceEl.offsetWidth,
      height: this.workspaceEl.offsetHeight,
    });
  }

  // 放大
  big() {
    let zoomRatio = this.fabricCanvas.getZoom();
    zoomRatio += 0.05;
    const center = this.fabricCanvas.getCenter();
    this.fabricCanvas.zoomToPoint(new fabric.Point(center.left, center.top), zoomRatio);
  }

  // 缩小
  small() {
    let zoomRatio = this.fabricCanvas.getZoom();
    zoomRatio -= 0.05;
    const center = this.fabricCanvas.getCenter();
    this.fabricCanvas.zoomToPoint(
      new fabric.Point(center.left, center.top),
      zoomRatio < 0 ? 0.01 : zoomRatio
    );
  }

  // 自动缩放
  auto() {
    const scale = this._getScale() * 0.9;
    this.setZoomAuto(scale);
  }

  // 1:1 放大
  one() {
    this.setZoomAuto(1 * this.zoomFactorForInches());
    this.fabricCanvas.requestRenderAll();
  }

  setWorkspaseBg(color: string) {
    const workspase = this.getWorkspase();
    workspase?.set('fill', color);
  }

  _bindWheel() {
    this.fabricCanvas.on('mouse:wheel', function (this: fabric.Canvas, opt) {
      const delta = opt.e.deltaY;
      let zoom = this.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      const center = this.getCenter();
      this.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
  }

  destroy() {
    console.log('pluginDestroy');
  }

  // _setDPI(canvas, dpi: number) {
  //   // Set up CSS size.
  //   canvas.style.width = `${CANVAS_WIDTH_INCHES}in`;
  //   canvas.style.height = `${CANVAS_HEIGHT_INCHES}in`;

  //   // Get size information.
  //   const scaleFactor = dpi / CSS_PIXELS_PER_INCH;
  //   const width = CANVAS_WIDTH_INCHES * CSS_PIXELS_PER_INCH;
  //   const height = CANVAS_HEIGHT_INCHES * CSS_PIXELS_PER_INCH;

  //   // Resize the canvas.
  //   canvas.width = Math.ceil(width * scaleFactor);
  //   canvas.height = Math.ceil(height * scaleFactor);
  // }

  // _setDPI(canvas, dpi: number) {
  //   // Set up CSS size.
  //   canvas.style.width = `${CANVAS_WIDTH_INCHES}in`;
  //   canvas.style.height = `${CANVAS_HEIGHT_INCHES}in`;

  //   // Get size information.
  //   const scaleFactor = dpi / CSS_PIXELS_PER_INCH;
  //   const width = CANVAS_WIDTH_INCHES * CSS_PIXELS_PER_INCH;
  //   const height = CANVAS_HEIGHT_INCHES * CSS_PIXELS_PER_INCH;

  //   // Resize the canvas.
  //   canvas.width = Math.ceil(width * scaleFactor);
  //   canvas.height = Math.ceil(height * scaleFactor);
  // }
}

export default WorkspacePlugin;
