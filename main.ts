import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { EditorSelection } from "@codemirror/state";
import { EditorView, RectangleMarker, ViewPlugin, ViewUpdate, layer } from "@codemirror/view";

// Disegna un blocco sopra il carattere che segue ogni cursore.
const blockCursorLayer = layer({
  above: true,
  class: "cm-block-cursor-layer",
  markers(view) {
    const markers: RectangleMarker[] = [];
    for (const range of view.state.selection.ranges) {
      if (!range.empty) continue;
      const head = range.head;
      const line = view.state.doc.lineAt(head);
      if (head < line.to) {
        // Blocco largo quanto il carattere sotto il cursore
        markers.push(
          ...RectangleMarker.forRange(
            view,
            "cm-block-cursor",
            EditorSelection.range(head, head + 1)
          )
        );
      } else {
        // Fine riga: blocco con larghezza di default
        const coords = view.coordsAtPos(head);
        if (!coords) continue;
        const base = view.scrollDOM.getBoundingClientRect();
        const left = coords.left - base.left + view.scrollDOM.scrollLeft;
        const top = coords.top - base.top + view.scrollDOM.scrollTop;
        markers.push(
          new RectangleMarker(
            "cm-block-cursor",
            left,
            top,
            view.defaultCharacterWidth,
            coords.bottom - coords.top
          )
        );
      }
    }
    return markers;
  },
  update(update) {
    return update.docChanged || update.selectionSet || update.viewportChanged || update.geometryChanged;
  },
});

interface CursorBlockSettings {
  useAccentColor: boolean;
  color: string;
  opacity: number;
  invertText: boolean;
  blink: boolean;
  blinkSpeed: number;
}

const DEFAULT_SETTINGS: CursorBlockSettings = {
  useAccentColor: true,
  color: "#7f6df2",
  opacity: 0.6,
  invertText: false,
  blink: true,
  blinkSpeed: 1.2,
};

// Riavvia il lampeggio a ogni modifica o spostamento del cursore, così il blocco
// resta visibile mentre si scrive (come fa il cursore di CodeMirror).
// Alterna due animazioni identiche: cambiare nome fa ripartire l'animazione da capo.
const restartBlink = ViewPlugin.fromClass(
  class {
    phase = false;

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return;
      this.phase = !this.phase;
      update.view.dom.classList.toggle("cursor-block-phase-b", this.phase);
    }
  }
);

export default class CursorBlockPlugin extends Plugin {
  settings: CursorBlockSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    this.applyStyles();
    this.addSettingTab(new CursorBlockSettingTab(this.app, this));
    this.registerEditorExtension([
      blockCursorLayer,
      restartBlink,
      EditorView.editorAttributes.of({ class: "cursor-block-enabled" }),
    ]);
  }

  onunload() {
    const style = document.body.style;
    style.removeProperty("--cursor-block-color");
    style.removeProperty("--cursor-block-opacity");
    style.removeProperty("--cursor-block-blend");
    style.removeProperty("--cursor-block-blink-duration");
    document.body.classList.remove("cursor-block-no-blink");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.applyStyles();
  }

  // Le impostazioni vengono passate al CSS tramite variabili sul body
  applyStyles() {
    const s = this.settings;
    const style = document.body.style;
    style.setProperty("--cursor-block-color", s.useAccentColor ? "var(--text-accent)" : s.color);
    style.setProperty("--cursor-block-opacity", String(s.invertText ? 1 : s.opacity));
    style.setProperty("--cursor-block-blend", s.invertText ? "difference" : "normal");
    style.setProperty("--cursor-block-blink-duration", `${s.blinkSpeed}s`);
    document.body.classList.toggle("cursor-block-no-blink", !s.blink);
  }
}

class CursorBlockSettingTab extends PluginSettingTab {
  plugin: CursorBlockPlugin;

  constructor(app: App, plugin: CursorBlockPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.settings;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Usa il colore accento")
      .setDesc("Usa il colore accento del tema invece di un colore personalizzato.")
      .addToggle((t) =>
        t.setValue(settings.useAccentColor).onChange(async (v) => {
          settings.useAccentColor = v;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (!settings.useAccentColor) {
      new Setting(containerEl)
        .setName("Colore del cursore")
        .addColorPicker((c) =>
          c.setValue(settings.color).onChange(async (v) => {
            settings.color = v;
            await this.plugin.saveSettings();
          })
        );
    }

    new Setting(containerEl)
      .setName("Inverti il testo sotto il cursore")
      .setDesc("Blocco pieno con il carattere sotto in colore invertito (ignora l'opacità).")
      .addToggle((t) =>
        t.setValue(settings.invertText).onChange(async (v) => {
          settings.invertText = v;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (!settings.invertText) {
      new Setting(containerEl)
        .setName("Opacità")
        .addSlider((sl) =>
          sl
            .setLimits(0.1, 1, 0.05)
            .setValue(settings.opacity)
            .setDynamicTooltip()
            .onChange(async (v) => {
              settings.opacity = v;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Lampeggio")
      .addToggle((t) =>
        t.setValue(settings.blink).onChange(async (v) => {
          settings.blink = v;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (settings.blink) {
      new Setting(containerEl)
        .setName("Durata del lampeggio (secondi)")
        .setDesc("Più è basso, più il cursore lampeggia velocemente.")
        .addSlider((sl) =>
          sl
            .setLimits(0.4, 3, 0.1)
            .setValue(settings.blinkSpeed)
            .setDynamicTooltip()
            .onChange(async (v) => {
              settings.blinkSpeed = v;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
