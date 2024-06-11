/*
 * @Author: Qin Shaowei
 * @Date: 2023-06-20 12:52:09
 * @Lasteditors: june 1601745371@qq.com
 * @Lastedittime: 2024-05-23 17:56:15
 * @Descripting: Internal plug -in
 */
import { v4 as uuid } from 'uuid';
import { selectFiles, clipboardText, downFile } from './utils/utils';
import { fabric } from 'fabric';
import Editor from './Editor';
type IEditor = Editor;
import { SelectEvent, SelectMode } from './eventType';
import { changeDpiDataUrl } from 'changedpi';
import printJS from 'print-js';

function transformText(objects: any) {
  if (!objects) return;
  objects.forEach((item: any) => {
    if (item.objects) {
      transformText(item.objects);
    } else {
      item.type === 'text' && (item.type = 'textbox');
    }
  });
}

class ServersPlugin {
  public canvas: fabric.Canvas;
  public editor: IEditor;
  public selectedMode: SelectMode;
  static pluginName = 'ServersPlugin';
  static apis = [
    'insert',
    'loadJSON',
    'getJson',
    'dragAddItem',
    'clipboard',
    'clipboardBase64',
    'saveJson',
    'saveSvg',
    'saveImg',
    'clear',
    'preview',
    'print',
    'addImgByElement',
    'getImageExtension',
    'getSelectMode',
  ];
  static events = [SelectMode.ONE, SelectMode.MULTI, SelectEvent.CANCEL];
  // public hotkeys: string[] = ['left', 'right', 'down', 'up'];
  constructor(canvas: fabric.Canvas, editor: IEditor) {
    this.canvas = canvas;
    this.editor = editor;
    this.selectedMode = SelectMode.EMPTY;
    this._initSelectEvent();
  }

  private _initSelectEvent() {
    this.canvas.on('selection:created', () => this._emitSelectEvent());
    this.canvas.on('selection:updated', () => this._emitSelectEvent());
    this.canvas.on('selection:cleared', () => this._emitSelectEvent());
  }

  private _emitSelectEvent() {
    if (!this.canvas) {
      throw TypeError('Not initialized yet');
    }

    const actives = this.canvas
      .getActiveObjects()
      .filter((item) => !(item instanceof fabric.GuideLine)); // Filter the auxiliary line
    if (actives && actives.length === 1) {
      this.selectedMode = SelectMode.ONE;
      this.editor.emit(SelectEvent.ONE, actives);
    } else if (actives && actives.length > 1) {
      this.selectedMode = SelectMode.MULTI;
      this.editor.emit(SelectEvent.MULTI, actives);
    } else {
      this.editor.emit(SelectEvent.CANCEL);
    }
  }

  getSelectMode() {
    return String(this.selectedMode);
  }

  insert(callback?: () => void) {
    selectFiles({ accept: '.json' }).then((files) => {
      if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = () => {
          this.loadJSON(reader.result as string, callback);
        };
      }
    });
  }

  loadJSON(jsonFile: string | object, callback?: () => void) {
    // Make sure the element exists ID
    const journalFile = typeof jsonFile === 'string' ? JSON.parse(jsonFile) : jsonFile;
    const { fabricData, metaData } = journalFile;

    fabricData.objects.forEach((item: any) => {
      !item.id && (item.id = uuid());
    });
    jsonFile = JSON.stringify(fabricData);
    // Before loading
    this.editor.hooksEntity.hookImportBefore.callAsync(jsonFile, () => {
      this.canvas.loadFromJSON(jsonFile, () => {
        this.canvas.renderAll();
        const workspace = this.canvas.getObjects().find((item) => item.id === 'workspace');
        this.canvas.dpi = metaData.dpi;
        if (workspace) {
          workspace.dpi = metaData.dpi;
        }
        // Hook after loading
        this.editor.hooksEntity.hookImportAfter.callAsync(jsonFile, () => {
          // Fixed the problem that the JSON with watermarks cannot be cleared #359
          this.editor?.updateDrawStatus(!!fabricData['overlayImage']);
          this.canvas.renderAll();
          callback && callback();
          this.editor.emit('loadJson');
        });
      });
    });
  }

  getJson() {
    return this.canvas.toJSON(['id', 'gradientAngle', 'selectable', 'hasControls', 'linkData']);
  }

  /**
   * @description: 拖拽添加到画布
   * @param {Event} event
   * @param {Object} item
   */
  dragAddItem(item: fabric.Object, event?: DragEvent) {
    if (event) {
      const { left, top } = this.canvas.getSelectionElement().getBoundingClientRect();
      if (event.x < left || event.y < top || item.width === undefined) return;

      const point = {
        x: event.x - left,
        y: event.y - top,
      };
      const pointerVpt = this.canvas.restorePointerVpt(point);
      item.left = pointerVpt.x - item.width / 2;
      item.top = pointerVpt.y;
    }
    const { width } = this._getSaveOption();
    width && item.scaleToWidth(width / 2);
    this.canvas.add(item);
    this.canvas.requestRenderAll();
  }

  clipboard() {
    const jsonStr = this.getJson();
    clipboardText(JSON.stringify(jsonStr, null, '\t'));
  }

  clipboardBase64() {
    this.preview().then((dataUrl: any) => {
      clipboardText(dataUrl);
    });
  }

  async saveJson() {
    const dataUrl = this.getJson();
    // Turn text text to textgroup, so that the import can be edited
    await transformText(dataUrl.objects);
    const journalFile = {
      fabricData: dataUrl,
      metaData: {
        dpi: this.canvas.dpi,
      },
    };
    const fileStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(journalFile, null, '\t')
    )}`;
    downFile(fileStr, 'json');
  }

  saveSvg() {
    this.editor.hooksEntity.hookSaveBefore.callAsync('', () => {
      const option = this._getSaveSvgOption();
      const dataUrl = this.canvas.toSVG(option);
      const fileStr = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dataUrl)}`;
      this.editor.hooksEntity.hookSaveAfter.callAsync(fileStr, () => {
        downFile(fileStr, 'svg');
      });
    });
  }

  saveImg() {
    this.editor.hooksEntity.hookSaveBefore.callAsync('', () => {
      const option = this._getSaveOption();

      this.canvas.clone((clonedCanvas: fabric.Canvas) => {
        clonedCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        const dataUrl = clonedCanvas.toDataURL(option);
        const dataUrlAdjustedDPI = changeDpiDataUrl(dataUrl, this.canvas.dpi);
        this.editor.hooksEntity.hookSaveAfter.callAsync(dataUrlAdjustedDPI, () => {
          downFile(dataUrlAdjustedDPI, 'png');
        });
      });
    });
  }

  preview() {
    return new Promise((resolve) => {
      this.editor.hooksEntity.hookSaveBefore.callAsync('', () => {
        const option = this._getSaveOption();
        this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        this.canvas.renderAll();
        const dataUrl = this.canvas.toDataURL(option);
        this.editor.hooksEntity.hookSaveAfter.callAsync(dataUrl, () => {
          resolve(dataUrl);
        });
      });
    });
  }

  print() {
    this.editor.hooksEntity.hookSaveBefore.callAsync('', () => {
      const option = this._getSaveOption();

      this.canvas.clone((clonedCanvas: fabric.Canvas) => {
        clonedCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        const dataUrl = clonedCanvas.toDataURL(option);
        const dataUrlAdjustedDPI = changeDpiDataUrl(dataUrl, this.canvas.dpi);
        this.editor.hooksEntity.hookSaveAfter.callAsync(dataUrlAdjustedDPI, () => {
          printJS({
            printable: dataUrlAdjustedDPI,
            type: 'image',
            maxWidth: clonedCanvas.width,
          });
        });
      });
    });
  }

  _getSaveSvgOption() {
    const workspace = this.canvas.getObjects().find((item) => item.id === 'workspace');
    const { left, top, width, height } = workspace as fabric.Object;
    return {
      width,
      height,
      viewBox: {
        x: left,
        y: top,
        width,
        height,
      },
    };
  }

  _getSaveOption() {
    const workspace = this.canvas
      .getObjects()
      .find((item: fabric.Object) => item.id === 'workspace');
    const { left, top, width, height } = workspace as fabric.Object;
    const option = {
      name: 'New Image',
      format: 'png',
      quality: 1,
      width,
      height,
      left,
      top,
    };
    return option;
  }

  addImgByElement(target: HTMLImageElement) {
    // const target = e.target as HTMLImageElement;
    const imgType = this.getImageExtension(target.src);
    if (imgType === 'svg') {
      fabric.loadSVGFromURL(target.src, (objects) => {
        const item = fabric.util.groupSVGElements(objects, {
          shadow: '',
          fontFamily: 'arial',
          id: uuid(),
          name: 'svg元素',
        });
        this.dragAddItem(item);
      });
    } else {
      fabric.Image.fromURL(
        target.src,
        (imgEl) => {
          imgEl.set({
            left: 100,
            top: 100,
          });
          this.dragAddItem(imgEl);
        },
        { crossOrigin: 'anonymous' }
      );
    }
  }

  getImageExtension(imageUrl: string) {
    const pathParts = imageUrl.split('/');
    const filename = pathParts[pathParts.length - 1];
    const fileParts = filename.split('.');
    return fileParts[fileParts.length - 1];
  }

  clear() {
    this.canvas.getObjects().forEach((obj) => {
      if (obj.id !== 'workspace') {
        this.canvas.remove(obj);
      }
    });
    this.editor?.setWorkspaseBg('#fff');
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  destroy() {
    console.log('pluginDestroy');
  }
}

export default ServersPlugin;
