import { IdeApi } from './types';

export function getLoginHtml(getApi: () => IdeApi): string {
    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="font-family:Arial;padding:12px">
    <h3>I18n Quick Login</h3>
    <label>Username<br/><input id="login" style="width:100%"/></label>
    <label>Password<br/><input id="password" type="password" style="width:100%"/></label>
    <div style="margin-top:8px">
        <button id="loginBtn">Login & Save</button>
        <button id="logoutBtn">Remove token</button>
        <button id="fetchBtn">Fetch locales now</button>
    </div>
    <div id="result" style="margin-top:8px;color:#666"></div>
    <script>
        const ideApi = (${getApi.toString()})();
        
        document.getElementById('loginBtn').onclick = () => {
            ideApi.postMessage({
                command: 'login',
                login: document.getElementById('login').value,
                password: document.getElementById('password').value
            });
        };
        
        document.getElementById('logoutBtn').onclick = () => {
            ideApi.postMessage({ command: 'logout' });
        };
        
        document.getElementById('fetchBtn').onclick = () => {
            ideApi.postMessage({ command: 'fetchNow' });
        };
        
        window.addEventListener('message', e => {
            const m = e.data;
            document.getElementById('result').textContent = m.status === 'ok' ? 'Saved' : (m.message || 'Error');
        });
    </script>
</body>
</html>`;
}
