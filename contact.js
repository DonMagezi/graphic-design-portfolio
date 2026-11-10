/* Contact form modal.
   To send messages straight to your inbox, set a provider below:
   - 'web3forms': { provider: 'web3forms', key: 'YOUR_ACCESS_KEY' }   (free key from web3forms.com)
   - 'formspree': { provider: 'formspree', url: 'https://formspree.io/f/YOUR_FORM_ID' }
   With no provider set, the form falls back to opening the visitor's email app, pre-filled. */
(() => {
    const CONTACT = { provider: '', key: '', url: '', to: 'donmagezi@gmail.com' };

    const modal = document.getElementById('contactModal');
    if (!modal) return;
    const form = document.getElementById('contactForm');
    const status = document.getElementById('contactStatus');
    const formView = document.getElementById('contactFormView');
    const doneView = document.getElementById('contactDoneView');
    const closeBtn = document.getElementById('contactClose');
    const submitBtn = form.querySelector('.contact-submit');
    let lastFocus = null;

    const open = () => {
        lastFocus = document.activeElement;
        formView.hidden = false; doneView.hidden = true; status.textContent = ''; status.className = 'form-status';
        modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => form.elements.name.focus(), 120);
    };
    const close = () => {
        modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        lastFocus && lastFocus.focus && lastFocus.focus();
    };

    document.querySelectorAll('[data-open-contact]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            // close the mobile menu first if it is open
            const nav = document.querySelector('.navbar');
            const links = document.querySelector('.nav-links');
            if (nav && nav.classList.contains('active')) { nav.classList.remove('active'); links && links.classList.remove('active'); }
            open();
        });
    });
    closeBtn.addEventListener('click', close);
    document.getElementById('contactDoneClose').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Tab') {   // keep focus inside the dialog
            const f = [...modal.querySelectorAll('button, input:not(.hp), textarea, a[href]')].filter(el => !el.closest('[hidden]'));
            if (!f.length) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });

    const setError = (msg) => { status.textContent = msg; status.className = 'form-status error'; };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.botcheck) return;                       // honeypot: bots fill this in
        let ok = true;
        ['name', 'email', 'message'].forEach(n => {
            const field = form.elements[n].closest('.field');
            const valid = n === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) : data[n].trim().length > 0;
            field.classList.toggle('invalid', !valid); ok = ok && valid;
        });
        if (!ok) { setError('Please fill in your name, a valid email and a message.'); return; }

        const subject = `Portfolio enquiry from ${data.name.trim()}`;
        if (!CONTACT.provider) {
            const body = `${data.message.trim()}\n\n— ${data.name.trim()} (${data.email.trim()})`;
            window.location.href = `mailto:${CONTACT.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            status.textContent = 'Opening your email app with your message ready to send…'; status.className = 'form-status';
            return;
        }

        submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; status.textContent = ''; status.className = 'form-status';
        try {
            let res;
            if (CONTACT.provider === 'web3forms') {
                res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ access_key: CONTACT.key, subject, name: data.name.trim(), email: data.email.trim(), message: data.message.trim(), botcheck: '' })
                });
            } else {
                res = await fetch(CONTACT.url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ name: data.name.trim(), email: data.email.trim(), message: data.message.trim(), _subject: subject })
                });
            }
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.success === false) throw new Error(json.message || 'Request failed');
            form.reset(); formView.hidden = true; doneView.hidden = false;
        } catch (err) {
            setError(`Sorry, that didn't send. Please email ${CONTACT.to} directly.`);
        } finally {
            submitBtn.disabled = false; submitBtn.textContent = 'Send message';
        }
    });
})();
