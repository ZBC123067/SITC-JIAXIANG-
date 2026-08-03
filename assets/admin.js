(() => {
  const $ = (id) => document.getElementById(id);
  const config = window.SITC_CLOUD_CONFIG || {};
  const configured = Boolean(
    window.supabase && config.supabaseUrl && config.supabasePublishableKey &&
    !String(config.supabaseUrl).includes("YOUR_PROJECT") &&
    !String(config.supabasePublishableKey).includes("YOUR_PUBLISHABLE")
  );
  /* The current handoff is explicitly a test console: it opens directly and
     stores changes on this device. Add ?mode=cloud only when cloud auth is
     deliberately being tested. */
  const testMode = new URLSearchParams(location.search).get("mode") !== "cloud";
  const TEST_DATASET_KEY = "sitc-jiaxiang-test-dataset-v12";
  const TEST_AGREEMENT_KEY = "sitc-jiaxiang-test-agreements-v12";
  const TEST_SETTINGS_KEY = "sitc-jiaxiang-test-settings-v12";

  let client = null;
  let user = null;
  let published = null;
  let draft = null;
  let agreements = [];
  let history = [];
  let bookings = [];
  let settings = {};
  let selectedBookingId = null;
  let toastTimer;

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function msg(id, text, type = "") {
    const el = $(id);
    el.textContent = text;
    el.className = `message ${type}`.trim();
  }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
  }
  function deep(value) { return JSON.parse(JSON.stringify(value)); }
  function destinationKeys(data = draft) { return (data?.destination_groups || []).flatMap((g) => g.ports); }
  function groupFor(destination) { return (draft?.destination_groups || []).find((g) => g.ports.includes(destination)); }
  function portName(key) { return draft?.ports?.[key]?.zh || key; }
  function settingValue(key, fallback = {}) { return settings[key]?.value ?? fallback; }
  function formatDate(value) { return value ? new Date(value).toLocaleString() : "—"; }
  function setupClient() {
    if (testMode) return null;
    if (!configured) {
      $("setupBanner").classList.remove("hidden");
      return null;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    return client;
  }
  async function verifyAdmin() {
    const { data, error } = await client.rpc("is_admin");
    if (error || !data) throw new Error("该账号没有管理员权限");
  }
  async function boot() {
    if (testMode) {
      await enterTestAdmin();
      return;
    }
    if (!setupClient()) return;
    const { data } = await client.auth.getSession();
    if (data.session) {
      user = data.session.user;
      await enterAdmin();
    }
    client.auth.onAuthStateChange(async (_, session) => {
      if (session && !user) {
        user = session.user;
        await enterAdmin();
      }
      if (!session) {
        user = null;
        showLogin();
      }
    });
  }
  function showLogin() {
    $("loginView").classList.remove("hidden");
    $("adminView").classList.add("hidden");
  }
  async function enterAdmin() {
    try {
      await verifyAdmin();
      $("loginView").classList.add("hidden");
      $("adminView").classList.remove("hidden");
      await loadAll();
    } catch (error) {
      await client.auth.signOut();
      showLogin();
      msg("loginMessage", error.message, "error");
    }
  }

  function readTestValue(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch { return fallback; }
  }
  function defaultTestAgreement() {
    return {
      id: "test-demo-agreement", code: "MYJXTGL001", customer_name: "SITC JIAXIANG Demo",
      customer: "SITC JIAXIANG Demo", active: true, valid_from: null, valid_to: null,
      rates: deep(draft?.base_rates || {}), draft_rates: deep(draft?.base_rates || {}), published_rates: deep(draft?.base_rates || {})
    };
  }
  function persistTestWorkspace() {
    localStorage.setItem(TEST_DATASET_KEY, JSON.stringify(draft));
    localStorage.setItem(TEST_AGREEMENT_KEY, JSON.stringify(agreements.map((item) => ({
      ...item, customer: item.customer || item.customer_name, customer_name: item.customer_name || item.customer
    }))));
    localStorage.setItem(TEST_SETTINGS_KEY, JSON.stringify(settings));
  }
  async function enterTestAdmin() {
    user = { id: "test-admin", email: "test@sitc-jiaxiang.local" };
    try {
      draft = readTestValue(TEST_DATASET_KEY, null);
      if (!draft) {
        const response = await fetch("./data/fallback-public.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load test dataset");
        draft = await response.json();
      }
      draft.base_rates = draft.base_rates || {};
      draft.base_rate_periods = Array.isArray(draft.base_rate_periods) ? draft.base_rate_periods : [];
      draft.schedules = draft.schedules || {};
      const storedAgreements = readTestValue(TEST_AGREEMENT_KEY, []);
      agreements = (storedAgreements.length ? storedAgreements : [defaultTestAgreement()]).map((item) => ({
        ...item, customer_name: item.customer_name || item.customer || "Test customer", customer: item.customer || item.customer_name || "Test customer",
        draft_rates: item.draft_rates || item.rates || {}, published_rates: item.published_rates || item.rates || {}, rates: item.rates || item.draft_rates || {}
      }));
      history = readTestValue("sitc-jiaxiang-test-history-v12", []);
      bookings = readTestValue("sitc-jiaxiang-test-bookings-v12", []);
      settings = readTestValue(TEST_SETTINGS_KEY, {});
      published = { version: "TEST", published_at: null };
      $("setupBanner").classList.add("hidden");
      $("loginView").classList.add("hidden");
      $("adminView").classList.remove("hidden");
      renderAll();
      const eyebrow = document.querySelector(".eyebrow");
      if (eyebrow) eyebrow.textContent = "SITC JIAXIANG · TEST CONSOLE";
      $("workspaceStatus").textContent = "测试版已直接进入维护界面；数据保存在本机浏览器。";
      $("logoutButton").hidden = true;
      document.querySelectorAll("nav button").forEach((button) => button.classList.toggle("active", button.dataset.tab === "settings"));
      document.querySelectorAll(".tab").forEach((section) => section.classList.toggle("active", section.id === "tab-settings"));
      const rateTab = document.querySelector('[data-tab="rates"]');
      if (rateTab) rateTab.textContent = "市场价";
      const rateHeading = document.querySelector("#tab-rates h2");
      const rateHint = document.querySelector("#tab-rates .panel-head p");
      if (rateHeading) rateHeading.textContent = "市场价";
      if (rateHint) rateHint.textContent = "不输入协议号时显示的市场价格。";
    } catch (error) {
      $("adminView").classList.remove("hidden");
      toast(error.message);
    }
  }

  async function loadAll() {
    if (testMode) { await enterTestAdmin(); return; }
    const [snapshotResult, agreementResult, historyResult, bookingResult, settingsResult] = await Promise.all([
      client.from("dataset_snapshots").select("*").order("created_at", { ascending: false }).limit(20),
      client.from("customer_agreements").select("*").order("customer_name"),
      client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      client.from("booking_requests").select("*,booking_containers(*)").order("submitted_at", { ascending: false }).limit(500),
      client.from("system_settings").select("*")
    ]);
    const criticalError = snapshotResult.error || agreementResult.error;
    if (criticalError) throw criticalError;
    published = (snapshotResult.data || []).find((item) => item.status === "published") || null;
    const existingDraft = (snapshotResult.data || []).find((item) => item.status === "draft") || null;
    draft = deep(existingDraft?.data || published?.data || {});
    agreements = agreementResult.data || [];
    history = historyResult.data || [];
    bookings = bookingResult.error ? [] : (bookingResult.data || []);
    settings = Object.fromEntries((settingsResult.data || []).map((item) => [item.key, item]));
    renderAll();
  }

  function renderAll() {
    const scheduleList = Object.values(draft?.schedules || {}).flat();
    const newBookings = bookings.filter((item) => item.status === "new").length;
    $("stats").innerHTML = [
      ["已发布版本", published?.version || "—"],
      ["目的港", destinationKeys().length],
      ["船期方案", scheduleList.length],
      ["客户协议", agreements.length],
      ["新订舱", newBookings]
    ].map(([label, value]) => `<div class="stat"><small>${label}</small><strong>${value}</strong></div>`).join("");
    $("workspaceStatus").textContent = `管理员：${user?.email || ""} · 已发布 ${published?.published_at ? formatDate(published.published_at) : "尚未发布"} · 草稿修改仅在点击发布后对客户生效`;
    renderRates();
    renderRatePeriods();
    renderAgreements();
    renderAgreementPeriods();
    renderSchedules();
    renderBookings();
    renderSettings();
    renderAdvanced();
    renderHistory();
  }

  function renderRates() {
    $("ratesBody").innerHTML = destinationKeys().map((destination) => {
      const rate = draft.base_rates[destination] || {};
      const group = groupFor(destination);
      const port = draft.ports[destination] || {};
      return `<tr data-dest="${destination}">
        <td>${esc(group?.zh || "")}</td>
        <td><b>${esc(port.zh || destination)}</b><br><small>${esc(port.en || "")}</small></td>
        <td>${esc(port.code || "")}</td>
        <td><input data-field="rate20" type="number" value="${rate.rate20 ?? ""}"></td>
        <td><input data-field="rate40" type="number" value="${rate.rate40 ?? ""}"></td>
        <td><input data-field="includes" value="${esc(rate.includes || "")}"></td>
        <td><input data-field="ft" value="${esc(rate.ft || "")}"></td>
      </tr>`;
    }).join("");
  }
  function collectRates() {
    document.querySelectorAll("#ratesBody tr").forEach((row) => {
      const destination = row.dataset.dest;
      const get = (field) => row.querySelector(`[data-field="${field}"]`).value.trim();
      draft.base_rates[destination] = {
        rate20: Number(get("rate20")), rate40: Number(get("rate40")),
        includes: get("includes"), ft: get("ft")
      };
    });
  }

  function renderRatePeriods() {
    let panel = $("ratePeriodsPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ratePeriodsPanel";
      panel.className = "rate-period-panel";
      $("tab-rates").append(panel);
    }
    const periods = Array.isArray(draft.base_rate_periods) ? draft.base_rate_periods : [];
    const options = destinationKeys().map((destination) => `<option value="${esc(destination)}">${esc(portName(destination))}</option>`).join("");
    panel.innerHTML = `<div class="panel-head"><div><h2>\u6309\u5f00\u8239\u65e5\u751f\u6548\u7684\u8fd0\u4ef7</h2><p>\u6309 ETD \u5339\u914d\u3002\u4f8b\uff1a\u65e7\u4ef7\u622a\u6b62 8/31\uff0c\u65b0\u4ef7\u4ece 9/1 \u8d77\uff0c9/1 \u4ee5\u540e\u7684\u8239\u81ea\u52a8\u663e\u793a\u65b0\u4ef7\u3002</p></div><button class="primary small" type="button" data-add-rate-period="1">\u65b0\u589e\u4ef7\u683c\u671f</button></div><div class="table-scroll"><table><thead><tr><th>\u76ee\u7684\u6e2f</th><th>\u751f\u6548\u5f00\u59cb</th><th>\u751f\u6548\u622a\u6b62</th><th>20GP</th><th>40HC</th><th>\u9644\u52a0\u8d39</th><th>FT</th><th></th></tr></thead><tbody id="ratePeriodsBody">${periods.map((period, index) => `<tr data-period-index="${index}"><td><select data-p="destination">${options}</select></td><td><input data-p="valid_from" type="date" value="${esc(period.valid_from || "")}"></td><td><input data-p="valid_to" type="date" value="${esc(period.valid_to || "")}"></td><td><input data-p="rate20" type="number" min="0" value="${period.rate20 ?? ""}"></td><td><input data-p="rate40" type="number" min="0" value="${period.rate40 ?? ""}"></td><td><input data-p="includes" value="${esc(period.includes || "")}"></td><td><input data-p="ft" value="${esc(period.ft || "")}"></td><td><button class="danger small" type="button" data-remove-rate-period="${index}">\u5220\u9664</button></td></tr>`).join("") || `<tr><td colspan="8" class="empty-period-row">\u6682\u65e0\u672a\u6765\u4ef7\u683c\u671f</td></tr>`}</tbody></table></div>`;
    periods.forEach((period, index) => {
      const select = panel.querySelector(`[data-period-index="${index}"] [data-p="destination"]`);
      if (select) select.value = period.destination || destinationKeys()[0] || "";
    });
  }
  function collectRatePeriods() {
    draft.base_rate_periods = [...document.querySelectorAll("#ratePeriodsBody tr[data-period-index]")].map((row) => ({
      destination: row.querySelector('[data-p="destination"]').value,
      valid_from: row.querySelector('[data-p="valid_from"]').value || null,
      valid_to: row.querySelector('[data-p="valid_to"]').value || null,
      rate20: Number(row.querySelector('[data-p="rate20"]').value),
      rate40: Number(row.querySelector('[data-p="rate40"]').value),
      includes: row.querySelector('[data-p="includes"]').value.trim(),
      ft: row.querySelector('[data-p="ft"]').value.trim()
    })).filter((period) => period.destination && period.valid_from);
  }

  function renderAgreements() {
    $("agreementList").innerHTML = agreements.map((agreement, index) => {
      const rates = agreement.draft_rates || {};
      return `<article class="agreement-card" data-index="${index}">
        <div class="agreement-grid">
          <label>客户<input data-a="customer_name" value="${esc(agreement.customer_name)}"></label>
          <label>协议号<input data-a="code" value="${esc(agreement.code)}"></label>
          <label>生效日期<input data-a="valid_from" type="date" value="${agreement.valid_from || ""}"></label>
          <label>失效日期<input data-a="valid_to" type="date" value="${agreement.valid_to || ""}"></label>
          <label>状态<select data-a="active"><option value="true" ${agreement.active ? "selected" : ""}>启用</option><option value="false" ${!agreement.active ? "selected" : ""}>停用</option></select></label>
        </div>
        <div class="matrix"><table><thead><tr><th>国家</th><th>目的港</th><th>20GP</th><th>40HC</th></tr></thead><tbody>
          ${destinationKeys().map((destination) => `<tr data-rate="${destination}"><td>${esc(groupFor(destination)?.zh || "")}</td><td>${esc(portName(destination))}</td><td><input data-r="rate20" type="number" value="${rates[destination]?.rate20 ?? ""}"></td><td><input data-r="rate40" type="number" value="${rates[destination]?.rate40 ?? ""}"></td></tr>`).join("")}
        </tbody></table></div>
        <div class="actions"><button class="secondary" data-save-agreement="${index}">保存协议草稿</button><button class="primary" data-publish-agreement="${index}">发布协议价</button><button class="danger" data-disable-agreement="${index}">停用</button></div>
        <p>最后更新：${formatDate(agreement.updated_at)} · 最后发布：${formatDate(agreement.published_at)}</p>
      </article>`;
    }).join("") || "<p>还没有客户协议。</p>";
  }
  function renderAgreementPeriods() {
    document.querySelectorAll(".agreement-card").forEach((card) => {
      const index = Number(card.dataset.index);
      const rates = agreements[index]?.draft_rates || {};
      const periods = Array.isArray(rates.__periods) ? rates.__periods : [];
      const options = destinationKeys().map((destination) => `<option value="${esc(destination)}">${esc(portName(destination))}</option>`).join("");
      const box = document.createElement("section");
      box.className = "agreement-periods";
      box.innerHTML = `<div class="agreement-period-head"><strong>\u534f\u8bae\u4ef7\u683c\u671f\uff08\u6309\u5f00\u8239 ETD \u751f\u6548\uff09</strong><button class="secondary small" type="button" data-add-agreement-period="${index}">\u65b0\u589e\u4ef7\u683c\u671f</button></div><div class="table-scroll"><table><thead><tr><th>\u76ee\u7684\u6e2f</th><th>\u751f\u6548\u5f00\u59cb</th><th>\u751f\u6548\u622a\u6b62</th><th>20GP</th><th>40HC</th><th></th></tr></thead><tbody>${periods.map((period, periodIndex) => `<tr data-agreement-period="${periodIndex}"><td><select data-ap="destination">${options}</select></td><td><input data-ap="valid_from" type="date" value="${esc(period.valid_from || "")}"></td><td><input data-ap="valid_to" type="date" value="${esc(period.valid_to || "")}"></td><td><input data-ap="rate20" type="number" min="0" value="${period.rate20 ?? ""}"></td><td><input data-ap="rate40" type="number" min="0" value="${period.rate40 ?? ""}"></td><td><button class="danger small" type="button" data-remove-agreement-period="${index}:${periodIndex}">\u5220\u9664</button></td></tr>`).join("") || `<tr><td colspan="6" class="empty-period-row">\u6682\u65e0\u4ef7\u683c\u671f</td></tr>`}</tbody></table></div>`;
      card.querySelector(".actions")?.before(box);
      periods.forEach((period, periodIndex) => {
        const select = box.querySelector(`[data-agreement-period="${periodIndex}"] [data-ap="destination"]`);
        if (select) select.value = period.destination || destinationKeys()[0] || "";
      });
    });
  }
  function agreementFromCard(index) {
    const card = document.querySelector(`.agreement-card[data-index="${index}"]`);
    const base = agreements[index];
    const value = (field) => card.querySelector(`[data-a="${field}"]`).value;
    const rates = {};
    card.querySelectorAll("tr[data-rate]").forEach((row) => {
      rates[row.dataset.rate] = {
        rate20: Number(row.querySelector('[data-r="rate20"]').value),
        rate40: Number(row.querySelector('[data-r="rate40"]').value)
      };
    });
    const periods = [...card.querySelectorAll("tr[data-agreement-period]")].map((row) => ({
      destination: row.querySelector('[data-ap="destination"]').value,
      valid_from: row.querySelector('[data-ap="valid_from"]').value || null,
      valid_to: row.querySelector('[data-ap="valid_to"]').value || null,
      rate20: Number(row.querySelector('[data-ap="rate20"]').value),
      rate40: Number(row.querySelector('[data-ap="rate40"]').value)
    })).filter((period) => period.destination && period.valid_from);
    if (periods.length) rates.__periods = periods;
    else delete rates.__periods;
    return {
      id: base.id || null, code: value("code").trim().toUpperCase(), customer_name: value("customer_name").trim(),
      active: value("active") === "true", valid_from: value("valid_from") || null, valid_to: value("valid_to") || null, rates
    };
  }
  async function saveAgreement(index, publishAgreement = false) {
    try {
      const agreement = agreementFromCard(index);
      if (testMode) {
        agreements[index] = {
          ...agreements[index], ...agreement, id: agreement.id || agreements[index]?.id || `test-agreement-${Date.now()}`,
          customer: agreement.customer_name, customer_name: agreement.customer_name,
          draft_rates: deep(agreement.rates), published_rates: publishAgreement ? deep(agreement.rates) : (agreements[index]?.published_rates || {})
        };
        persistTestWorkspace();
        toast(publishAgreement ? "协议价格已发布到本机测试数据" : "协议草稿已保存");
        renderAll();
        return;
      }
      const { data, error } = await client.rpc("save_agreement_draft", {
        p_id: agreement.id, p_code: agreement.code, p_customer_name: agreement.customer_name,
        p_active: agreement.active, p_valid_from: agreement.valid_from, p_valid_to: agreement.valid_to, p_rates: agreement.rates
      });
      if (error) throw error;
      if (publishAgreement) {
        const { error: publishError } = await client.rpc("publish_agreement", { p_id: data });
        if (publishError) throw publishError;
      }
      toast(publishAgreement ? "协议价已发布" : "协议草稿已保存");
      await loadAll();
    } catch (error) { toast(error.message); }
  }

  function renderSchedules() {
    $("scheduleEditor").innerHTML = destinationKeys().map((destination) => {
      const schedules = draft.schedules[destination] || [];
      return `<section class="schedule-group" data-destination="${destination}"><h3>${esc(portName(destination))}<button class="secondary small" data-add-to="${destination}">＋ 新方案</button></h3>${schedules.map((schedule, index) => scheduleCard(destination, schedule, index)).join("") || "<p>暂无船期。</p>"}</section>`;
    }).join("");
  }
  function scheduleCard(destination, schedule, index) {
    return `<article class="schedule-card-admin" data-dest="${destination}" data-index="${index}">
      <div class="schedule-fields">
        <label>ID<input data-s="id" value="${esc(schedule.id)}"></label><label>ETD<input data-s="etd" value="${esc(schedule.etd)}"></label><label>ETA<input data-s="eta" value="${esc(schedule.eta)}"></label><label>天数<input data-s="days" type="number" value="${schedule.days}"></label><label>中转次数<input data-s="transfers" type="number" value="${schedule.transfers}"></label>
      </div><div class="legs">${(schedule.legs || []).map((leg, legIndex) => legRow(leg, legIndex)).join("")}</div>
      <div class="actions"><button class="secondary" data-add-leg="${index}">＋ 船段</button><button class="danger" data-delete-schedule="${index}">删除方案</button></div>
    </article>`;
  }
  function legRow(leg, index) {
    return `<div class="leg-row" data-leg="${index}"><input data-l="from" placeholder="起点" value="${esc(leg.from)}"><input data-l="to" placeholder="终点" value="${esc(leg.to)}"><input data-l="vessel" placeholder="船名" value="${esc(leg.vessel)}"><input data-l="voyage" placeholder="航次" value="${esc(leg.voyage)}"><input data-l="service" placeholder="航线" value="${esc(leg.service)}"><input data-l="depart" placeholder="离港时间" value="${esc(leg.depart)}"><input data-l="arrive" placeholder="抵港时间" value="${esc(leg.arrive)}"><input data-l="duration" placeholder="航程" value="${esc(leg.duration)}"><input data-l="terminalTo" placeholder="目的码头" value="${esc(leg.terminalTo)}"><button class="danger" data-delete-leg="${index}">×</button></div>`;
  }
  function collectSchedules() {
    const output = {};
    document.querySelectorAll(".schedule-group").forEach((group) => {
      const destination = group.dataset.destination;
      output[destination] = [...group.querySelectorAll(".schedule-card-admin")].map((card) => {
        const get = (field) => card.querySelector(`[data-s="${field}"]`).value.trim();
        const legs = [...card.querySelectorAll(".leg-row")].map((row) => {
          const value = (field) => row.querySelector(`[data-l="${field}"]`).value.trim();
          return { from: value("from"), to: value("to"), vessel: value("vessel"), voyage: value("voyage"), service: value("service"), depart: value("depart"), arrive: value("arrive"), duration: value("duration"), terminalTo: value("terminalTo") };
        });
        return { id: get("id"), origin: draft.origin || "Kuching", destination, days: Number(get("days")), transfers: Number(get("transfers")), etd: get("etd"), eta: get("eta"), legs };
      });
    });
    draft.schedules = output;
  }

  function bookingContainerSummary(booking) {
    return (booking.booking_containers || []).map((item) => `${item.container_type} × ${item.quantity}`).join(" / ") || "—";
  }
  function filteredBookings() {
    const status = $("bookingStatusFilter")?.value || "all";
    return status === "all" ? bookings : bookings.filter((item) => item.status === status);
  }
  function renderBookings() {
    const rows = filteredBookings();
    $("bookingsBody").innerHTML = rows.map((booking) => `<tr>
      <td><b>${esc(booking.temporary_bl_no || "—")}</b></td><td><b>${esc(booking.booking_no)}</b></td><td>${formatDate(booking.submitted_at)}</td>
      <td>${esc(booking.origin_name)} → ${esc(booking.destination_name)}<br><small>${esc(booking.schedule_id)}</small></td>
      <td>${esc(booking.agreement_customer || "公开表价")}<br><small>${esc(booking.agreement_code || "PUBLIC")}</small></td>
      <td>${esc(bookingContainerSummary(booking))}</td><td>${esc(booking.shipper_name)}</td>
      <td>${esc(booking.contact_name)}<br><small>${esc(booking.contact_email)}</small></td>
      <td class="email-${esc(booking.email_status)}">${esc(booking.email_status)}</td>
      <td class="status-${esc(booking.status)}">${esc(booking.status)}</td>
      <td><button class="booking-row-button" data-view-booking="${booking.id}">查看</button></td>
    </tr>`).join("") || '<tr><td colspan="11">没有符合条件的订舱申请。</td></tr>';
    if (selectedBookingId) {
      const selected = bookings.find((item) => item.id === selectedBookingId);
      if (selected) renderBookingDetail(selected);
    }
  }
  function renderBookingDetail(booking) {
    selectedBookingId = booking.id;
    const price = booking.price_snapshot || {};
    const terms = booking.terms_snapshot || {};
    const route = (booking.route_ports || []).map((item) => item.name || item.key).join(" → ");
    const vessels = (booking.vessels || []).map((item) => `${item.vessel || ""} ${item.voyage || ""}`.trim()).join(" → ");
    $("bookingDetail").innerHTML = `<h3>${esc(booking.temporary_bl_no || booking.booking_no)}</h3><div class="detail-meta">申请号：${esc(booking.booking_no)} · 提交：${formatDate(booking.submitted_at)} · 邮件：${esc(booking.email_status)}</div>
      <div class="detail-grid">
        <div class="detail-box"><small>航线</small><b>${esc(route)}</b></div><div class="detail-box"><small>船期</small><b>${esc(booking.schedule_id)}<br>${esc(vessels)}</b></div>
        <div class="detail-box"><small>ETD / ETA</small><b>${esc(booking.etd)}<br>${esc(booking.eta)}</b></div><div class="detail-box"><small>运价</small><b>20GP USD ${price.rate20 ?? "—"}<br>40HC USD ${price.rate40 ?? "—"}</b></div>
        <div class="detail-box"><small>客户 / 协议</small><b>${esc(booking.customer_company_name || booking.agreement_customer || "公开表价")}<br>${esc(booking.agreement_code || "PUBLIC")}</b></div><div class="detail-box"><small>条款</small><b>${esc(terms.includes || "")}<br>FT ${esc(terms.ft || "")}</b></div>
        <div class="detail-box"><small>客户 Reply-To / CC</small><b>${esc(booking.customer_sender_email || booking.contact_email)}<br>${esc((booking.customer_cc_emails || []).join(", ") || "—")}</b></div><div class="detail-box"><small>船司 To / CC</small><b>${esc((booking.admin_to_emails || []).join(", ") || booking.recipient_email || "—")}<br>${esc((booking.admin_cc_emails || []).join(", ") || "—")}</b></div>
      </div>
      <div class="detail-section"><h4>箱型箱量</h4>${(booking.booking_containers || []).map((item) => `<span class="container-chip">${esc(item.container_type)} × ${item.quantity} · USD ${Number(item.line_amount || 0).toLocaleString()}</span>`).join("")}</div>
      <div class="detail-section"><h4>货物资料</h4><p><b>发货人：</b>${esc(booking.shipper_name)}<br><b>品名：</b>${esc(booking.cargo_name)}<br><b>HS：</b>${esc(booking.hs_code)}<br><b>总毛重：</b>${booking.gross_weight} ${esc(booking.weight_unit)}</p></div>
      <div class="detail-section"><h4>联系人</h4><p>${esc(booking.contact_name)} · ${esc(booking.contact_phone)}<br>${esc(booking.contact_email)}</p></div>
      <div class="detail-section"><h4>备注</h4><p>${esc(booking.remarks || "—")}</p></div>
      <div class="booking-status-editor"><label>处理状态<select id="detailBookingStatus"><option value="new" ${booking.status === "new" ? "selected" : ""}>新申请</option><option value="confirmed" ${booking.status === "confirmed" ? "selected" : ""}>已确认</option><option value="rejected" ${booking.status === "rejected" ? "selected" : ""}>已拒绝</option><option value="completed" ${booking.status === "completed" ? "selected" : ""}>已完成</option></select></label><label>处理备注<textarea id="detailBookingNotes">${esc(booking.status_notes || "")}</textarea></label><button class="primary" data-update-booking="${booking.id}">保存处理状态</button></div>`;
  }
  async function updateBookingStatus(id) {
    try {
      const status = $("detailBookingStatus").value;
      const notes = $("detailBookingNotes").value.trim();
      if (testMode) {
        bookings = bookings.map((item) => item.id === id ? { ...item, status, status_notes: notes, updated_at: new Date().toISOString() } : item);
        localStorage.setItem("sitc-jiaxiang-test-bookings-v12", JSON.stringify(bookings));
        toast("订舱状态已更新");
        renderBookings();
        return;
      }
      const { error } = await client.from("booking_requests").update({ status, status_notes: notes, updated_by: user.id, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await client.from("audit_logs").insert({ actor_id: user.id, actor_email: user.email, action: "update_status", entity_type: "booking", entity_id: id, notes: `${status}: ${notes}` });
      toast("订舱状态已更新");
      await loadAll();
    } catch (error) { toast(error.message); }
  }
  function csvCell(value) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
  function exportBookingsCsv() {
    const header = ["Temporary B/L","Booking No","Submitted","Status","Email Status","Origin","Destination","Schedule ID","ETD","ETA","Customer","Customer Code","Agreement","Containers","Shipper","Commodity","HS Code","Gross Weight","Contact","Phone","Contact Email","Customer Reply-To","Customer CC","Carrier To","Carrier CC","Remarks"];
    const lines = filteredBookings().map((booking) => [booking.temporary_bl_no||"",booking.booking_no,booking.submitted_at,booking.status,booking.email_status,booking.origin_name,booking.destination_name,booking.schedule_id,booking.etd,booking.eta,booking.customer_company_name||booking.agreement_customer||"PUBLIC",booking.customer_code||"",booking.agreement_code||"PUBLIC",bookingContainerSummary(booking),booking.shipper_name,booking.cargo_name,booking.hs_code,`${booking.gross_weight} ${booking.weight_unit}`,booking.contact_name,booking.contact_phone,booking.contact_email,booking.customer_sender_email||"",(booking.customer_cc_emails||[]).join(";"),(booking.admin_to_emails||[]).join(";"),(booking.admin_cc_emails||[]).join(";"),booking.remarks||""]);
    const csv = "\ufeff" + [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `SITC_One_Bookings_${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  function parseEmailList(value) {
    return [...new Set(String(value || "").split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
  }
  function validEmailList(items) { return items.length > 0 && items.every((item) => /^\S+@\S+\.\S+$/.test(item)); }
  function renderSettings() {
    const legacy = settingValue("booking_recipient_email", { email: "zhongbenchao@sitc.com" }).email || "zhongbenchao@sitc.com";
    const toEmails = settingValue("booking_to_emails", { emails: [legacy] }).emails || [legacy];
    const ccEmails = settingValue("booking_cc_emails", { emails: [] }).emails || [];
    $("bookingToEmails").value = toEmails.join("\n");
    $("bookingCcEmails").value = ccEmails.join("\n");
    $("bookingEmailEnabled").value = String(settingValue("booking_email_enabled", { enabled: true }).enabled !== false);
  }
  async function saveBookingSettings() {
    try {
      const toEmails = parseEmailList($("bookingToEmails").value);
      const ccEmails = parseEmailList($("bookingCcEmails").value);
      if (!validEmailList(toEmails) || !ccEmails.every((item) => /^\S+@\S+\.\S+$/.test(item))) throw new Error("请检查收件和抄送邮箱格式；主要收件邮箱至少填写一个");
      const enabled = $("bookingEmailEnabled").value === "true";
      const now = new Date().toISOString();
      const rows = [
        { key: "booking_to_emails", value: { emails: toEmails }, description: "Primary carrier recipients for booking email", updated_by: user.id, updated_at: now },
        { key: "booking_cc_emails", value: { emails: ccEmails }, description: "Carrier CC recipients for booking email", updated_by: user.id, updated_at: now },
        { key: "booking_recipient_email", value: { email: toEmails[0] }, description: "Legacy fallback recipient", updated_by: user.id, updated_at: now },
        { key: "booking_email_enabled", value: { enabled }, description: "Enable or disable booking email delivery", updated_by: user.id, updated_at: now }
      ];
      if (testMode) {
        settings = Object.fromEntries(rows.map((item) => [item.key, item]));
        persistTestWorkspace();
        msg("settingsMessage", "测试版设置已保存到本机。", "ok");
        toast("设置已保存");
        return;
      }
      const { error } = await client.from("system_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      await client.from("audit_logs").insert({ actor_id: user.id, actor_email: user.email, action: "update", entity_type: "system_settings", entity_id: "booking_email", notes: `TO ${toEmails.join(", ")} / CC ${ccEmails.join(", ")} / ${enabled ? "enabled" : "disabled"}` });
      msg("settingsMessage", "订舱邮件收件与抄送设置已保存。", "ok");
      toast("设置已保存");
      await loadAll();
    } catch (error) { msg("settingsMessage", error.message, "error"); }
  }

  function renderAdvanced() { $("jsonEditor").value = JSON.stringify(draft, null, 2); }
  function renderHistory() { $("historyBody").innerHTML = history.map((item) => `<tr><td>${formatDate(item.created_at)}</td><td>${esc(item.actor_email || "")}</td><td>${esc(item.action)}</td><td>${esc(item.entity_type)}</td><td>${esc(item.notes || "")}</td></tr>`).join(""); }
  async function saveDraft() {
    try {
      collectRates(); collectRatePeriods(); collectSchedules();
      const notes = $("publishNotes").value.trim();
      if (testMode) {
        persistTestWorkspace();
        history.unshift({ created_at: new Date().toISOString(), actor_email: user.email, action: "save_draft", entity_type: "dataset", notes: notes || "Test draft saved" });
        localStorage.setItem("sitc-jiaxiang-test-history-v12", JSON.stringify(history.slice(0, 100)));
        msg("publishMessage", "测试草稿已保存到本机。", "ok");
        toast("草稿已保存");
        renderHistory();
        return;
      }
      const { error } = await client.rpc("save_dataset_draft", { p_data: draft, p_notes: notes });
      if (error) throw error;
      msg("publishMessage", "草稿已保存，客户前台尚未改变。", "ok"); toast("草稿已保存"); await loadAll();
    } catch (error) { msg("publishMessage", error.message, "error"); }
  }
  async function publish() {
    try {
      collectRates(); collectRatePeriods(); collectSchedules();
      const notes = $("publishNotes").value.trim();
      if (testMode) {
        persistTestWorkspace();
        history.unshift({ created_at: new Date().toISOString(), actor_email: user.email, action: "publish_test", entity_type: "dataset", notes: notes || "Test data published on this device" });
        localStorage.setItem("sitc-jiaxiang-test-history-v12", JSON.stringify(history.slice(0, 100)));
        msg("publishMessage", "测试数据已发布到本机首页；刷新前台即可读取。", "ok");
        toast("测试数据已发布");
        renderHistory();
        return;
      }
      const { error } = await client.rpc("publish_dataset", { p_data: draft, p_notes: notes });
      if (error) throw error;
      msg("publishMessage", "已发布，客户刷新后会读取最新数据。", "ok"); toast("发布成功"); await loadAll();
    } catch (error) { msg("publishMessage", error.message, "error"); }
  }

  document.addEventListener("click", async (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      document.querySelectorAll("nav button").forEach((button) => button.classList.toggle("active", button === tab));
      document.querySelectorAll(".tab").forEach((section) => section.classList.toggle("active", section.id === `tab-${tab.dataset.tab}`));
      return;
    }
    if (event.target.dataset.saveAgreement !== undefined) await saveAgreement(Number(event.target.dataset.saveAgreement), false);
    if (event.target.dataset.publishAgreement !== undefined) await saveAgreement(Number(event.target.dataset.publishAgreement), true);
    if (event.target.dataset.disableAgreement !== undefined) { agreements[Number(event.target.dataset.disableAgreement)].active = false; renderAgreements(); }
    if (event.target.dataset.addRatePeriod !== undefined) {
      collectRates(); collectRatePeriods();
      const destination = destinationKeys()[0] || "";
      const base = draft.base_rates[destination] || {};
      draft.base_rate_periods.push({ destination, valid_from: new Date().toISOString().slice(0, 10), valid_to: null, rate20: base.rate20 || 0, rate40: base.rate40 || 0, includes: base.includes || "", ft: base.ft || "" });
      renderRatePeriods();
      return;
    }
    if (event.target.dataset.removeRatePeriod !== undefined) {
      collectRatePeriods(); draft.base_rate_periods.splice(Number(event.target.dataset.removeRatePeriod), 1); renderRatePeriods(); return;
    }
    if (event.target.dataset.addAgreementPeriod !== undefined) {
      const index = Number(event.target.dataset.addAgreementPeriod);
      const staged = agreementFromCard(index);
      agreements[index].draft_rates = staged.rates;
      const destination = destinationKeys()[0] || "";
      const base = staged.rates[destination] || draft.base_rates[destination] || {};
      agreements[index].draft_rates.__periods = Array.isArray(agreements[index].draft_rates.__periods) ? agreements[index].draft_rates.__periods : [];
      agreements[index].draft_rates.__periods.push({ destination, valid_from: new Date().toISOString().slice(0, 10), valid_to: null, rate20: base.rate20 || 0, rate40: base.rate40 || 0 });
      renderAgreements(); renderAgreementPeriods(); return;
    }
    if (event.target.dataset.removeAgreementPeriod !== undefined) {
      const [agreementIndex, periodIndex] = event.target.dataset.removeAgreementPeriod.split(":").map(Number);
      const staged = agreementFromCard(agreementIndex);
      agreements[agreementIndex].draft_rates = staged.rates;
      agreements[agreementIndex].draft_rates.__periods.splice(periodIndex, 1);
      renderAgreements(); renderAgreementPeriods(); return;
    }
    if (event.target.dataset.addTo) {
      const destination = event.target.dataset.addTo;
      draft.schedules[destination] = draft.schedules[destination] || [];
      draft.schedules[destination].push({ id: `KCH-${destination.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-5)}`, origin: "Kuching", destination, days: 1, transfers: 0, etd: "", eta: "", legs: [] });
      renderSchedules();
    }
    if (event.target.dataset.deleteSchedule !== undefined) {
      const card = event.target.closest(".schedule-card-admin");
      draft.schedules[card.dataset.dest].splice(Number(card.dataset.index), 1); renderSchedules();
    }
    if (event.target.dataset.addLeg !== undefined) {
      collectSchedules();
      const card = event.target.closest(".schedule-card-admin");
      const destination = card.dataset.dest; const index = Number(card.dataset.index);
      draft.schedules[destination][index].legs.push({ from: "Kuching", to: destination, vessel: "", voyage: "", service: "", depart: "", arrive: "", duration: "", terminalTo: draft.ports[destination]?.terminal || "" });
      renderSchedules();
    }
    if (event.target.dataset.deleteLeg !== undefined) {
      const card = event.target.closest(".schedule-card-admin");
      const destination = card.dataset.dest; const index = Number(card.dataset.index); const legIndex = Number(event.target.dataset.deleteLeg);
      collectSchedules(); draft.schedules[destination][index].legs.splice(legIndex, 1); renderSchedules();
    }
    if (event.target.dataset.viewBooking) {
      const booking = bookings.find((item) => item.id === event.target.dataset.viewBooking); if (booking) renderBookingDetail(booking);
    }
    if (event.target.dataset.updateBooking) await updateBookingStatus(event.target.dataset.updateBooking);
  });

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault(); msg("loginMessage", "登录中…");
    const { data, error } = await client.auth.signInWithPassword({ email: $("loginEmail").value.trim(), password: $("loginPassword").value });
    if (error) msg("loginMessage", error.message, "error"); else { user = data.user; await enterAdmin(); }
  });
  $("logoutButton").onclick = () => client.auth.signOut();
  $("openFrontend").onclick = () => { try{ location.href = new URL("./index.html", location.href).href; }catch{ location.href = "./index.html"; } };
  $("saveDraftButton").onclick = saveDraft;
  $("publishButton").onclick = publish;
  $("addAgreementButton").onclick = () => {
    const rates = {}; destinationKeys().forEach((destination) => { rates[destination] = { rate20: draft.base_rates[destination]?.rate20 || 0, rate40: draft.base_rates[destination]?.rate40 || 0 }; });
    agreements.push({ id: null, code: "NEW-CUSTOMER", customer_name: "New Customer", active: true, valid_from: null, valid_to: null, draft_rates: rates, published_rates: {} }); renderAgreements(); renderAgreementPeriods();
  };
  $("addScheduleButton").onclick = () => {
    const destination = destinationKeys()[0]; draft.schedules[destination] = draft.schedules[destination] || [];
    draft.schedules[destination].push({ id: `KCH-NEW-${Date.now().toString().slice(-5)}`, origin: "Kuching", destination, days: 1, transfers: 0, etd: "", eta: "", legs: [] }); renderSchedules();
  };
  $("bookingStatusFilter").onchange = renderBookings;
  $("refreshBookingsButton").onclick = loadAll;
  $("exportBookingsButton").onclick = exportBookingsCsv;
  $("saveBookingSettingsButton").onclick = saveBookingSettings;
  $("formatJsonButton").onclick = () => { try { $("jsonEditor").value = JSON.stringify(JSON.parse($("jsonEditor").value), null, 2); msg("jsonMessage", "JSON 格式正确", "ok"); } catch (error) { msg("jsonMessage", error.message, "error"); } };
  $("applyJsonButton").onclick = () => { try { draft = JSON.parse($("jsonEditor").value); renderAll(); msg("jsonMessage", "已应用到当前草稿，点击“保存草稿”或“发布”才会写入云端。", "ok"); } catch (error) { msg("jsonMessage", error.message, "error"); } };
  $("downloadJsonButton").onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `sitc-dataset-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url);
  };

  boot();
})();
