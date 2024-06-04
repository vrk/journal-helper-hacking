import EventEmitter from 'events';
import hotkeys from 'hotkeys-js';
import ContextMenu from './ContextMenu.js';
import ServersPlugin from './ServersPlugin';
import { AsyncSeriesHook } from 'tapable';

class Editor extends EventEmitter {
  private canvas: fabric.Canvas | null = null;
  private printableCanvases: Array<fabric.Canvas> = [];

  contextMenu: ContextMenu | null = null;
  [key: string]: any;
  private pluginMap: {
    [propName: string]: IPluginTempl;
  } = {};
  // Custom event
  private customEvents: string[] = [];
  // Custom API
  private customApis: string[] = [];
  // Life cycle function name
  private hooks: IEditorHooksType[] = [
    'hookImportBefore',
    'hookImportAfter',
    'hookSaveBefore',
    'hookSaveAfter',
  ];
  public hooksEntity: {
    [propName: string]: AsyncSeriesHook<any, any>;
  } = {};

  init(canvas: fabric.Canvas) {
    this.canvas = canvas;
    const newPrintable = new fabric.Canvas('canvas', {
      fireRightClick: true, // Right -click, the number of Button is 3
      stopContextMenu: true, // By default right -click menu
      controlsAboveOverlay: true, // After beyond the clippath, the control bar still shows
      imageSmoothingEnabled: false, // Unclear problems after solving text export
      preserveObjectStacking: true, // When selecting the object in the canvas, the object is not on the top.
    });

    this.printableCanvases = [newPrintable];
    this._initContextMenu();
    this._bindContextMenu();
    this._initActionHooks();
    this._initServersPlugin();
  }

  get fabricCanvas() {
    return this.canvas;
  }

  get printableFabricCanvases() {
    return this.printableCanvases;
  }

  // Introduce component
  use(plugin: IPluginClass, options?: IPluginOption) {
    if (this._checkPlugin(plugin) && this.canvas) {
      this._saveCustomAttr(plugin);
      const pluginRunTime = new plugin(this.canvas, this, options || {}) as IPluginClass;
      // Add plug -in name
      pluginRunTime.pluginName = plugin.pluginName;
      this.pluginMap[plugin.pluginName] = pluginRunTime;
      this._bindingHooks(pluginRunTime);
      this._bindingHotkeys(pluginRunTime);
      this._bindingApis(pluginRunTime);
    }
  }

  destory() {
    this.canvas = null;
    this.contextMenu = null;
    this.pluginMap = {};
    this.customEvents = [];
    this.customApis = [];
    this.hooksEntity = {};
  }
  // Obtain a plug -in
  getPlugin(name: string) {
    if (this.pluginMap[name]) {
      return this.pluginMap[name];
    }
  }

  // Inspection component
  private _checkPlugin(plugin: IPluginClass) {
    const { pluginName, events = [], apis = [] } = plugin;
    //Name inspection
    if (this.pluginMap[pluginName]) {
      throw new Error(pluginName + 'Plug -in repeated initialization');
    }
    events.forEach((eventName: string) => {
      if (this.customEvents.find((info) => info === eventName)) {
        throw new Error(pluginName + 'Plug -in' + eventName + 'repeat');
      }
    });

    apis.forEach((apiName: string) => {
      if (this.customApis.find((info) => info === apiName)) {
        throw new Error(pluginName + 'Plug -in' + apiName + 'repeat');
      }
    });
    return true;
  }

  // 绑定hooks方法
  private _bindingHooks(plugin: IPluginTempl) {
    this.hooks.forEach((hookName) => {
      const hook = plugin[hookName];
      if (hook) {
        this.hooksEntity[hookName].tapPromise(plugin.pluginName + hookName, function () {
          // eslint-disable-next-line prefer-rest-params
          const result = hook.apply(plugin, [...arguments]);
          // hook 兼容非 Promise 返回值
          return result instanceof Promise ? result : Promise.resolve(result);
        });
      }
    });
  }

  // 绑定快捷键
  private _bindingHotkeys(plugin: IPluginTempl) {
    plugin?.hotkeys?.forEach((keyName: string) => {
      // 支持 keyup
      hotkeys(keyName, { keyup: true }, (e) => {
        plugin.hotkeyEvent && plugin.hotkeyEvent(keyName, e);
      });
    });
  }

  // Save the component custom event and API
  private _saveCustomAttr(plugin: IPluginClass) {
    const { events = [], apis = [] } = plugin;
    this.customApis = this.customApis.concat(apis);
    this.customEvents = this.customEvents.concat(events);
  }
  // Agent API event
  private _bindingApis(pluginRunTime: IPluginTempl) {
    const { apis = [] } = (pluginRunTime.constructor as any) || {};
    apis.forEach((apiName: string) => {
      this[apiName] = function () {
        // eslint-disable-next-line prefer-rest-params
        return pluginRunTime[apiName].apply(pluginRunTime, [...arguments]);
      };
    });
  }

  // 右键菜单
  private _bindContextMenu() {
    this.canvas &&
      this.canvas.on('mouse:down', (opt) => {
        if (opt.button === 3) {
          let menu: IPluginMenu[] = [];
          Object.keys(this.pluginMap).forEach((pluginName) => {
            const pluginRunTime = this.pluginMap[pluginName];
            const pluginMenu = pluginRunTime.contextMenu && pluginRunTime.contextMenu();
            if (pluginMenu) {
              menu = menu.concat(pluginMenu);
            }
          });
          this._renderMenu(opt, menu);
        }
      });
  }

  // 渲染右键菜单
  private _renderMenu(opt: { e: MouseEvent }, menu: IPluginMenu[]) {
    if (menu.length !== 0 && this.contextMenu) {
      this.contextMenu.hideAll();
      this.contextMenu.setData(menu);
      this.contextMenu.show(opt.e.clientX, opt.e.clientY);
    }
  }

  // 生命周期事件
  _initActionHooks() {
    this.hooks.forEach((hookName) => {
      this.hooksEntity[hookName] = new AsyncSeriesHook(['data']);
    });
  }

  _initContextMenu() {
    this.contextMenu = new ContextMenu(this.canvas!.wrapperEl, []);
    this.contextMenu.install();
  }

  _initServersPlugin() {
    this.use(ServersPlugin);
  }

  // Uninstall the error when solving the Listener to UNDEFINED
  off(eventName: string, listener: any): this {
    // noinspection TypeScriptValidateTypes
    return listener ? super.off(eventName, listener) : this;
  }
}

export default Editor;
