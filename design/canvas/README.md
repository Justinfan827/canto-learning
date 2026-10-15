# Brand canvas

A pan-and-zoom canvas for flipping through the brand research in `design/inspiration/`: one board per brand with its analysis, colour tokens, type and button specimens, screenshots and assets.

```sh
pnpm design:canvas        # http://localhost:4600 (PORT to change)
```

No dependencies. The server scans `design/inspiration/` on every load, so a new `<app>/` or `<app>-web/` folder appears as a board after a refresh. `<app>` and `<app>-web` merge into one brand. Boards read each folder's `README.md`, `palette.json` (`colors`, `type`, `button`, `secondary_button`), top-level screenshots and `assets/**`.

Keys: `←`/`→` previous/next board, `F` fit board, `A` fit all, `⌘`/`Ctrl`+scroll or pinch to zoom, scroll or drag to pan. Click an image to inspect it at full size; click inside the inspector to pick a colour (copied to the clipboard). `[`/`]` step through images, `Esc` closes.
