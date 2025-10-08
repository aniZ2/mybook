"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTrendingBooks = syncTrendingBooks;
const admin = __importStar(require("firebase-admin"));
const cheerio = __importStar(require("cheerio"));
// Ensure admin is initialized
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Scrapes Barnes & Noble trending books and saves them to Firestore.
 * Each book includes title, author, cover URL, and link.
 */
async function syncTrendingBooks() {
    const url = "https://www.barnesandnoble.com/b/books/_/N-29Z8q8";
    console.log("Fetching trending books from Barnes & Noble…");
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Failed to fetch BN page: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const books = [];
    $(".product-shelf-title").each((i, el) => {
        const title = $(el).text().trim();
        const parent = $(el).closest(".product-shelf-tile");
        const author = parent.find(".product-shelf-author").text().trim();
        const coverUrl = parent.find("img").attr("data-src") || parent.find("img").attr("src");
        const link = "https://www.barnesandnoble.com" + parent.find("a").attr("href");
        if (title && link) {
            books.push({ title, author, coverUrl, link });
        }
    });
    console.log(`📚 Found ${books.length} trending books.`);
    if (!books.length)
        throw new Error("No books scraped from BN page");
    const batch = db.batch();
    const ref = db.collection("trendingBooks");
    for (const book of books) {
        const docRef = ref.doc(book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50));
        batch.set(docRef, {
            title: book.title,
            authorName: book.author || "Unknown",
            coverUrl: book.coverUrl || null,
            purchaseLink: book.link,
            source: "Barnes & Noble",
            fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    console.log("✅ Trending books synced successfully.");
}
