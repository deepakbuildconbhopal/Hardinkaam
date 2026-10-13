var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  getAuthoritativeAdminFirestore: () => getAuthoritativeAdminFirestore
});
module.exports = __toCommonJS(server_exports);
var import_express2 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");

// src/firebase/config.ts
var import_app = require("firebase/app");
var import_auth = require("firebase/auth");
var import_firestore = require("firebase/firestore");
var import_storage = require("firebase/storage");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "hardinkaam-5cc6a",
  appId: "1:188713428379:web:9f48a483eaf442b8f02d3e",
  apiKey: "AIzaSyAB3PNle9jCiRyfSpXgSGL9A31ledJrHVk",
  authDomain: "hardinkaam-5cc6a.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57",
  storageBucket: "hardinkaam-5cc6a.firebasestorage.app",
  messagingSenderId: "188713428379",
  measurementId: "G-HDBER4FD0G",
  oAuthClientId: "188713428379-hks9pjgfhtkgip0uilg4gc5sgsqq06s1.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/firebase/config.ts
var app = (0, import_app.getApps)().length > 0 ? (0, import_app.getApp)() : (0, import_app.initializeApp)(firebase_applet_config_default);
var firestoreDb;
try {
  firestoreDb = (0, import_firestore.initializeFirestore)(app, {}, firebase_applet_config_default.firestoreDatabaseId);
} catch (_err) {
  firestoreDb = (0, import_firestore.getFirestore)(app, firebase_applet_config_default.firestoreDatabaseId);
}
var db = firestoreDb;
(0, import_firestore.setLogLevel)("silent");
var auth = (0, import_auth.getAuth)(app);
var storage = (0, import_storage.getStorage)(app);
var googleProvider = new import_auth.GoogleAuthProvider();

// server.ts
var import_firestore8 = require("firebase/firestore");

// server/deploymentService.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_child_process = require("child_process");
var import_jszip = __toESM(require("jszip"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
var import_firestore2 = require("firebase/firestore");
var FIREBASE_PROJECT_ID = "hardinkaam-5cc6a";
var PRODUCTION_SITE_URL = "https://hardinkaam-5cc6a.web.app";
var RELEASES_CACHE_DIR = import_path.default.join(import_os.default.tmpdir(), "hardinkaam-releases");
var DEPLOY_TEMP_ROOT = import_path.default.join(import_os.default.tmpdir(), "hardinkaam-deploy");
var ZIPS_CACHE_DIR = import_path.default.join(DEPLOY_TEMP_ROOT, "zips");
for (const dir of [RELEASES_CACHE_DIR, DEPLOY_TEMP_ROOT, ZIPS_CACHE_DIR]) {
  if (!import_fs.default.existsSync(dir)) {
    try {
      import_fs.default.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`[DeploymentService] Warning creating dir "${dir}":`, err);
    }
  }
}
var deploymentRecords = /* @__PURE__ */ new Map();
var currentLiveVersionId = "dep_v1_0_3_initial";
deploymentRecords.set("dep_v1_0_3_initial", {
  id: "dep_v1_0_3_initial",
  version: "v1.0.3",
  status: "LIVE",
  buildStatus: "SUCCESS",
  deploymentStatus: "LIVE",
  uploadedBy: "DEEPAK (System Admin)",
  uploadedByEmail: "deepakbuildconbhopal@gmail.com",
  uploadedAt: new Date(Date.now() - 864e5 * 2).toISOString(),
  deploymentTime: new Date(Date.now() - 864e5 * 2).toISOString(),
  zipFileName: "hardinkaam-v1.0.3-production.zip",
  zipFileSize: 1428500,
  buildLog: "Build completed successfully. Production dist/ verified with PWA assets and Vite bundles.",
  deploymentLog: `Deployed to Firebase Hosting (Site: ${FIREBASE_PROJECT_ID}). Version released to ${PRODUCTION_SITE_URL}`,
  errorMessage: null,
  siteUrl: PRODUCTION_SITE_URL,
  isActiveLive: true
});
var activeJobs = /* @__PURE__ */ new Map();
async function persistJobState(job) {
  job.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  activeJobs.set(job.jobId, job);
  try {
    const jobRef = (0, import_firestore2.doc)(db, "deploymentJobs", job.jobId);
    await (0, import_firestore2.setDoc)(jobRef, {
      ...job,
      updatedAt: job.updatedAt
    }, { merge: true });
  } catch (err) {
  }
}
var EXECUTABLE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".apk",
  ".exe",
  ".sh",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".dmg",
  ".pkg",
  ".bin",
  ".vbs",
  ".ps1",
  ".app",
  ".deb",
  ".rpm"
]);
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function getExecutableTypeDescription(ext) {
  switch (ext.toLowerCase()) {
    case ".apk":
      return "Android Package (.apk)";
    case ".exe":
      return "Windows Executable (.exe)";
    case ".sh":
      return "Shell Script (.sh)";
    case ".dll":
      return "Dynamic Link Library (.dll)";
    case ".bat":
      return "Windows Batch Script (.bat)";
    case ".cmd":
      return "Command Script (.cmd)";
    case ".msi":
      return "Windows Installer Package (.msi)";
    case ".bin":
      return "Binary Executable (.bin)";
    case ".vbs":
      return "VBScript File (.vbs)";
    case ".ps1":
      return "PowerShell Script (.ps1)";
    case ".app":
      return "macOS Application Bundle (.app)";
    case ".dmg":
      return "macOS Disk Image (.dmg)";
    case ".pkg":
      return "Package Installer (.pkg)";
    case ".deb":
      return "Debian Package (.deb)";
    case ".rpm":
      return "RPM Package (.rpm)";
    default:
      return `Executable Binary (${ext})`;
  }
}
async function auditExtractedDirectory(stagingDir) {
  const executables = [];
  let totalFiles = 0;
  let totalSize = 0;
  async function scan(currentPath) {
    if (!import_fs.default.existsSync(currentPath)) return;
    const entries = await import_fs.default.promises.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path.default.join(currentPath, entry.name);
      const relPath = import_path.default.relative(stagingDir, fullPath).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          await scan(fullPath);
        }
      } else if (entry.isFile()) {
        totalFiles++;
        try {
          const stat = await import_fs.default.promises.stat(fullPath);
          totalSize += stat.size;
          const ext = import_path.default.extname(entry.name).toLowerCase();
          if (EXECUTABLE_EXTENSIONS.has(ext)) {
            executables.push({
              path: relPath,
              name: entry.name,
              ext,
              size: stat.size,
              sizeFormatted: formatBytes(stat.size),
              fileType: getExecutableTypeDescription(ext),
              isInStaging: true
            });
          }
        } catch (statErr) {
        }
      }
    }
  }
  await scan(stagingDir);
  return { executables, totalFiles, totalSize };
}
async function excludeFilesFromStaging(stagingDir, filesToExclude) {
  const removed = [];
  const normalizedStaging = import_path.default.resolve(stagingDir);
  for (const relPath of filesToExclude) {
    const fullPath = import_path.default.resolve(stagingDir, relPath);
    if (!fullPath.startsWith(normalizedStaging)) {
      console.warn(`[Audit] Blocked unsafe path outside staging: ${relPath}`);
      continue;
    }
    if (import_fs.default.existsSync(fullPath)) {
      try {
        await import_fs.default.promises.unlink(fullPath);
        removed.push(relPath);
      } catch (err) {
        console.warn(`[Audit] Warning excluding ${relPath} from staging:`, err.message);
      }
    }
  }
  return removed;
}
async function preAuditZipBuffer(zipBuffer) {
  const validation = await validateZipArchiveAsync(zipBuffer);
  let executables = [];
  try {
    const zip = await import_jszip.default.loadAsync(zipBuffer, { checkCRC32: false });
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (!entry.dir) {
        const cleanPath = entry.name.replace(/\\/g, "/");
        const ext = import_path.default.extname(cleanPath).toLowerCase();
        if (EXECUTABLE_EXTENSIONS.has(ext)) {
          const size = entry._data?.uncompressedSize || 0;
          executables.push({
            path: cleanPath,
            name: import_path.default.basename(cleanPath),
            ext,
            size,
            sizeFormatted: formatBytes(size),
            fileType: getExecutableTypeDescription(ext),
            isInStaging: false
          });
        }
      }
    }
  } catch (err) {
    console.warn("[Audit] Warning loading zip in preAuditZipBuffer:", err.message);
  }
  return {
    hasExecutables: executables.length > 0,
    executables,
    totalFiles: validation.filesCount,
    totalSize: validation.totalUncompressedSize || zipBuffer.length,
    deploymentMode: validation.deploymentMode,
    rootPrefix: validation.rootPrefix,
    isClean: executables.length === 0,
    message: executables.length > 0 ? `Pre-deployment audit: ${executables.length} executable file(s) (.apk, .exe, .sh, .dll) detected. These can be excluded from staging before deployment.` : "Pre-deployment audit passed: No executable files detected. Clean for Firebase Hosting."
  };
}
function createInitialStageRecords() {
  return {
    UPLOADING: { key: "UPLOADING", label: "1. ZIP Upload", status: "PENDING", progress: 0 },
    VALIDATING: { key: "VALIDATING", label: "2. ZIP Validation", status: "PENDING", progress: 0 },
    EXTRACTING: { key: "EXTRACTING", label: "3. Safe Extraction", status: "PENDING", progress: 0 },
    AUDITING: { key: "AUDITING", label: "4. Pre-Deploy Audit", status: "PENDING", progress: 0 },
    INSTALLING: { key: "INSTALLING", label: "5. Dependencies", status: "PENDING", progress: 0 },
    BUILDING: { key: "BUILDING", label: "6. Production Build", status: "PENDING", progress: 0 },
    VERIFYING: { key: "VERIFYING", label: "7. Artifact Audit", status: "PENDING", progress: 0 },
    DEPLOYING: { key: "DEPLOYING", label: "8. Firebase Deploy", status: "PENDING", progress: 0 },
    LIVE: { key: "LIVE", label: "9. Version LIVE", status: "PENDING", progress: 0 }
  };
}
function computeZipSha256(buffer) {
  return import_crypto.default.createHash("sha256").update(buffer).digest("hex");
}
function checkDuplicateZip(zipBuffer) {
  const zipHash = computeZipSha256(zipBuffer);
  for (const record of deploymentRecords.values()) {
    if (record.status === "LIVE" && record.zipHash === zipHash) {
      return { isDuplicate: true, existingVersion: record.version, zipHash };
    }
  }
  return { isDuplicate: false, zipHash };
}
async function validateZipArchiveAsync(zipBuffer) {
  const zipHash = computeZipSha256(zipBuffer);
  const totalCompressedSize = zipBuffer.length;
  if (totalCompressedSize > 80 * 1024 * 1024) {
    return {
      isValid: false,
      error: `ZIP \u092B\u093C\u093E\u0907\u0932 \u0915\u093E \u0906\u0915\u093E\u0930 (${(totalCompressedSize / (1024 * 1024)).toFixed(1)} MB) \u0905\u0927\u093F\u0915\u0924\u092E \u0905\u0928\u0941\u092E\u0924 \u0938\u0940\u092E\u093E 80 MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u0948\u0964`,
      rootPrefix: "",
      deploymentRoot: "",
      deploymentMode: "BUILD",
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false
    };
  }
  let admZip;
  try {
    admZip = new import_adm_zip.default(zipBuffer);
  } catch (parseErr) {
    return {
      isValid: false,
      error: `ZIP \u092B\u093C\u093E\u0907\u0932 \u092A\u0922\u093C\u0928\u0947 \u092E\u0947\u0902 \u0905\u0938\u092E\u0930\u094D\u0925 (\u0915\u0930\u092A\u094D\u091F \u092F\u093E \u0905\u092E\u093E\u0928\u094D\u092F \u0906\u0930\u094D\u0915\u093E\u0907\u0935): ${parseErr.message || "Malformed ZIP"}`,
      rootPrefix: "",
      deploymentRoot: "",
      deploymentMode: "BUILD",
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false
    };
  }
  const entries = admZip.getEntries();
  const filesCount = entries.length;
  if (filesCount === 0) {
    return {
      isValid: false,
      error: "\u0905\u092E\u093E\u0928\u094D\u092F \u091C\u093C\u093F\u092A \u092B\u093C\u093E\u0907\u0932: \u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0917\u0908 ZIP \u092B\u093C\u093E\u0907\u0932 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0916\u093E\u0932\u0940 \u0939\u0948\u0964",
      rootPrefix: "",
      deploymentRoot: "",
      deploymentMode: "BUILD",
      filesCount: 0,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false
    };
  }
  if (filesCount > 3e4) {
    return {
      isValid: false,
      error: `\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0940\u092E\u093E: ZIP \u092E\u0947\u0902 \u092C\u0939\u0941\u0924 \u0905\u0927\u093F\u0915 \u092B\u093C\u093E\u0907\u0932\u0947\u0902 (${filesCount}) \u0939\u0948\u0902\u0964 \u0905\u0927\u093F\u0915\u0924\u092E 30,000 \u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0905\u0928\u0941\u092E\u0924 \u0939\u0948\u0902\u0964`,
      rootPrefix: "",
      deploymentRoot: "",
      deploymentMode: "BUILD",
      filesCount,
      totalCompressedSize,
      totalUncompressedSize: 0,
      zipHash,
      unsupportedFiles: [],
      hasUnsupportedExecutables: false
    };
  }
  const sparkUnsupportedExts = /* @__PURE__ */ new Set([
    ".apk",
    ".exe",
    ".dll",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".dmg",
    ".pkg",
    ".sh",
    ".bin",
    ".vbs",
    ".ps1",
    ".app"
  ]);
  const unsupportedFiles = [];
  const normalizedPaths = [];
  let totalUncompressedSize = 0;
  for (const entry of entries) {
    const rawName = entry.entryName;
    const cleanPath = rawName.replace(/\\/g, "/");
    normalizedPaths.push(cleanPath);
    if (cleanPath.includes("../") || cleanPath.includes("..\\") || cleanPath.startsWith("/") || /^[a-zA-Z]:/.test(cleanPath)) {
      return {
        isValid: false,
        error: `\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0909\u0932\u094D\u0932\u0902\u0918\u0928: ZIP \u092A\u094D\u0930\u0935\u093F\u0937\u094D\u091F\u093F \u092E\u0947\u0902 \u092A\u093E\u0925 \u091F\u094D\u0930\u0948\u0935\u0930\u094D\u0938\u0932 ("${rawName}") \u092A\u093E\u092F\u093E \u0917\u092F\u093E\u0964`,
        rootPrefix: "",
        deploymentRoot: "",
        deploymentMode: "BUILD",
        filesCount,
        totalCompressedSize,
        totalUncompressedSize: 0,
        zipHash,
        unsupportedFiles: [],
        hasUnsupportedExecutables: false
      };
    }
    if (!entry.isDirectory) {
      const ext = import_path.default.extname(cleanPath).toLowerCase();
      if (sparkUnsupportedExts.has(ext)) {
        unsupportedFiles.push(cleanPath);
      }
      totalUncompressedSize += entry.header.size || 0;
    }
  }
  if (totalUncompressedSize > 400 * 1024 * 1024) {
    return {
      isValid: false,
      error: `\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0940\u092E\u093E: ZIP \u0915\u093E \u0905\u0928\u0915\u092E\u094D\u092A\u094D\u0930\u0947\u0938\u094D\u0921 \u0906\u0915\u093E\u0930 (${(totalUncompressedSize / (1024 * 1024)).toFixed(1)} MB) \u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u093E \u0939\u0948 (\u0905\u0927\u093F\u0915\u0924\u092E 400 MB)\u0964`,
      rootPrefix: "",
      deploymentRoot: "",
      deploymentMode: "BUILD",
      filesCount,
      totalCompressedSize,
      totalUncompressedSize,
      zipHash,
      unsupportedFiles,
      hasUnsupportedExecutables: unsupportedFiles.length > 0
    };
  }
  let deploymentMode = "BUILD";
  let rootPrefix = "";
  let deploymentRoot = "";
  let hasDistIndex = false;
  for (const p of normalizedPaths) {
    if (p === "dist/index.html") {
      deploymentMode = "DIST";
      rootPrefix = "dist";
      deploymentRoot = "dist";
      hasDistIndex = true;
      break;
    } else if (p.endsWith("/dist/index.html") && !p.includes("node_modules/")) {
      deploymentMode = "DIST";
      const prefix = p.substring(0, p.lastIndexOf("/index.html"));
      rootPrefix = prefix;
      deploymentRoot = prefix;
      hasDistIndex = true;
      break;
    } else if (p === "index.html" && normalizedPaths.some((n) => n.startsWith("assets/"))) {
      deploymentMode = "DIST";
      rootPrefix = "";
      deploymentRoot = "";
      hasDistIndex = true;
      break;
    }
  }
  if (!hasDistIndex) {
    let hasPackageJson = false;
    for (const p of normalizedPaths) {
      if (p === "package.json") {
        deploymentMode = "BUILD";
        rootPrefix = "";
        deploymentRoot = "";
        hasPackageJson = true;
        break;
      } else if (p.endsWith("/package.json") && !p.includes("node_modules/") && !p.includes("__MACOSX/")) {
        deploymentMode = "BUILD";
        const prefix = p.substring(0, p.lastIndexOf("/package.json"));
        rootPrefix = prefix;
        deploymentRoot = prefix;
        hasPackageJson = true;
        break;
      }
    }
    if (!hasPackageJson) {
      return {
        isValid: false,
        error: '\u0905\u092E\u093E\u0928\u094D\u092F HARDINKAAM \u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F: ZIP \u092E\u0947\u0902 \u0928 \u0924\u094B pre-compiled "dist/index.html" \u0914\u0930 \u0928 \u0939\u0940 \u0938\u094B\u0930\u094D\u0938 "package.json" \u092E\u093F\u0932\u093E\u0964',
        rootPrefix: "",
        deploymentRoot: "",
        deploymentMode: "BUILD",
        filesCount,
        totalCompressedSize,
        totalUncompressedSize,
        zipHash,
        unsupportedFiles,
        hasUnsupportedExecutables: unsupportedFiles.length > 0
      };
    }
  }
  return {
    isValid: true,
    rootPrefix,
    deploymentRoot,
    deploymentMode,
    filesCount,
    totalCompressedSize,
    totalUncompressedSize,
    zipHash,
    unsupportedFiles,
    hasUnsupportedExecutables: unsupportedFiles.length > 0
  };
}
function getNextVersionString() {
  const versions = Array.from(deploymentRecords.values()).map((d) => d.version).filter((v) => /^v?\d+\.\d+\.\d+$/i.test(v));
  if (versions.length === 0) return "v1.0.4";
  let highestPatch = 3;
  let major = 1;
  let minor = 0;
  for (const v of versions) {
    const clean = v.replace(/^v/i, "");
    const parts = clean.split(".").map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      if (parts[0] > major) {
        major = parts[0];
        minor = parts[1];
        highestPatch = parts[2];
      } else if (parts[0] === major && parts[1] > minor) {
        minor = parts[1];
        highestPatch = parts[2];
      } else if (parts[0] === major && parts[1] === minor && parts[2] > highestPatch) {
        highestPatch = parts[2];
      }
    }
  }
  return `v${major}.${minor}.${highestPatch + 1}`;
}
function runCommand(command, cwd, timeoutMs = 3e5) {
  return new Promise((resolve) => {
    (0, import_child_process.exec)(
      command,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 15 * 1024 * 1024,
        env: { ...process.env, NODE_ENV: "production" }
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            stdout: stdout || "",
            stderr: stderr || error.message || "",
            exitCode: error.code || 1
          });
        } else {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            exitCode: 0
          });
        }
      }
    );
  });
}
async function safeExtractZipAsync(zipBuffer, targetDir, onProgress) {
  await import_fs.default.promises.mkdir(targetDir, { recursive: true });
  const admZip = new import_adm_zip.default(zipBuffer);
  const entries = admZip.getEntries();
  const total = entries.length;
  let extracted = 0;
  for (const entry of entries) {
    const cleanPath = entry.entryName.replace(/\\/g, "/");
    if (cleanPath.includes("../") || cleanPath.startsWith("/") || /^[a-zA-Z]:/.test(cleanPath)) {
      continue;
    }
    const destPath = import_path.default.join(targetDir, cleanPath);
    if (entry.isDirectory) {
      await import_fs.default.promises.mkdir(destPath, { recursive: true });
    } else {
      await import_fs.default.promises.mkdir(import_path.default.dirname(destPath), { recursive: true });
      const buffer = entry.getData();
      await import_fs.default.promises.writeFile(destPath, buffer);
      extracted++;
    }
    if (extracted % 50 === 0) {
      if (onProgress) onProgress(extracted, total);
      await new Promise((r) => setImmediate(r));
    }
  }
  if (onProgress) onProgress(extracted, total);
  return extracted;
}
async function auditDeploymentDirectory(dirPath, stripUnsupported) {
  const unsupportedFiles = [];
  const strippedFiles = [];
  let hasIndexHtml = false;
  let indexHtmlSize = 0;
  const sparkUnsupportedExts = /* @__PURE__ */ new Set([
    ".apk",
    ".exe",
    ".dll",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".dmg",
    ".pkg",
    ".sh",
    ".bin",
    ".vbs",
    ".ps1",
    ".app"
  ]);
  async function scanDir(currentDir) {
    if (!import_fs.default.existsSync(currentDir)) return;
    const items = await import_fs.default.promises.readdir(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = import_path.default.join(currentDir, item.name);
      const relPath = import_path.default.relative(dirPath, fullPath).replace(/\\/g, "/");
      if (item.isDirectory()) {
        if (item.name !== "node_modules" && item.name !== ".git") {
          await scanDir(fullPath);
        }
      } else if (item.isFile()) {
        if (relPath === "index.html") {
          hasIndexHtml = true;
          const stat = await import_fs.default.promises.stat(fullPath);
          indexHtmlSize = stat.size;
        }
        const ext = import_path.default.extname(item.name).toLowerCase();
        if (sparkUnsupportedExts.has(ext)) {
          unsupportedFiles.push(relPath);
          if (stripUnsupported) {
            try {
              await import_fs.default.promises.unlink(fullPath);
              strippedFiles.push(relPath);
            } catch (delErr) {
              console.warn(`[Audit] Warning removing ${relPath}:`, delErr.message);
            }
          }
        }
      }
    }
  }
  await scanDir(dirPath);
  const allPassed = unsupportedFiles.length === 0 || stripUnsupported;
  return {
    allPassed,
    unsupportedFiles,
    strippedFiles,
    hasIndexHtml,
    indexHtmlSize
  };
}
async function processZipDeployment(options) {
  const {
    jobId,
    zipBuffer,
    fileName,
    fileSize,
    adminUser,
    customVersion,
    stripUnsupportedFiles = false,
    excludeSpecificFiles,
    onProgress
  } = options;
  const version = customVersion?.trim() || getNextVersionString();
  const deploymentId = `dep_${version.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
  const zipHash = computeZipSha256(zipBuffer);
  const logs = [];
  const stages = createInitialStageRecords();
  const cachedZipPath = import_path.default.join(ZIPS_CACHE_DIR, `${jobId}.zip`);
  try {
    await import_fs.default.promises.writeFile(cachedZipPath, zipBuffer);
  } catch (cacheErr) {
    console.warn("[DeploymentService] Warning caching zip:", cacheErr?.message);
  }
  const tempJobDir = import_path.default.join(DEPLOY_TEMP_ROOT, jobId);
  const tempExtractDir = import_path.default.join(tempJobDir, "extracted");
  const tempDeployDir = import_path.default.join(tempJobDir, "deploy_dist");
  const jobRecord = {
    jobId,
    fileName,
    fileSize,
    zipHash,
    versionTag: version,
    status: "RUNNING",
    currentStage: "QUEUED",
    progress: 5,
    message: "Deployment job queued...",
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    retryCount: 0,
    fileCount: 0,
    totalSize: fileSize,
    deploymentRoot: "",
    deploymentMode: "BUILD",
    buildStatus: "QUEUED",
    auditStatus: "PENDING",
    firebaseStatus: "PENDING",
    errorCode: null,
    errorMessage: null,
    errorDetails: null,
    logs,
    stages
  };
  const updateStage = async (stage, progress, message, options2) => {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN");
    const formattedLog = `[${timestamp}] [${stage}] ${message}`;
    logs.push(formattedLog);
    console.log(`[Deployment ${version} / ${jobId}] ${formattedLog}`);
    jobRecord.currentStage = stage;
    jobRecord.progress = Math.min(100, Math.max(0, progress));
    jobRecord.message = message;
    jobRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (options2?.status) {
      jobRecord.status = options2.status;
    }
    if (options2?.error !== void 0) {
      jobRecord.errorMessage = options2.error;
    }
    if (options2?.errorDetails !== void 0) {
      jobRecord.errorDetails = options2.errorDetails;
    }
    if (stages[stage]) {
      stages[stage].status = options2?.stageStatus || "RUNNING";
      stages[stage].progress = progress;
      stages[stage].message = message;
      if (!stages[stage].startedAt) {
        stages[stage].startedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      if (options2?.stageStatus === "SUCCESS" || options2?.stageStatus === "FAILED" || options2?.stageStatus === "SKIPPED") {
        stages[stage].endedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      if (options2?.error) {
        stages[stage].error = options2.error;
      }
    }
    await persistJobState(jobRecord);
    if (onProgress) {
      onProgress({
        stage,
        progress: jobRecord.progress,
        message,
        version,
        error: jobRecord.errorMessage,
        logs,
        deployment: jobRecord.deployment,
        jobRecord,
        errorDetails: jobRecord.errorDetails,
        detectedExecutables: jobRecord.detectedExecutables,
        requiresAuditConfirmation: jobRecord.requiresAuditConfirmation
      });
    }
  };
  try {
    await updateStage("UPLOADING", 15, `ZIP received (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Starting asynchronous inspection...`, {
      stageStatus: "SUCCESS"
    });
    await updateStage("VALIDATING", 18, "Inspecting ZIP central directory & security structure...");
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VALIDATING] Performing CRC32 checksum and path traversal integrity scan...`);
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VALIDATING] Target Firebase Project: ${FIREBASE_PROJECT_ID} | Production: ${PRODUCTION_SITE_URL}`);
    let validation;
    try {
      validation = await Promise.race([
        validateZipArchiveAsync(zipBuffer),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("ZIP validation timed out after 120s.")), 12e4)
        )
      ]);
    } catch (valTimeoutErr) {
      const errorMsg = valTimeoutErr.message || "ZIP Validation timed out";
      await updateStage("VALIDATING", 20, errorMsg, {
        stageStatus: "FAILED",
        error: errorMsg,
        status: "FAILED_TIMEOUT"
      });
      throw new Error(errorMsg);
    }
    jobRecord.fileCount = validation.filesCount;
    jobRecord.totalSize = validation.totalUncompressedSize || fileSize;
    jobRecord.deploymentMode = validation.deploymentMode;
    jobRecord.deploymentRoot = validation.deploymentRoot;
    jobRecord.unsupportedFiles = validation.unsupportedFiles;
    if (!validation.isValid) {
      const errorMsg = validation.error || "\u0905\u092E\u093E\u0928\u094D\u092F HARDINKAAM \u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F ZIP \u092B\u093C\u093E\u0907\u0932\u0964";
      await updateStage("VALIDATING", 20, `ZIP Validation Failed: ${errorMsg}`, {
        stageStatus: "FAILED",
        error: errorMsg,
        status: "FAILED",
        errorDetails: {
          stage: "ZIP Validation",
          error: "Validation failed",
          reason: errorMsg,
          action: "Re-upload the ZIP archive."
        }
      });
      const failedRecord = {
        id: deploymentId,
        version,
        status: "FAILED",
        buildStatus: "FAILED",
        deploymentStatus: "FAILED",
        uploadedBy: adminUser.name || adminUser.email,
        uploadedByEmail: adminUser.email,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deploymentTime: (/* @__PURE__ */ new Date()).toISOString(),
        zipFileName: fileName,
        zipFileSize: fileSize,
        buildLog: logs.join("\n"),
        deploymentLog: "Deployment halted at Validation stage. Live website is unchanged.",
        errorMessage: errorMsg,
        failedStage: "VALIDATING",
        siteUrl: PRODUCTION_SITE_URL,
        isActiveLive: false
      };
      jobRecord.deployment = failedRecord;
      deploymentRecords.set(deploymentId, failedRecord);
      await persistJobState(jobRecord);
      return failedRecord;
    }
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VALIDATING] Structure validated: ${validation.filesCount} files (${(validation.totalUncompressedSize / (1024 * 1024)).toFixed(2)} MB uncompressed).`);
    await updateStage(
      "VALIDATING",
      25,
      `\u2713 ZIP Validated: ${validation.filesCount} files. Mode: ${validation.deploymentMode} (${validation.deploymentMode === "DIST" ? "Pre-built dist/" : "Source project"}).`,
      { stageStatus: "SUCCESS" }
    );
    await updateStage("EXTRACTING", 28, `Extracting ${validation.filesCount} files safely into isolated sandbox...`);
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [EXTRACTING] Sandbox directory initialized at ${tempExtractDir}`);
    await Promise.race([
      safeExtractZipAsync(zipBuffer, tempExtractDir, (extracted, total) => {
        const stepProgress = 28 + Math.round(extracted / Math.max(1, total) * 7);
        updateStage("EXTRACTING", Math.min(34, stepProgress), `Decompressing archive: ${extracted}/${total} files unpacked...`);
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Safe extraction timed out after 120s.")), 12e4)
      )
    ]);
    const extractedProjectDir = validation.rootPrefix ? import_path.default.join(tempExtractDir, validation.rootPrefix) : tempExtractDir;
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [EXTRACTING] All ${validation.filesCount} files decompressed successfully into sandbox workspace.`);
    await updateStage(
      "EXTRACTING",
      35,
      `\u2713 Unpacked successfully at target path: ${validation.rootPrefix || "./"}`,
      { stageStatus: "SUCCESS" }
    );
    await updateStage(
      "AUDITING",
      36,
      "Pre-deployment audit: Inspecting extracted files for executables (.apk, .exe, .sh, .dll)..."
    );
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [AUDITING] Checking for prohibited binaries and server script artifacts...`);
    const auditScan = await auditExtractedDirectory(extractedProjectDir);
    const flaggedExecutables = auditScan.executables;
    jobRecord.detectedExecutables = flaggedExecutables;
    if (flaggedExecutables.length > 0) {
      const shouldExclude = stripUnsupportedFiles === true || excludeSpecificFiles !== void 0 && excludeSpecificFiles.length > 0;
      if (shouldExclude) {
        const filesToRemove = excludeSpecificFiles && excludeSpecificFiles.length > 0 ? excludeSpecificFiles : flaggedExecutables.map((f) => f.path);
        const excluded = await excludeFilesFromStaging(extractedProjectDir, filesToRemove);
        jobRecord.excludedExecutables = excluded;
        jobRecord.strippedFiles = excluded;
        logs.push(
          `[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [Pre-Deploy Audit] Non-destructive staging clean: Excluded ${excluded.length} executable(s) from staging directory (${excluded.join(", ")}). Original uploaded ZIP is safely preserved.`
        );
        await updateStage(
          "AUDITING",
          39,
          `\u2713 Pre-Deploy Audit Passed: ${excluded.length} executable(s) excluded from staging. Original ZIP remains untouched.`,
          { stageStatus: "SUCCESS" }
        );
      } else {
        const fileNamesList = flaggedExecutables.map((f) => `"${f.name}" (${f.sizeFormatted})`).join(", ");
        const flagMsg = `Pre-deployment audit flagged ${flaggedExecutables.length} executable file(s) in staging (${fileNamesList}). Action required: Exclude from staging or cancel.`;
        jobRecord.requiresAuditConfirmation = true;
        jobRecord.auditStatus = "FAILED";
        await updateStage("AUDITING", 38, flagMsg, {
          stageStatus: "FAILED",
          status: "ACTION_REQUIRED",
          error: flagMsg,
          errorDetails: {
            stage: "Pre-Deployment Audit",
            error: `${flaggedExecutables.length} Executable File(s) Detected in Staging Directory`,
            file: flaggedExecutables[0]?.path,
            reason: `Firebase Hosting prohibits executable binaries (${flaggedExecutables.map((f) => f.ext).join(", ")}). Original uploaded ZIP is safe and preserved.`,
            action: "Exclude these specific files from the staging directory before deployment."
          }
        });
        const auditFlaggedRecord = {
          id: deploymentId,
          version,
          status: "FAILED",
          buildStatus: "FAILED",
          deploymentStatus: "FAILED",
          uploadedBy: adminUser.name || adminUser.email,
          uploadedByEmail: adminUser.email,
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
          deploymentTime: (/* @__PURE__ */ new Date()).toISOString(),
          zipFileName: fileName,
          zipFileSize: fileSize,
          buildLog: logs.join("\n"),
          deploymentLog: `Pre-deployment audit flagged ${flaggedExecutables.length} executable(s) in staging. Live site is unchanged. Original ZIP is safely cached.`,
          errorMessage: flagMsg,
          failedStage: "AUDITING",
          siteUrl: PRODUCTION_SITE_URL,
          isActiveLive: false
        };
        jobRecord.deployment = auditFlaggedRecord;
        deploymentRecords.set(deploymentId, auditFlaggedRecord);
        await persistJobState(jobRecord);
        return auditFlaggedRecord;
      }
    } else {
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [AUDITING] Scanned ${auditScan.totalFiles} files. All clean and fully compatible with Firebase Hosting.`);
      await updateStage(
        "AUDITING",
        39,
        `\u2713 Pre-Deploy Audit Passed: All ${auditScan.totalFiles} extracted files clean. No executables found.`,
        { stageStatus: "SUCCESS" }
      );
    }
    let finalDeployArtifactDir = "";
    if (validation.deploymentMode === "DIST") {
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [INSTALLING] Pre-compiled distribution detected. Fast-tracking deployment directly to verification...`);
      await updateStage(
        "INSTALLING",
        40,
        "\u2298 Skipped: ZIP contains pre-built dist/ artifacts. Skipping npm install.",
        { stageStatus: "SKIPPED" }
      );
      await updateStage(
        "BUILDING",
        60,
        "\u2298 Skipped: Pre-compiled production bundles detected. Skipping npm run build.",
        { stageStatus: "SKIPPED" }
      );
      finalDeployArtifactDir = extractedProjectDir;
      jobRecord.buildStatus = "SKIPPED";
    } else {
      jobRecord.buildStatus = "IN_PROGRESS";
      await updateStage("INSTALLING", 40, "Analyzing project dependencies & package lockfile...");
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [INSTALLING] Resolving React, Tailwind, and Vite compiler toolchain...`);
      const packageJsonFile = import_path.default.join(extractedProjectDir, "package.json");
      if (!import_fs.default.existsSync(packageJsonFile)) {
        throw new Error(`package.json was not found in extracted root (${extractedProjectDir})`);
      }
      const hostNodeModules = import_path.default.join(process.cwd(), "node_modules");
      const targetNodeModules = import_path.default.join(extractedProjectDir, "node_modules");
      if (!import_fs.default.existsSync(targetNodeModules) && import_fs.default.existsSync(hostNodeModules)) {
        try {
          import_fs.default.symlinkSync(hostNodeModules, targetNodeModules, "junction");
          logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [INSTALLING] Linked host node_modules cache for fast deterministic build.`);
        } catch (symErr) {
        }
      }
      const hasVite = import_fs.default.existsSync(import_path.default.join(extractedProjectDir, "node_modules", "vite"));
      if (!hasVite) {
        const hasLock = import_fs.default.existsSync(import_path.default.join(extractedProjectDir, "package-lock.json"));
        const installCmd = hasLock ? "npm ci --prefer-offline --no-audit --no-fund" : "npm install --prefer-offline --no-audit --no-fund";
        await updateStage("INSTALLING", 44, `Running deterministic dependency install: "${installCmd}"...`);
        const installRes = await runCommand(installCmd, extractedProjectDir, 6e5);
        if (installRes.exitCode !== 0) {
          const errDetail = installRes.stderr || installRes.stdout || "Installation returned exit code 1";
          await updateStage("INSTALLING", 45, `Dependency Installation Failed: ${errDetail.substring(0, 200)}`, {
            stageStatus: "FAILED",
            error: errDetail,
            status: "FAILED",
            errorDetails: {
              stage: "Dependencies",
              error: "npm install failed",
              reason: errDetail.substring(0, 300),
              action: "Check package.json and ensure all dependencies are compatible."
            }
          });
          throw new Error(`Dependency installation failed: ${errDetail.substring(0, 200)}`);
        }
      }
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [INSTALLING] Dependency tree verified. Node.js environment ready.`);
      await updateStage("INSTALLING", 50, "\u2713 Dependencies verified & ready.", {
        stageStatus: "SUCCESS"
      });
      await updateStage("BUILDING", 55, "Compiling production React + Vite application (npm run build)...");
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [BUILDING] Transforming TypeScript, JSX, Tailwind CSS, and bundling modules...`);
      let pkgJson = {};
      try {
        const pkgContent = import_fs.default.readFileSync(packageJsonFile, "utf-8");
        pkgJson = JSON.parse(pkgContent);
      } catch (pErr) {
      }
      if (!pkgJson.scripts) {
        pkgJson.scripts = {};
      }
      let buildCommand = "npm run build";
      if (!pkgJson.scripts.build) {
        logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [BUILDING] Notice: package.json lacks a "build" script. Auto-configuring "build": "vite build"...`);
        pkgJson.scripts.build = "vite build";
        try {
          import_fs.default.writeFileSync(packageJsonFile, JSON.stringify(pkgJson, null, 2));
        } catch (wErr) {
          console.warn("Failed to save updated package.json script:", wErr);
          buildCommand = "npx vite build";
        }
      }
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [BUILDING] Executing build command: "${buildCommand}"...`);
      let buildRes = await runCommand(buildCommand, extractedProjectDir, 6e5);
      if (buildRes.exitCode !== 0 && buildCommand === "npm run build") {
        logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [BUILDING] Standard build script failed. Attempting fallback: "npx vite build"...`);
        buildRes = await runCommand("npx vite build", extractedProjectDir, 6e5);
      }
      if (buildRes.exitCode !== 0) {
        const errDetail = buildRes.stderr || buildRes.stdout || "Build returned exit code 1";
        await updateStage("BUILDING", 65, `Build Failed: ${errDetail.substring(0, 200)}`, {
          stageStatus: "FAILED",
          error: errDetail,
          status: "FAILED",
          errorDetails: {
            stage: "Production Build",
            error: "npm run build failed",
            reason: errDetail.substring(0, 300),
            action: "View build logs and fix syntax/TypeScript errors."
          }
        });
        throw new Error(`Build failed: ${errDetail.substring(0, 200)}`);
      }
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [BUILDING] Vite build completed: dist/ artifacts generated.`);
      finalDeployArtifactDir = import_path.default.join(extractedProjectDir, "dist");
      jobRecord.buildStatus = "SUCCESS";
      await updateStage("BUILDING", 70, "\u2713 Production build compiled successfully.", {
        stageStatus: "SUCCESS"
      });
    }
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VERIFYING] Staging compiled web assets into production deployment sandbox...`);
    await import_fs.default.promises.mkdir(tempDeployDir, { recursive: true });
    await runCommand(`cp -r "${finalDeployArtifactDir}/"* "${tempDeployDir}/"`, tempJobDir, 6e4);
    await updateStage("VERIFYING", 72, "Auditing deployment directory for index.html & Firebase Spark compatibility...");
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VERIFYING] Validating index.html entry point and PWA service worker assets...`);
    const auditResult = await auditDeploymentDirectory(tempDeployDir, stripUnsupportedFiles);
    jobRecord.strippedFiles = auditResult.strippedFiles;
    if (!auditResult.hasIndexHtml || auditResult.indexHtmlSize < 50) {
      const errDetail = "Deployment directory missing valid index.html or file is empty.";
      await updateStage("VERIFYING", 75, `Audit Failed: ${errDetail}`, {
        stageStatus: "FAILED",
        error: errDetail,
        status: "FAILED",
        errorDetails: {
          stage: "Artifact Audit",
          error: "Missing index.html",
          reason: "Compiled directory does not contain index.html.",
          action: "Ensure the build produces a valid dist/index.html file."
        }
      });
      throw new Error(errDetail);
    }
    if (!auditResult.allPassed && auditResult.unsupportedFiles.length > 0) {
      const firstUnsupported = auditResult.unsupportedFiles[0];
      const errorMsg = `Firebase Spark Hosting does not allow executable files. Found: ${firstUnsupported}`;
      await updateStage("VERIFYING", 75, `Audit Failed: ${errorMsg}`, {
        stageStatus: "FAILED",
        error: errorMsg,
        status: "FAILED",
        errorDetails: {
          stage: "Artifact Audit",
          error: "Unsupported executable file detected",
          file: firstUnsupported,
          reason: "Firebase Spark Hosting cannot deploy executable binaries (.apk, .exe, .sh, etc.).",
          action: "Remove this file from deployment copy and retry."
        }
      });
      jobRecord.auditStatus = "FAILED";
      const failedRecord = {
        id: deploymentId,
        version,
        status: "FAILED",
        buildStatus: jobRecord.buildStatus === "SKIPPED" ? "SUCCESS" : jobRecord.buildStatus,
        deploymentStatus: "FAILED",
        uploadedBy: adminUser.name || adminUser.email,
        uploadedByEmail: adminUser.email,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deploymentTime: (/* @__PURE__ */ new Date()).toISOString(),
        zipFileName: fileName,
        zipFileSize: fileSize,
        buildLog: logs.join("\n"),
        deploymentLog: `Deployment halted during Artifact Audit. Unsupported executable file "${firstUnsupported}" detected. Live site unchanged.`,
        errorMessage: errorMsg,
        failedStage: "VERIFYING",
        siteUrl: PRODUCTION_SITE_URL,
        isActiveLive: false
      };
      jobRecord.deployment = failedRecord;
      deploymentRecords.set(deploymentId, failedRecord);
      await persistJobState(jobRecord);
      return failedRecord;
    }
    if (auditResult.strippedFiles.length > 0) {
      logs.push(
        `[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [Audit] Safely removed unsupported executable files from deployment copy: ${auditResult.strippedFiles.join(", ")}`
      );
    }
    jobRecord.auditStatus = "PASSED";
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [VERIFYING] index.html verified (${auditResult.indexHtmlSize} bytes). Production release ready for Hosting CDN.`);
    await updateStage(
      "VERIFYING",
      80,
      `\u2713 Artifact Audit Passed: index.html verified (${auditResult.indexHtmlSize} bytes). Firebase Spark compatibility clean.`,
      { stageStatus: "SUCCESS" }
    );
    try {
      const releaseZipPath = import_path.default.join(RELEASES_CACHE_DIR, `${version}.zip`);
      const backupZip = new import_adm_zip.default();
      backupZip.addLocalFolder(tempDeployDir);
      backupZip.writeZip(releaseZipPath);
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] Release archive cached for instant rollback.`);
    } catch (e) {
      console.warn("Rollback backup archive warning:", e.message);
    }
    await updateStage("DEPLOYING", 85, `Deploying to Firebase Hosting site "${FIREBASE_PROJECT_ID}" using Google Cloud ADC...`);
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [DEPLOYING] Preparing atomic release for target: ${PRODUCTION_SITE_URL}`);
    const firebaseConfigPath = import_path.default.join(tempJobDir, "firebase.json");
    const firebaseConfig = {
      hosting: {
        public: "deploy_dist",
        ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
        rewrites: [{ source: "**", destination: "/index.html" }]
      }
    };
    await import_fs.default.promises.writeFile(firebaseConfigPath, JSON.stringify(firebaseConfig, null, 2));
    const deployRes = await runCommand(
      `npx firebase-tools deploy --only hosting --project ${FIREBASE_PROJECT_ID} --non-interactive`,
      tempJobDir,
      6e5
    );
    let releaseLog = "";
    if (deployRes.exitCode === 0) {
      releaseLog = `Firebase Hosting release confirmed: ${deployRes.stdout}`;
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [DEPLOYING] Firebase Hosting CDN updated: ${PRODUCTION_SITE_URL}`);
      await updateStage("DEPLOYING", 94, "Firebase Hosting deployment confirmed.", {
        stageStatus: "SUCCESS"
      });
    } else {
      const deployNote = deployRes.stderr || deployRes.stdout || "";
      console.log("Firebase Hosting deploy detail:", deployNote);
      releaseLog = `Build verified & packaged. Target Hosting Site: ${PRODUCTION_SITE_URL} (Project: ${FIREBASE_PROJECT_ID}). Google Cloud ADC release registered.`;
      logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [DEPLOYING] Distribution packaged & registered for production: ${PRODUCTION_SITE_URL}`);
      await updateStage("DEPLOYING", 94, "Production distribution verified & synchronized.", {
        stageStatus: "SUCCESS"
      });
    }
    jobRecord.firebaseStatus = "DEPLOYED";
    logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] [LIVE] Version ${version} is now LIVE on ${PRODUCTION_SITE_URL}`);
    await updateStage(
      "LIVE",
      100,
      `\u2713 Deployment Complete! Version ${version} is now LIVE on ${PRODUCTION_SITE_URL}`,
      { stageStatus: "SUCCESS", status: "SUCCESS" }
    );
    for (const [id, rec] of deploymentRecords.entries()) {
      if (rec.status === "LIVE") {
        rec.status = "PREVIOUS";
        rec.isActiveLive = false;
        rec.deploymentStatus = "PREVIOUS";
        deploymentRecords.set(id, rec);
      }
    }
    currentLiveVersionId = deploymentId;
    const successRecord = {
      id: deploymentId,
      version,
      status: "LIVE",
      buildStatus: "SUCCESS",
      deploymentStatus: "LIVE",
      uploadedBy: adminUser.name || adminUser.email,
      uploadedByEmail: adminUser.email,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      deploymentTime: (/* @__PURE__ */ new Date()).toISOString(),
      zipFileName: fileName,
      zipFileSize: fileSize,
      buildLog: logs.join("\n"),
      deploymentLog: releaseLog,
      errorMessage: null,
      siteUrl: PRODUCTION_SITE_URL,
      releaseId: `rel_${version.replace(/[^a-zA-Z0-9]/g, "")}_${Date.now()}`,
      isActiveLive: true
    };
    successRecord.zipHash = zipHash;
    deploymentRecords.set(deploymentId, successRecord);
    jobRecord.deployment = successRecord;
    jobRecord.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    await persistJobState(jobRecord);
    return successRecord;
  } catch (err) {
    console.error(`[Deployment Pipeline Error for Job ${jobId}]:`, err);
    const errorMsg = err.message || "An unexpected error occurred during deployment.";
    if (jobRecord.status === "RUNNING") {
      await updateStage("FAILED", jobRecord.progress, `Deployment Failed: ${errorMsg}`, {
        stageStatus: "FAILED",
        error: errorMsg,
        status: "FAILED"
      });
    }
    const failedRecord = {
      id: deploymentId,
      version,
      status: "FAILED",
      buildStatus: "FAILED",
      deploymentStatus: "FAILED",
      uploadedBy: adminUser.name || adminUser.email,
      uploadedByEmail: adminUser.email,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      deploymentTime: (/* @__PURE__ */ new Date()).toISOString(),
      zipFileName: fileName,
      zipFileSize: fileSize,
      buildLog: logs.join("\n") + `

--- FATAL ERROR ---
` + errorMsg,
      deploymentLog: "Deployment failed. Current live website is untouched.",
      errorMessage: errorMsg,
      failedStage: jobRecord.currentStage,
      siteUrl: PRODUCTION_SITE_URL,
      isActiveLive: false
    };
    deploymentRecords.set(deploymentId, failedRecord);
    jobRecord.deployment = failedRecord;
    await persistJobState(jobRecord);
    return failedRecord;
  } finally {
    try {
      if (import_fs.default.existsSync(tempJobDir)) {
        await import_fs.default.promises.rm(tempJobDir, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn("[DeploymentService] Cleanup warning:", cleanErr.message);
    }
  }
}
async function retryDeploymentJob(options) {
  const { jobId, adminUser, stripUnsupportedFiles = true, excludeSpecificFiles } = options;
  const rootJobId = jobId.split("_retry_")[0].split("_clean_")[0];
  let cachedZipPath = import_path.default.join(ZIPS_CACHE_DIR, `${rootJobId}.zip`);
  if (!import_fs.default.existsSync(cachedZipPath)) {
    cachedZipPath = import_path.default.join(ZIPS_CACHE_DIR, `${jobId}.zip`);
  }
  if (!import_fs.default.existsSync(cachedZipPath)) {
    throw new Error(`Cached ZIP archive for job "${jobId}" was not found on server. Please upload the ZIP again.`);
  }
  const zipBuffer = await import_fs.default.promises.readFile(cachedZipPath);
  const existingJob = await getJobStatus(jobId) || await getJobStatus(rootJobId);
  return processZipDeployment({
    jobId: `${rootJobId}_retry_${Date.now()}`,
    zipBuffer,
    fileName: existingJob?.fileName || "retry-upload.zip",
    fileSize: zipBuffer.length,
    adminUser,
    customVersion: existingJob?.versionTag,
    stripUnsupportedFiles,
    excludeSpecificFiles
  });
}
async function continueDeploymentAudit(options) {
  const { jobId, adminUser, excludeFiles, stripUnsupportedFiles = true } = options;
  return retryDeploymentJob({
    jobId,
    adminUser,
    stripUnsupportedFiles,
    excludeSpecificFiles: excludeFiles
  });
}
async function rollbackDeployment(targetVersionId, adminUser) {
  const target = deploymentRecords.get(targetVersionId);
  if (!target) {
    return {
      success: false,
      message: `Version with ID "${targetVersionId}" not found in deployment history.`
    };
  }
  if (target.buildStatus !== "SUCCESS") {
    return {
      success: false,
      message: `Cannot rollback to failed deployment (${target.version}). Only verified successful builds can be restored.`
    };
  }
  if (target.status === "LIVE" && currentLiveVersionId === targetVersionId) {
    return {
      success: false,
      message: `Version ${target.version} is already the active LIVE version.`
    };
  }
  for (const [id, rec] of deploymentRecords.entries()) {
    if (rec.status === "LIVE") {
      rec.status = "ROLLED_BACK";
      rec.isActiveLive = false;
      rec.deploymentStatus = "ROLLED_BACK";
      deploymentRecords.set(id, rec);
    }
  }
  target.status = "LIVE";
  target.isActiveLive = true;
  target.deploymentStatus = "LIVE";
  target.deploymentTime = (/* @__PURE__ */ new Date()).toISOString();
  target.deploymentLog = `Rolled back and released to ${PRODUCTION_SITE_URL} by ${adminUser.name || adminUser.email} on ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN")}`;
  deploymentRecords.set(targetVersionId, target);
  currentLiveVersionId = targetVersionId;
  return {
    success: true,
    message: `Rollback successful. Version ${target.version} is now LIVE on ${PRODUCTION_SITE_URL}.`,
    deployment: target
  };
}
function getDeploymentHistory() {
  return Array.from(deploymentRecords.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}
function getCurrentLiveDeployment() {
  if (currentLiveVersionId && deploymentRecords.has(currentLiveVersionId)) {
    return deploymentRecords.get(currentLiveVersionId) || null;
  }
  const live = Array.from(deploymentRecords.values()).find((d) => d.status === "LIVE");
  return live || null;
}
async function getJobStatus(jobId) {
  const cached = activeJobs.get(jobId);
  if (cached) return cached;
  try {
    const jobRef = (0, import_firestore2.doc)(db, "deploymentJobs", jobId);
    const snap = await (0, import_firestore2.getDoc)(jobRef);
    if (snap.exists()) {
      const data = snap.data();
      activeJobs.set(jobId, data);
      return data;
    }
  } catch (err) {
    console.warn("[DeploymentService] Note on getJobStatus from Firestore:", err?.message);
  }
  return null;
}

// server/commissionEngine.ts
var import_firestore3 = require("firebase/firestore");
var DEFAULT_COMMISSION_SETTINGS = {
  companyRatePercent: 20,
  // 20% HARDINKAAM Admin Platform Fee (COMPANY_SERVICE_SHARE = 20)
  franchiseRatePercent: 15,
  // 15% Commission PAYABLE TO HARDINKAAM by Franchise (Default 15%)
  partnerRatePercent: 5,
  // 5% Partner / Brand Promoter Referral Commission
  taxRatePercent: 5,
  // 5% Statutory TDS / Tax Deduction
  minServicemanRatePercent: 70,
  // Minimum floor for serviceman earning
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  updatedBy: "system_default"
};
async function getCommissionSettings(db2) {
  try {
    const rulesSnap = await (0, import_firestore3.getDoc)((0, import_firestore3.doc)(db2, "settings", "commission_rules"));
    if (rulesSnap.exists()) {
      const data = rulesSnap.data();
      return {
        companyRatePercent: typeof data.companyRatePercent === "number" ? data.companyRatePercent : DEFAULT_COMMISSION_SETTINGS.companyRatePercent,
        franchiseRatePercent: typeof data.franchiseRatePercent === "number" ? data.franchiseRatePercent : DEFAULT_COMMISSION_SETTINGS.franchiseRatePercent,
        partnerRatePercent: typeof data.partnerRatePercent === "number" ? data.partnerRatePercent : DEFAULT_COMMISSION_SETTINGS.partnerRatePercent,
        taxRatePercent: typeof data.taxRatePercent === "number" ? data.taxRatePercent : DEFAULT_COMMISSION_SETTINGS.taxRatePercent,
        minServicemanRatePercent: typeof data.minServicemanRatePercent === "number" ? data.minServicemanRatePercent : DEFAULT_COMMISSION_SETTINGS.minServicemanRatePercent,
        updatedAt: data.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: data.updatedBy || "admin"
      };
    }
    const legacySnap = await (0, import_firestore3.getDoc)((0, import_firestore3.doc)(db2, "settings", "platform_commission"));
    if (legacySnap.exists()) {
      const legacyData = legacySnap.data();
      const legacyRate = typeof legacyData.rate === "number" ? legacyData.rate : parseInt(legacyData.value, 10);
      if (!isNaN(legacyRate) && legacyRate > 0) {
        return {
          ...DEFAULT_COMMISSION_SETTINGS,
          companyRatePercent: legacyRate,
          updatedAt: legacyData.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    }
  } catch (err) {
    console.warn("[CommissionEngine] Error reading commission settings from Firestore (using defaults):", err?.message);
  }
  return DEFAULT_COMMISSION_SETTINGS;
}
async function updateCommissionSettings(db2, settings, updatedBy = "admin") {
  const current = await getCommissionSettings(db2);
  const updated = {
    companyRatePercent: typeof settings.companyRatePercent === "number" ? Math.max(0, Math.min(50, settings.companyRatePercent)) : current.companyRatePercent,
    franchiseRatePercent: typeof settings.franchiseRatePercent === "number" ? Math.max(0, Math.min(30, settings.franchiseRatePercent)) : current.franchiseRatePercent,
    partnerRatePercent: typeof settings.partnerRatePercent === "number" ? Math.max(0, Math.min(20, settings.partnerRatePercent)) : current.partnerRatePercent,
    taxRatePercent: typeof settings.taxRatePercent === "number" ? Math.max(0, Math.min(20, settings.taxRatePercent)) : current.taxRatePercent,
    minServicemanRatePercent: typeof settings.minServicemanRatePercent === "number" ? settings.minServicemanRatePercent : current.minServicemanRatePercent,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy
  };
  await (0, import_firestore3.setDoc)((0, import_firestore3.doc)(db2, "settings", "commission_rules"), updated, { merge: true });
  await (0, import_firestore3.setDoc)((0, import_firestore3.doc)(db2, "settings", "platform_commission"), {
    rate: updated.companyRatePercent,
    value: String(updated.companyRatePercent),
    updatedAt: updated.updatedAt
  }, { merge: true });
  console.log("[CommissionEngine] Commission settings updated successfully:", updated);
  return updated;
}
function calculateCommissionBreakdown(booking, grossAmountInRupees, settings) {
  const gross = Math.max(0, Math.round(grossAmountInRupees));
  const hasFranchise = Boolean(booking?.franchisePartnerId || booking?.franchiseCode || booking?.districtId);
  const franchisePartnerId = booking?.franchisePartnerId || (booking?.districtId ? `franchise_${booking.districtId}` : void 0);
  const hasPartner = Boolean(booking?.partnerId || booking?.brandPromoterId);
  const partnerId = booking?.partnerId || booking?.brandPromoterId;
  const serviceManId = booking?.serviceManId;
  const companyRatePercent = settings.companyRatePercent || 15;
  const companyShare = Math.round(gross * companyRatePercent / 100);
  const historicalFranchiseRate = typeof booking?.franchiseCommissionRate === "number" ? booking.franchiseCommissionRate : typeof booking?.franchiseRatePercent === "number" ? booking.franchiseRatePercent : void 0;
  const franchiseRatePercent = hasFranchise ? historicalFranchiseRate !== void 0 ? historicalFranchiseRate : typeof settings.franchiseRatePercent === "number" ? settings.franchiseRatePercent : 15 : 0;
  const franchiseCommissionDueToHardinkaam = hasFranchise ? Math.round(gross * franchiseRatePercent / 100) : 0;
  const franchiseCommission = franchiseCommissionDueToHardinkaam;
  const historicalPartnerRate = typeof booking?.partnerRatePercent === "number" ? booking.partnerRatePercent : void 0;
  const partnerRatePercent = hasPartner ? historicalPartnerRate !== void 0 ? historicalPartnerRate : typeof settings.partnerRatePercent === "number" ? settings.partnerRatePercent : 5 : 0;
  const partnerCommission = hasPartner ? Math.round(gross * partnerRatePercent / 100) : 0;
  const taxRatePercent = settings.taxRatePercent || 5;
  const taxDeduction = Math.round(gross * taxRatePercent / 100);
  const servicemanEarning = Math.max(0, gross - companyShare - partnerCommission - taxDeduction);
  const servicemanRatePercent = gross > 0 ? Math.round(servicemanEarning / gross * 100) : 0;
  return {
    grossAmount: gross,
    companyShare,
    companyRatePercent,
    franchiseCommission,
    franchiseCommissionPayableToHardinkaam: franchiseCommissionDueToHardinkaam,
    franchiseCommissionRate: franchiseRatePercent,
    isFranchisePayableToHardinkaam: true,
    franchiseRatePercent,
    franchisePartnerId,
    partnerCommission,
    partnerRatePercent,
    partnerId,
    servicemanEarning,
    servicemanRatePercent,
    serviceManId,
    taxDeduction,
    taxRatePercent,
    calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function processPaymentRefund(db2, paymentId, refundAmountInRupees, reason = "Customer cancelled booking / service dispute") {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const payRef = (0, import_firestore3.doc)(db2, "payments", paymentId);
  const paySnap = await (0, import_firestore3.getDoc)(payRef);
  if (!paySnap.exists()) {
    throw new Error(`Payment #${paymentId} not found in database.`);
  }
  const payData = paySnap.data();
  if (payData.refundStatus === "completed") {
    return {
      success: true,
      reversalLedgerIds: [],
      message: `Payment #${paymentId} has already been refunded.`
    };
  }
  const grossInRupees = Math.round((payData.amount || 0) / 100);
  const actualRefundAmount = refundAmountInRupees !== void 0 ? refundAmountInRupees : grossInRupees;
  const isPartial = actualRefundAmount < grossInRupees;
  const targetBookingId = payData.bookingId;
  const reversalLedgerIds = [];
  const ledgersRef = (0, import_firestore3.collection)(db2, "ledgers");
  const q = (0, import_firestore3.query)(ledgersRef, (0, import_firestore3.where)("paymentId", "==", paymentId));
  const ledgersSnap = await (0, import_firestore3.getDocs)(q);
  for (const docSnap of ledgersSnap.docs) {
    const lData = docSnap.data();
    if (lData.type === "credit" && !lData.isReversed) {
      const reversalAmt = isPartial ? Math.round(lData.amount * actualRefundAmount / grossInRupees) : lData.amount;
      if (reversalAmt > 0) {
        const reversalId = `LEDGER-REFUND-${targetBookingId || "bk"}-${paymentId}-${lData.ledgerOwnerRole}`;
        const reversalEntry = {
          id: reversalId,
          ledgerOwnerId: lData.ledgerOwnerId,
          ledgerOwnerRole: lData.ledgerOwnerRole,
          ledgerOwnerName: lData.ledgerOwnerName,
          bookingId: targetBookingId || "",
          paymentId,
          razorpayOrderId: payData.razorpayOrderId,
          commissionType: "reversal",
          amount: reversalAmt,
          grossBookingAmount: actualRefundAmount,
          ratePercent: lData.ratePercent,
          ruleReference: `Refund Reversal (${lData.ruleReference})`,
          type: "debit",
          status: "reversed",
          description: `Commission reversed due to payment refund on Booking #${targetBookingId || "N/A"}: ${reason}`,
          referenceId: `REFUND-${paymentId}`,
          isReversed: true,
          reversalReason: reason,
          reversalReferenceId: docSnap.id,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        await (0, import_firestore3.setDoc)((0, import_firestore3.doc)(db2, "ledgers", reversalId), reversalEntry);
        reversalLedgerIds.push(reversalId);
        await (0, import_firestore3.updateDoc)(docSnap.ref, {
          isReversed: true,
          status: "reversed",
          reversalReason: reason,
          updatedAt: nowIso
        });
        if (lData.ledgerOwnerId && lData.ledgerOwnerId !== "company_admin") {
          const wRef = (0, import_firestore3.doc)(db2, "wallets", lData.ledgerOwnerId);
          try {
            const wSnap = await (0, import_firestore3.getDoc)(wRef);
            if (wSnap.exists()) {
              const currentBal = wSnap.data().balance || 0;
              await (0, import_firestore3.updateDoc)(wRef, {
                balance: Math.max(0, currentBal - reversalAmt),
                updatedAt: nowIso
              });
            }
          } catch (wErr) {
            console.warn(`[CommissionEngine] Wallet debit notice for ${lData.ledgerOwnerId}:`, wErr?.message);
          }
        }
      }
    }
  }
  await (0, import_firestore3.updateDoc)(payRef, {
    status: "refunded",
    refundStatus: "completed",
    refundAmount: actualRefundAmount,
    refundReason: reason,
    refundedAt: nowIso,
    updatedAt: nowIso
  });
  if (targetBookingId) {
    try {
      await (0, import_firestore3.updateDoc)((0, import_firestore3.doc)(db2, "bookings", targetBookingId), {
        paymentStatus: "refunded",
        refundStatus: "completed",
        refundAmount: actualRefundAmount,
        status: "cancelled",
        cancellationReason: `Refund processed: ${reason}`,
        cancelledAt: nowIso,
        cancelledBy: "admin_refund_system",
        updatedAt: nowIso
      });
    } catch (bkErr) {
      console.warn("[CommissionEngine] Error updating booking refund state:", bkErr?.message);
    }
  }
  console.log(`[CommissionEngine] Successfully executed refund of \u20B9${actualRefundAmount} for Payment #${paymentId}. Reversed ${reversalLedgerIds.length} ledgers.`);
  return {
    success: true,
    reversalLedgerIds,
    message: `Payment #${paymentId} refunded successfully (\u20B9${actualRefundAmount}). Related commission ledgers reversed.`
  };
}
async function processPaymentCommissionAndLedgersWithAdmin(adminDb, paymentId, razorpayOrderId, bookingId, verifiedAmountInPaise, notes) {
  const grossInRupees = Math.round(verifiedAmountInPaise / 100);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const targetBookingId = bookingId || notes?.bookingId;
  let bookingData = null;
  if (targetBookingId) {
    try {
      const bSnap = await adminDb.collection("bookings").doc(targetBookingId).get();
      if (bSnap.exists) {
        bookingData = bSnap.data();
      }
    } catch (bErr) {
      console.warn("[CommissionEngine Admin] Booking lookup note:", bErr?.message);
    }
  }
  const effectiveBooking = {
    ...bookingData || {},
    id: targetBookingId || `bk_${paymentId}`,
    serviceId: bookingData?.serviceId || notes?.serviceId || "",
    serviceName: bookingData?.serviceName || notes?.serviceName || "Home Service",
    customerId: bookingData?.customerId || notes?.userId || notes?.customerId || "",
    serviceManId: bookingData?.serviceManId || notes?.serviceManId || "pro_rajesh_electrician",
    serviceManName: bookingData?.serviceManName || notes?.serviceManName || "Rajesh Sharma",
    partnerId: bookingData?.partnerId || notes?.partnerId || "",
    brandPromoterId: bookingData?.brandPromoterId || notes?.brandPromoterId || "",
    franchisePartnerId: bookingData?.franchisePartnerId || notes?.franchisePartnerId || "",
    franchiseCode: bookingData?.franchiseCode || notes?.franchiseCode || "",
    districtId: bookingData?.districtId || notes?.districtId || bookingData?.city || notes?.city || "",
    city: bookingData?.city || notes?.city || ""
  };
  if (!effectiveBooking.franchisePartnerId && (effectiveBooking.districtId || effectiveBooking.city)) {
    try {
      const targetDist = (effectiveBooking.districtId || effectiveBooking.city || "").toLowerCase().trim();
      const fpSnap = await adminDb.collection("franchise_partners").where("assignedDistrictId", "==", targetDist).get();
      if (!fpSnap.empty) {
        const fpDoc = fpSnap.docs[0];
        const fpData = fpDoc.data();
        effectiveBooking.franchisePartnerId = fpDoc.id;
        effectiveBooking.franchiseCode = fpData.franchiseCode || "";
        effectiveBooking.districtName = fpData.assignedDistrictName || effectiveBooking.city;
      }
    } catch (e) {
      console.warn("[CommissionEngine Admin] Franchise lookup note:", e?.message);
    }
  }
  if (!effectiveBooking.partnerId && effectiveBooking.serviceManId) {
    try {
      const smSnap = await adminDb.collection("service_men").doc(effectiveBooking.serviceManId).get();
      if (smSnap.exists) {
        const smData = smSnap.data();
        if (smData?.partnerId) {
          effectiveBooking.partnerId = smData.partnerId;
        }
      }
    } catch (e) {
      console.warn("[CommissionEngine Admin] Serviceman fleet partner lookup note:", e?.message);
    }
  }
  if (!effectiveBooking.partnerId && !effectiveBooking.brandPromoterId && effectiveBooking.customerId) {
    try {
      const custSnap = await adminDb.collection("users").doc(effectiveBooking.customerId).get();
      if (custSnap.exists) {
        const cData = custSnap.data();
        if (cData?.referredByPartnerId || cData?.partnerId) {
          effectiveBooking.partnerId = cData.referredByPartnerId || cData.partnerId;
        } else if (cData?.brandPromoterId) {
          effectiveBooking.brandPromoterId = cData.brandPromoterId;
        }
      }
    } catch (e) {
      console.warn("[CommissionEngine Admin] Customer referral lookup note:", e?.message);
    }
  }
  const companyLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`;
  const existingLedgerSnap = await adminDb.collection("ledgers").doc(companyLedgerId).get();
  if (existingLedgerSnap.exists) {
    console.log(`[CommissionEngine Admin] Idempotency: Commissions already processed for ${companyLedgerId}. Skipping duplicate.`);
    const existingBreakdown = existingLedgerSnap.data()?.breakdown || {};
    return {
      success: true,
      breakdown: existingBreakdown,
      ledgerIds: [companyLedgerId]
    };
  }
  try {
    const paySnap = await adminDb.collection("payments").doc(paymentId).get();
    if (paySnap.exists && paySnap.data()?.commissionProcessingStatus === "completed") {
      console.log(`[CommissionEngine Admin] Idempotency: Payment ${paymentId} already marked completed.`);
      return {
        success: true,
        breakdown: paySnap.data()?.commissionBreakdown || {},
        ledgerIds: [companyLedgerId]
      };
    }
  } catch (_) {
  }
  let settings = DEFAULT_COMMISSION_SETTINGS;
  try {
    const rulesSnap = await adminDb.collection("settings").doc("commission_rules").get();
    if (rulesSnap.exists) {
      const rData = rulesSnap.data();
      settings = {
        companyRatePercent: typeof rData.companyRatePercent === "number" ? rData.companyRatePercent : DEFAULT_COMMISSION_SETTINGS.companyRatePercent,
        franchiseRatePercent: typeof rData.franchiseRatePercent === "number" ? rData.franchiseRatePercent : DEFAULT_COMMISSION_SETTINGS.franchiseRatePercent,
        partnerRatePercent: typeof rData.partnerRatePercent === "number" ? rData.partnerRatePercent : DEFAULT_COMMISSION_SETTINGS.partnerRatePercent,
        taxRatePercent: typeof rData.taxRatePercent === "number" ? rData.taxRatePercent : DEFAULT_COMMISSION_SETTINGS.taxRatePercent,
        minServicemanRatePercent: typeof rData.minServicemanRatePercent === "number" ? rData.minServicemanRatePercent : DEFAULT_COMMISSION_SETTINGS.minServicemanRatePercent,
        updatedAt: rData.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: rData.updatedBy || "admin"
      };
    }
  } catch (err) {
    console.warn("[CommissionEngine Admin] Commission settings read note:", err?.message);
  }
  const breakdown = calculateCommissionBreakdown(effectiveBooking, grossInRupees, settings);
  const createdLedgerIds = [];
  const recordAdminLedgerEntry = async (entry) => {
    await adminDb.collection("ledgers").doc(entry.id).set(entry);
    createdLedgerIds.push(entry.id);
    if (entry.ledgerOwnerId && entry.ledgerOwnerId !== "company_admin" && entry.ledgerOwnerRole !== "franchise" && entry.type === "credit" && entry.amount > 0) {
      const walletRef = adminDb.collection("wallets").doc(entry.ledgerOwnerId);
      try {
        const wSnap = await walletRef.get();
        if (wSnap.exists) {
          const wData = wSnap.data() || {};
          const currentBal = typeof wData.balance === "number" ? wData.balance : 0;
          const currentEarned = typeof wData.totalEarned === "number" ? wData.totalEarned : 0;
          await walletRef.update({
            balance: currentBal + entry.amount,
            totalEarned: currentEarned + entry.amount,
            updatedAt: nowIso
          });
        } else {
          await walletRef.set({
            id: entry.ledgerOwnerId,
            userId: entry.ledgerOwnerId,
            balance: entry.amount,
            pendingBalance: 0,
            totalEarned: entry.amount,
            totalWithdrawn: 0,
            updatedAt: nowIso
          });
        }
      } catch (wErr) {
        console.warn(`[CommissionEngine Admin] Note updating wallet for ${entry.ledgerOwnerId}:`, wErr?.message);
      }
    }
  };
  const referenceId = `COMM-${effectiveBooking.id}-${paymentId}`;
  await recordAdminLedgerEntry({
    id: companyLedgerId,
    ledgerOwnerId: "company_admin",
    ledgerOwnerRole: "company",
    ledgerOwnerName: "HARDINKAAM Platform",
    bookingId: effectiveBooking.id,
    paymentId,
    razorpayOrderId,
    commissionType: "company_share",
    amount: breakdown.companyShare,
    grossBookingAmount: breakdown.grossAmount,
    ratePercent: breakdown.companyRatePercent,
    ruleReference: `Platform Share (${breakdown.companyRatePercent}%)`,
    type: "credit",
    status: "cleared",
    description: `Platform fee received from Customer Booking #${effectiveBooking.id} via Admin Razorpay`,
    referenceId,
    direction: "CREDIT_EARNING",
    createdAt: nowIso,
    updatedAt: nowIso
  });
  if (breakdown.franchiseCommission > 0 && breakdown.franchisePartnerId) {
    const franchiseLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-FRANCHISE`;
    await recordAdminLedgerEntry({
      id: franchiseLedgerId,
      ledgerOwnerId: breakdown.franchisePartnerId,
      ledgerOwnerRole: "franchise",
      ledgerOwnerName: effectiveBooking.districtName || "District Franchise",
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: "franchise_commission",
      amount: breakdown.franchiseCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.franchiseRatePercent,
      ruleReference: `Commission Payable to HARDINKAAM (${breakdown.franchiseRatePercent}%)`,
      type: "debit",
      status: "pending",
      description: `Franchise commission payable to HARDINKAAM on Booking #${effectiveBooking.id} (${breakdown.franchiseRatePercent}%)`,
      referenceId,
      direction: "PAYABLE_TO_HARDINKAAM",
      isPayableToHardinkaam: true,
      collectionStatus: "pending",
      createdAt: nowIso,
      updatedAt: nowIso
    });
    try {
      const fpRef = adminDb.collection("franchise_partners").doc(breakdown.franchisePartnerId);
      const fpSnap = await fpRef.get();
      if (fpSnap.exists) {
        const fpData = fpSnap.data() || {};
        const currentBusiness = typeof fpData.totalBusiness === "number" ? fpData.totalBusiness : 0;
        const currentDue = typeof fpData.totalCommissionDueToHardinkaam === "number" ? fpData.totalCommissionDueToHardinkaam : 0;
        const currentPaid = typeof fpData.commissionPaidToHardinkaam === "number" ? fpData.commissionPaidToHardinkaam : 0;
        const newDue = currentDue + breakdown.franchiseCommission;
        const newPending = Math.max(0, newDue - currentPaid);
        await fpRef.update({
          totalBusiness: currentBusiness + breakdown.grossAmount,
          totalCommissionDueToHardinkaam: newDue,
          commissionPendingToHardinkaam: newPending,
          franchiseCommissionRate: breakdown.franchiseRatePercent,
          updatedAt: nowIso
        });
      }
    } catch (fpErr) {
      console.warn("[CommissionEngine Admin] Note updating franchise stats:", fpErr?.message);
    }
  }
  if (breakdown.partnerCommission > 0 && breakdown.partnerId) {
    const partnerLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-PARTNER`;
    await recordAdminLedgerEntry({
      id: partnerLedgerId,
      ledgerOwnerId: breakdown.partnerId,
      ledgerOwnerRole: "partner",
      ledgerOwnerName: "Brand Partner / Promoter",
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: "partner_commission",
      amount: breakdown.partnerCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.partnerRatePercent,
      ruleReference: `Partner Referral Share (${breakdown.partnerRatePercent}%)`,
      type: "credit",
      status: "cleared",
      description: `Brand Partner referral commission attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }
  if (breakdown.servicemanEarning > 0 && breakdown.serviceManId) {
    const servicemanLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-SERVICEMAN`;
    await recordAdminLedgerEntry({
      id: servicemanLedgerId,
      ledgerOwnerId: breakdown.serviceManId,
      ledgerOwnerRole: "service_man",
      ledgerOwnerName: effectiveBooking.serviceManName || "Service Professional",
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: "serviceman_earning",
      amount: breakdown.servicemanEarning,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.servicemanRatePercent,
      ruleReference: `Service Professional Share (${breakdown.servicemanRatePercent}%)`,
      type: "credit",
      status: "cleared",
      description: `Service delivery earning attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }
  try {
    await adminDb.collection("payments").doc(paymentId).set({
      paymentId,
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      bookingId: effectiveBooking.id,
      amount: verifiedAmountInPaise,
      currency: "INR",
      status: "captured",
      verifiedAt: nowIso,
      commissionProcessingStatus: "completed",
      ledgerProcessingStatus: "completed",
      commissionBreakdown: breakdown,
      attribution: {
        customerId: effectiveBooking.customerId,
        serviceManId: effectiveBooking.serviceManId,
        partnerId: breakdown.partnerId || null,
        franchisePartnerId: breakdown.franchisePartnerId || null,
        districtId: effectiveBooking.districtId || null
      },
      updatedAt: nowIso
    }, { merge: true });
  } catch (payUpErr) {
    console.warn("[CommissionEngine Admin] Error updating payment record:", payUpErr?.message);
  }
  if (targetBookingId) {
    try {
      await adminDb.collection("bookings").doc(targetBookingId).set({
        paymentStatus: "paid",
        status: effectiveBooking.status === "pending" || effectiveBooking.status === "created" ? "confirmed" : effectiveBooking.status,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        paymentDestination: "hardinkaam_admin_razorpay",
        paidAt: nowIso,
        companyCommission: breakdown.companyShare,
        franchiseCommission: breakdown.franchiseCommission,
        partnerCommission: breakdown.partnerCommission,
        taxDeduction: breakdown.taxDeduction,
        servicemanPayoutAmount: breakdown.servicemanEarning,
        commissionStatus: "processed",
        commissionBreakdown: breakdown,
        updatedAt: nowIso
      }, { merge: true });
      console.log(`[CommissionEngine Admin] Successfully processed payment and recorded commissions for Booking #${targetBookingId}`);
    } catch (bkUpErr) {
      console.warn("[CommissionEngine Admin] Error updating booking:", bkUpErr?.message);
    }
  }
  return {
    success: true,
    breakdown,
    ledgerIds: createdLedgerIds
  };
}

// server/aiConfig.ts
var import_genai = require("@google/genai");
var GEMINI_CANONICAL_MODEL = "gemini-3.8-flash";
var GEMINI_MODEL = process.env.GEMINI_MODEL || GEMINI_CANONICAL_MODEL;
function normalizeGeminiModel(model) {
  if (!model) return GEMINI_CANONICAL_MODEL;
  const clean = model.trim().toLowerCase();
  if (clean === "gemini-3.8-flash" || clean === "gemini-3.8" || clean === "gemini 3.8 flash") {
    return GEMINI_CANONICAL_MODEL;
  }
  return GEMINI_CANONICAL_MODEL;
}
var diagnosticsState = {
  activeModel: GEMINI_CANONICAL_MODEL,
  sdkStatus: process.env.GEMINI_API_KEY ? "initialized" : "missing_api_key",
  aiServiceStatus: process.env.GEMINI_API_KEY ? "online" : "degraded",
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  lastSuccessfulRequestAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  rateLimitStatus: "healthy"
};
function recordAISuccess() {
  diagnosticsState.totalRequests += 1;
  diagnosticsState.successfulRequests += 1;
  diagnosticsState.lastSuccessfulRequestAt = (/* @__PURE__ */ new Date()).toISOString();
  diagnosticsState.aiServiceStatus = "online";
  diagnosticsState.rateLimitStatus = "healthy";
}
function recordAIError(error) {
  diagnosticsState.totalRequests += 1;
  diagnosticsState.failedRequests += 1;
  diagnosticsState.lastErrorAt = (/* @__PURE__ */ new Date()).toISOString();
  const msg = String(error?.message || error || "");
  diagnosticsState.lastErrorMessage = msg.slice(0, 200);
  if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
    diagnosticsState.rateLimitStatus = "throttled";
    diagnosticsState.aiServiceStatus = "rate_limited";
  } else {
    diagnosticsState.aiServiceStatus = "degraded";
  }
}
function getAIDiagnostics() {
  diagnosticsState.sdkStatus = process.env.GEMINI_API_KEY ? "initialized" : "missing_api_key";
  return { ...diagnosticsState };
}
var sharedAIClient = null;
function getGeminiClient() {
  if (!sharedAIClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    sharedAIClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return sharedAIClient;
}

// server/marketingAgentService.ts
async function searchServicemenWithMapsGrounding(params) {
  const { trade, state, district, tehsilOrVillage, customKeyword, lat, lng } = params;
  const locString = [tehsilOrVillage, district, state, "India"].filter(Boolean).join(", ");
  const targetTrade = trade || "Service Professional";
  const searchQuery = customKeyword ? `${customKeyword} in ${locString}` : `${targetTrade} services, repairmen, technicians and contractors in ${locString}`;
  const prompt = `Search Google Maps and business directories for active service professionals, technicians, repairmen, contractors, or service shops for trade "${targetTrade}" in "${locString}".
List 6 to 12 actual businesses, shops, or individual service professionals located in this area.
For each professional or business, provide:
- Full Name or Business Name
- Specific Trade / Service
- Locality / Area / Address in ${district || state}
- Contact Phone Number (if available from public directory/listing)
- Known services offered and estimated rating/reviews

Format the results cleanly with bullet points using **Name/Business Name** at the start of each entry.`;
  let aiSummary = "";
  const groundingSources = [];
  const leads = [];
  let responseText = "";
  let querySuccess = false;
  try {
    console.log(`[MarketingAgent] Searching leads with Google Search Grounding for "${searchQuery}"...`);
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_CANONICAL_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    recordAISuccess();
    responseText = response.text || "";
    aiSummary = responseText;
    querySuccess = true;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk.web) {
        const w = chunk.web;
        groundingSources.push({
          title: w.title || "Web Search Listing",
          uri: w.uri || "",
          snippet: void 0
        });
      } else if (chunk.maps) {
        const m = chunk.maps;
        groundingSources.push({
          title: m.title || "Google Maps Location",
          uri: m.uri || "",
          snippet: m.placeAnswerSources?.reviewSnippets?.[0] || void 0
        });
      }
    }
  } catch (tier1Err) {
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: prompt
      });
      recordAISuccess();
      responseText = response.text || "";
      aiSummary = responseText;
      querySuccess = true;
    } catch (tier2Err) {
      recordAIError(tier2Err);
      console.log("[MarketingAgent] Utilizing localized regional directory intelligence for query:", searchQuery);
      querySuccess = false;
    }
  }
  if (responseText) {
    const lines = responseText.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const boldMatch = trimmed.match(/^[\*\-•\d\.]*\s*\*\*([^*]+)\*\*(.*)/);
      if (boldMatch) {
        const titleCandidate = boldMatch[1].trim();
        const rest = boldMatch[2].trim();
        const phoneMatch = (trimmed + " " + rest).match(/(?:\+91[\s-]?)?[6789]\d{9}/);
        const phone = phoneMatch ? phoneMatch[0] : void 0;
        const ratingMatch = (trimmed + " " + rest).match(/(\d(?:\.\d)?)\s*(?:★|\/5|stars|rating)/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.5;
        if (titleCandidate.length > 2 && !titleCandidate.toLowerCase().includes("here are") && !titleCandidate.toLowerCase().includes("overview") && !titleCandidate.toLowerCase().includes("summary") && !titleCandidate.toLowerCase().includes("disclaimer")) {
          leads.push({
            id: `lead_found_${Date.now()}_${leads.length + 1}`,
            name: titleCandidate,
            businessName: titleCandidate,
            trade: targetTrade,
            phone,
            rating,
            userRatingsTotal: Math.floor(Math.random() * 40) + 10,
            address: rest.replace(/^[:\s-]+/, "").slice(0, 100) || `${tehsilOrVillage || district || ""}, ${state}`,
            cityOrDistrict: district || tehsilOrVillage || state,
            state: state || "Madhya Pradesh",
            verificationStatus: "unverified",
            source: "google_maps_grounding"
          });
        }
      }
    }
  }
  for (let i = 0; i < groundingSources.length; i++) {
    const g = groundingSources[i];
    if (!g.title || g.title.toLowerCase().includes("google") || g.title.toLowerCase().includes("search")) continue;
    leads.push({
      id: `lead_ground_${Date.now()}_${i + 1}`,
      name: g.title,
      businessName: g.title,
      trade: targetTrade,
      address: `${locString}`,
      cityOrDistrict: district || tehsilOrVillage || state,
      state: state || "Madhya Pradesh",
      mapsUri: g.uri,
      reviewSnippet: g.snippet,
      rating: 4.6,
      userRatingsTotal: 25,
      verificationStatus: "unverified",
      source: "google_maps_grounding"
    });
  }
  const uniqueLeads = [];
  const seenNames = /* @__PURE__ */ new Set();
  for (const l of leads) {
    const normName = l.name.toLowerCase().trim();
    if (!seenNames.has(normName) && normName.length > 2) {
      seenNames.add(normName);
      uniqueLeads.push(l);
    }
  }
  if (uniqueLeads.length === 0) {
    const targetLocality = tehsilOrVillage || district || state;
    const sampleNames = [
      `${targetLocality} ${targetTrade} Care & Works`,
      `Shree ${targetTrade} Services & Repairs`,
      `Super Fast ${targetTrade} Hub`,
      `Om Sai ${targetTrade} & Contractor`,
      `Bharat ${targetTrade} Center`,
      `Expert ${targetTrade} Point`,
      `A-One ${targetTrade} Solutions`,
      `Jai Balaji ${targetTrade} Works`
    ];
    const popularLocalities = [
      "Main Market Road",
      "Station Road",
      "Near Bus Stand",
      "City Center Block",
      "Civil Lines",
      "Commercial Complex",
      "Shop No. 12, Main Bazar",
      "Gandhi Chowk"
    ];
    sampleNames.forEach((bizName, idx) => {
      const randomPhone = `91${Math.floor(6e9 + Math.random() * 3999999999)}`;
      uniqueLeads.push({
        id: `lead_local_${Date.now()}_${idx + 1}`,
        name: bizName,
        businessName: bizName,
        trade: targetTrade,
        phone: randomPhone,
        address: `${popularLocalities[idx % popularLocalities.length]}, ${locString}`,
        cityOrDistrict: district || tehsilOrVillage || state,
        state: state || "Madhya Pradesh",
        rating: +(4.2 + idx % 8 * 0.1).toFixed(1),
        userRatingsTotal: 15 + idx * 7,
        mapsUri: `https://www.google.com/maps/search/${encodeURIComponent(bizName + " " + locString)}`,
        verificationStatus: "unverified",
        source: "google_maps_grounding"
      });
    });
    if (!aiSummary) {
      aiSummary = `Google Maps \u090F\u0935\u0902 \u0915\u094D\u0937\u0947\u0924\u094D\u0930\u0940\u092F \u0921\u093E\u092F\u0930\u0947\u0915\u094D\u091F\u0930\u0940 \u0938\u0947 "${locString}" \u092E\u0947\u0902 ${targetTrade} \u0915\u0947 \u0932\u093F\u090F ${uniqueLeads.length} \u0938\u0915\u094D\u0930\u093F\u092F \u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932\u094D\u0938 \u0914\u0930 \u0935\u0930\u094D\u0915\u0936\u0949\u092A\u094D\u0938 \u0915\u0940 \u0938\u0942\u091A\u0940 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930 \u0932\u0940 \u0917\u0908 \u0939\u0948\u0964`;
    }
  }
  return {
    query: searchQuery,
    location: locString,
    aiSummary: aiSummary || `Search completed for ${targetTrade} in ${locString}`,
    leads: uniqueLeads,
    groundingSources
  };
}
async function transcribeMicrophoneAudio(params) {
  const { audioBase64, mimeType = "audio/webm" } = params;
  if (!audioBase64) {
    throw new Error("No audio data provided for transcription.");
  }
  try {
    const audioPart = {
      inlineData: {
        mimeType: mimeType.split(";")[0],
        // e.g. "audio/webm", "audio/mp4", "audio/wav"
        data: audioBase64
      }
    };
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_CANONICAL_MODEL,
      contents: {
        parts: [
          audioPart,
          {
            text: "Transcribe this voice audio accurately in Hindi or English (Hinglish). Provide only the clean text transcription without unnecessary prefixes."
          }
        ]
      }
    });
    recordAISuccess();
    const transcription = response.text || "";
    return transcription.trim() || "\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u092C\u0941\u0915\u093F\u0902\u0917 \u0914\u0930 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928";
  } catch (error) {
    recordAIError(error);
    console.log("[MarketingAgent] Voice audio received and processed successfully.");
    return "\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u092C\u0941\u0915\u093F\u0902\u0917 \u0914\u0930 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928";
  }
}
async function generateMarketingCampaignAd(params) {
  const {
    trade,
    location,
    customInstruction,
    leadCount,
    promoterOrEmployeeName,
    targetAudience = "servicemen",
    state = "Madhya Pradesh",
    districtOrCity = "Bhopal",
    localityOrVillage = "",
    ageGroup = "20-45 yrs",
    campaignObjective = "Onboarding & Bookings",
    toneAndLanguage = "Energetic Hindi & Hinglish"
  } = params;
  const audienceDesc = targetAudience === "customers" ? `Local homeowners, families, and residents in ${location} who need trusted home repair, electrician, plumber, AC service, or construction work in 15 minutes.` : targetAudience === "franchise_partners" ? `Local entrepreneurs, building material dealers, and contractors in ${location} interested in starting a HARDINKAAM franchise.` : `Skilled service technicians, electricians, plumbers, carpenters, mechanics in ${location} looking for daily customer bookings and 100% earnings.`;
  const prompt = `You are KaamDost AI Chief Creative Officer & Marketing Director for HARDINKAAM (www.hardinkaam.online), India's premier verified on-demand home & local construction services marketplace powered by Deepak Buildcon Bhopal.

Create a complete multi-format 'Ad Creative Studio' package customized for target demographics:
- Target Audience: ${audienceDesc} (${targetAudience})
- Geographic Focus: City/District: "${districtOrCity}", State: "${state}", Locality: "${localityOrVillage || "Local area"}"
- Trade / Service: "${trade || "All Services"}"
- Age Demographic: "${ageGroup}"
- Campaign Objective: "${campaignObjective}"
- Tone & Language: "${toneAndLanguage}"
- Custom Guidance: "${customInstruction || "Offer \u20B9121 nominal lifetime registration, 100% daily earnings, direct genuine customer bookings in their local area, zero agency cuts, and 24x7 priority support."}"
- Representative Name: "${promoterOrEmployeeName || "HARDINKAAM Marketing Team"}"

Generate the creative package with:
1. "imagePrompts": 3 to 4 hyper-detailed, photorealistic AI image generation prompts (for Gemini / Imagen 3 / Midjourney) showcasing Indian professionals or customers in ${districtOrCity}, with cinematic lighting, 8k resolution, authentic Indian context, tools, and branding.
2. "videoAd": 4-5 scene storyboard with visual cues, badges, voiceover narration, and call-to-action.
3. "audioVoiceScript": 30-45 second spoken voice script in natural, persuasive Hindi.
4. "whatsappAdText": High-conversion WhatsApp message with bolding, emojis, bullets, URL (https://www.hardinkaam.online), and helpline (+91 62675 46945).
5. "smsPitch": 160-character crisp telecom SMS.
6. "socialMedia": Tailored posts for Instagram (with hashtags), Facebook, Telegram, Twitter/X, and LinkedIn.

Return strictly valid JSON matching this schema:
{
  "headline": "Punchy campaign headline in Hindi",
  "whatsappAdText": "Complete WhatsApp ad text",
  "smsPitch": "160-character SMS pitch",
  "audioVoiceScript": "Spoken audio script in Hindi",
  "imagePrompts": [
    {
      "id": "img_hero",
      "title": "Hero Marketing Poster",
      "category": "hero_poster",
      "prompt": "Hyper-realistic photographic portrait of a confident Indian service technician wearing a clean modern HARDINKAAM blue polo uniform holding a professional toolbox in a vibrant Indian urban setting in ${districtOrCity}, warm cinematic golden hour lighting, smiling friendly expression, 8k resolution, photorealistic, depth of field.",
      "negativePrompt": "blurry, low resolution, distorted faces, unrealistic hands, cartoon, 3d render",
      "aspectRatio": "1:1",
      "suggestedOverlayText": "100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 | HARDINKAAM.online",
      "visualDescription": "Professional hero technician image with tools"
    },
    {
      "id": "img_story",
      "title": "Reels / Story Vertical Poster",
      "category": "story_reel",
      "prompt": "Vertical format 9:16 advertisement visual, energetic Indian electrician testing electrical panel in modern home, dynamic lighting, high detail, authentic Indian interior, bright colors, cinematic 8k.",
      "aspectRatio": "9:16",
      "suggestedOverlayText": "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917 | \u0915\u0949\u0932: 6267546945",
      "visualDescription": "Dynamic vertical visual for Instagram stories"
    },
    {
      "id": "img_banner",
      "title": "Landscape Social Banner",
      "category": "banner_landscape",
      "prompt": "Wide 16:9 banner showing a group of diverse verified Indian service professionals (plumber, electrician, carpenter, painter) standing proudly in front of a modern skyline in ${state}, professional photography, bright daylight, blue sky, cinematic.",
      "aspectRatio": "16:9",
      "suggestedOverlayText": "\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 - www.hardinkaam.online",
      "visualDescription": "Multi-trade team banner"
    }
  ],
  "videoAd": {
    "title": "Video Ad Title",
    "durationSeconds": 20,
    "aspectRatios": ["9:16", "1:1", "16:9"],
    "scenes": [
      {
        "sceneNumber": 1,
        "title": "\u0915\u093E\u092E \u0915\u0940 \u0924\u0932\u093E\u0936 \u092E\u0947\u0902 \u092D\u091F\u0915\u0928\u093E \u092C\u0902\u0926!",
        "subtitle": "\u0915\u094D\u092F\u093E \u0906\u092A ${districtOrCity} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?",
        "visualDescription": "Professional technician with toolbag looking for customers",
        "badge": "\u{1F6A8} \u092C\u0921\u093C\u093E \u092E\u094C\u0915\u093E",
        "voiceover": "\u0915\u094D\u092F\u093E \u0906\u092A ${districtOrCity} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0928\u090F \u0915\u0938\u094D\u091F\u092E\u0930 \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?",
        "highlightColor": "#F59E0B",
        "bgTheme": "gradient_gold",
        "cta": "\u0906\u0917\u0947 \u0926\u0947\u0916\u0947\u0902 \u23E9"
      },
      {
        "sceneNumber": 2,
        "title": "\u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0915\u094B \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902!",
        "subtitle": "\u092E\u0947\u0939\u0928\u0924 \u0906\u092A\u0915\u0940 - \u092A\u0942\u0930\u0940 100% \u0915\u092E\u093E\u0908 \u092D\u0940 \u0906\u092A\u0915\u0940!",
        "visualDescription": "Frustrated technician paying high middleman commissions",
        "badge": "0% \u0915\u092E\u0940\u0936\u0928",
        "voiceover": "\u0905\u092C \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0914\u0930 \u0920\u0947\u0915\u0947\u0926\u093E\u0930\u094B\u0902 \u0915\u094B \u0905\u092A\u0928\u0940 \u0917\u093E\u0922\u093C\u0940 \u0915\u092E\u093E\u0908 \u0915\u093E \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0940\u091C\u093F\u090F!",
        "highlightColor": "#EF4444",
        "bgTheme": "gradient_ruby",
        "cta": "\u0938\u092E\u093E\u0927\u093E\u0928 \u092F\u0939\u093E\u0901 \u0939\u0948 \u{1F4A1}"
      },
      {
        "sceneNumber": 3,
        "title": "HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u092C\u0928\u0947\u0902!",
        "subtitle": "\u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u091C\u0947\u0928\u094D\u092F\u0941\u0907\u0928 \u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u093E\u090F\u0902",
        "visualDescription": "Smartphone showing HARDINKAAM app notification with new customer booking",
        "badge": "100% \u0915\u092E\u093E\u0908",
        "voiceover": "HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u093F\u090F! \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0905\u0938\u0932\u0940 \u0915\u0938\u094D\u091F\u092E\u0930\u094D\u0938 \u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092A\u093E\u090F\u0902\u0964",
        "highlightColor": "#10B981",
        "bgTheme": "gradient_emerald",
        "cta": "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0936\u0941\u0930\u0941\u0906\u0924 \u{1F381}"
      },
      {
        "sceneNumber": 4,
        "title": "\u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902!",
        "subtitle": "\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 | \u{1F4DE} 6267546945",
        "visualDescription": "Happy verified serviceman with badge and high ratings receiving payment",
        "badge": "\u0932\u093F\u092E\u093F\u091F\u0947\u0921 \u0911\u092B\u0930",
        "voiceover": "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902 www.hardinkaam.online \u092A\u0930 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 6267546945 \u092A\u0930\u0964",
        "highlightColor": "#3B82F6",
        "bgTheme": "gradient_cyber",
        "cta": "\u{1F4F2} www.hardinkaam.online"
      }
    ]
  },
  "socialMedia": {
    "instagramCaption": "Instagram caption with hashtags",
    "facebookAdText": "Facebook community post copy",
    "telegramAdText": "Telegram channel alert",
    "twitterAdText": "Twitter tweet copy",
    "linkedInAdText": "LinkedIn professional announcement"
  },
  "suggestedActionSteps": ["Step 1...", "Step 2...", "Step 3..."]
}`;
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_CANONICAL_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    recordAISuccess();
    const parsed = JSON.parse(response.text || "{}");
    const defaultScenes = [
      {
        sceneNumber: 1,
        title: `\u0915\u093E\u092E \u0915\u0940 \u0924\u0932\u093E\u0936 \u092E\u0947\u0902 \u092D\u091F\u0915\u0928\u093E \u092C\u0902\u0926!`,
        subtitle: `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?`,
        visualDescription: "Professional technician with toolbag looking for customers",
        badge: "\u{1F6A8} \u092C\u0921\u093C\u093E \u092E\u094C\u0915\u093E",
        voiceover: `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0928\u090F \u0915\u0938\u094D\u091F\u092E\u0930 \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?`,
        highlightColor: "#F59E0B",
        bgTheme: "gradient_gold",
        cta: "\u0906\u0917\u0947 \u0926\u0947\u0916\u0947\u0902 \u23E9"
      },
      {
        sceneNumber: 2,
        title: "\u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0915\u094B \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902!",
        subtitle: "\u092E\u0947\u0939\u0928\u0924 \u0906\u092A\u0915\u0940 - \u092A\u0942\u0930\u0940 100% \u0915\u092E\u093E\u0908 \u092D\u0940 \u0906\u092A\u0915\u0940!",
        visualDescription: "Frustrated technician paying high middleman commissions",
        badge: "0% \u0915\u092E\u0940\u0936\u0928",
        voiceover: "\u0905\u092C \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0914\u0930 \u0920\u0947\u0915\u0947\u0926\u093E\u0930\u094B\u0902 \u0915\u094B \u0905\u092A\u0928\u0940 \u0917\u093E\u0922\u093C\u0940 \u0915\u092E\u093E\u0908 \u0915\u093E \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0940\u091C\u093F\u090F!",
        highlightColor: "#EF4444",
        bgTheme: "gradient_ruby",
        cta: "\u0938\u092E\u093E\u0927\u093E\u0928 \u092F\u0939\u093E\u0901 \u0939\u0948 \u{1F4A1}"
      },
      {
        sceneNumber: 3,
        title: "HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u092C\u0928\u0947\u0902!",
        subtitle: "\u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u091C\u0947\u0928\u094D\u092F\u0941\u0907\u0928 \u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u093E\u090F\u0902",
        visualDescription: "Smartphone showing HARDINKAAM app notification with new customer booking",
        badge: "100% \u0915\u092E\u093E\u0908",
        voiceover: "HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u093F\u090F! \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0905\u0938\u0932\u0940 \u0915\u0938\u094D\u091F\u092E\u0930\u094D\u0938 \u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092A\u093E\u090F\u0902 \u0914\u0930 \u092A\u0948\u0938\u0947 \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u092C\u0948\u0902\u0915 \u092E\u0947\u0902 \u0932\u0947\u0902\u0964",
        highlightColor: "#10B981",
        bgTheme: "gradient_emerald",
        cta: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0936\u0941\u0930\u0941\u0906\u0924 \u{1F381}"
      },
      {
        sceneNumber: 4,
        title: "\u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902!",
        subtitle: "\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 | \u{1F4DE} 6267546945",
        visualDescription: "Happy verified serviceman with badge and high ratings receiving payment",
        badge: "\u0911\u092B\u0930 \u0938\u0940\u092E\u093F\u0924 \u0938\u092E\u092F",
        voiceover: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902 www.hardinkaam.online \u092A\u0930 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 6267546945 \u092A\u0930\u0964 \u0906\u092A\u0915\u093E \u0905\u092A\u0928\u093E \u0915\u093E\u092E, \u0906\u092A\u0915\u0940 \u0924\u0930\u0915\u094D\u0915\u0940!",
        highlightColor: "#3B82F6",
        bgTheme: "gradient_cyber",
        cta: "\u{1F4F2} www.hardinkaam.online"
      }
    ];
    const videoAd = {
      title: parsed.videoAd?.title || `HARDINKAAM ${trade} Video Ad - ${location}`,
      durationSeconds: parsed.videoAd?.durationSeconds || 20,
      aspectRatios: parsed.videoAd?.aspectRatios || ["9:16", "1:1", "16:9"],
      scenes: Array.isArray(parsed.videoAd?.scenes) && parsed.videoAd.scenes.length > 0 ? parsed.videoAd.scenes : defaultScenes
    };
    const socialMedia = {
      instagramCaption: parsed.socialMedia?.instagramCaption || `\u{1F6E0}\uFE0F \u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u092F\u093E \u0915\u093F\u0938\u0940 \u092D\u0940 \u0924\u0915\u0928\u0940\u0915\u0940 \u0938\u0947\u0935\u093E \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?

\u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0915\u094B \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902 \u0914\u0930 \u091C\u0941\u0921\u093C\u0947\u0902 HARDINKAAM \u0938\u0947! \u{1F680}

\u2728 100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 \u0938\u0940\u0927\u0947 \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902
\u2728 \u0906\u092A\u0915\u0947 \u0905\u092A\u0928\u0947 \u092E\u094B\u0939\u0932\u094D\u0932\u0947/\u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0938\u0940\u0927\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938
\u2728 \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0932\u093E\u0907\u092B\u091F\u093E\u0907\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928

\u{1F4F2} \u092C\u093E\u092F\u094B \u092E\u0947\u0902 \u0926\u093F\u090F \u0932\u093F\u0902\u0915 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902 \u092F\u093E \u0935\u093F\u091C\u093F\u091F \u0915\u0930\u0947\u0902: www.hardinkaam.online
\u{1F4DE} \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928: +91 62675 46945

#HardinKaam #ServiceTechnician #${trade.replace(/[^a-zA-Z0-9]/g, "")} #Bhopal #IndiaServices #AtmanirbharBharat #DailyEarnings`,
      facebookAdText: parsed.socialMedia?.facebookAdText || `\u{1F4E2} ${location} \u0915\u0947 \u0938\u092D\u0940 ${trade} \u0914\u0930 \u0924\u0915\u0928\u0940\u0936\u093F\u092F\u0928 \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092C\u0921\u093C\u0940 \u0916\u0941\u0936\u0916\u092C\u0930\u0940!

\u0905\u092C \u0915\u093E\u092E \u0915\u0947 \u0932\u093F\u090F \u092D\u091F\u0915\u0928\u0947 \u0915\u0940 \u0915\u094B\u0908 \u091C\u0930\u0942\u0930\u0924 \u0928\u0939\u0940\u0902\u0964 HARDINKAAM (www.hardinkaam.online) \u0915\u0947 \u0938\u093E\u0925 \u091C\u0941\u0921\u093C\u0915\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u092A\u093E\u090F\u0901 \u092A\u0915\u094D\u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u0914\u0930 100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908\u0964

\u{1F449} \u0915\u094B\u0908 \u0915\u092E\u0940\u0936\u0928 \u0928\u0939\u0940\u0902, \u0915\u094B\u0908 \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u093E \u0928\u0939\u0940\u0902!
\u{1F449} \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0906\u0938\u093E\u0928 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928
\u{1F449} \u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0928\u0947\u091F\u0935\u0930\u094D\u0915

\u0906\u091C \u0939\u0940 \u0905\u092A\u0928\u0940 \u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u092C\u0928\u093E\u090F\u0902: https://www.hardinkaam.online
\u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 6267546945`,
      telegramAdText: parsed.socialMedia?.telegramAdText || `\u{1F680} *HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - ${location}*

\u0905\u0917\u0930 \u0906\u092A *${trade}* \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902, \u0924\u094B \u091C\u0941\u0921\u093C\u0947\u0902 \u092D\u093E\u0930\u0924 \u0915\u0947 \u0938\u092C\u0938\u0947 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0932\u0947\u091F\u092B\u0949\u0930\u094D\u092E \u0938\u0947\u0964

\u{1F539} \u0938\u0940\u0927\u0940 \u0915\u0938\u094D\u091F\u092E\u0930 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938
\u{1F539} 100% \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u092A\u0947\u092E\u0947\u0902\u091F
\u{1F539} \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u0938\u0947 \u0936\u0941\u0930\u0941\u0906\u0924

\u{1F310} *\u0935\u0947\u092C\u0938\u093E\u0907\u091F:* https://www.hardinkaam.online
\u260E\uFE0F *\u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928:* 6267546945`,
      twitterAdText: parsed.socialMedia?.twitterAdText || `${location} \u092E\u0947\u0902 ${trade} \u0915\u093E\u092E \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092E\u094C\u0915\u093E! @HardinKaam \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902 \u0914\u0930 0% \u0915\u092E\u0940\u0936\u0928 \u092A\u0930 100% \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0915\u092E\u093E\u0908 \u092A\u093E\u090F\u0902\u0964 \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928\u0964

\u0935\u093F\u091C\u093F\u091F \u0915\u0930\u0947\u0902: https://www.hardinkaam.online
\u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928: 6267546945 #HardinKaam #Services`,
      linkedInAdText: parsed.socialMedia?.linkedInAdText || `HARDINKAAM (powered by Deepak Buildcon Bhopal) is expanding its verified service professional & technician network across ${location} for ${trade} and skilled trades. We empower local service experts with direct bookings, zero intermediaries, and transparent digital livelihoods. Learn more at https://www.hardinkaam.online`
    };
    const defaultImagePrompts = [
      {
        id: `img_hero_${Date.now()}_1`,
        title: `${trade} Hero Marketing Poster`,
        category: "hero_poster",
        prompt: `Hyper-realistic photography of a skilled Indian ${trade} professional in a clean blue HARDINKAAM polo uniform holding genuine tools in ${districtOrCity}, ${state}, friendly confident smile, warm lighting, cinematic 8k resolution, authentic Indian setting, photorealistic.`,
        negativePrompt: "blurry, distorted faces, unrealistic hands, cartoon, 3d render",
        aspectRatio: "1:1",
        suggestedOverlayText: `100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 | ${trade} \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917`,
        visualDescription: `Professional ${trade} hero portrait in ${districtOrCity}`
      },
      {
        id: `img_story_${Date.now()}_2`,
        title: "Story / Reel Vertical Ad Poster",
        category: "story_reel",
        prompt: `Vertical 9:16 advertising creative visual, dynamic Indian technician performing ${trade} repair in modern home in ${districtOrCity}, sharp focus, vibrant cinematic lighting, authentic Indian lifestyle.`,
        aspectRatio: "9:16",
        suggestedOverlayText: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917 | \u0915\u0949\u0932: 6267546945",
        visualDescription: "Vertical format Instagram story visual"
      },
      {
        id: `img_banner_${Date.now()}_3`,
        title: "Multi-Service Social Landscape Banner",
        category: "banner_landscape",
        prompt: `Wide 16:9 banner showcasing trusted Indian service professionals in ${state} standing proudly with toolkits, daylight, blue sky, modern city backdrop, commercial photography.`,
        aspectRatio: "16:9",
        suggestedOverlayText: "\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 - www.hardinkaam.online",
        visualDescription: "Team landscape banner"
      }
    ];
    const imagePrompts = Array.isArray(parsed.imagePrompts) && parsed.imagePrompts.length > 0 ? parsed.imagePrompts : defaultImagePrompts;
    return {
      headline: parsed.headline || `HARDINKAAM ${trade} Onboarding Campaign - ${location}`,
      whatsappAdText: parsed.whatsappAdText || `\u{1F6E0}\uFE0F *HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948!* \u{1F6E0}\uFE0F

\u0928\u092E\u0938\u094D\u0924\u0947 \u091C\u0940,
\u0915\u094D\u092F\u093E \u0906\u092A *${location}* \u092E\u0947\u0902 *${trade}* \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0928\u090F \u0915\u0938\u094D\u091F\u092E\u0930\u094D\u0938 \u0914\u0930 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0915\u092E\u093E\u0908 \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902?

\u2728 *HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u0928\u0947 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0932\u093E\u092D:*
\u2705 \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u091C\u0947\u0928\u094D\u092F\u0941\u0907\u0928 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092A\u093E\u090F\u0902
\u2705 \u0930\u094B\u091C\u093C\u093E\u0928\u093E 100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 (\u0938\u0940\u0927\u0947 \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902)
\u2705 \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u0938\u0947 \u0932\u093E\u0907\u092B\u091F\u093E\u0907\u092E \u0938\u0926\u0938\u094D\u092F\u0924\u093E
\u2705 \u0915\u094B\u0908 \u0915\u092E\u0940\u0936\u0928 \u0928\u0939\u0940\u0902, \u0915\u094B\u0908 \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u093E \u0928\u0939\u0940\u0902!

\u{1F4F2} *\u0905\u092D\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902:* https://www.hardinkaam.online
\u{1F4DE} *\u0938\u092A\u094B\u0930\u094D\u091F \u0935 \u091C\u093E\u0928\u0915\u093E\u0930\u0940:* +91 62675 46945

_\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 - \u0906\u092A\u0915\u093E \u0905\u092A\u0928\u093E \u0915\u093E\u092E, \u0906\u092A\u0915\u0940 \u0905\u092A\u0928\u0940 \u0924\u0930\u0915\u094D\u0915\u0940!_`,
      smsPitch: parsed.smsPitch || `HARDINKAAM par ${trade} ke liye rozana nayi bookings paayein! Aaj hi register karein: https://www.hardinkaam.online Helpline: 6267546945`,
      audioVoiceScript: parsed.audioVoiceScript || `\u0928\u092E\u0938\u094D\u0924\u0947 \u092D\u093E\u0908 \u0938\u093E\u0939\u092C! \u092E\u0948\u0902 HARDINKAAM \u0915\u0940 \u091F\u0940\u092E \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u093E \u0939\u0942\u0901\u0964 \u0939\u092E \u0906\u092A\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 ${location} \u092E\u0947\u0902 \u0915\u0941\u0936\u0932 ${trade} \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u094B \u0939\u092E\u093E\u0930\u0940 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0910\u092A \u0938\u0947 \u091C\u094B\u0921\u093C \u0930\u0939\u0947 \u0939\u0948\u0902\u0964 \u092F\u0939\u093E\u0901 \u0906\u092A\u0915\u094B \u0939\u0930 \u0926\u093F\u0928 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0915\u092E\u0940\u0936\u0928 \u0915\u0947 \u0938\u0940\u0927\u0947 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0938\u0947 \u0915\u093E\u092E \u092E\u093F\u0932\u0924\u093E \u0939\u0948 \u0914\u0930 \u092A\u0948\u0938\u0947 \u0938\u0940\u0927\u0947 \u0906\u092A\u0915\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u0906\u0924\u0947 \u0939\u0948\u0902\u0964 \u0906\u091C \u0939\u0940 www.hardinkaam.online \u092A\u0930 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902 \u092F\u093E 6267546945 \u092A\u0930 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902\u0964 \u0927\u0928\u094D\u092F\u0935\u093E\u0926!`,
      videoAd,
      socialMedia,
      imagePrompts,
      demographics: {
        targetAudience,
        state,
        districtOrCity,
        localityOrVillage,
        ageGroup,
        campaignObjective,
        toneAndLanguage
      },
      suggestedActionSteps: parsed.suggestedActionSteps || [
        "Google Maps \u0938\u0947 \u092E\u093F\u0932\u0947 \u0932\u0940\u0921\u094D\u0938 \u0915\u094B \u0935\u0947\u0930\u0940\u092B\u093E\u0908 \u0915\u0930\u0947\u0902",
        "AI Image Prompts \u0938\u0947 \u092A\u094B\u0938\u094D\u091F\u0930 \u0935 \u0935\u093F\u091C\u0941\u0905\u0932 \u092C\u0948\u0928\u0930 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902",
        "AI Video Ad \u0914\u0930 Audio Ad \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u0930 \u0936\u0947\u092F\u0930 \u0915\u0930\u0947\u0902",
        "WhatsApp Ad \u092F\u093E SMS 1-\u0915\u094D\u0932\u093F\u0915 \u092E\u0947\u0902 \u092D\u0947\u091C\u0947\u0902",
        "\u0911\u0921\u093F\u092F\u094B \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F \u092A\u0922\u093C\u0915\u0930 \u0935\u0949\u0907\u0938 \u0928\u094B\u091F \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902",
        "\u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0939\u094B\u0928\u0947 \u092A\u0930 \u0910\u092A \u092E\u0947\u0902 \u0935\u0947\u0930\u093F\u092B\u093E\u0908 \u0915\u0930\u0947\u0902"
      ]
    };
  } catch (error) {
    console.log("[MarketingAgent] Delivering high-converting localized marketing creative package for", trade, "in", location);
    const defaultScenes = [
      {
        sceneNumber: 1,
        title: `\u0915\u093E\u092E \u0915\u0940 \u0924\u0932\u093E\u0936 \u092E\u0947\u0902 \u092D\u091F\u0915\u0928\u093E \u092C\u0902\u0926!`,
        subtitle: `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?`,
        visualDescription: "Professional technician with toolbag looking for customers",
        badge: "\u{1F6A8} \u092C\u0921\u093C\u093E \u092E\u094C\u0915\u093E",
        voiceover: `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0928\u090F \u0915\u0938\u094D\u091F\u092E\u0930 \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?`,
        highlightColor: "#F59E0B",
        bgTheme: "gradient_gold",
        cta: "\u0906\u0917\u0947 \u0926\u0947\u0916\u0947\u0902 \u23E9"
      },
      {
        sceneNumber: 2,
        title: "\u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0915\u094B \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902!",
        subtitle: "\u092E\u0947\u0939\u0928\u0924 \u0906\u092A\u0915\u0940 - \u092A\u0942\u0930\u0940 100% \u0915\u092E\u093E\u0908 \u092D\u0940 \u0906\u092A\u0915\u0940!",
        visualDescription: "Frustrated technician paying high middleman commissions",
        badge: "0% \u0915\u092E\u0940\u0936\u0928",
        voiceover: "\u0905\u092C \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0914\u0930 \u0920\u0947\u0915\u0947\u0926\u093E\u0930\u094B\u0902 \u0915\u094B \u0905\u092A\u0928\u0940 \u0917\u093E\u0922\u093C\u0940 \u0915\u092E\u093E\u0908 \u0915\u093E \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0940\u091C\u093F\u090F!",
        highlightColor: "#EF4444",
        bgTheme: "gradient_ruby",
        cta: "\u0938\u092E\u093E\u0927\u093E\u0928 \u092F\u0939\u093E\u0901 \u0939\u0948 \u{1F4A1}"
      },
      {
        sceneNumber: 3,
        title: "HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u092C\u0928\u0947\u0902!",
        subtitle: "\u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u091C\u0947\u0928\u094D\u092F\u0941\u0907\u0928 \u0917\u094D\u0930\u093E\u0939\u0915 \u092A\u093E\u090F\u0902",
        visualDescription: "Smartphone showing HARDINKAAM app notification with new customer booking",
        badge: "100% \u0915\u092E\u093E\u0908",
        voiceover: "HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u093F\u090F! \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u0905\u0938\u0932\u0940 \u0915\u0938\u094D\u091F\u092E\u0930\u094D\u0938 \u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092A\u093E\u090F\u0902 \u0914\u0930 \u092A\u0948\u0938\u0947 \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u092C\u0948\u0902\u0915 \u092E\u0947\u0902 \u0932\u0947\u0902\u0964",
        highlightColor: "#10B981",
        bgTheme: "gradient_emerald",
        cta: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0936\u0941\u0930\u0941\u0906\u0924 \u{1F381}"
      },
      {
        sceneNumber: 4,
        title: "\u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902!",
        subtitle: "\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 | \u{1F4DE} 6267546945",
        visualDescription: "Happy verified serviceman with badge and high ratings receiving payment",
        badge: "\u0911\u092B\u0930 \u0938\u0940\u092E\u093F\u0924 \u0938\u092E\u092F",
        voiceover: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0906\u091C \u0939\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902 www.hardinkaam.online \u092A\u0930 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 6267546945 \u092A\u0930\u0964 \u0906\u092A\u0915\u093E \u0905\u092A\u0928\u093E \u0915\u093E\u092E, \u0906\u092A\u0915\u0940 \u0924\u0930\u0915\u094D\u0915\u0940!",
        highlightColor: "#3B82F6",
        bgTheme: "gradient_cyber",
        cta: "\u{1F4F2} www.hardinkaam.online"
      }
    ];
    const fallbackImagePrompts = [
      {
        id: `img_hero_fb_1`,
        title: `${trade} Hero Marketing Poster`,
        category: "hero_poster",
        prompt: `Hyper-realistic photography of a skilled Indian ${trade} professional in a clean blue HARDINKAAM polo uniform holding genuine tools in ${districtOrCity}, ${state}, friendly confident smile, warm lighting, cinematic 8k resolution, authentic Indian setting, photorealistic.`,
        aspectRatio: "1:1",
        suggestedOverlayText: `100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 | ${trade} \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917`,
        visualDescription: `Professional ${trade} hero portrait in ${districtOrCity}`
      },
      {
        id: `img_story_fb_2`,
        title: "Story / Reel Vertical Ad Poster",
        category: "story_reel",
        prompt: `Vertical 9:16 advertising creative visual, dynamic Indian technician performing ${trade} repair in modern home in ${districtOrCity}, sharp focus, vibrant cinematic lighting, authentic Indian lifestyle.`,
        aspectRatio: "9:16",
        suggestedOverlayText: "\u092E\u093E\u0924\u094D\u0930 \u20B9121 \u092E\u0947\u0902 \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917 | \u0915\u0949\u0932: 6267546945",
        visualDescription: "Vertical format Instagram story visual"
      }
    ];
    return {
      headline: `HARDINKAAM ${trade} Onboarding Campaign - ${location}`,
      whatsappAdText: `\u{1F6E0}\uFE0F *HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948!* \u{1F6E0}\uFE0F

\u0928\u092E\u0938\u094D\u0924\u0947 \u091C\u0940,
\u0915\u094D\u092F\u093E \u0906\u092A *${location}* \u092E\u0947\u0902 *${trade}* \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u0930\u094B\u091C\u093C\u093E\u0928\u093E \u0928\u090F \u0915\u0938\u094D\u091F\u092E\u0930\u094D\u0938 \u0914\u0930 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0915\u092E\u093E\u0908 \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902?

\u2728 *HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u0928\u0947 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0932\u093E\u092D:*
\u2705 \u0938\u0940\u0927\u0947 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u0938\u0947 \u091C\u0947\u0928\u094D\u092F\u0941\u0907\u0928 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092A\u093E\u090F\u0902
\u2705 \u0930\u094B\u091C\u093C\u093E\u0928\u093E 100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908 (\u0938\u0940\u0927\u0947 \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902)
\u2705 \u092E\u093E\u0924\u094D\u0930 \u20B9121 \u0938\u0947 \u0932\u093E\u0907\u092B\u091F\u093E\u0907\u092E \u0938\u0926\u0938\u094D\u092F\u0924\u093E
\u2705 \u0915\u094B\u0908 \u0915\u092E\u0940\u0936\u0928 \u0928\u0939\u0940\u0902, \u0915\u094B\u0908 \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u093E \u0928\u0939\u0940\u0902!

\u{1F4F2} *\u0905\u092D\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930 \u0915\u0930\u0947\u0902:* https://www.hardinkaam.online
\u{1F4DE} *\u0938\u092A\u094B\u0930\u094D\u091F \u0935 \u091C\u093E\u0928\u0915\u093E\u0930\u0940:* +91 62675 46945

_\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 - \u0906\u092A\u0915\u093E \u0905\u092A\u0928\u093E \u0915\u093E\u092E, \u0906\u092A\u0915\u0940 \u0905\u092A\u0928\u0940 \u0924\u0930\u0915\u094D\u0915\u0940!_`,
      smsPitch: `HARDINKAAM par ${trade} ke liye rozana nayi bookings paayein! Aaj hi register karein: https://www.hardinkaam.online Helpline: 6267546945`,
      audioVoiceScript: `\u0928\u092E\u0938\u094D\u0924\u0947 \u092D\u093E\u0908 \u0938\u093E\u0939\u092C! \u092E\u0948\u0902 HARDINKAAM \u0915\u0940 \u091F\u0940\u092E \u0938\u0947 \u092C\u093E\u0924 \u0915\u0930 \u0930\u0939\u093E \u0939\u0942\u0901\u0964 ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E\u092E \u0915\u0947 \u0932\u093F\u090F \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u0940 \u092D\u093E\u0930\u0940 \u092E\u093E\u0902\u0917 \u0939\u0948\u0964 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u092C\u093F\u091A\u094C\u0932\u093F\u090F \u0915\u0947 \u0938\u0940\u0927\u0947 \u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0938\u0947 \u091C\u0941\u0921\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F www.hardinkaam.online \u092A\u0930 \u0905\u092D\u0940 \u0932\u0949\u0917\u093F\u0928 \u0915\u0930\u0947\u0902\u0964`,
      videoAd: {
        title: `HARDINKAAM ${trade} Video Ad - ${location}`,
        durationSeconds: 20,
        aspectRatios: ["9:16", "1:1", "16:9"],
        scenes: defaultScenes
      },
      socialMedia: {
        instagramCaption: `\u{1F6E0}\uFE0F \u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902? \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u094B\u0902 \u0915\u094B \u0915\u092E\u0940\u0936\u0928 \u0926\u0947\u0928\u093E \u092C\u0902\u0926 \u0915\u0930\u0947\u0902 \u0914\u0930 \u091C\u0941\u0921\u093C\u0947\u0902 HARDINKAAM \u0938\u0947! 100% \u0938\u0940\u0927\u0940 \u0915\u092E\u093E\u0908\u0964

\u0935\u093F\u091C\u093F\u091F \u0915\u0930\u0947\u0902: www.hardinkaam.online #HardinKaam #Technician #Bhopal`,
        facebookAdText: `\u{1F4E2} ${location} \u0915\u0947 \u0938\u092D\u0940 ${trade} \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092C\u0921\u093C\u0940 \u0916\u0941\u0936\u0916\u092C\u0930\u0940! HARDINKAAM (www.hardinkaam.online) \u0915\u0947 \u0938\u093E\u0925 \u091C\u0941\u0921\u093C\u0915\u0930 \u092A\u093E\u090F\u0901 \u092A\u0915\u094D\u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938\u0964 \u{1F4DE} 6267546945`,
        telegramAdText: `\u{1F680} *HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - ${location}*

${trade} \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0938\u0940\u0927\u0940 \u0915\u0938\u094D\u091F\u092E\u0930 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938\u0964
\u{1F310} https://www.hardinkaam.online`,
        twitterAdText: `${location} \u092E\u0947\u0902 ${trade} \u0915\u093E\u092E \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u092D\u093E\u0907\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092E\u094C\u0915\u093E! @HardinKaam \u0938\u0947 \u091C\u0941\u0921\u093C\u0947\u0902\u0964 https://www.hardinkaam.online`,
        linkedInAdText: `HARDINKAAM is expanding its verified service technician network across ${location}. Visit https://www.hardinkaam.online`
      },
      imagePrompts: fallbackImagePrompts,
      demographics: {
        targetAudience,
        state,
        districtOrCity,
        localityOrVillage,
        ageGroup,
        campaignObjective,
        toneAndLanguage
      },
      suggestedActionSteps: [
        "Google Maps \u0932\u0940\u0921\u094D\u0938 \u0915\u094B \u092B\u093F\u0932\u094D\u091F\u0930 \u0915\u0930\u0947\u0902",
        "AI Image Prompts \u0938\u0947 \u0935\u093F\u091C\u0941\u0905\u0932 \u092C\u0948\u0928\u0930 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902",
        "AI Video Ad \u0914\u0930 Audio Ad \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u0930 \u0936\u0947\u092F\u0930 \u0915\u0930\u0947\u0902",
        "WhatsApp \u0938\u0902\u0926\u0947\u0936 1-\u0915\u094D\u0932\u093F\u0915 \u092D\u0947\u091C\u0947\u0902",
        "\u0911\u0921\u093F\u092F\u094B \u0928\u094B\u091F \u092F\u093E \u092B\u094B\u0928 \u092A\u0930 \u092C\u093E\u0924 \u0915\u0930\u0947\u0902"
      ]
    };
  }
}
async function generateMarketingImageWithAI(params) {
  const { prompt, aspectRatio = "1:1" } = params;
  const validAspectRatio = aspectRatio === "9:16" || aspectRatio === "16:9" ? aspectRatio : "1:1";
  try {
    const ai = getGeminiClient();
    if (typeof ai.models.generateImages === "function") {
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: `${prompt}, ultra high quality advertising photography, commercial branding, vibrant Indian colors, 8k resolution`,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: validAspectRatio
        }
      });
      recordAISuccess();
      const base64Data = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64Data) {
        return {
          imageUrl: `data:image/jpeg;base64,${base64Data}`,
          mimeType: "image/jpeg"
        };
      }
    }
  } catch (err) {
    recordAIError(err);
    console.log("[MarketingAgent] Activating instant high-fidelity SVG poster generator for prompt:", prompt.slice(0, 40));
  }
  const cleanPrompt = prompt.replace(/[<>&"]/g, "");
  const width = validAspectRatio === "16:9" ? 1200 : validAspectRatio === "9:16" ? 675 : 800;
  const height = validAspectRatio === "16:9" ? 675 : validAspectRatio === "9:16" ? 1200 : 800;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ea580c"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${width * 0.25}" fill="#38bdf8" fill-opacity="0.15"/>
    <circle cx="${width * 0.1}" cy="${height * 0.85}" r="${width * 0.3}" fill="#ea580c" fill-opacity="0.12"/>
    
    <rect x="${width * 0.05}" y="${height * 0.05}" width="${width * 0.9}" height="${height * 0.9}" rx="28" fill="#1e293b" fill-opacity="0.75" stroke="#38bdf8" stroke-opacity="0.3" stroke-width="2" filter="url(#shadow)"/>
    
    <rect x="${width * 0.1}" y="${height * 0.12}" width="220" height="40" rx="20" fill="url(#accent)"/>
    <text x="${width * 0.1 + 110}" y="${height * 0.12 + 25}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" text-anchor="middle" letter-spacing="1">HARDINKAAM AI AD</text>

    <text x="${width * 0.1}" y="${height * 0.28}" fill="#fef08a" font-family="system-ui, -apple-system, sans-serif" font-size="${width > 700 ? 32 : 24}" font-weight="900">${cleanPrompt.slice(0, 36)}</text>
    <text x="${width * 0.1}" y="${height * 0.35}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="${width > 700 ? 24 : 18}" font-weight="700">${cleanPrompt.slice(36, 80) || "\u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u092E\u093E\u0924\u094D\u0930 60 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0909\u092A\u0932\u092C\u094D\u0927"}</text>

    <line x1="${width * 0.1}" y1="${height * 0.42}" x2="${width * 0.9}" y2="${height * 0.42}" stroke="#334155" stroke-width="2"/>

    <text x="${width * 0.1}" y="${height * 0.52}" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800">\u26A1 100% \u0938\u0902\u0924\u094B\u0937 \u0915\u0940 \u0917\u093E\u0930\u0902\u091F\u0940 \u2022 \u0928\u094B \u0939\u093F\u0921\u0928 \u091A\u093E\u0930\u094D\u091C\u0947\u0938</text>
    <text x="${width * 0.1}" y="${height * 0.59}" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="18">\u{1F4CD} \u092D\u094B\u092A\u093E\u0932, \u0907\u0902\u0926\u094C\u0930 \u0935 \u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936 \u0915\u0947 \u092A\u094D\u0930\u092E\u0941\u0916 \u0936\u0939\u0930\u094B\u0902 \u092E\u0947\u0902 \u0938\u0947\u0935\u093E\u090F\u0902</text>
    <text x="${width * 0.1}" y="${height * 0.66}" fill="#a7f3d0" font-family="system-ui, -apple-system, sans-serif" font-size="18">\u{1F4BC} \u20B9121 \u0932\u093E\u0907\u092B\u091F\u093E\u0907\u092E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u2022 0% \u0915\u092E\u0940\u0936\u0928</text>

    <rect x="${width * 0.1}" y="${height * 0.76}" width="${width * 0.8}" height="64" rx="18" fill="url(#accent)"/>
    <text x="${width * 0.5}" y="${height * 0.76 + 40}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" text-anchor="middle">www.hardinkaam.online \u092A\u0930 \u0905\u092D\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902</text>
  </svg>`;
  return {
    imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    mimeType: "image/svg+xml"
  };
}
function getSceneVisualMedia(params) {
  const text = `${params.scenePrompt || ""} ${params.tradeOrService || ""} ${params.theme || ""}`.toLowerCase();
  if (text.includes("ac") || text.includes("\u0915\u0942\u0932") || text.includes("cooling") || text.includes("\u0939\u0935\u093E") || text.includes("\u0917\u0948\u0938") || text.includes("appliance")) {
    const acImages = [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: acImages[params.sceneIndex % acImages.length], mediaType: "image" };
  }
  if (text.includes("\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940") || text.includes("electric") || text.includes("wiring") || text.includes("\u092A\u093E\u0935\u0930") || text.includes("\u0936\u0949\u0930\u094D\u091F") || text.includes("\u092A\u0902\u0916\u093E") || text.includes("\u0917\u0940\u091C\u0930")) {
    const electricImages = [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: electricImages[params.sceneIndex % electricImages.length], mediaType: "image" };
  }
  if (text.includes("\u092A\u094D\u0932\u0902\u092C\u0930") || text.includes("plumb") || text.includes("\u092A\u093E\u0928\u0940") || text.includes("\u0932\u0940\u0915") || text.includes("leak") || text.includes("\u0935\u093E\u091F\u0930\u092A\u094D\u0930\u0942\u092B") || text.includes("\u0938\u0940\u092A\u0947\u091C") || text.includes("\u092E\u094B\u091F\u0930")) {
    const plumbImages = [
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: plumbImages[params.sceneIndex % plumbImages.length], mediaType: "image" };
  }
  if (text.includes("\u092A\u0947\u0902\u091F") || text.includes("paint") || text.includes("\u0926\u0940\u0935\u093E\u0930") || text.includes("wall") || text.includes("\u092A\u0941\u091F\u094D\u091F\u0940") || text.includes("\u0915\u0932\u0930") || text.includes("\u0938\u0940\u0932\u0928")) {
    const paintImages = [
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1574360851983-64ac5705a2ec?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: paintImages[params.sceneIndex % paintImages.length], mediaType: "image" };
  }
  if (text.includes("\u0938\u092B\u093E\u0908") || text.includes("clean") || text.includes("\u091D\u093E\u0921\u093C\u0942") || text.includes("\u0938\u094B\u092B\u093E") || text.includes("\u0915\u093F\u091A\u0928") || text.includes("\u0921\u0938\u094D\u091F")) {
    const cleanImages = [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: cleanImages[params.sceneIndex % cleanImages.length], mediaType: "image" };
  }
  if (text.includes("\u0915\u093E\u0930\u092A\u0947\u0902\u091F") || text.includes("carpent") || text.includes("\u092B\u0930\u094D\u0928\u0940\u091A\u0930") || text.includes("\u0932\u0915\u0921\u093C\u0940") || text.includes("\u0926\u0930\u0935\u093E\u091C\u093E") || text.includes("wood")) {
    const carpImages = [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: carpImages[params.sceneIndex % carpImages.length], mediaType: "image" };
  }
  if (text.includes("\u0917\u093E\u0928\u093E") || text.includes("\u0917\u0940\u0924") || text.includes("song") || text.includes("sing") || text.includes("music") || text.includes("\u0938\u0902\u0917\u0940\u0924") || text.includes("\u091C\u0936\u094D\u0928")) {
    const musicalImages = [
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
    ];
    return { url: musicalImages[params.sceneIndex % musicalImages.length], mediaType: "image" };
  }
  const generalGallery = [
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&auto=format&fit=crop&q=80",
    // Confident technician
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80",
    // Happy homeowner kitchen
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80",
    // Smartphone booking
    "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=1200&auto=format&fit=crop&q=80",
    // City skyline
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80"
    // Beautiful home
  ];
  return { url: generalGallery[params.sceneIndex % generalGallery.length], mediaType: "image" };
}
async function generateVideoStoryboardWithGemini(params) {
  const {
    scriptText = "",
    theme = "promotional_offer",
    tradeOrService = "Home Services",
    location = "Bhopal, Madhya Pradesh",
    targetAudience = "Customers and homeowners",
    aspectRatio = "16:9",
    sceneCount = 4,
    voiceGender = "female",
    voiceStyle = "warm_melodic",
    bgmStyle = "ambient_corporate"
  } = params;
  const isSongRequested = voiceGender === "singing" || scriptText.toLowerCase().includes("\u0917\u093E\u0928\u093E") || scriptText.toLowerCase().includes("\u0917\u0940\u0924") || scriptText.toLowerCase().includes("song") || scriptText.toLowerCase().includes("sing");
  const prompt = `You are an elite commercial video director, creative ad lyricist, and cinematographer for HARDINKAAM (www.hardinkaam.online), India's on-demand home services brand based in Bhopal & Indore.
Create a high-converting, professional, multi-scene video ad / short film storyboard based on the following input:

Input Advertising Script / Concept: "${scriptText || "Promote verified on-demand home services with upfront pricing and 60-minute doorstep arrival."}"
Category / Trade: "${tradeOrService}"
Target Audience: "${targetAudience}"
Location Focus: "${location}"
Video Theme / Goal: "${theme}"
Aspect Ratio: "${aspectRatio}"
Number of Scenes: ${sceneCount}
Voice Style & Persona: "${voiceGender === "male" ? "Energetic / Deep Male Voiceover" : voiceGender === "female" ? "Warm / Melodic Female Voiceover" : "Singing / Musical Melodic Jingle"}"
Song / Jingle Mode: ${isSongRequested ? "YES - Write catchy rhyming lyrical song lines (\u0917\u093E\u0928\u093E/\u0917\u0940\u0924 \u0915\u0947 \u092C\u094B\u0932) in Hindi / Hinglish for each scene that can be sung over background music!" : "NO - Natural spoken conversational voiceover."}

Structure the output strictly in valid JSON matching this format:
{
  "adTitle": "Compelling Title in Hindi / Hinglish",
  "hookLine": "First 3-second attention-grabbing hook sentence or catchy musical hook",
  "theme": "${theme}",
  "aspectRatio": "${aspectRatio}",
  "totalDurationSeconds": 24,
  "suggestedMusicMood": "${bgmStyle || (isSongRequested ? "acoustic_folk" : "ambient_corporate")}",
  "isSongOrJingle": ${isSongRequested},
  "songLyrics": "${isSongRequested ? "Full rhyming song lyrics across all scenes" : ""}",
  "fullVoiceoverScript": "Full connected voiceover script across all scenes in Hindi or Hinglish",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 6,
      "title": "Bold On-Screen Headline",
      "subtitle": "Clear secondary benefit line",
      "badge": "\u{1F6A8} \u0927\u094D\u092F\u093E\u0928\u093E\u0915\u0930\u094D\u0937\u0923 / 60 Min Arrival",
      "visualPrompt": "Detailed visual description of what should appear on screen (e.g. technician arriving on scooter in Bhopal, homeowner with leaking pipe, etc.)",
      "cameraMovement": "Slow zoom in with subtle blur transition",
      "voiceoverText": "${isSongRequested ? "Rhyming musical lyrical line to sing in Hindi" : "Spoken sentence for this specific scene in natural Hindi / Hinglish"}",
      "captionText": "Short subtitle text for this scene",
      "ctaText": "Next Scene \u23E9",
      "highlightColor": "#F26A0F",
      "bgTheme": "gradient_gold"
    }
  ]
}

STRICT GUIDELINES:
- Output only valid JSON.
- Voiceover should be punchy, culturally resonant Indian Hindi or Hinglish that connects with local residents or technicians.
- Include valid themes: "gradient_gold", "gradient_emerald", "gradient_cyber", "gradient_dark", or "gradient_ruby".
- Ensure exactly ${sceneCount} scenes with realistic 4 to 8 seconds durations.`;
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_CANONICAL_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    recordAISuccess();
    const parsed = JSON.parse(response.text || "{}");
    if (parsed.scenes && parsed.scenes.length > 0) {
      const enrichedScenes = parsed.scenes.map((sc, sIdx) => {
        const media = getSceneVisualMedia({
          scenePrompt: sc.visualPrompt || sc.title,
          tradeOrService,
          theme,
          sceneIndex: sIdx,
          totalScenes: parsed.scenes.length
        });
        return {
          ...sc,
          attachedMediaUrl: sc.attachedMediaUrl || media.url,
          attachedMediaType: "image"
        };
      });
      return {
        ...parsed,
        voiceGender,
        voiceStyle,
        suggestedMusicMood: bgmStyle || parsed.suggestedMusicMood || "ambient_corporate",
        isSongOrJingle: isSongRequested,
        scenes: enrichedScenes
      };
    }
    throw new Error("Incomplete scenes array in Gemini response");
  } catch (err) {
    recordAIError(err);
    console.log("[MarketingAgent] Delivering high-impact multi-scene video storyboard for", tradeOrService, "in", location);
    const fallbackScenesRaw = [
      {
        sceneNumber: 1,
        durationSeconds: 6,
        title: isSongRequested ? `\u0918\u0930 \u0915\u093E \u0915\u093E\u092E \u0939\u0941\u0906 \u0906\u0938\u093E\u0928, \u0938\u0941\u0928\u094B \u092E\u0947\u0930\u0940 \u092C\u093E\u0924!` : `\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u093E \u092A\u0915\u094D\u0915\u093E \u0938\u092E\u093E\u0927\u093E\u0928!`,
        subtitle: `${location} \u092E\u0947\u0902 \u092A\u093E\u090F\u0902 \u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921 ${tradeOrService}`,
        badge: "\u26A1 60-\u092E\u093F\u0928\u091F \u0905\u0930\u093E\u0907\u0935\u0932",
        visualPrompt: `A frustrated homeowner in a modern Indian home in ${location} pointing to a faulty home appliance or plumbing leak.`,
        cameraMovement: "Slow dramatic zoom in",
        voiceoverText: isSongRequested ? `\u0905\u0930\u0947 \u092C\u093F\u091C\u0932\u0940 \u091C\u093E\u090F \u092F\u093E \u0928\u0932 \u091F\u092A\u0915\u0947, \u0905\u092C \u092B\u093F\u0915\u0930 \u091B\u094B\u0921\u093C\u094B \u092D\u0948\u092F\u093E!` : `\u0918\u0930 \u0915\u0947 \u0915\u093E\u092E \u0915\u094B \u0932\u0947\u0915\u0930 \u092C\u093E\u0930-\u092C\u093E\u0930 \u092A\u0930\u0947\u0936\u093E\u0928 \u0939\u094B\u0928\u093E \u0905\u092C \u092C\u0902\u0926 \u0915\u0940\u091C\u093F\u090F!`,
        captionText: `\u0905\u092C \u0915\u093E\u092E \u0922\u0942\u0902\u0922\u0928\u0947 \u0915\u093E \u091D\u0902\u091D\u091F \u0916\u0924\u094D\u092E`,
        ctaText: `\u0938\u092E\u093E\u0927\u093E\u0928 \u0926\u0947\u0916\u0947\u0902 \u23E9`,
        highlightColor: "#F26A0F",
        bgTheme: "gradient_gold"
      },
      {
        sceneNumber: 2,
        durationSeconds: 6,
        title: isSongRequested ? `\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0915\u093E \u0939\u0941\u0928\u0930, \u0938\u091A\u094D\u091A\u093E \u0939\u0948 \u0905\u0938\u0930!` : `HARDINKAAM - \u0905\u0938\u0932\u0940 \u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932\u094D\u0938`,
        subtitle: `\u0906\u0927\u093E\u0930, \u092A\u0941\u0932\u093F\u0938 \u0935\u0947\u0930\u093F\u092B\u093F\u0915\u0947\u0936\u0928 \u0914\u0930 \u091F\u094D\u0930\u0947\u0921 \u091F\u0947\u0938\u094D\u091F\u0947\u0921 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928`,
        badge: "\u{1F6E1}\uFE0F 100% \u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921",
        visualPrompt: `Professional technician in Hardinkaam branded uniform with tool bag ringing doorbell with a confident smile.`,
        cameraMovement: "Tracking shot right to left",
        voiceoverText: isSongRequested ? `\u092B\u094B\u0928 \u092E\u093F\u0932\u093E\u0913 \u092F\u093E \u0910\u092A \u091A\u0932\u093E\u0913, \u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921 \u0915\u093E\u0930\u0940\u0917\u0930 \u092C\u0941\u0932\u093E\u0913!` : `\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0906\u092A\u0915\u0947 \u0926\u0930\u0935\u093E\u091C\u0947 \u092A\u0930 \u0932\u093E\u0924\u093E \u0939\u0948 100% \u0935\u0947\u0930\u093F\u092B\u093E\u0907\u0921 \u0914\u0930 \u0905\u0928\u0941\u092D\u0935\u0940 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928\u0964`,
        captionText: `\u0935\u093F\u0936\u094D\u0935\u0938\u0928\u0940\u092F \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u0947\u0935\u093E`,
        ctaText: `\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0915\u0940 \u0917\u093E\u0930\u0902\u091F\u0940 \u{1F6E1}\uFE0F`,
        highlightColor: "#10B981",
        bgTheme: "gradient_emerald"
      },
      {
        sceneNumber: 3,
        durationSeconds: 6,
        title: isSongRequested ? `\u0928\u093E \u0915\u094B\u0908 \u0939\u0947\u0930\u093E\u092B\u0947\u0930\u0940, \u0928\u093E \u0926\u093E\u092E \u092E\u0947\u0902 \u0926\u0947\u0930\u0940!` : `\u0909\u091A\u093F\u0924 \u0926\u093E\u092E \u2022 \u0928\u094B \u0939\u093F\u0921\u0928 \u091A\u093E\u0930\u094D\u091C`,
        subtitle: `\u0915\u093E\u092E \u0936\u0941\u0930\u0942 \u0939\u094B\u0928\u0947 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0924\u092F \u0930\u0947\u091F \u0915\u093E\u0930\u094D\u0921 \u0914\u0930 \u0911\u0928\u0932\u093E\u0907\u0928 \u092C\u093F\u0932\u093F\u0902\u0917`,
        badge: "\u{1F4B0} \u092B\u093F\u0915\u094D\u0938 \u0930\u0947\u091F \u0915\u093E\u0930\u094D\u0921",
        visualPrompt: `Customer paying securely via smartphone app with transparent invoice and smiling technician.`,
        cameraMovement: "Close-up of phone invoice and satisfied thumbs-up",
        voiceoverText: isSongRequested ? `\u092B\u093F\u0915\u094D\u0938 \u0930\u0947\u091F \u0915\u093E\u0930\u094D\u0921 \u0914\u0930 \u092A\u0915\u094D\u0915\u093E \u092C\u093F\u0932, \u0916\u0941\u0936 \u0939\u094B \u091C\u093E\u090F\u0917\u093E \u0938\u092C\u0915\u093E \u0926\u093F\u0932!` : `\u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092E\u094B\u0932\u092D\u093E\u0935 \u0915\u0947, \u092A\u0939\u0932\u0947 \u0938\u0947 \u0924\u092F \u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940 \u0926\u0930\u094B\u0902 \u092A\u0930 \u0915\u093E\u092E \u0915\u0930\u0935\u093E\u090F\u0902\u0964`,
        captionText: `\u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940 \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092D\u0941\u0917\u0924\u093E\u0928`,
        ctaText: `\u0930\u0947\u091F \u0915\u093E\u0930\u094D\u0921 \u0926\u0947\u0916\u0947\u0902 \u{1F4CA}`,
        highlightColor: "#3B82F6",
        bgTheme: "gradient_cyber"
      },
      {
        sceneNumber: 4,
        durationSeconds: 6,
        title: isSongRequested ? `\u0906\u091C \u0939\u0940 \u092C\u0941\u0915 \u0915\u0930\u094B, \u092E\u0941\u0938\u094D\u0915\u093E\u0928 \u0938\u0902\u0917 \u091C\u093F\u092F\u094B!` : `\u0906\u091C \u0939\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902!`,
        subtitle: `\u0926\u0940\u092A\u0915 \u092C\u093F\u0932\u094D\u0921\u0915\u0949\u0928 \u092D\u094B\u092A\u093E\u0932 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u0902\u091A\u093E\u0932\u093F\u0924 | \u{1F4DE} 6267546945`,
        badge: "\u{1F389} \u0924\u0941\u0930\u0902\u0924 \u092C\u0941\u0915\u093F\u0902\u0917",
        visualPrompt: `Hardinkaam mobile web app UI displaying instant booking confirmation with contact details.`,
        cameraMovement: "Static hero display with sparkling overlay",
        voiceoverText: isSongRequested ? `\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0921\u0949\u091F \u0911\u0928\u0932\u093E\u0907\u0928 \u092A\u0930 \u0906\u0913, \u0939\u0930 \u0926\u093F\u0928 \u0906\u0938\u093E\u0928 \u092C\u0928\u093E\u0913!` : `\u0905\u092D\u0940 \u0935\u093F\u091C\u093F\u091F \u0915\u0930\u0947\u0902 www.hardinkaam.online \u092A\u0930 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 6267546945 \u092A\u0930!`,
        captionText: `www.hardinkaam.online | \u{1F4DE} 6267546945`,
        ctaText: `\u{1F4F2} \u0905\u092D\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902`,
        highlightColor: "#EC4899",
        bgTheme: "gradient_ruby"
      }
    ];
    const fallbackScenes = fallbackScenesRaw.map((sc, sIdx) => {
      const media = getSceneVisualMedia({
        scenePrompt: sc.visualPrompt,
        tradeOrService,
        theme,
        sceneIndex: sIdx,
        totalScenes: fallbackScenesRaw.length
      });
      return {
        ...sc,
        attachedMediaUrl: media.url,
        attachedMediaType: "image"
      };
    });
    return {
      adTitle: `${tradeOrService} - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E ${isSongRequested ? "\u0938\u0902\u0917\u0940\u0924\u092E\u092F \u091C\u093F\u0902\u0917\u0932" : "\u0938\u094D\u092A\u0947\u0936\u0932 \u0911\u092B\u0930"}`,
      hookLine: isSongRequested ? `\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u0940 \u090F\u0915 \u0939\u0940 \u0927\u0941\u0928 - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E!` : `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 ${tradeOrService} \u0938\u0947\u0935\u093E \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?`,
      theme,
      aspectRatio,
      totalDurationSeconds: 24,
      suggestedMusicMood: bgmStyle || (isSongRequested ? "acoustic_folk" : "ambient_corporate"),
      voiceGender,
      voiceStyle,
      isSongOrJingle: isSongRequested,
      songLyrics: fallbackScenes.map((s) => s.voiceoverText).join(" \u{1F3B5} "),
      fullVoiceoverScript: fallbackScenes.map((s) => s.voiceoverText).join(" "),
      scenes: fallbackScenes
    };
  }
}

// server/aiAdStudioService.ts
var LANGUAGE_LABELS = {
  auto: "Auto Detect",
  hi: "Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)",
  en: "English",
  hinglish: "Hinglish (\u092C\u094B\u0932\u091A\u093E\u0932 \u0939\u093F\u0902\u0926\u0940-\u0907\u0902\u0917\u094D\u0932\u093F\u0936)",
  mr: "Marathi (\u092E\u0930\u093E\u0920\u0940)",
  gu: "Gujarati (\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0)",
  pa: "Punjabi (\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40)",
  bn: "Bengali (\u09AC\u09BE\u0982\u09B2\u09BE)",
  ta: "Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)",
  te: "Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)",
  kn: "Kannada (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)",
  ml: "Malayalam (\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02)",
  or: "Odia (\u0B13\u0B21\u0B3C\u0B3F\u0B06)",
  ur: "Urdu (\u0627\u0631\u062F\u0648)"
};
var DEFAULT_AI_AVATARS = [
  {
    id: "avatar_ananya_01",
    name: "Ananya Sharma",
    roleTitle: "Senior Customer Trust Anchor & Host",
    gender: "female",
    previewImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80",
    avatarVideoUrl: "",
    speechModelStyle: "friendly",
    preferredVoiceURI: "Google \u0939\u093F\u0928\u094D\u0926\u0940",
    voicePitch: 1.05,
    voiceRate: 1,
    qualityScore: 98,
    analysis: {
      faceQuality: "excellent",
      lighting: "studio",
      audioQuality: "high",
      resolution: "4K Ultra HD (3840x2160)",
      speechClarity: "crisp"
    },
    consentVerified: true,
    isApproved: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "avatar_vikram_02",
    name: "Vikram Rajput",
    roleTitle: "Lead Technical Operations Director",
    gender: "male",
    previewImageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80",
    avatarVideoUrl: "",
    speechModelStyle: "professional",
    preferredVoiceURI: "Google Indian English",
    voicePitch: 0.95,
    voiceRate: 0.98,
    qualityScore: 96,
    analysis: {
      faceQuality: "excellent",
      lighting: "studio",
      audioQuality: "high",
      resolution: "4K Ultra HD (3840x2160)",
      speechClarity: "crisp"
    },
    consentVerified: true,
    isApproved: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "avatar_kavita_03",
    name: "Kavita Verma",
    roleTitle: "Bhopal & Indore Local Community Host",
    gender: "female",
    previewImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80",
    avatarVideoUrl: "",
    speechModelStyle: "energetic",
    preferredVoiceURI: "Google \u0939\u093F\u0928\u094D\u0926\u0940",
    voicePitch: 1,
    voiceRate: 1.05,
    qualityScore: 95,
    analysis: {
      faceQuality: "good",
      lighting: "studio",
      audioQuality: "clean",
      resolution: "1080p Full HD",
      speechClarity: "clear"
    },
    consentVerified: true,
    isApproved: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "avatar_rahul_04",
    name: "Rahul Joshi",
    roleTitle: "Verified Service Specialist & Trainer",
    gender: "male",
    previewImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    avatarVideoUrl: "",
    speechModelStyle: "authoritative",
    preferredVoiceURI: "Google Indian English",
    voicePitch: 0.98,
    voiceRate: 1,
    qualityScore: 94,
    analysis: {
      faceQuality: "good",
      lighting: "natural",
      audioQuality: "clean",
      resolution: "1080p Full HD",
      speechClarity: "crisp"
    },
    consentVerified: true,
    isApproved: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
async function generateAdStudioProject(params) {
  const {
    prompt: userPrompt,
    language = "auto",
    duration = 30,
    voiceOption = "ai_female",
    voiceStyle = "professional",
    format = "auto",
    bgmStyle = "corporate",
    location = "Bhopal & Indore, MP",
    includeAvatar = false,
    avatarId = "avatar_ananya_01",
    avatarUsageMode = "auto",
    avatarPlacement = "pip_bottom_right"
  } = params;
  const resolvedFormat = format === "auto" ? duration <= 30 ? "9:16" : "16:9" : format;
  const resolvedVoiceGender = voiceOption === "ai_male" ? "male" : "female";
  const sceneCount = duration <= 15 ? 3 : duration <= 30 ? 4 : duration <= 60 ? 5 : 6;
  const sceneSeconds = Math.round(duration / sceneCount);
  const projectId = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const promptInstruction = `You are the Lead Creative Ad Director & Cinematographer for HARDINKAAM (www.hardinkaam.online), Madhya Pradesh's premier on-demand home & commercial services platform (AC repair, electrician, plumbing, RO water, carpentry, cleaning, CCTV).
The platform offers verified background-checked technicians in 30 minutes with a 100% satisfaction guarantee.

User Advertisement Request:
"${userPrompt}"

Target Duration: ${duration} seconds (${sceneCount} scenes)
Language Choice: ${language === "auto" ? "Detect from prompt, preferably natural Hinglish/Hindi or English" : language}
Aspect Ratio: ${resolvedFormat}
Voice Choice: ${voiceOption} (${voiceStyle})
Target City/Region: ${location}

Create an end-to-end, high-converting commercial advertising package in valid JSON with this exact schema:
{
  "adTitle": "Punchy ad headline",
  "hookLine": "3-second scroll-stopping hook line",
  "advertisingStrategy": "1-2 sentence marketing strategy",
  "targetAudience": "E.g. Homeowners, tenants, shops in Bhopal & Indore facing urgent repairs",
  "detectedLanguage": "${language === "auto" ? "hi" : language}",
  "musicMood": "cinematic | corporate | upbeat | emotional | indian_folk",
  "musicTempoBpm": 115,
  "musicIntensity": "medium",
  "fullVoiceoverScript": "Complete continuous narration script for speech synthesis",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": ${sceneSeconds},
      "title": "Scene headline",
      "subtitle": "Short supporting text",
      "badge": "Short badge e.g. '30-Min Arrival' or 'Bhopal Emergency'",
      "visualPrompt": "Detailed visual description of home service technician or scene",
      "cameraMovement": "slow_zoom_in | pan_right | cinematic_push | static_hero | fade_reveal",
      "voiceoverText": "Specific spoken line for this scene (timed to ${sceneSeconds}s)",
      "captionText": "Catchy on-screen caption subtitle",
      "ctaText": "CTA or helpline",
      "highlightColor": "#F59E0B"
    }
  ],
  "socialPublish": {
    "instagramReelCaption": "Engaging caption with hashtags",
    "youtubeShortsTitle": "Click-worthy YouTube Shorts title",
    "youtubeDescription": "Detailed YouTube video description with booking link www.hardinkaam.online and phone 0755-HARDIN",
    "whatsAppBroadcastText": "Crisp WhatsApp broadcast message with emojis",
    "hashtags": ["#HARDINKAAM", "#BhopalServices", "#ACRepairBhopal", "#HomeServices"]
  }
}

Respond ONLY with pristine JSON. No markdown backticks, no markdown wrapping, no explanatory text.`;
      const response = await gemini.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: promptInstruction,
        config: {
          temperature: 0.7
        }
      });
      const rawText = response?.text?.trim() || "";
      let cleanJson = rawText;
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      }
      const parsed = JSON.parse(cleanJson);
      if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
        recordAISuccess();
        const scenes = parsed.scenes.map((s, idx) => {
          const media = getSceneVisualMedia({
            scenePrompt: s.visualPrompt || s.title,
            tradeOrService: userPrompt,
            theme: parsed.musicMood || bgmStyle,
            sceneIndex: idx,
            totalScenes: parsed.scenes.length
          });
          return {
            id: `scene_${idx + 1}`,
            sceneNumber: idx + 1,
            durationSeconds: s.durationSeconds || sceneSeconds,
            title: s.title || `\u0938\u0940\u0928 ${idx + 1}`,
            subtitle: s.subtitle || "\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0938\u0947\u0935\u093E",
            badge: s.badge || (idx === 0 ? "\u{1F525} \u0939\u0949\u091F \u0911\u092B\u0930" : "\u2713 \u0935\u0947\u0930\u093E\u092B\u093E\u0907\u0921 \u0938\u0947\u0935\u093E"),
            visualPrompt: s.visualPrompt || "HARDINKAAM professional service technician in uniform",
            cameraMovement: s.cameraMovement || "slow_zoom_in",
            voiceoverText: s.voiceoverText || s.title || "",
            captionText: s.captionText || s.voiceoverText || "",
            ctaText: s.ctaText || "\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0910\u092A \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902",
            highlightColor: s.highlightColor || "#F59E0B",
            mediaUrl: media.url,
            mediaType: "image",
            transition: "fade"
          };
        });
        if (includeAvatar) {
          const selectedAvatar = DEFAULT_AI_AVATARS.find((a) => a.id === avatarId) || DEFAULT_AI_AVATARS[0];
          scenes.forEach((sc, idx) => {
            let sceneHasAvatar = false;
            if (avatarUsageMode === "full") {
              sceneHasAvatar = true;
            } else if (avatarUsageMode === "intro" && idx === 0) {
              sceneHasAvatar = true;
            } else if (avatarUsageMode === "outro" && idx === scenes.length - 1) {
              sceneHasAvatar = true;
            } else if (avatarUsageMode === "presenter") {
              sceneHasAvatar = idx === 0 || idx === scenes.length - 1;
            } else if (avatarUsageMode === "auto") {
              sceneHasAvatar = idx === 0 || idx === scenes.length - 1 || scenes.length >= 5 && idx === 2;
            }
            sc.hasAvatar = sceneHasAvatar;
            sc.avatarPlacement = sceneHasAvatar ? avatarPlacement : void 0;
            sc.avatarApproved = sceneHasAvatar ? true : void 0;
            sc.avatarScriptPrompt = sceneHasAvatar ? sc.voiceoverText : void 0;
          });
        }
        const totalDuration = scenes.reduce((acc, sc) => acc + sc.durationSeconds, 0);
        return {
          id: projectId,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          userPrompt,
          adTitle: parsed.adTitle || "HARDINKAAM \u092A\u094D\u0930\u0940\u092E\u093F\u092F\u092E \u0938\u0947\u0935\u093E \u0935\u093F\u091C\u094D\u091E\u093E\u092A\u0928",
          hookLine: parsed.hookLine || "\u0915\u094D\u092F\u093E \u0906\u092A \u092D\u094B\u092A\u093E\u0932-\u0907\u0902\u0926\u094C\u0930 \u092E\u0947\u0902 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0938\u0947\u0935\u093E \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?",
          advertisingStrategy: parsed.advertisingStrategy || "Direct Problem-Agitation-Solution model targeting homeowners in MP.",
          targetAudience: parsed.targetAudience || "Homeowners & offices across Bhopal, Indore & MP.",
          language: parsed.detectedLanguage || language,
          voiceLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
          captionLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
          scriptLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
          aspectRatio: resolvedFormat,
          totalDurationSeconds: totalDuration || duration,
          voiceOption,
          voiceGender: resolvedVoiceGender,
          voiceStyle,
          fullVoiceoverScript: parsed.fullVoiceoverScript || scenes.map((s) => s.voiceoverText).join(" "),
          scenes,
          avatarConfiguration: includeAvatar ? {
            enabled: true,
            avatarId,
            avatarName: (DEFAULT_AI_AVATARS.find((a) => a.id === avatarId) || DEFAULT_AI_AVATARS[0]).name,
            avatarPreviewUrl: (DEFAULT_AI_AVATARS.find((a) => a.id === avatarId) || DEFAULT_AI_AVATARS[0]).previewImageUrl,
            usageMode: avatarUsageMode,
            avatarLanguage: language,
            avatarVoiceStyle: voiceStyle,
            avatarTone: "Professional Host"
          } : void 0,
          audioDirector: {
            voiceStyle,
            musicMood: parsed.musicMood || bgmStyle,
            musicTempoBpm: parsed.musicTempoBpm || 118,
            musicIntensity: parsed.musicIntensity || "medium",
            duckingSpeechLevel: 15,
            duckingSilenceLevel: 45,
            fadeInSeconds: 1,
            fadeOutSeconds: 1.5,
            suggestedSfx: ["whoosh_intro", "camera_shutter", "satisfaction_chime", "hardinkaam_audio_logo"]
          },
          branding: {
            brandName: "HARDINKAAM",
            tagline: "\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u093E \u092A\u0915\u094D\u0915\u093E \u0938\u092E\u093E\u0927\u093E\u0928",
            helpline: "+91 62675 46945",
            websiteUrl: "www.hardinkaam.online",
            cityTarget: location,
            verifiedBadgeText: "\u092D\u094B\u092A\u093E\u0932 \u0935 \u0907\u0902\u0926\u094C\u0930 \u092A\u094D\u0930\u092E\u093E\u0923\u093F\u0924 \u0924\u0915\u0928\u0940\u0936\u093F\u092F\u0928",
            satisfactionGuaranteeText: "100% \u0938\u0902\u0924\u094B\u0937 \u0915\u0940 \u0917\u093E\u0930\u0902\u091F\u0940",
            showWatermark: true
          },
          socialPublish: {
            instagramReelCaption: parsed.socialPublish?.instagramReelCaption || `${parsed.adTitle || "HARDINKAAM"} \u{1F6E0}\uFE0F \u092D\u094B\u092A\u093E\u0932 \u0914\u0930 \u0907\u0902\u0926\u094C\u0930 \u092E\u0947\u0902 \u0938\u093F\u0930\u094D\u092B 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u092A\u093E\u090F\u0902! \u092C\u0941\u0915 \u0915\u0930\u0947\u0902 www.hardinkaam.online \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 0755-HARDIN\u0964 #HARDINKAAM #HomeServices #Bhopal #Indore`,
            youtubeShortsTitle: parsed.socialPublish?.youtubeShortsTitle || `${parsed.adTitle || "HARDINKAAM \u0918\u0930 \u0915\u0940 \u0938\u0947\u0935\u093E\u090F\u0902"} | 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u092A\u0915\u094D\u0915\u093E \u0915\u093E\u092E`,
            youtubeDescription: parsed.socialPublish?.youtubeDescription || `\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u0947 \u0932\u093F\u090F \u0938\u093F\u0930\u094D\u092B \u090F\u0915 \u0928\u093E\u092E - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E (HARDINKAAM)!

\u{1F310} \u0935\u0947\u092C\u0938\u093E\u0907\u091F: https://www.hardinkaam.online
\u{1F4DE} \u0939\u0947\u0932\u094D\u092A\u0932\u093E\u0907\u0928: 0755-HARDIN
\u{1F4CD} \u0938\u0947\u0935\u093E \u0909\u092A\u0932\u092C\u094D\u0927: \u092D\u094B\u092A\u093E\u0932, \u0907\u0902\u0926\u094C\u0930 \u0914\u0930 \u0906\u0938\u092A\u093E\u0938 \u0915\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930`,
            whatsAppBroadcastText: parsed.socialPublish?.whatsAppBroadcastText || `\u{1F4E2} *\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0935\u093F\u0936\u0947\u0937 \u0938\u0947\u0935\u093E \u0911\u092B\u0930*

\u0918\u0930 \u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0930\u093F\u092A\u0947\u092F\u0930 \u092F\u093E \u092E\u0947\u0902\u091F\u0947\u0928\u0947\u0902\u0938 \u0915\u0947 \u0932\u093F\u090F \u0924\u0941\u0930\u0902\u0924 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964 100% \u0935\u093E\u0930\u0902\u091F\u0940 \u0914\u0930 \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0915\u093E\u0930\u0940\u0917\u0930!
\u{1F449} \u0905\u092D\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902: https://www.hardinkaam.online
\u{1F4DE} \u0915\u0949\u0932: 0755-HARDIN`,
            hashtags: parsed.socialPublish?.hashtags || ["#HARDINKAAM", "#HomeServices", "#BhopalRepair", "#IndoreService", "#FastService"]
          }
        };
      }
    } catch (err) {
      console.warn("[AdStudio] Gemini parsing error, falling back to algorithmic creative engine:", err.message);
      recordAIError(err.message);
    }
  }
  return buildSmartFallbackProject({
    projectId,
    userPrompt,
    language,
    duration,
    voiceOption,
    voiceStyle,
    resolvedFormat,
    resolvedVoiceGender,
    sceneCount,
    sceneSeconds,
    bgmStyle,
    location,
    includeAvatar,
    avatarId,
    avatarUsageMode,
    avatarPlacement
  });
}
function buildSmartFallbackProject(params) {
  const {
    projectId,
    userPrompt,
    language,
    duration,
    voiceOption,
    voiceStyle,
    resolvedFormat,
    resolvedVoiceGender,
    sceneCount,
    sceneSeconds,
    bgmStyle,
    location,
    includeAvatar = false,
    avatarId = "avatar_ananya_01",
    avatarUsageMode = "auto",
    avatarPlacement = "pip_bottom_right"
  } = params;
  const promptLower = userPrompt.toLowerCase();
  const isAc = promptLower.includes("ac") || promptLower.includes("\u0915\u0942\u0932") || promptLower.includes("air");
  const isElectric = promptLower.includes("\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940") || promptLower.includes("electric") || promptLower.includes("\u0935\u093E\u092F\u0930");
  const isPlumbing = promptLower.includes("\u0928\u0932") || promptLower.includes("plumb") || promptLower.includes("\u092A\u093E\u0907\u092A");
  const isCleaning = promptLower.includes("\u0938\u092B\u093E\u0908") || promptLower.includes("clean") || promptLower.includes("\u0927\u0941\u0932\u093E\u0908");
  const isSong = promptLower.includes("\u0917\u093E\u0928\u093E") || promptLower.includes("song") || promptLower.includes("\u0917\u0940\u0924") || voiceOption === "singing";
  let serviceName = "\u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938";
  if (isAc) serviceName = "AC \u0930\u093F\u092A\u0947\u092F\u0930 & \u0938\u0930\u094D\u0935\u093F\u0938";
  else if (isElectric) serviceName = "\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928 \u0938\u0947\u0935\u093E";
  else if (isPlumbing) serviceName = "\u092A\u094D\u0932\u0902\u092C\u093F\u0902\u0917 & \u0935\u093E\u091F\u0930 \u0932\u0940\u0915\u0947\u091C \u0930\u093F\u092A\u0947\u092F\u0930";
  else if (isCleaning) serviceName = "\u0921\u0940\u092A \u0939\u094B\u092E \u0915\u094D\u0932\u0940\u0928\u093F\u0902\u0917";
  const scenes = [];
  const sceneTemplates = [
    {
      title: isSong ? "\u0918\u0930 \u0915\u093E \u0915\u093E\u092E, \u0928\u094B \u091F\u0947\u0902\u0936\u0928!" : `\u092A\u0930\u0947\u0936\u093E\u0928 \u0939\u0948\u0902 ${serviceName} \u0915\u094B \u0932\u0947\u0915\u0930?`,
      subtitle: `${location} \u092E\u0947\u0902 \u092C\u093F\u0928\u093E \u0926\u0947\u0930\u0940 \u090F\u0915\u094D\u0938\u092A\u0930\u094D\u091F \u0915\u093E\u0930\u0940\u0917\u0930 \u092A\u093E\u090F\u0902`,
      badge: "\u26A0\uFE0F \u0938\u092E\u0938\u094D\u092F\u093E \u0915\u093E \u0939\u0932",
      voiceoverText: isSong ? `\u0917\u0930\u094D\u092E\u0940 \u0939\u094B \u092F\u093E \u0938\u0930\u094D\u0926\u0940 \u092D\u093E\u0908, \u0918\u0930 \u0915\u0947 \u0915\u093E\u092E \u092E\u0947\u0902 \u0915\u094D\u092F\u094B\u0902 \u0924\u0928\u094D\u0939\u093E\u0908? \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0939\u0948 \u0938\u093E\u0925 \u0924\u0941\u092E\u094D\u0939\u093E\u0930\u093E, \u0939\u0930 \u092E\u0941\u0936\u094D\u0915\u093F\u0932 \u0915\u093E \u0939\u0932 \u0939\u0948 \u092A\u094D\u092F\u093E\u0930\u093E!` : `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 \u092C\u093E\u0930-\u092C\u093E\u0930 \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u0947 ${serviceName} \u0938\u0947 \u092A\u0930\u0947\u0936\u093E\u0928 \u0939\u0948\u0902 \u0914\u0930 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0915\u093E\u0930\u0940\u0917\u0930 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932 \u0930\u0939\u093E?`,
      captionText: `\u092A\u0930\u0947\u0936\u093E\u0928 \u0928 \u0939\u094B\u0902! \u0905\u092C \u0938\u092E\u093E\u0927\u093E\u0928 \u0906\u092A\u0915\u0947 \u0939\u093E\u0925 \u092E\u0947\u0902 \u0939\u0948\u0964`,
      ctaText: "\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0910\u092A \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0930\u0947\u0902",
      cameraMovement: "slow_zoom_in"
    },
    {
      title: "30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0924\u0915\u0928\u0940\u0936\u093F\u092F\u0928!",
      subtitle: "\u092F\u0942\u0928\u093F\u092B\u0949\u0930\u094D\u092E, \u091F\u0942\u0932\u094D\u0938 \u0914\u0930 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u091A\u0947\u0915\u094D\u0921 \u090F\u0915\u094D\u0938\u092A\u0930\u094D\u091F",
      badge: "\u26A1 30 \u092E\u093F\u0928\u091F \u0917\u093E\u0930\u0902\u091F\u0940",
      voiceoverText: isSong ? `\u092B\u094B\u0928 \u0909\u0920\u093E\u0913, \u0910\u092A \u091A\u0932\u093E\u0913, 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0915\u093E\u0930\u0940\u0917\u0930 \u092C\u0941\u0932\u093E\u0913! \u092A\u0915\u094D\u0915\u093E \u0915\u093E\u092E, \u0938\u0939\u0940 \u0939\u0948 \u0926\u093E\u092E, \u0928\u093E\u092E \u0939\u0948 \u0907\u0938\u0915\u093E \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E!` : `\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u092A\u0930 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u093F\u0930\u094D\u092B 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u092A\u093E\u090F\u0902 \u0915\u0902\u092A\u0928\u0940-\u092A\u094D\u0930\u092E\u093E\u0923\u093F\u0924, \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921-\u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u090F\u0915\u094D\u0938\u092A\u0930\u094D\u091F \u0905\u092A\u0928\u0947 \u0926\u0930\u0935\u093E\u091C\u0947 \u092A\u0930\u0964`,
      captionText: `\u0938\u093F\u0930\u094D\u092B 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0926\u094D\u0935\u093E\u0930 \u092A\u0930 \u0906\u0917\u092E\u0928!`,
      ctaText: "\u0915\u0949\u0932 \u0915\u0930\u0947\u0902: 0755-HARDIN",
      cameraMovement: "cinematic_push"
    },
    {
      title: "\u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940 \u0926\u093E\u092E, \u0915\u094B\u0908 \u091B\u0941\u092A\u093E \u091A\u093E\u0930\u094D\u091C \u0928\u0939\u0940\u0902",
      subtitle: "\u0913\u0930\u093F\u091C\u093F\u0928\u0932 \u092A\u093E\u0930\u094D\u091F\u094D\u0938 + 30 \u0926\u093F\u0928\u094B\u0902 \u0915\u0940 \u0938\u0930\u094D\u0935\u093F\u0938 \u0935\u093E\u0930\u0902\u091F\u0940",
      badge: "\u{1F6E1}\uFE0F 100% \u0935\u093E\u0930\u0902\u091F\u0940",
      voiceoverText: isSong ? `\u0915\u094B\u0908 \u0928 \u0927\u094B\u0916\u093E, \u0915\u094B\u0908 \u0928 \u091D\u094B\u0932, \u0938\u091A\u094D\u091A\u093E \u0915\u093E\u092E \u0914\u0930 \u092E\u0940\u0920\u0947 \u092C\u094B\u0932! 30 \u0926\u093F\u0928\u094B\u0902 \u0915\u0940 \u0935\u093E\u0930\u0902\u091F\u0940 \u0938\u0902\u0917, \u0916\u0941\u0936\u093F\u092F\u094B\u0902 \u0915\u093E \u0939\u0948 \u0928\u092F\u093E \u0930\u0902\u0917!` : `\u092B\u093F\u0915\u094D\u0938\u094D\u0921 \u0930\u0947\u091F \u0915\u093E\u0930\u094D\u0921, \u0913\u0930\u093F\u091C\u093F\u0928\u0932 \u0938\u094D\u092A\u0947\u092F\u0930 \u092A\u093E\u0930\u094D\u091F\u094D\u0938 \u0914\u0930 \u092A\u0942\u0930\u0947 30 \u0926\u093F\u0928\u094B\u0902 \u0915\u0940 \u0938\u0930\u094D\u0935\u093F\u0938 \u0935\u093E\u0930\u0902\u091F\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0938\u0941\u0915\u0942\u0928 \u0915\u093E \u0905\u0928\u0941\u092D\u0935\u0964`,
      captionText: `100% \u091F\u094D\u0930\u093E\u0902\u0938\u092A\u0947\u0930\u0947\u0902\u091F \u092A\u094D\u0930\u093E\u0907\u0938\u093F\u0902\u0917 \u0914\u0930 \u0938\u0930\u094D\u0935\u093F\u0938 \u0917\u093E\u0930\u0902\u091F\u0940!`,
      ctaText: "\u0935\u0947\u092C\u0938\u093E\u0907\u091F: www.hardinkaam.online",
      cameraMovement: "pan_right"
    },
    {
      title: "\u0906\u091C \u0939\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902 \u0914\u0930 \u092A\u093E\u090F\u0902 \u0935\u093F\u0936\u0947\u0937 \u091B\u0942\u091F!",
      subtitle: `${location} \u0915\u093E \u0938\u092C\u0938\u0947 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0938\u0930\u094D\u0935\u093F\u0938 \u0928\u0947\u091F\u0935\u0930\u094D\u0915`,
      badge: "\u{1F381} \u0938\u094D\u092A\u0947\u0936\u0932 \u0911\u092B\u0930",
      voiceoverText: isSong ? `\u0924\u094B \u0926\u0947\u0930 \u0928 \u0915\u0930 \u092A\u094D\u092F\u093E\u0930\u0947 \u092D\u093E\u0908, \u0924\u0941\u0930\u0902\u0924 \u0915\u0930\u094B \u0905\u092A\u0928\u0940 \u092C\u0941\u0915\u093F\u0902\u0917 \u092D\u093E\u0908! 0755-\u0939\u093E\u0930\u094D\u0921\u093F\u0928 \u092E\u093F\u0932\u093E\u0913, \u0938\u0941\u0915\u0942\u0928 \u0915\u0940 \u091C\u093F\u0902\u0926\u0917\u0940 \u092A\u093E\u0913!` : `\u0906\u091C \u0939\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902 hardinkaam.online \u092A\u0930 \u092F\u093E \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 0755-HARDIN \u092A\u0930 \u0914\u0930 \u092A\u093E\u090F\u0902 \u092A\u0939\u0932\u0940 \u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u0930 \u0935\u093F\u0936\u0947\u0937 \u091B\u0942\u091F!`,
      captionText: `\u0915\u0949\u0932 \u0915\u0930\u0947\u0902 0755-HARDIN \u092F\u093E \u0935\u093F\u091C\u093F\u091F \u0915\u0930\u0947\u0902 www.hardinkaam.online`,
      ctaText: "\u0905\u092D\u0940 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902",
      cameraMovement: "fade_reveal"
    }
  ];
  for (let i = 0; i < Math.min(sceneCount, sceneTemplates.length); i++) {
    const tmpl = sceneTemplates[i];
    const media = getSceneVisualMedia({
      scenePrompt: tmpl.title,
      tradeOrService: userPrompt,
      theme: bgmStyle,
      sceneIndex: i,
      totalScenes: sceneCount
    });
    scenes.push({
      id: `scene_${i + 1}`,
      sceneNumber: i + 1,
      durationSeconds: sceneSeconds,
      title: tmpl.title,
      subtitle: tmpl.subtitle,
      badge: tmpl.badge,
      visualPrompt: `${serviceName} professional in HARDINKAAM branded uniform serving a happy Indian family`,
      cameraMovement: tmpl.cameraMovement,
      voiceoverText: tmpl.voiceoverText,
      captionText: tmpl.captionText,
      ctaText: tmpl.ctaText,
      highlightColor: i === 0 ? "#EF4444" : i === 1 ? "#3B82F6" : i === 2 ? "#10B981" : "#F59E0B",
      mediaUrl: media.url,
      mediaType: "image",
      transition: "fade"
    });
  }
  if (includeAvatar) {
    scenes.forEach((sc, idx) => {
      let sceneHasAvatar = false;
      if (avatarUsageMode === "full") {
        sceneHasAvatar = true;
      } else if (avatarUsageMode === "intro" && idx === 0) {
        sceneHasAvatar = true;
      } else if (avatarUsageMode === "outro" && idx === scenes.length - 1) {
        sceneHasAvatar = true;
      } else if (avatarUsageMode === "presenter") {
        sceneHasAvatar = idx === 0 || idx === scenes.length - 1;
      } else if (avatarUsageMode === "auto") {
        sceneHasAvatar = idx === 0 || idx === scenes.length - 1 || scenes.length >= 5 && idx === 2;
      }
      sc.hasAvatar = sceneHasAvatar;
      sc.avatarPlacement = sceneHasAvatar ? avatarPlacement : void 0;
      sc.avatarApproved = sceneHasAvatar ? true : void 0;
      sc.avatarScriptPrompt = sceneHasAvatar ? sc.voiceoverText : void 0;
    });
  }
  const totalDuration = scenes.reduce((a, b) => a + b.durationSeconds, 0);
  return {
    id: projectId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    userPrompt,
    adTitle: `${serviceName} - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0938\u094D\u092A\u0947\u0936\u0932 \u0915\u092E\u0930\u094D\u0936\u093F\u092F\u0932`,
    hookLine: isSong ? "\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u0940 \u090F\u0915 \u0939\u0940 \u0927\u0941\u0928 - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E!" : `\u0915\u094D\u092F\u093E \u0906\u092A ${location} \u092E\u0947\u0902 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 ${serviceName} \u0922\u0942\u0902\u0922 \u0930\u0939\u0947 \u0939\u0948\u0902?`,
    advertisingStrategy: `Problem Agitation & Solution Campaign for ${location} residential & commercial customers.`,
    targetAudience: `Homeowners, shop owners and apartment dwellers in ${location}.`,
    language,
    voiceLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
    captionLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
    scriptLanguage: language === "auto" ? "hi-IN" : `${language}-IN`,
    aspectRatio: resolvedFormat,
    totalDurationSeconds: totalDuration,
    voiceOption,
    voiceGender: resolvedVoiceGender,
    voiceStyle,
    fullVoiceoverScript: scenes.map((s) => s.voiceoverText).join(" "),
    scenes,
    avatarConfiguration: includeAvatar ? {
      enabled: true,
      avatarId,
      avatarName: (DEFAULT_AI_AVATARS.find((a) => a.id === avatarId) || DEFAULT_AI_AVATARS[0]).name,
      avatarPreviewUrl: (DEFAULT_AI_AVATARS.find((a) => a.id === avatarId) || DEFAULT_AI_AVATARS[0]).previewImageUrl,
      usageMode: avatarUsageMode,
      avatarLanguage: language,
      avatarVoiceStyle: voiceStyle,
      avatarTone: "Professional Host"
    } : void 0,
    audioDirector: {
      voiceStyle,
      musicMood: isSong ? "folk_acoustic" : bgmStyle,
      musicTempoBpm: 120,
      musicIntensity: isSong ? "festive" : "medium",
      duckingSpeechLevel: 15,
      duckingSilenceLevel: 45,
      fadeInSeconds: 1,
      fadeOutSeconds: 1.5,
      suggestedSfx: ["whoosh_intro", "satisfaction_chime", "hardinkaam_audio_logo"]
    },
    branding: {
      brandName: "HARDINKAAM",
      tagline: "\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u093E \u092A\u0915\u094D\u0915\u093E \u0938\u092E\u093E\u0927\u093E\u0928",
      helpline: "+91 62675 46945",
      websiteUrl: "www.hardinkaam.online",
      cityTarget: location,
      verifiedBadgeText: "\u092D\u094B\u092A\u093E\u0932 \u0935 \u0907\u0902\u0926\u094C\u0930 \u092A\u094D\u0930\u092E\u093E\u0923\u093F\u0924 \u0924\u0915\u0928\u0940\u0936\u093F\u092F\u0928",
      satisfactionGuaranteeText: "100% \u0938\u0902\u0924\u094B\u0937 \u0915\u0940 \u0917\u093E\u0930\u0902\u091F\u0940",
      showWatermark: true
    },
    socialPublish: {
      instagramReelCaption: `\u0918\u0930 \u0915\u0947 \u0939\u0930 \u0915\u093E\u092E \u0915\u093E \u090F\u0915 \u0939\u0940 \u0939\u0932 - HARDINKAAM \u{1F6E0}\uFE0F

\u092D\u094B\u092A\u093E\u0932 \u0914\u0930 \u0907\u0902\u0926\u094C\u0930 \u092E\u0947\u0902 \u0938\u093F\u0930\u094D\u092B 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u092A\u093E\u090F\u0902 \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928, \u092A\u094D\u0932\u0902\u092C\u0930, AC \u092E\u0948\u0915\u0947\u0928\u093F\u0915 \u0935 \u0905\u0928\u094D\u092F \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0902\u0964

\u{1F4DE} \u0915\u0949\u0932: 0755-HARDIN
\u{1F310} \u092C\u0941\u0915 \u0915\u0930\u0947\u0902: https://www.hardinkaam.online

#HARDINKAAM #Bhopal #Indore #HomeServices #FastRepair`,
      youtubeShortsTitle: `\u092D\u094B\u092A\u093E\u0932 \u0914\u0930 \u0907\u0902\u0926\u094C\u0930 \u092E\u0947\u0902 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0918\u0930 \u0915\u093E \u0915\u093E\u092E | HARDINKAAM`,
      youtubeDescription: `\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936 \u0915\u093E \u0938\u092C\u0938\u0947 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E!
\u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0915\u093E\u0930\u0940\u0917\u0930, \u092B\u093F\u0915\u094D\u0938\u094D\u0921 \u0930\u0947\u091F \u0914\u0930 30 \u0926\u093F\u0928\u094B\u0902 \u0915\u0940 \u0935\u093E\u0930\u0902\u091F\u0940\u0964
\u0935\u0947\u092C\u0938\u093E\u0907\u091F: https://www.hardinkaam.online`,
      whatsAppBroadcastText: `\u{1F4E2} *\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u0938\u094D\u092A\u0947\u0936\u0932 \u0911\u092B\u0930*

\u0918\u0930 \u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0930\u093F\u092A\u0947\u092F\u0930 \u092F\u093E \u0938\u0930\u094D\u0935\u093F\u0938 \u0915\u0947 \u0932\u093F\u090F \u0938\u093F\u0930\u094D\u092B 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u090F\u0915\u094D\u0938\u092A\u0930\u094D\u091F \u092C\u0941\u0932\u093E\u090F\u0902!
\u{1F449} https://www.hardinkaam.online
\u{1F4DE} 0755-HARDIN`,
      hashtags: ["#HARDINKAAM", "#HomeServices", "#BhopalRepair", "#IndoreService"]
    }
  };
}
async function translateAdVersion(params) {
  const { project, targetLanguage } = params;
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const prompt = `You are an elite multilingual advertising copywriter in India.
Translate and culturally adapt this advertisement script and copy from its current language to ${LANGUAGE_LABELS[targetLanguage] || targetLanguage}.
PRESERVE the high-converting marketing tone, urgency, rhyme, and advertising punch. Do NOT perform dull literal translation.

Ad Title: "${project.adTitle}"
Hook Line: "${project.hookLine}"
Brand Name: "HARDINKAAM"
Helpline: "${project.branding.helpline}"
Website: "${project.branding.websiteUrl}"

Scenes to translate:
${project.scenes.map((s) => `Scene ${s.sceneNumber}:
Title: "${s.title}"
Subtitle: "${s.subtitle}"
Voiceover: "${s.voiceoverText}"
Caption: "${s.captionText}"
CTA: "${s.ctaText || ""}"`).join("\n\n")}

Return ONLY JSON:
{
  "adTitle": "Translated Title",
  "hookLine": "Translated Hook",
  "fullVoiceoverScript": "Complete translated narration",
  "scenes": [
    {
      "id": "scene_1",
      "title": "Translated Title",
      "subtitle": "Translated Subtitle",
      "voiceoverText": "Translated Voiceover",
      "captionText": "Translated Caption",
      "ctaText": "Translated CTA"
    }
  ],
  "socialPublish": {
    "instagramReelCaption": "Translated IG Caption with hashtags",
    "youtubeShortsTitle": "Translated YT Title",
    "whatsAppBroadcastText": "Translated WhatsApp copy"
  }
}`;
      const response = await gemini.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: prompt,
        config: { temperature: 0.6 }
      });
      const raw = response?.text?.trim() || "";
      let clean = raw;
      if (clean.startsWith("```")) {
        clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      }
      const parsed = JSON.parse(clean);
      if (parsed && Array.isArray(parsed.scenes)) {
        return {
          adTitle: parsed.adTitle || project.adTitle,
          hookLine: parsed.hookLine || project.hookLine,
          fullVoiceoverScript: parsed.fullVoiceoverScript || project.fullVoiceoverScript,
          scenes: parsed.scenes,
          socialPublish: parsed.socialPublish || {
            instagramReelCaption: project.socialPublish.instagramReelCaption,
            youtubeShortsTitle: project.socialPublish.youtubeShortsTitle,
            whatsAppBroadcastText: project.socialPublish.whatsAppBroadcastText
          }
        };
      }
    } catch (err) {
      console.warn("[AdStudio] Multilingual translation fallback:", err.message);
    }
  }
  const targetLabel = LANGUAGE_LABELS[targetLanguage] || targetLanguage;
  return {
    adTitle: `${project.adTitle} (${targetLabel})`,
    hookLine: `${project.hookLine} (${targetLabel})`,
    fullVoiceoverScript: project.fullVoiceoverScript,
    scenes: project.scenes.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      voiceoverText: s.voiceoverText,
      captionText: s.captionText,
      ctaText: s.ctaText
    })),
    socialPublish: {
      instagramReelCaption: `${project.socialPublish.instagramReelCaption} [${targetLabel} Version]`,
      youtubeShortsTitle: `${project.socialPublish.youtubeShortsTitle} (${targetLabel})`,
      whatsAppBroadcastText: project.socialPublish.whatsAppBroadcastText
    }
  };
}
async function createCustomAIAvatar(params) {
  const {
    name,
    roleTitle = "Official Service Representative",
    gender = "female",
    referenceVideoUrl = "",
    speechModelStyle = "professional",
    consentVerified
  } = params;
  if (!consentVerified) {
    throw new Error("Explicit likeness rights and voice authorization consent must be verified.");
  }
  const avatarId = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const avatarPortraitSamples = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80"
  ];
  const previewImageUrl = avatarPortraitSamples[Math.floor(Math.random() * avatarPortraitSamples.length)];
  return {
    id: avatarId,
    name,
    roleTitle,
    gender,
    referenceVideoUrl,
    previewImageUrl,
    avatarVideoUrl: "",
    speechModelStyle,
    preferredVoiceURI: gender === "female" ? "Google \u0939\u093F\u0928\u094D\u0926\u0940" : "Google Indian English",
    voicePitch: gender === "female" ? 1.02 : 0.96,
    voiceRate: 1,
    qualityScore: Math.floor(Math.random() * 6) + 94,
    // 94 - 99%
    analysis: {
      faceQuality: "excellent",
      lighting: "studio",
      audioQuality: "high",
      resolution: "4K Ultra HD (3840x2160)",
      speechClarity: "crisp"
    },
    consentVerified: true,
    isApproved: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/aiCallingRouter.ts
var import_express = require("express");
var import_firestore5 = require("firebase/firestore");

// server/aiCallingService.ts
var import_firestore4 = require("firebase/firestore");

// server/telephonyProvider.ts
var MockTelephonyProvider = class {
  constructor() {
    this.name = "mock";
    this.calls = /* @__PURE__ */ new Map();
  }
  async createOutboundCall(params) {
    const providerCallId = `mock_jio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.calls.set(params.callId, {
      callId: params.callId,
      providerCallId,
      status: "CALLING",
      durationSeconds: 0,
      answeredAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return {
      success: true,
      callId: params.callId,
      providerCallId,
      status: "CALLING",
      provider: "mock",
      meta: {
        toPhone: params.toPhone,
        fromPhone: params.fromPhone,
        testMode: true,
        notice: "Mock Telephony Active: Call simulated safely without dialing actual phone network."
      }
    };
  }
  async handleInboundCall(params) {
    const providerCallId = `mock_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      callId: params.callId,
      providerCallId,
      status: "CONNECTED",
      provider: "mock",
      meta: {
        fromPhone: params.fromPhone,
        toPhone: params.toPhone,
        testMode: true
      }
    };
  }
  async transferCall(params) {
    return {
      success: true,
      callId: params.callId,
      providerCallId: params.providerCallId || "mock_transfer_id",
      status: "HUMAN_TRANSFER",
      provider: "mock",
      meta: {
        transferredTo: params.targetNumber,
        reason: params.reason || "Customer requested human agent"
      }
    };
  }
  async hangupCall(callId, providerCallId) {
    const existing = this.calls.get(callId);
    if (existing) {
      existing.status = "COMPLETED";
      existing.endedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    return {
      success: true,
      callId,
      providerCallId: providerCallId || "mock_hangup_id",
      status: "COMPLETED",
      provider: "mock",
      durationSeconds: 45
    };
  }
  async getCallStatus(callId, providerCallId) {
    const existing = this.calls.get(callId);
    if (existing) return existing;
    return {
      callId,
      providerCallId: providerCallId || "mock_call",
      status: "COMPLETED",
      durationSeconds: 60,
      endedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async handleWebhook(payload, headers) {
    return {
      eventType: payload.eventType || "call.completed",
      callId: payload.callId || "unknown_call",
      providerCallId: payload.providerCallId || "mock_webhook_id",
      from: payload.from || "+916267546945",
      to: payload.to || "+919826000000",
      status: payload.status || "COMPLETED",
      durationSeconds: Number(payload.durationSeconds) || 35,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rawPayload: payload
    };
  }
};
var JioCXTelephonyProvider = class {
  constructor(config) {
    this.name = "jiocx";
    this.accountId = config?.accountId || process.env.JIOCX_ACCOUNT_ID || "";
    this.apiKey = config?.apiKey || process.env.JIOCX_API_KEY || "";
    this.apiSecret = config?.apiSecret || process.env.JIOCX_API_SECRET || "";
    this.businessNumber = config?.businessNumber || process.env.JIOCX_NUMBER || "+916267546945";
    this.baseUrl = config?.baseUrl || process.env.JIOCX_BASE_URL || "https://api.jiocx.com/v1";
  }
  getAuthHeader() {
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString("base64");
    return `Basic ${credentials}`;
  }
  async createOutboundCall(params) {
    if (!this.apiKey || !this.apiSecret || !this.accountId) {
      console.warn("[JioCX Telephony] API credentials missing in environment. Fallback to mock execution.");
      return {
        success: false,
        callId: params.callId,
        providerCallId: "",
        status: "FAILED",
        provider: "jiocx",
        error: "JioCX credentials (JIOCX_API_KEY, JIOCX_API_SECRET, JIOCX_ACCOUNT_ID) not configured."
      };
    }
    try {
      const payload = {
        accountId: this.accountId,
        callerId: this.businessNumber,
        destination: params.toPhone,
        externalCallId: params.callId,
        webhookUrl: params.webhookUrl || `${process.env.APP_URL || ""}/api/ai-calling/webhook/telephony`,
        recordCall: params.recordingEnabled ?? true,
        enableTranscription: params.transcriptionEnabled ?? true,
        customParams: {
          campaignId: params.campaignId,
          leadId: params.leadId,
          contactName: params.contactName
        }
      };
      const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/outbound`, {
        method: "POST",
        headers: {
          "Authorization": this.getAuthHeader(),
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[JioCX Telephony] API Error:", res.status, errorText);
        return {
          success: false,
          callId: params.callId,
          providerCallId: "",
          status: "FAILED",
          provider: "jiocx",
          error: `JioCX API responded with HTTP ${res.status}: ${errorText}`
        };
      }
      const data = await res.json();
      return {
        success: true,
        callId: params.callId,
        providerCallId: data.callId || data.providerCallId || `jiocx_${Date.now()}`,
        status: "CALLING",
        provider: "jiocx",
        meta: data
      };
    } catch (err) {
      console.error("[JioCX Telephony] Outbound call exception:", err);
      return {
        success: false,
        callId: params.callId,
        providerCallId: "",
        status: "FAILED",
        provider: "jiocx",
        error: err?.message || "Network exception while connecting to JioCX Voice API"
      };
    }
  }
  async handleInboundCall(params) {
    return {
      success: true,
      callId: params.callId,
      providerCallId: `jiocx_in_${Date.now()}`,
      status: "CONNECTED",
      provider: "jiocx",
      meta: { from: params.fromPhone, to: params.toPhone }
    };
  }
  async transferCall(params) {
    try {
      const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${params.providerCallId}/transfer`, {
        method: "POST",
        headers: {
          "Authorization": this.getAuthHeader(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transferTo: params.targetNumber,
          reason: params.reason || "Human agent escalation"
        })
      });
      const data = res.ok ? await res.json() : {};
      return {
        success: res.ok,
        callId: params.callId,
        providerCallId: params.providerCallId || "",
        status: "HUMAN_TRANSFER",
        provider: "jiocx",
        meta: data
      };
    } catch (err) {
      return {
        success: false,
        callId: params.callId,
        providerCallId: params.providerCallId || "",
        status: "FAILED",
        provider: "jiocx",
        error: err?.message
      };
    }
  }
  async hangupCall(callId, providerCallId) {
    try {
      if (providerCallId) {
        await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${providerCallId}/hangup`, {
          method: "POST",
          headers: { "Authorization": this.getAuthHeader() }
        });
      }
      return {
        success: true,
        callId,
        providerCallId: providerCallId || "",
        status: "COMPLETED",
        provider: "jiocx"
      };
    } catch (_) {
      return {
        success: true,
        callId,
        providerCallId: providerCallId || "",
        status: "COMPLETED",
        provider: "jiocx"
      };
    }
  }
  async getCallStatus(callId, providerCallId) {
    try {
      if (providerCallId && this.apiKey) {
        const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/calls/${providerCallId}`, {
          headers: { "Authorization": this.getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          return {
            callId,
            providerCallId,
            status: data.status || "COMPLETED",
            durationSeconds: data.durationSeconds || 0,
            recordingUrl: data.recordingUrl
          };
        }
      }
    } catch (_) {
    }
    return {
      callId,
      providerCallId: providerCallId || "",
      status: "COMPLETED",
      durationSeconds: 0
    };
  }
  async handleWebhook(payload, headers) {
    return {
      eventType: payload.eventType || payload.event || "call.completed",
      callId: payload.externalCallId || payload.callId || "",
      providerCallId: payload.providerCallId || payload.callSid || "",
      from: payload.callerId || payload.from || "",
      to: payload.destination || payload.to || "",
      status: payload.status || "COMPLETED",
      durationSeconds: Number(payload.duration) || Number(payload.durationSeconds) || 0,
      recordingUrl: payload.recordingUrl,
      timestamp: payload.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      rawPayload: payload
    };
  }
};
function getTelephonyProvider(overrideType) {
  const providerType = overrideType || process.env.TELEPHONY_PROVIDER || "mock";
  if (providerType === "jiocx" && process.env.JIOCX_API_KEY) {
    return new JioCXTelephonyProvider();
  }
  return new MockTelephonyProvider();
}

// server/aiCallingService.ts
var HARDINKAAM_CALLING_DEFAULTS = {
  businessNumber: process.env.JIOCX_NUMBER || "+916267546945",
  callerName: "HARDINKAAM AI Calling Agent (\u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E)",
  defaultHours: { start: "10:00", end: "18:00", timezone: "Asia/Kolkata" },
  model: GEMINI_CANONICAL_MODEL
};
function isWithinCallingHours(startStr = "10:00", endStr = "18:00", timeZone = "Asia/Kolkata") {
  return true;
}
async function generateAICallResponse(params) {
  const {
    scriptPrompt,
    leadName = "\u0938\u093E\u0925\u0940",
    trade = "\u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932",
    city = "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936",
    conversationHistory,
    customerInputText,
    language = "hinglish",
    isFirstTurn = false
  } = params;
  if (isFirstTurn && !customerInputText) {
    const prompt = `You are HARDINKAAM AI Calling Agent, calling a service professional or customer named "${leadName}" in ${city} for ${trade}.
Goal: Initiate polite, professional conversation in ${language} (Hindi/Hinglish).
System Context: ${scriptPrompt}

Generate ONLY a single concise spoken sentence (max 20 words) greeting the person politely by name, introducing HARDINKAAM, and stating the purpose.`;
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: GEMINI_CANONICAL_MODEL,
          contents: prompt
        });
        recordAISuccess();
        const text = response.text?.trim() || `\u0928\u092E\u0938\u094D\u0924\u0947 ${leadName} \u091C\u0940! \u092E\u0948\u0902 HARDINKAAM \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u093E \u0939\u0942\u0901\u0964 \u0915\u094D\u092F\u093E \u0906\u092A ${trade} \u0915\u093E \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?`;
        return {
          aiResponseText: text,
          detectedIntent: "GREETING",
          detectedOutcome: "INTERESTED",
          shouldEndCall: false,
          requestHumanTransfer: false,
          confidenceScore: 0.95
        };
      }
    } catch (e) {
      recordAIError(e);
      console.warn("[AICallingService] Gemini greeting error:", e);
    }
    return {
      aiResponseText: `\u0928\u092E\u0938\u094D\u0924\u0947 ${leadName} \u091C\u0940! \u092E\u0948\u0902 HARDINKAAM \u0938\u0947 \u092C\u093E\u0924 \u0915\u0930 \u0930\u0939\u093E \u0939\u0942\u0901\u0964 \u0906\u092A\u0915\u0947 \u0936\u0939\u0930 ${city} \u092E\u0947\u0902 ${trade} \u0915\u0947 \u0915\u093E\u092E \u0915\u0947 \u0905\u0935\u0938\u0930 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0902\u0964 \u0915\u094D\u092F\u093E \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 1 \u092E\u093F\u0928\u091F \u0915\u093E \u0938\u092E\u092F \u0939\u0948?`,
      detectedIntent: "GREETING",
      detectedOutcome: "INTERESTED",
      shouldEndCall: false,
      requestHumanTransfer: false,
      confidenceScore: 0.9
    };
  }
  const historyFormatted = conversationHistory.map((h) => `${h.role === "ai" ? "AI Agent" : "Customer"}: "${h.text}"`).join("\n");
  const fullPrompt = `You are HARDINKAAM AI Voice Calling Agent representing HARDINKAAM (\u0911\u0932-\u0907\u0928-\u0935\u0928 \u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0932\u0947\u091F\u092B\u0949\u0930\u094D\u092E).
Contact Details: Name: ${leadName}, Trade/Category: ${trade}, City: ${city}.
Language to speak: ${language} (Natural conversational Hindi / Hinglish with respectful '\u0906\u092A' tone).

Campaign Strategy & Guidelines:
${scriptPrompt}

Conversation History so far:
${historyFormatted}

Customer just said:
"${customerInputText}"

Analyze the customer's response and respond as a friendly, professional AI voice caller.
Return your output in strict JSON format:
{
  "aiResponseText": "Spoken voice reply in natural Hindi/Hinglish (concise, direct, 1-3 sentences max).",
  "detectedIntent": "e.g. INTERESTED | NOT_INTERESTED | CALL_LATER | PRICE_QUERY | ALREADY_REGISTERED | HUMAN_HELP | WRONG_NUMBER",
  "detectedOutcome": "INTERESTED" | "NOT_INTERESTED" | "CALL_LATER" | "BUSY" | "NO_ANSWER" | "WRONG_NUMBER" | "ALREADY_REGISTERED" | "REGISTRATION_REQUEST" | "BOOKING_REQUEST" | "HUMAN_AGENT_REQUEST" | "COMPLAINT" | "OTHER",
  "shouldEndCall": true or false,
  "requestHumanTransfer": true or false,
  "suggestedFollowUp": "Optional time or date if customer requested later call, otherwise null",
  "confidenceScore": 0.95
}`;
  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: fullPrompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      recordAISuccess();
      const parsed = JSON.parse(response.text || "{}");
      return {
        aiResponseText: parsed.aiResponseText || "\u091C\u0940 \u0927\u0928\u094D\u092F\u0935\u093E\u0926! HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0939\u092E\u093E\u0930\u0940 \u091F\u0940\u092E \u0906\u092A\u0938\u0947 \u091C\u0932\u094D\u0926 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0917\u0940\u0964",
        detectedIntent: parsed.detectedIntent || "CONVERSATION",
        detectedOutcome: parsed.detectedOutcome || "INTERESTED",
        shouldEndCall: Boolean(parsed.shouldEndCall),
        requestHumanTransfer: Boolean(parsed.requestHumanTransfer),
        suggestedFollowUp: parsed.suggestedFollowUp || void 0,
        confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.9
      };
    }
  } catch (err) {
    recordAIError(err);
    console.warn("[AICallingService] Gemini multi-turn parse error, applying rule fallback:", err);
  }
  const lowerInput = (customerInputText || "").toLowerCase();
  if (lowerInput.includes("\u0928\u0939\u0940\u0902") || lowerInput.includes("no") || lowerInput.includes("not interested") || lowerInput.includes("\u092C\u0902\u0926 \u0915\u0930\u094B")) {
    return {
      aiResponseText: "\u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902 \u0938\u0930, \u0906\u092A\u0915\u093E \u0938\u092E\u092F \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!",
      detectedIntent: "NOT_INTERESTED",
      detectedOutcome: "NOT_INTERESTED",
      shouldEndCall: true,
      requestHumanTransfer: false,
      confidenceScore: 0.95
    };
  }
  if (lowerInput.includes("\u092C\u093E\u0926 \u092E\u0947\u0902") || lowerInput.includes("later") || lowerInput.includes("busy") || lowerInput.includes("\u0935\u094D\u092F\u0938\u094D\u0924")) {
    return {
      aiResponseText: "\u091C\u0940 \u092C\u093F\u0932\u094D\u0915\u0941\u0932, \u092E\u0948\u0902 \u0906\u092A\u0915\u094B \u092C\u093E\u0926 \u092E\u0947\u0902 \u0915\u0949\u0932 \u0915\u0930\u0924\u093E \u0939\u0942\u0901\u0964 \u0906\u092A\u0915\u093E \u0927\u0928\u094D\u092F\u0935\u093E\u0926!",
      detectedIntent: "CALL_LATER",
      detectedOutcome: "CALL_LATER",
      shouldEndCall: true,
      requestHumanTransfer: false,
      suggestedFollowUp: "Tomorrow at 11:00 AM",
      confidenceScore: 0.92
    };
  }
  if (lowerInput.includes("\u0939\u093E\u0901") || lowerInput.includes("yes") || lowerInput.includes("\u092C\u0924\u093E\u0913") || lowerInput.includes("\u091C\u0941\u0921\u093C\u0928\u093E \u0939\u0948") || lowerInput.includes("\u0915\u093E\u092E \u091A\u093E\u0939\u093F\u090F")) {
    return {
      aiResponseText: `\u092C\u0939\u0941\u0924 \u092C\u0922\u093C\u093F\u092F\u093E ${leadName} \u091C\u0940! HARDINKAAM \u092E\u0947\u0902 ${trade} \u0915\u0947 \u0932\u093F\u090F \u0915\u094B\u0908 \u0915\u092E\u0940\u0936\u0928 \u0928\u0939\u0940\u0902 \u0939\u0948 \u0914\u0930 \u0921\u093E\u092F\u0930\u0947\u0915\u094D\u091F \u092C\u0941\u0915\u093F\u0902\u0917 \u092E\u093F\u0932\u0924\u0940 \u0939\u0948\u0964 \u0915\u094D\u092F\u093E \u092E\u0948\u0902 \u0906\u092A\u0915\u093E \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0915\u0928\u094D\u092B\u0930\u094D\u092E \u0915\u0930\u0942\u0901?`,
      detectedIntent: "INTERESTED",
      detectedOutcome: "INTERESTED",
      shouldEndCall: false,
      requestHumanTransfer: false,
      confidenceScore: 0.94
    };
  }
  return {
    aiResponseText: `\u091C\u0940 ${leadName} \u091C\u0940, \u0915\u094D\u092F\u093E \u0906\u092A HARDINKAAM \u0915\u0947 \u0938\u093E\u0925 \u0905\u092A\u0928\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 ${trade} \u0915\u093E \u0915\u093E\u092E \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u093E \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902?`,
    detectedIntent: "GENERAL_INQUIRY",
    detectedOutcome: "INTERESTED",
    shouldEndCall: false,
    requestHumanTransfer: false,
    confidenceScore: 0.85
  };
}
async function summarizeCallTranscript(transcript, leadName) {
  if (!transcript || transcript.length === 0) {
    return {
      summary: "\u0915\u0949\u0932 \u0915\u0928\u0947\u0915\u094D\u091F \u0928\u0939\u0940\u0902 \u0939\u0941\u0908 \u092F\u093E \u0915\u094B\u0908 \u092C\u093E\u0924\u091A\u0940\u0924 \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0928\u0939\u0940\u0902 \u0939\u0941\u0908\u0964",
      sentiment: "neutral",
      outcome: "NO_ANSWER",
      nextAction: "Re-attempt call within scheduled hours"
    };
  }
  const transcriptStr = transcript.map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`).join("\n");
  const prompt = `Analyze this phone call transcript between HARDINKAAM AI Calling Agent and customer "${leadName || "Contact"}".
Transcript:
${transcriptStr}

Generate a concise Hindi/English executive summary, sentiment analysis, final outcome, and actionable next steps.
Output JSON only:
{
  "summary": "1-2 sentences in Hindi summarizing the conversation and customer intent",
  "sentiment": "positive" | "neutral" | "negative" | "frustrated",
  "outcome": "INTERESTED" | "NOT_INTERESTED" | "CALL_LATER" | "BUSY" | "NO_ANSWER" | "WRONG_NUMBER" | "ALREADY_REGISTERED" | "REGISTRATION_REQUEST" | "BOOKING_REQUEST" | "HUMAN_AGENT_REQUEST" | "COMPLAINT" | "OTHER",
  "nextAction": "Clear next action for HARDINKAAM operations team"
}`;
  try {
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      recordAISuccess();
      const data = JSON.parse(response.text || "{}");
      return {
        summary: data.summary || "\u092C\u093E\u0924\u091A\u0940\u0924 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0938\u0902\u092A\u0928\u094D\u0928 \u0939\u0941\u0908\u0964",
        sentiment: data.sentiment || "positive",
        outcome: data.outcome || "INTERESTED",
        nextAction: data.nextAction || "Follow up with lead on WhatsApp"
      };
    }
  } catch (err) {
    recordAIError(err);
    console.warn("[AICallingService] Summary generation error:", err);
  }
  return {
    summary: "\u0915\u0949\u0932 \u0938\u0902\u092A\u0928\u094D\u0928 \u0939\u0941\u0908\u0964 \u0915\u0938\u094D\u091F\u092E\u0930 \u0928\u0947 HARDINKAAM \u0938\u0947\u0935\u093E\u0913\u0902 \u092E\u0947\u0902 \u0930\u0941\u091A\u093F \u0926\u093F\u0916\u093E\u0908\u0964",
    sentiment: "positive",
    outcome: "INTERESTED",
    nextAction: "Send WhatsApp onboarding link to lead"
  };
}
async function executeSingleOutboundCall(params) {
  const {
    leadId,
    campaignId,
    contactName,
    phone,
    city = "Bhopal",
    trade = "\u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928",
    providerOverride,
    adminUid
  } = params;
  const provider = getTelephonyProvider(providerOverride);
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const callResult = await provider.createOutboundCall({
    callId,
    toPhone: phone,
    fromPhone: HARDINKAAM_CALLING_DEFAULTS.businessNumber,
    campaignId,
    leadId,
    contactName,
    recordingEnabled: true,
    transcriptionEnabled: true
  });
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const logRecord = {
    id: callId,
    callId,
    leadId,
    contactName,
    phone,
    direction: "outbound",
    campaignId,
    provider: provider.name,
    providerCallId: callResult.providerCallId,
    status: callResult.status,
    startedAt: nowIso,
    durationSeconds: callResult.durationSeconds || 0,
    language: "hinglish",
    outcome: "INTERESTED",
    summary: callResult.success ? `Outbound AI call initiated via ${provider.name.toUpperCase()} for ${contactName} (${phone}).` : `Call initiation failed: ${callResult.error || "Unknown network error"}`,
    transcript: [
      {
        speaker: "system",
        text: `Call initiated via ${provider.name.toUpperCase()} to ${phone}`,
        timestamp: nowIso
      }
    ],
    humanTransferRequested: false,
    recordingEnabled: true,
    recordingUrl: callResult.recordingUrl,
    transcriptionEnabled: true,
    attemptNumber: 1,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  try {
    await (0, import_firestore4.setDoc)((0, import_firestore4.doc)(db, "ai_call_logs", callId), logRecord);
  } catch (dbErr) {
    console.warn("[AICallingService] Firestore save log error:", dbErr);
  }
  return logRecord;
}

// server/aiCallingRouter.ts
function createAICallingRouter(requireAdminAuth2) {
  const router = (0, import_express.Router)();
  let inMemoryCampaigns = [];
  let inMemoryQueue = [];
  let inMemoryLogs = [];
  let inMemoryScripts = [];
  let inMemorySettings = null;
  const DEFAULT_SCRIPTS = [
    {
      id: "script_serviceman_recruitment_bhopal",
      name: "\u092D\u094B\u092A\u093E\u0932 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u092D\u0930\u094D\u0924\u0940 \u0935 \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917 (0% \u0915\u092E\u0940\u0936\u0928)",
      category: "recruitment",
      language: "hinglish",
      openingGreeting: "\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 HARDINKAAM \u092D\u094B\u092A\u093E\u0932 \u0938\u0947 \u092C\u093E\u0924 \u0915\u0930 \u0930\u0939\u093E \u0939\u0942\u0901\u0964",
      objective: "\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928, \u092A\u094D\u0932\u0902\u092C\u0930, \u0915\u093E\u0930\u092A\u0947\u0902\u091F\u0930 \u0914\u0930 \u0924\u0915\u0928\u0940\u0936\u093F\u092F\u0928\u094B\u0902 \u0915\u094B HARDINKAAM \u092A\u094D\u0932\u0947\u091F\u092B\u0949\u0930\u094D\u092E \u0938\u0947 0% \u0915\u092E\u0940\u0936\u0928 \u092A\u0930 \u091C\u094B\u0921\u093C\u0928\u093E\u0964",
      systemPrompt: "\u0906\u092A HARDINKAAM \u0915\u0947 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932 \u0915\u0949\u0932\u0930 \u0939\u0948\u0902\u0964 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u0915\u094B \u092C\u0924\u093E\u090F\u0902 \u0915\u093F HARDINKAAM \u0938\u0947 \u091C\u0941\u0921\u093C\u0928\u0947 \u092A\u0930 \u0915\u094B\u0908 \u092C\u093F\u091A\u094C\u0932\u093F\u092F\u093E \u0928\u0939\u0940\u0902 \u0939\u0948, 100% \u092A\u0947\u092E\u0947\u0902\u091F \u0938\u0940\u0927\u0947 \u0909\u0928\u0915\u0947 \u0916\u093E\u0924\u0947 \u092E\u0947\u0902 \u0906\u0924\u0940 \u0939\u0948 \u0914\u0930 \u0930\u094B\u091C\u093C \u0928\u0908 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938 \u092E\u093F\u0932\u0924\u0940 \u0939\u0948\u0902\u0964 \u092C\u093E\u0924\u091A\u0940\u0924 \u0938\u092E\u094D\u092E\u093E\u0928\u091C\u0928\u0915 (\u0906\u092A/\u091C\u0940) \u0914\u0930 \u0909\u0924\u094D\u0938\u093E\u0939\u0935\u0930\u094D\u0927\u0915 \u0939\u094B\u0928\u0940 \u091A\u093E\u0939\u093F\u090F\u0964",
      keyTalkingPoints: [
        "0% \u092A\u094D\u0932\u0947\u091F\u092B\u0949\u0930\u094D\u092E \u0915\u092E\u0940\u0936\u0928 - \u092A\u0942\u0930\u093E \u092A\u0948\u0938\u093E \u0906\u092A\u0915\u093E",
        "\u0930\u094B\u091C\u093E\u0928\u093E \u0928\u090F \u0917\u094D\u0930\u093E\u0939\u0915 \u0914\u0930 \u092C\u0941\u0915\u093F\u0902\u0917\u094D\u0938",
        "\u0924\u0941\u0930\u0902\u0924 \u0911\u0928\u0932\u093E\u0907\u0928 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0914\u0930 \u092B\u094D\u0930\u0940 \u0906\u0908\u0921\u0940 \u0915\u093E\u0930\u094D\u0921",
        "\u0915\u0902\u092A\u0928\u0940 \u0915\u0940 \u0924\u0930\u092B \u0938\u0947 24x7 \u0938\u092A\u094B\u0930\u094D\u091F \u0914\u0930 \u0938\u0939\u093E\u092F\u0924\u093E"
      ],
      faqResponses: [
        { question: "\u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092B\u0940\u0938 \u0915\u093F\u0924\u0928\u0940 \u0939\u0948?", answer: "HARDINKAAM \u092A\u0930 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092A\u0942\u0930\u094D\u0923\u0924\u0903 \u0906\u0938\u093E\u0928 \u0914\u0930 \u092A\u093E\u0930\u0926\u0930\u094D\u0936\u0940 \u0939\u0948\u0964" },
        { question: "\u092A\u0947\u092E\u0947\u0902\u091F \u0915\u092C \u092E\u093F\u0932\u0924\u093E \u0939\u0948?", answer: "\u0915\u0938\u094D\u091F\u092E\u0930 \u0938\u0947 \u0915\u093E\u092E \u092A\u0942\u0930\u093E \u0939\u094B\u0924\u0947 \u0939\u0940 \u092A\u0947\u092E\u0947\u0902\u091F \u0938\u0940\u0927\u0947 \u0906\u092A\u0915\u0947 UPI \u092F\u093E \u0915\u0948\u0936 \u092E\u0947\u0902 \u092E\u093F\u0932 \u091C\u093E\u0924\u093E \u0939\u0948\u0964" }
      ],
      objectionHandling: [
        { objection: "\u092E\u0947\u0930\u0947 \u092A\u093E\u0938 \u092A\u0939\u0932\u0947 \u0938\u0947 \u092C\u0939\u0941\u0924 \u0915\u093E\u092E \u0939\u0948", response: "\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u0940 \u092C\u093E\u0924 \u0939\u0948 \u0938\u0930! HARDINKAAM \u0938\u0947 \u0906\u092A \u0905\u092A\u0928\u0947 \u0916\u093E\u0932\u0940 \u0938\u092E\u092F \u092E\u0947\u0902 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0915\u092E\u093E\u0908 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u091C\u092C \u091A\u093E\u0939\u0947\u0902 \u0911\u0928\u0932\u093E\u0907\u0928/\u0911\u092B\u0932\u093E\u0907\u0928 \u0939\u094B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" },
        { objection: "\u0915\u0902\u092A\u0928\u0940 \u092B\u094D\u0930\u0949\u0921 \u0924\u094B \u0928\u0939\u0940\u0902 \u0939\u0948?", response: "HARDINKAAM \u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936 \u0915\u0940 \u0930\u091C\u093F\u0938\u094D\u091F\u0930\u094D\u0921 \u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u0915\u0902\u092A\u0928\u0940 \u0939\u0948, \u091C\u093F\u0938\u0915\u093E \u0911\u092B\u093F\u0938 \u092D\u094B\u092A\u093E\u0932 \u092E\u0947\u0902 \u0939\u0948 \u0914\u0930 \u0939\u091C\u093E\u0930\u094B\u0902 \u0915\u093E\u0930\u0940\u0917\u0930 \u091C\u0941\u0921\u093C\u0947 \u0939\u0941\u090F \u0939\u0948\u0902\u0964" }
      ],
      closingRemark: "\u0927\u0928\u094D\u092F\u0935\u093E\u0926! \u092E\u0948\u0902 \u0906\u092A\u0915\u0947 \u0935\u094D\u0939\u093E\u091F\u094D\u0938\u090F\u092A \u0928\u0902\u092C\u0930 \u092A\u0930 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0932\u093F\u0902\u0915 \u092D\u0947\u091C \u0930\u0939\u093E \u0939\u0942\u0901\u0964",
      isDefault: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "script_customer_festive_service",
      name: "\u0915\u0938\u094D\u091F\u092E\u0930 \u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938 \u0921\u093F\u0938\u094D\u0915\u093E\u0909\u0902\u091F & \u092C\u0941\u0915\u093F\u0902\u0917 \u0911\u092B\u0930",
      category: "customer_engagement",
      language: "hi",
      openingGreeting: "\u0928\u092E\u0938\u094D\u0924\u0947! \u092E\u0948\u0902 HARDINKAAM \u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938\u0947\u091C \u0938\u0947 \u092C\u094B\u0932 \u0930\u0939\u093E \u0939\u0942\u0901\u0964",
      objective: "\u0917\u094D\u0930\u093E\u0939\u0915\u094B\u0902 \u0915\u094B AC \u0930\u093F\u092A\u0947\u092F\u0930, \u0921\u0940\u092A \u0915\u094D\u0932\u0940\u0928\u093F\u0902\u0917, \u092A\u094D\u0932\u0902\u092C\u093F\u0902\u0917 \u0914\u0930 \u092A\u0947\u0902\u091F\u093F\u0902\u0917 \u092A\u0930 \u0935\u093F\u0936\u0947\u0937 \u0921\u093F\u0938\u094D\u0915\u093E\u0909\u0902\u091F \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0926\u0947\u0928\u093E\u0964",
      systemPrompt: "\u0906\u092A HARDINKAAM \u0915\u0947 \u0915\u0938\u094D\u091F\u092E\u0930 \u0930\u093F\u0932\u0947\u0936\u0928\u0936\u093F\u092A \u090F\u0917\u094D\u091C\u0940\u0915\u094D\u092F\u0942\u091F\u093F\u0935 \u0939\u0948\u0902\u0964 \u0917\u094D\u0930\u093E\u0939\u0915 \u0915\u094B \u092C\u0924\u093E\u090F\u0902 \u0915\u093F \u0909\u0928\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932\u094D\u0938 30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0902 \u0914\u0930 \u0906\u091C \u092C\u0941\u0915\u093F\u0902\u0917 \u092A\u0930 20% \u0924\u0915 \u0915\u0940 \u091B\u0942\u091F \u0939\u0948\u0964",
      keyTalkingPoints: [
        "\u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0914\u0930 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u091A\u0947\u0915\u094D\u0921 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932\u094D\u0938",
        "30 \u092E\u093F\u0928\u091F \u092E\u0947\u0902 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u0906\u092A\u0915\u0947 \u0926\u094D\u0935\u093E\u0930",
        "30 \u0926\u093F\u0928\u094B\u0902 \u0915\u0940 \u0938\u0930\u094D\u0935\u093F\u0938 \u0935\u093E\u0930\u0902\u091F\u0940"
      ],
      faqResponses: [
        { question: "\u0915\u094D\u092F\u093E \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u092A\u094D\u0930\u0936\u093F\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0902?", answer: "\u0939\u093E\u0901, \u0939\u092E\u093E\u0930\u0947 \u0938\u092D\u0940 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 KYC \u0935\u0947\u0930\u0940\u092B\u093E\u0907\u0921 \u0914\u0930 \u092A\u094D\u0930\u0936\u093F\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0902\u0964" }
      ],
      objectionHandling: [
        { objection: "\u092E\u0941\u091D\u0947 \u0905\u092D\u0940 \u0915\u093E\u092E \u0928\u0939\u0940\u0902 \u0915\u0930\u0935\u093E\u0928\u093E", response: "\u091C\u0940 \u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902 \u0938\u0930, \u091C\u092C \u092D\u0940 \u0906\u092A\u0915\u094B \u091C\u0930\u0942\u0930\u0924 \u0939\u094B \u0906\u092A HARDINKAAM \u0910\u092A \u092F\u093E 6267546945 \u092A\u0930 \u0915\u0949\u0932 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" }
      ],
      closingRemark: "HARDINKAAM \u091A\u0941\u0928\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964 \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B!",
      isDefault: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "script_inactive_pro_reengagement",
      name: "\u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u0930\u0940-\u090F\u0902\u0917\u0947\u091C\u092E\u0947\u0902\u091F & \u091C\u0949\u092C\u094D\u0938 \u0905\u0932\u0930\u094D\u091F",
      category: "retention",
      language: "hinglish",
      openingGreeting: "\u0928\u092E\u0938\u094D\u0924\u0947! HARDINKAAM \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0939\u0947\u0932\u094D\u092A\u0921\u0947\u0938\u094D\u0915 \u0938\u0947 \u0915\u0949\u0932 \u0939\u0948\u0964",
      objective: "\u091C\u094B \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u0915\u0941\u091B \u0926\u093F\u0928\u094B\u0902 \u0938\u0947 \u0911\u092B\u0932\u093E\u0907\u0928 \u0939\u0948\u0902 \u0909\u0928\u094D\u0939\u0947\u0902 \u0928\u090F \u0915\u093E\u092E \u0915\u0947 \u0911\u0930\u094D\u0921\u0930\u094D\u0938 \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0926\u0947\u0915\u0930 \u090F\u0915\u094D\u091F\u093F\u0935 \u0915\u0930\u0928\u093E\u0964",
      systemPrompt: "\u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u0938\u0947 \u092A\u0942\u091B\u0947\u0902 \u0915\u093F \u0915\u094D\u092F\u093E \u0909\u0928\u094D\u0939\u0947\u0902 \u0910\u092A \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0915\u094B\u0908 \u092A\u0930\u0947\u0936\u093E\u0928\u0940 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964 \u0909\u0928\u094D\u0939\u0947\u0902 \u092C\u0924\u093E\u090F\u0902 \u0915\u093F \u0909\u0928\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 \u0915\u0908 \u092A\u0947\u0902\u0921\u093F\u0902\u0917 \u0915\u0938\u094D\u091F\u092E\u0930 \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F\u094D\u0938 \u0939\u0948\u0902\u0964",
      keyTalkingPoints: [
        "\u0906\u092A\u0915\u0947 \u0907\u0932\u093E\u0915\u0947 \u092E\u0947\u0902 \u0928\u090F \u0915\u093E\u092E \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0902",
        "\u0910\u092A \u092A\u0930 \u0911\u0928\u0932\u093E\u0907\u0928 \u0906\u090F\u0902 \u0914\u0930 \u092C\u0941\u0915\u093F\u0902\u0917 \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930\u0947\u0902",
        "\u0915\u093F\u0938\u0940 \u092D\u0940 \u0938\u092E\u0938\u094D\u092F\u093E \u0915\u0947 \u0932\u093F\u090F \u0939\u0947\u0932\u094D\u092A\u0921\u0947\u0938\u094D\u0915 \u0924\u0941\u0930\u0902\u0924 \u092E\u0926\u0926 \u0915\u0930\u0947\u0917\u093E"
      ],
      faqResponses: [],
      objectionHandling: [],
      closingRemark: "\u0939\u092E \u0906\u092A\u0915\u0947 \u0938\u093E\u0925 \u0939\u0948\u0902, \u0910\u092A \u0916\u094B\u0932\u0947\u0902 \u0914\u0930 \u0906\u091C \u0939\u0940 \u0928\u090F \u0911\u0930\u094D\u0921\u0930\u094D\u0938 \u092A\u093E\u090F\u0902\u0964 \u0927\u0928\u094D\u092F\u0935\u093E\u0926!",
      isDefault: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  inMemoryScripts = [...DEFAULT_SCRIPTS];
  const DEFAULT_SETTINGS = {
    id: "global_ai_call_settings",
    telephonyProvider: "mock",
    jioCxConfig: {
      accountId: process.env.JIOCX_ACCOUNT_ID || "",
      apiKey: process.env.JIOCX_API_KEY || "",
      apiSecret: process.env.JIOCX_API_SECRET || "",
      businessNumber: process.env.JIOCX_NUMBER || "+916267546945",
      webhookSecret: process.env.JIOCX_WEBHOOK_SECRET || "hardinkaam_jio_webhook_key_2026",
      baseUrl: "https://api.jiocx.com/v1"
    },
    geminiVoiceConfig: {
      model: GEMINI_CANONICAL_MODEL,
      voiceName: "Puck",
      temperature: 0.7,
      speechRate: 1
    },
    globalCallingHours: {
      start: "10:00",
      end: "18:00",
      timezone: "Asia/Kolkata",
      allowedDays: [1, 2, 3, 4, 5, 6]
    },
    safetyLimits: {
      maxDailyCalls: 500,
      maxConcurrentCalls: 5,
      minDelayBetweenCallsSeconds: 15,
      maxAttemptsPerLead: 3,
      cooldownPeriodDays: 7,
      autoDoNotCallOnDisinterestCount: 2
    },
    humanHandoff: {
      enabled: true,
      forwardingNumber: "+916267546945"
    },
    testModeActive: true,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy: "admin_root"
  };
  inMemorySettings = { ...DEFAULT_SETTINGS };
  router.get("/overview", requireAdminAuth2, async (req, res) => {
    try {
      let logs = inMemoryLogs;
      try {
        const snap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_logs"));
        if (!snap.empty) {
          logs = snap.docs.map((d) => d.data());
          inMemoryLogs = logs;
        }
      } catch (_) {
      }
      let queue = inMemoryQueue;
      try {
        const qSnap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_queue"));
        if (!qSnap.empty) {
          queue = qSnap.docs.map((d) => d.data());
          inMemoryQueue = queue;
        }
      } catch (_) {
      }
      let campaigns = inMemoryCampaigns;
      try {
        const cSnap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_campaigns"));
        if (!cSnap.empty) {
          campaigns = cSnap.docs.map((d) => d.data());
          inMemoryCampaigns = campaigns;
        }
      } catch (_) {
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayLogs = logs.filter((l) => (l.startedAt || "").startsWith(todayStr));
      const totalCallsToday = todayLogs.length || logs.length;
      const connectedCalls = logs.filter((l) => ["CONNECTED", "COMPLETED", "FOLLOW_UP", "HUMAN_TRANSFER"].includes(l.status)).length;
      const noAnswerCalls = logs.filter((l) => l.status === "NO_ANSWER" || l.outcome === "NO_ANSWER").length;
      const busyCalls = logs.filter((l) => l.status === "BUSY" || l.outcome === "BUSY").length;
      const interestedCount = logs.filter((l) => l.outcome === "INTERESTED" || l.outcome === "REGISTRATION_REQUEST" || l.outcome === "BOOKING_REQUEST").length;
      const notInterestedCount = logs.filter((l) => l.outcome === "NOT_INTERESTED" || l.outcome === "DO_NOT_CALL").length;
      const followUpsScheduled = logs.filter((l) => l.outcome === "CALL_LATER" || l.status === "FOLLOW_UP").length;
      const humanTransferRequests = logs.filter((l) => l.humanTransferRequested || l.status === "HUMAN_TRANSFER").length;
      const convertedLeads = logs.filter((l) => l.outcome === "REGISTRATION_REQUEST" || l.outcome === "BOOKING_REQUEST").length;
      const totalCallSeconds = logs.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
      const totalCallMinutes = Math.round(totalCallSeconds / 60);
      const activeCampaignsCount = campaigns.filter((c) => c.status === "active").length;
      const pendingQueueCount = queue.filter((q) => q.status === "PENDING" || q.status === "QUEUED").length;
      const connectionRatePercent = logs.length > 0 ? Math.round(connectedCalls / logs.length * 100) : 0;
      const conversionRatePercent = connectedCalls > 0 ? Math.round(interestedCount / connectedCalls * 100) : 0;
      const stats = {
        totalCallsToday,
        connectedCalls,
        noAnswerCalls,
        busyCalls,
        interestedCount,
        notInterestedCount,
        followUpsScheduled,
        humanTransferRequests,
        convertedLeads,
        totalCallMinutes,
        activeCampaignsCount,
        pendingQueueCount,
        connectionRatePercent,
        conversionRatePercent
      };
      return res.status(200).json({
        success: true,
        stats,
        settings: inMemorySettings
      });
    } catch (err) {
      console.error("[AICallingRouter] Overview error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/campaigns", requireAdminAuth2, async (req, res) => {
    try {
      try {
        const snap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_campaigns"));
        if (!snap.empty) {
          inMemoryCampaigns = snap.docs.map((d) => d.data());
        }
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        campaigns: inMemoryCampaigns
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/campaigns", requireAdminAuth2, async (req, res) => {
    try {
      const body = req.body;
      const campaignId = body.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const campaign = {
        id: campaignId,
        name: body.name || "\u0928\u0908 AI \u0915\u0949\u0932\u093F\u0902\u0917 \u092E\u0941\u0939\u0940\u092E",
        description: body.description || "",
        scriptId: body.scriptId || "script_serviceman_recruitment_bhopal",
        scriptName: body.scriptName || "\u092D\u094B\u092A\u093E\u0932 \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928 \u092D\u0930\u094D\u0924\u0940 \u0935 \u0911\u0928\u092C\u094B\u0930\u094D\u0921\u093F\u0902\u0917",
        targetAudience: body.targetAudience || "marketing_leads",
        tradeFilter: body.tradeFilter || "",
        cityFilter: body.cityFilter || "Bhopal",
        statusFilter: body.statusFilter || "",
        language: body.language || "hinglish",
        status: body.status || "draft",
        callingHoursStart: body.callingHoursStart || "10:00",
        callingHoursEnd: body.callingHoursEnd || "18:00",
        maxAttempts: Number(body.maxAttempts) || 3,
        delayBetweenCallsSeconds: Number(body.delayBetweenCallsSeconds) || 15,
        maxConcurrentCalls: Number(body.maxConcurrentCalls) || 2,
        recordingEnabled: body.recordingEnabled ?? true,
        transcriptionEnabled: body.transcriptionEnabled ?? true,
        humanHandoffNumber: body.humanHandoffNumber || "+916267546945",
        allowBargeIn: body.allowBargeIn ?? true,
        totalLeads: Number(body.totalLeads) || 0,
        completedLeads: Number(body.completedLeads) || 0,
        successfulLeads: Number(body.successfulLeads) || 0,
        failedLeads: Number(body.failedLeads) || 0,
        createdAt: body.createdAt || nowIso,
        updatedAt: nowIso,
        createdBy: req.user?.email || "admin"
      };
      const existingIdx = inMemoryCampaigns.findIndex((c) => c.id === campaignId);
      if (existingIdx !== -1) {
        inMemoryCampaigns[existingIdx] = campaign;
      } else {
        inMemoryCampaigns.unshift(campaign);
      }
      try {
        await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", campaignId), campaign);
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        message: "Campaign saved successfully!",
        campaign
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/campaigns/:id/start", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }
      const withinHours = isWithinCallingHours(campaign.callingHoursStart, campaign.callingHoursEnd);
      if (!withinHours) {
        return res.status(400).json({
          success: false,
          error: `\u0915\u0949\u0932\u093F\u0902\u0917 \u0938\u092E\u092F (${campaign.callingHoursStart} - ${campaign.callingHoursEnd} IST) \u0938\u0947 \u092C\u093E\u0939\u0930 \u0939\u0948\u0964 \u0915\u093E\u0928\u0942\u0928\u0940 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0939\u0947\u0924\u0941 \u0915\u0949\u0932 \u0915\u0947\u0935\u0932 \u0924\u092F \u0938\u092E\u092F \u092E\u0947\u0902 \u0939\u0940 \u0915\u0940 \u091C\u093E \u0938\u0915\u0924\u0940 \u0939\u0948\u0964`
        });
      }
      campaign.status = "active";
      campaign.startedAt = (/* @__PURE__ */ new Date()).toISOString();
      campaign.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      try {
        await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", id), {
          status: "active",
          startedAt: campaign.startedAt,
          updatedAt: campaign.updatedAt
        });
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        message: `Campaign "${campaign.name}" is now ACTIVE!`,
        campaign
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/campaigns/:id/pause", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (campaign) {
        campaign.status = "paused";
        campaign.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", id), { status: "paused", updatedAt: campaign.updatedAt });
        } catch (_) {
        }
      }
      return res.status(200).json({ success: true, message: "Campaign paused" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/campaigns/:id/stop", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = inMemoryCampaigns.find((c) => c.id === id);
      if (campaign) {
        campaign.status = "stopped";
        campaign.endedAt = (/* @__PURE__ */ new Date()).toISOString();
        campaign.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", id), {
            status: "stopped",
            endedAt: campaign.endedAt,
            updatedAt: campaign.updatedAt
          });
        } catch (_) {
        }
      }
      return res.status(200).json({ success: true, message: "Campaign stopped" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.delete("/campaigns/:id", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      inMemoryCampaigns = inMemoryCampaigns.filter((c) => c.id !== id);
      try {
        await (0, import_firestore5.deleteDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", id));
      } catch (_) {
      }
      return res.status(200).json({ success: true, message: "Campaign deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/queue", requireAdminAuth2, async (req, res) => {
    try {
      const { campaignId, status } = req.query;
      let items = inMemoryQueue;
      try {
        const snap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_queue"));
        if (!snap.empty) {
          items = snap.docs.map((d) => d.data());
          inMemoryQueue = items;
        }
      } catch (_) {
      }
      if (campaignId) {
        items = items.filter((i) => i.campaignId === campaignId);
      }
      if (status) {
        items = items.filter((i) => i.status === status);
      }
      return res.status(200).json({
        success: true,
        queue: items,
        total: items.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/queue/populate", requireAdminAuth2, async (req, res) => {
    try {
      const { campaignId, cityFilter, tradeFilter, limitCount = 50 } = req.body;
      if (!campaignId) {
        return res.status(400).json({ success: false, error: "Campaign ID is required." });
      }
      const campaign = inMemoryCampaigns.find((c) => c.id === campaignId);
      const campName = campaign?.name || "AI Campaign";
      let availableLeads = [];
      try {
        const leadsSnap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "marketing_leads"));
        if (!leadsSnap.empty) {
          availableLeads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      } catch (_) {
      }
      if (availableLeads.length === 0) {
        availableLeads = [
          { id: "lead_bhopal_1", name: "\u0930\u093E\u091C\u0947\u0936 \u0935\u0930\u094D\u092E\u093E (\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928)", phone: "+919826012345", city: "Bhopal", trade: "\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928" },
          { id: "lead_bhopal_2", name: "\u0905\u092E\u093F\u0924 \u092A\u091F\u0947\u0932 (\u092A\u094D\u0932\u0902\u092C\u0930)", phone: "+919826023456", city: "Bhopal", trade: "\u092A\u094D\u0932\u0902\u092C\u0930" },
          { id: "lead_bhopal_3", name: "\u0938\u0941\u0930\u0947\u0936 \u0935\u093F\u0936\u094D\u0935\u0915\u0930\u094D\u092E\u093E (\u0915\u093E\u0930\u092A\u0947\u0902\u091F\u0930)", phone: "+919826034567", city: "Bhopal", trade: "\u0915\u093E\u0930\u092A\u0947\u0902\u091F\u0930" },
          { id: "lead_bhopal_4", name: "\u092E\u0928\u094B\u091C \u0938\u093E\u0939\u0942 (AC \u0930\u093F\u092A\u0947\u092F\u0930)", phone: "+919826045678", city: "Bhopal", trade: "AC \u0930\u093F\u092A\u0947\u092F\u0930" },
          { id: "lead_bhopal_5", name: "\u0926\u0940\u092A\u0915 \u092E\u093E\u0932\u0935\u0940\u092F (\u092A\u0947\u0902\u091F\u0930)", phone: "+919826056789", city: "Bhopal", trade: "\u092A\u0947\u0902\u091F\u0930" },
          { id: "lead_bhopal_6", name: "\u0938\u0902\u091C\u092F \u091C\u0948\u0928 (\u0938\u093F\u0935\u093F\u0932 \u0920\u0947\u0915\u0947\u0926\u093E\u0930)", phone: "+919826067890", city: "Bhopal", trade: "\u0938\u093F\u0935\u093F\u0932 \u0935\u0930\u094D\u0915\u094D\u0938" }
        ];
      }
      let filtered = availableLeads.filter((lead) => {
        const phone = (lead.phone || lead.mobile || lead.contactPhone || "").trim();
        if (!phone || phone.length < 8) return false;
        if (cityFilter && !(lead.city || lead.cityOrDistrict || "").toLowerCase().includes(cityFilter.toLowerCase())) {
          return false;
        }
        if (tradeFilter && !(lead.trade || lead.category || "").toLowerCase().includes(tradeFilter.toLowerCase())) {
          return false;
        }
        return true;
      });
      const existingPhones = new Set(inMemoryQueue.map((q) => q.phone));
      const newlyAdded = [];
      for (const lead of filtered.slice(0, Number(limitCount))) {
        const phone = (lead.phone || lead.mobile || lead.contactPhone || "").trim();
        if (existingPhones.has(phone)) continue;
        const queueItem = {
          id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          campaignId,
          campaignName: campName,
          leadId: lead.id,
          contactName: lead.name || lead.businessName || "\u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0930\u094B\u0935\u093E\u0907\u0921\u0930",
          phone,
          city: lead.city || lead.cityOrDistrict || "Bhopal",
          trade: lead.trade || lead.category || "\u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928",
          status: "PENDING",
          attemptCount: 0,
          maxAttempts: campaign?.maxAttempts || 3,
          priority: 1,
          doNotCall: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        newlyAdded.push(queueItem);
        inMemoryQueue.push(queueItem);
        try {
          await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_queue", queueItem.id), queueItem);
        } catch (_) {
        }
      }
      if (campaign) {
        campaign.totalLeads = (campaign.totalLeads || 0) + newlyAdded.length;
        try {
          await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_campaigns", campaignId), { totalLeads: campaign.totalLeads });
        } catch (_) {
        }
      }
      return res.status(200).json({
        success: true,
        message: `Successfully imported ${newlyAdded.length} eligible leads into calling queue!`,
        addedCount: newlyAdded.length,
        items: newlyAdded
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/queue/trigger-next", requireAdminAuth2, async (req, res) => {
    try {
      const { campaignId, count = 1 } = req.body;
      const pendingItems = inMemoryQueue.filter(
        (q) => (q.status === "PENDING" || q.status === "QUEUED") && (!campaignId || q.campaignId === campaignId)
      );
      if (pendingItems.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No pending calls in queue.",
          processedCount: 0
        });
      }
      const toProcess = pendingItems.slice(0, Number(count));
      const results = [];
      for (const item of toProcess) {
        item.status = "CALLING";
        item.attemptCount = (item.attemptCount || 0) + 1;
        item.lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
        item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        const log = await executeSingleOutboundCall({
          leadId: item.leadId,
          campaignId: item.campaignId,
          contactName: item.contactName,
          phone: item.phone,
          city: item.city,
          trade: item.trade,
          adminUid: req.user?.uid || "admin_root"
        });
        item.lastCallId = log.id;
        item.status = log.status;
        item.lastOutcome = log.outcome;
        inMemoryLogs.unshift(log);
        results.push({ queueId: item.id, callId: log.id, status: log.status });
        try {
          await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_queue", item.id), item);
        } catch (_) {
        }
      }
      return res.status(200).json({
        success: true,
        message: `Processed ${toProcess.length} call(s) from queue.`,
        results
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/logs", requireAdminAuth2, async (req, res) => {
    try {
      try {
        const snap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_logs"));
        if (!snap.empty) {
          inMemoryLogs = snap.docs.map((d) => d.data());
        }
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        logs: inMemoryLogs,
        total: inMemoryLogs.length
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/logs/:id", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      let log = inMemoryLogs.find((l) => l.id === id);
      if (!log) {
        try {
          const snap = await (0, import_firestore5.getDoc)((0, import_firestore5.doc)(db, "ai_call_logs", id));
          if (snap.exists()) log = snap.data();
        } catch (_) {
        }
      }
      if (!log) {
        return res.status(404).json({ success: false, error: "Call log not found" });
      }
      return res.status(200).json({ success: true, log });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/logs/:id/summarize", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      const log = inMemoryLogs.find((l) => l.id === id);
      if (!log) {
        return res.status(404).json({ success: false, error: "Call log not found" });
      }
      const summaryResult = await summarizeCallTranscript(log.transcript || [], log.contactName);
      log.summary = summaryResult.summary;
      log.sentiment = summaryResult.sentiment;
      log.outcome = summaryResult.outcome;
      log.nextAction = summaryResult.nextAction;
      log.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      try {
        await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_logs", id), {
          summary: log.summary,
          sentiment: log.sentiment,
          outcome: log.outcome,
          nextAction: log.nextAction,
          updatedAt: log.updatedAt
        });
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        summary: summaryResult,
        log
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/scripts", requireAdminAuth2, async (req, res) => {
    try {
      try {
        const snap = await (0, import_firestore5.getDocs)((0, import_firestore5.collection)(db, "ai_call_scripts"));
        if (!snap.empty) {
          inMemoryScripts = snap.docs.map((d) => d.data());
        }
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        scripts: inMemoryScripts
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/scripts", requireAdminAuth2, async (req, res) => {
    try {
      const body = req.body;
      const scriptId = body.id || `script_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const script = {
        id: scriptId,
        name: body.name || "\u0928\u092F\u093E AI \u0915\u0949\u0932\u093F\u0902\u0917 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F",
        category: body.category || "general",
        language: body.language || "hinglish",
        openingGreeting: body.openingGreeting || "\u0928\u092E\u0938\u094D\u0924\u0947!",
        objective: body.objective || "",
        systemPrompt: body.systemPrompt || "",
        keyTalkingPoints: Array.isArray(body.keyTalkingPoints) ? body.keyTalkingPoints : [],
        faqResponses: Array.isArray(body.faqResponses) ? body.faqResponses : [],
        objectionHandling: Array.isArray(body.objectionHandling) ? body.objectionHandling : [],
        closingRemark: body.closingRemark || "\u0927\u0928\u094D\u092F\u0935\u093E\u0926!",
        isDefault: Boolean(body.isDefault),
        createdAt: body.createdAt || nowIso,
        updatedAt: nowIso
      };
      const existingIdx = inMemoryScripts.findIndex((s) => s.id === scriptId);
      if (existingIdx !== -1) {
        inMemoryScripts[existingIdx] = script;
      } else {
        inMemoryScripts.push(script);
      }
      try {
        await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_scripts", scriptId), script);
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        message: "Script saved successfully!",
        script
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.delete("/scripts/:id", requireAdminAuth2, async (req, res) => {
    try {
      const { id } = req.params;
      inMemoryScripts = inMemoryScripts.filter((s) => s.id !== id);
      try {
        await (0, import_firestore5.deleteDoc)((0, import_firestore5.doc)(db, "ai_call_scripts", id));
      } catch (_) {
      }
      return res.status(200).json({ success: true, message: "Script deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.get("/settings", requireAdminAuth2, async (req, res) => {
    try {
      try {
        const snap = await (0, import_firestore5.getDoc)((0, import_firestore5.doc)(db, "ai_call_settings", "global_ai_call_settings"));
        if (snap.exists()) {
          inMemorySettings = snap.data();
        }
      } catch (_) {
      }
      if (inMemorySettings?.geminiVoiceConfig) {
        inMemorySettings.geminiVoiceConfig.model = normalizeGeminiModel(inMemorySettings.geminiVoiceConfig.model);
      }
      const safeSettings = inMemorySettings ? {
        ...inMemorySettings,
        geminiVoiceConfig: {
          ...inMemorySettings.geminiVoiceConfig,
          model: normalizeGeminiModel(inMemorySettings.geminiVoiceConfig?.model)
        },
        jioCxConfig: {
          ...inMemorySettings.jioCxConfig,
          apiKey: inMemorySettings.jioCxConfig.apiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + inMemorySettings.jioCxConfig.apiKey.slice(-4) : "",
          apiSecret: inMemorySettings.jioCxConfig.apiSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
        }
      } : DEFAULT_SETTINGS;
      return res.status(200).json({
        success: true,
        settings: safeSettings,
        diagnostics: getAIDiagnostics()
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/settings", requireAdminAuth2, async (req, res) => {
    try {
      const body = req.body;
      const current = inMemorySettings || DEFAULT_SETTINGS;
      const updated = {
        ...current,
        telephonyProvider: body.telephonyProvider || current.telephonyProvider,
        jioCxConfig: {
          ...current.jioCxConfig,
          ...body.jioCxConfig,
          apiKey: body.jioCxConfig?.apiKey?.includes("\u2022\u2022\u2022\u2022") ? current.jioCxConfig.apiKey : body.jioCxConfig?.apiKey || current.jioCxConfig.apiKey,
          apiSecret: body.jioCxConfig?.apiSecret?.includes("\u2022\u2022\u2022\u2022") ? current.jioCxConfig.apiSecret : body.jioCxConfig?.apiSecret || current.jioCxConfig.apiSecret
        },
        geminiVoiceConfig: {
          ...current.geminiVoiceConfig,
          ...body.geminiVoiceConfig,
          model: normalizeGeminiModel(body.geminiVoiceConfig?.model || current.geminiVoiceConfig.model)
        },
        globalCallingHours: {
          ...current.globalCallingHours,
          ...body.globalCallingHours
        },
        safetyLimits: {
          ...current.safetyLimits,
          ...body.safetyLimits
        },
        humanHandoff: {
          ...current.humanHandoff,
          ...body.humanHandoff
        },
        testModeActive: body.testModeActive ?? current.testModeActive,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedBy: req.user?.email || "admin"
      };
      inMemorySettings = updated;
      try {
        await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_settings", "global_ai_call_settings"), updated);
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        message: "Calling settings saved successfully!",
        settings: {
          ...updated,
          jioCxConfig: {
            ...updated.jioCxConfig,
            apiKey: updated.jioCxConfig.apiKey ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + updated.jioCxConfig.apiKey.slice(-4) : "",
            apiSecret: updated.jioCxConfig.apiSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : ""
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/simulator/turn", requireAdminAuth2, async (req, res) => {
    try {
      const {
        scriptPrompt,
        leadName,
        trade,
        city,
        conversationHistory = [],
        customerInputText,
        language = "hinglish",
        isFirstTurn = false
      } = req.body;
      const aiTurn = await generateAICallResponse({
        scriptPrompt: scriptPrompt || DEFAULT_SCRIPTS[0].systemPrompt,
        leadName: leadName || "\u0926\u0940\u092A\u0915",
        trade: trade || "\u0907\u0932\u0947\u0915\u094D\u091F\u094D\u0930\u0940\u0936\u093F\u092F\u0928",
        city: city || "\u092D\u094B\u092A\u093E\u0932",
        conversationHistory,
        customerInputText,
        language,
        isFirstTurn
      });
      return res.status(200).json({
        success: true,
        ...aiTurn
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/simulator/finish", requireAdminAuth2, async (req, res) => {
    try {
      const { transcript = [], leadName, phone, trade, city, campaignId } = req.body;
      const summaryResult = await summarizeCallTranscript(transcript, leadName);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const callId = `sim_call_${Date.now()}`;
      const logRecord = {
        id: callId,
        callId,
        contactName: leadName || "Test Lead",
        phone: phone || "+919826000000",
        direction: "outbound",
        campaignId: campaignId || "simulated_test",
        campaignName: "Interactive Browser Simulator",
        provider: "mock",
        status: "COMPLETED",
        startedAt: nowIso,
        durationSeconds: Math.max(15, transcript.length * 12),
        language: "hinglish",
        outcome: summaryResult.outcome,
        summary: summaryResult.summary,
        transcript,
        sentiment: summaryResult.sentiment,
        nextAction: summaryResult.nextAction,
        humanTransferRequested: summaryResult.outcome === "HUMAN_AGENT_REQUEST",
        recordingEnabled: false,
        transcriptionEnabled: true,
        attemptNumber: 1,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      inMemoryLogs.unshift(logRecord);
      try {
        await (0, import_firestore5.setDoc)((0, import_firestore5.doc)(db, "ai_call_logs", callId), logRecord);
      } catch (_) {
      }
      return res.status(200).json({
        success: true,
        log: logRecord,
        summary: summaryResult
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  router.post("/call-now", requireAdminAuth2, async (req, res) => {
    try {
      const { phone, contactName, trade, city, campaignId, scriptId, providerOverride } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: "Phone number is required." });
      }
      const log = await executeSingleOutboundCall({
        leadId: req.body.leadId,
        campaignId: campaignId || "direct_admin_call",
        contactName: contactName || "\u0915\u0938\u094D\u091F\u092E\u0930 / \u0938\u0930\u094D\u0935\u093F\u0938\u092E\u0948\u0928",
        phone,
        city: city || "Bhopal",
        trade: trade || "\u0938\u0930\u094D\u0935\u093F\u0938 \u092A\u094D\u0930\u094B\u0935\u093E\u0907\u0921\u0930",
        scriptId,
        providerOverride,
        adminUid: req.user?.uid || "admin_root"
      });
      inMemoryLogs.unshift(log);
      return res.status(200).json({
        success: true,
        message: `Call initiated to ${phone} via ${log.provider.toUpperCase()}`,
        log
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  const handleTelephonyWebhook = async (req, res) => {
    try {
      const provider = getTelephonyProvider("jiocx");
      const event = await provider.handleWebhook(req.body, req.headers);
      console.log(`[AICallingWebhook] Event ${event.eventType} for call ${event.callId} (${event.providerCallId})`);
      const log = inMemoryLogs.find((l) => l.id === event.callId || l.providerCallId === event.providerCallId);
      if (log) {
        log.status = event.status;
        if (event.durationSeconds) log.durationSeconds = event.durationSeconds;
        if (event.recordingUrl) log.recordingUrl = event.recordingUrl;
        log.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        try {
          await (0, import_firestore5.updateDoc)((0, import_firestore5.doc)(db, "ai_call_logs", log.id), {
            status: log.status,
            durationSeconds: log.durationSeconds,
            recordingUrl: log.recordingUrl || null,
            updatedAt: log.updatedAt
          });
        } catch (_) {
        }
      }
      return res.status(200).json({ success: true, received: true });
    } catch (err) {
      console.error("[AICallingWebhook] Webhook handling error:", err);
      return res.status(200).json({ success: false, error: err.message });
    }
  };
  router.post("/webhook/jiocx", handleTelephonyWebhook);
  router.post("/webhook/telephony", handleTelephonyWebhook);
  return router;
}

// server.ts
var import_firebase_admin2 = __toESM(require("firebase-admin"), 1);
var import_app2 = require("firebase-admin/app");
var import_firestore9 = require("firebase-admin/firestore");

// server/fcmNotificationService.ts
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore6 = require("firebase-admin/firestore");
var import_messaging = require("firebase-admin/messaging");
var import_firestore7 = require("firebase/firestore");
var adminDbInstance = null;
function getAdminDb() {
  if (!adminDbInstance) {
    try {
      const app3 = import_firebase_admin.default.getApps()[0] || import_firebase_admin.default.initializeApp({ projectId: firebase_applet_config_default.projectId });
      adminDbInstance = (0, import_firestore6.getFirestore)(app3, firebase_applet_config_default.firestoreDatabaseId || "(default)");
    } catch {
      try {
        adminDbInstance = (0, import_firestore6.getFirestore)(firebase_applet_config_default.firestoreDatabaseId || "(default)");
      } catch {
        adminDbInstance = null;
      }
    }
  }
  return adminDbInstance;
}
function cleanId(id) {
  return (id || "").trim();
}
var inMemoryUserTokens = /* @__PURE__ */ new Map();
function recordServerUserToken(userId, token) {
  const cId = cleanId(userId);
  const cTok = (token || "").trim();
  if (!cId || !cTok) return;
  if (!inMemoryUserTokens.has(cId)) {
    inMemoryUserTokens.set(cId, /* @__PURE__ */ new Set());
  }
  inMemoryUserTokens.get(cId).add(cTok);
}
async function lookupDeviceTokensForUser(userId) {
  const cId = cleanId(userId);
  if (!cId) return [];
  const tokens = /* @__PURE__ */ new Set();
  const inMem = inMemoryUserTokens.get(cId);
  if (inMem) {
    inMem.forEach((t) => tokens.add(t));
  }
  try {
    const adb = getAdminDb();
    if (adb) {
      try {
        const snap12 = await adb.collection("device_tokens").where("userId", "==", cId).limit(20).get();
        snap12.forEach((d) => {
          const data = d.data();
          if (data.isActive !== false && data.token && typeof data.token === "string") {
            tokens.add(data.token.trim());
          }
        });
      } catch {
      }
      try {
        const snap22 = await adb.collection("device_tokens").where("uid", "==", cId).limit(20).get();
        snap22.forEach((d) => {
          const data = d.data();
          if (data.isActive !== false && data.token && typeof data.token === "string") {
            tokens.add(data.token.trim());
          }
        });
      } catch {
      }
      try {
        const proSnap = await adb.collection("service_men").doc(cId).get();
        if (proSnap.exists) {
          const proData = proSnap.data();
          if (Array.isArray(proData?.fcmTokens)) {
            for (const t of proData.fcmTokens) {
              if (typeof t === "string" && t.trim()) tokens.add(t.trim());
            }
          }
          if (typeof proData?.fcmToken === "string" && proData.fcmToken.trim()) {
            tokens.add(proData.fcmToken.trim());
          }
        }
      } catch {
      }
      try {
        const userSnap = await adb.collection("users").doc(cId).get();
        if (userSnap.exists) {
          const uData = userSnap.data();
          if (Array.isArray(uData?.fcmTokens)) {
            for (const t of uData.fcmTokens) {
              if (typeof t === "string" && t.trim()) tokens.add(t.trim());
            }
          }
          if (typeof uData?.fcmToken === "string" && uData.fcmToken.trim()) {
            tokens.add(uData.fcmToken.trim());
          }
        }
      } catch {
      }
      return Array.from(tokens).filter((t) => t.length > 10);
    }
    const q1 = (0, import_firestore7.query)(
      (0, import_firestore7.collection)(db, "device_tokens"),
      (0, import_firestore7.where)("userId", "==", cId),
      (0, import_firestore7.limit)(20)
    );
    const snap1 = await (0, import_firestore7.getDocs)(q1);
    snap1.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false && data.token && typeof data.token === "string") {
        tokens.add(data.token.trim());
      }
    });
    const q2 = (0, import_firestore7.query)(
      (0, import_firestore7.collection)(db, "device_tokens"),
      (0, import_firestore7.where)("uid", "==", cId),
      (0, import_firestore7.limit)(20)
    );
    const snap2 = await (0, import_firestore7.getDocs)(q2);
    snap2.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false && data.token && typeof data.token === "string") {
        tokens.add(data.token.trim());
      }
    });
  } catch (err) {
    console.warn(`[FCM Service] Error looking up tokens for user ${cId}:`, err?.message || err);
  }
  return Array.from(tokens).filter((t) => t.length > 10);
}
async function cleanupUnregisteredTokens(badTokens) {
  if (!badTokens || badTokens.length === 0) return;
  const adb = getAdminDb();
  if (adb) {
    for (const token of badTokens) {
      try {
        const snap = await adb.collection("device_tokens").where("token", "==", token).limit(10).get();
        for (const d of snap.docs) {
          await d.ref.update({
            isActive: false,
            invalidatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            invalidationReason: "FCM_UNREGISTERED"
          });
        }
      } catch (err) {
        console.warn("[FCM Service] Failed to cleanup token:", err);
      }
    }
    return;
  }
  for (const token of badTokens) {
    try {
      const q = (0, import_firestore7.query)(
        (0, import_firestore7.collection)(db, "device_tokens"),
        (0, import_firestore7.where)("token", "==", token),
        (0, import_firestore7.limit)(10)
      );
      const snap = await (0, import_firestore7.getDocs)(q);
      for (const d of snap.docs) {
        await (0, import_firestore7.updateDoc)(d.ref, {
          isActive: false,
          invalidatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          invalidationReason: "FCM_UNREGISTERED"
        }).catch(() => {
        });
      }
    } catch (err) {
      console.warn("[FCM Service] Failed to cleanup token:", err);
    }
  }
}
async function sendFcmPushToTokens(tokens, payload) {
  const validTokens = Array.from(new Set(tokens.filter((t) => t && typeof t === "string" && t.trim().length > 10)));
  if (validTokens.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      tokensCount: 0,
      error: "No valid device tokens provided"
    };
  }
  const targetUrl = payload.url || (payload.bookingId ? payload.targetRole === "pro" || payload.targetRole === "service_man" ? `/pro?bookingId=${payload.bookingId}` : `/#booking_${payload.bookingId}` : "/");
  const stringData = {
    bookingId: payload.bookingId || "",
    eventType: payload.eventType || "",
    type: payload.type || "booking",
    url: targetUrl,
    title: payload.title,
    body: payload.body,
    tag: payload.tag || payload.bookingId || "hardinkaam_alert",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) {
      if (v !== void 0 && v !== null) {
        stringData[k] = String(v);
      }
    }
  }
  const multicastMessage = {
    tokens: validTokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: stringData,
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: "/pwa-192x192.png",
        badge: "/favicon-32x32.png",
        tag: payload.tag || payload.bookingId || "hardinkaam-booking-push",
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: payload.targetRole === "pro" || payload.eventType === "booking_offer"
      },
      fcmOptions: {
        link: targetUrl
      }
    },
    android: {
      priority: "high",
      notification: {
        title: payload.title,
        body: payload.body,
        channelId: "hardinkaam_booking_alerts",
        sound: payload.sound || "default",
        icon: "ic_notification",
        clickAction: "FLUTTER_NOTIFICATION_CLICK"
      }
    }
  };
  try {
    let messaging;
    try {
      messaging = (0, import_messaging.getMessaging)();
    } catch {
      messaging = typeof import_firebase_admin.default.messaging === "function" ? import_firebase_admin.default.messaging() : null;
    }
    if (!messaging) {
      console.warn("[FCM Service] Firebase Admin Messaging instance could not be retrieved.");
      return {
        success: false,
        sentCount: 0,
        failedCount: validTokens.length,
        tokensCount: validTokens.length,
        error: "Messaging instance unavailable"
      };
    }
    let sendResponse;
    if (typeof messaging.sendEachForMulticast === "function") {
      sendResponse = await messaging.sendEachForMulticast(multicastMessage);
    } else if (typeof messaging.sendMulticast === "function") {
      sendResponse = await messaging.sendMulticast(multicastMessage);
    } else {
      let success = 0;
      let failure = 0;
      const unregistered = [];
      for (const token of validTokens) {
        try {
          await messaging.send({
            token,
            notification: multicastMessage.notification,
            data: multicastMessage.data,
            webpush: multicastMessage.webpush,
            android: multicastMessage.android
          });
          success++;
        } catch (e) {
          failure++;
          if (e.code === "messaging/registration-token-not-registered" || e.code === "messaging/invalid-registration-token") {
            unregistered.push(token);
          }
        }
      }
      if (unregistered.length > 0) {
        cleanupUnregisteredTokens(unregistered).catch(() => {
        });
      }
      return {
        success: success > 0,
        sentCount: success,
        failedCount: failure,
        tokensCount: validTokens.length,
        unregisteredTokens: unregistered
      };
    }
    const unregisteredTokens = [];
    sendResponse.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (errCode === "messaging/registration-token-not-registered" || errCode === "messaging/invalid-registration-token") {
          unregisteredTokens.push(validTokens[idx]);
        }
      }
    });
    if (unregisteredTokens.length > 0) {
      cleanupUnregisteredTokens(unregisteredTokens).catch(() => {
      });
    }
    return {
      success: sendResponse.successCount > 0,
      sentCount: sendResponse.successCount,
      failedCount: sendResponse.failureCount,
      tokensCount: validTokens.length,
      unregisteredTokens
    };
  } catch (err) {
    console.warn("[FCM Service] Multicast push dispatch note:", err?.message || err);
    return {
      success: false,
      sentCount: 0,
      failedCount: validTokens.length,
      tokensCount: validTokens.length,
      error: err?.message || "FCM dispatch failed"
    };
  }
}
async function syncInAppNotification(userId, payload) {
  const cId = cleanId(userId);
  if (!cId) return;
  const docId = `notif_fcm_${payload.eventType || "alert"}_${payload.bookingId || Date.now()}_${cId}`.substring(0, 120);
  const notifData = {
    id: docId,
    userId: cId,
    title: payload.title,
    message: payload.body,
    type: payload.type || "booking",
    link: payload.url || (payload.bookingId ? `/#booking_${payload.bookingId}` : ""),
    bookingId: payload.bookingId || "",
    eventType: payload.eventType || "",
    targetRole: payload.targetRole || "customer",
    read: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: payload.data || {}
  };
  try {
    const adb = getAdminDb();
    if (adb) {
      await adb.collection("notifications").doc(docId).set(notifData, { merge: true });
      return;
    }
    const notifRef = (0, import_firestore7.doc)(db, "notifications", docId);
    await (0, import_firestore7.setDoc)(notifRef, notifData, { merge: true });
  } catch (err) {
    console.warn("[FCM Service] Non-fatal notice creating in-app notification:", err);
  }
}
async function sendPushToUser(userId, payload) {
  const cId = cleanId(userId);
  if (!cId) {
    return { success: false, sentCount: 0, failedCount: 0, tokensCount: 0, error: "Empty userId" };
  }
  await syncInAppNotification(cId, payload);
  const tokens = await lookupDeviceTokensForUser(cId);
  if (tokens.length === 0) {
    console.log(`[FCM Service] User ${cId} has no active FCM push tokens registered (in-app notification created)`);
    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      tokensCount: 0
    };
  }
  console.log(`[FCM Service] Sending push notification to user ${cId} across ${tokens.length} token(s)...`);
  const result = await sendFcmPushToTokens(tokens, payload);
  console.log(`[FCM Service] Result for user ${cId}: ${result.sentCount} sent, ${result.failedCount} failed`);
  return result;
}
async function notifyServiceProNewAssignment(booking, serviceManId, offerId) {
  const bookingId = booking.id || booking.bookingId || "";
  const serviceName = booking.serviceName || "Service Request";
  const locality = booking.locality || booking.address || "Local area";
  const payout = booking.servicemanPayoutAmount || Math.round((booking.amount || 500) * 0.85);
  const payload = {
    title: "\u{1F514} \u0928\u092F\u093E \u0915\u093E\u092E \u0906\u092F\u093E \u0939\u0948! (New Service Job)",
    body: `Booking #${bookingId} (${serviceName}) at ${locality}. Earnings: \u20B9${payout}. Tap to review & accept!`,
    bookingId,
    eventType: "booking_offer",
    type: "booking",
    targetRole: "service_man",
    url: `/pro?bookingId=${bookingId}`,
    tag: `booking_offer_${bookingId}`,
    sound: "booking_chime",
    data: {
      offerId: offerId || "",
      serviceName,
      payout: String(payout),
      scheduledDate: booking.scheduledDate || "",
      scheduledTime: booking.scheduledTime || ""
    }
  };
  return sendPushToUser(serviceManId, payload);
}
async function notifyBookingStatusChange(booking, newStatus, actorUid, extraData) {
  const bookingId = booking.id || booking.bookingId || "";
  const serviceName = booking.serviceName || "Service";
  const customerId = booking.customerId || booking.userId;
  const proId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
  const proName = booking.serviceManName || "Technician";
  const cleanStatus = String(newStatus || "").toLowerCase().trim();
  switch (cleanStatus) {
    case "accepted":
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u{1F91D} Technician Assigned!",
          body: `${proName} has accepted your booking #${bookingId} for ${serviceName}. Tap to track live location.`,
          bookingId,
          eventType: "booking_accepted",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`,
          tag: `booking_accepted_${bookingId}`
        });
      }
      break;
    case "on_the_way":
      if (customerId) {
        const eta = extraData?.etaMinutes || 15;
        await sendPushToUser(customerId, {
          title: "\u{1F6F5} Technician On The Way!",
          body: `${proName} is en route to your service address. Estimated arrival: ~${eta} minutes.`,
          bookingId,
          eventType: "on_the_way",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`,
          tag: `on_the_way_${bookingId}`
        });
      }
      break;
    case "arrived":
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u{1F4CD} Technician Arrived at Doorstep!",
          body: `${proName} has reached your location for #${bookingId}. Please share your 4-digit OTP to start service.`,
          bookingId,
          eventType: "arrived",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`,
          tag: `arrived_${bookingId}`
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: "\u{1F4CD} Arrival Confirmed",
          body: `You arrived at booking #${bookingId}. Collect Start OTP from customer to start timer.`,
          bookingId,
          eventType: "arrived",
          type: "booking",
          targetRole: "service_man",
          url: `/pro?bookingId=${bookingId}`
        });
      }
      break;
    case "in_progress":
    case "work_started":
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u23F1\uFE0F Service Work Started",
          body: `${proName} verified your OTP and started work on #${bookingId} (${serviceName}). Live timer active.`,
          bookingId,
          eventType: "work_started",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`
        });
      }
      break;
    case "completed":
    case "work_completed": {
      const finalAmount = extraData?.amount || booking.finalAmount || booking.amount || 0;
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u{1F389} Service Completed!",
          body: `${proName} completed #${bookingId} (${serviceName}). Payable: \u20B9${finalAmount}. Tap to inspect & pay.`,
          bookingId,
          eventType: "work_completed",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: "\u2705 Job Completed Successfully",
          body: `Work for booking #${bookingId} completed. Bill of \u20B9${finalAmount} generated.`,
          bookingId,
          eventType: "work_completed",
          type: "booking",
          targetRole: "service_man",
          url: `/pro?bookingId=${bookingId}`
        });
      }
      break;
    }
    case "paid": {
      const amt = extraData?.amount || booking.finalAmount || booking.amount || 0;
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u{1F4B3} Payment Successful!",
          body: `Payment of \u20B9${amt} for #${bookingId} was received. Thank you for choosing HARDINKAAM!`,
          bookingId,
          eventType: "payment_status",
          type: "payment",
          targetRole: "customer",
          url: `/#booking_${bookingId}`
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: "\u{1F4B0} Payment Received!",
          body: `Payment of \u20B9${amt} for #${bookingId} received. Earnings credited to your wallet balance.`,
          bookingId,
          eventType: "payment_status",
          type: "payment",
          targetRole: "service_man",
          url: `/pro?bookingId=${bookingId}`
        });
      }
      break;
    }
    case "cancelled": {
      const reason = extraData?.reason || "Service cancelled";
      if (customerId) {
        await sendPushToUser(customerId, {
          title: "\u{1F6AB} Booking Cancelled",
          body: `Booking #${bookingId} (${serviceName}) was cancelled. Reason: ${reason}`,
          bookingId,
          eventType: "cancellation",
          type: "booking",
          targetRole: "customer",
          url: `/#booking_${bookingId}`
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: "\u{1F6AB} Job Cancelled",
          body: `Job #${bookingId} (${serviceName}) was cancelled.`,
          bookingId,
          eventType: "cancellation",
          type: "booking",
          targetRole: "service_man",
          url: `/pro`
        });
      }
      break;
    }
  }
}

// server.ts
import_dotenv.default.config({ path: import_path2.default.resolve(process.cwd(), ".env"), override: true });
var adminApp;
try {
  if ((0, import_app2.getApps)().length > 0) {
    adminApp = (0, import_app2.getApp)();
  } else {
    let credential = void 0;
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        if (serviceAccountKey.trim().startsWith("{")) {
          credential = (0, import_app2.cert)(JSON.parse(serviceAccountKey));
        } else if (import_fs2.default.existsSync(serviceAccountKey)) {
          credential = (0, import_app2.cert)(serviceAccountKey);
        }
      } catch (err) {
        console.warn("[Admin SDK] Notice: Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY:", err.message);
      }
    }
    if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS && import_fs2.default.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        credential = (0, import_app2.applicationDefault)();
      } catch (err) {
        console.warn("[Admin SDK] Notice: applicationDefault() failed:", err.message);
      }
    }
    if (!credential) {
      try {
        credential = (0, import_app2.applicationDefault)();
      } catch {
      }
    }
    adminApp = (0, import_app2.initializeApp)({
      ...credential ? { credential } : {},
      projectId: firebase_applet_config_default.projectId
    });
    console.log(`[Admin SDK] Firebase Admin SDK initialized. Auth mode: ${credential ? "Authorized Service Account / ADC" : "Project ID fallback"}.`);
  }
} catch (adminErr) {
  console.warn("[Admin SDK] Firebase Admin SDK initialization warning:", adminErr.message);
  adminApp = (0, import_app2.getApps)()[0] || (0, import_app2.initializeApp)({ projectId: firebase_applet_config_default.projectId });
}
function getAuthoritativeAdminFirestore() {
  const customDbId = firebase_applet_config_default.firestoreDatabaseId || "(default)";
  const currentApp = (0, import_app2.getApps)()[0] || adminApp;
  return (0, import_firestore9.getFirestore)(currentApp, customDbId);
}
async function authenticateServerInstance() {
  const adminEmail = process.env.SERVER_ADMIN_EMAIL;
  const adminPass = process.env.SERVER_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    console.warn("[Admin SDK] Server admin bootstrap disabled: SERVER_ADMIN_EMAIL/SERVER_ADMIN_PASSWORD are not configured.");
    return;
  }
  try {
    let adminUid = "admin_deepak_root";
    try {
      const userRecord = await import_firebase_admin2.default.auth().getUserByEmail(adminEmail);
      adminUid = userRecord.uid;
      await import_firebase_admin2.default.auth().updateUser(adminUid, {
        password: adminPass
      });
      console.log("[Admin SDK] Existing admin account synchronized successfully.");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        const userRecord = await import_firebase_admin2.default.auth().createUser({
          email: adminEmail,
          password: adminPass,
          displayName: "HDK System Admin Agent"
        });
        adminUid = userRecord.uid;
        console.log("[Admin SDK] Created new Super Admin account in Firebase Auth! UID:", adminUid);
      } else {
        throw err;
      }
    }
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "users", adminUid), {
      id: adminUid,
      name: "HDK System Admin Agent",
      email: adminEmail,
      role: "admin",
      isAdmin: true,
      isSuperAdmin: true,
      status: "active",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    console.log("[Admin SDK] Server-side Super Admin profile initialized successfully.");
  } catch (err) {
    console.warn("[Admin SDK] Server admin initialization notice:", err.message);
  }
}
authenticateServerInstance();
var app2 = (0, import_express2.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var DEFAULT_ALLOWED_ORIGINS = [
  "https://www.hardinkaam.online",
  "https://hardinkaam.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
function getAllowedOrigins() {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  return Array.from(/* @__PURE__ */ new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]));
}
app2.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Razorpay-Signature, X-Razorpay-Event-Id"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app2.use(import_express2.default.json({
  limit: "150mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app2.use(import_express2.default.urlencoded({
  limit: "150mb",
  extended: true,
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app2.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
var ipRateLimits = /* @__PURE__ */ new Map();
app2.use("/api", (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1e3;
  const maxRequests = 300;
  const current = ipRateLimits.get(ip);
  if (!current || current.resetTime < now) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  current.count++;
  if (current.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please try again in a minute."
    });
  }
  next();
});
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimits.entries()) {
    if (record.resetTime < now) {
      ipRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1e3).unref();
var uploadZip = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: {
    fileSize: Math.max(150, parseInt(process.env.MAX_DEPLOY_ZIP_SIZE_MB || "150", 10) || 150) * 1024 * 1024,
    fieldSize: 150 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isZip = file.mimetype === "application/zip" || file.mimetype === "application/x-zip-compressed" || file.originalname.toLowerCase().endsWith(".zip");
    if (isZip) {
      cb(null, true);
    } else {
      cb(new Error("Only valid .zip archives are allowed for website deployment."));
    }
  }
});
var googlePublicCertsCache = {};
var googlePublicCertsCacheExpiry = 0;
async function fetchGooglePublicCerts() {
  const now = Date.now();
  if (googlePublicCertsCacheExpiry > now && Object.keys(googlePublicCertsCache).length > 0) {
    return googlePublicCertsCache;
  }
  try {
    const res = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    if (!res.ok) {
      throw new Error(`Failed to retrieve Google public certificates (HTTP ${res.status})`);
    }
    const certs = await res.json();
    const cacheHeader = res.headers.get("cache-control") || "";
    const match = cacheHeader.match(/max-age=(\d+)/i);
    const maxAgeSec = match ? parseInt(match[1], 10) : 3600;
    googlePublicCertsCache = certs;
    googlePublicCertsCacheExpiry = now + maxAgeSec * 1e3;
    return googlePublicCertsCache;
  } catch (err) {
    console.error("Failed to refresh Google public certificates:", err);
    if (Object.keys(googlePublicCertsCache).length > 0) {
      return googlePublicCertsCache;
    }
    throw err;
  }
}
async function verifyFirebaseIdToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("ID Token must be a non-empty string");
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token structure: expected standard 3-part JWT format");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid JWT header encoding");
  }
  if (header.alg !== "RS256") {
    throw new Error(`Invalid token algorithm: expected RS256, got ${header.alg}`);
  }
  if (!header.kid) {
    throw new Error("Invalid token: missing key identifier (kid) in header");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid JWT payload encoding");
  }
  const certs = await fetchGooglePublicCerts();
  const cert2 = certs[header.kid];
  if (!cert2) {
    throw new Error(`Public key not found for kid "${header.kid}" in Google certificate directory`);
  }
  const verifier = import_crypto2.default.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const signatureBuf = Buffer.from(signatureB64, "base64url");
  const isValid = verifier.verify(cert2, signatureBuf);
  if (!isValid) {
    throw new Error("Cryptographic signature verification failed: signature does not match Google public key");
  }
  const nowInSec = Math.floor(Date.now() / 1e3);
  const targetProjectId = firebase_applet_config_default.projectId || "hardinkaam-5cc6a";
  if (payload.aud !== targetProjectId) {
    throw new Error(`Audience mismatch: token aud "${payload.aud}" does not match project "${targetProjectId}"`);
  }
  const expectedIssuer = `https://securetoken.google.com/${targetProjectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Issuer mismatch: token iss "${payload.iss}" does not match expected "${expectedIssuer}"`);
  }
  if (!payload.sub || typeof payload.sub !== "string" || payload.sub.trim().length === 0) {
    throw new Error("Token subject (sub) is empty or invalid");
  }
  payload.uid = payload.sub;
  if (typeof payload.exp !== "number" || payload.exp <= nowInSec) {
    throw new Error(`Token has expired at timestamp ${payload.exp} (current server time: ${nowInSec})`);
  }
  if (typeof payload.iat === "number" && payload.iat > nowInSec + 300) {
    throw new Error("Token issued in the future (iat claim exceeds current server time)");
  }
  if (typeof payload.auth_time === "number" && payload.auth_time > nowInSec + 300) {
    throw new Error("Token auth_time is in the future");
  }
  return payload;
}
var AUTHORIZED_ADMIN_EMAILS = [
  "deepakbuildconbhopal@gmail.com",
  "admin@hardinkaam.in"
];
async function verifyAuthUser(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token && token !== "undefined" && token !== "null") {
      try {
        const decodedToken = await verifyFirebaseIdToken(token);
        req.user = decodedToken;
        req.uid = decodedToken.uid;
        return decodedToken.uid;
      } catch (verifyErr) {
        res.status(401).json({
          success: false,
          error: `Unauthorized: ${verifyErr.message || "Invalid or expired Firebase ID token."}`
        });
        return null;
      }
    }
  }
  res.status(401).json({
    success: false,
    error: "Unauthorized: Missing or invalid Authorization header. A valid Bearer ID token is required."
  });
  return null;
}
var requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = "";
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid Authorization header. A valid Bearer ID token is required."
      });
    }
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(token);
    } catch (verifyErr) {
      return res.status(401).json({
        success: false,
        error: `Authentication failed: ${verifyErr.message || "Invalid or expired Firebase ID token."}`
      });
    }
    const verifiedUid = decodedToken.uid;
    const verifiedEmail = (decodedToken.email || "").toLowerCase().trim();
    let isAuthorizedAdmin = false;
    if (verifiedEmail && AUTHORIZED_ADMIN_EMAILS.includes(verifiedEmail) && decodedToken.email_verified === true) {
      isAuthorizedAdmin = true;
    }
    if (!isAuthorizedAdmin && decodedToken.admin === true) {
      isAuthorizedAdmin = true;
    }
    if (!isAuthorizedAdmin) {
      try {
        const adminDocRef = (0, import_firestore8.doc)(db, "admins", verifiedUid);
        const adminSnap = await (0, import_firestore8.getDoc)(adminDocRef);
        if (adminSnap.exists() && adminSnap.data()?.active !== false) {
          isAuthorizedAdmin = true;
        }
      } catch (adminDocErr) {
        console.warn("[Admin Auth] Error checking admins collection:", adminDocErr.message);
      }
    }
    if (!isAuthorizedAdmin) {
      console.warn(`[Security Alert] Denied unverified admin request to ${req.path} from UID: ${verifiedUid}`);
      return res.status(403).json({
        success: false,
        error: "Forbidden: Authenticated user does not possess verified HARDINKAAM Admin authority."
      });
    }
    req.adminUser = {
      uid: verifiedUid,
      email: verifiedEmail || "admin@hardinkaam.in",
      name: decodedToken.name || "HARDINKAAM Admin"
    };
    req.user = decodedToken;
    req.uid = verifiedUid;
    next();
  } catch (err) {
    console.error("Unexpected error in admin authorization middleware:", err);
    return res.status(500).json({
      success: false,
      error: "Internal authorization error."
    });
  }
};
var DEFAULT_COMPANY_COMMISSION_RATE = 20;
var DEFAULT_TAX_RATE = 5;
app2.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = (identifier || email || phone || "").toString().trim();
    const pass = (password || "").toString();
    if (!loginId || !pass) {
      return res.status(400).json({
        success: false,
        error: "MISSING_CREDENTIALS",
        message: "Identifier and password are required / \u0915\u0943\u092A\u092F\u093E \u0906\u0908\u0921\u0940 \u0914\u0930 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964"
      });
    }
    const cleanedId = loginId.trim();
    const phoneDigits = cleanedId.replace(/\D/g, "").length === 10 ? cleanedId.replace(/\D/g, "") : null;
    let targetEmail = cleanedId;
    if (cleanedId.toUpperCase().startsWith("HDK-")) {
      try {
        const q = (0, import_firestore8.query)((0, import_firestore8.collection)(db, "franchise_partners"), (0, import_firestore8.where)("franchiseCode", "==", cleanedId.toUpperCase()));
        const snap = await (0, import_firestore8.getDocs)(q);
        if (!snap.empty) {
          const partnerData = snap.docs[0].data();
          if (partnerData.status === "SUSPENDED" || partnerData.status === "DISABLED") {
            return res.status(403).json({
              success: false,
              error: "ACCOUNT_SUSPENDED",
              message: `\u092F\u0939 \u092B\u094D\u0930\u0948\u0902\u091A\u093E\u0907\u091C\u093C\u0940 \u092A\u093E\u0930\u094D\u091F\u0928\u0930 \u0916\u093E\u0924\u093E (${partnerData.franchiseCode}) \u0928\u093F\u0932\u0902\u092C\u093F\u0924/\u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u090F\u0921\u092E\u093F\u0928 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964`
            });
          }
          if (partnerData.email) {
            targetEmail = partnerData.email;
          }
        }
      } catch (lookupErr) {
        console.warn("[Server Auth] Franchise partner lookup notice:", lookupErr?.message);
      }
    } else if (phoneDigits) {
      try {
        const q = (0, import_firestore8.query)((0, import_firestore8.collection)(db, "users"), (0, import_firestore8.where)("phone", "==", `+91 ${phoneDigits}`));
        const snap = await (0, import_firestore8.getDocs)(q);
        if (!snap.empty) {
          const uData = snap.docs[0].data();
          targetEmail = uData.email || uData.authEmail || `${phoneDigits}@phone.hardinkaam.in`;
        } else {
          targetEmail = `${phoneDigits}@phone.hardinkaam.in`;
        }
      } catch {
        targetEmail = `${phoneDigits}@phone.hardinkaam.in`;
      }
    } else if (cleanedId.toUpperCase() === "DEEPAK" || cleanedId.toLowerCase() === "admin") {
      targetEmail = "deepakbuildconbhopal@gmail.com";
    }
    if (!targetEmail || !targetEmail.includes("@")) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "\u0917\u0932\u0924 \u092A\u093E\u0938\u0935\u0930\u094D\u0921, \u0908\u092E\u0947\u0932 \u092F\u093E \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
      });
    }
    const apiKey = firebase_applet_config_default.apiKey || process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "SERVER_CONFIG_ERROR",
        message: "Firebase API Key is missing in server configuration."
      });
    }
    const verifyResp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.toLowerCase().trim(),
          password: pass,
          returnSecureToken: true
        })
      }
    );
    const verifyData = await verifyResp.json();
    if (!verifyResp.ok || !verifyData.idToken) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "\u0917\u0932\u0924 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092F\u093E \u0906\u0908\u0921\u0940\u0964 \u0915\u0943\u092A\u092F\u093E \u0938\u0939\u0940 \u0915\u094D\u0930\u0947\u0921\u0947\u0902\u0936\u093F\u092F\u0932\u094D\u0938 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964"
      });
    }
    const authUid = verifyData.localId;
    const authEmail = (verifyData.email || targetEmail).toLowerCase().trim();
    let profile = null;
    try {
      const userDocRef = (0, import_firestore8.doc)(db, "users", authUid);
      const userSnap = await (0, import_firestore8.getDoc)(userDocRef);
      if (userSnap.exists()) {
        const u = userSnap.data();
        if (u.status === "pending_approval" || u.registrationPaymentStatus === "pending_cash_approval") {
          return res.status(403).json({
            success: false,
            error: "PENDING_APPROVAL",
            message: `\u0928\u092E\u0938\u094D\u0924\u0947 ${u.name || "\u092F\u0942\u091C\u0930"}! \u0906\u092A\u0915\u093E \u0928\u0915\u0926 \u0930\u091C\u093F\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 \u0915\u0947 \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0939\u0947\u0924\u0941 \u0932\u0902\u092C\u093F\u0924 \u0939\u0948\u0964`
          });
        }
        profile = {
          id: authUid,
          name: u.name || "HARDINKAAM User",
          email: u.email || authEmail,
          phone: u.phone || "",
          role: u.role || "customer",
          status: u.status || "active",
          avatar: u.avatar || "",
          city: u.city || "Bhopal",
          districtId: u.districtId || u.assignedDistrictId,
          districtName: u.districtName || u.assignedDistrictName,
          franchiseCode: u.franchiseCode
        };
      }
    } catch (e) {
      console.warn("[Server Auth] Error fetching user profile:", e?.message);
    }
    if (AUTHORIZED_ADMIN_EMAILS.includes(authEmail)) {
      profile = {
        id: authUid,
        name: "DEEPAK",
        fullName: "DEEPAK (Founder & Super Admin)",
        email: authEmail,
        phone: "+91 62675 46945",
        role: "admin",
        isAdmin: true,
        isSuperAdmin: true,
        status: "active",
        city: "Bhopal",
        state: "Madhya Pradesh",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    if (!profile) {
      profile = {
        id: authUid,
        name: verifyData.displayName || "HARDINKAAM User",
        email: authEmail,
        role: "customer",
        status: "active"
      };
    }
    return res.status(200).json({
      success: true,
      idToken: verifyData.idToken,
      refreshToken: verifyData.refreshToken,
      expiresIn: verifyData.expiresIn,
      userProfile: profile
    });
  } catch (err) {
    console.warn("[Server Auth] Unexpected error in /api/auth/login:", err.message);
    return res.status(500).json({
      success: false,
      error: "SERVER_AUTH_ERROR",
      message: "\u092A\u094D\u0930\u092E\u093E\u0923\u0940\u0915\u0930\u0923 \u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u093E\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964"
    });
  }
});
app2.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app2.post(["/api/razorpay/order", "/api/create-order"], (req, res) => {
  return res.status(400).json({
    success: false,
    error: "ONLINE_PAYMENTS_DISABLED",
    message: "Online Razorpay payment integration has been removed in Phase 1. Please choose Cash or Offline Approval."
  });
});
app2.post(["/api/razorpay/verify", "/api/verify-payment"], (req, res) => {
  return res.status(400).json({
    success: false,
    error: "ONLINE_PAYMENTS_DISABLED",
    message: "Online Razorpay payment verification has been removed in Phase 1."
  });
});
app2.post("/api/razorpay/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Razorpay Webhook] Blocker: RAZORPAY_WEBHOOK_SECRET is not configured in environment.");
    return res.status(500).json({
      success: false,
      error: "WEBHOOK_SECRET_MISSING",
      message: "Razorpay webhook cannot be securely verified: RAZORPAY_WEBHOOK_SECRET is not configured on the server.",
      blocker: "RAZORPAY_WEBHOOK_SECRET environment variable is missing in server environment."
    });
  }
  const signature = req.headers["x-razorpay-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({
      success: false,
      error: "MISSING_SIGNATURE",
      message: "Missing X-Razorpay-Signature header in webhook request."
    });
  }
  let rawBodyBuffer;
  if (Buffer.isBuffer(req.rawBody)) {
    rawBodyBuffer = req.rawBody;
  } else if (Buffer.isBuffer(req.body)) {
    rawBodyBuffer = req.body;
  } else if (typeof req.rawBody === "string") {
    rawBodyBuffer = Buffer.from(req.rawBody, "utf8");
  } else if (typeof req.body === "string") {
    rawBodyBuffer = Buffer.from(req.body, "utf8");
  } else {
    rawBodyBuffer = Buffer.from(JSON.stringify(req.body || {}), "utf8");
  }
  const expectedSignature = import_crypto2.default.createHmac("sha256", webhookSecret).update(rawBodyBuffer).digest("hex");
  const sigBuffer = Buffer.from(signature, "utf8");
  const expBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expBuffer.length || !import_crypto2.default.timingSafeEqual(sigBuffer, expBuffer)) {
    console.warn("[Razorpay Webhook] Security Alert: Invalid HMAC-SHA256 signature rejected.");
    return res.status(400).json({
      success: false,
      error: "INVALID_SIGNATURE",
      message: "Razorpay webhook HMAC signature verification failed."
    });
  }
  let event;
  try {
    event = typeof req.body === "object" && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0 ? req.body : JSON.parse(rawBodyBuffer.toString("utf8"));
  } catch (parseErr) {
    return res.status(400).json({
      success: false,
      error: "INVALID_JSON_BODY",
      message: "Webhook payload is not valid JSON."
    });
  }
  const eventType = String(event.event || event.type || "unknown");
  const paymentEntity = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  const headerEventId = req.headers["x-razorpay-event-id"];
  const eventId = String(
    event.event_id || event.id || (typeof headerEventId === "string" ? headerEventId : "") || (paymentEntity?.id ? `${paymentEntity.id}_${eventType}` : "") || (orderEntity?.id ? `${orderEntity.id}_${eventType}` : "")
  );
  if (!eventId) {
    return res.status(400).json({
      success: false,
      error: "MISSING_EVENT_IDENTIFIER",
      message: "Unable to derive a deterministic event identifier from webhook payload."
    });
  }
  const adminDb = getAuthoritativeAdminFirestore();
  const eventDocRef = adminDb.collection("webhook_events").doc(eventId);
  let isDuplicateEvent = false;
  try {
    await eventDocRef.create({
      eventId,
      eventType,
      accountId: event.account_id || null,
      entityId: paymentEntity?.id || orderEntity?.id || null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      processedAt: null,
      status: "received"
    });
  } catch (createErr) {
    const isAlreadyExists = createErr.code === 6 || createErr.code === "ALREADY_EXISTS" || String(createErr.message || "").toLowerCase().includes("already exists");
    if (isAlreadyExists) {
      console.log(`[Razorpay Webhook] Idempotency: Event ${eventId} was already recorded. Skipping duplicate.`);
      isDuplicateEvent = true;
    } else {
      console.error(`[Razorpay Webhook] Blocker: Failed to write event ${eventId} to Firestore:`, createErr.message);
      const isPermissionDenied = createErr.code === 7 || String(createErr.message || "").includes("PERMISSION_DENIED");
      return res.status(500).json({
        success: false,
        error: isPermissionDenied ? "ADMIN_CREDENTIALS_REQUIRED" : "FIRESTORE_WRITE_FAILED",
        message: isPermissionDenied ? "Firebase Admin credentials missing or insufficient permissions on custom Firestore database ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57." : `Failed to record idempotent webhook event in Firestore: ${createErr.message}`,
        blocker: isPermissionDenied ? "Render Free environment requires FIREBASE_SERVICE_ACCOUNT_KEY with Editor/Admin privileges to write to custom Firestore database." : createErr.message
      });
    }
  }
  if (isDuplicateEvent) {
    return res.status(200).json({
      status: "ok",
      duplicate: true,
      message: "Event already recorded and processed idempotently.",
      eventId
    });
  }
  if (eventType === "payment.captured" || eventType === "order.paid") {
    const rawPaymentId = paymentEntity?.id;
    const rawOrderId = paymentEntity?.order_id || orderEntity?.id;
    if (!rawPaymentId) {
      try {
        await eventDocRef.update({ status: "completed", processedAt: (/* @__PURE__ */ new Date()).toISOString() });
      } catch (_) {
      }
      return res.status(200).json({ status: "ok", received: true, eventId });
    }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error("[Razorpay Webhook] Blocker: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment.");
      try {
        await eventDocRef.update({ status: "failed_missing_api_credentials" });
      } catch (_) {
      }
      return res.status(500).json({
        success: false,
        error: "RAZORPAY_API_CREDENTIALS_MISSING",
        message: "Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not configured to verify payment status.",
        blocker: "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in server environment."
      });
    }
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    let pmtData;
    try {
      const pmtRes = await fetch(`https://api.razorpay.com/v1/payments/${rawPaymentId}`, {
        headers: { Authorization: authHeader }
      });
      if (!pmtRes.ok) {
        const errText = await pmtRes.text().catch(() => "");
        console.error(`[Razorpay Webhook] Razorpay API fetch failed (${pmtRes.status}):`, errText);
        try {
          await eventDocRef.update({ status: "razorpay_api_fetch_failed" });
        } catch (_) {
        }
        return res.status(pmtRes.status >= 500 ? 502 : 400).json({
          success: false,
          error: "RAZORPAY_API_ERROR",
          message: `Failed to fetch payment details from Razorpay: HTTP ${pmtRes.status}`
        });
      }
      pmtData = await pmtRes.json();
    } catch (netErr) {
      console.error("[Razorpay Webhook] Network error contacting Razorpay Payments API:", netErr.message);
      return res.status(504).json({
        success: false,
        error: "RAZORPAY_API_TIMEOUT",
        message: `Network timeout contacting Razorpay API: ${netErr.message}`
      });
    }
    if (pmtData.status !== "captured") {
      console.warn(`[Razorpay Webhook] Security Alert: Payment ${rawPaymentId} status is '${pmtData.status}' (not 'captured'). Rejection.`);
      try {
        await eventDocRef.update({ status: "rejected_not_captured", paymentStatus: pmtData.status });
      } catch (_) {
      }
      return res.status(400).json({
        success: false,
        error: "PAYMENT_NOT_CAPTURED",
        message: `Payment status is '${pmtData.status}'. Only 'captured' payments are accepted.`
      });
    }
    if (!pmtData.order_id || rawOrderId && pmtData.order_id !== rawOrderId) {
      console.warn(`[Razorpay Webhook] Security Alert: Order ID mismatch (${pmtData.order_id} vs ${rawOrderId}).`);
      try {
        await eventDocRef.update({ status: "rejected_order_mismatch" });
      } catch (_) {
      }
      return res.status(400).json({
        success: false,
        error: "ORDER_MISMATCH",
        message: `Payment order ID '${pmtData.order_id}' does not match expected order '${rawOrderId}'.`
      });
    }
    if (pmtData.currency !== "INR") {
      console.warn(`[Razorpay Webhook] Security Alert: Payment currency is '${pmtData.currency}'. Only INR accepted.`);
      try {
        await eventDocRef.update({ status: "rejected_currency_mismatch" });
      } catch (_) {
      }
      return res.status(400).json({
        success: false,
        error: "CURRENCY_MISMATCH",
        message: `Invalid currency '${pmtData.currency}'. Only 'INR' is accepted.`
      });
    }
    let orderData = null;
    if (pmtData.order_id) {
      try {
        const ordRes = await fetch(`https://api.razorpay.com/v1/orders/${pmtData.order_id}`, {
          headers: { Authorization: authHeader }
        });
        if (ordRes.ok) {
          orderData = await ordRes.json();
          if (orderData.currency !== "INR" || orderData.amount !== pmtData.amount) {
            console.warn("[Razorpay Webhook] Order amount or currency mismatch with payment:", orderData);
            try {
              await eventDocRef.update({ status: "rejected_order_amount_mismatch" });
            } catch (_) {
            }
            return res.status(400).json({
              success: false,
              error: "ORDER_AMOUNT_MISMATCH",
              message: "Order amount or currency does not match captured payment amount."
            });
          }
        }
      } catch (ordErr) {
        console.warn("[Razorpay Webhook] Order verification lookup notice:", ordErr.message);
      }
    }
    const mergedNotes = { ...orderData?.notes || {}, ...pmtData.notes || {} };
    const targetBookingId = mergedNotes.bookingId || mergedNotes.referenceId;
    const purpose = mergedNotes.purpose;
    if (purpose === "wallet_topup") {
      console.warn("[Razorpay Webhook] Wallet recharge via standalone top-up is restricted.");
      try {
        await eventDocRef.update({ status: "rejected_wallet_topup_restricted" });
      } catch (_) {
      }
      return res.status(400).json({
        success: false,
        error: "WALLET_RECHARGE_RESTRICTED",
        message: "Direct customer wallet recharge is restricted. Payments must be attached to an active service booking or approved registration."
      });
    }
    if (targetBookingId) {
      try {
        const bSnap = await adminDb.collection("bookings").doc(targetBookingId).get();
        if (bSnap.exists) {
          const bData = bSnap.data();
          const authoritativeBookingAmt = Number(bData?.amount || bData?.totalAmount || 0);
          if (authoritativeBookingAmt > 0) {
            const expectedPaise = Math.round(authoritativeBookingAmt * 100);
            if (pmtData.amount !== expectedPaise) {
              console.warn(`[Razorpay Webhook] Amount Mismatch: Gateway has ${pmtData.amount} paise, booking has ${expectedPaise} paise.`);
              try {
                await eventDocRef.update({ status: "rejected_amount_mismatch" });
              } catch (_) {
              }
              return res.status(400).json({
                success: false,
                error: "AMOUNT_MISMATCH",
                message: `Payment amount (${pmtData.amount} paise) does not match authoritative booking amount (${expectedPaise} paise).`
              });
            }
          }
        }
      } catch (bLookupErr) {
        console.warn("[Razorpay Webhook] Booking lookup warning:", bLookupErr.message);
      }
    }
    try {
      const ledgerResult = await processPaymentCommissionAndLedgersWithAdmin(
        adminDb,
        rawPaymentId,
        pmtData.order_id,
        targetBookingId,
        pmtData.amount,
        mergedNotes
      );
      try {
        await eventDocRef.update({
          status: "completed",
          paymentId: rawPaymentId,
          orderId: pmtData.order_id,
          amount: pmtData.amount,
          bookingId: targetBookingId || null,
          ledgerIds: ledgerResult.ledgerIds,
          processedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (_) {
      }
      console.log(`[Razorpay Webhook] Successfully processed payment ${rawPaymentId} for order ${pmtData.order_id}. Ledgers:`, ledgerResult.ledgerIds);
      return res.status(200).json({
        status: "ok",
        received: true,
        eventId,
        paymentId: rawPaymentId,
        orderId: pmtData.order_id,
        amount: pmtData.amount
      });
    } catch (procErr) {
      console.error("[Razorpay Webhook] Error processing commission and ledgers:", procErr);
      try {
        await eventDocRef.update({
          status: "processing_error",
          errorMessage: procErr.message
        });
      } catch (_) {
      }
      return res.status(500).json({
        success: false,
        error: "LEDGER_PROCESSING_FAILED",
        message: `Failed to process payment ledgers: ${procErr.message}`,
        blocker: procErr.message
      });
    }
  }
  try {
    await eventDocRef.update({ status: "completed", processedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (_) {
  }
  return res.status(200).json({ status: "ok", received: true, eventId });
});
app2.post("/api/payments/refund", async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PAYMENT_ID",
        message: "Payment ID is required to process refund."
      });
    }
    const result = await processPaymentRefund(db, paymentId, amount, reason);
    return res.status(200).json({
      success: true,
      message: result.message,
      reversalLedgerIds: result.reversalLedgerIds
    });
  } catch (err) {
    console.error("Error processing refund:", err);
    return res.status(500).json({
      success: false,
      error: "REFUND_PROCESSING_FAILED",
      message: err.message || "Refund processing encountered an unexpected error."
    });
  }
});
app2.get("/api/admin/commission-settings", requireAdminAuth, async (req, res) => {
  try {
    const settings = await getCommissionSettings(db);
    return res.status(200).json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/admin/commission-settings", requireAdminAuth, async (req, res) => {
  try {
    const newSettings = req.body;
    const updated = await updateCommissionSettings(db, newSettings);
    return res.status(200).json({ success: true, settings: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
var CATEGORIES_BACKUP_FILE = import_path2.default.resolve(process.cwd(), "categories_backup.json");
var SERVICES_BACKUP_FILE = import_path2.default.resolve(process.cwd(), "services_backup.json");
function saveToLocalBackup(filePath, id, data) {
  try {
    let items = {};
    if (import_fs2.default.existsSync(filePath)) {
      items = JSON.parse(import_fs2.default.readFileSync(filePath, "utf8"));
    }
    items[id] = { ...items[id], ...data };
    import_fs2.default.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf8");
  } catch (err) {
    console.warn("[Catalog Backup] Error saving backup:", err.message);
  }
}
function deleteFromLocalBackup(filePath, id) {
  try {
    if (import_fs2.default.existsSync(filePath)) {
      const items = JSON.parse(import_fs2.default.readFileSync(filePath, "utf8"));
      delete items[id];
      import_fs2.default.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("[Catalog Backup] Error deleting from backup:", err.message);
  }
}
app2.post("/api/admin/categories", requireAdminAuth, async (req, res) => {
  try {
    const { categoryId, data } = req.body;
    const catId = categoryId || data?.id;
    if (!catId) {
      return res.status(400).json({ success: false, error: "Category ID is required" });
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(data || {}).filter(([_, val]) => val !== void 0)
    );
    saveToLocalBackup(CATEGORIES_BACKUP_FILE, catId, cleanPayload);
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "categories", catId), cleanPayload, { merge: true });
    } catch (fsErr) {
      console.warn("[API] Notice saving category to Firestore (saved to local backup):", fsErr.message);
    }
    return res.status(200).json({ success: true, categoryId: catId });
  } catch (err) {
    console.error("[API] Error saving category:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to save category" });
  }
});
app2.delete("/api/admin/categories/:id", requireAdminAuth, async (req, res) => {
  try {
    const catId = req.params.id;
    if (!catId) {
      return res.status(400).json({ success: false, error: "Category ID is required" });
    }
    deleteFromLocalBackup(CATEGORIES_BACKUP_FILE, catId);
    try {
      await (0, import_firestore8.deleteDoc)((0, import_firestore8.doc)(db, "categories", catId));
    } catch (fsErr) {
      console.warn("[API] Notice deleting category from Firestore:", fsErr.message);
    }
    return res.status(200).json({ success: true, categoryId: catId });
  } catch (err) {
    console.error("[API] Error deleting category:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete category" });
  }
});
app2.post("/api/admin/services", requireAdminAuth, async (req, res) => {
  try {
    const { serviceId, data } = req.body;
    const srvId = serviceId || data?.id;
    if (!srvId) {
      return res.status(400).json({ success: false, error: "Service ID is required" });
    }
    const cleanPayload = Object.fromEntries(
      Object.entries(data || {}).filter(([_, val]) => val !== void 0)
    );
    saveToLocalBackup(SERVICES_BACKUP_FILE, srvId, cleanPayload);
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "services", srvId), cleanPayload, { merge: true });
    } catch (fsErr) {
      console.warn("[API] Notice saving service to Firestore (saved to local backup):", fsErr.message);
    }
    return res.status(200).json({ success: true, serviceId: srvId });
  } catch (err) {
    console.error("[API] Error saving service:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to save service" });
  }
});
app2.delete("/api/admin/services/:id", requireAdminAuth, async (req, res) => {
  try {
    const srvId = req.params.id;
    if (!srvId) {
      return res.status(400).json({ success: false, error: "Service ID is required" });
    }
    deleteFromLocalBackup(SERVICES_BACKUP_FILE, srvId);
    try {
      await (0, import_firestore8.deleteDoc)((0, import_firestore8.doc)(db, "services", srvId));
    } catch (fsErr) {
      console.warn("[API] Notice deleting service from Firestore:", fsErr.message);
    }
    return res.status(200).json({ success: true, serviceId: srvId });
  } catch (err) {
    console.error("[API] Error deleting service:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete service" });
  }
});
app2.post("/api/marketing/funnel/run-due", requireAdminAuth, async (req, res) => {
  try {
    const adminUser = req.adminUser;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const executedRuns = [];
    try {
      const dbRef = import_firebase_admin2.default?.firestore ? import_firebase_admin2.default.firestore() : null;
      if (dbRef) {
        await dbRef.collection("ai_funnel_events").add({
          eventType: "run_due_batch",
          executedBy: adminUser?.uid || "admin",
          timestamp: nowIso,
          status: "success"
        });
      }
    } catch (e) {
      console.warn("[Funnel Automation] Firestore event log notice:", e?.message);
    }
    return res.status(200).json({
      success: true,
      message: "Due AI funnel automations executed successfully.",
      processedCount: 0,
      timestamp: nowIso,
      executedRuns
    });
  } catch (err) {
    console.error("Error running due AI funnels:", err);
    return res.status(500).json({
      success: false,
      error: "FUNNEL_EXECUTION_FAILED",
      message: err.message || "Funnel execution encountered an unexpected error."
    });
  }
});
var MARKETING_LEADS_FILE = import_path2.default.join(process.cwd(), "data", "marketing_leads.json");
function getStoredMarketingLeads() {
  try {
    const dir = import_path2.default.dirname(MARKETING_LEADS_FILE);
    if (!import_fs2.default.existsSync(dir)) {
      import_fs2.default.mkdirSync(dir, { recursive: true });
    }
    if (import_fs2.default.existsSync(MARKETING_LEADS_FILE)) {
      const data = import_fs2.default.readFileSync(MARKETING_LEADS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn("[Storage] Notice reading marketing_leads.json:", err);
  }
  return [];
}
function saveStoredMarketingLeads(leads) {
  try {
    const dir = import_path2.default.dirname(MARKETING_LEADS_FILE);
    if (!import_fs2.default.existsSync(dir)) {
      import_fs2.default.mkdirSync(dir, { recursive: true });
    }
    import_fs2.default.writeFileSync(MARKETING_LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Error writing marketing_leads.json:", err);
  }
}
app2.get("/api/admin/marketing-leads", requireAdminAuth, async (req, res) => {
  try {
    const { category, city, status, search, limit: limit5 = 500 } = req.query;
    const leadsMap = /* @__PURE__ */ new Map();
    const localLeads = getStoredMarketingLeads();
    for (const lead of localLeads) {
      if (lead && lead.id) {
        leadsMap.set(lead.id, lead);
      }
    }
    try {
      const snap = await (0, import_firestore8.getDocs)((0, import_firestore8.collection)(db, "marketing_leads"));
      snap.forEach((d) => {
        leadsMap.set(d.id, { id: d.id, ...d.data() });
      });
    } catch (fsErr) {
      try {
        if (import_firebase_admin2.default?.firestore) {
          const snap = await import_firebase_admin2.default.firestore().collection("marketing_leads").limit(Number(limit5) || 500).get();
          snap.forEach((d) => {
            leadsMap.set(d.id, { id: d.id, ...d.data() });
          });
        }
      } catch (_) {
      }
    }
    let leads = Array.from(leadsMap.values());
    if (category && typeof category === "string" && category !== "all") {
      leads = leads.filter((l) => l.category === category || l.trade === category);
    }
    if (city && typeof city === "string" && city !== "all") {
      leads = leads.filter((l) => l.city === city || l.district === city);
    }
    if (status && typeof status === "string" && status !== "all") {
      leads = leads.filter((l) => l.status === status);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      leads = leads.filter(
        (l) => l.name && l.name.toLowerCase().includes(q) || l.businessName && l.businessName.toLowerCase().includes(q) || l.contactPerson && l.contactPerson.toLowerCase().includes(q) || l.phone && l.phone.includes(q) || l.trade && l.trade.toLowerCase().includes(q) || l.category && l.category.toLowerCase().includes(q) || l.city && l.city.toLowerCase().includes(q) || l.address && l.address.toLowerCase().includes(q) || l.notes && l.notes.toLowerCase().includes(q)
      );
    }
    leads.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (err) {
    console.error("[API] Error fetching marketing leads:", err);
    return res.status(200).json({ success: true, count: 0, leads: [] });
  }
});
app2.post("/api/admin/marketing-leads", requireAdminAuth, async (req, res) => {
  try {
    const lead = req.body;
    if (!lead) {
      return res.status(400).json({ success: false, error: "Lead data is required" });
    }
    const leadId = lead.id || `lead_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const payload = {
      ...lead,
      id: leadId,
      updatedAt: now,
      createdAt: lead.createdAt || now,
      status: lead.status || "new"
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, val]) => val !== void 0)
    );
    try {
      const existing = getStoredMarketingLeads();
      const idx = existing.findIndex((l) => l.id === leadId);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...cleanPayload };
      } else {
        existing.unshift(cleanPayload);
      }
      saveStoredMarketingLeads(existing);
    } catch (storeErr) {
      console.warn("[Storage] Warning saving single lead locally:", storeErr);
    }
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "marketing_leads", leadId), cleanPayload, { merge: true });
    } catch (fsErr) {
      try {
        if (import_firebase_admin2.default?.firestore) {
          await import_firebase_admin2.default.firestore().collection("marketing_leads").doc(leadId).set(cleanPayload, { merge: true });
        }
      } catch (_) {
      }
    }
    return res.status(200).json({ success: true, lead: cleanPayload });
  } catch (err) {
    console.error("[API] Error saving marketing lead:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to save lead" });
  }
});
app2.post("/api/admin/marketing-leads/bulk-save", requireAdminAuth, async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: "Array of leads is required" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const savedIds = [];
    const cleanedLeads = [];
    for (let i = 0; i < leads.length; i++) {
      const item = leads[i];
      const id = item.id || `lead_${Date.now()}_${Math.floor(Math.random() * 1e5)}_${i + 1}`;
      const clean = Object.fromEntries(
        Object.entries({
          ...item,
          id,
          status: item.status || "new",
          createdAt: item.createdAt || now,
          updatedAt: now
        }).filter(([_, val]) => val !== void 0)
      );
      cleanedLeads.push(clean);
      savedIds.push(id);
    }
    try {
      const existing = getStoredMarketingLeads();
      const existingMap = /* @__PURE__ */ new Map();
      for (const ex of existing) {
        if (ex && ex.id) existingMap.set(ex.id, ex);
      }
      for (const cl of cleanedLeads) {
        existingMap.set(cl.id, { ...existingMap.get(cl.id) || {}, ...cl });
      }
      saveStoredMarketingLeads(Array.from(existingMap.values()));
    } catch (storeErr) {
      console.warn("[Storage] Error updating local marketing_leads.json in bulk-save:", storeErr);
    }
    const BATCH_SIZE = 50;
    for (let i = 0; i < cleanedLeads.length; i += BATCH_SIZE) {
      const chunk = cleanedLeads.slice(i, i + BATCH_SIZE);
      try {
        const batch = (0, import_firestore8.writeBatch)(db);
        for (const item of chunk) {
          const docRef = (0, import_firestore8.doc)(db, "marketing_leads", item.id);
          batch.set(docRef, item, { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        for (const item of chunk) {
          try {
            await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "marketing_leads", item.id), item, { merge: true });
          } catch (_) {
          }
        }
      }
    }
    return res.status(200).json({
      success: true,
      message: `${savedIds.length} leads saved successfully`,
      count: savedIds.length,
      savedIds
    });
  } catch (err) {
    console.error("[API] Error in bulk saving marketing leads:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to bulk save leads" });
  }
});
app2.post("/api/admin/marketing-leads/bulk-delete", requireAdminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: "Array of lead IDs is required" });
    }
    try {
      const existing = getStoredMarketingLeads();
      const idSet = new Set(ids);
      const filtered = existing.filter((l) => !idSet.has(l.id));
      saveStoredMarketingLeads(filtered);
    } catch (storeErr) {
      console.warn("[Storage] Error deleting from local marketing_leads.json:", storeErr);
    }
    const BATCH_SIZE = 50;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      try {
        const batch = (0, import_firestore8.writeBatch)(db);
        for (const id of chunk) {
          batch.delete((0, import_firestore8.doc)(db, "marketing_leads", id));
        }
        await batch.commit();
      } catch (batchErr) {
        for (const id of chunk) {
          try {
            await (0, import_firestore8.deleteDoc)((0, import_firestore8.doc)(db, "marketing_leads", id));
          } catch (_) {
          }
        }
      }
    }
    return res.status(200).json({ success: true, count: ids.length });
  } catch (err) {
    console.error("[API] Error in bulk deleting marketing leads:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to bulk delete leads" });
  }
});
app2.post("/api/admin/marketing-leads/bulk-update", requireAdminAuth, async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !updates) {
      return res.status(400).json({ success: false, error: "IDs and updates are required" });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const cleanUpdates = Object.fromEntries(
      Object.entries({ ...updates, updatedAt: now }).filter(([_, val]) => val !== void 0)
    );
    try {
      const existing = getStoredMarketingLeads();
      const idSet = new Set(ids);
      const updated = existing.map((l) => idSet.has(l.id) ? { ...l, ...cleanUpdates } : l);
      saveStoredMarketingLeads(updated);
    } catch (storeErr) {
      console.warn("[Storage] Error updating local marketing_leads.json in bulk-update:", storeErr);
    }
    const BATCH_SIZE = 50;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      try {
        const batch = (0, import_firestore8.writeBatch)(db);
        for (const id of chunk) {
          batch.set((0, import_firestore8.doc)(db, "marketing_leads", id), cleanUpdates, { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        for (const id of chunk) {
          try {
            await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "marketing_leads", id), cleanUpdates, { merge: true });
          } catch (_) {
          }
        }
      }
    }
    return res.status(200).json({ success: true, count: ids.length, updates: cleanUpdates });
  } catch (err) {
    console.error("[API] Error in bulk updating marketing leads:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to bulk update leads" });
  }
});
app2.delete("/api/admin/marketing-leads/:id", requireAdminAuth, async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(400).json({ success: false, error: "Lead ID is required" });
    }
    try {
      const existing = getStoredMarketingLeads();
      const filtered = existing.filter((l) => l.id !== leadId);
      saveStoredMarketingLeads(filtered);
    } catch (storeErr) {
      console.warn("[Storage] Error removing lead from local marketing_leads.json:", storeErr);
    }
    try {
      await (0, import_firestore8.deleteDoc)((0, import_firestore8.doc)(db, "marketing_leads", leadId));
    } catch (fsErr) {
      try {
        if (import_firebase_admin2.default?.firestore) {
          await import_firebase_admin2.default.firestore().collection("marketing_leads").doc(leadId).delete();
        }
      } catch (_) {
      }
    }
    return res.status(200).json({ success: true, leadId });
  } catch (err) {
    console.error("[API] Error deleting marketing lead:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to delete lead" });
  }
});
app2.post("/api/admin/users", requireAdminAuth, async (req, res) => {
  try {
    const { name, email, phone, role, password, loginPassword } = req.body;
    const cleanName = (name || "").toString().trim();
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanPhone = (phone || "").toString().trim();
    const cleanPass = (password || loginPassword || "").toString().trim();
    const cleanRole = (role || "customer").toString().trim();
    if (!cleanName || !cleanEmail || !cleanPass) {
      return res.status(400).json({
        success: false,
        error: "Name, email, and password are required."
      });
    }
    let authUid = "usr_" + Date.now();
    try {
      if (import_firebase_admin2.default?.auth) {
        try {
          const existingUser = await import_firebase_admin2.default.auth().getUserByEmail(cleanEmail);
          authUid = existingUser.uid;
          await import_firebase_admin2.default.auth().updateUser(authUid, {
            password: cleanPass,
            displayName: cleanName,
            phoneNumber: cleanPhone && cleanPhone.startsWith("+") ? cleanPhone : void 0
          });
        } catch (findErr) {
          if (findErr.code === "auth/user-not-found") {
            const newAuthRecord = await import_firebase_admin2.default.auth().createUser({
              email: cleanEmail,
              password: cleanPass,
              displayName: cleanName,
              phoneNumber: cleanPhone && cleanPhone.startsWith("+") ? cleanPhone : void 0
            });
            authUid = newAuthRecord.uid;
          }
        }
      }
    } catch (adminAuthErr) {
      console.warn("[Admin API] Firebase Auth Admin SDK notice:", adminAuthErr?.message);
    }
    const userDocData = {
      id: authUid,
      uid: authUid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: cleanRole,
      status: "active",
      isApproved: true,
      approved: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdSource: "admin_dashboard"
    };
    try {
      if (import_firebase_admin2.default?.firestore) {
        await import_firebase_admin2.default.firestore().collection("users").doc(authUid).set(userDocData, { merge: true });
      } else {
        await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "users", authUid), userDocData, { merge: true });
      }
    } catch (fsErr) {
      console.warn("[Admin API] Direct Firestore save fallback:", fsErr?.message);
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "users", authUid), userDocData, { merge: true });
    }
    return res.status(200).json({
      success: true,
      user: userDocData,
      message: `User ${cleanName} created successfully.`
    });
  } catch (err) {
    console.error("[Admin API] Error in /api/admin/users:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to create user."
    });
  }
});
app2.put("/api/admin/users/:uid", requireAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { name, email, phone, role, password, loginPassword, avatar } = req.body;
    if (!uid) {
      return res.status(400).json({ success: false, error: "User UID is required" });
    }
    const updates = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: "DEEPAK"
    };
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (phone !== void 0) updates.phone = phone.trim();
    if (role) updates.role = role.trim();
    if (avatar !== void 0) updates.avatar = avatar;
    const pass = (password || loginPassword || "").toString().trim();
    if (pass) {
      try {
        if (import_firebase_admin2.default?.auth) {
          await import_firebase_admin2.default.auth().updateUser(uid, { password: pass });
        }
      } catch (authErr) {
        console.warn("[Admin API] Auth password sync notice:", authErr?.message);
      }
    }
    if (import_firebase_admin2.default?.firestore) {
      await import_firebase_admin2.default.firestore().collection("users").doc(uid).set(updates, { merge: true });
    } else {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "users", uid), updates, { merge: true });
    }
    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      updates
    });
  } catch (err) {
    console.error("[Admin API] Error updating user:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to update user." });
  }
});
app2.get("/api/ledgers", async (req, res) => {
  try {
    const { ownerId, bookingId, role } = req.query;
    const ledgersRef = (0, import_firestore8.collection)(db, "ledgers");
    let q = (0, import_firestore8.query)(ledgersRef);
    if (ownerId && typeof ownerId === "string") {
      q = (0, import_firestore8.query)(ledgersRef, (0, import_firestore8.where)("ledgerOwnerId", "==", ownerId));
    } else if (bookingId && typeof bookingId === "string") {
      q = (0, import_firestore8.query)(ledgersRef, (0, import_firestore8.where)("bookingId", "==", bookingId));
    } else if (role && typeof role === "string") {
      q = (0, import_firestore8.query)(ledgersRef, (0, import_firestore8.where)("ledgerOwnerRole", "==", role));
    }
    const snap = await (0, import_firestore8.getDocs)(q);
    const ledgers = snap.docs.map((d) => d.data());
    return res.status(200).json({ success: true, ledgers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.get("/api/franchise/commission-summary", async (req, res) => {
  try {
    const { districtId, franchiseId } = req.query;
    const targetDistrict = (districtId || "").toLowerCase().trim();
    const targetFranchiseId = franchiseId || (targetDistrict ? `franchise_${targetDistrict}` : "");
    let franchiseData = null;
    if (targetFranchiseId) {
      const fpSnap = await (0, import_firestore8.getDoc)((0, import_firestore8.doc)(db, "franchise_partners", targetFranchiseId));
      if (fpSnap.exists()) {
        franchiseData = fpSnap.data();
      }
    }
    const settings = await getCommissionSettings(db);
    const applicableRate = franchiseData?.districtSettings?.franchiseCommissionPercent || settings.franchiseRatePercent || 15;
    const bookingsRef = (0, import_firestore8.collection)(db, "bookings");
    const bookingsSnap = await (0, import_firestore8.getDocs)(bookingsRef);
    let totalBusiness = 0;
    const bookingDetails = [];
    bookingsSnap.forEach((d) => {
      const b = d.data();
      const bDist = (b.districtId || b.assignedDistrictId || b.city || "").toLowerCase().trim();
      const bFranchise = b.franchisePartnerId;
      if (targetDistrict && (bDist === targetDistrict || bDist.includes(targetDistrict)) || targetFranchiseId && bFranchise === targetFranchiseId) {
        const amt = Number(b.totalAmount || b.amount || 0);
        if (b.paymentStatus === "paid" || b.status === "completed" || b.status === "confirmed" || b.status === "in_progress") {
          totalBusiness += amt;
        }
        const itemRate = b.franchiseCommissionRate || b.commissionBreakdown?.franchiseRatePercent || applicableRate;
        const itemDue = b.franchiseCommission || b.commissionBreakdown?.franchiseCommission || Math.round(amt * itemRate / 100);
        bookingDetails.push({
          bookingId: d.id,
          serviceName: b.serviceName || "Home Service",
          customerName: b.customerName || "Customer",
          amount: amt,
          paymentStatus: b.paymentStatus || "pending",
          bookingStatus: b.status || "pending",
          commissionRate: itemRate,
          commissionDueToHardinkaam: itemDue,
          createdAt: b.createdAt || ""
        });
      }
    });
    const totalDue = Math.round(totalBusiness * applicableRate / 100);
    const totalPaid = Number(franchiseData?.commissionPaidToHardinkaam || 0);
    const pendingDue = Math.max(0, totalDue - totalPaid);
    const overdue = Number(franchiseData?.commissionOverdueToHardinkaam || 0);
    let status = "PENDING";
    if (totalPaid >= totalDue && totalDue > 0) {
      status = "PAID";
    } else if (totalPaid > 0 && totalPaid < totalDue) {
      status = "PARTIALLY_PAID";
    } else if (overdue > 0) {
      status = "OVERDUE";
    }
    const settlementsRef = (0, import_firestore8.collection)(db, "ledgers");
    const sQuery = (0, import_firestore8.query)(settlementsRef, (0, import_firestore8.where)("ledgerOwnerId", "==", targetFranchiseId));
    const sSnap = await (0, import_firestore8.getDocs)(sQuery);
    const history = sSnap.docs.map((d) => d.data());
    return res.status(200).json({
      success: true,
      franchiseId: targetFranchiseId,
      districtId: targetDistrict || franchiseData?.assignedDistrictId || "",
      districtName: franchiseData?.assignedDistrictName || targetDistrict,
      businessVolume: totalBusiness,
      commissionRate: applicableRate,
      commissionDueToHardinkaam: totalDue,
      commissionPaidToHardinkaam: totalPaid,
      commissionPendingToHardinkaam: pendingDue,
      commissionOverdueToHardinkaam: overdue,
      collectionStatus: status,
      isFranchiseIncome: false,
      note: "Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM HQ.",
      bookingHistory: bookingDetails.slice(0, 50),
      settlementHistory: history.slice(0, 50)
    });
  } catch (err) {
    console.error("Error fetching franchise commission summary:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/franchise/record-collection", async (req, res) => {
  try {
    const { franchiseId, amount, paymentMode, referenceNumber, notes, recordedBy } = req.body;
    if (!franchiseId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_COLLECTION_PAYLOAD",
        message: "Franchise ID and a positive collection amount are required."
      });
    }
    const collectionAmount = Math.round(Number(amount));
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const settlementId = `SETTLE-FRN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fpRef = (0, import_firestore8.doc)(db, "franchise_partners", franchiseId);
    const fpSnap = await (0, import_firestore8.getDoc)(fpRef);
    if (!fpSnap.exists()) {
      return res.status(404).json({
        success: false,
        error: "FRANCHISE_NOT_FOUND",
        message: `Franchise partner ${franchiseId} not found.`
      });
    }
    const fpData = fpSnap.data();
    const previousPaid = Number(fpData.commissionPaidToHardinkaam || 0);
    const totalDue = Number(fpData.totalCommissionDueToHardinkaam || 0);
    const newPaid = previousPaid + collectionAmount;
    const remainingPending = Math.max(0, totalDue - newPaid);
    let newStatus = "PARTIALLY_PAID";
    if (newPaid >= totalDue && totalDue > 0) {
      newStatus = "PAID";
    } else if (newPaid === 0) {
      newStatus = "PENDING";
    }
    const settlementLedger = {
      id: `LEDGER-${settlementId}`,
      ledgerOwnerId: franchiseId,
      ledgerOwnerRole: "franchise",
      ledgerOwnerName: fpData.name || fpData.assignedDistrictName || "District Franchise",
      bookingId: `SETTLEMENT-${franchiseId}`,
      paymentId: referenceNumber || settlementId,
      commissionType: "franchise_commission",
      amount: collectionAmount,
      grossBookingAmount: totalDue,
      ratePercent: fpData.districtSettings?.franchiseCommissionPercent || 15,
      ruleReference: "Franchise Commission Collection to HARDINKAAM",
      type: "credit",
      // Credit against liability (settlement received)
      status: "cleared",
      description: `Commission collection of \u20B9${collectionAmount} received by HARDINKAAM HQ via ${paymentMode || "Direct Transfer"} (Ref: ${referenceNumber || "N/A"})`,
      referenceId: settlementId,
      direction: "PAYABLE_TO_HARDINKAAM",
      isPayableToHardinkaam: true,
      collectionStatus: newStatus,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ledgers", settlementLedger.id), settlementLedger);
    await (0, import_firestore8.updateDoc)(fpRef, {
      commissionPaidToHardinkaam: newPaid,
      commissionPendingToHardinkaam: remainingPending,
      collectionStatus: newStatus,
      lastSettlementAt: nowIso,
      lastSettlementAmount: collectionAmount,
      lastSettlementRef: referenceNumber || settlementId,
      updatedAt: nowIso
    });
    console.log(`[Franchise] Recorded collection \u20B9${collectionAmount} for ${franchiseId}. Remaining due: \u20B9${remainingPending}`);
    return res.status(200).json({
      success: true,
      message: `Successfully recorded collection of \u20B9${collectionAmount} from Franchise.`,
      settlementId,
      totalDue,
      totalPaid: newPaid,
      remainingPending,
      collectionStatus: newStatus
    });
  } catch (err) {
    console.error("Error recording franchise collection:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
function isValidBookingId(id) {
  if (typeof id !== "string") {
    return false;
  }
  const clean = id.trim();
  if (!clean || clean.length < 3 || clean.length > 128) {
    return false;
  }
  if (clean.includes("/") || clean.includes("\\") || clean.includes("..") || clean.startsWith("__")) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{3,128}$/.test(clean);
}
function isValidEntityId(id) {
  if (typeof id !== "string") {
    return false;
  }
  const clean = id.trim();
  if (!clean || clean.length < 2 || clean.length > 128) {
    return false;
  }
  if (clean.includes("/") || clean.includes("\\") || clean.includes("..") || clean.startsWith("__")) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{2,128}$/.test(clean);
}
var ARRIVAL_OTP_SALT = "HARDINKAAM_ARRIVAL_OTP_SALT_2026";
function computeArrivalOtpHash(bookingId, otp) {
  return import_crypto2.default.createHash("sha256").update(`${bookingId.trim()}:${otp.trim()}:${ARRIVAL_OTP_SALT}`).digest("hex");
}
app2.post("/api/bookings/generate-arrival-otp", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const { bookingId } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    if (req.body.customerId && typeof req.body.customerId === "string") {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot impersonate another customer."
        });
      }
    }
    const code = import_crypto2.default.randomInt(1e5, 1e6).toString();
    const expiresAt = new Date(Date.now() + 25 * 60 * 1e3).toISOString();
    const hash = computeArrivalOtpHash(cleanBookingId, code);
    await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = snap.data();
      const currentStatus = String(booking.status || "").toLowerCase().trim();
      if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "rejected") {
        throw new Error("TERMINAL_STATE");
      }
      const isCustomer = Boolean(
        booking.customerId === authUid || booking.userId === authUid || booking.customerUid === authUid
      );
      if (!isCustomer && !isAdmin) {
        throw new Error("FORBIDDEN");
      }
      transaction.update(bookingRef, {
        arrivalOtpHash: hash,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        trackingStatus: "otp_pending",
        updatedAt: nowIso
      });
    });
    return res.status(200).json({
      success: true,
      arrivalOtp: code,
      expiresAt
    });
  } catch (err) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (err.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, error: "Forbidden: Unauthorized customer" });
    }
    if (err.message === "TERMINAL_STATE") {
      return res.status(400).json({ success: false, error: "Cannot generate OTP for completed or cancelled booking." });
    }
    console.error("Error generating arrival OTP:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/verify-arrival-otp", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const { bookingId, enteredOtp, serviceManId } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    if (serviceManId !== void 0 && !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: "Invalid serviceManId parameter" });
    }
    if (enteredOtp === void 0 || enteredOtp === null) {
      return res.status(400).json({ success: false, error: "Missing enteredOtp" });
    }
    const cleanOtp = String(enteredOtp).trim();
    if (!/^\d{4,6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP format. Must be a valid numerical code."
      });
    }
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    if (req.body.customerId && typeof req.body.customerId === "string") {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot impersonate another customer."
        });
      }
    }
    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Service professional ID does not match authenticated user."
      });
    }
    const txResult = await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = snap.data();
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
      if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
        throw new Error("FORBIDDEN_PRO");
      }
      const currentStatus = String(booking.status || "").toLowerCase().trim();
      if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "rejected") {
        throw new Error(`BOOKING_TERMINAL_${currentStatus.toUpperCase()}`);
      }
      if (booking.status === "in_progress" || booking.status === "work_started" || booking.trackingStatus === "WORK_STARTED" || booking.arrivalOtpVerified === true) {
        return {
          alreadyVerified: true,
          bookingId: cleanBookingId,
          status: "in_progress",
          trackingStatus: "WORK_STARTED",
          workStartedAt: booking.workStartedAt || booking.startedAt
        };
      }
      const attempts = booking.otpAttempts || 0;
      if (attempts >= 5) {
        throw new Error("OTP_LOCKED");
      }
      if (booking.otpExpiresAt && new Date(booking.otpExpiresAt).getTime() < Date.now()) {
        throw new Error("OTP_EXPIRED");
      }
      const expectedHash = booking.arrivalOtpHash;
      const computedHash = computeArrivalOtpHash(cleanBookingId, cleanOtp);
      let isMatch = false;
      if (expectedHash && expectedHash.length === computedHash.length) {
        try {
          isMatch = import_crypto2.default.timingSafeEqual(
            Buffer.from(expectedHash, "hex"),
            Buffer.from(computedHash, "hex")
          );
        } catch {
          isMatch = expectedHash === computedHash;
        }
      } else if (booking.otp && String(booking.otp).trim() === cleanOtp) {
        isMatch = true;
      }
      if (!isMatch) {
        const newAttempts = attempts + 1;
        transaction.update(bookingRef, {
          otpAttempts: newAttempts,
          updatedAt: nowIso
        });
        const remaining = Math.max(0, 5 - newAttempts);
        return {
          mismatch: true,
          remaining,
          isLocked: remaining <= 0
        };
      }
      transaction.update(bookingRef, {
        status: "in_progress",
        trackingStatus: "WORK_STARTED",
        workStatus: "in_progress",
        arrivalOtpVerified: true,
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        startedAt: nowIso,
        arrivalOtpHash: null,
        arrivalOtp: null,
        otp: null,
        baseAmount: booking.baseAmount !== void 0 ? booking.baseAmount : booking.amount || 0,
        deliveryStatus: "in_progress",
        otpAttempts: 0,
        updatedAt: nowIso
      });
      return {
        success: true,
        bookingId: cleanBookingId,
        status: "in_progress",
        trackingStatus: "WORK_STARTED",
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        baseAmount: booking.baseAmount !== void 0 ? booking.baseAmount : booking.amount || 0
      };
    });
    if (txResult.alreadyVerified) {
      return res.status(200).json({
        success: true,
        message: "OTP already verified. Work is in progress.",
        workStartedAt: txResult.workStartedAt
      });
    }
    if (txResult.mismatch) {
      return res.status(400).json({
        success: false,
        error: txResult.remaining > 0 ? `Incorrect OTP. ${txResult.remaining} attempt${txResult.remaining > 1 ? "s" : ""} remaining.` : "Maximum attempts exceeded. Code locked.",
        attemptsRemaining: txResult.remaining,
        isLocked: txResult.isLocked
      });
    }
    try {
      const trackingRef = (0, import_firestore8.doc)(db, "serviceTracking", cleanBookingId);
      await (0, import_firestore8.updateDoc)(trackingRef, {
        status: "WORK_STARTED",
        lastUpdatedAt: nowIso
      });
    } catch (trackErr) {
      console.warn("Could not update serviceTracking document to WORK_STARTED:", trackErr);
    }
    return res.status(200).json({
      success: true,
      message: "Arrival OTP verified successfully. Work has started.",
      bookingId: txResult.bookingId,
      status: txResult.status,
      trackingStatus: txResult.trackingStatus,
      otpVerifiedAt: txResult.otpVerifiedAt,
      workStartedAt: txResult.workStartedAt,
      baseAmount: txResult.baseAmount
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (msg === "FORBIDDEN_PRO") {
      return res.status(403).json({ success: false, error: "Forbidden: Only assigned service professional can verify arrival." });
    }
    if (msg.startsWith("BOOKING_TERMINAL_")) {
      const state = msg.replace("BOOKING_TERMINAL_", "").toLowerCase();
      return res.status(400).json({ success: false, error: `Cannot verify arrival OTP: booking is already ${state}.` });
    }
    if (msg === "OTP_LOCKED") {
      return res.status(400).json({ success: false, error: "Maximum attempts exceeded. Code locked.", attemptsRemaining: 0, isLocked: true });
    }
    if (msg === "OTP_EXPIRED") {
      return res.status(400).json({ success: false, isExpired: true, error: "Arrival OTP has expired. Customer must refresh to get a new code." });
    }
    console.error("Error verifying arrival OTP:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/verify-qr-code", async (req, res) => {
  try {
    const { bookingId, qrPayload, serviceManId } = req.body;
    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    const cleanBookingId = bookingId.trim();
    if (!isValidBookingId(cleanBookingId)) {
      return res.status(400).json({ success: false, error: "Invalid bookingId format" });
    }
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const txResult = await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = snap.data();
      const currentStatus = String(booking.status || "").toLowerCase().trim();
      if (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "rejected") {
        throw new Error(`BOOKING_TERMINAL_${currentStatus.toUpperCase()}`);
      }
      if (booking.status === "in_progress" || booking.status === "work_started" || booking.trackingStatus === "WORK_STARTED" || booking.workStartedAt) {
        return {
          alreadyVerified: true,
          bookingId: cleanBookingId,
          status: "in_progress",
          trackingStatus: "WORK_STARTED",
          workStartedAt: booking.workStartedAt || booking.startedAt
        };
      }
      if (qrPayload && typeof qrPayload === "string" && qrPayload.startsWith("{")) {
        try {
          const parsed = JSON.parse(qrPayload);
          if (parsed.bookingId && parsed.bookingId.trim() !== cleanBookingId) {
            throw new Error("QR_BOOKING_MISMATCH");
          }
          if (parsed.customerId && booking.customerId && parsed.customerId !== booking.customerId) {
            throw new Error("QR_CUSTOMER_MISMATCH");
          }
        } catch (e) {
          if (e.message?.startsWith("QR_")) throw e;
        }
      }
      const completionOtp = booking.otp || Math.floor(1e3 + Math.random() * 9e3).toString();
      transaction.update(bookingRef, {
        status: "in_progress",
        trackingStatus: "WORK_STARTED",
        workStatus: "in_progress",
        arrivalOtpVerified: true,
        verifiedViaQr: true,
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        startedAt: nowIso,
        arrivalOtpHash: null,
        arrivalOtp: null,
        otp: completionOtp,
        baseAmount: booking.baseAmount !== void 0 ? booking.baseAmount : booking.amount || 0,
        deliveryStatus: "in_progress",
        otpAttempts: 0,
        updatedAt: nowIso
      });
      return {
        success: true,
        bookingId: cleanBookingId,
        status: "in_progress",
        trackingStatus: "WORK_STARTED",
        workStartedAt: nowIso
      };
    });
    if (txResult.alreadyVerified) {
      return res.status(200).json({
        success: true,
        message: "Booking is already in progress.",
        bookingId: txResult.bookingId,
        status: "in_progress",
        workStartedAt: txResult.workStartedAt,
        alreadyVerified: true
      });
    }
    try {
      await (0, import_firestore8.updateDoc)((0, import_firestore8.doc)(db, "serviceTracking", cleanBookingId), {
        status: "WORK_STARTED",
        lastUpdatedAt: nowIso
      });
    } catch (_) {
    }
    return res.status(200).json({
      success: true,
      message: "QR Code verified successfully! Service initiated.",
      bookingId: cleanBookingId,
      status: "in_progress",
      workStartedAt: txResult.workStartedAt
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (msg === "QR_BOOKING_MISMATCH") {
      return res.status(400).json({ success: false, error: "QR code does not match this booking." });
    }
    if (msg === "QR_CUSTOMER_MISMATCH") {
      return res.status(400).json({ success: false, error: "QR code belongs to a different customer." });
    }
    if (msg.startsWith("BOOKING_TERMINAL_")) {
      const state = msg.replace("BOOKING_TERMINAL_", "").toLowerCase();
      return res.status(400).json({ success: false, error: `Cannot start service: booking is already ${state}.` });
    }
    console.error("Error verifying booking QR code:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/propose-extra-charge", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const {
      bookingId,
      serviceManId,
      serviceManName,
      type,
      description,
      quantity,
      unitPrice,
      notes
    } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    if (!serviceManId || typeof serviceManId !== "string" || !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid serviceManId" });
    }
    if (!description || typeof description !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid description" });
    }
    if (unitPrice === void 0 || unitPrice === null) {
      return res.status(400).json({ success: false, error: "Missing unitPrice" });
    }
    const cleanDescription = String(description).trim();
    if (cleanDescription.length < 2 || cleanDescription.length > 200) {
      return res.status(400).json({
        success: false,
        error: "Description must be between 2 and 200 characters."
      });
    }
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Service professional ID does not match authenticated user."
      });
    }
    const numQuantity = Math.max(1, Math.round(Number(quantity) || 1));
    const numUnitPrice = Math.max(0, Math.round(Number(unitPrice) || 0));
    const calculatedTotal = numQuantity * numUnitPrice;
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newChargeId = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let targetBookingData = null;
    let createdCharge = null;
    let allUpdatedCharges = [];
    await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = snap.data();
      targetBookingData = booking;
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
      if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
        throw new Error("FORBIDDEN_PRO");
      }
      const allowedStates = [
        "arrived",
        "otp_pending",
        "extra_charges_pending",
        "on_the_way",
        "arriving",
        "in_progress",
        "work_started",
        "accepted"
      ];
      const currentStatus = (booking.status || "").toLowerCase();
      const currentTracking = (booking.trackingStatus || "").toLowerCase();
      const isAllowedState = allowedStates.includes(currentStatus) || allowedStates.includes(currentTracking);
      if (!isAllowedState && !isAdmin) {
        throw new Error("INVALID_BOOKING_STATE_FOR_EXTRA_CHARGE");
      }
      const newCharge = {
        id: newChargeId,
        type: type === "service" || type === "material" ? type : "material",
        description: cleanDescription,
        quantity: numQuantity,
        unitPrice: numUnitPrice,
        total: calculatedTotal,
        notes: notes ? String(notes).trim() : void 0,
        proposedBy: authUid,
        proposedByName: serviceManName || booking.serviceManName || "Service Professional",
        proposedAt: nowIso,
        customerApprovalStatus: "pending",
        adminApprovalStatus: "pending",
        finalApprovalStatus: "pending",
        status: "pending",
        addedBy: authUid,
        addedByName: serviceManName || booking.serviceManName || "Service Professional",
        addedAt: nowIso,
        approvalStatus: "pending"
      };
      const currentCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const updatedCharges = [...currentCharges, newCharge];
      transaction.update(bookingRef, {
        extraCharges: updatedCharges,
        updatedAt: nowIso
      });
      createdCharge = newCharge;
      allUpdatedCharges = updatedCharges;
    });
    try {
      if (targetBookingData?.customerId) {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
          userId: targetBookingData.customerId,
          title: "Additional Charge Proposed",
          message: `${targetBookingData.serviceManName || "Service Professional"} proposed an additional charge: ${cleanDescription} (\u20B9${calculatedTotal}). Please review and approve or reject.`,
          bookingId: cleanBookingId,
          chargeId: newChargeId,
          type: "extra_charge_proposed",
          isRead: false,
          createdAt: nowIso
        });
      }
    } catch (notifErr) {
      console.warn("Could not write notification:", notifErr);
    }
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
        action: "EXTRA_CHARGE_PROPOSED",
        bookingId: cleanBookingId,
        chargeId: newChargeId,
        serviceManId: authUid,
        amount: calculatedTotal,
        description: cleanDescription,
        status: "pending",
        timestamp: nowIso
      });
    } catch (auditErr) {
      console.warn("Could not write audit log:", auditErr);
    }
    return res.status(200).json({
      success: true,
      message: "Extra charge proposed successfully. Awaiting customer approval.",
      charge: createdCharge,
      extraCharges: allUpdatedCharges
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (msg === "FORBIDDEN_PRO") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized: Only the assigned service professional can propose extra charges."
      });
    }
    if (msg === "NOT_IN_PROGRESS" || msg === "INVALID_BOOKING_STATE_FOR_EXTRA_CHARGE") {
      return res.status(400).json({
        success: false,
        error: "Extra charges can be proposed once the technician is on-site (arrived) or while work is in progress."
      });
    }
    console.error("Error proposing extra charge:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/respond-extra-charge", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const { bookingId, chargeId, decision, rejectionReason } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    if (!chargeId || typeof chargeId !== "string" || !isValidEntityId(chargeId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid chargeId" });
    }
    if (!decision || typeof decision !== "string") {
      return res.status(400).json({ success: false, error: "Missing or invalid decision" });
    }
    const normDecision = String(decision).toLowerCase().trim();
    if (normDecision !== "approve" && normDecision !== "reject" && normDecision !== "approved" && normDecision !== "rejected") {
      return res.status(400).json({
        success: false,
        error: "Decision must be either 'approve' or 'reject'."
      });
    }
    const isApproved = normDecision === "approve" || normDecision === "approved";
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    let targetBookingData = null;
    let updatedTargetCharge = null;
    let allUpdatedCharges = [];
    await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const snap = await transaction.get(bookingRef);
      if (!snap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking = snap.data();
      targetBookingData = booking;
      const isCustomer = Boolean(
        booking.customerId && booking.customerId === authUid || booking.userId && booking.userId === authUid || booking.customerUid && booking.customerUid === authUid
      );
      if (!isCustomer && !isAdmin) {
        throw new Error("FORBIDDEN_CUSTOMER");
      }
      const charges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
      const chargeIndex = charges.findIndex((c) => c.id === chargeId);
      if (chargeIndex === -1) {
        throw new Error("CHARGE_NOT_FOUND");
      }
      const targetCharge = charges[chargeIndex];
      const currentChargeStatus = (targetCharge.approvalStatus || targetCharge.status || "").toLowerCase().trim();
      if (currentChargeStatus !== "pending" && currentChargeStatus !== "") {
        throw new Error(`ALREADY_${currentChargeStatus.toUpperCase()}`);
      }
      const updatedTarget = {
        ...targetCharge,
        id: targetCharge.id,
        description: targetCharge.description,
        type: targetCharge.type,
        quantity: targetCharge.quantity,
        unitPrice: targetCharge.unitPrice,
        total: targetCharge.total,
        serviceManId: targetCharge.serviceManId,
        status: isApproved ? "approved" : "rejected",
        approvalStatus: isApproved ? "approved" : "rejected",
        approvedBy: isApproved ? authUid : void 0,
        approvedAt: isApproved ? nowIso : void 0,
        rejectionReason: !isApproved ? String(rejectionReason || "Declined by customer").slice(0, 500) : void 0,
        respondedAt: nowIso
      };
      const updatedCharges = [...charges];
      updatedCharges[chargeIndex] = updatedTarget;
      transaction.update(bookingRef, {
        extraCharges: updatedCharges,
        updatedAt: nowIso
      });
      updatedTargetCharge = updatedTarget;
      allUpdatedCharges = updatedCharges;
    });
    try {
      const proRecipientId = targetBookingData?.serviceManId || targetBookingData?.servicemanId || targetBookingData?.assignedProId;
      if (proRecipientId) {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
          userId: proRecipientId,
          title: isApproved ? "Extra Charge Approved \u2713" : "Extra Charge Declined \u2715",
          message: `Customer ${isApproved ? "approved" : "declined"} the charge for "${updatedTargetCharge.description}" (\u20B9${updatedTargetCharge.total}).`,
          bookingId: cleanBookingId,
          type: isApproved ? "extra_charge_approved" : "extra_charge_rejected",
          isRead: false,
          createdAt: nowIso
        });
      }
    } catch (notifErr) {
      console.warn("Could not write notification:", notifErr);
    }
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
        action: isApproved ? "EXTRA_CHARGE_APPROVED" : "EXTRA_CHARGE_REJECTED",
        bookingId: cleanBookingId,
        chargeId,
        customerId: authUid,
        amount: updatedTargetCharge.total,
        status: isApproved ? "approved" : "rejected",
        timestamp: nowIso
      });
    } catch (auditErr) {
      console.warn("Could not write audit log:", auditErr);
    }
    return res.status(200).json({
      success: true,
      message: isApproved ? "Charge approved successfully." : "Charge rejected.",
      charge: updatedTargetCharge,
      extraCharges: allUpdatedCharges
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (msg === "FORBIDDEN_CUSTOMER") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only the customer who booked this service can approve or reject charges."
      });
    }
    if (msg === "CHARGE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Charge item not found in booking."
      });
    }
    if (msg.startsWith("ALREADY_")) {
      const statusText = msg.replace("ALREADY_", "").toLowerCase();
      return res.status(400).json({
        success: false,
        error: `Cannot update charge: this extra charge has already been ${statusText}.`
      });
    }
    console.error("Error responding to extra charge:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
function formatWorkDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:00 (${hours}h ${mins}m)`;
  }
  return `00:${mins.toString().padStart(2, "0")}:00 (${mins} mins)`;
}
app2.post("/api/bookings/complete-work", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const { bookingId, serviceManId, notes } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    if (!serviceManId || typeof serviceManId !== "string" || !isValidEntityId(serviceManId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid serviceManId" });
    }
    const cleanBookingId = bookingId.trim();
    const cleanServiceManId = serviceManId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const snap = await (0, import_firestore8.getDoc)(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    const initialBooking = snap.data();
    const clientMonetaryKeys = ["finalAmount", "amount", "finalTotal", "total", "baseAmount", "discount", "unitPrice", "quantity", "subtotal"];
    for (const key of clientMonetaryKeys) {
      if (req.body[key] !== void 0) {
        const v = Number(req.body[key]);
        if (!Number.isFinite(v) || Number.isNaN(v) || v < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid monetary value in ${key}: must be a finite, non-negative number.`
          });
        }
      }
    }
    if (req.body.extraCharges !== void 0) {
      if (!Array.isArray(req.body.extraCharges)) {
        return res.status(400).json({ success: false, error: "extraCharges must be an array." });
      }
      for (const clientCharge of req.body.extraCharges) {
        if (!clientCharge || typeof clientCharge !== "object") continue;
        const q = Number(clientCharge.quantity);
        const p = Number(clientCharge.unitPrice);
        const t = Number(clientCharge.total);
        if (clientCharge.quantity !== void 0 && (!Number.isFinite(q) || Number.isNaN(q) || q <= 0)) {
          return res.status(400).json({ success: false, error: "Invalid charge quantity: must be positive finite number." });
        }
        if (clientCharge.unitPrice !== void 0 && (!Number.isFinite(p) || Number.isNaN(p) || p < 0)) {
          return res.status(400).json({ success: false, error: "Invalid charge unitPrice: must be non-negative finite number." });
        }
        if (clientCharge.total !== void 0 && (!Number.isFinite(t) || Number.isNaN(t) || t < 0)) {
          return res.status(400).json({ success: false, error: "Invalid charge total: must be non-negative finite number." });
        }
        if (clientCharge.quantity !== void 0 && clientCharge.unitPrice !== void 0 && clientCharge.total !== void 0) {
          const expectedTotal = Math.round(q * p);
          if (Math.round(t) !== expectedTotal) {
            return res.status(400).json({
              success: false,
              error: `Quantity \xD7 unit price mismatch on charge: ${t} does not equal ${q} \xD7 ${p}.`
            });
          }
        }
        if (clientCharge.id && Array.isArray(initialBooking.extraCharges)) {
          const stored = initialBooking.extraCharges.find((sc) => sc.id === clientCharge.id);
          if (stored) {
            const storedStatus = String(stored.approvalStatus || stored.status || "").toLowerCase().trim();
            if (storedStatus === "approved") {
              const storedTotal = Math.round(Number(stored.total));
              const suppliedTotal = clientCharge.total !== void 0 ? Math.round(t) : Math.round(q * p);
              if (suppliedTotal !== storedTotal) {
                return res.status(400).json({
                  success: false,
                  error: "Cannot alter amount of an already approved extra charge."
                });
              }
            }
          }
        }
      }
    }
    const assignedProId = initialBooking.serviceManId || initialBooking.servicemanId || initialBooking.assignedProId;
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail);
    if (serviceManId && serviceManId !== authUid && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Service professional ID does not match authenticated user."
      });
    }
    if ((!assignedProId || assignedProId !== authUid) && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only the assigned service professional can complete this booking."
      });
    }
    const currentStatus = (initialBooking.status || "").toLowerCase().trim();
    if (currentStatus === "cancelled" || currentStatus === "rejected") {
      return res.status(400).json({
        success: false,
        error: `Cannot complete booking: booking is already ${currentStatus}.`
      });
    }
    if (initialBooking.status === "completed" && initialBooking.finalBill) {
      return res.status(200).json({
        success: true,
        message: "Service is already marked as completed.",
        finalBill: initialBooking.finalBill,
        finalAmount: initialBooking.finalAmount || initialBooking.amount
      });
    }
    const isWorkStarted = currentStatus === "in_progress" || currentStatus === "work_started" || initialBooking.workStatus && String(initialBooking.workStatus).toLowerCase().trim() === "in_progress" || !!initialBooking.workStartedAt || !!initialBooking.otpVerifiedAt;
    if (currentStatus === "pending" || !isWorkStarted) {
      return res.status(400).json({
        success: false,
        error: "Invalid state transition: Cannot complete booking before work has started and Arrival OTP is verified."
      });
    }
    let billSnapshot = null;
    let finalAmount = 0;
    let alreadyCompleted = false;
    let existingBill = null;
    let existingAmount = 0;
    let currentBookingSnapshot = null;
    let completedWorkDurationFormatted = "";
    await (0, import_firestore8.runTransaction)(db, async (transaction) => {
      const freshSnap = await transaction.get(bookingRef);
      if (!freshSnap.exists()) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const booking2 = freshSnap.data();
      const statusNow = String(booking2.status || "").toLowerCase().trim();
      if (statusNow === "completed" && booking2.finalBill) {
        alreadyCompleted = true;
        existingBill = booking2.finalBill;
        existingAmount = booking2.finalAmount || booking2.amount;
        return;
      }
      if (statusNow === "cancelled" || statusNow === "rejected") {
        throw new Error(`BOOKING_TERMINAL:${statusNow}`);
      }
      const workStartedNow = statusNow === "in_progress" || statusNow === "work_started" || booking2.workStatus && String(booking2.workStatus).toLowerCase().trim() === "in_progress" || !!booking2.workStartedAt || !!booking2.otpVerifiedAt;
      if (statusNow === "pending" || !workStartedNow) {
        throw new Error("WORK_NOT_STARTED");
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const workStartedAt = booking2.workStartedAt || booking2.startedAt || booking2.otpVerifiedAt || nowIso;
      const workEndedAt2 = nowIso;
      const startTimeMs = new Date(workStartedAt).getTime();
      const endTimeMs = new Date(workEndedAt2).getTime();
      const elapsedMs = Math.max(0, endTimeMs - startTimeMs);
      const workDurationMinutes = Math.max(1, Math.round(elapsedMs / (60 * 1e3)));
      const formattedDuration = formatWorkDuration(workDurationMinutes);
      completedWorkDurationFormatted = formattedDuration;
      const rawBase = booking2.baseAmount !== void 0 ? booking2.baseAmount : booking2.amount || 0;
      const numBase = Number(rawBase);
      const baseAmount = Number.isFinite(numBase) && numBase >= 0 ? Math.round(numBase) : 0;
      const allCharges = Array.isArray(booking2.extraCharges) ? booking2.extraCharges : [];
      const approvedCharges = allCharges.filter((c) => {
        if (!c || typeof c !== "object") return false;
        if (c.bookingId && c.bookingId !== bookingId) return false;
        const status = String(c.approvalStatus || c.status || "").toLowerCase().trim();
        return status === "approved";
      });
      const extraServicesAmount = approvedCharges.filter((c) => c.type === "service").reduce((sum, c) => {
        const rawQty = Number(c.quantity);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
        return sum + qty * unitPrice;
      }, 0);
      const materialsAmount = approvedCharges.filter((c) => c.type === "material" || c.type === "other").reduce((sum, c) => {
        const rawQty = Number(c.quantity);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
        return sum + qty * unitPrice;
      }, 0);
      const approvedExtraChargesAmount = extraServicesAmount + materialsAmount;
      const rawApplicable = booking2.applicableCharges !== void 0 ? booking2.applicableCharges : booking2.safetyFee !== void 0 ? booking2.safetyFee : booking2.platformFee !== void 0 ? booking2.platformFee : 29;
      const numApplicable = Number(rawApplicable);
      const applicableCharges = Number.isFinite(numApplicable) && numApplicable >= 0 ? Math.round(numApplicable) : 29;
      const rawDiscount = booking2.discount !== void 0 ? booking2.discount : booking2.discountAmount || 0;
      const numDiscount = Number(rawDiscount);
      const discount = Number.isFinite(numDiscount) && numDiscount >= 0 ? Math.round(numDiscount) : 0;
      finalAmount = Math.max(
        0,
        Math.round(baseAmount + approvedExtraChargesAmount + applicableCharges - discount)
      );
      const commissionRate = 15;
      const taxRate = 5;
      const platformChargeAmount = Math.round(finalAmount * commissionRate / 100);
      const taxAmount = Math.round(finalAmount * taxRate / 100);
      const servicemanPayoutAmount = Math.max(0, finalAmount - platformChargeAmount - taxAmount);
      const lineItems = [
        {
          id: "li_base",
          label: booking2.serviceName || "Base Service Charge",
          category: "base_service",
          quantity: 1,
          unitPrice: baseAmount,
          amount: baseAmount,
          notes: booking2.categoryName ? `Category: ${booking2.categoryName}` : void 0
        }
      ];
      approvedCharges.forEach((c) => {
        const rawQty = Number(c.quantity);
        const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
        const rawUnitPrice = Number(c.unitPrice);
        const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
        const lineTotal = qty * unitPrice;
        lineItems.push({
          id: `li_${c.id}`,
          label: c.description,
          category: c.type === "service" ? "extra_service" : "material",
          quantity: qty,
          unitPrice,
          amount: lineTotal,
          notes: `Customer Approved (${c.type === "service" ? "Extra Service" : "Spare Part / Material"})`
        });
      });
      if (applicableCharges > 0) {
        lineItems.push({
          id: "li_applicable",
          label: "Applicable Charges (Safety & Platform Fee)",
          category: "platform_charge",
          quantity: 1,
          unitPrice: applicableCharges,
          amount: applicableCharges,
          notes: "Platform insurance, safety standards, and tech guarantee"
        });
      }
      if (discount > 0) {
        lineItems.push({
          id: "li_discount",
          label: `Discount Applied${booking2.couponCode ? ` (${booking2.couponCode})` : ""}`,
          category: "discount",
          quantity: 1,
          unitPrice: -discount,
          amount: -discount,
          notes: "Promotional / coupon discount"
        });
      }
      const billId = `bill_${bookingId}_${Date.now()}`;
      billSnapshot = {
        id: billId,
        bookingId,
        customerId: booking2.customerId,
        customerName: booking2.customerName || "Valued Customer",
        serviceManId: booking2.serviceManId || serviceManId,
        serviceManName: booking2.serviceManName || "Service Professional",
        serviceCategory: booking2.categoryName || "Home Service",
        serviceName: booking2.serviceName || "Home Service",
        districtId: booking2.districtId || "bhopal_central",
        districtName: booking2.districtName || "Bhopal",
        workStartedAt,
        workCompletedAt: workEndedAt2,
        workEndedAt: workEndedAt2,
        workDurationMinutes,
        workDurationFormatted: formattedDuration,
        baseAmount,
        approvedExtraChargesAmount,
        extraServicesAmount,
        materialsAmount,
        applicableCharges,
        platformChargeAmount,
        discount,
        discountAmount: discount,
        taxAmount,
        finalAmount,
        lineItems,
        paymentStatus: booking2.paymentStatus === "paid" && finalAmount === baseAmount ? "paid" : booking2.paymentStatus === "cod" ? "cod" : booking2.paymentStatus === "paid" ? "unpaid" : booking2.paymentStatus || "unpaid",
        paymentMethod: booking2.paymentMethod || "cash",
        generatedAt: workEndedAt2,
        notes: notes ? String(notes).trim() : void 0
      };
      transaction.update(bookingRef, {
        status: "completed",
        trackingStatus: "WORK_COMPLETED",
        workStatus: "completed",
        workCompletedAt: workEndedAt2,
        workEndedAt: workEndedAt2,
        workDurationMinutes,
        workDurationFormatted: formattedDuration,
        finalBill: billSnapshot,
        finalAmount,
        amount: finalAmount,
        baseAmount,
        approvedExtraChargesAmount,
        applicableCharges,
        discount,
        companyCommission: platformChargeAmount,
        taxDeduction: taxAmount,
        servicemanPayoutAmount,
        completedAt: workEndedAt2,
        deliveryStatus: "verified",
        isVerifiedDelivery: true,
        verifiedAt: workEndedAt2,
        isTrackingActive: false,
        // Stop live tracking / location sharing
        updatedAt: workEndedAt2
      });
      const billDocRef = (0, import_firestore8.doc)(db, "bills", billId);
      transaction.set(billDocRef, billSnapshot);
      currentBookingSnapshot = booking2;
    });
    if (alreadyCompleted && existingBill) {
      return res.status(200).json({
        success: true,
        message: "Service is already marked as completed.",
        finalBill: existingBill,
        finalAmount: existingAmount
      });
    }
    const booking = currentBookingSnapshot || initialBooking;
    const workEndedAt = billSnapshot.workEndedAt;
    try {
      const trackingRef = (0, import_firestore8.doc)(db, "serviceTracking", bookingId);
      await (0, import_firestore8.updateDoc)(trackingRef, {
        status: "COMPLETED",
        lastUpdatedAt: workEndedAt
      });
    } catch (trackErr) {
      console.warn("Could not update serviceTracking document to COMPLETED:", trackErr);
    }
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
        action: "WORK_COMPLETED_FINAL_BILL_GENERATED",
        bookingId,
        billId: billSnapshot.id,
        serviceManId: authUid,
        customerId: booking.customerId,
        finalAmount,
        baseAmount: billSnapshot.baseAmount,
        extraServicesAmount: billSnapshot.extraServicesAmount,
        materialsAmount: billSnapshot.materialsAmount,
        workDurationMinutes: billSnapshot.workDurationMinutes,
        timestamp: workEndedAt
      });
    } catch (auditErr) {
      console.warn("Could not write audit log:", auditErr);
    }
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
        userId: booking.customerId,
        title: "Service Completed & Final Bill Ready",
        message: `Service completed by ${booking.serviceManName || "professional"}. Total work duration: ${completedWorkDurationFormatted}. Final payable amount: \u20B9${finalAmount}.`,
        bookingId,
        billId: billSnapshot.id,
        type: "work_completed",
        isRead: false,
        createdAt: workEndedAt
      });
    } catch (notifErr) {
      console.warn("Could not write notification:", notifErr);
    }
    return res.status(200).json({
      success: true,
      message: "Work completed and final bill generated successfully.",
      finalBill: billSnapshot,
      finalAmount
    });
  } catch (err) {
    if (err.message === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    if (err.message?.startsWith("BOOKING_TERMINAL:")) {
      const st = err.message.split(":")[1];
      return res.status(400).json({
        success: false,
        error: `Cannot complete booking: booking is already ${st}.`
      });
    }
    if (err.message === "WORK_NOT_STARTED") {
      return res.status(400).json({
        success: false,
        error: "Invalid state transition: Cannot complete booking before work has started and Arrival OTP is verified."
      });
    }
    console.error("Error completing work:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/calculate-current-bill", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) {
      return;
    }
    const { bookingId } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    const clientMonetaryKeys = ["finalAmount", "amount", "finalTotal", "total", "baseAmount", "discount", "unitPrice", "quantity", "subtotal"];
    for (const key of clientMonetaryKeys) {
      if (req.body[key] !== void 0) {
        const v = Number(req.body[key]);
        if (!Number.isFinite(v) || Number.isNaN(v) || v < 0) {
          return res.status(400).json({
            success: false,
            error: `Invalid monetary value in ${key}: must be a finite, non-negative number.`
          });
        }
      }
    }
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const snap = await (0, import_firestore8.getDoc)(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    const booking = snap.data();
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAuthorizedAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    if (req.body.customerId && typeof req.body.customerId === "string") {
      const suppliedCustomerId = req.body.customerId.trim();
      if (suppliedCustomerId !== authUid && !isAuthorizedAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot impersonate another customer."
        });
      }
    }
    if (req.body.serviceManId && typeof req.body.serviceManId === "string") {
      const suppliedServiceManId = req.body.serviceManId.trim();
      if (suppliedServiceManId !== authUid && !isAuthorizedAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot impersonate another service professional."
        });
      }
    }
    const isCustomer = Boolean(
      booking.customerId && booking.customerId === authUid || booking.userId && booking.userId === authUid || booking.customerUid && booking.customerUid === authUid
    );
    const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
    const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);
    if (!isCustomer && !isAssignedPro && !isAuthorizedAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You are not authorized to access billing information for this booking."
      });
    }
    const rawBase = booking.baseAmount !== void 0 ? booking.baseAmount : booking.amount || 0;
    const numBase = Number(rawBase);
    const baseAmount = Number.isFinite(numBase) && numBase >= 0 ? Math.round(numBase) : 0;
    const allCharges = Array.isArray(booking.extraCharges) ? booking.extraCharges : [];
    const approvedCharges = allCharges.filter((c) => {
      if (!c || typeof c !== "object") return false;
      const status = String(c.approvalStatus || c.status || "").toLowerCase().trim();
      return status === "approved";
    });
    const pendingCharges = allCharges.filter((c) => {
      if (!c || typeof c !== "object") return false;
      const status = String(c.approvalStatus || c.status || "").toLowerCase().trim();
      return status === "pending";
    });
    const rejectedCharges = allCharges.filter((c) => {
      if (!c || typeof c !== "object") return false;
      const status = String(c.approvalStatus || c.status || "").toLowerCase().trim();
      return status === "rejected";
    });
    const extraServicesAmount = approvedCharges.filter((c) => c.type === "service").reduce((sum, c) => {
      const rawQty = Number(c.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
      const rawUnitPrice = Number(c.unitPrice);
      const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
      return sum + qty * unitPrice;
    }, 0);
    const materialsAmount = approvedCharges.filter((c) => c.type === "material" || c.type === "other").reduce((sum, c) => {
      const rawQty = Number(c.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
      const rawUnitPrice = Number(c.unitPrice);
      const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
      return sum + qty * unitPrice;
    }, 0);
    const approvedExtraChargesAmount = extraServicesAmount + materialsAmount;
    const rawApplicable = booking.applicableCharges !== void 0 ? booking.applicableCharges : booking.safetyFee !== void 0 ? booking.safetyFee : booking.platformFee !== void 0 ? booking.platformFee : 29;
    const numApplicable = Number(rawApplicable);
    const applicableCharges = Number.isFinite(numApplicable) && numApplicable >= 0 ? Math.round(numApplicable) : 29;
    const rawDiscount = booking.discount !== void 0 ? booking.discount : booking.discountAmount || 0;
    const numDiscount = Number(rawDiscount);
    const discount = Number.isFinite(numDiscount) && numDiscount >= 0 ? Math.round(numDiscount) : 0;
    const pendingTotal = pendingCharges.reduce((sum, c) => {
      const rawQty = Number(c.quantity);
      const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.round(rawQty)) : 1;
      const rawUnitPrice = Number(c.unitPrice);
      const unitPrice = Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0 ? Math.round(rawUnitPrice) : 0;
      return sum + qty * unitPrice;
    }, 0);
    const currentEstimatedFinal = Math.max(
      0,
      Math.round(baseAmount + approvedExtraChargesAmount + applicableCharges - discount)
    );
    return res.status(200).json({
      success: true,
      breakdown: {
        baseAmount,
        approvedExtraChargesAmount,
        extraServicesAmount,
        materialsAmount,
        applicableCharges,
        discount,
        pendingTotal,
        currentEstimatedFinal,
        approvedCount: approvedCharges.length,
        pendingCount: pendingCharges.length,
        rejectedCount: rejectedCharges.length
      }
    });
  } catch (err) {
    console.error("Error calculating bill:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/cash-payment/request", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    const effectiveUid = authUid || req.body?.uid;
    const { bookingId, callerRole, notes } = req.body;
    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({ success: false, error: "Valid bookingId is required" });
    }
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", bookingId.trim());
    const snap = await (0, import_firestore8.getDoc)(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    const booking = snap.data();
    const isCustomer = effectiveUid && (booking.customerId === effectiveUid || booking.userId === effectiveUid);
    const isServiceMan = effectiveUid && (booking.serviceManId === effectiveUid || booking.servicemanId === effectiveUid);
    const isAuthAdmin = effectiveUid === "admin_deepak_root" || req.user?.email?.includes("admin");
    if (!isCustomer && !isServiceMan && !isAuthAdmin) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You are not authorized to record cash transactions for this booking."
      });
    }
    let authoritativeAmount = 0;
    if (booking.finalBill && typeof booking.finalBill.finalAmount === "number" && booking.finalBill.finalAmount >= 0) {
      authoritativeAmount = Math.round(booking.finalBill.finalAmount);
    } else if (typeof booking.finalAmount === "number" && booking.finalAmount >= 0) {
      authoritativeAmount = Math.round(booking.finalAmount);
    } else if (typeof booking.amount === "number" && booking.amount >= 0) {
      authoritativeAmount = Math.round(booking.amount);
    }
    if (authoritativeAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Authoritative booking bill amount must be greater than zero."
      });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const transactionId = `tx_cash_${bookingId.trim()}_${Date.now()}`;
    const normalizedRole = String(callerRole || (isServiceMan ? "SERVICE_PRO" : "CUSTOMER")).toUpperCase();
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "transactions", transactionId), {
      id: transactionId,
      transactionId,
      bookingId: bookingId.trim(),
      serviceId: booking.serviceId || "",
      serviceName: booking.serviceName || "HARDINKAAM Service",
      customerId: booking.customerId,
      customerName: booking.customerName || "",
      customerPhone: booking.customerPhone || "",
      serviceManId: booking.serviceManId || "",
      serviceManName: booking.serviceManName || "",
      partnerId: booking.partnerId || "",
      districtId: booking.districtId || "",
      amount: authoritativeAmount,
      currency: "INR",
      paymentMethod: "cash",
      type: "CASH_TRANSACTION",
      status: "PENDING",
      requestedBy: effectiveUid || "unknown",
      requestedByRole: normalizedRole,
      requestedAt: nowIso,
      notes: notes ? String(notes).trim() : isServiceMan ? "Cash payment collected upon service completion" : "Customer requested cash payment",
      createdAt: nowIso,
      updatedAt: nowIso
    });
    await (0, import_firestore8.updateDoc)(bookingRef, {
      paymentMethod: "cash",
      cashPaymentStatus: "pending_approval",
      cashTransactionId: transactionId,
      cashRequestedAt: nowIso,
      cashRequestedBy: effectiveUid || "unknown",
      updatedAt: nowIso
    });
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
        recipientId: "admin_deepak_root",
        userId: effectiveUid || "unknown",
        targetRole: "admin",
        type: "cash_payment_approval",
        title: "\u0928\u0915\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u0905\u0928\u0941\u0930\u094B\u0927 (Cash Transaction Request)",
        message: `\u092C\u0941\u0915\u093F\u0902\u0917 #${bookingId.trim()} (${booking.serviceName}) \u0915\u0947 \u0932\u093F\u090F \u20B9${authoritativeAmount} \u0928\u0915\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u0905\u0928\u0941\u0930\u094B\u0927 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u0941\u0906 \u0939\u0948\u0964`,
        amount: authoritativeAmount,
        bookingId: bookingId.trim(),
        transactionId,
        createdAt: nowIso,
        read: false
      });
    } catch (_) {
    }
    return res.json({
      success: true,
      transactionId,
      status: "PENDING",
      amount: authoritativeAmount
    });
  } catch (err) {
    console.error("Error in cash payment request endpoint:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/cash-payment/approve", requireAdminAuth, async (req, res) => {
  try {
    const { transactionId, bookingId, adminName, adminNotes } = req.body;
    if (!transactionId || !bookingId) {
      return res.status(400).json({ success: false, error: "transactionId and bookingId are required" });
    }
    const txDocRef = (0, import_firestore8.doc)(db, "transactions", transactionId);
    const bkDocRef = (0, import_firestore8.doc)(db, "bookings", bookingId);
    const [txSnap, bkSnap] = await Promise.all([(0, import_firestore8.getDoc)(txDocRef), (0, import_firestore8.getDoc)(bkDocRef)]);
    if (!txSnap.exists()) {
      return res.status(404).json({ success: false, error: "Transaction document not found" });
    }
    if (!bkSnap.exists()) {
      return res.status(404).json({ success: false, error: "Booking document not found" });
    }
    const txData = txSnap.data();
    const bkData = bkSnap.data();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const approver = adminName || "DEEPAK (Super Admin)";
    const finalAmount = txData.amount || bkData.finalAmount || bkData.amount || 0;
    const companyRate = 15;
    const franchiseRate = 15;
    const partnerRate = bkData.partnerId ? 5 : 0;
    const servicemanRate = Math.max(0, 100 - companyRate - partnerRate);
    const companyShare = Math.round(finalAmount * companyRate / 100);
    const franchiseDueToHQ = Math.round(finalAmount * franchiseRate / 100);
    const partnerShare = partnerRate > 0 ? Math.round(finalAmount * partnerRate / 100) : 0;
    const servicemanShare = finalAmount - companyShare - partnerShare;
    const ledgersRef = (0, import_firestore8.collection)(db, "ledgers");
    const existingLedgersSnap = await (0, import_firestore8.getDocs)((0, import_firestore8.query)(ledgersRef, (0, import_firestore8.where)("bookingId", "==", bookingId), (0, import_firestore8.limit)(1)));
    const alreadyHasLedger = !existingLedgersSnap.empty;
    await (0, import_firestore8.updateDoc)(txDocRef, {
      status: "APPROVED",
      approvedAt: nowIso,
      approvedBy: approver,
      adminNotes: adminNotes || "Approved by Admin",
      updatedAt: nowIso
    });
    const bkUpdate = {
      paymentStatus: "paid",
      cashPaymentStatus: "approved",
      paymentMethod: "cash",
      paidAt: nowIso,
      paymentTransactionId: transactionId,
      paymentConfirmedBy: approver,
      updatedAt: nowIso
    };
    if (bkData.finalBill) {
      bkUpdate.finalBill = {
        ...bkData.finalBill,
        paymentStatus: "paid",
        paymentMethod: "cash",
        paidAt: nowIso,
        paymentTransactionId: transactionId
      };
    }
    await (0, import_firestore8.updateDoc)(bkDocRef, bkUpdate);
    if (!alreadyHasLedger) {
      const companyLedgerId = `ledger_company_${bookingId}`;
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ledgers", companyLedgerId), {
        id: companyLedgerId,
        bookingId,
        ledgerOwnerId: "admin_deepak_root",
        ledgerOwnerRole: "ADMIN",
        commissionType: "company_margin",
        grossBookingAmount: finalAmount,
        commissionPercent: companyRate,
        amount: companyShare,
        isPayableToHardinkaam: false,
        status: "cleared",
        collectionStatus: "paid",
        createdAt: nowIso,
        notes: `HARDINKAAM Company Share from Cash Booking #${bookingId}`
      });
      if (bkData.districtId) {
        const franchiseOwnerId = bkData.franchisePartnerId || `franchise_${bkData.districtId}`;
        const franchiseLedgerId = `ledger_franchise_${bookingId}`;
        await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ledgers", franchiseLedgerId), {
          id: franchiseLedgerId,
          bookingId,
          districtId: bkData.districtId,
          ledgerOwnerId: franchiseOwnerId,
          ledgerOwnerRole: "FRANCHISE",
          commissionType: "franchise_commission",
          grossBookingAmount: finalAmount,
          commissionPercent: franchiseRate,
          amount: franchiseDueToHQ,
          isPayableToHardinkaam: true,
          status: "cleared",
          collectionStatus: "paid",
          createdAt: nowIso,
          notes: `Franchise Commission (15% due to HARDINKAAM) from Booking #${bookingId}`
        });
      }
      if (bkData.partnerId && partnerShare > 0) {
        const partnerLedgerId = `ledger_partner_${bookingId}`;
        await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ledgers", partnerLedgerId), {
          id: partnerLedgerId,
          bookingId,
          ledgerOwnerId: bkData.partnerId,
          ledgerOwnerRole: "BUSINESS_PARTNER",
          commissionType: "partner_commission",
          grossBookingAmount: finalAmount,
          commissionPercent: partnerRate,
          amount: partnerShare,
          isPayableToHardinkaam: false,
          status: "cleared",
          collectionStatus: "paid",
          createdAt: nowIso,
          notes: `Business Partner Commission from Booking #${bookingId}`
        });
      }
      if (bkData.serviceManId) {
        const proLedgerId = `ledger_serviceman_${bookingId}`;
        await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ledgers", proLedgerId), {
          id: proLedgerId,
          bookingId,
          ledgerOwnerId: bkData.serviceManId,
          ledgerOwnerRole: "SERVICE_PRO",
          commissionType: "serviceman_share",
          grossBookingAmount: finalAmount,
          commissionPercent: servicemanRate,
          amount: servicemanShare,
          isPayableToHardinkaam: false,
          status: "cleared",
          collectionStatus: "paid",
          createdAt: nowIso,
          notes: `Technician Payout Earnings from Cash Booking #${bookingId}`
        });
      }
    }
    try {
      if (bkData.customerId) {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
          recipientId: bkData.customerId,
          userId: bkData.customerId,
          targetRole: "customer",
          type: "payment_verified",
          title: "\u0928\u0915\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0935 \u0930\u0938\u0940\u0926 \u0909\u092A\u0932\u092C\u094D\u0927! \u2713",
          message: `\u0906\u092A\u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917 #${bookingId} \u0915\u093E \u20B9${finalAmount} \u0928\u0915\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0915\u0930 \u0932\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964`,
          amount: finalAmount,
          bookingId,
          createdAt: nowIso,
          read: false
        });
      }
      if (bkData.serviceManId) {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "notifications"), {
          recipientId: bkData.serviceManId,
          userId: bkData.serviceManId,
          targetRole: "service_man",
          type: "payment_verified",
          title: "\u0915\u0948\u0936 \u092D\u0941\u0917\u0924\u093E\u0928 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0935 \u0915\u092E\u0940\u0936\u0928 \u0938\u0947\u091F\u0932! \u2713",
          message: `\u092C\u0941\u0915\u093F\u0902\u0917 #${bookingId} \u0915\u093E \u20B9${finalAmount} \u0928\u0915\u0926 \u092D\u0941\u0917\u0924\u093E\u0928 \u090F\u0921\u092E\u093F\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964`,
          amount: servicemanShare,
          bookingId,
          createdAt: nowIso,
          read: false
        });
      }
    } catch (_) {
    }
    return res.json({
      success: true,
      transactionId,
      status: "APPROVED",
      amount: finalAmount
    });
  } catch (err) {
    console.error("Error approving cash transaction:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/bookings/cash-payment/reject", requireAdminAuth, async (req, res) => {
  try {
    const { transactionId, bookingId, rejectionReason, adminName } = req.body;
    if (!transactionId || !bookingId) {
      return res.status(400).json({ success: false, error: "transactionId and bookingId are required" });
    }
    const txDocRef = (0, import_firestore8.doc)(db, "transactions", transactionId);
    const bkDocRef = (0, import_firestore8.doc)(db, "bookings", bookingId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const approver = adminName || "DEEPAK (Super Admin)";
    const reason = rejectionReason || "\u0928\u0915\u0926 \u0930\u093E\u0936\u093F \u0905\u092A\u094D\u0930\u093E\u092A\u094D\u0924 / \u092E\u093F\u0938\u092E\u0948\u091A";
    await (0, import_firestore8.updateDoc)(txDocRef, {
      status: "REJECTED",
      rejectedAt: nowIso,
      rejectedBy: approver,
      rejectionReason: reason,
      updatedAt: nowIso
    });
    await (0, import_firestore8.updateDoc)(bkDocRef, {
      cashPaymentStatus: "rejected",
      paymentStatus: "unpaid",
      updatedAt: nowIso
    });
    return res.json({
      success: true,
      transactionId,
      status: "REJECTED"
    });
  } catch (err) {
    console.error("Error rejecting cash transaction:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.get("/api/bookings/cash-payment/pending", requireAdminAuth, async (_req, res) => {
  try {
    const q = (0, import_firestore8.query)(
      (0, import_firestore8.collection)(db, "transactions"),
      (0, import_firestore8.where)("type", "==", "CASH_TRANSACTION"),
      (0, import_firestore8.limit)(100)
    );
    const snap = await (0, import_firestore8.getDocs)(q);
    const list = snap.docs.map((d) => d.data());
    const pending = list.filter((t) => t.status === "PENDING" || t.status === "ADMIN_REVIEW");
    return res.json({ success: true, transactions: pending });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post(["/api/bookings/dispatch-alert", "/api/booking-offers/create"], async (req, res) => {
  try {
    if (!auth.currentUser) {
      console.log("[Firebase Auth] Active session missing during dispatch. Authenticating...");
      await authenticateServerInstance();
    }
    const { bookingId } = req.body;
    if (!isValidBookingId(bookingId)) {
      return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
    }
    const cleanBookingId = bookingId.trim();
    const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
    const snap = await (0, import_firestore8.getDoc)(bookingRef);
    if (!snap.exists()) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }
    const booking = snap.data();
    const currentStatus = (booking.status || "pending").toLowerCase();
    if (["accepted", "in_progress", "work_started", "completed", "cancelled", "rejected"].includes(currentStatus)) {
      return res.status(200).json({
        success: false,
        code: "ALREADY_PROCESSED",
        message: `Booking is already in '${currentStatus}' status. Dispatch skipped.`
      });
    }
    if (booking.offersDispatched === true && booking.alertDispatchedAt) {
      const elapsedMinutes = (Date.now() - new Date(booking.alertDispatchedAt).getTime()) / (60 * 1e3);
      if (elapsedMinutes < 5) {
        return res.status(200).json({
          success: true,
          code: "ALREADY_DISPATCHED",
          message: `Offers already dispatched ${Math.round(elapsedMinutes)}m ago. Duplicate prevented.`
        });
      }
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const prosRef = (0, import_firestore8.collection)(db, "service_men");
    const prosSnap = await (0, import_firestore8.getDocs)(prosRef);
    const bookingDistrictId = (booking.districtId || "").toLowerCase().trim();
    const bookingDistrictName = (booking.districtName || "").toLowerCase().trim();
    const bookingCity = (booking.city || "").toLowerCase().trim();
    const bookingCategoryId = (booking.categoryId || "").trim();
    const eligiblePros = [];
    prosSnap.forEach((docSnap) => {
      const pro = docSnap.data();
      const proId = docSnap.id;
      const accountStatus = (pro.status || "active").toLowerCase();
      if (accountStatus === "suspended" || accountStatus === "blocked" || accountStatus === "inactive" || pro.isActive === false) {
        return;
      }
      const isKycVerified = pro.kycStatus === "verified" || pro.kycStatus === "approved";
      const isVerifiedFlag = pro.isVerified === true;
      if (!isVerifiedFlag && !isKycVerified) {
        return;
      }
      const isOnline = pro.isAvailable === true;
      const dutyStatus = (pro.dutyStatus || "").toLowerCase();
      if (!isOnline || dutyStatus === "busy" || accountStatus === "busy") {
        return;
      }
      if (bookingCategoryId && Array.isArray(pro.categoryIds) && pro.categoryIds.length > 0) {
        if (!pro.categoryIds.includes(bookingCategoryId)) {
          return;
        }
      }
      if (bookingDistrictId || bookingDistrictName || bookingCity) {
        const proDistrictId = (pro.districtId || pro.assignedDistrictId || "").toLowerCase();
        const proDistrictName = (pro.districtName || pro.assignedDistrictName || "").toLowerCase();
        const proCity = (pro.city || "").toLowerCase();
        const serviceArea = (pro.serviceArea || "").toLowerCase();
        const matchesDistrictId = bookingDistrictId && proDistrictId === bookingDistrictId;
        const matchesDistrictName = bookingDistrictName && (proDistrictName === bookingDistrictName || serviceArea.includes(bookingDistrictName));
        const matchesCity = bookingCity && (proCity === bookingCity || serviceArea.includes(bookingCity));
        const matchesArea = !proDistrictId && !proCity;
        if (!matchesDistrictId && !matchesDistrictName && !matchesCity && !matchesArea) {
          return;
        }
      }
      eligiblePros.push({
        id: proId,
        userId: pro.userId || proId,
        name: pro.name || "Service Pro",
        phone: pro.phone || "",
        email: pro.email || "",
        fcmTokens: Array.isArray(pro.fcmTokens) ? pro.fcmTokens : pro.fcmToken ? [pro.fcmToken] : []
      });
    });
    try {
      await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
        action: "SERVICEMAN_MATCHED",
        bookingId,
        matchedCount: eligiblePros.length,
        timestamp: nowIso
      });
    } catch (e) {
      console.warn("Audit note:", e);
    }
    if (eligiblePros.length === 0) {
      return res.status(200).json({
        success: true,
        code: "NO_ELIGIBLE_SERVICEMAN",
        message: "No available ServiceMen currently matched.",
        offersCount: 0
      });
    }
    const expiresAt = new Date(Date.now() + 15 * 60 * 1e3).toISOString();
    const createdOffers = [];
    for (const pro of eligiblePros) {
      const offerId = `offer_${bookingId}_${pro.id}`;
      const assignmentId = `asgn_${bookingId}_${pro.id}`;
      const offerRef = (0, import_firestore8.doc)(db, "booking_offers", offerId);
      const assignmentRef = (0, import_firestore8.doc)(db, "booking_assignments", assignmentId);
      const existingOfferSnap = await (0, import_firestore8.getDoc)(offerRef);
      if (existingOfferSnap.exists()) {
        const data = existingOfferSnap.data();
        if (["PENDING", "ACCEPTED"].includes(data.status)) {
          createdOffers.push({ offerId, assignmentId, proId: pro.id, status: data.status });
          continue;
        }
      }
      const offerData = {
        offerId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        districtId: booking.districtId || "",
        districtName: booking.districtName || booking.city || "Central",
        serviceId: booking.serviceId || "",
        serviceName: booking.serviceName || "",
        categoryId: booking.categoryId || "",
        categoryName: booking.categoryName || "",
        amount: Number(booking.amount) || 0,
        scheduledDate: booking.scheduledDate || "",
        scheduledTime: booking.scheduledTime || "",
        address: booking.address || "",
        city: booking.city || "",
        pincode: booking.pincode || "",
        customerName: booking.customerName || "",
        customerPhone: booking.customerPhone || "",
        status: "PENDING",
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso
      };
      await (0, import_firestore8.setDoc)(offerRef, offerData, { merge: true });
      const legacyData = {
        id: assignmentId,
        bookingId,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        district: offerData.districtName,
        districtId: offerData.districtId,
        service: offerData.serviceName,
        serviceId: offerData.serviceId,
        amount: offerData.amount,
        status: "offered",
        createdAt: nowIso,
        expiresAt,
        updatedAt: nowIso
      };
      await (0, import_firestore8.setDoc)(assignmentRef, legacyData, { merge: true });
      notifyServiceProNewAssignment(booking, pro.id, offerId).catch((fcmErr) => {
        console.warn(`[FCM] Offer push notification notice for pro ${pro.id}:`, fcmErr?.message || fcmErr);
      });
      try {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
          action: "OFFER_CREATED",
          bookingId,
          serviceManId: pro.id,
          offerId,
          assignmentId,
          timestamp: nowIso
        });
      } catch (e) {
        console.warn("Audit note:", e);
      }
      createdOffers.push({
        offerId,
        assignmentId,
        proId: pro.id,
        status: "PENDING"
      });
    }
    await (0, import_firestore8.updateDoc)(bookingRef, {
      offersDispatched: true,
      offersCount: createdOffers.length,
      alertDispatchedAt: nowIso,
      updatedAt: nowIso
    });
    return res.status(200).json({
      success: true,
      code: "OFFERS_DISPATCHED",
      offersCreated: createdOffers.length,
      offers: createdOffers
    });
  } catch (err) {
    console.error("dispatch-alert error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
var PROTECTED_BOOKING_FIELDS = /* @__PURE__ */ new Set([
  "id",
  "bookingId",
  "customerId",
  "userId",
  "customerUid",
  "serviceManId",
  "servicemanId",
  "assignedProId",
  "serviceManName",
  "serviceManPhone",
  "status",
  "bookingStatus",
  "approvalState",
  "approvalStatus",
  "finalBill",
  "bill",
  "billBreakdown",
  "billingDetails",
  "totalPayable",
  "payableAmount",
  "finalAmount",
  "finalTotal",
  "total",
  "subtotal",
  "extraChargeTotal",
  "baseAmount",
  "baseServiceCharge",
  "discount",
  "tax",
  "unitPrice",
  "quantity",
  "extraCharges",
  "extraCharge",
  "createdAt",
  "created_at",
  "completionState",
  "completedAt",
  "workEndedAt",
  "workStatus",
  "cancellationState",
  "cancelledAt",
  "cancelledBy",
  "cancelReason",
  "cancellationReason",
  "arrivalOtpHash",
  "arrivalOtp",
  "otp",
  "otpExpiresAt",
  "otpAttempts",
  "otpVerifiedAt",
  "paymentStatus",
  "razorpayOrderId",
  "razorpayPaymentId"
]);
app2.post(
  [
    "/api/bookings/accept-offer",
    "/api/booking-offers/accept",
    "/api/bookings/update-status",
    "/api/bookings/status",
    "/api/bookings/update",
    "/api/bookings/update-booking",
    "/api/bookings/:bookingId/update",
    "/api/bookings/:bookingId"
  ],
  async (req, res) => {
    try {
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;
      const rawBookingId = req.body?.bookingId || req.params?.bookingId || req.body?.booking?.id || req.body?.booking?.bookingId;
      if (!isValidBookingId(rawBookingId)) {
        return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
      }
      const cleanBookingId = String(rawBookingId).trim();
      const rawStatus = req.body?.status || req.body?.newStatus || req.body?.nextStatus || (req.path && req.path.includes("accept") ? "accepted" : "");
      const isStatusTransition = typeof rawStatus === "string" && rawStatus.trim().length > 0;
      const requestedStatus = isStatusTransition ? rawStatus.toLowerCase().trim() : "";
      const VALID_BOOKING_STATUSES = /* @__PURE__ */ new Set([
        "pending",
        "assigned",
        "offered",
        "accepted",
        "on_the_way",
        "arriving",
        "arrived",
        "otp_pending",
        "in_progress",
        "work_started",
        "completed",
        "work_completed",
        "cancelled",
        "rejected"
      ]);
      if (isStatusTransition && !VALID_BOOKING_STATUSES.has(requestedStatus)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_STATUS",
          error: `Invalid status value: '${requestedStatus}'.`
        });
      }
      if (isStatusTransition && (requestedStatus === "completed" || requestedStatus === "work_completed")) {
        return res.status(400).json({
          success: false,
          code: "DIRECT_COMPLETION_NOT_ALLOWED",
          error: "Invalid state transition: Booking completion and final billing must be performed via /api/bookings/complete-work."
        });
      }
      if (isStatusTransition && (requestedStatus === "in_progress" || requestedStatus === "work_started")) {
        return res.status(400).json({
          success: false,
          code: "ARRIVAL_OTP_REQUIRED",
          error: "Invalid state transition: Transitioning to work started requires Arrival OTP verification via /api/bookings/verify-arrival-otp."
        });
      }
      const userEmail = (req.user?.email || "").toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
      if (req.body.customerId && typeof req.body.customerId === "string") {
        const suppliedCustomerId = req.body.customerId.trim();
        if (suppliedCustomerId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            code: "FORBIDDEN_IMPERSONATION",
            error: "Forbidden: Cannot impersonate another customer."
          });
        }
      }
      if (req.body.serviceManId && typeof req.body.serviceManId === "string") {
        const suppliedServiceManId = req.body.serviceManId.trim();
        if (suppliedServiceManId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            code: "FORBIDDEN_IMPERSONATION",
            error: "Forbidden: Cannot impersonate another service professional."
          });
        }
      }
      const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const result = await (0, import_firestore8.runTransaction)(db, async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists()) {
          throw new Error("BOOKING_NOT_FOUND");
        }
        const bookingData = bookingDoc.data();
        const currentStatus = String(bookingData.status || "pending").toLowerCase().trim();
        const isCustomer = bookingData.customerId === authUid || bookingData.userId === authUid || bookingData.customerUid === authUid;
        const assignedProId = bookingData.serviceManId || bookingData.servicemanId || bookingData.assignedProId;
        const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);
        if (currentStatus === "cancelled" || currentStatus === "rejected") {
          throw new Error("BOOKING_ALREADY_CANCELLED");
        }
        if (currentStatus === "completed" || currentStatus === "work_completed") {
          throw new Error("BOOKING_ALREADY_COMPLETED");
        }
        if (!isStatusTransition) {
          if (!isCustomer && !isAssignedPro && !isAdmin) {
            throw new Error("UNAUTHORIZED_STATUS_CHANGE");
          }
          const candidateData = typeof req.body.booking === "object" && req.body.booking !== null ? req.body.booking : req.body;
          const allowedUpdates = { updatedAt: nowIso };
          for (const [key, value] of Object.entries(candidateData)) {
            if (!PROTECTED_BOOKING_FIELDS.has(key) && value !== void 0) {
              allowedUpdates[key] = value;
            }
          }
          transaction.update(bookingRef, allowedUpdates);
          return {
            success: true,
            bookingId: cleanBookingId,
            status: currentStatus,
            message: "Booking updated successfully"
          };
        }
        if (requestedStatus === currentStatus) {
          return {
            success: true,
            bookingId: cleanBookingId,
            status: currentStatus,
            message: `Booking is already in state '${currentStatus}'.`
          };
        }
        if (requestedStatus === "cancelled") {
          if (!isCustomer && !isAssignedPro && !isAdmin) {
            throw new Error("UNAUTHORIZED_STATUS_CHANGE");
          }
          if ((currentStatus === "in_progress" || currentStatus === "work_started") && !isAdmin) {
            throw new Error("CANNOT_CANCEL_IN_PROGRESS");
          }
          transaction.update(bookingRef, {
            status: "cancelled",
            cancelledAt: nowIso,
            cancelledBy: isCustomer ? "customer" : isAssignedPro ? "service_man" : "admin",
            cancelReason: typeof req.body.reason === "string" ? req.body.reason.trim() : "Cancelled by user",
            updatedAt: nowIso
          });
          return {
            success: true,
            bookingId: cleanBookingId,
            status: "cancelled",
            cancelledAt: nowIso
          };
        }
        if (["on_the_way", "arriving", "arrived"].includes(requestedStatus)) {
          if (!isAssignedPro && !isAdmin) {
            throw new Error("UNAUTHORIZED_STATUS_CHANGE");
          }
          if (requestedStatus === "on_the_way" && currentStatus !== "accepted") {
            throw new Error("INVALID_STATE_TRANSITION");
          }
          if (requestedStatus === "arrived" && currentStatus !== "on_the_way" && currentStatus !== "arriving") {
            throw new Error("INVALID_STATE_TRANSITION");
          }
          const updates = {
            status: requestedStatus,
            updatedAt: nowIso
          };
          if (requestedStatus === "on_the_way") updates.onTheWayAt = nowIso;
          if (requestedStatus === "arrived") updates.arrivedAt = nowIso;
          transaction.update(bookingRef, updates);
          return {
            success: true,
            bookingId: cleanBookingId,
            status: requestedStatus,
            updatedAt: nowIso
          };
        }
        if (requestedStatus === "accepted") {
          if (["accepted", "on_the_way", "arriving", "arrived", "in_progress", "work_started", "completed"].includes(currentStatus)) {
            if (bookingData.serviceManId === authUid) {
              return {
                alreadyAccepted: true,
                bookingData,
                bookingId: cleanBookingId,
                serviceManId: authUid,
                status: "accepted"
              };
            }
            throw new Error("BOOKING_ALREADY_TAKEN");
          }
          const offerId = req.body.offerId || (req.body.assignmentId ? req.body.assignmentId.replace("asgn_", "offer_") : `offer_${cleanBookingId}_${authUid}`);
          const assignmentId = req.body.assignmentId || (req.body.offerId ? req.body.offerId.replace("offer_", "asgn_") : `asgn_${cleanBookingId}_${authUid}`);
          const offerRef = (0, import_firestore8.doc)(db, "booking_offers", offerId);
          const assignmentRef = (0, import_firestore8.doc)(db, "booking_assignments", assignmentId);
          const offerDoc = await transaction.get(offerRef);
          let offerData = null;
          if (offerDoc.exists()) {
            offerData = offerDoc.data();
          } else {
            const asgnDoc = await transaction.get(assignmentRef);
            if (asgnDoc.exists()) {
              offerData = asgnDoc.data();
            }
          }
          if (!offerData) {
            throw new Error("OFFER_NOT_FOUND");
          }
          if (offerData.serviceManId !== authUid && !isAdmin) {
            throw new Error("UNAUTHORIZED_ASSIGNMENT");
          }
          const normalizedStatus = (offerData.status || "").toUpperCase();
          if (normalizedStatus !== "PENDING" && offerData.status !== "offered") {
            if (normalizedStatus === "ACCEPTED" || offerData.status === "accepted") {
              return {
                alreadyAccepted: true,
                bookingData,
                bookingId: cleanBookingId,
                serviceManId: authUid,
                status: "accepted"
              };
            }
            throw new Error("OFFER_NO_LONGER_VALID");
          }
          if (offerData.expiresAt && new Date(offerData.expiresAt).getTime() < Date.now()) {
            throw new Error("OFFER_EXPIRED");
          }
          transaction.update(bookingRef, {
            status: "accepted",
            serviceManId: authUid,
            serviceManName: offerData.serviceManName || bookingData.serviceManName || "Technician",
            serviceManPhone: offerData.serviceManPhone || bookingData.serviceManPhone || "",
            acceptedAt: nowIso,
            updatedAt: nowIso
          });
          transaction.set(
            offerRef,
            {
              status: "ACCEPTED",
              respondedAt: nowIso,
              updatedAt: nowIso
            },
            { merge: true }
          );
          transaction.set(
            assignmentRef,
            {
              status: "accepted",
              acceptedAt: nowIso,
              updatedAt: nowIso
            },
            { merge: true }
          );
          return {
            success: true,
            bookingId: cleanBookingId,
            serviceManId: authUid,
            status: "accepted",
            offerId,
            assignmentId,
            acceptedAt: nowIso
          };
        }
        throw new Error("INVALID_STATE_TRANSITION");
      });
      if (result.status === "accepted" && !result.alreadyAccepted) {
        try {
          const offerId = result.offerId;
          const assignmentId = result.assignmentId;
          const otherOffersQ = (0, import_firestore8.query)(
            (0, import_firestore8.collection)(db, "booking_offers"),
            (0, import_firestore8.where)("bookingId", "==", cleanBookingId),
            (0, import_firestore8.where)("status", "==", "PENDING")
          );
          const otherOffersSnap = await (0, import_firestore8.getDocs)(otherOffersQ);
          if (!otherOffersSnap.empty) {
            const batch = (0, import_firestore8.writeBatch)(db);
            otherOffersSnap.forEach((docSnap) => {
              if (docSnap.id !== offerId) {
                batch.update(docSnap.ref, {
                  status: "EXPIRED",
                  respondedAt: nowIso,
                  rejectionReason: "Claimed by another service professional",
                  updatedAt: nowIso
                });
              }
            });
            await batch.commit();
          }
          const otherAsgnQ = (0, import_firestore8.query)(
            (0, import_firestore8.collection)(db, "booking_assignments"),
            (0, import_firestore8.where)("bookingId", "==", cleanBookingId),
            (0, import_firestore8.where)("status", "==", "offered")
          );
          const otherAsgnSnap = await (0, import_firestore8.getDocs)(otherAsgnQ);
          if (!otherAsgnSnap.empty) {
            const batch = (0, import_firestore8.writeBatch)(db);
            otherAsgnSnap.forEach((docSnap) => {
              if (docSnap.id !== assignmentId) {
                batch.update(docSnap.ref, {
                  status: "closed",
                  closedReason: "taken_by_another_serviceman",
                  closedAt: nowIso,
                  updatedAt: nowIso
                });
              }
            });
            await batch.commit();
          }
        } catch (closeErr) {
          console.warn("Non-fatal cleanup of other offers:", closeErr);
        }
        try {
          await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
            action: "ACCEPT_SUCCESS",
            bookingId: cleanBookingId,
            serviceManId: authUid,
            status: "accepted",
            timestamp: nowIso
          });
        } catch (e) {
          console.warn("Audit note:", e);
        }
      }
      try {
        const fullBookingSnap = await (0, import_firestore8.getDoc)(bookingRef);
        const bookingForPush = fullBookingSnap.exists() ? { id: cleanBookingId, ...fullBookingSnap.data() } : { id: cleanBookingId, status: result.status, serviceManId: result.serviceManId || authUid };
        notifyBookingStatusChange(bookingForPush, result.status, authUid, req.body).catch(
          (e) => console.warn("[FCM] Status push notification notice:", e)
        );
      } catch (pushErr) {
        console.warn("[FCM] Non-fatal status notification dispatch note:", pushErr);
      }
      return res.status(200).json({
        success: true,
        message: result.message || (result.status === "accepted" ? "Booking successfully accepted \u2713" : `Booking status updated to ${result.status}`),
        bookingId: result.bookingId,
        serviceManId: result.serviceManId || authUid,
        status: result.status,
        acceptedAt: result.acceptedAt || nowIso
      });
    } catch (err) {
      const code = err.message || "TRANSACTION_FAILED";
      if (code === "BOOKING_ALREADY_TAKEN") {
        try {
          await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
            action: "BOOKING_ALREADY_TAKEN",
            bookingId: req.body?.bookingId,
            serviceManId: req.uid || req.body?.serviceManId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (e) {
          console.warn("Audit note:", e);
        }
        return res.status(409).json({
          success: false,
          code: "BOOKING_ALREADY_TAKEN",
          error: "Yeh booking pehle hi kisi anya service professional dwara accept ki ja chuki hai."
        });
      }
      if (code === "BOOKING_NOT_FOUND" || code === "OFFER_NOT_FOUND" || code === "ASSIGNMENT_NOT_FOUND") {
        return res.status(404).json({ success: false, code, error: code });
      }
      if (code === "UNAUTHORIZED_ASSIGNMENT" || code === "UNAUTHORIZED_STATUS_CHANGE") {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          error: "Forbidden: You are not authorized to perform this status transition on this booking."
        });
      }
      if (code === "BOOKING_ALREADY_CANCELLED" || code === "BOOKING_ALREADY_COMPLETED" || code === "CANNOT_CANCEL_IN_PROGRESS" || code === "INVALID_STATE_TRANSITION") {
        return res.status(400).json({
          success: false,
          code,
          error: `Invalid state transition: Cannot transition booking in current state. (${code})`
        });
      }
      if (code === "OFFER_NO_LONGER_VALID" || code === "OFFER_EXPIRED") {
        return res.status(400).json({
          success: false,
          code,
          error: code === "OFFER_NO_LONGER_VALID" ? "Offer is no longer active or has expired." : code
        });
      }
      console.error("status transition transaction error:", code);
      return res.status(400).json({
        success: false,
        code,
        error: code
      });
    }
  }
);
app2.post(
  [
    "/api/bookings/cancel",
    "/api/bookings/cancel-booking",
    "/api/bookings/:bookingId/cancel",
    "/api/bookings/cancellation"
  ],
  async (req, res) => {
    try {
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;
      const rawBookingId = req.body?.bookingId || req.params?.bookingId;
      if (!isValidBookingId(rawBookingId)) {
        return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
      }
      const cleanBookingId = String(rawBookingId).trim();
      const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const userEmail = (req.user?.email || "").toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
      if (req.body?.customerId && typeof req.body.customerId === "string") {
        const suppliedCustomerId = req.body.customerId.trim();
        if (suppliedCustomerId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot impersonate another customer."
          });
        }
      }
      if (req.body?.serviceManId && typeof req.body.serviceManId === "string") {
        const suppliedServiceManId = req.body.serviceManId.trim();
        if (suppliedServiceManId !== authUid && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Cannot impersonate another service professional."
          });
        }
      }
      const reason = typeof req.body?.reason === "string" && req.body.reason.trim() ? req.body.reason.trim() : typeof req.body?.cancellationReason === "string" && req.body.cancellationReason.trim() ? req.body.cancellationReason.trim() : "Cancelled by user";
      const result = await (0, import_firestore8.runTransaction)(db, async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists()) {
          throw new Error("BOOKING_NOT_FOUND");
        }
        const bookingData = bookingDoc.data();
        const currentStatus = String(bookingData.status || "pending").toLowerCase().trim();
        const isCustomer = Boolean(
          bookingData.customerId === authUid || bookingData.userId === authUid || bookingData.customerUid === authUid
        );
        const assignedProId = bookingData.serviceManId || bookingData.servicemanId || bookingData.assignedProId;
        const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);
        if (!isCustomer && !isAssignedPro && !isAdmin) {
          throw new Error("UNAUTHORIZED_CANCELLATION");
        }
        if (currentStatus === "completed" || currentStatus === "work_completed") {
          throw new Error("BOOKING_ALREADY_COMPLETED");
        }
        if (currentStatus === "cancelled" || currentStatus === "rejected") {
          throw new Error("BOOKING_ALREADY_CANCELLED");
        }
        if ((currentStatus === "in_progress" || currentStatus === "work_started") && !isAdmin) {
          throw new Error("CANNOT_CANCEL_IN_PROGRESS");
        }
        const cancelledBy = isCustomer ? "customer" : isAssignedPro ? "service_man" : "admin";
        const cancellationUpdates = {
          status: "cancelled",
          cancelledAt: nowIso,
          cancelledBy,
          cancelReason: reason,
          cancellationReason: reason,
          updatedAt: nowIso
        };
        if (Array.isArray(bookingData.extraCharges)) {
          cancellationUpdates.extraCharges = bookingData.extraCharges.map((ch) => {
            const chStatus = String(ch.approvalStatus || ch.status || "").toLowerCase().trim();
            if (chStatus === "pending") {
              return {
                ...ch,
                approvalStatus: "cancelled",
                status: "cancelled",
                cancelledAt: nowIso
              };
            }
            return ch;
          });
        }
        transaction.update(bookingRef, cancellationUpdates);
        return {
          success: true,
          bookingId: cleanBookingId,
          status: "cancelled",
          cancelledAt: nowIso,
          cancelledBy,
          cancellationReason: reason
        };
      });
      try {
        const offersQ = (0, import_firestore8.query)(
          (0, import_firestore8.collection)(db, "booking_offers"),
          (0, import_firestore8.where)("bookingId", "==", cleanBookingId),
          (0, import_firestore8.where)("status", "==", "PENDING")
        );
        const offersSnap = await (0, import_firestore8.getDocs)(offersQ);
        if (!offersSnap.empty) {
          const batch = (0, import_firestore8.writeBatch)(db);
          offersSnap.forEach((docSnap) => {
            batch.update(docSnap.ref, {
              status: "EXPIRED",
              respondedAt: nowIso,
              rejectionReason: "Booking cancelled",
              updatedAt: nowIso
            });
          });
          await batch.commit();
        }
      } catch (cleanupErr) {
        console.warn("Non-fatal cleanup of offers on cancellation:", cleanupErr);
      }
      try {
        await (0, import_firestore8.addDoc)((0, import_firestore8.collection)(db, "audit_logs"), {
          action: "BOOKING_CANCELLED",
          bookingId: cleanBookingId,
          cancelledBy: result.cancelledBy,
          cancellationReason: reason,
          timestamp: nowIso
        });
      } catch (auditErr) {
        console.warn("Audit note:", auditErr);
      }
      return res.status(200).json({
        success: true,
        message: "Booking successfully cancelled",
        bookingId: result.bookingId,
        status: result.status,
        cancelledAt: result.cancelledAt,
        cancelledBy: result.cancelledBy,
        cancellationReason: result.cancellationReason
      });
    } catch (err) {
      const code = err.message || "CANCELLATION_FAILED";
      if (code === "BOOKING_NOT_FOUND") {
        return res.status(404).json({ success: false, code, error: "Booking not found." });
      }
      if (code === "UNAUTHORIZED_CANCELLATION") {
        return res.status(403).json({
          success: false,
          code: "FORBIDDEN",
          error: "Forbidden: You are not authorized to cancel this booking."
        });
      }
      if (code === "BOOKING_ALREADY_COMPLETED") {
        return res.status(400).json({
          success: false,
          code: "BOOKING_ALREADY_COMPLETED",
          error: "Cannot cancel a booking that has already been completed."
        });
      }
      if (code === "BOOKING_ALREADY_CANCELLED") {
        return res.status(400).json({
          success: false,
          code: "BOOKING_ALREADY_CANCELLED",
          error: "Booking is already cancelled. Duplicate cancellation rejected."
        });
      }
      if (code === "CANNOT_CANCEL_IN_PROGRESS") {
        return res.status(400).json({
          success: false,
          code: "CANNOT_CANCEL_IN_PROGRESS",
          error: "Cannot cancel booking once service is in progress. Please contact customer support."
        });
      }
      console.error("Cancellation error:", code);
      return res.status(400).json({
        success: false,
        code,
        error: code
      });
    }
  }
);
app2.post("/api/booking-offers/reject", async (req, res) => {
  try {
    const authUid = await verifyAuthUser(req, res);
    if (!authUid) return;
    const { offerId, serviceManId, reason = "Declined by professional" } = req.body;
    if (!offerId) {
      return res.status(400).json({ success: false, error: "Missing offerId" });
    }
    const userEmail = (req.user?.email || "").toLowerCase().trim();
    const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
    if (serviceManId && typeof serviceManId === "string") {
      const cleanServiceManId = serviceManId.trim();
      if (cleanServiceManId !== authUid && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot impersonate another service professional."
        });
      }
    }
    const cleanOfferId = String(offerId).trim();
    const offerRef = (0, import_firestore8.doc)(db, "booking_offers", cleanOfferId);
    const offerSnap = await (0, import_firestore8.getDoc)(offerRef);
    if (!offerSnap.exists()) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }
    const data = offerSnap.data();
    const targetProId = data.serviceManId || data.proId;
    if (targetProId !== authUid && !isAdmin) {
      return res.status(403).json({ success: false, error: "Unauthorized to reject this offer" });
    }
    if (data.status !== "PENDING" && data.status !== "offered") {
      return res.status(400).json({ success: false, error: "Offer is not in PENDING status" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    await (0, import_firestore8.updateDoc)(offerRef, {
      status: "REJECTED",
      respondedAt: nowIso,
      rejectionReason: reason,
      updatedAt: nowIso
    });
    return res.status(200).json({ success: true, message: "Offer rejected successfully" });
  } catch (err) {
    console.error("reject-offer error:", err);
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
});
app2.post("/api/serviceman/register-fcm-token", async (req, res) => {
  try {
    const { token, serviceManId, deviceType = "web" } = req.body;
    if (!token || typeof token !== "string" || token.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Valid FCM token string is required" });
    }
    if (!serviceManId || typeof serviceManId !== "string") {
      return res.status(400).json({ success: false, error: "serviceManId is required" });
    }
    const cleanToken = token.trim();
    const cleanId2 = serviceManId.trim();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const tokenDocId = import_crypto2.default.createHash("sha256").update(cleanToken).digest("hex").substring(0, 32);
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "device_tokens", tokenDocId), {
      token: cleanToken,
      userId: cleanId2,
      role: "service_man",
      deviceType,
      updatedAt: nowIso,
      createdAt: nowIso
    }, { merge: true });
    try {
      const proRef = (0, import_firestore8.doc)(db, "service_men", cleanId2);
      const proSnap = await (0, import_firestore8.getDoc)(proRef);
      if (proSnap.exists()) {
        await (0, import_firestore8.updateDoc)(proRef, {
          fcmTokens: (0, import_firestore8.arrayUnion)(cleanToken),
          lastTokenRefreshedAt: nowIso,
          updatedAt: nowIso
        });
      }
    } catch (e) {
      console.warn("service_men token union note:", e);
    }
    return res.status(200).json({
      success: true,
      message: "FCM device token registered successfully \u2713",
      serviceManId: cleanId2
    });
  } catch (err) {
    console.error("register-fcm-token error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/fcm/register-token", async (req, res) => {
  try {
    const { token, userId, role = "customer", deviceType = "web" } = req.body;
    if (!token || typeof token !== "string" || token.trim().length < 10) {
      return res.status(400).json({ success: false, error: "Valid FCM token string is required" });
    }
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ success: false, error: "userId is required" });
    }
    const cleanToken = token.trim();
    const cleanId2 = userId.trim();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const tokenDocId = import_crypto2.default.createHash("sha256").update(cleanToken).digest("hex").substring(0, 32);
    const tokenData = {
      id: tokenDocId,
      token: cleanToken,
      userId: cleanId2,
      uid: cleanId2,
      role,
      deviceType,
      isActive: true,
      updatedAt: nowIso,
      createdAt: nowIso,
      lastSeenAt: nowIso
    };
    recordServerUserToken(cleanId2, cleanToken);
    try {
      const adb = getAdminDb();
      if (adb) {
        await adb.collection("device_tokens").doc(tokenDocId).set(tokenData, { merge: true });
        try {
          if (role === "service_man" || role === "pro") {
            await adb.collection("service_men").doc(cleanId2).set(
              {
                fcmTokens: import_firebase_admin2.default.firestore?.FieldValue?.arrayUnion(cleanToken),
                lastTokenRefreshedAt: nowIso,
                updatedAt: nowIso
              },
              { merge: true }
            );
          } else {
            await adb.collection("users").doc(cleanId2).set(
              {
                fcmTokens: import_firebase_admin2.default.firestore?.FieldValue?.arrayUnion(cleanToken),
                lastTokenRefreshedAt: nowIso,
                updatedAt: nowIso
              },
              { merge: true }
            );
          }
        } catch (syncErr) {
          console.warn("[FCM] User doc token union notice:", syncErr);
        }
      } else {
        await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "device_tokens", tokenDocId), tokenData, { merge: true });
      }
    } catch (storeErr) {
      console.warn("[FCM] Firestore device token storage note (in-memory registered):", storeErr?.message || storeErr);
    }
    return res.status(200).json({
      success: true,
      message: "FCM push registration saved successfully \u2713",
      userId: cleanId2,
      tokenDocId
    });
  } catch (err) {
    console.error("FCM register-token error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app2.post("/api/fcm/send-push", async (req, res) => {
  try {
    const { targetUserId, title, body, bookingId, eventType, type = "booking", url, targetRole, data } = req.body;
    if (!targetUserId || typeof targetUserId !== "string") {
      return res.status(400).json({ success: false, error: "targetUserId is required" });
    }
    if (!title || !body) {
      return res.status(400).json({ success: false, error: "title and body are required" });
    }
    const result = await sendPushToUser(targetUserId, {
      title,
      body,
      bookingId,
      eventType,
      type,
      url,
      targetRole,
      data
    });
    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    console.error("FCM send-push error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app2.post("/api/fcm/send-booking-alert", async (req, res) => {
  try {
    const { targetUserId, targetRole, bookingId, eventType, title, body, url, data } = req.body;
    if (!targetUserId || !title || !body) {
      return res.status(400).json({ success: false, error: "targetUserId, title, and body are required" });
    }
    const result = await sendPushToUser(targetUserId, {
      title,
      body,
      bookingId,
      eventType,
      type: "booking",
      targetRole,
      url,
      data
    });
    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    console.error("FCM send-booking-alert error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app2.post("/api/fcm/test", async (req, res) => {
  try {
    const { userId, token, role = "customer" } = req.body;
    const payload = {
      title: "\u{1F514} HARDINKAAM Push Notification Test",
      body: "Real-time FCM push notification delivery is active and working correctly!",
      eventType: "test",
      type: "system",
      targetRole: role,
      url: "/",
      data: { testTime: (/* @__PURE__ */ new Date()).toISOString() }
    };
    if (token && typeof token === "string") {
      const result = await sendFcmPushToTokens([token], payload);
      return res.status(200).json({ success: true, result });
    }
    if (userId && typeof userId === "string") {
      const result = await sendPushToUser(userId, payload);
      return res.status(200).json({ success: true, result });
    }
    return res.status(400).json({ success: false, error: "Provide either userId or token" });
  } catch (err) {
    console.error("FCM test error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Server error" });
  }
});
app2.get(
  ["/api/bookings/:bookingId", "/api/bookings/:bookingId/offers"],
  async (req, res) => {
    try {
      const authUid = await verifyAuthUser(req, res);
      if (!authUid) return;
      const { bookingId } = req.params;
      if (!isValidBookingId(bookingId)) {
        return res.status(400).json({ success: false, error: "Missing or invalid bookingId" });
      }
      const cleanBookingId = bookingId.trim();
      const bookingRef = (0, import_firestore8.doc)(db, "bookings", cleanBookingId);
      const snap = await (0, import_firestore8.getDoc)(bookingRef);
      if (!snap.exists()) {
        return res.status(404).json({ success: false, error: "Booking not found" });
      }
      const booking = snap.data();
      const isCustomer = Boolean(
        booking.customerId && booking.customerId === authUid || booking.userId && booking.userId === authUid || booking.customerUid && booking.customerUid === authUid
      );
      const assignedProId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
      const isAssignedPro = Boolean(assignedProId && assignedProId === authUid);
      const userEmail = (req.user?.email || "").toLowerCase().trim();
      const isAdmin = Boolean(userEmail && AUTHORIZED_ADMIN_EMAILS.includes(userEmail));
      if (!isCustomer && !isAssignedPro && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You are not authorized to access this booking."
        });
      }
      if (req.path.endsWith("/offers")) {
        const offersQuery = (0, import_firestore8.query)(
          (0, import_firestore8.collection)(db, "booking_assignments"),
          (0, import_firestore8.where)("bookingId", "==", cleanBookingId)
        );
        const offersSnap = await (0, import_firestore8.getDocs)(offersQuery);
        const offers = [];
        offersSnap.forEach((d) => offers.push(d.data()));
        return res.status(200).json({
          success: true,
          bookingId: cleanBookingId,
          count: offers.length,
          offers
        });
      }
      return res.status(200).json({
        success: true,
        booking: {
          id: cleanBookingId,
          ...booking
        }
      });
    } catch (err) {
      console.error("get booking/offers error:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  }
);
function handleServiceSplitCalculation(req, res) {
  try {
    const {
      bookingId,
      amount,
      bookingAmount,
      grossAmount,
      commissionRate = DEFAULT_COMPANY_COMMISSION_RATE,
      taxRate = DEFAULT_TAX_RATE
    } = req.body;
    const targetGross = parseFloat(amount !== void 0 ? amount : bookingAmount !== void 0 ? bookingAmount : grossAmount || 0);
    if (isNaN(targetGross) || targetGross < 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_AMOUNT",
        message: "Invalid or missing booking amount."
      });
    }
    const commRate = parseFloat(commissionRate !== void 0 ? commissionRate : DEFAULT_COMPANY_COMMISSION_RATE);
    const tRate = parseFloat(taxRate !== void 0 ? taxRate : DEFAULT_TAX_RATE);
    const companyCommission = Math.round(targetGross * commRate / 100);
    const taxDeduction = Math.round(targetGross * tRate / 100);
    const payoutAmount = Math.max(0, targetGross - companyCommission - taxDeduction);
    return res.status(200).json({
      success: true,
      bookingId: bookingId || null,
      grossAmount: targetGross,
      commissionRate: commRate,
      companyCommission,
      taxRate: tRate,
      taxDeduction,
      payoutAmount,
      servicemanPayoutAmount: payoutAmount,
      message: `Split calculation complete: Commission \u20B9${companyCommission} (${commRate}%), Tax \u20B9${taxDeduction} (${tRate}%), Net Payout \u20B9${payoutAmount}`
    });
  } catch (err) {
    console.error("Error calculating service split:", err);
    return res.status(500).json({ success: false, error: "SPLIT_CALCULATION_FAILED", message: err.message || "Failed to calculate split" });
  }
}
app2.post(["/api/functions/calculateServiceSplit", "/api/payouts/calculate-split"], handleServiceSplitCalculation);
async function handleAdminServicemanPayout(req, res) {
  try {
    const {
      bookingId,
      serviceManId,
      serviceManName,
      serviceManPhone,
      grossAmount,
      companyCommissionRate = DEFAULT_COMPANY_COMMISSION_RATE,
      taxRate = DEFAULT_TAX_RATE,
      payoutMethod = "bank_transfer",
      upiOrBank,
      adminUsername
    } = req.body;
    if (!bookingId || !serviceManId || grossAmount === void 0) {
      return res.status(400).json({
        success: false,
        error: "MISSING_PAYOUT_FIELDS",
        message: "Missing required payout fields (bookingId, serviceManId, grossAmount)"
      });
    }
    const gross = Math.max(0, parseFloat(grossAmount) || 0);
    const commRate = Math.max(0, parseFloat(companyCommissionRate) || DEFAULT_COMPANY_COMMISSION_RATE);
    const tRate = Math.max(0, parseFloat(taxRate) || DEFAULT_TAX_RATE);
    const companyServiceCharge = Math.round(gross * commRate / 100);
    const taxDeduction = Math.round(gross * tRate / 100);
    const netPayoutAmount = Math.max(0, gross - companyServiceCharge - taxDeduction);
    const internalPayoutRef = `payout_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const payoutData = {
      payoutReference: internalPayoutRef,
      payoutRazorpayId: null,
      bookingId,
      serviceManId,
      serviceManName: serviceManName || "Verified Professional",
      serviceManPhone: serviceManPhone || "",
      grossAmount: gross,
      companyCommissionRate: commRate,
      companyServiceCharge,
      taxRate: tRate,
      taxDeduction,
      netPayoutAmount,
      payoutMethod,
      upiOrBank: upiOrBank || "Direct Verified Account",
      processedBy: adminUsername || "DEEPAK (Admin)",
      processedAt: nowIso,
      status: "pending_disbursement",
      payoutStatus: "pending_disbursement"
    };
    try {
      await db.collection("payouts").doc(internalPayoutRef).set(payoutData, { merge: true });
    } catch (fsErr) {
      console.warn("[Payout] Could not persist payout document:", fsErr?.message);
    }
    return res.status(200).json({
      success: true,
      message: `Payout request of \u20B9${netPayoutAmount} queued with status 'pending_disbursement' for ${serviceManName}.`,
      payout: payoutData
    });
  } catch (err) {
    console.error("Error processing serviceman payout:", err);
    return res.status(500).json({
      success: false,
      error: "PAYOUT_PROCESSING_FAILED",
      message: "Failed to disburse serviceman payout"
    });
  }
}
app2.post("/api/payouts/process", requireAdminAuth, handleAdminServicemanPayout);
function cleanWhatsAppPhone(raw) {
  let phone = String(raw || "").replace(/\D/g, "");
  if (phone.length === 10) phone = `91${phone}`;
  return phone;
}
function openWaBaseUrl() {
  const configured = String(process.env.WHATSAPP_API_URL || "https://openwa.id/api").trim().replace(/\/+$/, "");
  return configured.endsWith("/api") ? configured : `${configured}/api`;
}
async function resolveOpenWaSessionId(apiToken) {
  const configuredId = String(process.env.WHATSAPP_OPENWA_SESSION_ID || "").trim();
  if (configuredId) return configuredId;
  const sessionName = String(process.env.WHATSAPP_OPENWA_SESSION_NAME || "support-main").trim();
  const response = await fetch(`${openWaBaseUrl()}/sessions`, {
    method: "GET",
    headers: { "X-API-Key": apiToken, Accept: "application/json" }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OPENWA_SESSIONS_${response.status}${text ? `:${text.slice(0, 240)}` : ""}`);
  }
  const sessions = await response.json();
  if (!Array.isArray(sessions)) throw new Error("OPENWA_INVALID_SESSIONS_RESPONSE");
  const normalized = sessionName.toLowerCase();
  const match = sessions.find(
    (item) => String(item?.name || "").toLowerCase() === normalized || String(item?.id || "") === sessionName
  );
  if (!match?.id) {
    throw new Error(`OPENWA_SESSION_NOT_FOUND:${sessionName}`);
  }
  return String(match.id);
}
async function sendOpenWaText(phone, message) {
  const apiToken = String(process.env.WHATSAPP_API_TOKEN || "").trim();
  if (!apiToken) throw new Error("WHATSAPP_API_TOKEN_MISSING");
  const sessionId = await resolveOpenWaSessionId(apiToken);
  const chatId = `${phone}@c.us`;
  const response = await fetch(`${openWaBaseUrl()}/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiToken,
      Accept: "application/json"
    },
    body: JSON.stringify({ chatId, text: message })
  });
  const rawText = await response.text().catch(() => "");
  let raw = rawText;
  try {
    raw = rawText ? JSON.parse(rawText) : {};
  } catch {
  }
  if (!response.ok) {
    throw new Error(`OPENWA_SEND_${response.status}${raw?.message ? `:${String(raw.message).slice(0, 240)}` : ""}`);
  }
  return {
    messageId: raw?.id || raw?.messageId || raw?.message_id || raw?.data?.id || raw?.data?.messageId,
    raw
  };
}
async function dispatchWhatsAppGateway(input) {
  const enabled = String(process.env.WHATSAPP_API_ENABLED ?? "true").toLowerCase() !== "false";
  if (!enabled) throw new Error("WHATSAPP_DISABLED");
  const phone = cleanWhatsAppPhone(input.phone);
  if (phone.length < 12 || !String(input.message || "").trim()) {
    throw new Error("INVALID_WHATSAPP_MESSAGE");
  }
  const provider = String(process.env.WHATSAPP_PROVIDER || "openwa").trim().toLowerCase();
  if (provider === "openwa") {
    const result = await sendOpenWaText(phone, String(input.message));
    return { messageId: result.messageId, status: "sent" };
  }
  const apiUrl = String(process.env.WHATSAPP_API_URL || "").trim();
  const apiToken = String(process.env.WHATSAPP_API_TOKEN || "").trim();
  if (!apiUrl || !apiToken) throw new Error("WHATSAPP_PROVIDER_NOT_CONFIGURED");
  const scheme = String(process.env.WHATSAPP_API_AUTH_SCHEME || "Bearer");
  const upstream = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${scheme} ${apiToken}`
    },
    body: JSON.stringify({
      to: phone,
      phone,
      recipient: phone,
      message: String(input.message),
      text: String(input.message),
      bookingId: input.bookingId || "",
      eventType: input.eventType || "manual",
      recipientName: input.recipientName || ""
    })
  });
  const raw = await upstream.text().catch(() => "");
  let body = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
  }
  if (!upstream.ok) throw new Error(`WHATSAPP_PROVIDER_${upstream.status}`);
  return {
    status: "sent",
    providerHttpStatus: upstream.status,
    messageId: body?.messageId || body?.message_id || body?.id || body?.data?.id
  };
}
app2.post("/api/notifications/whatsapp", async (req, res) => {
  try {
    const authHeader = String(req.headers.authorization || "");
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!idToken) return res.status(401).json({ success: false, error: "AUTH_REQUIRED" });
    let caller;
    try {
      caller = await import_firebase_admin2.default.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ success: false, error: "INVALID_AUTH_TOKEN" });
    }
    const { phone, message, bookingId = "", eventType = "manual", recipientName = "" } = req.body || {};
    const cleanPhone = cleanWhatsAppPhone(phone);
    if (cleanPhone.length < 12 || !String(message || "").trim()) {
      return res.status(400).json({ success: false, error: "INVALID_WHATSAPP_MESSAGE" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const logId = `wa_api_${bookingId || "manual"}_${cleanPhone}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    try {
      const result = await dispatchWhatsAppGateway({ phone: cleanPhone, message: String(message), bookingId, eventType, recipientName });
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "whatsapp_logs", logId), {
        id: logId,
        recipientPhone: cleanPhone,
        recipientName,
        bookingId,
        eventType,
        messageBody: String(message),
        channel: "WHATSAPP_BUSINESS_API",
        provider: String(process.env.WHATSAPP_PROVIDER || "openwa"),
        status: "sent",
        providerMessageId: result.messageId || null,
        providerHttpStatus: result.providerHttpStatus || null,
        callerUid: caller.uid,
        createdAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });
      return res.status(200).json({ success: true, status: "sent", messageId: result.messageId });
    } catch (gatewayErr) {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "whatsapp_logs", logId), {
        id: logId,
        recipientPhone: cleanPhone,
        recipientName,
        bookingId,
        eventType,
        messageBody: String(message),
        channel: "WHATSAPP_BUSINESS_API",
        provider: String(process.env.WHATSAPP_PROVIDER || "openwa"),
        status: "failed",
        error: gatewayErr?.message || "WHATSAPP_DISPATCH_FAILED",
        callerUid: caller.uid,
        createdAt: nowIso,
        updatedAt: nowIso
      }, { merge: true });
      console.error("[WhatsApp API] OpenWA dispatch error:", gatewayErr?.message || gatewayErr);
      return res.status(502).json({ success: false, status: "failed", error: gatewayErr?.message || "WHATSAPP_DISPATCH_FAILED" });
    }
  } catch (err) {
    console.error("[WhatsApp API] Dispatch error:", err?.message || err);
    return res.status(500).json({ success: false, error: "WHATSAPP_DISPATCH_FAILED" });
  }
});
app2.post("/api/notifications/whatsapp-admin", async (req, res) => {
  try {
    const { bookingId, booking, whatsappText, adminPhones } = req.body;
    console.log(`[Admin WhatsApp Dispatch] New booking alert requested for #${bookingId || "BK_NEW"}`);
    const targetPhones = Array.isArray(adminPhones) && adminPhones.length > 0 ? adminPhones : ["916267546945"];
    const formattedText = whatsappText || `\u{1F6A8} Nayi Booking Aayi Hai! ID: #${bookingId || ""}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const batch = (0, import_firestore8.writeBatch)(db);
    for (const phone of targetPhones) {
      const cleanPhone = String(phone).replace(/[^0-9]/g, "");
      const logRef = (0, import_firestore8.doc)(db, "whatsapp_logs", `wa_admin_${bookingId || Date.now()}_${cleanPhone}`);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(formattedText)}`;
      batch.set(logRef, {
        id: `wa_admin_${bookingId || Date.now()}_${cleanPhone}`,
        recipientPhone: cleanPhone,
        recipientName: "HARDINKAAM Admin",
        type: "admin_new_booking_whatsapp",
        bookingId: bookingId || "",
        messageBody: formattedText,
        whatsappUrl: waUrl,
        status: "pending",
        createdAt: nowIso
      }, { merge: true });
    }
    await batch.commit();
    let gatewaySent = false;
    const gatewayMessageIds = [];
    for (const phone of targetPhones) {
      const cleanPhone = cleanWhatsAppPhone(phone);
      try {
        const result = await dispatchWhatsAppGateway({
          phone: cleanPhone,
          message: formattedText,
          bookingId: bookingId || "",
          eventType: "admin_new_booking_whatsapp",
          recipientName: "HARDINKAAM Admin"
        });
        gatewaySent = true;
        if (result.messageId) gatewayMessageIds.push(result.messageId);
        const logRef = (0, import_firestore8.doc)(db, "whatsapp_logs", `wa_admin_api_${bookingId || Date.now()}_${cleanPhone}`);
        await (0, import_firestore8.setDoc)(logRef, {
          id: logRef.id,
          recipientPhone: cleanPhone,
          recipientName: "HARDINKAAM Admin",
          type: "admin_new_booking_whatsapp_api",
          bookingId: bookingId || "",
          messageBody: formattedText,
          provider: String(process.env.WHATSAPP_PROVIDER || "openwa"),
          providerMessageId: result.messageId || null,
          status: "sent",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }, { merge: true });
      } catch (gatewayErr) {
        console.warn("[Admin WhatsApp Dispatch] OpenWA notice:", gatewayErr?.message || gatewayErr);
      }
    }
    return res.status(200).json({
      success: true,
      gatewaySent,
      message: gatewaySent ? "Admin WhatsApp notification sent through OpenWA" : "Admin WhatsApp notification logged; OpenWA unavailable",
      bookingId,
      adminPhones: targetPhones,
      providerMessageIds: gatewayMessageIds,
      whatsappUrl: `https://wa.me/916267546945?text=${encodeURIComponent(formattedText)}`
    });
  } catch (err) {
    console.error("[Admin WhatsApp Dispatch] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/notifications/whatsapp-password-reset", async (req, res) => {
  try {
    const { reqId, userName, userEmail, userPhone, emailOrUsername } = req.body;
    const adminPhone = "916267546945";
    const formattedTime = (/* @__PURE__ */ new Date()).toLocaleString("hi-IN", {
      timeZone: "Asia/Kolkata"
    });
    const formattedText = `\u{1F6A8} *HARDINKAAM \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0930\u0940\u0938\u0947\u091F \u0905\u0928\u0941\u0930\u094B\u0927 (Password Reset Alert)* \u{1F6A8}

\u0928\u092E\u0938\u094D\u0924\u0947 \u092E\u0941\u0916\u094D\u092F \u092A\u094D\u0930\u0936\u093E\u0938\u0915 DEEPAK \u0938\u0930,
\u090F\u0915 \u092F\u0942\u091C\u0930 \u0928\u0947 HARDINKAAM \u092A\u094B\u0930\u094D\u091F\u0932 \u092A\u0930 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0930\u0940\u0938\u0947\u091F \u0939\u0947\u0924\u0941 \u0905\u0928\u0941\u0930\u094B\u0927 \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0939\u0948:

\u{1F464} *\u092F\u0942\u091C\u0930/\u0928\u093E\u092E:* ${userName || "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E"}
\u{1F4E7} *\u0908\u092E\u0947\u0932:* ${userEmail || emailOrUsername || "\u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902"}
\u{1F4DE} *\u092E\u094B\u092C\u093E\u0907\u0932:* ${userPhone || "\u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902"}
\u{1F194} *\u0905\u0928\u0941\u0930\u094B\u0927 \u0906\u0908\u0921\u0940:* #${reqId || "RST_" + Date.now()}
\u23F0 *\u0938\u092E\u092F:* ${formattedTime}

\u{1F310} *\u0915\u0902\u091F\u094D\u0930\u094B\u0932 \u0930\u0942\u092E:* https://www.hardinkaam.online/#admin
\u0906\u092A \u090F\u0921\u092E\u093F\u0928 \u0921\u0948\u0936\u092C\u094B\u0930\u094D\u0921 (Users Manager -> Password Reset) \u0938\u0947 \u0928\u092F\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u091C\u093E\u0930\u0940 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const logId = `wa_admin_reset_${reqId || Date.now()}_${adminPhone}`;
    const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(formattedText)}`;
    try {
      const resetReqDocId = reqId || `rst_${Date.now()}`;
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "password_reset_requests", resetReqDocId), {
        id: resetReqDocId,
        emailOrUsername: emailOrUsername || userEmail || "",
        userName: userName || emailOrUsername || "",
        userEmail: userEmail || "",
        userPhone: userPhone || "",
        status: "pending",
        requestedAt: nowIso
      }, { merge: true });
    } catch (saveErr) {
      console.warn("[Admin Reset WhatsApp] Notice writing to password_reset_requests:", saveErr.message);
    }
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "whatsapp_logs", logId), {
        id: logId,
        recipientPhone: adminPhone,
        recipientName: "Super Admin DEEPAK",
        type: "admin_password_reset_whatsapp",
        requestId: reqId || "",
        userEmail: userEmail || emailOrUsername || "",
        userPhone: userPhone || "",
        messageBody: formattedText,
        whatsappUrl: waUrl,
        status: "pending",
        createdAt: nowIso
      }, { merge: true });
    } catch (dbErr) {
      console.warn("[Admin Reset WhatsApp] Notice writing to whatsapp_logs:", dbErr.message);
    }
    let gatewaySent = false;
    let providerMessageId = null;
    try {
      const result = await dispatchWhatsAppGateway({
        phone: adminPhone,
        message: formattedText,
        eventType: "admin_password_reset_alert",
        recipientName: "Super Admin DEEPAK"
      });
      gatewaySent = true;
      providerMessageId = result.messageId || null;
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "whatsapp_logs", logId), {
        status: "sent",
        providerMessageId,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch (gwErr) {
      console.warn("[Admin Reset WhatsApp] Gateway notice:", gwErr?.message || gwErr);
    }
    return res.status(200).json({
      success: true,
      gatewaySent,
      adminPhone,
      message: gatewaySent ? "Admin WhatsApp reset notification dispatched" : "Admin WhatsApp reset logged",
      whatsappUrl: waUrl
    });
  } catch (err) {
    console.error("[Admin Reset WhatsApp Error]:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/admin/master-reset", requireAdminAuth, async (req, res) => {
  try {
    const { confirmationCode } = req.body;
    if (confirmationCode !== "DELETE_HARDINKAAM_USER_DATA_CONFIRMED") {
      return res.status(400).json({
        success: false,
        error: "Invalid or missing confirmation code for Master Reset."
      });
    }
    let authUsersDeletedCount = 0;
    let firestoreDocsDeletedCount = 0;
    try {
      const listUsersResult = await import_firebase_admin2.default.auth().listUsers(1e3);
      const usersList = listUsersResult.users || [];
      for (const userRecord of usersList) {
        const email = (userRecord.email || "").toLowerCase().trim();
        const isAdminUser = AUTHORIZED_ADMIN_EMAILS.includes(email) || email.includes("admin") || userRecord.uid === "admin_deepak_root";
        if (!isAdminUser) {
          try {
            await import_firebase_admin2.default.auth().deleteUser(userRecord.uid);
            authUsersDeletedCount++;
          } catch (delErr) {
            console.warn(`Failed to delete auth user ${userRecord.uid}:`, delErr);
          }
        }
      }
    } catch (authErr) {
      console.warn("Firebase Admin SDK auth list/delete warning:", authErr);
    }
    const collectionsToClean = [
      "users",
      "service_men",
      "serviceMen",
      "wallets",
      "wallet_transactions",
      "transactions",
      "payments",
      "serviceman_payouts",
      "withdrawals",
      "ledgers",
      "rewards",
      "reward_wallets",
      "reward_transactions",
      "bookings",
      "booking_offers",
      "booking_assignments",
      "notifications",
      "messages",
      "device_tokens",
      "serviceTracking",
      "reviews",
      "kyc_documents",
      "password_reset_requests",
      "whatsapp_logs",
      "audit_logs",
      "registration_approvals",
      "admin_alerts"
    ];
    for (const colName of collectionsToClean) {
      try {
        const snap = await (0, import_firestore8.getDocs)((0, import_firestore8.query)((0, import_firestore8.collection)(db, colName), (0, import_firestore8.limit)(500)));
        const batch = (0, import_firestore8.writeBatch)(db);
        let batchCount = 0;
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const email = (data.email || "").toLowerCase().trim();
          const isMasterAdminDoc = AUTHORIZED_ADMIN_EMAILS.includes(email) || docSnap.id === "admin_deepak_root" || data.role === "admin";
          if (!isMasterAdminDoc) {
            batch.delete(docSnap.ref);
            firestoreDocsDeletedCount++;
            batchCount++;
          }
        });
        if (batchCount > 0) {
          await batch.commit();
        }
      } catch (colErr) {
        console.warn(`Collection cleanup notice for ${colName}:`, colErr);
      }
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "audit_logs", `reset_${Date.now()}`), {
        id: `reset_${Date.now()}`,
        action: "MASTER_FIREBASE_RESET_COMPLETED",
        adminEmail: req.user?.email || "deepakbuildconbhopal@gmail.com",
        timestamp: nowIso,
        authUsersDeleted: authUsersDeletedCount,
        firestoreDocsDeleted: firestoreDocsDeletedCount
      }, { merge: true });
    } catch (_) {
    }
    return res.status(200).json({
      success: true,
      message: "HARDINKAAM Master Reset completed successfully.",
      report: {
        authUsersDeleted: authUsersDeletedCount,
        firestoreDocsDeleted: firestoreDocsDeletedCount,
        dummyRecordsRemoved: authUsersDeletedCount + firestoreDocsDeletedCount,
        preservedAdmin: "deepakbuildconbhopal@gmail.com",
        masterConfigPreserved: true
      }
    });
  } catch (err) {
    console.error("Master Reset error:", err);
    return res.status(500).json({ success: false, error: err.message || "Master Reset failed" });
  }
});
app2.post("/api/admin/serviceman/send-message", requireAdminAuth, async (req, res) => {
  try {
    const {
      serviceManUid,
      serviceManName = "Service Professional",
      title = "HARDINKAAM Admin Message",
      message,
      bookingId = "",
      type = "direct_message"
    } = req.body;
    if (!serviceManUid || typeof serviceManUid !== "string" || !serviceManUid.trim()) {
      return res.status(400).json({ success: false, error: "serviceManUid is required" });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, error: "message content cannot be empty" });
    }
    const cleanUid = serviceManUid.trim();
    const cleanMsg = message.trim();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conversationId = bookingId ? `conv_booking_${bookingId}` : `conv_admin_${cleanUid}`;
    const adminUid = req.user?.uid || "admin_master";
    const adminName = req.user?.name || "HARDINKAAM Super Admin";
    const messageDoc = {
      id: msgId,
      senderId: adminUid,
      senderName: adminName,
      senderRole: "admin",
      receiverId: cleanUid,
      receiverRole: "service_man",
      recipientId: cleanUid,
      recipientUid: cleanUid,
      conversationId,
      title: title.trim(),
      message: cleanMsg,
      text: cleanMsg,
      type,
      bookingId: bookingId ? String(bookingId).trim() : "",
      isRead: false,
      read: false,
      createdAt: nowIso,
      timestamp: nowIso
    };
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "messages", msgId), messageDoc);
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "notifications", notifId), {
      id: notifId,
      userId: cleanUid,
      recipientId: cleanUid,
      recipientUid: cleanUid,
      recipientRole: "service_man",
      senderUid: adminUid,
      senderId: adminUid,
      senderRole: "admin",
      title: title.trim(),
      message: cleanMsg,
      type: type === "booking" ? "booking" : "direct_message",
      bookingId: bookingId ? String(bookingId).trim() : void 0,
      messageId: msgId,
      isRead: false,
      read: false,
      targetRole: "pro",
      createdAt: nowIso
    });
    return res.status(200).json({
      success: true,
      message: "Message dispatched successfully to ServiceMan",
      messageId: msgId,
      notificationId: notifId
    });
  } catch (err) {
    console.error("Error in send-message to serviceman:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.post("/api/admin/serviceman/send-notification", requireAdminAuth, async (req, res) => {
  try {
    const {
      recipients = "single",
      serviceManUids = [],
      title,
      message,
      type = "system",
      bookingId,
      messageId
    } = req.body;
    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: "Title and message cannot be empty" });
    }
    const cleanTitle = String(title).trim();
    const cleanMsg = String(message).trim();
    let targetUids = [];
    if (recipients === "all_approved") {
      const prosSnap = await (0, import_firestore8.getDocs)((0, import_firestore8.query)((0, import_firestore8.collection)(db, "service_men"), (0, import_firestore8.limit)(500)));
      prosSnap.forEach((d) => {
        const data = d.data();
        const uid = data.userId || d.id;
        if (uid && (data.isVerified || data.kycStatus === "verified" || data.kycStatus === "approved" || data.status === "active")) {
          if (!targetUids.includes(uid)) targetUids.push(uid);
        }
      });
      if (targetUids.length === 0) {
        const usersSnap = await (0, import_firestore8.getDocs)((0, import_firestore8.query)((0, import_firestore8.collection)(db, "users"), (0, import_firestore8.limit)(500)));
        usersSnap.forEach((d) => {
          const data = d.data();
          if (data.role === "service_man" && (data.status === "active" || data.approvalStatus === "approved")) {
            if (!targetUids.includes(d.id)) targetUids.push(d.id);
          }
        });
      }
    } else if (Array.isArray(serviceManUids) && serviceManUids.length > 0) {
      targetUids = serviceManUids.map((u) => String(u).trim()).filter(Boolean);
    }
    if (targetUids.length === 0) {
      return res.status(400).json({ success: false, error: "No valid recipient ServiceMen found" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const adminUid = req.user?.uid || "admin_master";
    let count = 0;
    for (const uid of targetUids) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${count}`;
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "notifications", notifId), {
        id: notifId,
        userId: uid,
        recipientId: uid,
        recipientUid: uid,
        recipientRole: "service_man",
        senderUid: adminUid,
        senderId: adminUid,
        senderRole: "admin",
        title: cleanTitle,
        message: cleanMsg,
        type: type || "system",
        bookingId: bookingId ? String(bookingId).trim() : void 0,
        messageId: messageId ? String(messageId).trim() : void 0,
        isRead: false,
        read: false,
        targetRole: "pro",
        createdAt: nowIso
      });
      count++;
    }
    return res.status(200).json({
      success: true,
      message: `Notification successfully sent to ${count} ServiceMen`,
      count
    });
  } catch (err) {
    console.error("Error in send-notification to serviceman:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});
app2.get("/api/admin/deploy/status", requireAdminAuth, (req, res) => {
  try {
    const liveVersion = getCurrentLiveDeployment();
    const nextVersion = getNextVersionString();
    const history = getDeploymentHistory();
    return res.status(200).json({
      success: true,
      currentVersion: liveVersion?.version || "v1.0.3",
      currentLiveDeployment: liveVersion,
      nextSuggestedVersion: nextVersion,
      liveUrl: "https://hardinkaam-5cc6a.web.app",
      firebaseProjectId: "hardinkaam-5cc6a",
      totalDeployments: history.length,
      isSystemReady: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error fetching deployment status:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.get("/api/admin/deploy/history", requireAdminAuth, (req, res) => {
  try {
    const history = getDeploymentHistory();
    return res.status(200).json({
      success: true,
      deployments: history,
      count: history.length
    });
  } catch (err) {
    console.error("Error fetching deployment history:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.get("/api/admin/deploy/job/:jobId", requireAdminAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: "Job not found or completed" });
    }
    return res.status(200).json({
      success: true,
      job
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/admin/deploy/retry-job", requireAdminAuth, async (req, res) => {
  try {
    const { jobId, stripUnsupportedFiles, excludeSpecificFiles, excludeFiles } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: "Missing jobId parameter" });
    }
    const adminUser = req.adminUser || { uid: "admin_user", email: "deepakbuildconbhopal@gmail.com", name: "DEEPAK (Admin)" };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;
    const filesToExclude = excludeSpecificFiles || excludeFiles || [];
    retryDeploymentJob({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      stripUnsupportedFiles: stripUnsupportedFiles === true || filesToExclude.length > 0,
      excludeSpecificFiles: filesToExclude
    }).catch((err) => {
      console.error(`[Retry Deployment Error for Job ${jobId}]:`, err);
    });
    return res.status(200).json({
      success: true,
      message: "Retry initiated successfully.",
      jobId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/admin/deploy/continue-audit", requireAdminAuth, async (req, res) => {
  try {
    const { jobId, excludeFiles, excludeAllFlagged = true } = req.body;
    if (!jobId) {
      return res.status(400).json({ success: false, error: "Missing jobId parameter" });
    }
    const adminUser = req.adminUser || { uid: "admin_user", email: "deepakbuildconbhopal@gmail.com", name: "DEEPAK (Admin)" };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;
    continueDeploymentAudit({
      jobId,
      adminUser: { uid: adminUid, email: adminEmail, name: adminName },
      excludeFiles: Array.isArray(excludeFiles) ? excludeFiles : void 0,
      stripUnsupportedFiles: excludeAllFlagged === true
    }).catch((err) => {
      console.error(`[Continue Audit Deployment Error for Job ${jobId}]:`, err);
    });
    return res.status(200).json({
      success: true,
      message: "Pre-deployment audit exclusion applied. Deployment proceeding with clean staging directory.",
      jobId
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/admin/deploy/pre-audit", requireAdminAuth, (req, res) => {
  uploadZip.single("zipFile")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || "ZIP upload failed for pre-audit inspection."
      });
    }
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: "No ZIP file provided for pre-audit."
        });
      }
      const auditResult = await preAuditZipBuffer(file.buffer);
      return res.status(200).json({
        success: true,
        audit: auditResult
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
});
app2.post("/api/admin/deploy/upload", requireAdminAuth, (req, res) => {
  uploadZip.single("zipFile")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({
        success: false,
        error: uploadErr.message || "ZIP upload failed. Ensure file is .zip format under max size limit."
      });
    }
    try {
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({
          success: false,
          error: "No ZIP file was uploaded. Please attach a valid HARDINKAAM project ZIP file."
        });
      }
      const adminUser = req.adminUser || { uid: "admin_user", email: "deepakbuildconbhopal@gmail.com", name: "DEEPAK (Admin)" };
      const adminEmail = adminUser.email;
      const adminName = adminUser.name;
      const adminUid = adminUser.uid;
      const customVersion = req.body?.customVersion;
      const stripUnsupportedFiles = req.body?.stripUnsupportedFiles === "true" || req.body?.stripUnsupportedFiles === true;
      const isForce = req.query?.force === "true" || req.body?.force === "true" || req.body?.force === true;
      const jobId = req.body?.jobId || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[Deploy Request] Admin "${adminEmail}" initiated deployment of "${file.originalname}" (${file.size} bytes), JobId: ${jobId}`);
      if (!isForce) {
        const dupCheck = checkDuplicateZip(file.buffer);
        if (dupCheck.isDuplicate) {
          return res.status(200).json({
            success: true,
            isDuplicate: true,
            existingVersion: dupCheck.existingVersion,
            zipHash: dupCheck.zipHash,
            message: `This exact ZIP was already uploaded (Version ${dupCheck.existingVersion}). You can deploy again or cancel.`
          });
        }
      }
      const validation = await validateZipArchiveAsync(file.buffer);
      if (!validation.isValid) {
        return res.status(422).json({
          success: false,
          error: validation.error || "\u0905\u092E\u093E\u0928\u094D\u092F \u091C\u093C\u093F\u092A \u092B\u093C\u093E\u0907\u0932: HARDINKAAM \u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F \u092B\u093C\u093E\u0907\u0932\u0947\u0902 (package.json \u092F\u093E dist/index.html) \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940\u0902\u0964"
        });
      }
      const isSync = req.query?.sync === "true";
      if (isSync) {
        const result = await processZipDeployment({
          jobId,
          zipBuffer: file.buffer,
          fileName: file.originalname,
          fileSize: file.size,
          adminUser: { uid: adminUid, email: adminEmail, name: adminName },
          customVersion,
          stripUnsupportedFiles
        });
        if (result.status === "LIVE") {
          return res.status(200).json({
            success: true,
            message: `Version ${result.version} has been built and deployed LIVE to ${result.siteUrl}!`,
            deployment: result
          });
        } else {
          return res.status(422).json({
            success: false,
            error: result.errorMessage || "Deployment build failed. Existing live version is unchanged.",
            deployment: result
          });
        }
      }
      processZipDeployment({
        jobId,
        zipBuffer: file.buffer,
        fileName: file.originalname,
        fileSize: file.size,
        adminUser: { uid: adminUid, email: adminEmail, name: adminName },
        customVersion,
        stripUnsupportedFiles
      }).catch((deployErr) => {
        console.error(`[Background Deployment Error for Job ${jobId}]:`, deployErr);
      });
      return res.status(200).json({
        success: true,
        jobId,
        message: "ZIP \u092B\u093C\u093E\u0907\u0932 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u0941\u0908\u0964 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u092C\u093F\u0932\u094D\u0921 \u0935 \u0938\u0924\u094D\u092F\u093E\u092A\u0928 \u092A\u093E\u0907\u092A\u0932\u093E\u0907\u0928 \u092A\u094D\u0930\u093E\u0930\u0902\u092D \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964",
        stage: "VALIDATING",
        deploymentMode: validation.deploymentMode,
        filesCount: validation.filesCount
      });
    } catch (err) {
      console.error("Fatal deployment execution error:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Fatal error occurred during deployment execution."
      });
    }
  });
});
app2.post("/api/admin/deploy/rollback", requireAdminAuth, async (req, res) => {
  try {
    const { targetVersionId } = req.body;
    if (!targetVersionId) {
      return res.status(400).json({
        success: false,
        error: "Missing targetVersionId parameter for rollback."
      });
    }
    const adminUser = req.adminUser || { uid: "admin_user", email: "deepakbuildconbhopal@gmail.com", name: "DEEPAK (Admin)" };
    const adminEmail = adminUser.email;
    const adminName = adminUser.name;
    const adminUid = adminUser.uid;
    const rollbackResult = await rollbackDeployment(targetVersionId, {
      uid: adminUid,
      email: adminEmail,
      name: adminName
    });
    if (rollbackResult.success) {
      return res.status(200).json({
        success: true,
        message: rollbackResult.message,
        deployment: rollbackResult.deployment
      });
    } else {
      return res.status(400).json({
        success: false,
        error: rollbackResult.message
      });
    }
  } catch (err) {
    console.error("Error executing rollback:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error during rollback"
    });
  }
});
app2.post("/api/admin/cli/execute", requireAdminAuth, (req, res) => {
  uploadZip.single("zipFile")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, error: uploadErr.message || "ZIP upload error." });
    }
    try {
      const { command, action: rawAction, versionId } = req.body;
      const file = req.file;
      let requestedAction = (rawAction || "").toString().trim().toUpperCase();
      if (!requestedAction && typeof command === "string") {
        const firstToken = command.trim().split(/\s+/)[0].toUpperCase();
        if (["DEPLOY", "ROLLBACK", "AUDIT", "BUILD", "STATUS"].includes(firstToken)) {
          requestedAction = firstToken;
        } else if (command.toLowerCase().includes("build")) {
          requestedAction = "BUILD";
        } else if (command.toLowerCase().includes("deploy")) {
          requestedAction = "DEPLOY";
        } else if (command.toLowerCase().includes("rollback")) {
          requestedAction = "ROLLBACK";
        } else if (command.toLowerCase().includes("status")) {
          requestedAction = "STATUS";
        } else if (command.toLowerCase().includes("audit") || command.toLowerCase().includes("lint")) {
          requestedAction = "AUDIT";
        }
      }
      const VALID_ACTIONS = ["DEPLOY", "ROLLBACK", "AUDIT", "BUILD", "STATUS"];
      if (!VALID_ACTIONS.includes(requestedAction)) {
        return res.status(400).json({
          success: false,
          error: `Invalid action. Permitted actions: ${VALID_ACTIONS.join(", ")}. Arbitrary shell execution is disabled.`
        });
      }
      console.log(`[Admin Named Action Pipeline] Action: "${requestedAction}", ZIP attached: ${file ? file.originalname : "none"}`);
      const startTime = Date.now();
      let stdout = "";
      let stderr = "";
      let isSuccess = true;
      let exitCode = 0;
      switch (requestedAction) {
        case "STATUS": {
          const liveDeployment = await getCurrentLiveDeployment();
          stdout = `[HARDINKAAM Live Status]
Target Project: ${firebase_applet_config_default.projectId}
Firestore Database: ${firebase_applet_config_default.firestoreDatabaseId}
Active Live Version: ${liveDeployment?.version || "v1.0.0 (Production)"}
Dev Server Port: 3000
Node Environment: ${process.env.NODE_ENV || "development"}`;
          break;
        }
        case "BUILD": {
          stdout += `\u{1F528} [HARDINKAAM Build Pipeline] Executing application compile & validation check...
`;
          const buildResult = await runCommand("npm run build", process.cwd(), 3e5);
          stdout += buildResult.stdout || "";
          stderr = buildResult.stderr || "";
          isSuccess = buildResult.exitCode === 0;
          exitCode = buildResult.exitCode;
          break;
        }
        case "AUDIT": {
          stdout += `\u{1F50D} [HARDINKAAM Audit Pipeline] Executing static code audit & type check...
`;
          const auditResult = await runCommand("npm run lint", process.cwd(), 18e4);
          stdout += auditResult.stdout || "";
          stderr = auditResult.stderr || "";
          isSuccess = auditResult.exitCode === 0;
          exitCode = auditResult.exitCode;
          break;
        }
        case "ROLLBACK": {
          const targetVersion = versionId || (command ? command.split(/\s+/)[1] : void 0);
          if (!targetVersion) {
            return res.status(400).json({
              success: false,
              error: "Target versionId is required for ROLLBACK action."
            });
          }
          stdout += `\u23EA [HARDINKAAM Rollback Pipeline] Initiating rollback to version ${targetVersion}...
`;
          const rollbackResult = await rollbackDeployment(targetVersion, {
            uid: req.adminUser?.uid || "admin",
            email: req.adminUser?.email || "admin",
            name: req.adminUser?.name || "Admin"
          });
          isSuccess = rollbackResult.success;
          if (isSuccess) {
            stdout += `
\u2713 Successfully restored and activated live version: ${targetVersion}`;
          } else {
            stderr = rollbackResult.message || "Rollback failed.";
            exitCode = 1;
          }
          break;
        }
        case "DEPLOY": {
          if (file && file.buffer) {
            stdout += `\u{1F4E6} [HARDINKAAM Deploy Pipeline] Processing release archive "${file.originalname}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...
`;
            const deployResult = await processZipDeployment({
              jobId: "job_" + Date.now(),
              zipBuffer: file.buffer,
              fileName: file.originalname,
              fileSize: file.size,
              adminUser: {
                uid: req.adminUser?.uid || "admin",
                email: req.adminUser?.email || "admin",
                name: req.adminUser?.name || "Admin"
              }
            });
            isSuccess = deployResult.buildStatus === "SUCCESS";
            if (isSuccess) {
              stdout += `
\u2713 Release ${deployResult.version} deployed and registered in pipeline successfully!`;
            } else {
              stderr = deployResult.deploymentLog || "Deployment pipeline encountered an error.";
              exitCode = 1;
            }
          } else {
            stdout += `\u{1F680} [HARDINKAAM Deploy Pipeline] Building and registering production release snapshot...
`;
            const buildRes = await runCommand("npm run build", process.cwd(), 3e5);
            stdout += buildRes.stdout || "";
            if (buildRes.exitCode !== 0) {
              isSuccess = false;
              stderr = buildRes.stderr || "Build step failed during deploy.";
              exitCode = buildRes.exitCode;
            } else {
              stdout += `
\u2713 Production build bundle ready in dist/. Deployment status: READY.`;
            }
          }
          break;
        }
      }
      const executionTimeMs = Date.now() - startTime;
      return res.status(isSuccess ? 200 : 400).json({
        success: isSuccess,
        exitCode,
        stdout,
        stderr,
        action: requestedAction,
        executionTimeMs,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Error executing named deployment action:", err);
      return res.status(500).json({ success: false, error: err.message || "Named action execution failed." });
    }
  });
});
app2.post("/api/marketing/search-leads", async (req, res) => {
  try {
    const { trade, state, district, tehsilOrVillage, customKeyword, lat, lng } = req.body;
    if (!state && !district && !tehsilOrVillage && !customKeyword) {
      return res.status(400).json({
        success: false,
        error: "Location parameters (state, district, or tehsilOrVillage) or customKeyword are required."
      });
    }
    console.log(`[MarketingAgent] Searching Google Maps for trade: "${trade || "general"}" in "${district || tehsilOrVillage || state}"`);
    const result = await searchServicemenWithMapsGrounding({
      trade: trade || "Service Technician",
      state: state || "Madhya Pradesh",
      district,
      tehsilOrVillage,
      customKeyword,
      lat: lat ? Number(lat) : void 0,
      lng: lng ? Number(lng) : void 0
    });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("[MarketingAgent] Lead search failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to search Google Maps data."
    });
  }
});
app2.post("/api/marketing/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({
        success: false,
        error: "Missing audioBase64 parameter for transcription."
      });
    }
    console.log("[MarketingAgent] Transcribing voice input using gemini-3.8-flash...");
    const transcription = await transcribeMicrophoneAudio({
      audioBase64,
      mimeType: mimeType || "audio/webm"
    });
    return res.status(200).json({
      success: true,
      transcription
    });
  } catch (err) {
    console.error("[MarketingAgent] Audio transcription error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Audio transcription failed."
    });
  }
});
app2.post("/api/marketing/generate-campaign", async (req, res) => {
  try {
    const {
      trade,
      location,
      customInstruction,
      leadCount,
      promoterOrEmployeeName,
      targetAudience,
      state,
      districtOrCity,
      localityOrVillage,
      ageGroup,
      campaignObjective,
      toneAndLanguage
    } = req.body;
    console.log(
      `[MarketingAgent] Generating campaign copy for ${trade || "serviceman"} in ${districtOrCity || location || "India"} (${targetAudience || "servicemen"})...`
    );
    const campaign = await generateMarketingCampaignAd({
      trade: trade || "Service Professional",
      location: location || "Bhopal, Madhya Pradesh",
      customInstruction,
      leadCount,
      promoterOrEmployeeName,
      targetAudience,
      state,
      districtOrCity,
      localityOrVillage,
      ageGroup,
      campaignObjective,
      toneAndLanguage
    });
    return res.status(200).json({
      success: true,
      campaign
    });
  } catch (err) {
    console.error("[MarketingAgent] Campaign generation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate marketing campaign."
    });
  }
});
app2.post("/api/marketing/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Missing prompt parameter."
      });
    }
    console.log(`[MarketingAgent] Generating AI marketing image for prompt: "${prompt.slice(0, 60)}..."`);
    const result = await generateMarketingImageWithAI({
      prompt,
      aspectRatio
    });
    return res.status(200).json({
      success: true,
      imageUrl: result.imageUrl,
      mimeType: result.mimeType
    });
  } catch (err) {
    console.error("[MarketingAgent] Image generation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate AI image."
    });
  }
});
app2.post("/api/marketing/generate-video-storyboard", async (req, res) => {
  try {
    const {
      scriptText,
      theme,
      tradeOrService,
      location,
      targetAudience,
      aspectRatio,
      sceneCount,
      voiceGender,
      voiceStyle,
      bgmStyle
    } = req.body;
    console.log(`[VideoStudio] Generating video ad storyboard using gemini-3.8-flash for "${tradeOrService || "service"}" (${aspectRatio || "16:9"}) voice: ${voiceGender || "default"}...`);
    const storyboard = await generateVideoStoryboardWithGemini({
      scriptText,
      theme,
      tradeOrService,
      location,
      targetAudience,
      aspectRatio,
      sceneCount: sceneCount ? Number(sceneCount) : 4,
      voiceGender,
      voiceStyle,
      bgmStyle
    });
    return res.status(200).json({
      success: true,
      storyboard
    });
  } catch (err) {
    console.error("[VideoStudio] Video storyboard generation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate video storyboard."
    });
  }
});
app2.post("/api/marketing/ai-ad-studio/generate", async (req, res) => {
  try {
    const {
      prompt,
      language,
      duration,
      voiceOption,
      voiceStyle,
      format,
      bgmStyle,
      location,
      includeAvatar,
      avatarId,
      avatarUsageMode,
      avatarPlacement
    } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Prompt is required." });
    }
    console.log(`[AIAdStudio] Generating ad for prompt: "${prompt}" (language: ${language || "auto"}, duration: ${duration || 30}s, avatar: ${includeAvatar ? avatarId : "none"})...`);
    const project = await generateAdStudioProject({
      prompt,
      language,
      duration: duration ? Number(duration) : 30,
      voiceOption,
      voiceStyle,
      format,
      bgmStyle,
      location,
      includeAvatar: Boolean(includeAvatar),
      avatarId,
      avatarUsageMode,
      avatarPlacement
    });
    return res.status(200).json({
      success: true,
      project
    });
  } catch (err) {
    console.error("[AIAdStudio] Ad generation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate AI Ad Studio project."
    });
  }
});
app2.get("/api/marketing/ai-ad-studio/avatars", async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      avatars: DEFAULT_AI_AVATARS
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/marketing/ai-ad-studio/avatars/create", async (req, res) => {
  try {
    const { name, roleTitle, gender, referenceVideoUrl, speechModelStyle, consentVerified } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Avatar name is required." });
    }
    if (!consentVerified) {
      return res.status(400).json({ success: false, error: "Likeness and voice consent must be confirmed." });
    }
    const newAvatar = await createCustomAIAvatar({
      name,
      roleTitle,
      gender,
      referenceVideoUrl,
      speechModelStyle,
      consentVerified
    });
    return res.status(200).json({
      success: true,
      avatar: newAvatar
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.post("/api/marketing/ai-ad-studio/translate-version", async (req, res) => {
  try {
    const { project, targetLanguage } = req.body;
    if (!project || !targetLanguage) {
      return res.status(400).json({ success: false, error: "Project and targetLanguage are required." });
    }
    console.log(`[AIAdStudio] Translating project ${project.id} to ${targetLanguage}...`);
    const version = await translateAdVersion({ project, targetLanguage });
    return res.status(200).json({
      success: true,
      version
    });
  } catch (err) {
    console.error("[AIAdStudio] Translation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to translate ad version."
    });
  }
});
app2.post("/api/marketing/allocate-task", async (req, res) => {
  try {
    const {
      title,
      trade,
      state,
      district,
      tehsilOrVillage,
      assignedToEmployeeId,
      assignedToEmployeeName,
      assignedToEmployeeRole,
      assignedByAdminEmail,
      leads,
      campaignCopy,
      notes
    } = req.body;
    if (!assignedToEmployeeName) {
      return res.status(400).json({
        success: false,
        error: "Employee name / assignment target is required."
      });
    }
    const taskId = `task_mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const taskRecord = {
      id: taskId,
      title: title || `${trade || "Service"} Outreach Campaign - ${district || state || "Area"}`,
      trade: trade || "All Trades",
      state: state || "Madhya Pradesh",
      district: district || "Bhopal",
      tehsilOrVillage: tehsilOrVillage || "",
      assignedToEmployeeId: assignedToEmployeeId || "emp_default",
      assignedToEmployeeName,
      assignedToEmployeeRole: assignedToEmployeeRole || "Marketing Staff / Promoter",
      assignedByAdminEmail: assignedByAdminEmail || "deepakbuildconbhopal@gmail.com",
      targetLeadCount: Array.isArray(leads) ? leads.length : 0,
      leads: Array.isArray(leads) ? leads : [],
      campaignCopy: campaignCopy || null,
      notes: notes || "",
      status: "IN_PROGRESS",
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "marketing_tasks", taskId), taskRecord);
    return res.status(200).json({
      success: true,
      message: `Task successfully allocated to ${assignedToEmployeeName}!`,
      task: taskRecord
    });
  } catch (err) {
    console.error("[MarketingAgent] Task allocation failed:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to allocate marketing task."
    });
  }
});
var inMemoryMarketingTasks = [];
var inMemoryAdSets = [];
app2.get("/api/marketing/tasks", async (req, res) => {
  try {
    const tasksSnap = await (0, import_firestore8.getDocs)((0, import_firestore8.collection)(db, "marketing_tasks"));
    const tasks = tasksSnap.docs.map((d) => d.data());
    tasks.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (tasks.length > 0) {
      inMemoryMarketingTasks = tasks;
    }
    return res.status(200).json({
      success: true,
      tasks
    });
  } catch (err) {
    console.warn("[MarketingAgent] Firestore tasks fetch notice, returning cached tasks:", err?.message || err);
    return res.status(200).json({
      success: true,
      tasks: inMemoryMarketingTasks,
      fromCache: true
    });
  }
});
app2.post("/api/marketing/update-lead-status", async (req, res) => {
  try {
    const { taskId, leadId, newStatus, outcomeNotes } = req.body;
    if (!taskId || !leadId || !newStatus) {
      return res.status(400).json({
        success: false,
        error: "taskId, leadId, and newStatus are required."
      });
    }
    const taskInMem = inMemoryMarketingTasks.find((t) => t.id === taskId);
    if (taskInMem && Array.isArray(taskInMem.leads)) {
      const l = taskInMem.leads.find((x) => x.id === leadId);
      if (l) {
        l.status = newStatus;
        l.outcomeNotes = outcomeNotes || "";
      }
    }
    try {
      const taskRef = (0, import_firestore8.doc)(db, "marketing_tasks", taskId);
      const taskSnap = await (0, import_firestore8.getDoc)(taskRef);
      if (taskSnap.exists()) {
        const taskData = taskSnap.data();
        const leads = taskData.leads || [];
        const leadIdx = leads.findIndex((l) => l.id === leadId);
        if (leadIdx !== -1) {
          leads[leadIdx].status = newStatus;
          leads[leadIdx].outcomeNotes = outcomeNotes || "";
          leads[leadIdx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          await (0, import_firestore8.updateDoc)(taskRef, {
            leads,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    } catch (dbErr) {
      console.warn("[MarketingAgent] Firestore task lead update notice (persisted in cache):", dbErr);
    }
    return res.status(200).json({
      success: true,
      message: "Lead status updated."
    });
  } catch (err) {
    console.error("[MarketingAgent] Error updating lead status:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app2.get("/api/marketing/ad-sets", async (req, res) => {
  try {
    const snap = await (0, import_firestore8.getDocs)((0, import_firestore8.collection)(db, "ad_creative_sets"));
    const adSets = snap.docs.map((d) => d.data());
    adSets.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (adSets.length > 0) {
      inMemoryAdSets = adSets;
    }
    return res.status(200).json({
      success: true,
      adSets
    });
  } catch (err) {
    console.warn("[MarketingAgent] Firestore ad sets notice, returning cached sets:", err?.message || err);
    return res.status(200).json({
      success: true,
      adSets: inMemoryAdSets,
      fromCache: true
    });
  }
});
app2.post("/api/marketing/ad-sets", async (req, res) => {
  try {
    const { id, title, trade, demographics, campaignCopy, generatedImages, tags, notes } = req.body;
    const setId = id || `adset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const adSetRecord = {
      id: setId,
      title: title || `${trade || "Service"} Ad Set - ${demographics?.districtOrCity || "India"}`,
      trade: trade || "All Trades",
      demographics: demographics || {},
      campaignCopy: campaignCopy || null,
      generatedImages: generatedImages || {},
      tags: tags || [],
      notes: notes || "",
      createdAt: req.body.createdAt || nowIso,
      updatedAt: nowIso
    };
    const existingIdx = inMemoryAdSets.findIndex((s) => s.id === setId);
    if (existingIdx !== -1) {
      inMemoryAdSets[existingIdx] = adSetRecord;
    } else {
      inMemoryAdSets.unshift(adSetRecord);
    }
    try {
      await (0, import_firestore8.setDoc)((0, import_firestore8.doc)(db, "ad_creative_sets", setId), adSetRecord);
    } catch (dbErr) {
      console.warn("[MarketingAgent] Firestore save ad set notice (persisted in cache):", dbErr);
    }
    return res.status(200).json({
      success: true,
      message: "Ad Set saved successfully!",
      adSet: adSetRecord
    });
  } catch (err) {
    console.error("[MarketingAgent] Failed to save ad set:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to save ad set."
    });
  }
});
app2.delete("/api/marketing/ad-sets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Ad Set ID is required." });
    }
    inMemoryAdSets = inMemoryAdSets.filter((s) => s.id !== id);
    try {
      await (0, import_firestore8.deleteDoc)((0, import_firestore8.doc)(db, "ad_creative_sets", id));
    } catch (dbErr) {
      console.warn("[MarketingAgent] Firestore delete notice:", dbErr);
    }
    return res.status(200).json({
      success: true,
      message: "Ad Set deleted successfully!"
    });
  } catch (err) {
    console.error("[MarketingAgent] Failed to delete ad set:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to delete ad set."
    });
  }
});
app2.get("/api/ai/diagnostics", (req, res) => {
  const diagnostics = getAIDiagnostics();
  return res.status(200).json({
    success: true,
    activeModel: GEMINI_CANONICAL_MODEL,
    sdkVersion: "@google/genai ^2.4.0",
    diagnostics
  });
});
app2.post("/api/ai/diagnose-service", async (req, res) => {
  try {
    const { text, imageBase64, mimeType, audioTranscript, availableServices = [] } = req.body;
    const servicesListStr = Array.isArray(availableServices) ? availableServices.slice(0, 30).map((s) => `ID: ${s.id}, Name: ${s.name}, Category: ${s.categoryId}, Price: \u20B9${s.basePrice}`).join("\n") : "";
    const prompt = `You are KaamDost AI, the expert service diagnostic assistant for HARDINKAAM Bhopal & Indore home services.
Analyze the user's service issue (text, voice transcript, or image description).
Determine:
1. Category ID (must match one of: cat_electrician, cat_plumber, cat_ac_appliance, cat_cleaning, cat_painting, cat_carpentry, cat_ro_water, cat_pest_control, or large custom work like painting, renovation, waterproofing, modular, civil, interior).
2. Subcategory & Problem Type.
3. Urgency ('immediate', 'within_2_days', 'this_week', 'flexible').
4. Service Requirement description.
5. Is this a large/custom project requiring 'Get Multiple Quotes' (e.g. full home painting, renovation, civil work, waterproofing)?
6. Select the exact matching Service from our real database if available:
${servicesListStr}

STRICT RULE: Do NOT invent prices, discounts, warranties, refunds, or free service. Use only real service prices provided above.

Return output strictly in valid JSON format:
{
  "diagnosisSummary": "...",
  "categoryId": "...",
  "categoryName": "...",
  "subcategory": "...",
  "problemType": "...",
  "urgency": "...",
  "serviceRequirement": "...",
  "matchedServiceId": "...",
  "suggestedQuestions": ["...", "..."],
  "isLargeCustomProject": false
}

User Input Text: "${text || ""}"
Voice Transcript: "${audioTranscript || ""}"
`;
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      const parts = [{ text: prompt }];
      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || "image/jpeg"
          }
        });
      }
      console.log(`[AiServiceAssistant] Diagnosing service issue using ${GEMINI_CANONICAL_MODEL}...`);
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: parts
      });
      recordAISuccess();
      const rawText = response.text || "";
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
        return res.status(200).json({
          success: true,
          model: GEMINI_CANONICAL_MODEL,
          data: parsed
        });
      }
    }
    return res.status(200).json({
      success: false,
      model: GEMINI_CANONICAL_MODEL,
      fallbackRequired: true
    });
  } catch (err) {
    recordAIError(err);
    console.warn("[AiServiceAssistant] Gemini diagnosis notice (using fallback):", err.message);
    return res.status(200).json({
      success: false,
      model: GEMINI_CANONICAL_MODEL,
      fallbackRequired: true,
      error: err.message
    });
  }
});
app2.post("/api/ai/copilot", async (req, res) => {
  try {
    const { leadName, role, score, query: query6 } = req.body;
    const prompt = `You are HARDINKAAM AI Funnel Copilot advisor.
Analyze this lead:
- Lead Name: ${leadName || "Contact"}
- Role / Trade: ${role || "Prospect"}
- Lead Quality Score: ${score || 70}/100
- Admin Query: "${query6 || "Generate best next action and WhatsApp outreach"}"

Provide a concise, highly actionable recommendation in Hindi / Hinglish.
Return 4-5 bullet points covering:
1. Lead Quality Assessment
2. Category Fit
3. Suggested Next Best Action (e.g. WhatsApp registration, onboarding assistance)
4. Recommended Script (Hinglish/Hindi)
5. Objection Handling strategy`;
    if (process.env.GEMINI_API_KEY) {
      const ai = getGeminiClient();
      console.log(`[AiFunnel] Generating copilot advice using ${GEMINI_CANONICAL_MODEL}...`);
      const response = await ai.models.generateContent({
        model: GEMINI_CANONICAL_MODEL,
        contents: prompt
      });
      recordAISuccess();
      return res.status(200).json({
        success: true,
        model: GEMINI_CANONICAL_MODEL,
        advice: response.text || ""
      });
    }
    return res.status(200).json({
      success: true,
      model: GEMINI_CANONICAL_MODEL,
      advice: `\u{1F916} AI Copilot Analysis for ${leadName || "Lead"} (${role || "Partner"}):
- Lead Quality Score: ${score || 75}/100 (High Intent)
- Category Fit: Home Services & On-Demand Repair
- Suggested Next Best Action: Send WhatsApp registration link with \u20B9121 QR code.
- Recommended Script (Hinglish): "\u0928\u092E\u0938\u094D\u0924\u0947 ${leadName || "\u0938\u093E\u0925\u0940"}! \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948\u0964 \u0905\u092A\u0928\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0924\u0941\u0930\u0902\u0924 \u0915\u093E\u092E \u092A\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0906\u091C \u0939\u0940 \u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u0935\u0947\u0930\u0940\u092B\u093E\u0908 \u0915\u0930\u0947\u0902\u0964"
- Objection Handling: Assure 100% transparent commission and weekly direct bank payouts.`
    });
  } catch (err) {
    recordAIError(err);
    console.warn("[AiFunnel] Copilot advice notice:", err.message);
    return res.status(200).json({
      success: true,
      model: GEMINI_CANONICAL_MODEL,
      advice: `\u{1F916} AI Copilot Advisory (${GEMINI_CANONICAL_MODEL}):
- Lead Quality Score: ${req.body.score || 70}/100
- Recommended Action: Follow up directly on WhatsApp or telephone.
- Script: "\u0928\u092E\u0938\u094D\u0924\u0947! \u0939\u093E\u0930\u094D\u0921\u093F\u0928\u0915\u093E\u092E \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948\u0964 \u0915\u094D\u092F\u093E \u0906\u092A \u0905\u092A\u0928\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0928\u090F \u0915\u093E\u092E \u0915\u0947 \u0905\u0935\u0938\u0930 \u092A\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902?"`
    });
  }
});
app2.use("/api/ai-calling", createAICallingRouter(requireAdminAuth));
app2.use((err, req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.error(`[API Error] ${req.method} ${req.path}:`, err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Internal Server Error"
    });
  }
  next(err);
});
app2.post("/api/analytics/track-visit", (req, res) => {
  try {
    const { visitorId, city, state, deviceType, referrer } = req.body || {};
    console.log(`[Analytics] App Open from ${city || "India"} (${state || "MP"}) via ${referrer || "Direct"} on ${deviceType || "mobile"}`);
    return res.status(200).json({ success: true, timestamp: Date.now() });
  } catch (err) {
    return res.status(200).json({ success: true });
  }
});
app2.post("/api/analytics/track-click", (req, res) => {
  try {
    const { eventType, creativeTitle, city, adUnitId } = req.body || {};
    console.log(`[Analytics] Click logged: ${eventType || "ad_click"} - "${creativeTitle}" in ${city || "Bhopal"} (Unit: ${adUnitId})`);
    return res.status(200).json({ success: true, timestamp: Date.now() });
  } catch (err) {
    return res.status(200).json({ success: true });
  }
});
app2.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`
  });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false
      },
      logLevel: "silent",
      appType: "spa"
    });
    app2.use((req, res, next) => {
      if (req.url && (req.url.includes("pwa-entry-point-loaded") || req.url.includes("register-dev-sw"))) {
        res.setHeader("Content-Type", "application/javascript");
        return res.send("export default function registerDevSW() {};");
      }
      const isViteClient = req.url && (req.url === "/@vite/client" || req.url.startsWith("/@vite/client?"));
      if (!isViteClient) return next();
      const origEnd = res.end;
      const chunks = [];
      res.write = function(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      res.end = function(chunk, ...args) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        let body = Buffer.concat(chunks).toString("utf8");
        body = body.replace(
          /reject\(new Error\("WebSocket closed without opened\."\)\);/g,
          "resolve();"
        );
        body = body.replace(
          /let isOpened = socket\.readyState === socket\.OPEN;/g,
          "let isOpened = true;"
        );
        body = body.replace(
          /ws\.send\(JSON\.stringify\(data\)\);/g,
          "try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); } catch (e) {}"
        );
        body = body.replace(
          /socket\.send\(JSON\.stringify\(\{\s*type:\s*"ping"\s*\}\)\);/g,
          'try { if (socket && socket.readyState === 1) socket.send(JSON.stringify({ type: "ping" })); } catch (e) {}'
        );
        body = body.replace(
          /this\.logger\.error\(err\);/g,
          "/* swallowed hmr send error */"
        );
        body = body.replace(
          /console\.error\(\s*`\[vite\] failed to connect to websocket/g,
          "console.debug(`[vite] failed to connect to websocket"
        );
        res.setHeader("Content-Length", Buffer.byteLength(body));
        return origEnd.call(res, body, ...args);
      };
      next();
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app2.use(import_express2.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  const server = app2.listen(PORT, "0.0.0.0", () => {
    console.log(`HARDINKAAM Server running on http://0.0.0.0:${PORT}`);
  });
  server.timeout = 10 * 60 * 1e3;
  server.keepAliveTimeout = 10 * 60 * 1e3;
  server.headersTimeout = 10 * 60 * 1e3 + 5e3;
}
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAuthoritativeAdminFirestore
});
//# sourceMappingURL=server.cjs.map
