/* ==================== عناصر صفحة التسجيل والدخول ==================== */
const E = {
    form: document.getElementById("authForm"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    nameField: document.getElementById("nameField"),
    displayName: document.getElementById("displayName"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    passwordHint: document.getElementById("passwordHint"),
    title: document.getElementById("formTitle"),
    eyebrow: document.getElementById("formEyebrow"),
    description: document.getElementById("formDescription"),
    submit: document.getElementById("submitButton"),
    alert: document.getElementById("formAlert"),
    switchText: document.getElementById("authSwitchText")
};
let authMode = "login";

/* ==================== وظائف تغيير وضع النموذج ==================== */
function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === "register";
    E.loginTab.classList.toggle("active", !registering);
    E.registerTab.classList.toggle("active", registering);
    E.nameField.classList.toggle("hidden", !registering);
    E.passwordHint.classList.toggle("hidden", !registering);
    E.eyebrow.textContent = registering ? "بداية جديدة" : "أهلاً بعودتك";
    E.title.textContent = registering ? "أنشئ حسابك" : "سجّل دخولك";
    E.description.textContent = registering ? "املأ البيانات دي، وابدأ أول محادثة ليك." : "اكتب بياناتك علشان ترجع لمحادثاتك.";
    E.submit.querySelector("span").textContent = registering ? "إنشاء الحساب" : "دخول إلى وِصال";
    E.switchText.innerHTML = registering
        ? 'عندك حساب بالفعل؟ <button type="button" id="switchToLogin">سجّل دخولك</button>'
        : 'لسه معندكش حساب؟ <button type="button" id="switchToRegister">أنشئ حسابك</button>';
    document.getElementById(registering ? "switchToLogin" : "switchToRegister")
        .addEventListener("click", () => setAuthMode(registering ? "login" : "register"));
    hideAlert();
}

function showAlert(message) {
    E.alert.textContent = message;
    E.alert.classList.remove("hidden");
}

function hideAlert() {
    E.alert.textContent = "";
    E.alert.classList.add("hidden");
}

function setLoading(loading) {
    E.submit.disabled = loading;
    E.submit.querySelector("span").textContent = loading ? "لحظة واحدة..." : (authMode === "register" ? "إنشاء الحساب" : "دخول إلى وِصال");
}
/* ==================== نهاية وظائف النموذج ==================== */

/* ==================== أحداث التسجيل وتسجيل الدخول ==================== */
E.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert();
    const username = E.username.value.trim().toLowerCase();
    const password = E.password.value;
    const displayName = E.displayName.value.trim();

    if (authMode === "register" && displayName.length < 2) return showAlert("اكتب اسمك الظاهر، ويكون حرفين على الأقل.");
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return showAlert("اسم المستخدم لازم يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _.");
    if (authMode === "register" && password.length < 8) return showAlert("كلمة المرور لازم تكون 8 أحرف على الأقل.");
    if (!password) return showAlert("اكتب كلمة المرور.");

    setLoading(true);
    try {
        const result = authMode === "register"
            ? await WaslaAPI.request("register", { displayName, username, password }, false)
            : await WaslaAPI.request("login", { username, password }, false);
        WaslaAPI.saveSession(result.token, result.user);
        location.href = "chat.html";
    } catch (error) {
        showAlert(error.message);
    } finally {
        setLoading(false);
    }
});

E.loginTab.addEventListener("click", () => setAuthMode("login"));
E.registerTab.addEventListener("click", () => setAuthMode("register"));
document.getElementById("togglePassword").addEventListener("click", () => {
    E.password.type = E.password.type === "password" ? "text" : "password";
});
if (WaslaAPI.getToken()) location.href = "chat.html";
/* ==================== نهاية أحداث المصادقة ==================== */
