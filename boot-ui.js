// Runs before any CDN module: loading/failure must always be visible.
(() => {
  const button = document.getElementById('btnStart');
  const status = document.createElement('p');
  status.id = 'loadStatus'; status.setAttribute('role', 'status');
  status.style.cssText = 'max-width:520px;padding:12px;color:#c9d4df;font-size:13px';
  button.after(status);
  window.gameLoadStatus = (message, failed = false) => {
    status.textContent = message;
    button.disabled = !failed;
    button.textContent = failed ? '重新載入' : '⏳ 載入中…';
    if (failed) button.onclick = () => location.reload();
  };
  window.gameLoadStatus('載入遊戲程式及角色，請稍候…');
  window.__bootWatchdog = setTimeout(() => {
    window.gameLoadStatus('載入超過 90 秒。請檢查網絡或重試；未成功進入遊戲。', true);
  }, 90000);
})();
