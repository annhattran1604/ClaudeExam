"use strict";

(function () {
  const courses = Array.isArray(window.EXAM_DATA) ? window.EXAM_DATA : [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const menuBtn = document.getElementById("menuBtn");
  const activeCourseCode = document.getElementById("activeCourseCode");
  const activeCourseName = document.getElementById("activeCourseName");
  const countBadge = document.getElementById("countBadge");
  const themeBtn = document.getElementById("themeBtn");
  const searchInput = document.getElementById("searchInput");
  const quickClearBtn = document.getElementById("quickClearBtn");
  const courseDrawer = document.getElementById("courseDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const statusLine = document.getElementById("statusLine");
  const questionList = document.getElementById("questionList");
  const scrollSentinel = document.getElementById("scrollSentinel");
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  const BATCH_SIZE = 40;
  let activeCourseId = getInitialCourseId();
  let searchAll = false;
  let currentItems = [];
  let renderedCount = 0;
  let activeTokens = [];

  // Theme initialization
  const savedTheme = localStorage.getItem("cca_theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    document.documentElement.setAttribute("data-theme", "light");
  }

  themeBtn.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cca_theme", next);
  });

  function getInitialCourseId() {
    const hashId = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (hashId && courseMap.has(hashId)) return hashId;
    const savedId = localStorage.getItem("cca_course");
    if (savedId && courseMap.has(savedId)) return savedId;
    return courses[0] ? courses[0].id : "";
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  const sanitizedCache = new Map();
  function sanitizeHtml(html) {
    if (sanitizedCache.has(html)) return sanitizedCache.get(html);
    const tpl = document.createElement("template");
    tpl.innerHTML = html || "";
    tpl.content
      .querySelectorAll("script,style,iframe,object,embed,link,meta,form,input,button,textarea,select")
      .forEach((el) => el.remove());

    tpl.content.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (
          name.startsWith("on") ||
          name === "style" ||
          ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value))
        ) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === "A") {
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
      if (el.tagName === "IMG") {
        el.loading = "lazy";
        el.referrerPolicy = "no-referrer";
      }
    });

    const result = tpl.innerHTML;
    sanitizedCache.set(html, result);
    return result;
  }

  function highlightHtml(html, tokens) {
    const clean = sanitizeHtml(html);
    if (!tokens.length) return clean;

    const tpl = document.createElement("template");
    tpl.innerHTML = clean;

    const pattern = new RegExp(
      "(" + tokens.map((t) => escapeRegExp(t)).join("|") + ")",
      "gi"
    );

    const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && pattern.test(node.nodeValue)) {
        textNodes.push(node);
      }
      pattern.lastIndex = 0;
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
        }
        const mark = document.createElement("mark");
        mark.textContent = match[0];
        frag.appendChild(mark);
        lastIdx = match.index + match[0].length;
        if (match[0].length === 0) break;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }

    return tpl.innerHTML;
  }

  // Course drawer toggle
  function openDrawer() {
    courseDrawer.hidden = false;
    drawerBackdrop.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    courseDrawer.hidden = true;
    drawerBackdrop.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
  }

  menuBtn.addEventListener("click", () => {
    if (courseDrawer.hidden) openDrawer();
    else closeDrawer();
  });

  drawerBackdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !courseDrawer.hidden) {
      closeDrawer();
      menuBtn.focus();
    }
  });

  function renderDrawer() {
    courseDrawer.innerHTML = courses
      .map(
        (c) => `
        <button type="button" class="course-tab ${c.id === activeCourseId ? "active" : ""}" data-course="${escapeHtml(c.id)}">
          <div class="course-tab-info">
            <div class="course-tab-code">${escapeHtml(c.code)}</div>
            <div class="course-tab-name">${escapeHtml(c.name)}</div>
          </div>
          <span class="course-tab-count">${c.questions.length} câu</span>
        </button>
      `
      )
      .join("");
  }

  courseDrawer.addEventListener("click", (e) => {
    const btn = e.target.closest(".course-tab");
    if (!btn) return;
    const id = btn.dataset.course;
    if (courseMap.has(id)) {
      selectCourse(id);
      closeDrawer();
    }
  });

  function selectCourse(id) {
    activeCourseId = id;
    localStorage.setItem("cca_course", id);
    if (location.hash !== "#" + id) {
      history.replaceState(null, "", "#" + encodeURIComponent(id));
    }
    updateHeader();
    renderDrawer();
    applyFilterAndRender(true);
  }

  function updateHeader() {
    const course = courseMap.get(activeCourseId);
    if (!course) {
      activeCourseCode.textContent = "—";
      activeCourseName.textContent = "Không có dữ liệu";
      return;
    }
    activeCourseCode.textContent = course.code;
    activeCourseName.textContent = course.name;
  }

  // Filter & Search
  function getFilteredItems() {
    const raw = searchInput.value.trim();
    const query = raw.toLowerCase();
    const targetCourses = searchAll ? courses : [courseMap.get(activeCourseId)].filter(Boolean);

    if (!query) {
      activeTokens = [];
      const list = [];
      for (const c of targetCourses) {
        for (const q of c.questions) {
          list.push({ course: c, q });
        }
      }
      return list;
    }

    // Check question number match (e.g. "12" or "câu 12")
    const numMatch = query.match(/^(?:câu\s*)?(\d+)$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      activeTokens = [];
      const list = [];
      for (const c of targetCourses) {
        for (const q of c.questions) {
          if (q.n === num) list.push({ course: c, q });
        }
      }
      return list;
    }

    // Exact phrase match in question text
    let list = [];
    for (const c of targetCourses) {
      for (const q of c.questions) {
        if ((q.t || "").toLowerCase().includes(query)) {
          list.push({ course: c, q });
        }
      }
    }

    if (list.length > 0) {
      activeTokens = [raw];
      return list;
    }

    // Fallback: all space-separated keywords present in question text
    const words = raw.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 1) {
      const lowerWords = words.map((w) => w.toLowerCase());
      for (const c of targetCourses) {
        for (const q of c.questions) {
          const text = (q.t || "").toLowerCase();
          if (lowerWords.every((w) => text.includes(w))) {
            list.push({ course: c, q });
          }
        }
      }
      if (list.length > 0) {
        activeTokens = words;
        return list;
      }
    }

    activeTokens = [raw];
    return [];
  }

  function createCardHtml({ course, q }) {
    const isMulti = q.a.length > 1;
    const showCourseTag = searchAll;
    const answersHtml = q.a
      .map(
        (ansHtml) =>
          `<div class="answer-item-wrap"><div class="answer-item">${sanitizeHtml(ansHtml)}</div></div>`
      )
      .join("");

    return `
      <article class="q-card">
        <div class="q-head">
          <span class="q-num">Câu ${q.n}</span>
          ${showCourseTag ? `<span class="q-course-tag">${escapeHtml(course.code)}</span>` : ""}
          ${isMulti ? `<span class="q-multi-tag">${q.a.length} đáp án</span>` : ""}
        </div>
        <div class="q-body">${highlightHtml(q.q, activeTokens)}</div>
        <div class="answer-box">
          <div class="answer-label">✓ Đáp án đúng${isMulti ? ` (${q.a.length})` : ""}</div>
          <div class="answer-items ${isMulti ? "multi" : ""}">${answersHtml}</div>
        </div>
      </article>
    `;
  }

  function renderNextBatch() {
    if (renderedCount >= currentItems.length) return;
    const slice = currentItems.slice(renderedCount, renderedCount + BATCH_SIZE);
    const html = slice.map(createCardHtml).join("");
    questionList.insertAdjacentHTML("beforeend", html);
    renderedCount += slice.length;
  }

  function applyFilterAndRender(scrollTop = false) {
    const raw = searchInput.value.trim();
    quickClearBtn.disabled = searchInput.value.length === 0;

    currentItems = getFilteredItems();
    renderedCount = 0;
    questionList.innerHTML = "";

    const activeCourse = courseMap.get(activeCourseId);
    const totalInScope = searchAll
      ? courses.reduce((sum, c) => sum + c.questions.length, 0)
      : activeCourse
      ? activeCourse.questions.length
      : 0;

    if (raw) {
      countBadge.textContent = `${currentItems.length}/${totalInScope}`;
      statusLine.hidden = false;
      statusLine.textContent = `Tìm thấy ${currentItems.length} câu khớp "${raw}" ${
        searchAll ? "trong tất cả 4 khóa" : `trong ${activeCourse ? activeCourse.code : ""}`
      }`;
    } else {
      countBadge.textContent = `${currentItems.length} câu`;
      statusLine.hidden = true;
    }

    if (currentItems.length === 0) {
      questionList.innerHTML = `
        <div class="empty-state">
          <strong>Không tìm thấy câu hỏi phù hợp</strong>
          <span>Thử từ khóa ngắn hơn hoặc kiểm tra lại chính tả.</span>
        </div>
      `;
    } else {
      renderNextBatch();
    }

    if (scrollTop) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }

  // Autosearch on input
  searchInput.addEventListener("input", () => {
    applyFilterAndRender(true);
  });

  quickClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    applyFilterAndRender(true);
    searchInput.focus();
  });

  questionList.addEventListener("click", (e) => {
    const item = e.target.closest(".answer-items.multi .answer-item");
    if (item && !e.target.closest("a")) {
      item.classList.toggle("expanded");
    }
  });

  // Infinite scroll batching for smooth mobile rendering
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          renderNextBatch();
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(scrollSentinel);
  } else {
    window.addEventListener("scroll", () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        renderNextBatch();
      }
    });
  }

  // Scroll to top button
  window.addEventListener(
    "scroll",
    () => {
      scrollTopBtn.hidden = window.scrollY < 420;
    },
    { passive: true }
  );

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (id && courseMap.has(id) && id !== activeCourseId) {
      selectCourse(id);
    }
  });

  // Initial render
  if (!courses.length) {
    activeCourseCode.textContent = "Lỗi";
    activeCourseName.textContent = "Không tải được data.js";
    questionList.innerHTML = `<div class="empty-state"><strong>Không có dữ liệu câu hỏi</strong><span>Kiểm tra lại file data.js</span></div>`;
  } else {
    updateHeader();
    renderDrawer();
    applyFilterAndRender(false);
  }
})();
