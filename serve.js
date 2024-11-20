const express = require("express");
const axios = require("axios");
const url = require("url");
const { v4: uuidv4 } = require("uuid");
const cheerio = require("cheerio");
const UserAgent = require("user-agents");
const robotsParser = require("robots-parser");

const app = express();
const robotsCache = new Map();

// Enhanced User Agent Generation
function generateDynamicUserAgents() {
  return {
    randomMobileAndroid: () => new UserAgent(/Android/).random().toString(),
    randomMobileIOS: () => new UserAgent(/iPhone/).random().toString(),
    randomDesktopWindows: () => new UserAgent(/Windows/).random().toString(),
    randomDesktopMac: () => new UserAgent(/Macintosh/).random().toString(),
    randomAgent: () => new UserAgent().random().toString(),
  };
}

const dynamicUserAgents = generateDynamicUserAgents();

// Enhanced Middleware for CORS and Headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// Endpoint to get user agent options
app.get("/user-agent-options", (req, res) => {
  const userAgentOptions = [
    { value: "android_opera", label: "Android Opera" },
    { value: "android_chrome", label: "Android Chrome" },
    { value: "iphone_safari", label: "iPhone Safari" },
    { value: "iphone_chrome", label: "iPhone Chrome" },
    { value: "desktop_chrome", label: "Desktop Chrome" },
    { value: "desktop_firefox", label: "Desktop Firefox" },
    { value: "desktop_edge", label: "Desktop Edge" },
    { value: "mac_chrome", label: "Mac Chrome" },
  ];
  res.json(userAgentOptions);
});

// Endpoint to get referer options
app.get("/referer-options", (req, res) => {
  const refererOptions = [
    { value: "https://www.google.com", label: "Google" },
    { value: "https://www.bing.com", label: "Bing" },
    { value: "https://www.yahoo.com", label: "Yahoo" },
    { value: "https://www.duckduckgo.com", label: "DuckDuckGo" },
    { value: " ", label: "NO" },
  ];
  res.json(refererOptions);
});

// Enhanced Header Generation
function generateHighlyRandomHeaders(userAgent) {
  const headerVariations = {
    acceptLanguages: ["en-US,en;q=0.9", "en-GB,en;q=0.8", "en-CA,en;q=0.7"],
    platforms: ['"Windows"', '"macOS"', '"Linux"'],
    browserVersions: ["110", "111", "112", "113", "114"],
  };

  return {
    "User-Agent": userAgent,
    "Accept-Language":
      headerVariations.acceptLanguages[
        Math.floor(Math.random() * headerVariations.acceptLanguages.length)
      ],
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua-Platform":
      headerVariations.platforms[
        Math.floor(Math.random() * headerVariations.platforms.length)
      ],
    "Sec-Ch-Ua": `"Not:A-Brand";v="99", "Chromium";v="${
      headerVariations.browserVersions[
        Math.floor(Math.random() * headerVariations.browserVersions.length)
      ]
    }"`,
    "X-Forwarded-For": `${Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 255)
    ).join(".")}`,
    Referer: [
      "https://www.google.com",
      "https://www.bing.com",
      "https://www.duckduckgo.com",
      false,
    ][Math.floor(Math.random() * 3)],
    DNT: Math.random() > 0.5 ? "1" : "0",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Site": ["same-origin", "cross-site", "none"][
      Math.floor(Math.random() * 3)
    ],
  };
}

// Enhanced Session Store
class EnhancedSessionStore {
  constructor() {
    this.store = new Map();
  }

  createSession() {
    const sessionId = uuidv4();
    const userAgentMethods = [
      dynamicUserAgents.randomMobileAndroid,
      dynamicUserAgents.randomMobileIOS,
      dynamicUserAgents.randomDesktopWindows,
      dynamicUserAgents.randomDesktopMac,
    ];

    const randomUserAgentMethod =
      userAgentMethods[Math.floor(Math.random() * userAgentMethods.length)];
    const userAgent = randomUserAgentMethod();

    const sessionData = {
      id: sessionId,
      createdAt: Date.now(),
      cookies: new Map(),
      userAgent: userAgent,
      headers: generateHighlyRandomHeaders(userAgent),
    };

    this.store.set(sessionId, sessionData);
    return sessionData;
  }

  getSession(sessionId) {
    this.cleanupSessions();
    return this.store.get(sessionId) || this.createSession();
  }

  cleanupSessions() {
    const now = Date.now();
    for (let [key, session] of this.store.entries()) {
      if (now - session.createdAt > 3600000) {
        this.store.delete(key);
      }
    }
  }

  setCookie(sessionId, cookie) {
    const session = this.store.get(sessionId);
    if (session) {
      const cookieParts = cookie.split(";").map((part) => part.trim());
      const [name, value] = cookieParts[0].split("=");
      session.cookies.set(name, value);
    }
  }

  getCookies(sessionId) {
    const session = this.store.get(sessionId);
    if (session) {
      return Array.from(session.cookies.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    }
    return "";
  }
}

const sessionStore = new EnhancedSessionStore();

// Robots.txt Compliance Check
async function isAllowedByRobotsTxt(targetUrl) {
  const { protocol, host } = new URL(targetUrl);
  const robotsTxtUrl = `${protocol}//${host}/robots.txt`;

  if (robotsCache.has(robotsTxtUrl)) {
    console.log(`Using cached robots.txt for ${robotsTxtUrl}`);
    return robotsCache
      .get(robotsTxtUrl)
      .isAllowed(targetUrl, "Mozilla/5.0 (compatible; MyBot/1.0)");
  }

  try {
    const response = await axios.get(robotsTxtUrl);
    const robots = robotsParser(robotsTxtUrl, response.data);

    robotsCache.set(robotsTxtUrl, robots);

    const isAllowed = robots.isAllowed(
      targetUrl,
      "Mozilla/5.0 (compatible; MyBot/1.0)"
    );
    return isAllowed !== false;
  } catch (error) {
    console.error(
      `Error fetching or parsing robots.txt from ${robotsTxtUrl}:`,
      error.message
    );
    return true;
  }
}

// Main Page
app.get("/", (req, res) => {
  // Previous HTML content remains unchanged
  res.send(`
    <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Basic Proxy</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
              #proxyIframe {
    width: 100%;
    height: calc(100vh - 56px);
    border: none;
}

.bg-custom {
    background: #ffffff24;
    color: white;
    border: 1px solid white;
}
.text-custom:hover {
    color:black
}

.linked-in:hover {
display:block;
}

.bg-custom:focus {
    background: #ffffff24;
    color: white;
    outline: none;
    box-shadow: 0 0 5px white;
}

::-webkit-input-placeholder {
    color: #ffffff38!important;
}

::-moz-placeholder {
    color: #ffffff38!important;
}

:-ms-input-placeholder {
    color: #ffffff38!important;
}

:-moz-placeholder {
    color: #ffffff38!important;
}

            </style>
        </head>
        <body class="bg-dark">
            <!-- Navbar -->
            <nav class="position-absolute bottom-0 navbar navbar-dark bg-dark w-100">
                <div class="container-fluid">
                    <a class="rounded-pill text-custom btn-outline-light border-0 btn navbar-brand d-flex align-items-center" target="_blank" href="https://linkedin.com/in/jonathan-linked-in">
                        <img src="https://avatars.githubusercontent.com/u/100354084?v=4" alt="Jonathan A. Profile" width="20" height="20" class="me-2 img-fluid rounded-circle">
                        Jonathan A.

                    </a>
                    <button class="btn-lg rounded-pill btn btn-outline-light" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar" aria-controls="offcanvasNavbar">
                        ☰ Menu
                    </button>
                </div>
            </nav>

            <!-- Offcanvas Menu -->
            <div class="m-2 rounded-4 offcanvas offcanvas-bottom text-bg-dark show shadow" tabindex="-1" id="offcanvasNavbar" aria-labelledby="offcanvasNavbarLabel">
                <div class="offcanvas-header pt-2">
                    <h5 class="offcanvas-title" id="offcanvasNavbarLabel">Menu</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
                <div class="offcanvas-body">
               <form id="proxyForm" class="d-flex flex-wrap align-items-center justify-content-between">
    <!-- URL input field placed on top -->
    <div class="d-flex flex-column flex-grow-1 w-100 mb-3">
         <input class="border-0 bg-custom form-control-lg form-control rounded-pill " type="text" id="url" name="url" placeholder="Enter URL" value="https://github.com/n8t8n" required="">
    </div>

    <!-- Grouping other fields together -->
    <div class="d-flex flex-wrap w-100 gap-3">
        <!-- User Agent dropdown -->
        <div class="d-flex flex-column ">
             <select class="border-0 bg-custom rounded-pill form-select-lg form-select" id="userAgent">
                <!-- Options will be populated here -->
            </select>
        </div>

        <!-- Referer dropdown -->
        <div class="d-flex flex-column ">
             <select class="border-0 bg-custom rounded-pill form-select-lg form-select" id="referer">
                <!-- Options will be populated here -->
            </select>
        </div>

        <!-- Submit button -->
        <div class="ms-auto d-flex justify-content-end align-items-end">
            <button class="w-100 btn-lg btn btn-light rounded-pill border-0" data-bs-dismiss="offcanvas" type="submit">Search</button>
        </div>
    </div>
</form>


                </div>
            </div>

            <!-- Iframe -->
            <iframe id="proxyIframe" src=""></iframe>

            <!-- Bootstrap JS -->
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
            <script>
async function populateDropdowns() {
    try {
        const userAgentResponse = await fetch('/user-agent-options');
        const userAgentOptions = await userAgentResponse.json();
        const userAgentSelect = document.getElementById('userAgent');
        userAgentOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            userAgentSelect.appendChild(opt);
        });

        const refererResponse = await fetch('/referer-options');
        const refererOptions = await refererResponse.json();
        const refererSelect = document.getElementById('referer');
        refererOptions.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            refererSelect.appendChild(opt);
        });
    } catch (error) {
        console.error('Error fetching dropdown options:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    populateDropdowns();
    document.getElementById('proxyForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const urlInput = document.getElementById('url').value;
        const userAgent = document.getElementById('userAgent').value;
        const referer = document.getElementById('referer').value; // Get the selected referer
        document.getElementById('proxyIframe').src = '/proxy?url=' + encodeURIComponent(urlInput) +
            '&profile=' + encodeURIComponent(userAgent) +
            '&referer=' + encodeURIComponent(referer); // Pass the referer in the URL
    });
});
            </script>
        </body>
        </html>
  `);
});

// Enhanced Proxy Route
app.use("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  const referer =
    req.query.referer && req.query.referer !== " " ? req.query.referer : ""; // Handle empty referer here

  if (!targetUrl) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  const fullUrl =
    targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
      ? targetUrl
      : `https://${targetUrl}`;

  console.log("Referer received:", referer); // Log the referer for debugging

  const isAllowed = await isAllowedByRobotsTxt(fullUrl);
  if (!isAllowed) {
    return res
      .status(403)
      .send("Access to this URL is disallowed by robots.txt.");
  }

  const sessionId = req.query.session || uuidv4();
  const session = sessionStore.getSession(sessionId);

  const headers = {
    ...session.headers,
    Referer: referer,
    Cookie: sessionStore.getCookies(sessionId),
  };

  try {
    const response = await axios.get(fullUrl, {
      headers,
      responseType: "text",
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 600;
      },
      maxRedirects: 5,
    });
    console.log("Headers received:", response.headers);

    if (response.headers["set-cookie"]) {
      response.headers["set-cookie"].forEach((cookie) => {
        sessionStore.setCookie(sessionId, cookie);
      });
    }

    const parsedUrl = url.parse(fullUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const $ = cheerio.load(response.data);

    $("base").remove();
    $("head").prepend(`<base href="${baseUrl}">`);

    $("[src]").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("/")) {
        $(el).attr("src", new URL(src, baseUrl).href);
      }
    });

    $("[href]").each((i, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("/")) {
        $(el).attr("href", new URL(href, baseUrl).href);
      }
    });

    res.send($.html());
  } catch (error) {
    console.error("Error fetching URL:", error.message);
    res.status(500).send(`Error fetching the requested URL: ${error.message}`);
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);

module.exports = app;
