/**
 * Quick script to check how many people have played freeplay mode
 * Run this in the browser console on your deployed site
 */

async function checkFreeplayCount() {
    try {
        const url = `${window.FIREBASE_CONFIG.databaseURL}/events/freeplay/participants.json`;
        
        console.log('Fetching freeplay data from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('Failed to fetch:', response.status, response.statusText);
            return;
        }
        
        const participants = await response.json();
        
        if (!participants) {
            console.log('📊 No freeplay participants found yet');
            return;
        }
        
        const participantArray = Object.values(participants);
        const count = participantArray.length;
        
        console.log(`📊 Total freeplay participants: ${count}`);
        console.log('\nParticipant details:');
        participantArray.forEach((p, index) => {
            console.log(`  ${index + 1}. Score: ${p.score}, Created: ${new Date(p.createdAt).toLocaleString()}`);
        });
        
        // Calculate some basic stats
        const scores = participantArray.map(p => p.score);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        
        console.log('\n📈 Statistics:');
        console.log(`  Average Score: ${avgScore.toFixed(1)}`);
        console.log(`  Min Score: ${minScore}`);
        console.log(`  Max Score: ${maxScore}`);
        
    } catch (error) {
        console.error('Error checking freeplay count:', error);
    }
}

// Run the check
checkFreeplayCount();
