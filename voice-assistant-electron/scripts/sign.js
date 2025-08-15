#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '../dist/mac/Voice Assistant.app');
const DMG_PATH = path.join(__dirname, '../dist/Voice Assistant-1.0.0.dmg');

function runCommand(command) {
  try {
    console.log(`🔧 Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

function checkRequirements() {
  console.log('🔍 Checking code signing requirements...');

  // Check if we're on macOS
  if (process.platform !== 'darwin') {
    console.error('❌ Code signing is only supported on macOS');
    return false;
  }

  // Check if Xcode command line tools are installed
  try {
    execSync('xcode-select --print-path', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Xcode command line tools not found. Please install them first:');
    console.error('   xcode-select --install');
    return false;
  }

  // Check if app exists
  if (!fs.existsSync(APP_PATH)) {
    console.error(`❌ App not found at: ${APP_PATH}`);
    console.error('   Please build the app first: npm run build:mac');
    return false;
  }

  return true;
}

function getDeveloperIdentity() {
  try {
    const output = execSync('security find-identity -v -p codesigning', { encoding: 'utf8' });
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Developer ID Application') || line.includes('Apple Development')) {
        const match = line.match(/([A-F0-9]{40})/);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to find developer identity');
    return null;
  }
}

function signApp() {
  console.log('🔐 Starting code signing process...');

  const identity = getDeveloperIdentity();
  if (!identity) {
    console.error('❌ No valid developer identity found');
    console.error('   Please ensure you have a valid Apple Developer certificate');
    return false;
  }

  console.log(`✅ Found developer identity: ${identity}`);

  // Sign the app
  const signCommand = `codesign --force --deep --sign "${identity}" --entitlements build/entitlements.mac.plist "${APP_PATH}"`;
  if (!runCommand(signCommand)) {
    return false;
  }

  // Verify the signature
  const verifyCommand = `codesign --verify --deep --strict "${APP_PATH}"`;
  if (!runCommand(verifyCommand)) {
    return false;
  }

  console.log('✅ App signed successfully!');
  return true;
}

function notarizeApp() {
  console.log('📤 Starting notarization process...');

  // Check if we have notarization credentials
  const appleId = process.env.APPLE_ID;
  const appSpecificPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;

  if (!appleId || !appSpecificPassword) {
    console.warn('⚠️ Notarization credentials not found in environment variables');
    console.warn('   Set APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD to enable notarization');
    return false;
  }

  // Create a zip file for notarization
  const zipPath = path.join(__dirname, '../dist/Voice Assistant.zip');
  const zipCommand = `ditto -c -k --keepParent "${APP_PATH}" "${zipPath}"`;
  if (!runCommand(zipCommand)) {
    return false;
  }

  // Submit for notarization
  const notarizeCommand = `xcrun notarytool submit "${zipPath}" --apple-id "${appleId}" --password "${appSpecificPassword}" --team-id "${process.env.APPLE_TEAM_ID || ''}" --wait`;
  if (!runCommand(notarizeCommand)) {
    return false;
  }

  // Staple the notarization ticket
  const stapleCommand = `xcrun stapler staple "${APP_PATH}"`;
  if (!runCommand(stapleCommand)) {
    return false;
  }

  console.log('✅ App notarized successfully!');
  return true;
}

function createDMG() {
  console.log('📦 Creating DMG...');

  if (fs.existsSync(DMG_PATH)) {
    fs.unlinkSync(DMG_PATH);
  }

  const createDMGCommand = `create-dmg --volname "Voice Assistant" --window-pos 200 120 --window-size 600 400 --icon-size 100 --icon "Voice Assistant.app" 175 120 --hide-extension "Voice Assistant.app" --app-drop-link 425 120 "${DMG_PATH}" "${APP_PATH}"`;

  if (!runCommand(createDMGCommand)) {
    console.warn('⚠️ DMG creation failed. You may need to install create-dmg:');
    console.warn('   brew install create-dmg');
    return false;
  }

  console.log('✅ DMG created successfully!');
  return true;
}

function main() {
  console.log('🚀 Starting Voice Assistant code signing process...\n');

  if (!checkRequirements()) {
    process.exit(1);
  }

  if (!signApp()) {
    process.exit(1);
  }

  if (!notarizeApp()) {
    console.warn('⚠️ Notarization failed, but app is still signed');
  }

  if (!createDMG()) {
    console.warn('⚠️ DMG creation failed, but app is still signed');
  }

  console.log('\n🎉 Code signing process completed!');
  console.log(`📱 Signed app: ${APP_PATH}`);
  if (fs.existsSync(DMG_PATH)) {
    console.log(`📦 DMG file: ${DMG_PATH}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { signApp, notarizeApp, createDMG };
