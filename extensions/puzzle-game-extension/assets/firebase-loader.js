/**
 * Firebase Dynamic Loader
 * Loads Firebase SDK with fallback and version control
 */

(function(window) {
    'use strict';

    const FIREBASE_VERSION = '9.23.0';
    const FIREBASE_CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    
    class FirebaseLoader {
        constructor() {
            this.loadPromise = null;
            this.initialized = false;
        }

        async load() {
            if (this.loadPromise) return this.loadPromise;
            
            this.loadPromise = this._loadFirebaseSDK();
            return this.loadPromise;
        }

        async _loadFirebaseSDK() {
            try {
                // Check if Firebase is already loaded
                if (typeof firebase !== 'undefined') {
                    console.log('Firebase already loaded');
                    return firebase;
                }

                console.log('Loading Firebase SDK...');
                
                // Load Firebase App
                await this._loadScript(`${FIREBASE_CDN_BASE}/firebase-app-compat.js`);
                
                // Load Firestore
                await this._loadScript(`${FIREBASE_CDN_BASE}/firebase-firestore-compat.js`);
                
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase failed to load');
                }

                console.log('Firebase SDK loaded successfully');
                return firebase;
                
            } catch (error) {
                console.error('Failed to load Firebase SDK:', error);
                throw new Error('Firebase unavailable - game features limited');
            }
        }

        _loadScript(src) {
            return new Promise((resolve, reject) => {
                // Check if script is already loaded
                const existing = document.querySelector(`script[src="${src}"]`);
                if (existing) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.crossOrigin = 'anonymous';
                
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                
                // Add to head to avoid conflicts
                document.head.appendChild(script);
            });
        }

        static getInstance() {
            if (!window._firebaseLoader) {
                window._firebaseLoader = new FirebaseLoader();
            }
            return window._firebaseLoader;
        }
    }

    // Export globally
    window.FirebaseLoader = FirebaseLoader;

})(window);