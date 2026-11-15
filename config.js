/* ==================== إعدادات وِصال القابلة للتعديل ==================== */
const CONFIG = {
    SUPABASE_URL: "https://uzzjkfriikqsoxjlzjbe.supabase.co", // رابط مشروع Supabase
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_6g-JJIZlZRYHNhlNXE9eMA_Ohx9Eksu", // مفتاح النشر العام فقط
    API_URL: "https://uzzjkfriikqsoxjlzjbe.supabase.co/functions/v1/wasla-api", // رابط الخادم الخلفي
    TOKEN_STORAGE_KEY: "wasla_session_token", // اسم مفتاح الجلسة
    USER_STORAGE_KEY: "wasla_current_user", // اسم مفتاح بيانات المستخدم
    REFRESH_INTERVAL: 3000, // تحديث المحادثات كل 3 ثوانٍ
    MAX_MESSAGE_LENGTH: 5000 // الحد الأقصى لطول الرسالة
};
/* ==================== نهاية الإعدادات ==================== */
