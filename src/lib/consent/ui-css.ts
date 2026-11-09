/** Shadow DOM styles. Page theme vars are the fallback; config.theme sets --ec-* on the host. */
export const CSS = `
:host{all:initial;--b:var(--ec-bg,var(--color-bg,#fff));--f:var(--ec-fg,var(--color-fg,#18181b));--m:var(--ec-muted,var(--color-muted,#f4f4f5));--mf:var(--ec-muted-fg,var(--color-muted-fg,#52525b));--p:var(--ec-primary,var(--color-primary,#18181b));--pf:var(--ec-primary-fg,var(--color-primary-fg,#fff));--bd:var(--ec-border,var(--color-border,#e4e4e7));--r:min(var(--ec-radius,var(--radius-theme,16px)),20px);--rb:var(--ec-button-radius,var(--radius-button,10px));--lift:0px}
*{box-sizing:border-box;margin:0;font:inherit;color:inherit}
.w{font-family:var(--ec-font,var(--font-body,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif));font-size:15px;line-height:1.45;color:var(--f);-webkit-text-size-adjust:100%}
.bn{position:fixed;z-index:2147483000;bottom:calc(16px + var(--lift));left:16px;width:440px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px - var(--lift));overflow:auto;background:var(--b);border:1px solid var(--bd);border-radius:var(--r);box-shadow:0 12px 40px rgba(0,0,0,.18);padding:20px;animation:up .28s ease-out}
.bn[data-pos=bottom-right]{left:auto;right:16px}
.bn[data-pos=bottom-center]{left:50%;transform:translateX(-50%);width:560px;animation-name:upc}
[dir=rtl] .bn[data-pos=auto],[dir=rtl] .bn[data-pos=bottom-left]{left:auto;right:16px}
@media (min-width:600px) and (max-width:1023px) and (orientation:portrait){.bn[data-pos=auto]{left:50%;transform:translateX(-50%);width:560px;animation-name:upc}[dir=rtl] .bn[data-pos=auto]{right:auto;left:50%}}
.hd{display:flex;gap:12px;align-items:center;margin-bottom:8px}
.ic{flex:none;width:40px;height:40px}
.lg{flex:none;display:block;max-height:32px;max-width:140px;width:auto;height:auto;object-fit:contain}
.lgs{flex:none;display:block;max-height:24px;max-width:96px;width:auto;height:auto;object-fit:contain}
.dh h2{flex:1;min-width:0}
h2{font-size:17px;font-weight:700;line-height:1.25}
.tx{color:var(--f);font-size:14.5px}
.lk{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:13.5px}
a{color:var(--f);text-decoration:underline;text-underline-offset:2px}
.bt{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:16px}
button{cursor:pointer;border:0;background:none;-webkit-tap-highlight-color:transparent}
.b{min-height:44px;padding:10px 12px;border-radius:var(--rb);font-weight:600;font-size:14.5px;line-height:1.2;border:2px solid var(--p)}
.b1{background:var(--p);color:var(--pf)}
.b2{background:var(--b);color:var(--f);border-color:var(--bd)}
.b:hover{filter:brightness(1.08)}
:focus-visible{outline:3px solid var(--p);outline-offset:2px;box-shadow:0 0 0 5px var(--b)}
.cp .tx{font-size:13.5px}.cp{padding:14px}.cp .ic{width:28px;height:28px}.cp .bt{margin-top:10px}
@media (max-width:599px){
.bn,.bn[data-pos],[dir] .bn[data-pos]{left:0;right:0;bottom:var(--lift);width:100%;max-width:none;transform:none;border-radius:var(--r) var(--r) 0 0;border-width:1px 0 0;max-height:45vh;padding:16px 16px max(16px,env(safe-area-inset-bottom));animation-name:up}
.bt{grid-template-columns:1fr 1fr}.bt .b{min-height:48px}.bt .ch{grid-column:1/-1}
.cp{max-height:35vh}
}
@media (max-width:359px){.bt{grid-template-columns:1fr}}
.ov{position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.4);animation:fd .2s}
.dl{position:fixed;z-index:2147483002;top:0;bottom:0;right:0;width:420px;max-width:100vw;background:var(--b);display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,.2);animation:sl .25s ease-out}
[dir=rtl] .dl{right:auto;left:0;animation-name:sr}
@media (max-width:599px){.dl{width:100%;top:auto;height:100%;max-height:100dvh;border-radius:0;animation-name:up}}
.dh{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--bd)}
.x{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:22px;color:var(--f)}
.x:hover{background:var(--m)}
.db{flex:1;overflow:auto;padding:16px 20px;overscroll-behavior:contain}
.in{color:var(--mf);font-size:14px;margin-bottom:12px}
.gp{background:var(--m);border-radius:var(--r);padding:10px 12px;font-size:13.5px;margin-bottom:12px}
.ct{border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:10px}
.cr{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cr h3{font-weight:700;font-size:15px}
.cd{color:var(--mf);font-size:13.5px;margin-top:4px}
.on{color:var(--mf);font-size:13px;font-weight:600;white-space:nowrap}
.sw{flex:none;position:relative;width:52px;height:32px;border-radius:16px;background:#71717a;transition:background .2s}
.k{position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#52525b;transition:transform .2s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
.k svg{width:14px;height:14px;grid-area:1/1;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.sw .y,.sw[aria-checked=true] .n{display:none}.sw[aria-checked=true] .y{display:block}
.sw[aria-checked=true]{background:var(--p)}.sw[aria-checked=true] .k{transform:translateX(20px);color:var(--p)}
[dir=rtl] .k{left:auto;right:4px}[dir=rtl] .sw[aria-checked=true] .k{transform:translateX(-20px)}
.sw:disabled{cursor:not-allowed;background:repeating-linear-gradient(135deg,#71717a 0 5px,#52525b 5px 10px)}
.sc{margin-top:8px;font-size:13px;font-weight:600;text-decoration:underline;min-height:24px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px}
th,td{text-align:start;padding:6px 4px;border-top:1px solid var(--bd);vertical-align:top}
.cn{display:block;font-family:ui-monospace,monospace;font-size:11.5px;opacity:.75}
th{color:var(--mf);font-weight:600}
.df{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:12px 20px max(12px,env(safe-area-inset-bottom));border-top:1px solid var(--bd)}
@media (max-width:420px){.df{grid-template-columns:1fr 1fr}.df .sv{grid-column:1/-1;order:3}}
.fb{position:fixed;z-index:2147483000;left:16px;bottom:calc(16px + var(--lift));width:44px;height:44px;border-radius:50%;background:var(--b);border:1px solid var(--bd);box-shadow:0 4px 16px rgba(0,0,0,.18);display:grid;place-items:center;animation:fd .2s;transition:opacity .6s ease,transform .6s ease,filter .6s ease}
.fb.out{opacity:0;transform:scale(.8);filter:blur(6px);pointer-events:none}
[dir=rtl] .fb{left:auto;right:16px}
.fb svg{width:28px;height:28px}
.ts{position:fixed;z-index:2147483003;left:50%;bottom:calc(16px + var(--lift));transform:translateX(-50%);background:var(--f);color:var(--b);padding:10px 16px;border-radius:var(--rb);font-size:14px;animation:fd .2s;max-width:calc(100vw - 32px)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes up{from{transform:translateY(24px);opacity:0}}
@keyframes upc{from{transform:translate(-50%,24px);opacity:0}}
@keyframes sl{from{transform:translateX(40px);opacity:0}}
@keyframes sr{from{transform:translateX(-40px);opacity:0}}
@keyframes fd{from{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

/** Switch knob: check when on, cross when off (state not by colour alone). */
export const SWITCH_KNOB = `<span class="k" aria-hidden="true"><svg class="y" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg><svg class="n" viewBox="0 0 16 16"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg></span>`;

/** Friendly cookie with a bite, decorative. */
export const COOKIE_SVG = `<svg class="ic" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 4a20 20 0 1 0 20 21 6 6 0 0 1-7-6 6 6 0 0 1-6-7 6 6 0 0 1-7-8Z" fill="#E0A458" stroke="#8A5A2B" stroke-width="2"/><circle cx="16" cy="18" r="3" fill="#5B3A1E"/><circle cx="27" cy="30" r="3.2" fill="#5B3A1E"/><circle cx="15" cy="32" r="2.4" fill="#5B3A1E"/><circle cx="34" cy="26" r="1.8" fill="#5B3A1E"/><circle cx="22" cy="23" r="1.6" fill="#5B3A1E"/></svg>`;
