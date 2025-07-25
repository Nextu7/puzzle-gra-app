import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;
let adminDb;

function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    if (getApps().length > 0) {
      adminApp = getApps()[0];
      adminDb = getFirestore(adminApp);
      return { adminApp, adminDb };
    }

    // Initialize Firebase Admin with service account file
    if (process.env.NODE_ENV === 'production') {
      // Read service account from secret file on Render
      const fs = require('fs');
      const serviceAccountPath = '/etc/secrets/firebase-service-account';
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      } else {
        throw new Error('Firebase service account file not found');
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Development - use environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use default credentials in production (Google Cloud)
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      throw new Error('Firebase configuration missing');
    }

    adminDb = getFirestore(adminApp);
    console.log('Firebase Admin SDK initialized successfully');
    
    return { adminApp, adminDb };
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Fallback to mock for development
    console.log('Using mock Firebase for development');
    adminApp = null;
    adminDb = null;
    return { adminApp: null, adminDb: null };
  }
}

// Initialize on module load
const { adminApp: app, adminDb: db } = initializeFirebaseAdmin();

export class FirebaseService {
  static get db() {
    // Return real Firebase db if available, otherwise mock
    if (adminDb) {
      return adminDb;
    }
    
    // Mock db for development/fallback
    return {
      collection: () => ({
        doc: () => ({
          get: () => Promise.resolve({ exists: false }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve()
        }),
        add: () => Promise.resolve({ id: 'mock-id' }),
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              get: () => Promise.resolve({ docs: [] })
            })
          })
        })
      })
    };
  }

  static async getPlayerProfile(customerId) {
    try {
      const playerRef = this.db.collection('playerProfiles').doc(customerId.toString());
      const playerDoc = await playerRef.get();
      
      if (!playerDoc.exists) {
        return null;
      }

      return {
        id: playerDoc.id,
        ...playerDoc.data()
      };
    } catch (error) {
      console.error('Error getting player profile:', error);
      throw new Error('Failed to get player profile');
    }
  }

  static async createPlayerProfile(customerId, nickname) {
    try {
      const batch = this.db.batch();
      const playerRef = this.db.collection('playerProfiles').doc(customerId.toString());
      
      const playerData = {
        nickname,
        createdAt: new Date(),
        totalGames: 0,
        totalTime: 0,
        bestTimes: {},
        achievements: []
      };

      batch.set(playerRef, playerData);
      await batch.commit();

      return {
        id: customerId.toString(),
        ...playerData
      };
    } catch (error) {
      console.error('Error creating player profile:', error);
      throw new Error('Failed to create player profile');
    }
  }

  static async updatePlayerProfile(customerId, updates) {
    try {
      const playerRef = this.db.collection('playerProfiles').doc(customerId.toString());
      
      await playerRef.update({
        ...updates,
        updatedAt: new Date()
      });

      const updatedDoc = await playerRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating player profile:', error);
      throw new Error('Failed to update player profile');
    }
  }

  static async saveScore(scoreData) {
    try {
      // Validate score data server-side
      const validatedScore = this.validateScoreData(scoreData);
      
      const batch = this.db.batch();
      
      // Save score
      const scoreRef = this.db.collection('scores').doc();
      batch.set(scoreRef, {
        ...validatedScore,
        createdAt: new Date(),
        verified: true // Mark as server-verified
      });

      // Update player stats
      const playerRef = this.db.collection('playerProfiles').doc(validatedScore.customerId);
      const playerDoc = await playerRef.get();
      
      if (playerDoc.exists) {
        const playerData = playerDoc.data();
        const currentBestTime = playerData.bestTimes?.[validatedScore.difficulty];
        
        const updates = {
          totalGames: (playerData.totalGames || 0) + 1,
          totalTime: (playerData.totalTime || 0) + validatedScore.timeInSeconds,
          lastPlayedAt: new Date()
        };

        // Update best time if this is better
        if (!currentBestTime || validatedScore.timeInSeconds < currentBestTime) {
          updates[`bestTimes.${validatedScore.difficulty}`] = validatedScore.timeInSeconds;
        }

        batch.update(playerRef, updates);
      }

      await batch.commit();

      return {
        id: scoreRef.id,
        ...validatedScore,
        verified: true
      };
    } catch (error) {
      console.error('Error saving score:', error);
      throw new Error('Failed to save score');
    }
  }

  static validateScoreData(scoreData) {
    const { productId, difficulty, timeInSeconds, customerId, shopId } = scoreData;

    // Basic validation
    if (!productId || !difficulty || !timeInSeconds || !customerId) {
      throw new Error('Missing required score data');
    }

    // Validate difficulty
    const validDifficulties = ['p30', 'p56', 'p99', 'p143', 'p304'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error('Invalid difficulty level');
    }

    // Validate time (must be reasonable)
    if (timeInSeconds < 1 || timeInSeconds > 86400) { // 1 second to 24 hours
      throw new Error('Invalid completion time');
    }

    // Additional server-side validation could include:
    // - Minimum time based on difficulty (prevent cheating)
    // - Rate limiting per player
    // - Puzzle completion verification

    const minTimes = {
      'p30': 2,   // 4 pieces minimum 2 seconds
      'p56': 10,  // 56 pieces minimum 10 seconds
      'p99': 20,  // 99 pieces minimum 20 seconds
      'p143': 30, // 143 pieces minimum 30 seconds
      'p304': 60  // 304 pieces minimum 60 seconds
    };

    if (timeInSeconds < minTimes[difficulty]) {
      throw new Error('Completion time too fast to be valid');
    }

    return {
      productId: productId.toString(),
      difficulty,
      timeInSeconds: Math.floor(timeInSeconds),
      customerId: customerId.toString(),
      shopId: shopId || 'unknown',
      submittedAt: new Date()
    };
  }

  static async getLeaderboard(productId, difficulty, limit = 10, shopId = null) {
    try {
      let query = this.db.collection('scores')
        .where('productId', '==', productId.toString())
        .where('difficulty', '==', difficulty)
        .where('verified', '==', true)
        .orderBy('timeInSeconds', 'asc')
        .limit(limit);

      // Filter by shop if specified
      if (shopId) {
        query = query.where('shopId', '==', shopId);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }

      // Get player nicknames for each score
      const scores = [];
      for (const doc of snapshot.docs) {
        const scoreData = doc.data();
        
        // Get player nickname
        const playerDoc = await this.db
          .collection('playerProfiles')
          .doc(scoreData.customerId)
          .get();
        
        const nickname = playerDoc.exists ? playerDoc.data().nickname : 'Anonymous';
        
        scores.push({
          id: doc.id,
          nickname,
          timeInSeconds: scoreData.timeInSeconds,
          createdAt: scoreData.createdAt,
          difficulty: scoreData.difficulty,
          verified: scoreData.verified
        });
      }

      return scores;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw new Error('Failed to get leaderboard');
    }
  }

  static async getPlayerStats(customerId) {
    try {
      const playerRef = this.db.collection('playerProfiles').doc(customerId.toString());
      const playerDoc = await playerRef.get();
      
      if (!playerDoc.exists) {
        return null;
      }

      const playerData = playerDoc.data();
      
      // Get recent scores
      const scoresSnapshot = await this.db
        .collection('scores')
        .where('customerId', '==', customerId.toString())
        .where('verified', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const recentScores = scoresSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        profile: {
          id: playerDoc.id,
          ...playerData
        },
        recentScores,
        totalGames: playerData.totalGames || 0,
        bestTimes: playerData.bestTimes || {},
        achievements: playerData.achievements || []
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw new Error('Failed to get player stats');
    }
  }

  static async createGameSession(sessionData) {
    try {
      const sessionRef = this.db.collection('gameSessions').doc();
      
      const session = {
        ...sessionData,
        startedAt: new Date(),
        status: 'active',
        moves: [],
        completed: false
      };

      await sessionRef.set(session);

      return {
        id: sessionRef.id,
        ...session
      };
    } catch (error) {
      console.error('Error creating game session:', error);
      throw new Error('Failed to create game session');
    }
  }

  static async updateGameSession(sessionId, updates) {
    try {
      const sessionRef = this.db.collection('gameSessions').doc(sessionId);
      
      await sessionRef.update({
        ...updates,
        updatedAt: new Date()
      });

      const updatedDoc = await sessionRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating game session:', error);
      throw new Error('Failed to update game session');
    }
  }
}

export { app as firebaseAdmin, db as firebaseDb };