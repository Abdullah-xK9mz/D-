/* ==================== الاتصال بالخادم الخلفي ==================== */
const WaslaAPI = (() => {
    function getToken() {
        return localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY) || "";
    }

    function saveSession(token, user) {
        localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
        localStorage.setItem(CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
        localStorage.removeItem(CONFIG.USER_STORAGE_KEY);
    }

    function getSavedUser() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY) || "null");
        } catch {
            return null;
        }
    }

    async function request(action, payload = {}, needsAuth = true) {
        const headers = {
            "Content-Type": "application/json",
            "apikey": CONFIG.SUPABASE_PUBLISHABLE_KEY
        };
        if (needsAuth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

        let response;
        try {
            response = await fetch(CONFIG.API_URL, {
                method: "POST",
                headers,
                body: JSON.stringify({ action, ...payload })
            });
        } catch {
            throw new Error("تعذر الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.");
        }

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (response.status === 401 && needsAuth) {
                clearSession();
                if (location.pathname.endsWith("chat.html")) location.href = "index.html";
            }
            throw new Error(result.error || "حصل خطأ غير متوقع.");
        }
        return result;
    }

    return { getToken, saveSession, clearSession, getSavedUser, request };
})();
/* ==================== نهاية الاتصال بالخادم ==================== */
