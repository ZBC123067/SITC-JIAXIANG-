/* SITC JIAXIANG Booking · shared mobile shell · SITC_MOBILE_BUILD_V15 */
(() => {
  "use strict";

  const BUILD = "V15";
  window.SITC_MOBILE_BUILD = BUILD;
  document.documentElement.dataset.sitcBuild = BUILD;

  const $ = (id) => document.getElementById(id);
  // A few mobile browsers briefly expose a desktop-sized layout viewport.
  // Coarse-pointer devices below tablet width still receive the mobile shell.
  const mobileQuery = window.matchMedia("(max-width: 840px), (pointer: coarse) and (hover: none) and (max-width: 1180px)");
  let deferredInstallPrompt = null;
  let lastMobileScreen = "search";

  const I18N = {
    zh: {
      subtitle: "手机订舱工作台",
      routeLabel: "当前查询航线",
      search: "查询",
      map: "地图",
      tracking: "跟踪",
      booking: "订舱",
      account: "我的",
      more: "更多功能",
      language: "English",
      languageHint: "切换界面语言",
      theme: "外观模式",
      themeHint: "浅色 / 深色",
      rateExport: "运价 Excel",
      rateExportHint: "表价或协议价",
      scheduleExport: "船期 Excel",
      scheduleExportHint: "导出全部方案",
      admin: "管理后台",
      adminHint: "维护数据与客户",
      install: "安装 SITC JIAXIANG 订舱",
      installHint: "添加到手机主屏幕",
      installBanner: "像 App 一样全屏使用",
      installAction: "安装",
      installIOS: "请点击 Safari 底部“分享”，再选择“添加到主屏幕”。",
      selectSchedule: "请先在“查询”页面选择一个船期，再进入订舱。",
      offlineReady: "SITC JIAXIANG 订舱已支持离线启动。",
      close: "关闭"
    },
    en: {
      subtitle: "Mobile booking workspace",
      routeLabel: "Current route",
      search: "Search",
      map: "Map",
      tracking: "Track",
      booking: "Booking",
      account: "Me",
      more: "More",
      language: "中文",
      languageHint: "Switch interface language",
      theme: "Appearance",
      themeHint: "Light / dark mode",
      rateExport: "Rate Excel",
      rateExportHint: "Tariff or agreement",
      scheduleExport: "Schedule Excel",
      scheduleExportHint: "Export all options",
      admin: "Admin console",
      adminHint: "Manage data and customers",
      install: "Install SITC JIAXIANG Booking",
      installHint: "Add to your home screen",
      installBanner: "Use it full screen like an app",
      installAction: "Install",
      installIOS: "Tap Share in Safari, then choose Add to Home Screen.",
      selectSchedule: "Choose a sailing on the Search screen before opening Booking.",
      offlineReady: "SITC JIAXIANG Booking is ready for offline launch.",
      close: "Close"
    }
  };

  // Keep the two core services explicit in the mobile tab bar. The underlying
  // page views stay shared with desktop, so no separate mobile data path exists.
  I18N.zh.search = "\u8239\u671f\u4e0e\u8fd0\u4ef7";
  I18N.zh.tracking = "\u63d0\u5355\u8ddf\u8e2a";
  I18N.en.search = "Schedules";
  I18N.en.tracking = "B/L Tracking";

  function langKey() {
    return document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function tr(key) {
    return I18N[langKey()][key] || key;
  }

  function icon(name) {
    const icons = {
      search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>',
      map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 6 5-2.5 7 3 5-2.5v14l-5 2.5-7-3-5 2.5Z"></path><path d="M8.5 3.5v14M15.5 6.5v14"></path></svg>',
      tracking: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h10v12H4zM14 9h3l3 3v5h-6z"></path><circle cx="8" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>',
      booking: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path><path d="M16 3v4"></path></svg>',
      account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"></path></svg>',
      more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg>',
      globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"></path></svg>',
      theme: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>',
      excel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h5M8 11h8M8 15h8"></path></svg>',
      admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.5 3.1h5l.5-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"></path></svg>',
      install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 11l4 4 4-4M5 20h14"></path></svg>'
    };
    return icons[name] || "";
  }

  function buildShell() {
    if ($("mobileAppHeader")) return;

    const adminHref = new URL("./admin.html?build=v15", document.baseURI).href;

    const header = document.createElement("header");
    header.id = "mobileAppHeader";
    header.className = "mobile-app-header";
    header.innerHTML = `
      <div class="mobile-header-row">
        <div class="mobile-brand">
          <div class="mobile-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40"><path d="M8 25.5h24l-4.5 6.2H12.5L8 25.5Z"></path><path d="M13 12.5h4.6v11H13zM19.3 8h4.6v15.5h-4.6zM25.6 14.5h4.4v9h-4.4z"></path><path class="stroke" d="M7 23.5h26"></path></svg>
          </div>
          <div class="mobile-brand-copy"><strong>SITC JIAXIANG <i class="mobile-build-badge">V15</i></strong><small id="mobileSubtitle"></small></div>
        </div>
        <div class="mobile-header-actions">
          <button class="mobile-header-button" id="mobileLanguageButton" type="button" aria-label="Language"><span id="mobileLanguageText">EN</span></button>
          <button class="mobile-header-button" id="mobileThemeButton" type="button" aria-label="Theme">${icon("theme")}</button>
          <a class="mobile-header-button mobile-admin-link" id="mobileAdminLink" href="${adminHref}" aria-label="Admin">${icon("admin")}</a>
          <button class="mobile-header-button" id="mobileMoreButton" type="button" aria-label="More">${icon("more")}</button>
        </div>
      </div>
      <nav class="mobile-primary-nav" id="mobilePrimaryNav" aria-label="Primary services">
        <button class="mobile-primary-tab active" type="button" data-mobile-action="search">${icon("search")}<span data-mobile-label="search"></span></button>
        <button class="mobile-primary-tab" type="button" data-mobile-action="tracking">${icon("tracking")}<span data-mobile-label="tracking"></span></button>
      </nav>`;

    const context = document.createElement("button");
    context.id = "mobileMapContext";
    context.className = "mobile-map-context";
    context.type = "button";
    context.innerHTML = `
      <span class="mobile-map-context-copy"><small id="mobileRouteLabel"></small><strong id="mobileRouteText">Kuching → Shanghai</strong></span>
      <span class="mobile-map-context-badge" id="mobileRouteBadge">CVM</span>`;

    const tabbar = document.createElement("nav");
    tabbar.id = "mobileTabbar";
    tabbar.className = "mobile-tabbar";
    tabbar.setAttribute("aria-label", "Mobile navigation");
    tabbar.innerHTML = [
      ["search", "search"],
      ["tracking", "tracking"],
      ["booking", "booking"],
      ["account", "account"]
    ].map(([action, glyph]) => `
      <button class="mobile-tab${action === "search" ? " active" : ""}" type="button" data-mobile-action="${action}">
        ${icon(glyph)}<span data-mobile-label="${action}"></span>${action === "account" ? '<i class="mobile-tab-badge" id="mobileAccountBadge">1</i>' : ""}
      </button>`).join("");

    const more = document.createElement("div");
    more.id = "mobileMoreBackdrop";
    more.className = "mobile-more-backdrop";
    more.innerHTML = `
      <section class="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle">
        <div class="mobile-more-head"><strong id="mobileMoreTitle"></strong><button class="mobile-sheet-close" id="mobileMoreClose" type="button" aria-label="Close">×</button></div>
        <div class="mobile-more-grid">
          <button class="mobile-more-action" type="button" data-action="language">${icon("globe")}<strong data-more-title="language"></strong><small data-more-hint="language"></small></button>
          <button class="mobile-more-action" type="button" data-action="theme">${icon("theme")}<strong data-more-title="theme"></strong><small data-more-hint="theme"></small></button>
          <button class="mobile-more-action" type="button" data-action="rate-export">${icon("excel")}<strong data-more-title="rateExport"></strong><small data-more-hint="rateExport"></small></button>
          <button class="mobile-more-action" type="button" data-action="schedule-export">${icon("excel")}<strong data-more-title="scheduleExport"></strong><small data-more-hint="scheduleExport"></small></button>
          <button class="mobile-more-action" type="button" data-action="admin">${icon("admin")}<strong data-more-title="admin"></strong><small data-more-hint="admin"></small></button>
          <button class="mobile-more-action" type="button" data-action="install">${icon("install")}<strong data-more-title="install"></strong><small data-more-hint="install"></small></button>
        </div>
      </section>`;

    const install = document.createElement("div");
    install.id = "mobileInstallBanner";
    install.className = "mobile-install-banner";
    install.innerHTML = `
      <div class="mobile-install-icon">S</div>
      <div class="mobile-install-copy"><strong>SITC JIAXIANG 订舱</strong><small id="mobileInstallCopy"></small></div>
      <button class="mobile-install-action" id="mobileInstallAction" type="button"></button>
      <button class="mobile-install-dismiss" id="mobileInstallDismiss" type="button" aria-label="Close">×</button>`;

    // Keep the route context in the DOM even though mobile CSS intentionally
    // hides it. The shared update routine also powers the desktop shell and
    // must never abort mobile event binding because this optional UI is absent.
    document.body.append(header, context, tabbar, more, install);
    document.body.dataset.mobileScreen = "search";
  }

  function updateTranslations() {
    if (!$("mobileAppHeader")) return;
    const zh = langKey() === "zh";
    const setText = (id, value) => {
      const element = $(id);
      if (element) element.textContent = value;
    };
    setText("mobileSubtitle", tr("subtitle"));
    setText("mobileRouteLabel", tr("routeLabel"));
    setText("mobileLanguageText", zh ? "EN" : "中");
    setText("mobileMoreTitle", tr("more"));
    setText("mobileInstallCopy", tr("installBanner"));
    setText("mobileInstallAction", tr("installAction"));
    $("mobileInstallDismiss")?.setAttribute("aria-label", tr("close"));
    $("mobileAdminLink")?.setAttribute("aria-label", tr("admin"));
    $("mobileAdminLink")?.setAttribute("title", tr("admin"));

    document.querySelectorAll("[data-mobile-label]").forEach((node) => {
      node.textContent = tr(node.dataset.mobileLabel);
    });
    document.querySelectorAll("[data-more-title]").forEach((node) => {
      node.textContent = tr(node.dataset.moreTitle);
    });
    document.querySelectorAll("[data-more-hint]").forEach((node) => {
      node.textContent = tr(`${node.dataset.moreHint}Hint`);
    });
    updateRouteContext();
  }

  function selectedText(select) {
    if (!select || select.selectedIndex < 0) return "—";
    return select.options[select.selectedIndex].textContent
      .replace(/\s*·\s*[A-Z]{5,6}.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function updateRouteContext() {
    const origin = selectedText($("originSelect")) || "Kuching";
    const destination = selectedText($("destinationSelect")) || "—";
    const title = $("floatTitle")?.textContent?.trim();
    const routeText = $("mobileRouteText");
    if (routeText) {
      routeText.textContent = title && $("floatingCard")?.classList.contains("show")
        ? title
        : `${origin} → ${destination}`;
    }
    const sub = $("floatSub")?.textContent || "";
    const routeBadge = $("mobileRouteBadge");
    if (routeBadge) {
      routeBadge.textContent = /direct|直达/i.test(sub) ? (langKey() === "zh" ? "直达" : "DIRECT") : "CVM";
    }
  }

  function setActiveTab(action) {
    document.querySelectorAll(".mobile-tab, .mobile-primary-tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.mobileAction === action);
      button.setAttribute("aria-current", button.dataset.mobileAction === action ? "page" : "false");
    });
  }

  function switchLegacyView(view) {
    const target = document.querySelector(`.nav-tab[data-view="${view}"]`);
    if (target) target.click();
  }

  function setMobileScreen(screen) {
    lastMobileScreen = screen;
    document.body.dataset.mobileScreen = screen;

    if (screen === "tracking") {
      switchLegacyView("tracking");
      setActiveTab("tracking");
    } else {
      switchLegacyView("schedule");
      setActiveTab(screen === "booking" ? "booking" : "search");
    }
    setTimeout(() => window.dispatchEvent(new Event("resize")), 180);
  }

  function mobileToast(message) {
    let toast = $("v2MobileToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "v2MobileToast";
      Object.assign(toast.style, {
        position: "fixed",
        zIndex: "4200",
        left: "50%",
        bottom: "calc(92px + env(safe-area-inset-bottom))",
        maxWidth: "calc(100% - 36px)",
        padding: "10px 14px",
        borderRadius: "14px",
        color: "#fff",
        background: "rgba(28,28,30,.9)",
        boxShadow: "0 12px 36px rgba(0,0,0,.22)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        fontSize: "11px",
        fontWeight: "750",
        lineHeight: "1.45",
        textAlign: "center",
        transform: "translate(-50%,18px)",
        opacity: "0",
        pointerEvents: "none",
        transition: "opacity .22s ease, transform .25s ease"
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(toast._timer);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%,0)";
    });
    toast._timer = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,18px)";
    }, 2500);
  }

  function openMore() {
    $("mobileMoreBackdrop")?.classList.add("show");
  }

  function closeMore() {
    $("mobileMoreBackdrop")?.classList.remove("show");
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function showInstallBanner() {
    if (!mobileQuery.matches || isStandalone() || sessionStorage.getItem("sitc-install-dismissed")) return;
    $("mobileInstallBanner")?.classList.add("show");
  }

  async function requestInstall() {
    closeMore();
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } finally {
        deferredInstallPrompt = null;
        $("mobileInstallBanner")?.classList.remove("show");
      }
      return;
    }
    if (isIOS()) {
      mobileToast(tr("installIOS"));
    } else {
      mobileToast(tr("installHint"));
    }
  }

  function handleTabAction(action) {
    switch (action) {
      case "search":
        setMobileScreen("search");
        document.querySelector(".workspace-body")?.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "tracking":
        setMobileScreen("tracking");
        break;
      case "booking": {
        // The legacy button is disabled while the tracking view is active.
        // Restore the shared schedule view first, then evaluate the current
        // selection so a valid sailing can be booked from any mobile tab.
        setMobileScreen("search");
        setTimeout(() => {
          const bookingButton = $("bookingButton");
          if (bookingButton && !bookingButton.disabled) {
            setMobileScreen("booking");
            bookingButton.click();
          } else {
            document.querySelector(".section-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
            mobileToast(tr("selectSchedule"));
          }
        }, 60);
        break;
      }
      case "account":
        $("customerAccountButton")?.click();
        setActiveTab("account");
        break;
      default:
        break;
    }
  }

  function handleMoreAction(action) {
    switch (action) {
      case "language":
        toggleMobileLanguage();
        closeMore();
        break;
      case "theme":
        $("themeButton")?.click();
        closeMore();
        break;
      case "rate-export":
        $("exportAgreementExcelButton")?.click();
        closeMore();
        break;
      case "schedule-export":
        $("exportScheduleExcelButton")?.click();
        closeMore();
        break;
      case "admin":
        location.href = new URL("./admin.html?build=v15", document.baseURI).href;
        break;
      case "install":
        requestInstall();
        break;
      default:
        break;
    }
  }

  function toggleMobileLanguage() {
    const before = document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh" : "en";
    const next = before === "zh" ? "en" : "zh";
    const legacyButton = $("languageButton");

    // Use the desktop handler first so both layouts continue sharing the same
    // translation state and business logic.
    legacyButton?.click();
    setTimeout(() => {
      const after = document.documentElement.lang.toLowerCase().startsWith("zh") ? "zh" : "en";
      if (after !== before) {
        updateTranslations();
        return;
      }

      // Some mobile browsers can expose the external shell before the long
      // inline app has completed event binding. Persisting the same state and
      // reloading once makes the switch reliable without duplicating datasets.
      localStorage.setItem("sitc-lang", next);
      const url = new URL(location.href);
      url.searchParams.set("lang", next);
      url.searchParams.set("build", "v15");
      location.replace(url.href);
    }, 80);
  }

  function bindEvents() {
    $("mobileLanguageButton")?.addEventListener("click", toggleMobileLanguage);
    $("mobileThemeButton")?.addEventListener("click", () => {
      $("themeButton")?.click();
    });
    $("mobileMoreButton")?.addEventListener("click", openMore);
    $("mobileMoreClose")?.addEventListener("click", closeMore);
    $("mobileMoreBackdrop")?.addEventListener("click", (event) => {
      if (event.target === $("mobileMoreBackdrop")) closeMore();
    });
    $("mobileTabbar")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mobile-action]");
      if (button) handleTabAction(button.dataset.mobileAction);
    });
    $("mobilePrimaryNav")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mobile-action]");
      if (button) handleTabAction(button.dataset.mobileAction);
    });
    $("mobileMoreBackdrop")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (button) handleMoreAction(button.dataset.action);
    });
    $("mobileInstallAction")?.addEventListener("click", requestInstall);
    $("mobileInstallDismiss")?.addEventListener("click", () => {
      $("mobileInstallBanner")?.classList.remove("show");
      sessionStorage.setItem("sitc-install-dismissed", "1");
    });

    $("originSelect")?.addEventListener("change", updateRouteContext);
    $("destinationSelect")?.addEventListener("change", updateRouteContext);
    $("departureDate")?.addEventListener("change", () => {
      if (!mobileQuery.matches) return;
      $("scheduleForm")?.requestSubmit();
    });

    document.querySelectorAll(".nav-tab").forEach((button) => {
      button.addEventListener("click", () => {
        if (!mobileQuery.matches) return;
        const view = button.dataset.view;
        setActiveTab(view === "tracking" ? "tracking" : "search");
      });
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      setTimeout(showInstallBanner, 900);
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      $("mobileInstallBanner")?.classList.remove("show");
    });


    window.addEventListener("hashchange", () => {
      if (!mobileQuery.matches) return;
      setMobileScreen(location.hash.toLowerCase() === "#tracking" ? "tracking" : "search");
    });

    mobileQuery.addEventListener?.("change", (event) => {
      syncMobileOnlyUi();
      if (event.matches) {
        document.body.dataset.mobileScreen = lastMobileScreen;
        updateRouteContext();
      } else {
        delete document.body.dataset.mobileScreen;
        closeMore();
      }
      window.dispatchEvent(new Event("resize"));
    });
  }

  function observeLegacyUI() {
    const htmlObserver = new MutationObserver(updateTranslations);
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    const floatCard = $("floatingCard");
    if (floatCard) {
      const cardObserver = new MutationObserver(updateRouteContext);
      cardObserver.observe(floatCard, { attributes: true, childList: true, subtree: true, characterData: true });
    }

    const accountBackdrop = $("customerAccountBackdrop");
    if (accountBackdrop) {
      const accountObserver = new MutationObserver(() => {
        if (!accountBackdrop.classList.contains("show") && mobileQuery.matches) {
          const legacyActive = document.querySelector(".nav-tab.active")?.dataset.view;
          setActiveTab(legacyActive === "tracking" ? "tracking" : "search");
        }
      });
      accountObserver.observe(accountBackdrop, { attributes: true, attributeFilter: ["class"] });
    }

    const bookingBackdrop = $("bookingBackdrop");
    if (bookingBackdrop) {
      const bookingObserver = new MutationObserver(() => {
        if (!bookingBackdrop.classList.contains("show") && mobileQuery.matches) {
          document.body.dataset.mobileScreen = "search";
          setActiveTab("search");
          setTimeout(() => window.dispatchEvent(new Event("resize")), 160);
        }
      });
      bookingObserver.observe(bookingBackdrop, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function syncMobileOnlyUi() {
    const cvmCard = $("cvmRouteCard");
    if (cvmCard) cvmCard.hidden = mobileQuery.matches;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js?v=15", { updateViaCache: "none" }).catch((error) => {
        console.warn("SITC JIAXIANG Booking service worker registration failed", error);
      });
    });
  }

  function init() {
    buildShell();
    syncMobileOnlyUi();
    updateTranslations();
    updateRouteContext();
    bindEvents();
    observeLegacyUI();
    registerServiceWorker();
    document.documentElement.classList.add("sitc-v2-ready");

    if (mobileQuery.matches) {
      const requestedScreen = location.hash.toLowerCase() === "#tracking" ? "tracking" : "search";
      setMobileScreen(requestedScreen);
      setTimeout(() => window.dispatchEvent(new Event("resize")), 350);
      if (isIOS() && !isStandalone()) setTimeout(showInstallBanner, 4500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
