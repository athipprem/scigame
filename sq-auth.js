/* ============================================================
   Science Quest — shared account + performance tracking
   Included on every page. Needs the Supabase CDN script tag
   loaded first (see <head> of each page).
   ============================================================ */
(function(){
  const SUPABASE_URL = "https://psiyoyilakybmspnewoj.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaXlveWlsYWt5Ym1zcG5ld29qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNjczNTAsImV4cCI6MjEwMjg0MzM1MH0.G1EwlFqn4SAG5xfScTajGqFi7SsSyLrWg8S3Pm5jGjk";

  const REALM_META = {
    cosmic:  { name:"Cosmic Frontier",   color:"#c77dff" },
    citadel: { name:"Puzzle Citadel",    color:"#ff8a65" },
    peaks:   { name:"Force Peaks",       color:"#5fa8ff" },
    wilds:   { name:"Living Wilds",      color:"#43e97b" },
    lab:     { name:"Detective's Lab",   color:"#d99a44" },
    depths:  { name:"Alchemist's Depths",color:"#00e5c9" }
  };
  const REALM_ORDER = ["cosmic","citadel","peaks","wilds","lab","depths"];

  // First trial of each realm — free to play without an account (guest mode)
  const FREE_TRIALS = new Set([
    "Cosmic_Unit07_Trial", "Citadel_Gatehouse_Trial", "Peaks_Unit03_Trial",
    "Wilds_Unit01_Trial", "Detective_Unit36_Trial", "Alchemist_Unit05_Trial"
  ]);

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const EYE_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2.2"/></svg>`;
  const EYE_OFF_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"/><circle cx="8" cy="8" r="2.2"/><line x1="1" y1="1" x2="15" y2="15"/></svg>`;

  function wireEyeToggle(eyeId, inputId){
    const eyeBtn = document.getElementById(eyeId);
    const input = document.getElementById(inputId);
    if (!eyeBtn || !input) return;
    eyeBtn.onclick = () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      eyeBtn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
      eyeBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    };
  }

  const state = { user:null, displayName:null, ready:false };
  const listeners = [];

  function notify(){ listeners.forEach(fn => { try{ fn(state); }catch(e){} }); }

  /* ---------------- styles (self-contained, works on any page) ---------------- */
  const style = document.createElement('style');
  style.textContent = `
  #sq-acct{position:fixed;top:12px;right:12px;z-index:9999;font-family:'Segoe UI',Arial,sans-serif}
  #sq-acct-btn{display:flex;align-items:center;gap:7px;background:#120e2cee;border:1.5px solid #FFD70066;border-radius:22px;padding:6px 14px 6px 6px;cursor:pointer;color:#fff3e6;font-size:.8rem;font-weight:700;box-shadow:0 4px 14px #0007;backdrop-filter:blur(4px)}
  #sq-acct-btn:hover{border-color:#FFD700}
  #sq-acct-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);color:#3a2a00;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.85rem;flex-shrink:0}
  #sq-acct-menu{display:none;position:absolute;top:44px;right:0;background:#120e2cf5;border:1.5px solid #332a5c;border-radius:14px;padding:8px;min-width:180px;box-shadow:0 10px 30px #000a}
  #sq-acct-menu.open{display:block}
  #sq-acct-menu button{display:block;width:100%;text-align:left;background:none;border:none;color:#fff3e6;font-size:.82rem;font-weight:700;padding:9px 10px;border-radius:9px;cursor:pointer}
  #sq-acct-menu button:hover{background:#1c1642}
  #sq-modal-bg{display:none;position:fixed;inset:0;background:#000000cc;z-index:10000;align-items:center;justify-content:center;padding:16px}
  #sq-modal-bg.open{display:flex}
  .sq-modal{background:#120e2c;border:1.5px solid #332a5c;border-radius:18px;padding:24px;max-width:380px;width:100%;color:#fff3e6;font-family:'Segoe UI',Arial,sans-serif;max-height:88vh;overflow-y:auto}
  .sq-modal h2{margin:0 0 4px;font-size:1.2rem;background:linear-gradient(135deg,#FFD700,#FFA500);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sq-modal p.sub{color:#c9b3d9;font-size:.8rem;margin:0 0 16px}
  .sq-field{margin-bottom:12px}
  .sq-field label{display:block;font-size:.75rem;color:#c9b3d9;margin-bottom:4px;font-weight:700}
  .sq-field input{width:100%;box-sizing:border-box;background:#1c1642;border:1.5px solid #332a5c;border-radius:9px;padding:9px 11px;color:#fff3e6;font-size:.9rem}
  .sq-field input:focus{outline:none;border-color:#FFD700}
  .sq-hint{font-size:.7rem;color:#c9b3d9;margin-top:5px;line-height:1.4}
  .sq-pwd-wrap{position:relative}
  .sq-pwd-wrap input{padding-right:38px}
  .sq-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#c9b3d9;cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:6px}
  .sq-eye:hover{color:#FFD700}
  .sq-btn{display:block;width:100%;border:none;border-radius:12px;padding:11px;font-weight:800;font-size:.88rem;cursor:pointer;background:linear-gradient(135deg,#FFD700,#FFA500);color:#3a2a00;margin-top:6px}
  .sq-btn:disabled{opacity:.6;cursor:default}
  .sq-btn-ghost{background:none;border:1.5px solid #332a5c;color:#c9b3d9;margin-top:8px}
  .sq-toggle{text-align:center;font-size:.78rem;color:#c9b3d9;margin-top:14px}
  .sq-toggle a{color:#FFD700;text-decoration:none;cursor:pointer;font-weight:700}
  .sq-status{font-size:.78rem;text-align:center;margin-top:10px;min-height:16px;color:#c9b3d9}
  .sq-status.err{color:#ff8a80}
  .sq-status.ok{color:#43e97b}
  .sq-close{position:absolute;top:14px;right:16px;background:none;border:none;color:#c9b3d9;font-size:1.3rem;cursor:pointer;line-height:1}
  .sq-modal{position:relative}
  .sq-realm-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #332a5c22}
  .sq-realm-row:last-child{border-bottom:none}
  .sq-realm-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0}
  .sq-realm-info{flex:1;min-width:0}
  .sq-realm-name{font-size:.85rem;font-weight:800}
  .sq-realm-stat{font-size:.72rem;color:#c9b3d9}
  .sq-realm-best{font-size:1rem;font-weight:900;color:#FFD700}
  .sq-nudge{font-size:.75rem;color:#FFD700;margin-top:6px}
  .sq-divider{display:flex;align-items:center;gap:10px;margin:16px 0;color:#c9b3d9;font-size:.72rem}
  .sq-divider::before,.sq-divider::after{content:'';flex:1;height:1px;background:#332a5c}
  .sq-btn-google{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;border:1.5px solid #332a5c;border-radius:12px;padding:10px;font-weight:700;font-size:.85rem;cursor:pointer;background:#fff3e6;color:#241533}
  .sq-btn-google:hover{filter:brightness(.96)}
  #sq-guest-banner{text-align:center;font-weight:800;font-size:.8rem;color:#FFD700;background:#FFD70014;border:1px solid #FFD70044;border-radius:12px;padding:9px 14px;margin:16px 0 4px}
  .sq-lock-badge{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#3a2a00,#1a1030);border:1.5px solid #FFD700aa;display:flex;align-items:center;justify-content:center;font-size:1rem;box-shadow:0 3px 10px #0007;z-index:2}
  a.trial-btn.sq-locked{pointer-events:none;filter:grayscale(1);opacity:.4;cursor:not-allowed}
  button.sq-locked-btn{background:#4a4a4a!important;color:#999!important;cursor:not-allowed!important;opacity:.75}
  #sq-trial-lock-note{font-size:.78rem;color:#c9b3d9;text-align:center;margin-top:8px}
  #sq-trial-lock-note a{color:#FFD700;font-weight:700;text-decoration:underline;cursor:pointer}
  .sq-section-title{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#c9b3d9;font-weight:800;margin:20px 0 10px}
  .sq-section-title:first-of-type{margin-top:4px}
  .sq-btn-danger{background:linear-gradient(135deg,#ff6b6b,#c62828);color:#fff}
  .sq-danger-box{border:1.5px solid #ff6b6b44;background:#ff6b6b0d;border-radius:12px;padding:14px;margin-top:10px}
  .sq-danger-box p{font-size:.78rem;color:#e6c9c9;margin:0 0 10px;line-height:1.5}
  `;
  document.head.appendChild(style);

  /* ---------------- account widget ---------------- */
  const acct = document.createElement('div');
  acct.id = 'sq-acct';
  acct.innerHTML = `
    <button id="sq-acct-btn"></button>
    <div id="sq-acct-menu"></div>
  `;
  document.body.appendChild(acct);

  const modalBg = document.createElement('div');
  modalBg.id = 'sq-modal-bg';
  document.body.appendChild(modalBg);

  function closeModal(){ modalBg.classList.remove('open'); modalBg.innerHTML = ''; }
  modalBg.addEventListener('click', e => { if (e.target === modalBg) closeModal(); });

  function initials(name){
    if (!name) return '?';
    return name.trim().slice(0,1).toUpperCase();
  }

  function renderWidget(){
    const btn = document.getElementById('sq-acct-btn');
    const menu = document.getElementById('sq-acct-menu');
    if (state.user){
      const name = state.displayName || state.user.email.split('@')[0];
      btn.innerHTML = `<span id="sq-acct-avatar">${initials(name)}</span><span>${name}</span>`;
      btn.onclick = () => menu.classList.toggle('open');
      menu.innerHTML = `
        <button id="sq-menu-progress">&#128202; My Progress</button>
        <button id="sq-menu-settings">&#9881;&#65039; My Profile</button>
        <button id="sq-menu-signout">&#128682; Sign Out</button>
      `;
      document.getElementById('sq-menu-progress').onclick = () => { menu.classList.remove('open'); location.href = 'My_Progress.html'; };
      document.getElementById('sq-menu-settings').onclick = () => { menu.classList.remove('open'); openProfileSettings(); };
      document.getElementById('sq-menu-signout').onclick = async () => {
        menu.classList.remove('open');
        await sb.auth.signOut();
        location.href = location.pathname.includes('/') ? location.pathname.replace(/[^/]+$/, 'index.html') : 'index.html';
      };
    } else {
      btn.innerHTML = `<span id="sq-acct-avatar">&#128100;</span><span>Sign In</span>`;
      btn.onclick = () => openAuth('signin');
      menu.classList.remove('open');
      menu.innerHTML = '';
    }
  }

  document.addEventListener('click', e => {
    const menu = document.getElementById('sq-acct-menu');
    if (menu && !acct.contains(e.target)) menu.classList.remove('open');
  });

  /* ---------------- auth modal ---------------- */
  function resetRedirectUrl(){
    return window.location.origin + window.location.pathname.replace(/[^/]+$/, 'Reset_Password.html');
  }

  function openAuth(mode){
    mode = mode || 'signin';

    if (mode === 'forgot'){
      modalBg.innerHTML = `
        <div class="sq-modal">
          <button class="sq-close" id="sq-auth-close">&times;</button>
          <h2 id="sq-auth-title">Reset your password</h2>
          <p class="sub">Enter your email and we'll send you a link to set a new password.</p>
          <div class="sq-field">
            <label>Email</label>
            <input type="email" id="sq-email" placeholder="you@example.com">
          </div>
          <button class="sq-btn" id="sq-auth-submit">Send Reset Link</button>
          <div class="sq-status" id="sq-auth-status"></div>
          <div class="sq-toggle" id="sq-auth-toggle">
            Remember your password? <a id="sq-switch">Sign in</a>
          </div>
        </div>
      `;
      modalBg.classList.add('open');
      document.getElementById('sq-auth-close').onclick = closeModal;
      document.getElementById('sq-switch').onclick = () => openAuth('signin');
      document.getElementById('sq-auth-submit').onclick = async () => {
        const email = document.getElementById('sq-email').value.trim();
        const statusEl = document.getElementById('sq-auth-status');
        const btn = document.getElementById('sq-auth-submit');
        statusEl.className = 'sq-status';
        if (!email){ statusEl.textContent = 'Enter your email first.'; statusEl.className = 'sq-status err'; return; }
        btn.disabled = true; statusEl.textContent = 'Sending...';
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectUrl() });
        if (error){
          statusEl.textContent = error.message; statusEl.className = 'sq-status err';
        } else {
          statusEl.textContent = 'Check your email for a reset link!'; statusEl.className = 'sq-status ok';
        }
        btn.disabled = false;
      };
      return;
    }

    modalBg.innerHTML = `
      <div class="sq-modal">
        <button class="sq-close" id="sq-auth-close">&times;</button>
        <h2 id="sq-auth-title">${mode === 'signin' ? 'Welcome back!' : 'Create your account'}</h2>
        <p class="sub">${mode === 'signin' ? 'Sign in to save and track your quiz results.' : 'Sign up to start saving your progress across all 6 realms.'}</p>
        <div class="sq-field">
          <label>Email</label>
          <input type="email" id="sq-email" placeholder="you@example.com">
        </div>
        <div class="sq-field">
          <label>Password</label>
          <div class="sq-pwd-wrap">
            <input type="password" id="sq-password" placeholder="${mode === 'signup' ? 'Create a password' : 'Enter your password'}" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}">
            <button type="button" class="sq-eye" id="sq-eye-password" aria-label="Show password">${EYE_ICON}</button>
          </div>
          ${mode === 'signup' ? `<div class="sq-hint">Must be 8+ characters with uppercase, lowercase, a number, and a symbol (e.g. !@#$%).</div>` : `<div style="text-align:right;margin-top:6px"><a id="sq-forgot" style="color:#FFD700;font-size:.75rem;font-weight:700;text-decoration:none;cursor:pointer">Forgot password?</a></div>`}
        </div>
        <div class="sq-field" id="sq-field-confirm" style="display:${mode==='signup'?'block':'none'}">
          <label>Confirm Password</label>
          <div class="sq-pwd-wrap">
            <input type="password" id="sq-password-confirm" placeholder="Re-enter your password" autocomplete="new-password">
            <button type="button" class="sq-eye" id="sq-eye-confirm" aria-label="Show password">${EYE_ICON}</button>
          </div>
        </div>
        <button class="sq-btn" id="sq-auth-submit">${mode === 'signin' ? 'Sign In' : 'Sign Up'}</button>
        <div class="sq-status" id="sq-auth-status"></div>
        <div class="sq-divider">or</div>
        <button class="sq-btn-google" id="sq-auth-google">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <div class="sq-toggle" id="sq-auth-toggle">
          ${mode === 'signin' ? `New here? <a id="sq-switch">Create an account</a>` : `Already have an account? <a id="sq-switch">Sign in</a>`}
        </div>
      </div>
    `;
    modalBg.classList.add('open');
    document.getElementById('sq-auth-close').onclick = closeModal;
    document.getElementById('sq-switch').onclick = () => openAuth(mode === 'signin' ? 'signup' : 'signin');
    if (mode === 'signin') document.getElementById('sq-forgot').onclick = () => openAuth('forgot');
    wireEyeToggle('sq-eye-password', 'sq-password');
    if (mode === 'signup') wireEyeToggle('sq-eye-confirm', 'sq-password-confirm');
    document.getElementById('sq-auth-google').onclick = async () => {
      const statusEl = document.getElementById('sq-auth-status');
      statusEl.className = 'sq-status';
      statusEl.textContent = 'Redirecting to Google...';
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
      });
      if (error){ statusEl.textContent = error.message; statusEl.className = 'sq-status err'; }
    };

    document.getElementById('sq-auth-submit').onclick = async () => {
      const email = document.getElementById('sq-email').value.trim();
      const password = document.getElementById('sq-password').value;
      const statusEl = document.getElementById('sq-auth-status');
      const btn = document.getElementById('sq-auth-submit');
      statusEl.className = 'sq-status';
      if (!email || !password){ statusEl.textContent = 'Please fill in email and password.'; statusEl.className = 'sq-status err'; return; }
      if (mode === 'signup'){
        const confirm = document.getElementById('sq-password-confirm').value;
        if (password !== confirm){ statusEl.textContent = "Passwords don't match — check both fields."; statusEl.className = 'sq-status err'; return; }
      }
      btn.disabled = true; statusEl.textContent = 'Working...';
      try {
        if (mode === 'signup'){
          const name = email.charAt(0).toUpperCase();
          const { data, error } = await sb.auth.signUp({ email, password, options:{ data:{ display_name:name } } });
          if (error) throw error;
          if (data.session){
            statusEl.textContent = "You're in!"; statusEl.className = 'sq-status ok';
            setTimeout(closeModal, 600);
          } else {
            statusEl.textContent = 'Account created — check your email to confirm, then sign in.';
            statusEl.className = 'sq-status ok';
          }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
          statusEl.textContent = "You're in!"; statusEl.className = 'sq-status ok';
          setTimeout(closeModal, 500);
        }
      } catch(e){
        statusEl.textContent = e.message || 'Something went wrong.';
        statusEl.className = 'sq-status err';
      } finally {
        btn.disabled = false;
      }
    };
  }

  /* ---------------- progress modal ---------------- */
  async function openProgress(){
    modalBg.innerHTML = `
      <div class="sq-modal">
        <button class="sq-close" id="sq-prog-close">&times;</button>
        <h2>My Progress</h2>
        <p class="sub">Best scores across all 6 realms</p>
        <div id="sq-prog-body" class="sq-status">Loading...</div>
      </div>
    `;
    modalBg.classList.add('open');
    document.getElementById('sq-prog-close').onclick = closeModal;

    const { data, error } = await sb
      .from('attempts')
      .select('realm_id, score, total, pct, completed_at')
      .order('completed_at', { ascending:false });

    const body = document.getElementById('sq-prog-body');
    if (error){ body.textContent = 'Could not load progress: ' + error.message; body.className='sq-status err'; return; }
    if (!data || !data.length){
      body.innerHTML = `<div style="text-align:center;padding:10px 0">No trials completed yet — go finish one!</div>`;
      return;
    }
    const byRealm = {};
    data.forEach(a => {
      if (!byRealm[a.realm_id]) byRealm[a.realm_id] = [];
      byRealm[a.realm_id].push(a);
    });
    body.innerHTML = REALM_ORDER.map(rid => {
      const meta = REALM_META[rid];
      const list = byRealm[rid];
      if (!list || !list.length){
        return `<div class="sq-realm-row"><div class="sq-realm-dot" style="background:${meta.color}"></div>
          <div class="sq-realm-info"><div class="sq-realm-name">${meta.name}</div><div class="sq-realm-stat">Not attempted yet</div></div></div>`;
      }
      const best = Math.max(...list.map(a => Number(a.pct)));
      const attempts = list.length;
      const last = list[0];
      return `<div class="sq-realm-row"><div class="sq-realm-dot" style="background:${meta.color}"></div>
        <div class="sq-realm-info"><div class="sq-realm-name">${meta.name}</div><div class="sq-realm-stat">${attempts} attempt${attempts>1?'s':''} &middot; last ${last.score}/${last.total}</div></div>
        <div class="sq-realm-best">${best}%</div></div>`;
    }).join('');
  }

  /* ---------------- my profile modal (name, password, delete account) ---------------- */
  function openProfileSettings(){
    const currentName = state.displayName || (state.user ? state.user.email.split('@')[0] : '');
    const provider = (state.user && state.user.app_metadata && state.user.app_metadata.provider) || 'email';
    const providerLabel = provider === 'google' ? 'Google' : 'Email';
    const verified = !!(state.user && state.user.email_confirmed_at);
    modalBg.innerHTML = `
      <div class="sq-modal">
        <button class="sq-close" id="sq-settings-close">&times;</button>
        <h2>My Profile</h2>
        <p class="sub">Manage your account details.</p>

        <div class="sq-field">
          <label>Signed up with ${providerLabel}</label>
          <div style="background:#1c1642;border:1.5px solid #332a5c;border-radius:9px;padding:9px 11px;font-size:.85rem;word-break:break-all">${state.user ? state.user.email : ''}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${verified
              ? `<span style="font-size:.72rem;font-weight:800;color:#43e97b">&#10003; Verified</span>`
              : `<span style="font-size:.72rem;font-weight:800;color:#ffb648">&#9888; Not verified</span><a id="sq-verify-email" style="font-size:.72rem;font-weight:800;color:#FFD700;cursor:pointer;text-decoration:underline">Send verification email</a>`
            }
          </div>
          ${verified ? '' : `<div class="sq-status" id="sq-verify-status"></div>`}
        </div>
        <div class="sq-field">
          <label>Display Name</label>
          <input type="text" id="sq-settings-name" value="${currentName.replace(/"/g,'&quot;')}" placeholder="What should we call you?" maxlength="30">
        </div>
        <button class="sq-btn" id="sq-settings-save">Save Name</button>
        <div class="sq-status" id="sq-settings-status"></div>

        <div class="sq-section-title">Change Password</div>
        <div class="sq-field">
          <label>Current Password</label>
          <div class="sq-pwd-wrap">
            <input type="password" id="sq-pwd-current" placeholder="Enter your current password" autocomplete="current-password">
            <button type="button" class="sq-eye" id="sq-eye-current" aria-label="Show password">${EYE_ICON}</button>
          </div>
        </div>
        <div class="sq-field">
          <label>New Password</label>
          <div class="sq-pwd-wrap">
            <input type="password" id="sq-pwd-new" placeholder="Create a new password" autocomplete="new-password">
            <button type="button" class="sq-eye" id="sq-eye-new" aria-label="Show password">${EYE_ICON}</button>
          </div>
          <div class="sq-hint">Must be 8+ characters with uppercase, lowercase, a number, and a symbol (e.g. !@#$%).</div>
        </div>
        <div class="sq-field">
          <label>Confirm New Password</label>
          <div class="sq-pwd-wrap">
            <input type="password" id="sq-pwd-new-confirm" placeholder="Re-enter your new password" autocomplete="new-password">
            <button type="button" class="sq-eye" id="sq-eye-new-confirm" aria-label="Show password">${EYE_ICON}</button>
          </div>
        </div>
        <button class="sq-btn" id="sq-pwd-save">Change Password</button>
        <div class="sq-status" id="sq-pwd-status"></div>

        <div class="sq-section-title">Danger Zone</div>
        <button class="sq-btn sq-btn-danger" id="sq-del-open">Delete My Account</button>
        <div class="sq-danger-box" id="sq-del-box" style="display:none">
          <label style="display:flex;align-items:flex-start;gap:8px;font-size:.78rem;color:#e6c9c9;line-height:1.5;cursor:pointer;margin-bottom:12px">
            <input type="checkbox" id="sq-del-ack" style="margin-top:2px;flex-shrink:0">
            <span>I understand that this will permanently delete my account, display name, and all saved trial results. This action cannot be undone. Enter your password to confirm.</span>
          </label>
          <div class="sq-field">
            <label>Password</label>
            <div class="sq-pwd-wrap">
              <input type="password" id="sq-del-pwd" placeholder="Enter your password" autocomplete="current-password">
              <button type="button" class="sq-eye" id="sq-eye-del" aria-label="Show password">${EYE_ICON}</button>
            </div>
          </div>
          <button class="sq-btn sq-btn-danger" id="sq-del-confirm">Permanently Delete My Account</button>
          <div class="sq-status" id="sq-del-status"></div>
        </div>
      </div>
    `;
    modalBg.classList.add('open');
    document.getElementById('sq-settings-close').onclick = closeModal;
    if (!verified){
      document.getElementById('sq-verify-email').onclick = async () => {
        const link = document.getElementById('sq-verify-email');
        const statusEl = document.getElementById('sq-verify-status');
        statusEl.className = 'sq-status';
        link.style.pointerEvents = 'none'; link.style.opacity = '.55';
        statusEl.textContent = 'Sending...';
        const { error } = await sb.auth.resend({ type:'signup', email: state.user.email });
        if (error){
          statusEl.textContent = error.message; statusEl.className = 'sq-status err';
          link.style.pointerEvents = ''; link.style.opacity = '';
        } else {
          statusEl.textContent = 'Verification email sent — check your inbox!'; statusEl.className = 'sq-status ok';
        }
      };
    }
    wireEyeToggle('sq-eye-current', 'sq-pwd-current');
    wireEyeToggle('sq-eye-new', 'sq-pwd-new');
    wireEyeToggle('sq-eye-new-confirm', 'sq-pwd-new-confirm');
    wireEyeToggle('sq-eye-del', 'sq-del-pwd');

    document.getElementById('sq-settings-save').onclick = async () => {
      const newName = document.getElementById('sq-settings-name').value.trim();
      const statusEl = document.getElementById('sq-settings-status');
      const btn = document.getElementById('sq-settings-save');
      if (!newName){ statusEl.textContent = 'Display name cannot be empty.'; statusEl.className = 'sq-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Saving...'; statusEl.className = 'sq-status';
      const { error } = await sb.auth.updateUser({ data: { display_name: newName } });
      if (error){
        statusEl.textContent = error.message; statusEl.className = 'sq-status err'; btn.disabled = false;
      } else {
        state.displayName = newName;
        renderWidget();
        statusEl.textContent = 'Saved!'; statusEl.className = 'sq-status ok';
        btn.disabled = false;
      }
    };

    document.getElementById('sq-pwd-save').onclick = async () => {
      const current = document.getElementById('sq-pwd-current').value;
      const next = document.getElementById('sq-pwd-new').value;
      const confirm = document.getElementById('sq-pwd-new-confirm').value;
      const statusEl = document.getElementById('sq-pwd-status');
      const btn = document.getElementById('sq-pwd-save');
      statusEl.className = 'sq-status';
      if (!current || !next || !confirm){ statusEl.textContent = 'Fill in all three password fields.'; statusEl.className = 'sq-status err'; return; }
      if (next !== confirm){ statusEl.textContent = "New passwords don't match — check both fields."; statusEl.className = 'sq-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Updating...';
      const { error } = await sb.auth.updateUser({ current_password: current, password: next });
      if (error){
        statusEl.textContent = error.message; statusEl.className = 'sq-status err'; btn.disabled = false;
      } else {
        statusEl.textContent = 'Password updated!'; statusEl.className = 'sq-status ok';
        document.getElementById('sq-pwd-current').value = '';
        document.getElementById('sq-pwd-new').value = '';
        document.getElementById('sq-pwd-new-confirm').value = '';
        btn.disabled = false;
      }
    };

    document.getElementById('sq-del-open').onclick = () => {
      const box = document.getElementById('sq-del-box');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('sq-del-confirm').onclick = async () => {
      const ack = document.getElementById('sq-del-ack').checked;
      const pwd = document.getElementById('sq-del-pwd').value;
      const statusEl = document.getElementById('sq-del-status');
      const btn = document.getElementById('sq-del-confirm');
      statusEl.className = 'sq-status';
      if (!ack){ alert('Please tick the box to confirm you understand this deletes your account permanently.'); return; }
      if (!pwd){ statusEl.textContent = 'Enter your password to confirm.'; statusEl.className = 'sq-status err'; return; }
      btn.disabled = true; statusEl.textContent = 'Verifying password...';
      const email = state.user.email;
      const { error: pwErr } = await sb.auth.signInWithPassword({ email, password: pwd });
      if (pwErr){
        statusEl.textContent = 'Incorrect password.'; statusEl.className = 'sq-status err'; btn.disabled = false;
        return;
      }
      statusEl.textContent = 'Deleting your account...';
      try {
        const { data:{ session } } = await sb.auth.getSession();
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(result.error || 'Could not delete account.');
        statusEl.textContent = 'Account deleted. Bye for now!'; statusEl.className = 'sq-status ok';
        setTimeout(async () => {
          try { await sb.auth.signOut(); } catch(e){}
          location.href = location.pathname.includes('/') ? location.pathname.replace(/[^/]+$/, 'index.html') : 'index.html';
        }, 1200);
      } catch(e){
        statusEl.textContent = e.message || 'Something went wrong.'; statusEl.className = 'sq-status err'; btn.disabled = false;
      }
    };
  }

  /* ---------------- guest-mode gating on realm map pages ---------------- */
  function renderGuestGating(){
    const trialsEl = document.getElementById('trials');
    if (!trialsEl) return; // not a map page

    let banner = document.getElementById('sq-guest-banner');
    if (!state.user){
      if (!banner){
        banner = document.createElement('div');
        banner.id = 'sq-guest-banner';
        banner.textContent = 'Guest Mode — Sign in to unlock all trials.';
        trialsEl.parentNode.insertBefore(banner, trialsEl);
      }
    } else if (banner){
      banner.remove();
    }

    trialsEl.querySelectorAll('.trial-card').forEach(card => {
      const link = card.querySelector('a.trial-btn');
      if (!link) return;
      const trialKey = (link.getAttribute('href') || '').replace(/\.html$/, '');
      const existingBadge = card.querySelector('.sq-lock-badge');
      if (existingBadge) existingBadge.remove();

      const shouldLock = !state.user && !FREE_TRIALS.has(trialKey);
      if (shouldLock){
        const badge = document.createElement('div');
        badge.className = 'sq-lock-badge';
        badge.innerHTML = '&#128274;';
        card.appendChild(badge);
        link.classList.add('sq-locked');
      } else {
        link.classList.remove('sq-locked');
      }
    });
  }

  /* ---------------- hide manual "Save Results" in guest mode ---------------- */
  function updateSaveResultsButton(){
    const btn = document.querySelector('[onclick="saveResults()"]');
    if (btn) btn.style.display = state.user ? '' : 'none';
  }

  /* ---------------- block starting a locked trial reached directly by URL ---------------- */
  function lockTrialStartButton(){
    const btn = document.querySelector('button[onclick="startGame()"]');
    if (!btn) return; // not a trial page

    const trialKey = location.pathname.split('/').pop().replace(/\.html$/, '');
    const shouldLock = !state.user && !FREE_TRIALS.has(trialKey);
    let note = document.getElementById('sq-trial-lock-note');

    if (shouldLock){
      btn.disabled = true;
      btn.classList.add('sq-locked-btn');
      if (!note){
        note = document.createElement('div');
        note.id = 'sq-trial-lock-note';
        note.innerHTML = '&#128274; This trial needs an account — <a id="sq-trial-lock-signin">Sign In</a>';
        btn.insertAdjacentElement('afterend', note);
        document.getElementById('sq-trial-lock-signin').onclick = () => openAuth('signin');
      }
    } else {
      btn.disabled = false;
      btn.classList.remove('sq-locked-btn');
      if (note) note.remove();
    }
  }

  function renderReactive(){
    renderGuestGating();
    updateSaveResultsButton();
    lockTrialStartButton();
  }

  /* ---------------- pending-attempt flush (if a trial ended while logged out) ---------------- */
  function flushPending(){
    const raw = sessionStorage.getItem('sq_pending_attempt');
    if (!raw || !state.user) return;
    sessionStorage.removeItem('sq_pending_attempt');
    try { recordAttempt(JSON.parse(raw)); } catch(e){}
  }

  /* ---------------- public API ---------------- */
  async function recordAttempt(payload){
    if (!state.user){
      sessionStorage.setItem('sq_pending_attempt', JSON.stringify(payload));
      const statusEl = document.getElementById('save-status');
      if (statusEl) statusEl.insertAdjacentHTML('beforeend', `<div class="sq-nudge">&#11088; Sign in (top-right) to save this result to your progress!</div>`);
      return { saved:false };
    }
    const { error } = await sb.from('attempts').insert({
      user_id: state.user.id,
      realm_id: payload.realm_id,
      trial_key: payload.trial_key,
      trial_name: payload.trial_name,
      score: payload.score,
      total: payload.total,
      sections: payload.sections || null
    });
    const statusEl = document.getElementById('save-status');
    if (statusEl){
      statusEl.insertAdjacentHTML('beforeend', error
        ? `<div class="sq-nudge" style="color:#ff8a80">Could not save to your account: ${error.message}</div>`
        : `<div class="sq-nudge" style="color:#43e97b">&#9989; Saved to your account!</div>`);
    }
    return { saved: !error, error };
  }

  window.SQAuth = {
    recordAttempt,
    openAuth,
    openProgress,
    onChange: (fn) => listeners.push(fn),
    get user(){ return state.user; },
    get ready(){ return state.ready; },
    get client(){ return sb; },
    REALM_META,
    REALM_ORDER
  };

  listeners.push(renderReactive);

  /* ---------------- boot ---------------- */
  async function boot(){
    const { data:{ session } } = await sb.auth.getSession();
    state.user = session ? session.user : null;
    state.displayName = session ? (session.user.user_metadata && session.user.user_metadata.display_name) : null;
    state.ready = true;
    renderWidget();
    notify();
    flushPending();

    sb.auth.onAuthStateChange((event, session) => {
      state.user = session ? session.user : null;
      state.displayName = session ? (session.user.user_metadata && session.user.user_metadata.display_name) : null;
      renderWidget();
      notify();
      flushPending();
    });
  }
  boot();
})();
