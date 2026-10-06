window.reviewConfig={
  "reviewLanguage": "en",
  "direction": "ltr",
  "project": {
    "id": "morrow-demo",
    "title": "Morrow · fictional demo",
    "products": [
      {
        "id": "provider",
        "title": "Provider",
        "viewports": [
          "desktop",
          "mobile"
        ],
        "platforms": [
          "android",
          "ios",
          "pwa"
        ],
        "languages": [
          "en",
          "he"
        ],
        "themes": [
          "light",
          "dark"
        ]
      },
      {
        "id": "customer",
        "title": "Customer",
        "viewports": [
          "mobile",
          "desktop"
        ],
        "platforms": [
          "pwa"
        ],
        "languages": [
          "en"
        ],
        "themes": [
          "light",
          "dark"
        ]
      }
    ]
  },
  "pages": [
    {
      "id": "P01",
      "productId": "provider",
      "title": "Studio dashboard",
      "revision": "r3",
      "defaultLanguage": "en",
      "defaultPlatform": "pwa",
      "summary": "Fictional review fixture · compare preserved sources and keep your notes with this review revision.",
      "provenance": "All screens and identities are mock Morrow data. Android/iOS/PWA labels represent simulated fixtures. No real product or account data.",
      "parts": [
        {
          "name": "Primary task",
          "current": "Equal visual weight for every task.",
          "proposed": "Give the next action clear priority."
        },
        {
          "name": "Navigation",
          "current": "Competing destinations.",
          "proposed": "Keep the current task visible."
        }
      ],
      "views": [
        {
          "id": "desktop-pwa-en-light",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Desktop · PWA · English · Light",
          "current": "captures/dashboard-current-baseline-desktop-light-PWA-final.png",
          "proposed": "captures/dashboard-proposed-r1-desktop-light-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "desktop-pwa-en-dark",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Desktop · PWA · English · Dark",
          "current": "captures/dashboard-current-baseline-desktop-dark-PWA-final.png",
          "proposed": "captures/dashboard-proposed-r1-desktop-dark-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-light",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · Android · English · Light",
          "current": "captures/dashboard-current-baseline-mobile-light-Android-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-light-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-dark",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · Android · English · Dark",
          "current": "captures/dashboard-current-baseline-mobile-dark-Android-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-dark-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-light",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · iOS · English · Light",
          "current": "captures/dashboard-current-baseline-mobile-light-iOS-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-light-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-dark",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · iOS · English · Dark",
          "current": "captures/dashboard-current-baseline-mobile-dark-iOS-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-dark-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-light",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · PWA · English · Light",
          "current": "captures/dashboard-current-baseline-mobile-light-PWA-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-light-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-dark",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · PWA · English · Dark",
          "current": "captures/dashboard-current-baseline-mobile-dark-PWA-final.png",
          "proposed": "captures/dashboard-proposed-r1-mobile-dark-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        }
      ],
      "externalSources": [
        {
          "id": "stitch-fixture",
          "label": "Stitch concept · mock fixture",
          "provider": "Stitch selector simulation",
          "provenance": "Synthetic local source fixture for testing the external comparator, not an actual generated export.",
          "views": [
            {
              "id": "desktop-en-light",
              "viewport": "desktop",
              "platform": "pwa",
              "language": "en",
              "theme": "light",
              "variant": "Default",
              "image": "captures/mock-stitch-concept.png",
              "note": "Mock external design source; no generator attribution."
            }
          ]
        },
        {
          "id": "claude-fixture",
          "label": "Claude concept · mock fixture",
          "provider": "Claude selector simulation",
          "provenance": "Synthetic local source fixture for testing the external comparator, not an actual generated export.",
          "views": [
            {
              "id": "desktop-en-light",
              "viewport": "desktop",
              "platform": "pwa",
              "language": "en",
              "theme": "light",
              "variant": "Default",
              "image": "captures/mock-claude-concept.png",
              "note": "Mock external design source; no generator attribution."
            }
          ]
        }
      ]
    },
    {
      "id": "P02",
      "productId": "provider",
      "title": "Bookings",
      "revision": "r3",
      "defaultLanguage": "en",
      "defaultPlatform": "pwa",
      "summary": "Fictional review fixture · compare preserved sources and keep your notes with this review revision.",
      "provenance": "All screens and identities are mock Morrow data. Android/iOS/PWA labels represent simulated fixtures. No real product or account data.",
      "parts": [
        {
          "name": "Primary task",
          "current": "Equal visual weight for every task.",
          "proposed": "Give the next action clear priority."
        },
        {
          "name": "Navigation",
          "current": "Competing destinations.",
          "proposed": "Keep the current task visible."
        }
      ],
      "views": [
        {
          "id": "desktop-pwa-en-light",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Desktop · PWA · English · Light",
          "current": "captures/bookings-current-baseline-desktop-light-PWA-final.png",
          "proposed": "captures/bookings-proposed-r1-desktop-light-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "desktop-pwa-en-dark",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Desktop · PWA · English · Dark",
          "current": "captures/bookings-current-baseline-desktop-dark-PWA-final.png",
          "proposed": "captures/bookings-proposed-r1-desktop-dark-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-light",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · Android · English · Light",
          "current": "captures/bookings-current-baseline-mobile-light-Android-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-light-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-dark",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · Android · English · Dark",
          "current": "captures/bookings-current-baseline-mobile-dark-Android-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-dark-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-light",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · iOS · English · Light",
          "current": "captures/bookings-current-baseline-mobile-light-iOS-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-light-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-dark",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · iOS · English · Dark",
          "current": "captures/bookings-current-baseline-mobile-dark-iOS-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-dark-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-light",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · PWA · English · Light",
          "current": "captures/bookings-current-baseline-mobile-light-PWA-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-light-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-dark",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · PWA · English · Dark",
          "current": "captures/bookings-current-baseline-mobile-dark-PWA-final.png",
          "proposed": "captures/bookings-proposed-r1-mobile-dark-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        }
      ],
      "externalSources": []
    },
    {
      "id": "C01",
      "productId": "customer",
      "title": "Discover workshops",
      "revision": "r3",
      "defaultLanguage": "en",
      "defaultPlatform": "pwa",
      "summary": "Fictional review fixture · compare preserved sources and keep your notes with this review revision.",
      "provenance": "All screens and identities are mock Morrow data. Android/iOS/PWA labels represent simulated fixtures. No real product or account data.",
      "parts": [
        {
          "name": "Primary task",
          "current": "Equal visual weight for every task.",
          "proposed": "Give the next action clear priority."
        },
        {
          "name": "Navigation",
          "current": "Competing destinations.",
          "proposed": "Keep the current task visible."
        }
      ],
      "views": [
        {
          "id": "desktop-pwa-en-light",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Desktop · PWA · English · Light",
          "current": "captures/discover-current-baseline-desktop-light-PWA-final.png",
          "proposed": "captures/discover-proposed-r1-desktop-light-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "desktop-pwa-en-dark",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Desktop · PWA · English · Dark",
          "current": "captures/discover-current-baseline-desktop-dark-PWA-final.png",
          "proposed": "captures/discover-proposed-r1-desktop-dark-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-light",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · Android · English · Light",
          "current": "captures/discover-current-baseline-mobile-light-Android-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-light-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-dark",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · Android · English · Dark",
          "current": "captures/discover-current-baseline-mobile-dark-Android-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-dark-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-light",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · iOS · English · Light",
          "current": "captures/discover-current-baseline-mobile-light-iOS-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-light-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-dark",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · iOS · English · Dark",
          "current": "captures/discover-current-baseline-mobile-dark-iOS-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-dark-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-light",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · PWA · English · Light",
          "current": "captures/discover-current-baseline-mobile-light-PWA-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-light-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-dark",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · PWA · English · Dark",
          "current": "captures/discover-current-baseline-mobile-dark-PWA-final.png",
          "proposed": "captures/discover-proposed-r1-mobile-dark-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        }
      ],
      "externalSources": []
    },
    {
      "id": "C02",
      "productId": "customer",
      "title": "Checkout",
      "revision": "r3",
      "defaultLanguage": "en",
      "defaultPlatform": "pwa",
      "summary": "Fictional review fixture · compare preserved sources and keep your notes with this review revision.",
      "provenance": "All screens and identities are mock Morrow data. Android/iOS/PWA labels represent simulated fixtures. No real product or account data.",
      "parts": [
        {
          "name": "Primary task",
          "current": "Equal visual weight for every task.",
          "proposed": "Give the next action clear priority."
        },
        {
          "name": "Navigation",
          "current": "Competing destinations.",
          "proposed": "Keep the current task visible."
        }
      ],
      "views": [
        {
          "id": "desktop-pwa-en-light",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Desktop · PWA · English · Light",
          "current": "captures/checkout-current-baseline-desktop-light-PWA-final.png",
          "proposed": "captures/checkout-proposed-r1-desktop-light-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "desktop-pwa-en-dark",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Desktop · PWA · English · Dark",
          "current": "captures/checkout-current-baseline-desktop-dark-PWA-final.png",
          "proposed": "captures/checkout-proposed-r1-desktop-dark-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-light",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · Android · English · Light",
          "current": "captures/checkout-current-baseline-mobile-light-Android-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-light-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-dark",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · Android · English · Dark",
          "current": "captures/checkout-current-baseline-mobile-dark-Android-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-dark-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-light",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · iOS · English · Light",
          "current": "captures/checkout-current-baseline-mobile-light-iOS-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-light-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-dark",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · iOS · English · Dark",
          "current": "captures/checkout-current-baseline-mobile-dark-iOS-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-dark-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-light",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · PWA · English · Light",
          "current": "captures/checkout-current-baseline-mobile-light-PWA-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-light-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-dark",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · PWA · English · Dark",
          "current": "captures/checkout-current-baseline-mobile-dark-PWA-final.png",
          "proposed": "captures/checkout-proposed-r1-mobile-dark-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        }
      ],
      "externalSources": []
    },
    {
      "id": "S01",
      "productId": "shared",
      "title": "Shared account",
      "revision": "r3",
      "defaultLanguage": "en",
      "defaultPlatform": "pwa",
      "summary": "Fictional review fixture · compare preserved sources and keep your notes with this review revision.",
      "provenance": "All screens and identities are mock Morrow data. Android/iOS/PWA labels represent simulated fixtures. No real product or account data.",
      "parts": [
        {
          "name": "Primary task",
          "current": "Equal visual weight for every task.",
          "proposed": "Give the next action clear priority."
        },
        {
          "name": "Navigation",
          "current": "Competing destinations.",
          "proposed": "Keep the current task visible."
        }
      ],
      "views": [
        {
          "id": "desktop-pwa-en-light",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Desktop · PWA · English · Light",
          "current": "captures/account-current-baseline-desktop-light-PWA-final.png",
          "proposed": "captures/account-proposed-r1-desktop-light-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "desktop-pwa-en-dark",
          "viewport": "desktop",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Desktop · PWA · English · Dark",
          "current": "captures/account-current-baseline-desktop-dark-PWA-final.png",
          "proposed": "captures/account-proposed-r1-desktop-dark-PWA-final.png",
          "wide": true,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-light",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · Android · English · Light",
          "current": "captures/account-current-baseline-mobile-light-Android-final.png",
          "proposed": "captures/account-proposed-r1-mobile-light-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-android-en-dark",
          "viewport": "mobile",
          "platform": "android",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · Android · English · Dark",
          "current": "captures/account-current-baseline-mobile-dark-Android-final.png",
          "proposed": "captures/account-proposed-r1-mobile-dark-Android-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-light",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · iOS · English · Light",
          "current": "captures/account-current-baseline-mobile-light-iOS-final.png",
          "proposed": "captures/account-proposed-r1-mobile-light-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-ios-en-dark",
          "viewport": "mobile",
          "platform": "ios",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · iOS · English · Dark",
          "current": "captures/account-current-baseline-mobile-dark-iOS-final.png",
          "proposed": "captures/account-proposed-r1-mobile-dark-iOS-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-light",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "light",
          "variant": "Default",
          "label": "Mobile · PWA · English · Light",
          "current": "captures/account-current-baseline-mobile-light-PWA-final.png",
          "proposed": "captures/account-proposed-r1-mobile-light-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        },
        {
          "id": "mobile-pwa-en-dark",
          "viewport": "mobile",
          "platform": "pwa",
          "language": "en",
          "theme": "dark",
          "variant": "Default",
          "label": "Mobile · PWA · English · Dark",
          "current": "captures/account-current-baseline-mobile-dark-PWA-final.png",
          "proposed": "captures/account-proposed-r1-mobile-dark-PWA-final.png",
          "wide": false,
          "note": "Fictional Morrow fixture. Simulated platform styling; no device or production evidence."
        }
      ],
      "externalSources": [],
      "sharedWith": [
        "provider",
        "customer"
      ],
      "viewports": [
        "mobile",
        "desktop"
      ],
      "platforms": [
        "pwa"
      ],
      "languages": [
        "en"
      ],
      "themes": [
        "light",
        "dark"
      ]
    }
  ],
  "reviewMode": "brief"
};
