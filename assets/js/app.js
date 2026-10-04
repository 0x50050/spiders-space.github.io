/* SPIDERS_W3B — client behavior */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* نرمال‌سازی فارسی/عربی برای جستجو */
  const norm = (s) => (s || "").toLowerCase()
    .replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه")
    .replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ی")
    .replace(/[ً-ٰٟـ]/g, "").replace(/‌/g, " ").replace(/\s+/g, " ");

  /* ————— لایت‌باکس ————— */
  const lb = $("#lb");
  let galItems = [], galIdx = 0;
  const openLb = (items, i) => {
    galItems = items; galIdx = i;
    showLb();
  };
  const showLb = () => {
    const a = galItems[galIdx];
    $("img", lb).src = a.href;
    $(".lb-cap", lb).textContent = galItems.length > 1 ? `${galIdx + 1} / ${galItems.length}` : "";
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  };
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ""; };
  $(".lb-x", lb).addEventListener("click", closeLb);
  $(".lb-prev", lb).addEventListener("click", () => { galIdx = (galIdx - 1 + galItems.length) % galItems.length; showLb(); });
  $(".lb-next", lb).addEventListener("click", () => { galIdx = (galIdx + 1) % galItems.length; showLb(); });
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    if (e.key === "Escape") { if (!lb.hidden) closeLb(); hideSearch(); if (typing) document.activeElement.blur(); }
    if (!lb.hidden && e.key === "ArrowLeft") $(".lb-prev", lb).click();
    if (!lb.hidden && e.key === "ArrowRight") $(".lb-next", lb).click();
    if (e.key === "/" && !typing) { e.preventDefault(); $("#q")?.focus(); }
  });

  /* ————— کلیک سراسری: گالری + اسپویلر + کپی + توقف ویدیوها ————— */
  document.addEventListener("click", (e) => {
    const gal = e.target.closest("a.lb");
    if (gal) {
      e.preventDefault();
      const group = $$(`a.lb[data-gal="${gal.dataset.gal}"]`);
      openLb(group, Math.max(0, group.indexOf(gal)));
      return;
    }
    const sp = e.target.closest(".spoiler");
    if (sp) { sp.classList.toggle("show"); return; }
    const cp = e.target.closest(".copy");
    if (cp) {
      const url = new URL(cp.dataset.url, location.href).href;
      const done = () => toast("link copied ⧉");
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(done);
      else {
        const t = document.createElement("textarea");
        t.value = url; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); } catch (_) {}
        t.remove(); done();
      }
    }
  });
  document.addEventListener("play", (e) => {
    if (e.target.tagName === "VIDEO" || e.target.tagName === "AUDIO") {
      $$("video,audio").forEach((v) => { if (v !== e.target && !v.paused) v.pause(); });
    }
  }, true);

  /* ————— توست ————— */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("on"), 2000);
  }

  /* ————— fx toggle ————— */
  const fxBtn = $("#fxtoggle");
  fxBtn?.addEventListener("click", () => {
    const off = document.documentElement.classList.toggle("nofx");
    try { localStorage.setItem("spiders-nofx", off ? "1" : "0"); } catch (_) {}
    toast(off ? "fx: off" : "fx: on");
  });

  /* ————— بازگشت به بالا ————— */
  const topBtn = $("#top");
  addEventListener("scroll", () => topBtn.classList.toggle("on", scrollY > 700), { passive: true });
  topBtn.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));

  /* ————— اسکرول بی‌پایان ————— */
  if (window.__FEED__) {
    let page = window.__FEED__.page;
    const pages = window.__FEED__.pages;
    const sentinel = $("#sentinel");
    let busy = false;
    const more = async () => {
      if (busy || page >= pages) return;
      busy = true;
      sentinel.classList.add("loading");
      try {
        const r = await fetch(`data/page-${page + 1}.json`);
        const j = await r.json();
        $("#feed").insertAdjacentHTML("beforeend", j.html);
        page = j.page;
        if (page >= j.pages) { sentinel.classList.remove("loading"); sentinel.classList.add("done"); io.disconnect(); }
      } catch (_) {
        sentinel.classList.remove("loading");
      }
      busy = false;
    };
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) more(); }, { rootMargin: "900px" });
    io.observe(sentinel);
  }

  /* ————— جستجو ————— */
  const q = $("#q");
  const resBox = $("#searchres");
  let searchData = null, debT;
  const hideSearch = () => { resBox.hidden = true; };
  const loadSearch = async () => {
    if (searchData) return;
    try { searchData = await (await fetch("search.json")).json(); }
    catch (_) { searchData = []; }
  };
  const renderResults = (items, query) => {
    if (!query) { hideSearch(); return; }
    if (!items.length) {
      resBox.innerHTML = `<div class="nores">no signals in the web…</div>`;
      resBox.hidden = false;
      return;
    }
    resBox.innerHTML = items.map((p) => {
      const t = p.t || "";
      const rawIdx = t.toLowerCase().indexOf(query.toLowerCase());
      let snip;
      if (rawIdx >= 0) {
        const s = Math.max(0, rawIdx - 36), eIdx = Math.min(t.length, rawIdx + query.length + 60);
        snip = (s > 0 ? "…" : "") + t.slice(s, rawIdx) + "<mark>" + t.slice(rawIdx, rawIdx + query.length) + "</mark>" + t.slice(rawIdx + query.length, eIdx) + (eIdx < t.length ? "…" : "");
      } else {
        snip = t.slice(0, 90) + (t.length > 90 ? "…" : "");
      }
      return `<a href="post/${p.id}/"><span class="rid mono">#${p.id}</span><span class="rd mono">${p.d}</span><span class="snip">${snip}</span></a>`;
    }).join("");
    resBox.hidden = false;
  };
  if (q) {
    q.addEventListener("focus", loadSearch, { once: true });
    q.addEventListener("input", () => {
      clearTimeout(debT);
      debT = setTimeout(async () => {
        const v = q.value.trim();
        if (v.length < 2) { hideSearch(); return; }
        await loadSearch();
        const nq = norm(v);
        const items = (searchData || []).filter((p) => norm(p.t).includes(nq)).slice(0, 25);
        renderResults(items, v);
      }, 160);
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = $("a", resBox);
        if (first && !resBox.hidden) { e.preventDefault(); location.href = first.href; }
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".searchbox")) hideSearch();
    });
  }
})();
