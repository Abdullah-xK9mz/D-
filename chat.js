/* ==================== حالة التطبيق وعناصر الواجهة ==================== */
const state = { user: WaslaAPI.getSavedUser(), conversations: [], active: null, other: null, messages: [], filter: "all", timer: null, searchTimer: null };
const ui = {
    sidebar: document.getElementById("sidebar"), list: document.getElementById("conversationList"), search: document.getElementById("conversationSearch"),
    welcome: document.getElementById("welcomeScreen"), chat: document.getElementById("chatView"), messages: document.getElementById("messagesArea"),
    form: document.getElementById("messageForm"), input: document.getElementById("messageInput"), send: document.getElementById("sendButton"),
    searchModal: document.getElementById("searchModal"), userSearch: document.getElementById("userSearchInput"), results: document.getElementById("userSearchResults"),
    profileModal: document.getElementById("profileModal"), toast: document.getElementById("toastContainer")
};

/* ==================== أدوات الواجهة العامة ==================== */
function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
}

function colorFor(username = "") {
    const colors = ["purple", "green", "blue", "orange", "pink"];
    let hash = 0;
    for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return colors[hash % colors.length];
}

function avatar(user, extra = "") {
    const name = user?.display_name || user?.username || "؟";
    return el("div", `avatar ${colorFor(user?.username)} ${extra}`, name.trim().charAt(0).toUpperCase());
}

function timeLabel(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function toast(message, type = "success") {
    const item = el("div", `toast ${type === "error" ? "toast-error" : ""}`, message);
    ui.toast.append(item);
    requestAnimationFrame(() => item.classList.add("toast-visible"));
    setTimeout(() => { item.classList.remove("toast-visible"); setTimeout(() => item.remove(), 250); }, 3200);
}

function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeModal(modal) {
    modal.classList.add("hidden");
    if (!document.querySelector(".modal-backdrop:not(.hidden)")) document.body.classList.remove("modal-open");
}
/* ==================== نهاية الأدوات العامة ==================== */

/* ==================== تحميل الحساب والمحادثات ==================== */
async function loadMe() {
    if (!WaslaAPI.getToken()) { location.href = "index.html"; return; }
    try {
        const result = await WaslaAPI.request("me");
        state.user = result.user;
        WaslaAPI.saveSession(WaslaAPI.getToken(), state.user);
        document.getElementById("myAvatar").textContent = state.user.display_name.charAt(0);
        document.getElementById("myDisplayName").textContent = state.user.display_name;
        document.getElementById("myUsername").textContent = `@${state.user.username}`;
        await loadConversations();
    } catch (error) { toast(error.message, "error"); }
}

async function loadConversations() {
    const result = await WaslaAPI.request("listConversations");
    state.conversations = result.conversations || [];
    renderList();
    if (state.active) {
        const fresh = state.conversations.find(item => item.id === state.active.id);
        if (fresh) { state.active = fresh; state.other = fresh.other; renderChatHeader(); }
    }
}
/* ==================== نهاية التحميل ==================== */

/* ==================== رسم قائمة المحادثات ==================== */
function conversationButton(conversation) {
    const other = conversation.other || {};
    const button = el("button", `conversation-item ${state.active?.id === conversation.id ? "selected" : ""}`);
    button.type = "button";
    const details = el("span", "conversation-details");
    const top = el("span", "conversation-top");
    top.append(el("strong", "conversation-name", other.display_name || other.username || "مستخدم"));
    top.append(el("time", "conversation-time", timeLabel(conversation.lastMessage?.created_at || conversation.last_message_at)));
    const bottom = el("span", "conversation-bottom");
    bottom.append(el("span", "conversation-preview", conversation.lastMessage?.body || "ابدأ أول رسالة في المحادثة"));
    details.append(top, bottom);
    button.append(avatar(other, "conversation-avatar"), details);
    button.addEventListener("click", () => openConversation(conversation));
    return button;
}

function renderList() {
    const query = ui.search.value.trim().toLowerCase();
    let rows = [...state.conversations];
    if (query) rows = rows.filter(c => (c.other?.display_name || "").toLowerCase().includes(query) || (c.other?.username || "").toLowerCase().includes(query));
    if (state.filter === "recent") rows.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    document.getElementById("allCount").textContent = state.conversations.length;
    ui.list.replaceChildren();
    if (!rows.length) {
        const empty = el("div", "empty-list-state");
        empty.append(el("strong", "", query ? "مفيش نتائج" : "مفيش محادثات لسه"));
        empty.append(el("p", "", query ? "جرّب كلمة بحث مختلفة." : "ابدأ محادثة جديدة مع أي شخص على وِصال."));
        const button = el("button", "text-button", "ابحث عن مستخدم");
        button.type = "button"; button.addEventListener("click", showSearch);
        empty.append(button); ui.list.append(empty); return;
    }
    rows.forEach(row => ui.list.append(conversationButton(row)));
}
/* ==================== نهاية رسم القائمة ==================== */

/* ==================== عرض المحادثة والرسائل ==================== */
async function openConversation(conversation) {
    state.active = conversation;
    state.other = conversation.other;
    ui.welcome.classList.add("hidden");
    ui.chat.classList.remove("hidden");
    ui.sidebar.classList.add("sidebar-hidden-mobile");
    renderList(); renderChatHeader();
    await loadMessages(); ui.input.focus();
}

function renderChatHeader() {
    const name = state.other?.display_name || state.other?.username || "مستخدم";
    const target = document.getElementById("activeAvatar");
    target.textContent = name.charAt(0);
    target.className = `avatar chat-avatar ${colorFor(state.other?.username)}`;
    document.getElementById("activeName").textContent = name;
    document.getElementById("activeStatus").textContent = state.other?.about || "على وِصال";
}

async function loadMessages() {
    if (!state.active) return;
    const result = await WaslaAPI.request("listMessages", { conversationId: state.active.id });
    const messages = result.messages || [];
    const oldLast = state.messages.at(-1)?.id;
    const newLast = messages.at(-1)?.id;
    if (oldLast !== newLast || messages.length !== state.messages.length) {
        state.messages = messages; renderMessages();
    }
}

function renderMessages() {
    ui.messages.replaceChildren(el("div", "conversation-start", "بداية المحادثة"));
    if (!state.messages.length) {
        ui.messages.append(el("div", "messages-empty", "لسه مفيش رسائل هنا. ابدأ الكلام 👋")); return;
    }
    state.messages.forEach(message => {
        const own = message.sender_id === state.user.id;
        const row = el("div", `message-row ${own ? "message-own" : "message-other"}`);
        const bubble = el("div", "message-bubble");
        bubble.append(el("p", "message-body", message.body));
        const meta = el("span", "message-meta");
        meta.append(el("time", "", timeLabel(message.created_at)));
        if (own) meta.append(el("span", "message-check", "✓✓"));
        bubble.append(meta); row.append(bubble); ui.messages.append(row);
    });
    ui.messages.scrollTop = ui.messages.scrollHeight;
}
/* ==================== نهاية عرض المحادثة ==================== */

/* ==================== إرسال الرسائل ==================== */
async function sendMessage(event) {
    event.preventDefault();
    if (!state.active) return;
    const body = ui.input.value.trim();
    if (!body) return;
    if (body.length > CONFIG.MAX_MESSAGE_LENGTH) return toast("الرسالة أطول من الحد المسموح.", "error");
    ui.send.disabled = true;
    try {
        await WaslaAPI.request("sendMessage", { conversationId: state.active.id, body });
        ui.input.value = ""; resizeInput(); await loadMessages(); await loadConversations();
    } catch (error) { toast(error.message, "error"); }
    finally { ui.send.disabled = false; ui.input.focus(); }
}

function resizeInput() {
    ui.input.style.height = "auto";
    ui.input.style.height = `${Math.min(ui.input.scrollHeight, 130)}px`;
}
/* ==================== نهاية إرسال الرسائل ==================== */

/* ==================== البحث عن مستخدمين وبدء محادثة ==================== */
function showSearch() {
    openModal(ui.searchModal); ui.userSearch.value = "";
    ui.results.replaceChildren(el("div", "search-placeholder", "اكتب حرفين على الأقل للبحث."));
    setTimeout(() => ui.userSearch.focus(), 50);
}

async function searchUsers(query) {
    if (query.trim().replace(/^@/, "").length < 2) {
        ui.results.replaceChildren(el("div", "search-placeholder", "اكتب حرفين على الأقل للبحث.")); return;
    }
    ui.results.replaceChildren(el("div", "search-placeholder", "جاري البحث..."));
    try {
        const result = await WaslaAPI.request("searchUsers", { query });
        ui.results.replaceChildren();
        if (!result.users.length) { ui.results.append(el("div", "search-placeholder", "ملقيناش مستخدم بالاسم ده.")); return; }
        result.users.forEach(user => {
            const row = el("button", "user-result"); row.type = "button";
            const info = el("span", "user-result-info");
            info.append(el("strong", "", user.display_name), el("small", "", `@${user.username}`));
            row.append(avatar(user, "result-avatar"), info, el("span", "result-action", "مراسلة"));
            row.addEventListener("click", () => startConversation(user)); ui.results.append(row);
        });
    } catch (error) { ui.results.replaceChildren(el("div", "search-placeholder", error.message)); }
}

async function startConversation(user) {
    try {
        const result = await WaslaAPI.request("startConversation", { userId: user.id });
        closeModal(ui.searchModal); await loadConversations();
        const conversation = state.conversations.find(item => item.id === result.conversation.id);
        if (conversation) await openConversation(conversation);
    } catch (error) { toast(error.message, "error"); }
}
/* ==================== نهاية البحث ==================== */

/* ==================== الملف الشخصي وتسجيل الخروج ==================== */
function showProfile() {
    document.getElementById("profileNameInput").value = state.user.display_name || "";
    document.getElementById("profileAboutInput").value = state.user.about || "";
    document.getElementById("profileNamePreview").textContent = state.user.display_name;
    document.getElementById("profileUsernamePreview").textContent = `@${state.user.username}`;
    document.getElementById("profileAvatarPreview").textContent = state.user.display_name.charAt(0);
    openModal(ui.profileModal);
}

async function saveProfile(event) {
    event.preventDefault();
    const alert = document.getElementById("profileAlert"); alert.classList.add("hidden");
    try {
        const result = await WaslaAPI.request("updateProfile", {
            displayName: document.getElementById("profileNameInput").value.trim(),
            about: document.getElementById("profileAboutInput").value.trim()
        });
        state.user = result.user; WaslaAPI.saveSession(WaslaAPI.getToken(), result.user);
        document.getElementById("myDisplayName").textContent = state.user.display_name;
        document.getElementById("myAvatar").textContent = state.user.display_name.charAt(0);
        closeModal(ui.profileModal); toast("تم تحديث ملفك الشخصي.");
    } catch (error) { alert.textContent = error.message; alert.classList.remove("hidden"); }
}

async function logout() {
    try { await WaslaAPI.request("logout"); } catch { /* ننهي الجلسة محليًا عند انقطاع الشبكة */ }
    WaslaAPI.clearSession(); location.href = "index.html";
}
/* ==================== نهاية الملف الشخصي ==================== */

/* ==================== أحداث الواجهة ==================== */
document.getElementById("newChatButton").addEventListener("click", showSearch);
document.getElementById("emptyNewChat").addEventListener("click", showSearch);
document.getElementById("welcomeNewChat").addEventListener("click", showSearch);
document.getElementById("profileButton").addEventListener("click", showProfile);
document.getElementById("moreMenuButton").addEventListener("click", showProfile);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("backToList").addEventListener("click", () => {
    ui.sidebar.classList.remove("sidebar-hidden-mobile"); ui.chat.classList.add("hidden"); ui.welcome.classList.remove("hidden");
});
document.getElementById("refreshMessages").addEventListener("click", loadMessages);
document.getElementById("chatDetailsButton").addEventListener("click", () => {
    if (state.other) toast(`${state.other.display_name} · @${state.other.username}`);
});
document.getElementById("emojiButton").addEventListener("click", () => { ui.input.value += " 😊"; ui.input.focus(); resizeInput(); });
ui.form.addEventListener("submit", sendMessage);
ui.input.addEventListener("input", resizeInput);
ui.input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ui.form.requestSubmit(); } });
ui.userSearch.addEventListener("input", () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(() => searchUsers(ui.userSearch.value), 350); });
ui.search.addEventListener("input", renderList);
document.getElementById("profileForm").addEventListener("submit", saveProfile);
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(document.getElementById(button.dataset.close))));
document.querySelectorAll(".modal-backdrop").forEach(modal => modal.addEventListener("click", event => { if (event.target === modal) closeModal(modal); }));
document.querySelectorAll(".filter-tab").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
    button.classList.add("active"); state.filter = button.dataset.filter; renderList();
}));
document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); ui.search.focus(); }
    if (event.key === "Escape") document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach(closeModal);
});
/* ==================== نهاية أحداث الواجهة ==================== */

/* ==================== التحديث الدوري لرسائل الطرف الآخر ==================== */
async function refreshData() {
    if (document.hidden) return;
    try { await loadConversations(); if (state.active) await loadMessages(); } catch { /* تجاهل الانقطاع المؤقت */ }
}

loadMe().then(() => { state.timer = setInterval(refreshData, CONFIG.REFRESH_INTERVAL); });
/* ==================== نهاية ملف المحادثات ==================== */
