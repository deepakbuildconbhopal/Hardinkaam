const admin = require('firebase-admin');
const { getSecurityRules } = require('firebase-admin/security-rules');
const fs = require('fs');

const firebaseConfig = require('./firebase-applet-config.json');

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
} catch (e) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function deploy() {
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');
  const rules = getSecurityRules();
  
  try {
    console.log('Compiling ruleset from source string...');
    const file = rules.createRulesFileFromSource('firestore.rules', rulesContent);
    const ruleset = await rules.createRuleset(file);
    const databaseName = firebaseConfig.firestoreDatabaseId || 'ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57';
    console.log(`Releasing ruleset to ${databaseName}...`);
    await rules.releaseFirestoreRuleset(ruleset, databaseName);
    fs.writeFileSync('deploy_status.txt', 'SUCCESS: Rules deployed successfully!', 'utf8');
    console.log('Rules deployed successfully!');
  } catch (error) {
    fs.writeFileSync('deploy_status.txt', 'ERROR: ' + error.message + '\n\n' + JSON.stringify(error, null, 2), 'utf8');
    console.error('Deployment failed:', error.message);
  }
}

deploy();
