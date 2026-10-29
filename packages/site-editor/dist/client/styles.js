export const editorStyles = `
.site-editor-launch,
.site-editor-bar,
.site-editor-history,
.site-editor-dialog {
  font-family: "Outfit", "Avenir Next", "Segoe UI", sans-serif;
  letter-spacing: 0;
}
.site-editor-launch {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  background: #221c16;
  color: #f6f1e6;
  box-shadow: 0 12px 30px rgba(34, 28, 22, 0.22);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.site-editor-launch:hover { background: #3a3128; }
.site-editor-bar {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 24px);
  padding: 8px 8px 8px 14px;
  border-radius: 16px;
  background: #221c16;
  color: #f6f1e6;
  box-shadow: 0 18px 50px rgba(34, 28, 22, 0.28);
}
.site-editor-brand {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-right: 4px;
}
.site-editor-status {
  font-size: 13px;
  color: #d9d0c2;
  max-width: 28vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.site-editor-error { color: #ffb4a2; }
.site-editor-bar button,
.site-editor-history button,
.site-editor-dialog button {
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  padding: 8px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}
.site-editor-bar button:hover,
.site-editor-history button:hover { background: rgba(255, 255, 255, 0.08); }
.site-editor-bar button:disabled { opacity: 0.4; cursor: default; }
.site-editor-publish {
  background: #e4ff6a !important;
  color: #221c16 !important;
}
.site-editor-publish:hover { background: #efffb0 !important; }
.site-editor-history {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 61;
  width: min(360px, calc(100vw - 32px));
  max-height: min(70vh, 640px);
  overflow: auto;
  background: #f7f1e6;
  color: #221c16;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(34, 28, 22, 0.2);
  padding: 16px;
}
.site-editor-history h2 {
  margin: 0 0 12px;
  font-size: 16px;
}
.site-editor-history ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.site-editor-history li {
  border-top: 1px solid rgba(34, 28, 22, 0.12);
  padding-top: 10px;
}
.site-editor-history p { margin: 2px 0 8px; color: #5c5348; font-size: 12px; }
.site-editor-dialog {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  background: rgba(34, 28, 22, 0.4);
  padding: 20px;
}
.site-editor-card {
  width: min(420px, 100%);
  background: #f7f1e6;
  color: #221c16;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 20px 60px rgba(34, 28, 22, 0.25);
}
.site-editor-card h2 { margin: 0 0 8px; font-size: 22px; }
.site-editor-card p { margin: 0 0 14px; color: #5c5348; }
.site-editor-card input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(34, 28, 22, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  margin-bottom: 12px;
  background: white;
}
.site-editor-card .site-editor-publish { width: 100%; }
html[data-site-editor-editing="true"] [data-site-editor-spot] {
  outline: 1px dashed rgba(31, 106, 74, 0.7);
  outline-offset: 4px;
  border-radius: 4px;
  cursor: text;
  min-width: 0.5em;
}
html[data-site-editor-editing="true"] [data-site-editor-spot]:focus {
  outline: 2px solid #1f6a4a;
  background: rgba(228, 255, 106, 0.35);
}
html[data-site-editor-editing="true"] body { padding-bottom: 96px; }
@media (prefers-reduced-motion: reduce) {
  .site-editor-launch, .site-editor-bar, .site-editor-history { transition: none; }
}
/* display:flex/grid on the bar and dialog would otherwise beat the hidden attribute. */
.site-editor-root [hidden] {
  display: none !important;
}
`;
