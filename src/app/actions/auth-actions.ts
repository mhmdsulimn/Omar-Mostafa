'use server';

import 'server-only';

/**
 * تم تعطيل تسجيل الدخول عبر البريد الإلكتروني (OTP) للاكتفاء بجوجل.
 */
export async function requestOTPAction(email: string) {
    return { success: false, error: 'تم تعطيل هذه الميزة حالياً.' };
}

export async function verifyOTPAction(email: string, otp: string) {
    return { success: false, error: 'تم تعطيل هذه الميزة حالياً.' };
}
