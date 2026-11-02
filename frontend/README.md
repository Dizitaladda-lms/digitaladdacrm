# React + Vite

## Diwali festival mode

Festival mode defaults to `auto` and is active from **2026-11-01 through
2026-11-10 (IST)**. Update the ISO dates in `src/config/festivalConfig.js` for
the next Diwali period. Set `VITE_FESTIVAL_MODE` to `diwali`, `off`, or `auto`
to force the mode on, force it off, or use the configured date range. In `auto`
mode, the diya toggle cycles between automatic, on, and off. The selected
preference is stored in `dizitaladda_festival_pref`.

Animations are suppressed for reduced-motion preferences and low-power
devices. Festival decorations are hidden when printing and remain below modal
layers.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
