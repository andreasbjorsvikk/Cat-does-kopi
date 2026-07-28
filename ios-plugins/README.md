# MapboxOfflinePlugin — Local Capacitor Plugin

## Setup

Copy both files into your Xcode project's App target:

1. In Xcode, right-click on `ios/App/App` → "Add Files to App..."
2. Select **both** `MapboxOfflinePlugin.swift` and `MapboxOfflinePlugin.m`
3. Ensure "Copy items if needed" is checked
4. Ensure target "App" is selected
5. Build the project (Cmd+B)

## Why both files are needed

- The `.swift` file contains the plugin logic (subclass of `CAPPlugin`)
- The `.m` file contains Objective-C macros (`CAP_PLUGIN`, `CAP_PLUGIN_METHOD`) 
  that register the plugin with Capacitor's bridge at compile time
- Without the `.m` file, Capacitor cannot discover the plugin

## JS side

The plugin is registered in JS as `MapboxOffline`:
```typescript
import { registerPlugin } from '@capacitor/core';
const MapboxOffline = registerPlugin('MapboxOffline');
await MapboxOffline.test(); // { message: "MapboxOfflinePlugin works!" }
```

## Note on `npx cap sync ios`

Local plugins (inside the app target) are NOT listed during `npx cap sync`.
Only npm-packaged plugins appear in the sync output.
Local plugins are discovered at **compile time** via the ObjC macros.
You will know it works when `test()` resolves successfully on device.
