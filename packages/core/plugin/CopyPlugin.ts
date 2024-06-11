/*
 * @Author: vrk
 */

import { fabric } from 'fabric';
import Editor from '../Editor';
type IEditor = Editor;
import { v4 as uuid } from 'uuid';

const COPY_COMMAND = 'ctrl+c, command+c';
const PASTE_COMMAND = 'ctrl+v, command+v';

class CopyPlugin {
  public canvas: fabric.Canvas;
  public editor: IEditor;
  static pluginName = 'CopyPlugin';
  static apis = ['clone'];
  static events = [];
  public hotkeys: string[] = [COPY_COMMAND, PASTE_COMMAND];
  private nextPasteLocation = {
    top: 10,
    left: 10,
  };
  constructor(canvas: fabric.Canvas, editor: IEditor) {
    this.canvas = canvas;
    this.editor = editor;
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
  }

  async _pasteFiles(files: FileList) {
    // Iterate over all pasted files.
    Array.from(files).forEach(async (file) => {
      if (file.type.startsWith('image/')) {
        await this._pasteImageData(file);
      }
    });
  }

  async pasteListener(event: ClipboardEvent) {
    event.preventDefault();
    if (event.clipboardData?.files && event.clipboardData.files.length > 0) {
      // handle file
      this._pasteFiles(event.clipboardData.files);
      return;
    }

    const clipboardContents = await navigator.clipboard.read();
    for (const item of clipboardContents) {
      const imageType = item.types.find((type) => type.startsWith('image/'));
      console.log(item, item.types);
      if (item.types.includes('text/plain')) {
        return this._pasteFabricObject(item);
      } else if (imageType) {
        const blob = await item.getType(imageType);
        return this._pasteImageData(blob);
      }
    }
  }
}

export default CopyPlugin;
