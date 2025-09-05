"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const uuid_1 = require("uuid");
class SessionManager {
    constructor(firestore) {
        this.SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes for privacy-first approach
        this.db = firestore;
    }
    generateSessionId() {
        return (0, uuid_1.v4)();
    }
    async createSession() {
        const sessionId = this.generateSessionId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_MS);
        const session = {
            sessionId,
            userPhotos: [],
            createdAt: now,
            expiresAt,
            status: 'active'
        };
        await this.db.collection('sessions').doc(sessionId).set({
            ...session,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            expiresAt: firestore_1.FieldValue.serverTimestamp()
        });
        // Store expiry timestamp properly
        await this.db.collection('sessions').doc(sessionId).update({
            expiresAt: expiresAt
        });
        return {
            sessionId,
            expiresIn: 3600 // 60 minutes in seconds
        };
    }
    async getSession(sessionId) {
        const doc = await this.db.collection('sessions').doc(sessionId).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        // Check if session has expired
        const now = new Date();
        if (new Date(data.expiresAt) < now) {
            return null;
        }
        return data;
    }
    async isSessionValid(sessionId) {
        const session = await this.getSession(sessionId);
        return session !== null;
    }
    async addPhotoToSession(sessionId, photoMetadata) {
        const sessionRef = this.db.collection('sessions').doc(sessionId);
        await sessionRef.update({
            userPhotos: firestore_1.FieldValue.arrayUnion(photoMetadata)
        });
    }
    async deletePhotoFromStorage(photoUrl) {
        try {
            // Extract file path from URL
            const urlParts = photoUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const bucket = (0, storage_1.getStorage)().bucket();
            const file = bucket.file(`sessions/${fileName}`);
            await file.delete();
            return true;
        }
        catch (error) {
            console.error(`Failed to delete photo ${photoUrl}:`, error);
            return false;
        }
    }
    async cleanupExpiredSessions() {
        const now = new Date();
        const expiredSessionsQuery = await this.db
            .collection('sessions')
            .where('expiresAt', '<', now)
            .get();
        let deletedCount = 0;
        const deletePromises = expiredSessionsQuery.docs.map(async (doc) => {
            const sessionData = doc.data();
            // Delete associated photos from storage
            if (sessionData.userPhotos && sessionData.userPhotos.length > 0) {
                const photoDeletePromises = sessionData.userPhotos.map(photo => this.deletePhotoFromStorage(photo.url));
                await Promise.all(photoDeletePromises);
            }
            // Delete the session document
            await this.db.collection('sessions').doc(doc.id).delete();
            deletedCount++;
        });
        await Promise.all(deletePromises);
        return { deletedCount };
    }
    async updateSessionStatus(sessionId, status) {
        await this.db.collection('sessions').doc(sessionId).update({
            status
        });
    }
    async extendSession(sessionId, additionalMinutes = 30) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        const newExpiresAt = new Date(new Date(session.expiresAt).getTime() + additionalMinutes * 60 * 1000);
        await this.db.collection('sessions').doc(sessionId).update({
            expiresAt: newExpiresAt
        });
        return newExpiresAt;
    }
    async getSessionPhotos(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) {
            return [];
        }
        return session.userPhotos;
    }
    async deleteSession(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (session) {
                // Delete associated photos
                const photoDeletePromises = session.userPhotos.map(photo => this.deletePhotoFromStorage(photo.url));
                await Promise.all(photoDeletePromises);
            }
            // Delete session document
            await this.db.collection('sessions').doc(sessionId).delete();
            return true;
        }
        catch (error) {
            console.error(`Failed to delete session ${sessionId}:`, error);
            return false;
        }
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=session.js.map