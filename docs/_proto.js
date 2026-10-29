/* ============================================================
   原型运行时修正
   小程序与静态页面的差异集中在这里处理
   ============================================================ */
(function () {
  'use strict';

  var screen = document.getElementById('screenScroll');

  /* ---------- 1. fixed → absolute（相对设备屏幕） ---------- */
  // 这些容器本身是布局骨架，保持文档流
  var FLOW_KEEP = [
    'screen-scroll', 'device-screen', 'device', 'status-bar',
    'device-tabbar', 'page-scope'
  ];

  function normalizeFixed() {
    if (!screen) return;
    var screenRect = screen.getBoundingClientRect();
    var nodes = screen.querySelectorAll('*');

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;

      var keep = false;
      for (var k = 0; k < FLOW_KEEP.length; k++) {
        if (el.classList.contains(FLOW_KEEP[k])) { keep = true; break; }
      }
      if (keep) { el.style.position = 'static'; continue; }

      // 页面内固定头（步骤条等）参与文档流，避免遮住内容
      if (el.classList.contains('fixed-header-wrapper') ||
          el.classList.contains('steps-header')) {
        el.style.position = 'static';
        el.style.top = 'auto';
        continue;
      }

      var r = el.getBoundingClientRect();
      if (cs.display === 'none' || r.width === 0) {
        el.style.position = 'absolute';
        continue;
      }

      // 相对屏幕区域重新定位
      el.style.position = 'absolute';
      el.style.top = (r.top - screenRect.top + screen.scrollTop) + 'px';
      el.style.left = (r.left - screenRect.left) + 'px';
      el.style.right = 'auto';
    }
  }

  /* ---------- 2. 破图处理（云存储图片已不可用） ---------- */
  function fixImages() {
    if (!screen) return;
    var imgs = screen.querySelectorAll('img');

    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        var applied = false;
        function fallback() {
          if (applied) return;
          applied = true;
          img.style.background =
            'linear-gradient(135deg,#dbe5f1,#eef3f9)';
          img.style.color = 'transparent';
          img.removeAttribute('src');
        }
        if (!img.getAttribute('src')) { fallback(); return; }
        if (img.complete && img.naturalWidth === 0) { fallback(); return; }
        img.addEventListener('error', fallback);
      })(imgs[i]);
    }
  }

  /* ---------- 3. TabBar 选中态 ---------- */
  function markTab() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    var items = document.querySelectorAll('.tab-bar-item');
    for (var i = 0; i < items.length; i++) {
      var p = items[i].getAttribute('data-path') || '';
      var pageName = p.split('/').slice(-2, -1)[0];
      items[i].classList.toggle('active', pageName === page);
      var imgs = items[i].querySelectorAll('img');
      for (var j = 0; j < imgs.length; j++) {
        imgs[j].style.display = (pageName === page)
          ? (imgs[j].classList.contains('icon-active') ? '' : 'none')
          : (imgs[j].classList.contains('icon-normal') ? '' : 'none');
      }
    }
  }

  /* ---------- 4. 让原型可点：补上跳转 ---------- */
  function wireNavigation() {
    if (!screen) return;

    // 文章卡片 → 文章详情
    var cards = screen.querySelectorAll('.article-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.cursor = 'pointer';
      cards[i].addEventListener('click', function () {
        location.href = 'article.html';
      });
    }

    // 分类卡片 → 知识库
    var cats = screen.querySelectorAll('.category-item');
    for (var j = 0; j < cats.length; j++) {
      cats[j].style.cursor = 'pointer';
      cats[j].addEventListener('click', function () {
        location.href = 'knowledge.html';
      });
    }

    // 文书卡片 → 对应生成页
    var map = {
      'card-civil': 'complaint-form.html',
      'card-complaint': 'report-form.html',
      'card-negotiation': 'negotiation-form.html'
    };
    var cardMap = screen.querySelectorAll('.doc-card, .entry-card, .document-card');
    for (var m = 0; m < cardMap.length; m++) {
      (function (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function () {
          var cls = el.className || '';
          for (var key in map) {
            if (cls.indexOf(key) > -1) { location.href = map[key]; return; }
          }
          if (cls.indexOf('doc-card') > -1) location.href = 'complaint-detail.html';
        });
      })(cardMap[m]);
    }

    // 「查看全部」→ 知识库
    var more = screen.querySelectorAll('.section-more');
    for (var n = 0; n < more.length; n++) {
      more[n].style.cursor = 'pointer';
      more[n].addEventListener('click', function () {
        location.href = 'knowledge.html';
      });
    }

    // 首页搜索框 → 搜索页
    var sb = screen.querySelector('.search-box');
    if (sb) {
      sb.style.cursor = 'pointer';
      sb.addEventListener('click', function () {
        location.href = 'search.html';
      });
    }
  }

  /* ---------- 5. 滚动时隐藏/显示阴影等细节 ---------- */
  function misc() {
    // textarea 在原型里可读不可编辑，避免误改
    var tas = document.querySelectorAll('textarea');
    for (var i = 0; i < tas.length; i++) {
      tas[i].setAttribute('readonly', 'readonly');
    }
  }

  function run() {
    normalizeFixed();
    fixImages();
    markTab();
    wireNavigation();
    misc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  window.addEventListener('load', function () {
    normalizeFixed();
    fixImages();
  });
})();
