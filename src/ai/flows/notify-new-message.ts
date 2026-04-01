'use server';
/**
 * @fileOverview تم تعطيل إرسال الإشعارات للأجهزة، السجلات تضاف في Firestore فقط.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export const onNotificationCreated = onDocumentCreated('users/{userId}/notifications/{id}', async (event) => {
  // تم تعطيل الإرسال للأجهزة، الرسالة تظهر للطالب داخل المنصة فقط.
  return;
});

export const onAnnouncementCreated = onDocumentCreated('announcements/{id}', async (event) => {
  // تم تعطيل الإرسال للأجهزة، الإعلان يظهر للطالب داخل المنصة فقط.
  return;
});
