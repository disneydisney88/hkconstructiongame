"""Local, read-only acceptance console. No guessed runtime counts or auto-push."""
from pathlib import Path
import hashlib
import json
import subprocess
import urllib.request
import streamlit as st

ROOT = Path(__file__).resolve().parent
CORE = ['app.js', 'boot.js', 'boot-ui.js', 'worker-rig.js', 'mapdata.js',
        'index.html', 'server.py', 'README.md', 'GAME-DOCS.md', 'REFERENCES.md']
st.set_page_config(page_title='開工大吉 · 驗收台', page_icon='⛑️', layout='wide')
st.title('開工大吉 · 管理及驗收台')
st.caption('機器證據、遊戲實測、未驗證項目分開記錄。此介面不會修改人工、跳過任務或自動發布。')
with st.container(horizontal=True):
    st.link_button('開啟線上遊戲', 'https://disneydisney88.github.io/hkconstructiongame/')
    st.link_button('本地遊戲及驗收工具', 'http://localhost:8123/?qa=1')
files = [{'檔案': name, '狀態': '✅ 已實際驗證' if (ROOT/name).is_file() else '❌ 失敗',
          'SHA256': hashlib.sha256((ROOT/name).read_bytes()).hexdigest() if (ROOT/name).is_file() else ''}
         for name in CORE]
with st.container(horizontal=True):
    st.metric('核心檔案存在', f'{sum((ROOT/n).is_file() for n in CORE)}/{len(CORE)}', border=True)
    st.metric('完整遊戲通關', '未驗證', border=True)
    st.metric('遊戲狀態來源', '匯入實測 JSON', border=True)
tab_files, tab_runtime, tab_services, tab_notes = st.tabs(['檔案及語法', '遊戲實測', '本地服務', '交接限制'])
with tab_files:
    st.dataframe(files, hide_index=True)
    if st.button('執行 JavaScript 語法檢查', type='primary'):
        results = []
        for name in ['app.js', 'boot.js', 'boot-ui.js', 'worker-rig.js', 'mapdata.js']:
            try:
                p = subprocess.run(['node', '--check', str(ROOT/name)], capture_output=True,
                                   text=True, encoding='utf-8', errors='replace', timeout=20)
                results.append({'檔案': name, '狀態': '✅ 已實際驗證' if p.returncode == 0 else '❌ 失敗',
                                '輸出': p.stderr or p.stdout or 'exit 0'})
            except (OSError, subprocess.TimeoutExpired) as exc:
                results.append({'檔案': name, '狀態': '❌ 失敗', '輸出': str(exc)})
        st.session_state.syntax = results
    if 'syntax' in st.session_state:
        st.dataframe(st.session_state.syntax, hide_index=True)
        st.download_button('下載語法檢查結果', json.dumps(st.session_state.syntax, ensure_ascii=False, indent=2),
                           file_name='syntax-results.json', mime='application/json')
with tab_runtime:
    st.info('遊戲網址加 ?qa=1，完成操作後按「下載驗收 JSON」，再匯入。這是當時快照，不是即時監控。')
    upload = st.file_uploader('匯入 game-audit.json', type=['json'])
    if upload:
        try:
            data = json.load(upload)
            if not isinstance(data, dict) or not isinstance(data.get('build'), str) or 'capturedAt' not in data:
                raise ValueError('缺少 build 或 capturedAt，唔係有效驗收快照')
            st.caption(f"版本 {data['build']} · 擷取時間 {data['capturedAt']}")
            with st.container(horizontal=True):
                st.metric('NPC 快照數量', data.get('npcCount', '未驗證'), border=True)
                st.metric('人工快照', data.get('wage', '未驗證'), border=True)
                st.metric('任務索引', data.get('mission', '未驗證'), border=True)
            st.json(data)
        except (ValueError, TypeError) as exc:
            st.error(f'無法讀取快照：{exc}')
with tab_services:
    st.caption('只檢查本機固定網址；HTTP 成功唔等於完整遊戲或語音合成成功。')
    if st.button('檢查遊戲及廣東話服務'):
        for label, url in [('遊戲', 'http://127.0.0.1:8123/'), ('CosyVoice', 'http://127.0.0.1:9881/health')]:
            try:
                with urllib.request.urlopen(url, timeout=3) as response:
                    body = response.read(16384)
                    st.success(f'{label}: HTTP {response.status}')
                    if label == 'CosyVoice':
                        st.json(json.loads(body))
            except Exception as exc:
                st.warning(f'{label}: 無法確認服務可用 · {exc}')
with tab_notes:
    st.warning('Steam 發布、完整通關、八區可達、角色近鏡、效能及授權仍需要獨立驗收。')
    st.markdown('啟動：`python -m streamlit run streamlit_app.py --server.address 127.0.0.1`')
    for name in ['ACCEPTANCE.md', 'CHANGELOG.md']:
        if (ROOT/name).is_file():
            with st.expander(name):
                st.markdown((ROOT/name).read_text(encoding='utf-8'))
