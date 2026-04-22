/* iFix Academy - Shared Navigation & Footer
   Light theme · Brand blue #3478F6 · New logo
*/
(function () {
  const currentPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';

  const navLinks = [
    { href: '/',         label: 'Home' },
    { href: '/courses',  label: 'Training' },
    { href: '/shop',     label: 'Shop' },
    { href: '/blog',     label: 'Blogs' },
    { href: '/about',    label: 'Our Story' },
    { href: 'https://ifixindia.in/', label: 'Service' },
    { href: '/contact',  label: 'Contact Us' },
  ];

  function isActive(href) {
    if (href === '/blog') {
      return currentPath === '/blog' || currentPath.startsWith('/blog/');
    }
    return currentPath === href;
  }

  function buildNavHTML() {
    const links = navLinks.map(l => `
      <a href="${l.href}" class="nav__link${isActive(l.href) ? ' nav__link--active' : ''}">${l.label}</a>
    `).join('');
    const mobileLinks = navLinks.map(l => `
      <a href="${l.href}" class="mobile-menu__link${isActive(l.href) ? ' mobile-menu__link--active' : ''}">${l.label}</a>
    `).join('');

    return `
      <nav class="navbar" id="navbar">
        <div class="navbar__inner">
          <a href="/" class="navbar__logo">
            <img src="/Assets/iFix Academy logo.png" alt="iFix Academy" class="navbar__logo-img">
          </a>
          <div class="navbar__links">${links}</div>
          <div class="navbar__actions">
            <a href="/contact#contact-form" class="btn btn--enroll">Book Free Demo Class</a>
            <button class="hamburger" id="hamburger" aria-label="Open menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>
      <div class="mobile-menu" id="mobileMenu">
        <button class="mobile-menu__close" id="mobileClose">&#x2715;</button>
        <div class="mobile-menu__links">${mobileLinks}</div>
        <a href="/contact#contact-form" class="btn btn--primary mobile-menu__cta">Book Free Demo</a>
      </div>
      <div class="mobile-overlay" id="mobileOverlay"></div>
    `;
  }

  function buildFooterHTML() {
    return `
      <footer class="footer">
        <div class="footer__inner">
          <div class="footer__brand">
            <a href="/"><img src="/Assets/iFix Academy logo.png" alt="iFix Academy" class="footer__logo-img"></a>
            <p class="footer__tagline">India's most hands-on repair training academy.<br>Get certified. Get hired. Build your future.</p>
            <div class="footer__social">
              <a href="https://www.youtube.com/channel/UCEFbnYCVxll7Q3OPKb1B6jQ" target="_blank" class="footer__social-link" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
              </a>
              <a href="#" class="footer__social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" class="footer__social-link" aria-label="WhatsApp">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>
          </div>
          <div class="footer__col">
            <h4 class="footer__col-title">Quick Links</h4>
            <ul class="footer__list">
              <li><a href="/"         class="footer__link">Home</a></li>
              <li><a href="/courses"  class="footer__link">All Courses</a></li>
              <li><a href="/shop"     class="footer__link">Shop</a></li>
              <li><a href="/blog"     class="footer__link">Blog</a></li>
              <li><a href="/about"    class="footer__link">About Us</a></li>
              <li><a href="/contact"  class="footer__link">Contact Us</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h4 class="footer__col-title">Courses</h4>
            <ul class="footer__list">
              <li><a href="/courses#mobile"  class="footer__link">Mobile Repairing</a></li>
              <li><a href="/courses#laptop"  class="footer__link">Laptop Repairing</a></li>
              <li><a href="/courses#iphone"  class="footer__link">iPhone Repairing</a></li>
              <li><a href="/courses#display" class="footer__link">Display Repairing</a></li>
              <li><a href="/courses#online"  class="footer__link">Online Learning</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h4 class="footer__col-title">Contact</h4>
            <ul class="footer__list">
              <li class="footer__contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.66A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                +91 7676400900
              </li>
              <li class="footer__contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                info@ifixacademy.in
              </li>
              <li class="footer__contact-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Delhi · Patna · Bangalore
              </li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p class="footer__copy">&copy; ${new Date().getFullYear()} iFix Academy. All rights reserved.</p>
          <p class="footer__copy">Precision. Quality. Excellence.</p>
        </div>
      </footer>
    `;
  }

  function inject() {
    const navTarget = document.getElementById('nav-root') || document.getElementById('navbar-container');
    if (navTarget) navTarget.innerHTML = buildNavHTML();
    const footerTarget = document.getElementById('footer-root') || document.getElementById('footer-container');
    if (footerTarget) footerTarget.innerHTML = buildFooterHTML();

    // Scroll behaviour
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
      }, { passive: true });
      if (window.scrollY > 40) navbar.classList.add('scrolled');
    }

    // Mobile menu
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    const closeBtn = document.getElementById('mobileClose');
    const open  = () => { menu?.classList.add('open'); overlay?.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { menu?.classList.remove('open'); overlay?.classList.remove('open'); document.body.style.overflow = ''; };
    hamburger?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();

