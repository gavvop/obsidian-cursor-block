# Cursor Block

An [Obsidian](https://obsidian.md) plugin that displays the editor cursor as a block instead of a thin line.

## Features

- Block cursor as wide as the character under it
- Works with multiple cursors
- Stays visible while typing, blinks when idle

## Settings

| Setting | Description |
| --- | --- |
| Use accent color | Use the theme's accent color, or pick a custom one |
| Invert text under cursor | Solid block with the character underneath shown in inverted color |
| Opacity | Block opacity (when inversion is off) |
| Blink | Turn blinking on or off |
| Blink duration | Length of one blink cycle, in seconds |

## Manual installation

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/gavvop/obsidian-cursor-block/releases/latest).
2. Copy them into `<your vault>/.obsidian/plugins/cursor-block/`.
3. Reload Obsidian and enable **Cursor Block** under *Settings → Community plugins*.

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

[MIT](LICENSE)
