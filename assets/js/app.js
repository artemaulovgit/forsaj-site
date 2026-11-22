/* ==========================================================================
   FORSAJ MK — логика страниц: режим работы, лайтбокс, навигация, анимации.
   Никаких зависимостей: всё на ванильном JS.
   ========================================================================== */
(function () {
    'use strict';

    var OPEN_HOUR = 10;
    var CLOSE_HOUR = 22;

    var reduceMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Год в футере ---------- */
    document.querySelectorAll('[data-year]').forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });

    /* ---------- Подсветка активного пункта меню ---------- */
    (function highlightNav() {
        var path = window.location.pathname;
        var page = path.split('/').pop() || 'index.html';
        if (page === '' || page === '/') page = 'index.html';

        document.querySelectorAll('.header-nav__link, .dock__item').forEach(function (link) {
            var href = link.getAttribute('href') || '';
            if (href === page && !link.hasAttribute('aria-current')) {
                link.setAttribute('aria-current', 'page');
            }
        });
    })();

    /* ---------- Режим работы: открыто / закрыто ---------- */
    (function workStatus() {
        var dot = document.getElementById('statusDot');
        var main = document.getElementById('statusMain');
        var sub = document.getElementById('statusSub');
        var schedule = document.getElementById('schedule');
        if (!dot || !main || !sub) return;

        var DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

        function pad(n) {
            return n < 10 ? '0' + n : String(n);
        }

        function plural(n, one, few, many) {
            var mod10 = n % 10;
            var mod100 = n % 100;
            if (mod10 === 1 && mod100 !== 11) return one;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
            return many;
        }

        function human(minutes) {
            var h = Math.floor(minutes / 60);
            var m = minutes % 60;
            if (h === 0) return m + ' ' + plural(m, 'минута', 'минуты', 'минут');
            if (m === 0) return h + ' ' + plural(h, 'час', 'часа', 'часов');
            return h + ' ' + plural(h, 'час', 'часа', 'часов') + ' ' + m + ' ' + plural(m, 'минута', 'минуты', 'минут');
        }

        function update() {
            var now = new Date();
            var day = now.getDay();
            var minutes = now.getHours() * 60 + now.getMinutes();
            var openAt = OPEN_HOUR * 60;
            var closeAt = CLOSE_HOUR * 60;
            var isOpen = minutes >= openAt && minutes < closeAt;

            dot.classList.toggle('closed', !isOpen);

            if (isOpen) {
                main.textContent = 'Сейчас открыто · до ' + CLOSE_HOUR + ':00';
                main.style.color = '';
                sub.textContent = 'Закрываемся через ' + human(closeAt - minutes) + '. Успеете приехать.';
            } else if (minutes < openAt) {
                main.textContent = 'Сейчас закрыто';
                main.style.color = '';
                sub.textContent = 'Откроемся сегодня в ' + OPEN_HOUR + ':00 — через ' + human(openAt - minutes) + '.';
            } else {
                main.textContent = 'Сейчас закрыто';
                sub.textContent = 'Ждём вас завтра с ' + OPEN_HOUR + ':00 до ' + CLOSE_HOUR + ':00.';
            }

            if (schedule) {
                schedule.querySelectorAll('.schedule-row').forEach(function (row) {
                    var rowDay = parseInt(row.getAttribute('data-day'), 10);
                    row.classList.toggle('active-day', rowDay === day);
                });
            }
        }

        update();
        setInterval(update, 60000);

        // запасной вариант для страниц без виджета: только подсветка дня
        if (!schedule) return;
        schedule.querySelectorAll('.schedule-row').forEach(function (row) {
            var d = parseInt(row.getAttribute('data-day'), 10);
            row.setAttribute('aria-label', DAYS[d] + ', 10:00–22:00');
        });
    })();

    /* ---------- Появление блоков при скролле ---------- */
    (function reveal() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            items.forEach(function (el) {
                el.classList.add('is-visible');
            });
            return;
        }

        var io = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        io.unobserve(entry.target);
                    }
                });
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
        );

        items.forEach(function (el) {
            io.observe(el);
        });
    })();

    /* ---------- Лайтбокс для фото ориентиров ---------- */
    (function lightbox() {
        var modal = document.getElementById('lightbox');
        if (!modal) return;

        var img = document.getElementById('lightboxImg');
        var viewport = document.getElementById('lightboxViewport');
        var counter = document.getElementById('lightboxCounter');
        var triggers = Array.prototype.slice.call(
            document.querySelectorAll('[data-lightbox-group]')
        );
        if (!triggers.length) return;

        var index = 0;
        var scale = 1;
        var tx = 0;
        var ty = 0;
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var pinchStart = 0;
        var pinchScale = 1;
        var lastFocused = null;

        function apply() {
            img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
        }

        function reset() {
            scale = 1;
            tx = 0;
            ty = 0;
            apply();
        }

        function clampPan() {
            if (scale <= 1) {
                tx = 0;
                ty = 0;
            }
        }

        function show(i) {
            index = (i + triggers.length) % triggers.length;
            var trigger = triggers[index];
            var source = trigger.querySelector('img');
            img.src = source.currentSrc || source.src;
            img.alt = source.alt || '';
            counter.textContent = index + 1 + ' / ' + triggers.length;
            reset();
        }

        function open(i) {
            lastFocused = document.activeElement;
            show(i);
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.getElementById('lightboxClose').focus();
        }

        function close() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            img.removeAttribute('src');
            if (lastFocused && lastFocused.focus) lastFocused.focus();
        }

        function zoom(delta) {
            scale = Math.min(4, Math.max(0.8, scale + delta));
            if (scale <= 1) {
                tx = 0;
                ty = 0;
            }
            apply();
        }

        triggers.forEach(function (trigger, i) {
            trigger.addEventListener('click', function () {
                open(i);
            });
        });

        document.getElementById('zoomIn').addEventListener('click', function () {
            zoom(0.3);
        });
        document.getElementById('zoomOut').addEventListener('click', function () {
            zoom(-0.3);
        });
        document.getElementById('zoomReset').addEventListener('click', reset);
        document.getElementById('lightboxPrev').addEventListener('click', function () {
            show(index - 1);
        });
        document.getElementById('lightboxNext').addEventListener('click', function () {
            show(index + 1);
        });
        document.getElementById('lightboxClose').addEventListener('click', close);

        modal.addEventListener('click', function (e) {
            if (e.target === modal || e.target === viewport) close();
        });

        document.addEventListener('keydown', function (e) {
            if (!modal.classList.contains('active')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') show(index - 1);
            if (e.key === 'ArrowRight') show(index + 1);
            if (e.key === '+' || e.key === '=') zoom(0.3);
            if (e.key === '-') zoom(-0.3);
            if (e.key === '0') reset();
        });

        // колесо мыши
        viewport.addEventListener(
            'wheel',
            function (e) {
                e.preventDefault();
                zoom(e.deltaY < 0 ? 0.2 : -0.2);
            },
            { passive: false }
        );

        // перетаскивание
        viewport.addEventListener('pointerdown', function (e) {
            if (scale <= 1) return;
            dragging = true;
            startX = e.clientX - tx;
            startY = e.clientY - ty;
            viewport.setPointerCapture(e.pointerId);
        });

        viewport.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            tx = e.clientX - startX;
            ty = e.clientY - startY;
            apply();
        });

        viewport.addEventListener('pointerup', function () {
            dragging = false;
        });

        viewport.addEventListener('pointercancel', function () {
            dragging = false;
        });

        // пинч на тач-устройствах
        viewport.addEventListener(
            'touchstart',
            function (e) {
                if (e.touches.length === 2) {
                    pinchStart = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    pinchScale = scale;
                }
            },
            { passive: true }
        );

        viewport.addEventListener(
            'touchmove',
            function (e) {
                if (e.touches.length !== 2) return;
                e.preventDefault();
                var dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                if (!pinchStart) return;
                scale = Math.min(4, Math.max(0.8, (pinchScale * dist) / pinchStart));
                clampPan();
                apply();
            },
            { passive: false }
        );

        viewport.addEventListener(
            'touchend',
            function (e) {
                if (e.touches.length < 2) pinchStart = 0;
            },
            { passive: true }
        );
    })();
})();
