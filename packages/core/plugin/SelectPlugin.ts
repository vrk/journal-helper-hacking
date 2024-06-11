/*
 * @Author: vrk
 */

import { fabric } from 'fabric';
import Editor from '../Editor';
type IEditor = Editor;

const SELECT_ALL_COMMAND = 'ctrl+a, command+a';
const SELECT_NONE_COMMAND = 'esc';

class SelectPlugin {
  public canvas: fabric.Canvas;
  public editor: IEditor;
  static pluginName = 'MySelectPlugin';
  static apis = [];
  static events = [];
  public hotkeys: string[] = [SELECT_ALL_COMMAND, SELECT_NONE_COMMAND];

  constructor(canvas: fabric.Canvas, editor: IEditor) {
    this.canvas = canvas;
    this.editor = editor;
  }

  async hotkeyEvent(eventName: string, e: any) {
    if (eventName === SELECT_ALL_COMMAND && e.type === 'keydown') {
      e.preventDefault();
      this.canvas.discardActiveObject();
      const allObjectsIgnorePaper = this.canvas.getObjects().filter((obj) => {
        return obj.id !== 'workspace';
      });
      if (allObjectsIgnorePaper.length === 0) {
        return;
      }
      const sel = new fabric.ActiveSelection(allObjectsIgnorePaper, {
        canvas: this.canvas,
      });
      this.canvas.setActiveObject(sel);
      this.canvas.requestRenderAll();
    } else if (eventName === SELECT_NONE_COMMAND && e.type === 'keydown') {
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    }
  }

  destroy() {
    console.log('destroy selectPlugin');
  }
}

export default SelectPlugin;
