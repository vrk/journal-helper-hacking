/*
 * @Author: 秦少卫
 * @Date: 2023-06-20 12:38:37
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-04-11 12:36:03
 * @Description: 复制插件
 */

import { fabric } from 'fabric';
import Editor from '../Editor';
type IEditor = Editor;
import { v4 as uuid } from 'uuid';
import { getImgStr } from '../utils/utils';
import { start } from 'repl';

const COPY_COMMAND = 'ctrl+c, command+c';
const PASTE_COMMAND = 'ctrl+v, command+v';

class CopyPlugin {
  public canvas: fabric.Canvas;
  public editor: IEditor;
  static pluginName = 'CopyPlugin';
  static apis = ['clone'];
  public hotkeys: string[] = [COPY_COMMAND, PASTE_COMMAND];
  private cache: null | fabric.ActiveSelection | fabric.Object;
  private nextPasteLocation = {
    top: 10,
    left: 10,
  };
  constructor(canvas: fabric.Canvas, editor: IEditor) {
    this.canvas = canvas;
    this.editor = editor;
    this.cache = null;
    this.initPaste();
  }

  _getCopySpace() {
    return this.canvas.dpi * 0.2;
  }

  // Multiple Object Copy
  _copyActiveSelection(activeObject: fabric.Object) {
    // Spacing settings
    const canvas = this.canvas;
    activeObject?.clone((cloned: fabric.Object) => {
      // Cingle again, processing the situation of multiple objects
      cloned.clone((clonedObj: fabric.ActiveSelection) => {
        canvas.discardActiveObject();
        if (clonedObj.left === undefined || clonedObj.top === undefined) return;
        // Re -assign the cloned canvas
        clonedObj.canvas = canvas;
        // Set location information
        clonedObj.set({
          left: clonedObj.left + this._getCopySpace(),
          top: clonedObj.top + this._getCopySpace(),
          evented: true,
          name: activeObject.name,
          id: uuid(),
        });
        clonedObj.forEachObject((obj: fabric.Object) => {
          obj.id = uuid();
          canvas.add(obj);
        });
        // Solving the problem of non -choice
        clonedObj.setCoords();
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
      });
    });
  }

  // Single object copy
  _copyObject(activeObject: fabric.Object) {
    // Spacing settings
    const canvas = this.canvas;
    activeObject?.clone((cloned: fabric.Object) => {
      if (cloned.left === undefined || cloned.top === undefined) return;
      canvas.discardActiveObject();
      // Set location information
      cloned.set({
        left: cloned.left + this._getCopySpace(),
        top: cloned.top + this._getCopySpace(),
        evented: true,
        name: activeObject.name,
        id: uuid(),
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
    });
  }

  // for context menu copy
  clone(paramsActiveObeject?: fabric.ActiveSelection | fabric.Object) {
    const activeObject = paramsActiveObeject || this.canvas.getActiveObject();
    if (!activeObject) return;
    if (activeObject.type === 'activeSelection') {
      this._copyActiveSelection(activeObject);
    } else {
      this._copyObject(activeObject);
    }
  }

  // Shortcut key extension recovery
  async hotkeyEvent(eventName: string, e: any) {
    if (eventName === COPY_COMMAND && e.type === 'keydown') {
      const activeObject = this.canvas.getActiveObject();
      if (!activeObject) {
        return;
      }
      this.nextPasteLocation = {
        left: activeObject.left || this._getCopySpace(),
        top: activeObject.top || this._getCopySpace(),
      };
      const objectAsJson = JSON.stringify(activeObject.toJSON());
      return navigator.clipboard.writeText(objectAsJson);
    } else if (eventName === PASTE_COMMAND && e.type === 'keydown') {
      if (this.cache) {
        this.clone(this.cache);
      }
    }
  }

  contextMenu() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      return [{ text: 'Copy', hotkey: '', disabled: false, onclick: () => this.clone() }];
    }
  }

  destroy() {
    console.log('pluginDestroy');
    window.removeEventListener('paste', (e) => this.pasteListener(e));
  }

  initPaste() {
    window.addEventListener('paste', (e) => this.pasteListener(e));
  }

  async _pasteFabricObject(item: ClipboardItem) {
    try {
      const blob = await item.getType('text/plain');
      const blobText = await blob.text();
      const parsed = JSON.parse(blobText);
      const canvas = this.canvas;
      if (parsed.version) {
        const startingLeft = this.nextPasteLocation.left + this._getCopySpace();
        const startingTop = this.nextPasteLocation.top + this._getCopySpace();
        // then we know this is another FabricJS object
        if (parsed.type === 'activeSelection') {
          const group = parsed;
          const groupLeft = startingLeft;
          const groupTop = startingTop;
          fabric.util.enlivenObjects(
            parsed.objects,
            (objects: any) => {
              objects.forEach(function (obj: any) {
                const objectLeft = obj.left;
                const objectTop = obj.top;
                const objectInGroupLeft = objectLeft + groupLeft + group.width / 2;
                const objectInGroupTop = objectTop + groupTop + group.height / 2;
                obj.left = objectInGroupLeft;
                obj.top = objectInGroupTop;
                obj.id = uuid();
                canvas.add(obj);
              });
              const sel = new fabric.ActiveSelection(objects, {
                canvas: canvas,
              });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            },
            'fabric'
          );
        } else {
          fabric.util.enlivenObjects(
            [parsed],
            (objects: any) => {
              objects.forEach(function (obj: any) {
                obj.left = startingLeft;
                obj.top = startingTop;
                obj.id = uuid();
                canvas.add(obj);
                canvas.setActiveObject(obj);
              });
              canvas.requestRenderAll();
            },
            'fabric'
          );
        }
        this.nextPasteLocation = {
          left: startingLeft,
          top: startingTop,
        };
      }
    } catch (error) {
      console.log(error);
    }
  }

  async _pasteImageData(blob: Blob) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      let img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const imgInstance = new fabric.Image(img, {
          id: uuid(),
          name: 'pasted image',
          left: this._getCopySpace(),
          top: this._getCopySpace(),
        });
        this.canvas.add(imgInstance);
        const workspace = this.canvas.getObjects().find((item) => item.id === 'workspace');
        if (workspace) {
          const centerPoint = workspace.getCenterPoint();
          imgInstance.setPositionByOrigin(centerPoint, 'center', 'center');
        }

        this.canvas.setActiveObject(imgInstance);
        this.canvas.renderAll();
        img.remove();
        resolve(img);
      };
      img.src = url;
    });

    const imageUrl = URL.createObjectURL(file);
    const imgEl = document.createElement('img');
    imgEl.src = imageUrl;
    // 插入页面
    document.body.appendChild(imgEl);
    imgEl.onload = () => {
      // 创建图片对象
      // 删除页面中的图片元素
      imgEl.remove();
    };
  }

  async pasteListener(event: any) {
    const clipboardContents = await navigator.clipboard.read();
    for (const item of clipboardContents) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      console.log(item.types);
      if (item.types.includes('text/plain')) {
        return this._pasteFabricObject(item);
      } else if (imageType) {
        const blob = await item.getType(imageType);
        return this._pasteImageData(blob);
      }
    }
    return;

    if (document.activeElement === document.body) {
      event.preventDefault(); // Prevent default paste behavior
    }
    if (this.cache) {
    } else {
      return;
    }

    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const fileAccept = '.pdf,.psd,.cdr,.ai,.svg,.jpg,.jpeg,.png,.webp,.json';
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        const curFileSuffix: string | undefined = file.name.split('.').pop();
        if (!fileAccept.split(',').includes(`.${curFileSuffix}`)) return;
        if (curFileSuffix === 'svg') {
          const svgFile = await getImgStr(file);
          if (!svgFile) throw new Error('file is undefined');
          fabric.loadSVGFromURL(svgFile as string, (objects, options) => {
            const item = fabric.util.groupSVGElements(objects, {
              ...options,
              name: 'defaultSVG',
              id: uuid(),
            });
            canvas.add(item).centerObject(item).renderAll();
          });
        }
        // if (curFileSuffix === 'json') {
        //   const dataText = await getImageText(file);
        //   const template = JSON.parse(dataText);
        //   addTemplate(template);
        // }
        if (item.type.indexOf('image/') === 0) {
          // 这是一个图片文件
          const imageUrl = URL.createObjectURL(file);
          const imgEl = document.createElement('img');
          imgEl.src = imageUrl;
          // 插入页面
          document.body.appendChild(imgEl);
          imgEl.onload = () => {
            // 创建图片对象
            const imgInstance = new fabric.Image(imgEl, {
              id: uuid(),
              name: 'image',
              left: 100,
              top: 100,
            });
            // 设置缩放
            canvas.add(imgInstance);
            canvas.setActiveObject(imgInstance);
            canvas.renderAll();
            // 删除页面中的图片元素
            imgEl.remove();
          };
        }
      } else if (item.kind === 'string' && item.type.indexOf('text/plain') === 0) {
        // 文本数据
        item.getAsString((text: any) => {
          // 插入到文本框
          const activeObject = canvas.getActiveObject() as fabric.Textbox;
          // 如果是激活的文字把复制的内容插入到对应光标位置
          if (
            activeObject &&
            (activeObject.type === 'textbox' || activeObject.type === 'i-text') &&
            activeObject.text
          ) {
            const cursorPosition = activeObject.selectionStart;
            const textBeforeCursorPosition = activeObject.text.substring(0, cursorPosition);
            const textAfterCursorPosition = activeObject.text.substring(cursorPosition as number);

            // 更新文本对象的文本
            activeObject.set('text', textBeforeCursorPosition + text + textAfterCursorPosition);

            // 重新设置光标的位置
            activeObject.selectionStart = cursorPosition + text.length;
            activeObject.selectionEnd = cursorPosition + text.length;

            // 重新渲染画布展示更新后的文本
            activeObject.dirty = true;
            canvas.renderAll();
          } else {
            const fabricText = new fabric.IText(text, {
              left: 100,
              top: 100,
              fontSize: 80,
              id: uuid(),
            });
            canvas.add(fabricText);
            canvas.setActiveObject(fabricText);
          }
        });
      }
    }
    if (!items.length) {
      if (this.cache) {
        this.clone(this.cache);
      }
    }
  }
}

export default CopyPlugin;
