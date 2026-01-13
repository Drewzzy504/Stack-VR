# Stack Void VR - Setup & Testing Guide

Complete guide for testing and deploying the VR version of Stack Void to your Oculus Quest headset.

## 🎮 What's Been Created

You now have **two versions** of your game:

1. **Original Version** (`index-new.html`) - Desktop/mobile with touch controls
2. **VR Version** (`index-vr.html`) - Oculus Quest with controller support

Both versions share the same game logic, so they play identically - just different input methods!

---

## 🧪 Testing Options

### Option 1: Desktop Browser (Quick Test)

Test VR functionality without a headset using the WebXR Emulator.

**Step 1: Install WebXR Emulator**
- **Chrome/Edge:** [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator/mjddjgeghkdijejnciaefnkjmkafnnje)

**Step 2: Start Local Server**

```powershell
# Navigate to your project directory
cd "c:\Users\Drew\Desktop\Stack & Snap"

# Start HTTP server (choose one):
npx http-server -p 8080
# OR if you have Python:
python -m http.server 8080
```

**Step 3: Open in Browser**

Navigate to: `http://localhost:8080/index-vr.html`

**Step 4: Test VR Mode**

1. Look for "Enter VR" button at bottom of screen
2. Open browser DevTools (F12)
3. Find WebXR tab (from the emulator extension)
4. Select "Oculus Quest" or similar device
5. Click "Enter VR" button
6. Use emulated controllers to test gameplay

---

### Option 2: Oculus Quest (Real VR Testing)

Deploy directly to your Quest headset over WiFi.

**Requirements:**
- Oculus Quest (1, 2, or 3)
- Computer and Quest on **same WiFi network**
- HTTPS connection (or localhost exception)

#### Method A: Local Network Testing

**Step 1: Find Your Computer's IP Address**

```powershell
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter (usually `192.168.x.x`)

**Step 2: Start Server**

```powershell
cd "c:\Users\Drew\Desktop\Stack & Snap"
npx http-server -p 8080
```

**Step 3: Open on Quest**

1. Put on your Quest headset
2. Open **Browser** app
3. Navigate to: `http://YOUR_IP:8080/index-vr.html`
   - Example: `http://192.168.1.100:8080/index-vr.html`
4. Click "Enter VR" button with controller
5. Pull triggers to play!

> [!WARNING]
> **WebXR requires HTTPS** for most features. If you get errors, you may need to use localhost tunneling (see Method B) or deploy to a proper HTTPS server.

#### Method B: Using Localhost Tunneling (Recommended)

Use a service like **ngrok** to create an HTTPS tunnel:

**Step 1: Install ngrok**

```powershell
# Download from https://ngrok.com/download
# Or use chocolatey:
choco install ngrok
```

**Step 2: Start Your Server**

```powershell
cd "c:\Users\Drew\Desktop\Stack & Snap"
npx http-server -p 8080
```

**Step 3: Create Tunnel**

```powershell
# In a new terminal:
ngrok http 8080
```

**Step 4: Open Provided HTTPS URL on Quest**

Copy the `https://` URL ngrok provides (e.g., `https://abc123.ngrok.io`) and open it in Quest browser, then add `/index-vr.html`

---

## 🎮 VR Controls

### In VR Mode:

| Action | Control |
|--------|---------|
| **Drop Block** | Either controller trigger |
| **Navigate Menus** | Point controller at buttons, pull trigger |
| **Look Around** | Natural head movement |

### Desktop Preview Mode (before entering VR):

| Action | Control |
|--------|---------|
| **Drop Block** | Mouse click or tap |
| **Enter VR** | Click "Enter VR" button |

---

## 📱 Deploying to Production

To make your VR game publicly accessible:

### Option 1: GitHub Pages (Free)

```powershell
# If using git:
git add .
git commit -m "Add VR version"
git push origin main
```

Then enable GitHub Pages in your repository settings. Your game will be at:
`https://YOUR_USERNAME.github.io/YOUR_REPO/index-vr.html`

### Option 2: Netlify/Vercel (Free, HTTPS)

Both services auto-deploy from Git and provide HTTPS:

1. Connect your repository
2. Deploy (automatic)
3. Share the link: `https://your-site.netlify.app/index-vr.html`

---

## 🎯 VR-Specific Features

### What's Different in VR:

1. **3D UI Elements**
   - Score and combo displayed as floating 3D text
   - UI follows your view as tower grows
   
2. **Controller Visualization**
   - Colorful laser pointers from controllers
   - Visual feedback on button press

3. **VR Camera**
   - Positioned 8 meters from tower for optimal viewing
   - Smoothly follows tower upward as you stack
   - No rotation (prevents motion sickness)

4. **Immersive Environment**
   - Full 360° view of space environment
   - Orbiting Saturn visible in background
   - Starfield wraps around you

---

## ❓ Troubleshooting

### "Enter VR" button doesn't appear
- **Cause:** Browser doesn't support WebXR or no VR device detected
- **Fix:** Use Chrome/Edge browser, install WebXR Emulator for testing

### Game loads but won't enter VR on Quest
- **Cause:** Non-HTTPS connection
- **Fix:** Use ngrok for HTTPS tunnel or deploy to HTTPS hosting

### Controllers not working in VR
- **Cause:** Controllers not paired or low battery
- **Fix:** Check Quest controller pairing and battery levels

### Performance issues (lag/stuttering)
- **Cause:** Quest hardware limitations
- **Fix:** Game auto-adjusts quality. Close other apps on Quest for better performance.

### Can't access from Quest browser
- **Cause:** Firewall blocking or wrong IP
- **Fix:** 
  1. Check firewall allows port 8080
  2. Verify IP address with `ipconfig`
  3. Ensure same WiFi network

---

## 🔧 Advanced: Customizing VR Experience

All VR-specific code is isolated in:
- `index-vr.html` - Entry point
- `js/graphics-vr.js` - VR rendering & camera
- `js/main-vr.js` - VR input & animation loop

### Adjusting Camera Position

Edit `js/graphics-vr.js`, line ~461:

```javascript
// Current: 8 meters away, 4 meters up
camera.position.set(0, 4, 8);

// Closer view:
camera.position.set(0, 4, 5);

// Bird's eye view:
camera.position.set(0, 10, 6);
```

### Changing UI Position

Edit `js/graphics-vr.js`, line ~273:

```javascript
// Current position
uiGroup.position.set(0, 12, -2);

// Move UI higher/lower
uiGroup.position.set(0, 15, -2); // Higher
```

---

## 📝 Next Steps

1. ✅ **Test in Desktop Browser** - Verify VR button appears
2. ✅ **Test on Quest** - Deploy to headset and play a full game
3. 🎨 **Customize** - Adjust camera/UI to your preference
4. 🌐 **Deploy** - Share with the world!

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify all files are in correct locations
3. Ensure Quest browser is up to date
4. Try both HTTP (local) and HTTPS (ngrok) methods

**File Structure:**
```
Stack & Snap/
├── index-new.html          (Original)
├── index-vr.html           (VR Version) ⭐
├── css/
│   └── styles.css
└── js/
    ├── main.js             (Original)
    ├── main-vr.js          (VR Main) ⭐
    ├── graphics.js         (Original)
    ├── graphics-vr.js      (VR Graphics) ⭐
    ├── game.js             (Shared)
    ├── powerups.js         (Shared)
    ├── effects.js          (Shared)
    └── ... (all other shared files)
```

Enjoy your VR game! 🥽🎮
