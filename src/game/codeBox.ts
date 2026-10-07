// r43 save backup: a small HTML sheet over the canvas with a real text box. Phaser has no text input, and iOS Safari
// only offers Copy / Paste on a real field, so this is both the copy fallback (select-all box) and the paste field.

export interface CodeBoxAction {
  label: string;
  color: string;
  /** Return a message to show it under the box and keep the sheet open; return nothing to close. */
  run: (text: string) => string | void | Promise<string | void>;
}

export interface CodeBoxOpts {
  title: string;
  hint: string;
  /** Pre-filled read-only code (copy mode); omit for an empty paste box. */
  value?: string;
  placeholder?: string;
  actions: CodeBoxAction[];
}

let open: HTMLElement | null = null;

export function closeCodeBox() {
  open?.remove();
  open = null;
}

export function openCodeBox(o: CodeBoxOpts) {
  closeCodeBox();
  const font = "'Lilita One', 'Arial Black', sans-serif";
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(26,15,24,0.6);padding:16px;box-sizing:border-box';
  const card = document.createElement('div');
  card.style.cssText = 'width:100%;max-width:420px;background:#fbe7c6;border:4px solid #2b1d2e;border-radius:24px;padding:18px;box-sizing:border-box;text-align:center;font-family:Arial,sans-serif';
  const title = document.createElement('div');
  title.textContent = o.title;
  title.style.cssText = `font-family:${font};font-size:28px;color:#3b2533`;
  const hint = document.createElement('div');
  hint.textContent = o.hint;
  hint.style.cssText = 'font-weight:bold;font-size:15px;color:#7a5a4a;margin:6px 0 12px;white-space:pre-line';
  const box = document.createElement('textarea');
  box.value = o.value ?? '';
  box.placeholder = o.placeholder ?? '';
  box.readOnly = o.value !== undefined;
  box.spellcheck = false;
  box.autocapitalize = 'off';
  box.setAttribute('autocorrect', 'off');
  // 16px keeps iOS from zooming the page when the box gets focus
  box.style.cssText = 'width:100%;height:120px;box-sizing:border-box;font:16px/1.3 monospace;word-break:break-all;border:3px solid #2b1d2e;border-radius:12px;padding:8px;background:#fff8ea;color:#3b2533;resize:none';
  const err = document.createElement('div');
  err.style.cssText = 'font-weight:bold;font-size:15px;color:#d8261a;min-height:20px;margin:8px 0;white-space:pre-line';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:10px;justify-content:center';
  for (const a of o.actions) {
    const b = document.createElement('button');
    b.textContent = a.label;
    b.style.cssText = `flex:1;font-family:${font};font-size:20px;color:#fff;background:${a.color};border:3px solid #2b1d2e;border-radius:16px;padding:10px 6px;text-shadow:0 2px 0 #2b1d2e;cursor:pointer`;
    b.addEventListener('click', async () => {
      err.textContent = '';
      b.disabled = true;
      const msg = await a.run(box.value);
      b.disabled = false;
      if (msg) err.textContent = msg;
      else if (open === root) closeCodeBox();
    });
    row.appendChild(b);
  }
  card.append(title, hint, box, err, row);
  root.appendChild(card);
  // keep taps on the sheet from reaching the game canvas underneath
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup']) root.addEventListener(ev, (e) => e.stopPropagation());
  document.body.appendChild(root);
  open = root;
  if (box.readOnly) {
    const selectAll = () => {
      box.focus();
      box.setSelectionRange(0, box.value.length);
    };
    box.addEventListener('focus', selectAll);
    box.addEventListener('click', selectAll);
    selectAll();
  }
  return root;
}

/** Copies text; on iOS Safari the text is still being made when the tap ends, so it goes in as a ClipboardItem promise. */
export async function copyText(text: Promise<string>): Promise<boolean> {
  try {
    const clip = navigator.clipboard;
    if (!clip) return false;
    if (typeof ClipboardItem === 'function' && clip.write) {
      await clip.write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })]);
    } else await clip.writeText(await text);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(await text);
      return true;
    } catch {
      return false;
    }
  }
}
