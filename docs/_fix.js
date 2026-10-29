/* ============================================================
   原型运行时修正脚本
   小程序里大量用 position:fixed 做悬浮元素（搜索框、回到顶部、
   浮动按钮、底部操作栏）。在小程序里 fixed 是相对屏幕的，但原型
   把它们装进了手机壳，所以要把 fixed 改成 absolute，并且坐标
   相对手机壳重新计算。
   ============================================================ */
(function () {
  'use strict';

  var phone = document.querySelector('.phone');
  var body = document.querySelector('.phone-body');
  if (!phone || !body) return;

  // 手机壳顶部的偏移（屏幕坐标）
  function phoneTop() {
    return phone.getBoundingClientRect().top;
  }

  // 1) 所有 position:fixed 的后代改成 absolute，并保留相对视口的位置含义
  //    例外：表单页的固定头（步骤条）承载主要信息，改成 static 让它参与文档流，
  //    否则会吸附在手机壳顶部遮住内容。
  var FLOW_WHITELIST = [
    'fixed-header-wrapper',
    'steps-header',
    'form-header',
    'header-wrapper'
  ];

  function normalizeFixed() {
    var all = body.querySelectorAll('*');
    var pTop = phoneTop();
    var pLeft = phone.getBoundingClientRect().left;

    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;

      var inFlow = false;
      for (var w = 0; w < FLOW_WHITELIST.length; w++) {
        if (el.classList && el.classList.contains(FLOW_WHITELIST[w])) {
          inFlow = true;
          break;
        }
      }

      if (inFlow) {
        // 让它回到文档流，正常排版
        el.style.position = 'static';
        el.style.top = 'auto';
        el.style.left = 'auto';
        el.style.right = 'auto';
        continue;
      }

      // 记录它在视口中的位置，转成相对手机壳的位置
      var r = el.getBoundingClientRect();
      var style = el.style;

      // 只处理有意义的定位（忽略被隐藏的）
      if (cs.display === 'none' || r.width === 0) {
        style.position = 'absolute';
        continue;
      }

      style.position = 'absolute';
      style.top = (r.top - pTop + body.scrollTop) + 'px';
      if (cs.left !== 'auto') {
        style.left = (r.left - pLeft) + 'px';
        style.right = 'auto';
      }
      if (cs.right !== 'auto' && cs.left === 'auto') {
        style.right = (pLeft + phone.offsetWidth - r.right) + 'px';
        style.left = 'auto';
      }
    }
  }

  // 2) 修掉损坏的图片：换成渐变占位块
  function fixBrokenImages() {
    var imgs = body.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        function placeholder() {
          img.style.background = 'linear-gradient(135deg,#e8eef7,#f3f6fb)';
          img.style.minHeight = '40px';
          img.style.borderRadius = '6px';
          img.removeAttribute('src');
        }
        if (img.complete && img.naturalWidth === 0) {
          placeholder();
        } else {
          img.addEventListener('error', placeholder);
          img.addEventListener('load', function () {
            if (img.naturalWidth === 0) placeholder();
          });
        }
      })(imgs[i]);
    }
  }

  // 3) 让 tabbar 里的 <a> 保持当前页高亮
  function markActiveTab() {
    var cur = location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.tabbar a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === cur) {
        links[i].classList.add('active');
      }
    }
  }

  // 4) 交互增强：卡片点击可跳转（让原型"活"起来）
  function wireClicks() {
    // 分类卡片 → 知识库
    var cats = body.querySelectorAll('.category-item');
    for (var i = 0; i < cats.length; i++) {
      cats[i].style.cursor = 'pointer';
      cats[i].addEventListener('click', function () {
        location.href = 'knowledge.html';
      });
    }
    // 文章卡片 → 文章详情
    var arts = body.querySelectorAll('.article-card, .doc-card');
    for (var j = 0; j < arts.length; j++) {
      arts[j].style.cursor = 'pointer';
      arts[j].addEventListener('click', function (e) {
        var doc = this.classList.contains('doc-card');
        location.href = doc ? 'complaint-detail.html' : 'article.html';
      });
    }
    // 查看全部
    var more = body.querySelectorAll('.section-more');
    for (var k = 0; k < more.length; k++) {
      more[k].style.cursor = 'pointer';
      more[k].addEventListener('click', function () {
        location.href = 'knowledge.html';
      });
    }
  }

  function run() {
    normalizeFixed();
    fixBrokenImages();
    markActiveTab();
    wireClicks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  window.addEventListener('load', function () {
    normalizeFixed();
    fixBrokenImages();
  });
})();
